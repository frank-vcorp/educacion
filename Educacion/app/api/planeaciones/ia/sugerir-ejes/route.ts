/**
 * POST /api/planeaciones/ia/sugerir-ejes
 * Sugiere los Ejes Articuladores NEM más pertinentes para el proyecto
 * (tomando en cuenta el contexto y los PDAs seleccionados) y ordena
 * los demás ejes por afinidad.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { iaChat } from '@/services/ia/client';
import { anonymizeRequest, findIrredactableField } from '@/lib/ia/anonymizer';
import { checkRateLimit, rateLimitHeaders } from '@/services/ia/rate-limiter';
import { auditPostIA } from '@/lib/ia/audit-post';
import { NIVEL_EDUCATIVO_MVP } from '@/lib/nivel-educativo/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MODALIDADES = [
  'proyecto_comunitario',
  'unidad_didactica',
  'abj',
  'rincones',
  'centros_interes',
  'taller_critico',
] as const;

const CandidatoEjeSchema = z.object({
  codigo: z.string().min(1).max(80),
  nombre: z.string().min(1).max(200),
  descripcion: z.string().max(500).optional().default(''),
});

const BodySchema = z.object({
  modalidad: z.enum(MODALIDADES),
  nombre: z.string().max(300).optional().default(''),
  problema_contexto: z.string().max(1200).optional().default(''),
  proposito: z.string().max(1200).optional().default(''),
  producto_integrador: z.string().max(600).optional().default(''),
  pdas_textos: z.array(z.string().max(500)).max(20).optional().default([]),
  candidatos: z.array(CandidatoEjeSchema).min(1).max(15),
  nivel: z.literal(NIVEL_EDUCATIVO_MVP).optional(),
});

const ENDPOINT = 'planeaciones_sugerir_ejes';

const SYSTEM_PROMPT = [
  'Eres una especialista pedagógica en Preescolar de México (Nueva Escuela Mexicana — NEM, Fase 2, SEP, niñas y niños de 3 a 5 años).',
  'Recibirás el contexto de una planeación, los PDAs seleccionados y la lista de Ejes Articuladores oficiales disponibles.',
  'Tu tarea:',
  '1. Seleccionar entre 2 y 3 Ejes Articuladores que mejor articulen transversalmente este proyecto y sus PDAs ("sugeridos").',
  '2. Ordenar los demás códigos de ejes de mayor a menor afinidad con el proyecto ("afinidad").',
  'REGLAS ESTRICTAS:',
  '- Usa EXCLUSIVAMENTE códigos exactos de la lista "candidatos". PROHIBIDO inventar o modificar códigos.',
  '- Escribe las razones exclusivamente en español latinoamericano (México), en 1 frase breve y clara.',
  '- Responde SOLO con un JSON válido sin markdown ni texto adicional:',
  '  {"sugeridos":[{"codigo":"...","razon":"..."}],"afinidad":["codigo1","codigo2"]}',
].join('\n');

function limpiarTexto(texto: string): string {
  return texto
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u0600-\u06ff]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseSugerenciasEjesIa(
  raw: string,
  codigosValidos: Set<string>,
): {
  sugeridos: Array<{ codigo: string; razon?: string }>;
  afinidad: string[];
} | null {
  if (!raw || typeof raw !== 'string') return null;
  let candidate = raw.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    candidate = fence[1].trim();
  } else {
    const brace = candidate.match(/\{[\s\S]*\}/);
    if (brace) candidate = brace[0];
  }

  try {
    const obj = JSON.parse(candidate) as Record<string, unknown>;
    const rawSugeridos = Array.isArray(obj.sugeridos) ? obj.sugeridos : [];
    const rawAfinidad = Array.isArray(obj.afinidad) ? obj.afinidad : [];

    const usados = new Set<string>();
    const sugeridos: Array<{ codigo: string; razon?: string }> = [];

    for (const item of rawSugeridos) {
      if (sugeridos.length >= 4) break;
      if (typeof item === 'string') {
        const codigo = item.trim();
        if (codigosValidos.has(codigo) && !usados.has(codigo)) {
          usados.add(codigo);
          sugeridos.push({ codigo });
        }
      } else if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const codigo = typeof rec.codigo === 'string' ? rec.codigo.trim() : '';
        if (codigosValidos.has(codigo) && !usados.has(codigo)) {
          usados.add(codigo);
          const razon =
            typeof rec.razon === 'string' ? limpiarTexto(rec.razon).slice(0, 180) : undefined;
          sugeridos.push({ codigo, razon: razon || undefined });
        }
      }
    }

    const afinidad: string[] = [];
    for (const item of rawAfinidad) {
      if (typeof item !== 'string') continue;
      const codigo = item.trim();
      if (codigosValidos.has(codigo) && !usados.has(codigo)) {
        usados.add(codigo);
        afinidad.push(codigo);
      }
    }

    if (sugeridos.length === 0 && afinidad.length === 0) return null;
    return { sugeridos, afinidad };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.docenteId) {
    return NextResponse.json(
      { error: { code: 'NEM_AUTH_UNAUTHORIZED', message: 'No autenticado' } },
      { status: 401 },
    );
  }

  const rl = checkRateLimit(session.docenteId, ENDPOINT);
  const headersBase = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'NEM_RATE_LIMIT_EXCEEDED',
          message: 'Has superado el límite de solicitudes por minuto.',
        },
      },
      { status: 429, headers: headersBase },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'NEM_PLANEACIONES_VALIDATION_ERROR', message: 'Datos inválidos' } },
      { status: 422, headers: headersBase },
    );
  }

  const {
    modalidad,
    nombre,
    problema_contexto,
    proposito,
    producto_integrador,
    pdas_textos,
    candidatos,
  } = parsed.data;

  const irredactable = findIrredactableField({
    extras: { nombre, problema_contexto, proposito, producto_integrador },
  });
  if (irredactable) {
    return NextResponse.json(
      {
        error: {
          code: 'NEM_IA_ANONYMIZER_BLOCKED',
          message: `Se detectó información personal no permitida en ${irredactable}.`,
        },
      },
      { status: 500, headers: headersBase },
    );
  }

  const anon = anonymizeRequest({
    extras: { nombre, problema_contexto, proposito, producto_integrador },
  });
  const extras = anon.extras ?? {};

  const userMsg = JSON.stringify({
    modalidad,
    nombre_planeacion: extras.nombre ?? '',
    problema_contexto: extras.problema_contexto ?? '',
    proposito: extras.proposito ?? '',
    producto_integrador: extras.producto_integrador ?? '',
    pdas_seleccionados: pdas_textos,
    candidatos: candidatos.map((c) => ({
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion,
    })),
  });

  const result = await iaChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    { temperature: 0.2, maxTokens: 4096 },
  );

  const supabase = await createClient();
  if (session.cct) {
    await auditPostIA(supabase, {
      cct: session.cct,
      docenteId: session.docenteId,
      endpoint: ENDPOINT,
      method: 'POST',
      bodyHashSource: userMsg,
      responseStatus: 200,
    });
  }

  const codigosValidos = new Set(candidatos.map((c) => c.codigo));
  const parsedIa =
    result.origen === 'ia' ? parseSugerenciasEjesIa(result.text, codigosValidos) : null;

  if (!parsedIa) {
    return NextResponse.json(
      {
        data: {
          sugeridos: [],
          afinidad: [],
          origen: 'fallback_vacio' as const,
        },
      },
      { status: 200, headers: headersBase },
    );
  }

  return NextResponse.json(
    {
      data: {
        sugeridos: parsedIa.sugeridos,
        afinidad: parsedIa.afinidad,
        origen: 'ia' as const,
      },
    },
    { status: 200, headers: headersBase },
  );
}
