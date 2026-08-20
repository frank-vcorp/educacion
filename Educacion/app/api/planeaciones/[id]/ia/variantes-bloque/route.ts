/**
 * F1 — POST /api/planeaciones/[id]/ia/variantes-bloque
 * SPEC_TEC_07 §5.1 + IMPL-20260819-04.
 *
 * Variantes de bloque (urbana/rural). Validación post-IA P-PD8.
 * Cache 30 días + rate-limit 5/min/docente.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { iaChat } from '@/services/ia/client';
import {
  anonymizeRequest,
  findIrredactableField,
} from '@/lib/ia/anonymizer';
import { SYSTEM_PROMPT_F1 } from '@/services/ia/prompts';
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  requestHash,
} from '@/services/ia/cache';
import { checkRateLimit, rateLimitHeaders } from '@/services/ia/rate-limiter';
import { validarEstructuraF1 } from '@/services/ia/validate';
import { auditPostIA } from '@/lib/ia/audit-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VARIANTES_VALIDAS = ['urbana', 'rural', 'plurilingue'] as const;

const Body = z.object({
  bloque_id: z.string().uuid(),
  variante_tipo: z.enum(VARIANTES_VALIDAS),
  forzar_refresh: z.boolean().optional().default(false),
});

interface RouteParams {
  params: { id: string };
}

const ENDPOINT = 'planeaciones_variantes_bloque';

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session?.docenteId) {
    return NextResponse.json(
      { error: 'NEM_AUTH_UNAUTHORIZED' },
      { status: 401 },
    );
  }
  const docenteId = session.docenteId;

  // ── Rate-limit (debe emitirse antes del body para no malgastar parse) ──
  const rl = checkRateLimit(docenteId, ENDPOINT);
  const headersBase = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'NEM_RATE_LIMIT_EXCEEDED',
          message: 'Has superado el límite de 5 solicitudes por minuto. Intenta en unos segundos.',
        },
      },
      { status: 429, headers: headersBase },
    );
  }

  // ── Body ──
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
  const { bloque_id, variante_tipo, forzar_refresh } = parsed.data;

  if (variante_tipo === 'plurilingue') {
    return NextResponse.json(
      {
        error: {
          code: 'NEM_IA_VARIANTE_TIPO_NO_SOPORTADO',
          message: 'La variante plurilingüe está reservada para Fase 2.',
        },
      },
      { status: 422, headers: headersBase },
    );
  }

  // ── Cargar bloque + verificación ownership ──
  // NOTA (P1-1, SPEC §6.1.1): se selecciona `cct` para usarlo como CCT real
  // en el insert `audit_log` POST (nunca `docente_id`, que es UUID).
  const supabase = await createClient();
  const { data: bloque, error: errBloque } = await supabase
    .from('bloque')
    .select(
      'id, planeacion_id, docente_id, cct, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, planeacion:planeacion(estado)',
    )
    .eq('id', bloque_id)
    .maybeSingle();
  if (errBloque) {
    return NextResponse.json(
      { error: { code: 'NEM_INTERNAL_ERROR', message: errBloque.message } },
      { status: 500, headers: headersBase },
    );
  }
  if (!bloque) {
    return NextResponse.json(
      { error: { code: 'NEM_PLANEACIONES_NOT_FOUND', message: 'Bloque no encontrado' } },
      { status: 404, headers: headersBase },
    );
  }
  if (bloque.docente_id !== docenteId) {
    return NextResponse.json(
      { error: { code: 'NEM_AUTH_RLS_VIOLATION', message: 'El bloque no pertenece al docente' } },
      { status: 403, headers: headersBase },
    );
  }
  if (bloque.planeacion_id !== params.id) {
    return NextResponse.json(
      { error: { code: 'NEM_AUTH_RLS_VIOLATION', message: 'El bloque no pertenece a esta planeación' } },
      { status: 403, headers: headersBase },
    );
  }

  // Verificar estado de la planeación.
  const planeacionEstado = (Array.isArray(bloque.planeacion) ? bloque.planeacion[0] : bloque.planeacion)?.estado;
  if (planeacionEstado === 'archivada') {
    return NextResponse.json(
      { error: { code: 'NEM_PLANEACIONES_ARCHIVED', message: 'La planeación está archivada' } },
      { status: 409, headers: headersBase },
    );
  }

  // ── Cache F1 ──
  const hash = requestHash([docenteId, bloque_id, variante_tipo]);
  if (forzar_refresh) cacheInvalidate(hash);
  const cached = cacheGet<string>(hash);
  if (cached !== null) {
    // P1-1: insert audit_log POST (cache-hit). `cct` real del bloque; body_hash
    // derivado de ids no-PII (misma entrada que la cache key).
    await auditPostIA(supabase, {
      cct: bloque.cct,
      docenteId,
      endpoint: ENDPOINT,
      method: 'POST',
      bodyHashSource: hash,
      responseStatus: 200,
    });
    return NextResponse.json(
      {
        data: {
          variante_texto: cached,
          variante_tipo,
          bloque_id,
          origen: 'cache',
        },
      },
      { status: 200, headers: headersBase },
    );
  }

  // ── Anonimización obligatoria antes de ir al proveedor ──
  const userPayload = JSON.stringify({
    contenido_textual: bloque.contenido_textual,
    pda_ids: bloque.pda_ids,
    campos_formativos: bloque.campos_formativos,
    ejes_articuladores: bloque.ejes_articuladores,
    variante_tipo,
  });
  const anon = anonymizeRequest({ texto: userPayload, variante_tipo });
  const irredactableField = findIrredactableField({ texto: userPayload });
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

  // ── Llamada al proveedor ──
  const result = await iaChat([
    { role: 'system', content: SYSTEM_PROMPT_F1 },
    {
      role: 'user',
      content: `Contexto: variante=${anon.variante_tipo}. Bloque (texto del docente, anonimizado): ${anon.texto}`,
    },
  ]);

  if (result.origen === 'fallback_vacio') {
    // P1-1: insert audit_log POST (fallback_vacio). El `body_hash` se computa
    // sobre el user message anonimizado que el route habría enviado al
    // proveedor (mismo `anon.texto` que se construyó en :184). En este
    // route, `anon.texto` siempre es string (input no-vacío).
    await auditPostIA(supabase, {
      cct: bloque.cct,
      docenteId,
      endpoint: ENDPOINT,
      method: 'POST',
      bodyHashSource: anon.texto ?? '',
      responseStatus: 200,
    });
    return NextResponse.json(
      {
        data: {
          variante_texto: '',
          variante_tipo,
          bloque_id,
          origen: 'fallback_vacio',
        },
      },
      { status: 200, headers: headersBase },
    );
  }

  // ── Validación post-IA P-PD8 ──
  const violacion = validarEstructuraF1({
    pdaOriginales: bloque.pda_ids ?? [],
    varianteTexto: result.text,
  });
  if (violacion) {
    // P1-1: insert audit_log POST con response_status=422 (evento de
    // auditoría significativo: la IA propuso algo inválido). body_hash sobre
    // el texto anonimizado que se envió al proveedor (anon.texto).
    await auditPostIA(supabase, {
      cct: bloque.cct,
      docenteId,
      endpoint: ENDPOINT,
      method: 'POST',
      bodyHashSource: anon.texto ?? '',
      responseStatus: 422,
    });
    return NextResponse.json(
      {
        error: {
          code: violacion.code,
          message: violacion.message,
          details: { pda_introducidos: violacion.pdaIntroducidos },
        },
      },
      { status: 422, headers: headersBase },
    );
  }

  // ── Cache populate ──
  cacheSet(hash, result.text);

  // P1-1: insert audit_log POST (200 éxito). body_hash sobre el payload
  // anonimizado (anon.texto) — nunca el prompt crudo ni texto con PII.
  await auditPostIA(supabase, {
    cct: bloque.cct,
    docenteId,
    endpoint: ENDPOINT,
    method: 'POST',
    bodyHashSource: anon.texto ?? '',
    responseStatus: 200,
  });

  return NextResponse.json(
    {
      data: {
        variante_texto: result.text,
        variante_tipo,
        bloque_id,
        origen: 'ia',
      },
    },
    { status: 200, headers: headersBase },
  );
}