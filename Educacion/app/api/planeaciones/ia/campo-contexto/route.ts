/**
 * POST /api/planeaciones/ia/campo-contexto
 * Genera una sugerencia IA enfocada y breve para UN solo campo del Paso 3
 * ('problema' | 'proposito' | 'ajustes_razonables') en prosa español latinoamericano.
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

const BodySchema = z.object({
  campo: z.enum(['problema', 'proposito', 'ajustes_razonables']),
  modalidad: z.enum(MODALIDADES),
  nombre: z.string().max(300).optional().default(''),
  problema_contexto: z.string().max(1000).optional().default(''),
  proposito: z.string().max(1000).optional().default(''),
  alcance_temporal: z.string().max(80).optional().default(''),
  periodo_inicio: z.string().max(30).optional().default(''),
  periodo_fin: z.string().max(30).optional().default(''),
  nivel: z.literal(NIVEL_EDUCATIVO_MVP).optional(),
});

const ENDPOINT = 'planeaciones_campo_contexto';

const PROMPTS_POR_CAMPO: Record<'problema' | 'proposito' | 'ajustes_razonables', string> = {
  problema: [
    'Eres una especialista pedagógica en Preescolar de México (Nueva Escuela Mexicana — NEM, Fase 2, SEP, niñas y niños de 3 a 5 años).',
    'Tu tarea: redactar ÚNICAMENTE una pregunta detonadora o planteamiento breve del problema del contexto para esta planeación NEM.',
    'REGLAS:',
    '- Escribe exclusivamente en español latinoamericano (México).',
    '- Responde SOLO con el texto final en prosa (1 o 2 oraciones breves). Sin encabezados, sin comillas, sin JSON, sin explicaciones.',
    '- Debe ser cercana a la vida cotidiana de niños de preescolar y coherente con la modalidad NEM indicada.',
  ].join('\n'),
  proposito: [
    'Eres una especialista pedagógica en Preescolar de México (Nueva Escuela Mexicana — NEM, Fase 2, SEP, niñas y niños de 3 a 5 años).',
    'Tu tarea: redactar ÚNICAMENTE el propósito pedagógico breve de esta planeación NEM.',
    'REGLAS:',
    '- Escribe exclusivamente en español latinoamericano (México).',
    '- Responde SOLO con el texto final en prosa (1 o 2 oraciones breves iniciando con verbo en infinitivo). Sin encabezados, sin comillas, sin JSON.',
    '- Enfócate en el aprendizaje situado, el juego, el diálogo o la participación comunitaria en preescolar.',
  ].join('\n'),
  ajustes_razonables: [
    'Eres una especialista en Educación Inclusiva y Preescolar de México (Nueva Escuela Mexicana — NEM, Fase 2, SEP, DUA y BAP).',
    'Tu tarea: redactar ÚNICAMENTE 2 o 3 estrategias concretas de ajustes razonables (BAP / Diseño Universal para el Aprendizaje) para esta planeación.',
    'REGLAS:',
    '- Escribe exclusivamente en español latinoamericano (México).',
    '- Responde SOLO con el texto final en prosa o lista breve separada por punto y coma. Sin encabezados, sin JSON, sin explicaciones.',
    '- Incluye apoyos visuales, consignas claras y múltiples formas de expresión acordes a niños de 3 a 5 años.',
  ].join('\n'),
};

const MODALIDAD_CONTEXTO: Record<(typeof MODALIDADES)[number], string> = {
  proyecto_comunitario:
    'Proyecto Comunitario NEM (5 fases: Motivación, Diseño, Acción, Finalización, Evaluación). Parte de un problema real de la comunidad o escuela y busca que niñas y niños de 3 a 5 años participen con acciones lúdicas, exploración y apoyo de sus familias.',
  unidad_didactica:
    'Unidad Didáctica NEM (tema estructurado con banco de palabras y 5 sesiones L–V con actividades recurrentes). Integra juegos, cuentos, canciones y experiencias concretas para niños de 3 a 5 años.',
  abj:
    'Aprendizaje Basado en Juego (ABJ) NEM (3 momentos: Inicio del juego, Desarrollo lúdico, Cierre/reflexión). El juego es el eje central para que niños de 3 a 5 años exploren, resuelvan retos y convivan.',
  rincones:
    'Rincones de Aprendizaje NEM (estaciones paralelas simultáneas en el aula con materiales concretos y reglas claras). Niñas y niños de 3 a 5 años eligen, manipulan y colaboran en pequeños grupos.',
  centros_interes:
    'Centros de Interés NEM (tema detonador que nace de la curiosidad natural de niños de 3 a 5 años, con preguntas guía y estaciones de exploración sensorial, juego simbólico y descubrimiento).',
  taller_critico:
    'Taller Crítico NEM (3 momentos: Reflexión inicial, Producción creativa, Socialización). Niñas y niños de 3 a 5 años dialogan sobre una situación cercana, crean algo con sus manos mediante el juego y lo comparten.',
};

const MAX_TOKENS_POR_CAMPO: Record<'problema' | 'proposito' | 'ajustes_razonables', number> = {
  problema: 4096,
  proposito: 4096,
  ajustes_razonables: 4096,
};

function limpiarCaracteresNoLatinos(texto: string): string {
  return texto
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u0600-\u06ff]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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
    campo,
    modalidad,
    nombre,
    problema_contexto,
    proposito,
    alcance_temporal,
    periodo_inicio,
    periodo_fin,
    nivel,
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

  const ALCANCE_DESC: Record<string, string> = {
    semanal: 'Una semana (5 días hábiles L–V)',
    quincenal: 'Quincenal (~10 días hábiles, 2 semanas)',
    mensual: 'Mensual (~1 mes escolar)',
    fechas: 'Por rango de fechas personalizado',
  };
  const periodoTxt =
    periodo_inicio && periodo_fin
      ? ` del ${periodo_inicio} al ${periodo_fin}`
      : periodo_inicio
        ? ` desde ${periodo_inicio}`
        : '';

  const userMsg = JSON.stringify({
    marco_educativo: 'Nueva Escuela Mexicana (NEM, SEP México) — Fase 2 Preescolar, niñas y niños de 3 a 5 años. Todo debe plantearse con actividades lúdicas, sensoriales y acordes a su edad (nunca tareas rígidas de primaria).',
    modalidad_seleccionada: modalidad,
    descripcion_modalidad: MODALIDAD_CONTEXTO[modalidad],
    alcance_del_proyecto: `${ALCANCE_DESC[alcance_temporal] ?? (alcance_temporal || 'No especificado')}${periodoTxt}`,
    nivel: nivel ?? NIVEL_EDUCATIVO_MVP,
    nombre_planeacion: extras.nombre ?? '',
    problema_contexto: extras.problema_contexto ?? '',
    proposito: extras.proposito ?? '',
  });

  const result = await iaChat(
    [
      { role: 'system', content: PROMPTS_POR_CAMPO[campo] },
      { role: 'user', content: userMsg },
    ],
    {
      temperature: 0.2,
      maxTokens: MAX_TOKENS_POR_CAMPO[campo],
    },
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

  const texto = result.origen === 'ia' ? limpiarCaracteresNoLatinos(result.text) : '';
  if (!texto) {
    return NextResponse.json(
      { data: { texto: '', origen: 'fallback_vacio' as const } },
      { status: 200, headers: headersBase },
    );
  }

  return NextResponse.json(
    { data: { texto, origen: 'ia' as const } },
    { status: 200, headers: headersBase },
  );
}
