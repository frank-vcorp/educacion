/**
 * POST /api/asistencia/ia/dinamica
 * Genera una dinámica lúdica de pase de lista para Preescolar (Fase 2 NEM)
 * usando IA, con fallback automático al catálogo determinista si la IA no está disponible.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { iaChat } from '@/services/ia/client';
import { checkRateLimit, rateLimitHeaders } from '@/services/ia/rate-limiter';
import {
  obtenerSugerenciaDinamica,
  type CampoFormativoId,
  type DinamicaPaseLista,
} from '@/lib/asistencia/pase-lista-ludico';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CAMPOS_MAP: Record<CampoFormativoId, string> = {
  lenguajes: 'Lenguajes',
  saberes_pensamiento_cientifico: 'Saberes y Pensamiento Científico',
  etica_naturaleza_sociedades: 'Ética, Naturaleza y Sociedades',
  de_lo_humano_comunitario: 'De lo Humano y lo Comunitario',
};

const CAMPOS_IDS = Object.keys(CAMPOS_MAP) as CampoFormativoId[];

const BodySchema = z.object({
  campo: z
    .enum([
      'todos',
      'lenguajes',
      'saberes_pensamiento_cientifico',
      'etica_naturaleza_sociedades',
      'de_lo_humano_comunitario',
    ])
    .optional()
    .default('todos'),
  excluirTitulos: z.array(z.string().max(120)).max(15).optional().default([]),
});

const SYSTEM_PROMPT_PASE_LISTA = [
  'Eres una educadora experta en Preescolar de México (Nueva Escuela Mexicana, Fase 2, niños de 3 a 5 años).',
  'Tu tarea: inventar UNA dinámica breve, alegre y realista de pase de lista matutino que tome menos de 3 minutos en total.',
  'REGLAS:',
  '- IDIOMA OBLIGATORIO: comunícate exclusivamente en español latinoamericano (México). Prohibido usar inglés o caracteres chinos/asiáticos.',
  '- Responde SOLO con un JSON válido, sin markdown, sin explicaciones ni texto adicional:',
  '  {"titulo":"<max 60 chars>","consigna":"<max 220 chars>","ejemplo":"Ejemplo: \\"<max 160 chars>\\"","icono":"<1 emoji>"}',
  '- La consigna debe explicar qué dice o hace cada niño al escuchar su nombre y decir "¡Presente!".',
  '- No menciones alumnos por nombre real ni datos personales.',
  '- Debe ser segura, inclusiva y sin requerir materiales complejos.',
].join('\n');

function parseDinamicaIa(
  raw: string,
  campo: CampoFormativoId,
): DinamicaPaseLista | null {
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
    const titulo = typeof obj.titulo === 'string' ? obj.titulo.trim() : '';
    const consigna = typeof obj.consigna === 'string' ? obj.consigna.trim() : '';
    const ejemploRaw = typeof obj.ejemplo === 'string' ? obj.ejemplo.trim() : '';
    const iconoRaw = typeof obj.icono === 'string' ? obj.icono.trim() : '✨';

    if (!titulo || !consigna) return null;

    return {
      id: `ia-${Date.now()}`,
      campo,
      campoNombre: CAMPOS_MAP[campo],
      titulo: titulo.slice(0, 90),
      consigna: consigna.slice(0, 280),
      ejemplo: ejemploRaw ? ejemploRaw.slice(0, 220) : 'Ejemplo: "¡Presente!"',
      icono: iconoRaw.slice(0, 4) || '✨',
      duracionMinutos: 3,
      origen: 'ia',
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

  const rl = checkRateLimit(session.docenteId, 'asistencia_dinamica_ia');
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

  const json = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  const campoSolicitado = parsed.success ? parsed.data.campo : 'todos';
  const excluir = parsed.success ? parsed.data.excluirTitulos : [];

  const campoObjetivo: CampoFormativoId =
    campoSolicitado === 'todos'
      ? CAMPOS_IDS[Math.floor(Math.random() * CAMPOS_IDS.length)]!
      : campoSolicitado;

  const userMsg = JSON.stringify({
    campo_formativo: CAMPOS_MAP[campoObjetivo],
    nivel: 'Preescolar (3 a 5 años)',
    evitar_repetir_titulos: excluir,
  });

  const result = await iaChat(
    [
      { role: 'system', content: SYSTEM_PROMPT_PASE_LISTA },
      { role: 'user', content: userMsg },
    ],
    { temperature: 0.75, maxTokens: 900 },
  );

  const dinamicaIa =
    result.origen === 'ia' ? parseDinamicaIa(result.text, campoObjetivo) : null;

  if (dinamicaIa) {
    return NextResponse.json(
      { dinamica: dinamicaIa, origen: 'ia' as const },
      { status: 200, headers: headersBase },
    );
  }

  const fallback = obtenerSugerenciaDinamica(
    campoSolicitado === 'todos' ? undefined : campoSolicitado,
  );
  return NextResponse.json(
    {
      dinamica: { ...fallback, origen: 'catalogo' as const },
      origen: 'catalogo' as const,
    },
    { status: 200, headers: headersBase },
  );
}
