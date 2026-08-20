/**
 * F3 — POST /api/planeaciones/[id]/ia/pulir-pdf
 * SPEC_TEC_07 §5.3 + IMPL-20260819-04.
 *
 * Pule estilísticamente campos de la planeación (P-PD8). NO persiste
 * automáticamente (P-PD9). Sin cache (el texto cambia por planeación).
 * Rate-limit 5/min/docente.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { iaChat } from '@/services/ia/client';
import { anonymizeRequest, findIrredactableField } from '@/lib/ia/anonymizer';
import { SYSTEM_PROMPT_F3 } from '@/services/ia/prompts';
import { checkRateLimit, rateLimitHeaders } from '@/services/ia/rate-limiter';
import { validarCampoPulidoF3 } from '@/services/ia/validate';
import { auditPostIA } from '@/lib/ia/audit-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CAMPOS_PULIR = [
  'problema_contexto',
  'proposito',
  'producto_integrador',
  'ajustes_razonables',
] as const;

const Body = z.object({
  campos_a_pulir: z.array(z.enum(CAMPOS_PULIR)).min(1, 'campos_a_pulir debe tener ≥1 elemento'),
});

interface RouteParams {
  params: { id: string };
}

const ENDPOINT = 'planeaciones_pulir_pdf';

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
  const { campos_a_pulir } = parsed.data;

  const supabase = await createClient();

  // Verificar planeación + cargar valores actuales de los campos.
  // NOTA (P1-1, SPEC §6.1.1): se selecciona `cct` para usarlo como CCT real
  // en el insert `audit_log` POST (nunca `docente_id`, que es UUID).
  const { data: planeacion, error: errPlane } = await supabase
    .from('planeacion')
    .select('id, docente_id, cct, estado, problema_contexto, proposito, producto_integrador, ajustes_razonables')
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

  // Cargar catálogo PDA para validación post-IA.
  const { data: pdasRows } = await supabase
    .from('pda')
    .select('codigo')
    .eq('activo', true);
  const catalogoPdas = (pdasRows ?? []).map((r) => r.codigo as string);

  // Preparar textos originales anonimizados.
  const originales: Record<string, string> = {};
  for (const campo of campos_a_pulir) {
    const v = (planeacion as unknown as Record<string, unknown>)[campo];
    originales[campo] = typeof v === 'string' ? v : '';
  }

  // Anonimización defensiva (los textos ya son del docente, no de alumnos).
  const irredactableField = findIrredactableField({ extras: originales });
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
  const anon = anonymizeRequest({ extras: originales });

  const userMsg = JSON.stringify({
    campos: campos_a_pulir.map((c) => ({
      campo: c,
      texto_original: anon.extras?.[c] ?? '',
    })),
  });

  const result = await iaChat([
    { role: 'system', content: SYSTEM_PROMPT_F3 },
    { role: 'user', content: userMsg },
  ]);

  // Degradación graceful si no es JSON válido (SPEC §8 caso 11).
  let parsed_json: { campos?: Array<{ campo?: string; texto_pulido?: string }> } | null = null;
  if (result.origen !== 'fallback_vacio') {
    try {
      // El proveedor puede envolver en ```json ... ```; intentamos extraer el primer bloque JSON.
      const raw = result.text.trim();
      const m = raw.match(/\{[\s\S]*\}/);
      const candidate = m ? m[0] : raw;
      parsed_json = JSON.parse(candidate);
    } catch {
      parsed_json = null;
    }
  }

  if (!parsed_json || !Array.isArray(parsed_json.campos)) {
    // P1-1: insert audit_log POST (fallback_vacio por JSON inválido).
    // body_hash sobre el user message anonimizado (`userMsg`).
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
          campos_pulidos: [],
          origen: 'fallback_vacio',
        },
      },
      { status: 200, headers: headersBase },
    );
  }

  // Validación post-IA: cada campo pulido contra catálogo PDA.
  const camposPulidos: Array<{ campo: string; texto_original: string; texto_pulido: string }> = [];
  for (const campo of campos_a_pulir) {
    const encontrado = parsed_json.campos.find((c) => c.campo === campo);
    const textoPulido = typeof encontrado?.texto_pulido === 'string' ? encontrado.texto_pulido : '';
    const textoOriginal = originales[campo] ?? '';

    const violacion = validarCampoPulidoF3({
      campo,
      textoPulido,
      catalogoPdas,
    });
    if (violacion) {
      // P1-1: insert audit_log POST con response_status=422 (PDA no en
      // catálogo introducido por la IA). body_hash sobre el user message
      // anonimizado (`userMsg`).
      await auditPostIA(supabase, {
        cct: planeacion.cct,
        docenteId,
        endpoint: ENDPOINT,
        method: 'POST',
        bodyHashSource: userMsg,
        responseStatus: 422,
      });
      return NextResponse.json(
        {
          error: {
            code: violacion.code,
            message: violacion.message,
            details: { campo, pda_introducidos: violacion.pdaIntroducidos },
          },
        },
        { status: 422, headers: headersBase },
      );
    }

    camposPulidos.push({
      campo,
      texto_original: textoOriginal,
      texto_pulido: textoPulido,
    });
  }

  // P1-1: insert audit_log POST (200 éxito). body_hash sobre el user message
  // anonimizado (`userMsg`).
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
        campos_pulidos: camposPulidos,
        origen: result.origen,
      },
    },
    { status: 200, headers: headersBase },
  );
}