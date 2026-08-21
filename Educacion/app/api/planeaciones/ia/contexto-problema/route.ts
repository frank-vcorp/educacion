/**
 * F0 — POST /api/planeaciones/ia/contexto-problema
 * SPEC_TEC_10 §4 — IMPL-20260820-06.
 *
 * IA contextualizada por modalidad en el paso inicial del wizard.
 * Recibe { modalidad, problema_contexto, proposito?, ajustes_razonables?, nivel? }
 * y devuelve 3 propuestas aplicables por clic explícito (P-PD9):
 *  - problema_estructurado
 *  - proposito
 *  - ajustes_razonables
 *
 * Reglas:
 *  - Sin planeación persistida → cct sale de `session.cct`.
 *  - Rate-limit 5/min/docente, bucket `planeaciones_contexto_problema`.
 *  - Anonimizador obligatorio (R-IA-10): findIrredactableField + anonymizeRequest.
 *  - audit_log POST: 1 fila por request que alcanza la etapa de procesamiento.
 *  - Fallback graceful (200 origen=fallback_vacio) ante JSON inválido o
 *    `problema_estructurado` vacío. Sin reintentos.
 *  - D-FIN-13: server-only, no lee tablas de alumnos/entrevistas.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { iaChat } from '@/services/ia/client';
import { anonymizeRequest, findIrredactableField } from '@/lib/ia/anonymizer';
import { SYSTEM_PROMPT_F0 } from '@/services/ia/prompts';
import { checkRateLimit, rateLimitHeaders } from '@/services/ia/rate-limiter';
import { parseRespuestaF0 } from '@/services/ia/validate';
import { auditPostIA } from '@/lib/ia/audit-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODALIDADES = [
  'proyecto_comunitario',
  'unidad_didactica',
  'abj',
  'rincones',
  'centros_interes',
  'taller_critico',
] as const;

const NIVELES = ['preescolar', 'primaria', 'secundaria'] as const;

const Body = z.object({
  modalidad: z.enum(MODALIDADES, {
    errorMap: () => ({ message: 'modalidad no soportada' }),
  }),
  problema_contexto: z
    .string({ required_error: 'problema_contexto es obligatorio' })
    .transform((s) => s.trim())
    .pipe(z.string().min(1, 'problema_contexto es obligatorio').max(1000)),
  proposito: z
    .string()
    .max(1000)
    .optional()
    .transform((s) => (typeof s === 'string' ? s.trim() : '')),
  ajustes_razonables: z
    .string()
    .max(1000)
    .optional()
    .transform((s) => (typeof s === 'string' ? s.trim() : '')),
  nivel: z.enum(NIVELES).optional(),
});

const ENDPOINT = 'planeaciones_contexto_problema';

const FALLBACK = {
  problema_estructurado: '',
  proposito: '',
  ajustes_razonables: '',
  origen: 'fallback_vacio' as const,
};

export async function POST(request: Request) {
  // 1) Auth
  const session = await getServerSession();
  if (!session?.docenteId) {
    return NextResponse.json(
      { error: { code: 'NEM_AUTH_UNAUTHORIZED', message: 'No autenticado' } },
      { status: 401 },
    );
  }
  const docenteId = session.docenteId;
  const cct = session.cct ?? null;

  // 2) Rate-limit
  const rl = checkRateLimit(docenteId, ENDPOINT);
  const headersBase = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'NEM_RATE_LIMIT_EXCEEDED',
          message: 'Has superado el límite de 5 solicitudes por minuto.',
        },
      },
      { status: 429, headers: headersBase },
    );
  }

  // 3) Validación body
  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'NEM_PLANEACIONES_VALIDATION_ERROR',
          message: 'Body inválido',
          details: parsed.error.issues,
        },
      },
      { status: 422, headers: headersBase },
    );
  }
  const { modalidad, problema_contexto, proposito, ajustes_razonables, nivel } = parsed.data;

  // 4) Anonimizador defensivo — findIrredactableField (R-IA-10).
  const irredactable = findIrredactableField({
    extras: {
      problema_contexto,
      proposito,
      ajustes_razonables,
    },
  });
  if (irredactable) {
    // No insertamos audit_log en 500-ANONYMIZER (mismo criterio §6.1.1).
    return NextResponse.json(
      {
        error: {
          code: 'NEM_IA_ANONYMIZER_BLOCKED',
          message: `Anonymizer detectó PII no redactable en campo ${irredactable}.`,
        },
      },
      { status: 500, headers: headersBase },
    );
  }

  // 5) Anonimizar contenido variable.
  const anon = anonymizeRequest({
    extras: { problema_contexto, proposito, ajustes_razonables },
  });
  const extrasAnon = anon.extras ?? {};
  const userMsg = JSON.stringify({
    modalidad,
    nivel: nivel ?? null,
    problema_contexto: extrasAnon.problema_contexto ?? '',
    proposito: extrasAnon.proposito ?? '',
    ajustes_razonables: extrasAnon.ajustes_razonables ?? '',
  });

  // 6) Llamada al proveedor (degradación graceful → fallback_vacio).
  const result = await iaChat(
    [
      { role: 'system', content: SYSTEM_PROMPT_F0 },
      { role: 'user', content: userMsg },
    ],
    { temperature: 0.4, maxTokens: 700 },
  );

  // 7) Parse respuesta.
  let parsedF0: ReturnType<typeof parseRespuestaF0> = null;
  if (result.origen !== 'fallback_vacio') {
    parsedF0 = parseRespuestaF0(result.text);
  }

  // 8) audit_log POST (1 fila por request que alcanza procesamiento).
  //    body_hash sobre el user message anonimizado (`userMsg`).
  const supabase = await createClient();
  if (cct) {
    await auditPostIA(supabase, {
      cct,
      docenteId,
      endpoint: ENDPOINT,
      method: 'POST',
      bodyHashSource: userMsg,
      responseStatus: 200,
    });
  } else {
    // Sin cct → omitir insert (fail-loud; el guard defensivo del helper
    // ya registra console.error). Sin abortar la respuesta.
  }

  // 9) Respuesta.
  if (!parsedF0) {
    return NextResponse.json(
      { data: FALLBACK },
      { status: 200, headers: headersBase },
    );
  }

  return NextResponse.json(
    {
      data: {
        problema_estructurado: parsedF0.problema_estructurado,
        proposito: parsedF0.proposito,
        ajustes_razonables: parsedF0.ajustes_razonables,
        origen: 'ia',
      },
    },
    { status: 200, headers: headersBase },
  );
}
