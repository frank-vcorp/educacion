/**
 * F2 — POST /api/planeaciones/[id]/ia/help-redaccion
 * SPEC_TEC_07 §5.2 + IMPL-20260819-04.
 *
 * Ayuda de redacción (expandir/simplificar). NO persiste automáticamente (P-PD9).
 * Sin cache (cada `texto_base` es distinto). Rate-limit 5/min/docente.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { iaChat } from '@/services/ia/client';
import { anonymizeRequest, findIrredactableField } from '@/lib/ia/anonymizer';
import { SYSTEM_PROMPT_F2, EDAD_DESTINO_PROMPT } from '@/services/ia/prompts';
import { checkRateLimit, rateLimitHeaders } from '@/services/ia/rate-limiter';
import { auditPostIA } from '@/lib/ia/audit-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EDADES = ['3-4', '4-5', '5-6'] as const;

const Body = z
  .object({
    texto_base: z.string().min(5, 'texto_base mínimo 5 caracteres').max(1000),
    accion: z.enum(['expandir', 'simplificar']),
    edad_destino: z.enum(EDADES).optional(),
    bloque_id: z.string().uuid().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.accion === 'simplificar' && !v.edad_destino) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'edad_destino es requerido cuando accion="simplificar"',
        path: ['edad_destino'],
      });
    }
  });

interface RouteParams {
  params: { id: string };
}

const ENDPOINT = 'planeaciones_help_redaccion';

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session?.docenteId) {
    return NextResponse.json(
      { error: { code: 'NEM_AUTH_UNAUTHORIZED', message: 'No autenticado' } },
      { status: 401 },
    );
  }
  const docenteId = session.docenteId;

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
  const { texto_base, accion, edad_destino, bloque_id } = parsed.data;

  const supabase = await createClient();

  // Validar que la planeación pertenece al docente y no está archivada.
  // NOTA (P1-1, SPEC §6.1.1): se selecciona `cct` para usarlo como CCT real
  // en el insert `audit_log` POST (nunca `docente_id`, que es UUID).
  const { data: planeacion, error: errPlane } = await supabase
    .from('planeacion')
    .select('id, docente_id, cct, estado')
    .eq('id', params.id)
    .maybeSingle();
  if (errPlane) {
    return NextResponse.json(
      { error: { code: 'NEM_INTERNAL_ERROR', message: errPlane.message } },
      { status: 500, headers: headersBase },
    );
  }
  if (!planeacion) {
    return NextResponse.json(
      { error: { code: 'NEM_PLANEACIONES_NOT_FOUND', message: 'Planeación no encontrada' } },
      { status: 404, headers: headersBase },
    );
  }
  if (planeacion.docente_id !== docenteId) {
    return NextResponse.json(
      { error: { code: 'NEM_AUTH_RLS_VIOLATION', message: 'La planeación no pertenece al docente' } },
      { status: 403, headers: headersBase },
    );
  }
  if (planeacion.estado === 'archivada') {
    return NextResponse.json(
      { error: { code: 'NEM_PLANEACIONES_ARCHIVED', message: 'La planeación está archivada' } },
      { status: 409, headers: headersBase },
    );
  }

  // Si se pasa bloque_id, verificar ownership.
  if (bloque_id) {
    const { data: bloque } = await supabase
      .from('bloque')
      .select('id, docente_id, planeacion_id, contenido_textual')
      .eq('id', bloque_id)
      .maybeSingle();
    if (!bloque || bloque.docente_id !== docenteId || bloque.planeacion_id !== params.id) {
      return NextResponse.json(
        { error: { code: 'NEM_AUTH_RLS_VIOLATION', message: 'El bloque no pertenece a la planeación' } },
        { status: 403, headers: headersBase },
      );
    }
  }

  // Anonimización obligatoria.
  const irredactableField = findIrredactableField({ texto_base });
  if (irredactableField) {
    return NextResponse.json(
      {
        error: {
          code: 'NEM_IA_ANONYMIZER_BLOCKED',
          message: `Anonymizer detectó PII no redactable en campo ${irredactableField}.`,
        },
      },
      { status: 500, headers: headersBase },
    );
  }
  const anon = anonymizeRequest({ texto_base });

  const accionStr = accion === 'simplificar'
    ? `simplificar para ${EDAD_DESTINO_PROMPT[edad_destino as '3-4' | '4-5' | '5-6']}`
    : 'expandir';
  const userMsg = `Acción: ${accionStr}. Texto del docente (anonimizado): ${anon.texto_base}`;

  const result = await iaChat([
    { role: 'system', content: SYSTEM_PROMPT_F2 },
    { role: 'user', content: userMsg },
  ]);

  // P1-1: insert audit_log POST (200 éxito / fallback_vacio). body_hash sobre
  // el user message anonimizado (`userMsg` ya construido a partir de
  // `anon.texto_base`). NUNCA el prompt crudo ni texto con PII.
  await auditPostIA(supabase, {
    cct: planeacion.cct,
    docenteId,
    endpoint: ENDPOINT,
    method: 'POST',
    bodyHashSource: userMsg,
    responseStatus: 200,
  });

  return NextResponse.json(
    {
      data: {
        texto_propuesto: result.text,
        accion,
        origen: result.origen,
      },
    },
    { status: 200, headers: headersBase },
  );
}