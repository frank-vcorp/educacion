/**
 * POST /api/planeaciones/ia/sugerir-recursos-editor
 * Sugiere en una sola llamada rápida:
 *  1. Actividades del Catálogo NEM más afines al proyecto (y orden de afinidad).
 *  2. Libros/textos oficiales de Biblioteca (CONALITEG) afines al proyecto.
 *  3. Recursos del aula sugeridos con su actividad o uso recomendado.
 * Valida estrictamente todos los códigos/IDs contra los candidatos enviados.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { iaChat } from '@/services/ia/client';
import { anonymizeRequest, findIrredactableField } from '@/lib/ia/anonymizer';
import { checkRateLimit, rateLimitHeaders } from '@/services/ia/rate-limiter';
import { auditPostIA } from '@/lib/ia/audit-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BodySchema = z.object({
  modalidad: z.string().min(1).max(60),
  grado: z.string().max(30).optional().default(''),
  nombre: z.string().max(300).optional().default(''),
  problema_contexto: z.string().max(1200).optional().default(''),
  proposito: z.string().max(1200).optional().default(''),
  campos: z.array(z.string().max(100)).max(10).optional().default([]),
  pdas: z.array(z.string().max(400)).max(20).optional().default([]),
  ejes: z.array(z.string().max(150)).max(10).optional().default([]),
  actividades_candidatas: z
    .array(
      z.object({
        codigo: z.string().min(1).max(80),
        nombre: z.string().min(1).max(200),
        descripcion: z.string().max(400).optional().default(''),
        tipo: z.string().max(40).optional().default(''),
      }),
    )
    .max(50)
    .optional()
    .default([]),
  libros_candidatos: z
    .array(
      z.object({
        id: z.number().int().positive(),
        titulo_libro: z.string().min(1).max(240),
        campo: z.string().max(120).optional().default(''),
        grado: z.string().max(40).optional().default(''),
      }),
    )
    .max(30)
    .optional()
    .default([]),
  recursos_candidatos: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        nombre: z.string().min(1).max(200),
        categoria: z.string().max(100).optional().default(''),
        uso: z.string().max(300).optional().default(''),
      }),
    )
    .max(50)
    .optional()
    .default([]),
});

const ENDPOINT = 'planeaciones_sugerir_recursos_editor';

const SYSTEM_PROMPT = [
  'Eres una especialista pedagógica en Preescolar de México (Nueva Escuela Mexicana — NEM, Fase 2, SEP, niñas y niños de 3 a 5 años).',
  'Recibirás el contexto de una planeación y tres listas de candidatos: actividades del Catálogo NEM, libros de Biblioteca CONALITEG y recursos del aula del docente.',
  'Tu tarea:',
  '1. "actividades": elige entre 3 y 5 códigos de "actividades_candidatas" que mejor conecten con el proyecto, con una razón breve (1 frase) de cómo usarla.',
  '2. "actividades_afinidad": ordena los demás códigos de "actividades_candidatas" de mayor a menor afinidad.',
  '3. "libros": elige entre 2 y 4 IDs numéricos de "libros_candidatos" que mejor apoyen este proyecto, con una razón breve (1 frase) de qué texto o actividad consultar.',
  '4. "recursos": si hay "recursos_candidatos", elige los que sí sirven para este proyecto (máx 6) e indica en "uso_sugerido" la actividad concreta para usarlos.',
  'REGLAS ESTRICTAS:',
  '- Usa EXCLUSIVAMENTE códigos/IDs exactos de las listas recibidas. PROHIBIDO inventar códigos o IDs.',
  '- Escribe todo en español latinoamericano (México), breve y claro.',
  '- Responde SOLO con un JSON válido sin markdown ni texto adicional:',
  '  {"actividades":[{"codigo":"...","razon":"..."}],"actividades_afinidad":["..."],"libros":[{"id":1,"razon":"..."}],"recursos":[{"id":"...","uso_sugerido":"..."}]}',
].join('\n');

function limpiarTexto(texto: string): string {
  return texto
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u0600-\u06ff]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseRespuestaIa(
  raw: string,
  validAct: Set<string>,
  validLibros: Set<number>,
  validRecursos: Set<string>,
) {
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

    const actUsadas = new Set<string>();
    const actividades: Array<{ codigo: string; razon?: string }> = [];
    for (const item of Array.isArray(obj.actividades) ? obj.actividades : []) {
      if (actividades.length >= 6) break;
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const codigo = typeof rec.codigo === 'string' ? rec.codigo.trim() : '';
        if (validAct.has(codigo) && !actUsadas.has(codigo)) {
          actUsadas.add(codigo);
          const razon =
            typeof rec.razon === 'string' ? limpiarTexto(rec.razon).slice(0, 180) : undefined;
          actividades.push({ codigo, razon: razon || undefined });
        }
      }
    }

    const actividadesAfinidad: string[] = [];
    for (const item of Array.isArray(obj.actividades_afinidad) ? obj.actividades_afinidad : []) {
      if (typeof item !== 'string') continue;
      const codigo = item.trim();
      if (validAct.has(codigo) && !actUsadas.has(codigo)) {
        actUsadas.add(codigo);
        actividadesAfinidad.push(codigo);
      }
    }

    const librosUsados = new Set<number>();
    const libros: Array<{ id: number; razon?: string }> = [];
    for (const item of Array.isArray(obj.libros) ? obj.libros : []) {
      if (libros.length >= 5) break;
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const id = typeof rec.id === 'number' ? rec.id : Number(rec.id);
        if (Number.isInteger(id) && validLibros.has(id) && !librosUsados.has(id)) {
          librosUsados.add(id);
          const razon =
            typeof rec.razon === 'string' ? limpiarTexto(rec.razon).slice(0, 180) : undefined;
          libros.push({ id, razon: razon || undefined });
        }
      }
    }

    const recUsados = new Set<string>();
    const recursos: Array<{ id: string; uso_sugerido?: string }> = [];
    for (const item of Array.isArray(obj.recursos) ? obj.recursos : []) {
      if (recursos.length >= 8) break;
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const id = typeof rec.id === 'string' ? rec.id.trim() : '';
        if (validRecursos.has(id) && !recUsados.has(id)) {
          recUsados.add(id);
          const uso =
            typeof rec.uso_sugerido === 'string'
              ? limpiarTexto(rec.uso_sugerido).slice(0, 180)
              : undefined;
          recursos.push({ id, uso_sugerido: uso || undefined });
        }
      }
    }

    if (
      actividades.length === 0 &&
      libros.length === 0 &&
      recursos.length === 0
    ) {
      return null;
    }

    return {
      actividades,
      actividades_afinidad: actividadesAfinidad,
      libros,
      recursos,
    };
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
    grado,
    nombre,
    problema_contexto,
    proposito,
    campos,
    pdas,
    ejes,
    actividades_candidatas,
    libros_candidatos,
    recursos_candidatos,
  } = parsed.data;

  const irredactable = findIrredactableField({
    extras: { nombre, problema_contexto, proposito },
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
    extras: { nombre, problema_contexto, proposito },
  });
  const extras = anon.extras ?? {};

  const userMsg = JSON.stringify({
    modalidad,
    grado: grado || 'Preescolar',
    nombre_planeacion: extras.nombre ?? '',
    problema_contexto: extras.problema_contexto ?? '',
    proposito: extras.proposito ?? '',
    campos_formativos: campos,
    pdas,
    ejes_articuladores: ejes,
    actividades_candidatas,
    libros_candidatos,
    recursos_candidatos,
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

  const validAct = new Set(actividades_candidatas.map((a) => a.codigo));
  const validLibros = new Set(libros_candidatos.map((l) => l.id));
  const validRecursos = new Set(recursos_candidatos.map((r) => r.id));

  const parsedIa =
    result.origen === 'ia'
      ? parseRespuestaIa(result.text, validAct, validLibros, validRecursos)
      : null;

  if (!parsedIa) {
    return NextResponse.json(
      {
        data: {
          actividades: [],
          actividades_afinidad: [],
          libros: [],
          recursos: [],
          origen: 'fallback_vacio' as const,
        },
      },
      { status: 200, headers: headersBase },
    );
  }

  return NextResponse.json(
    {
      data: {
        ...parsedIa,
        origen: 'ia' as const,
      },
    },
    { status: 200, headers: headersBase },
  );
}
