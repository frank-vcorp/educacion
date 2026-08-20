/**
 * Endpoint: generar PDF de planeación (T12 + §6.30).
 * SPEC_TEC_03 §6.30 + D-FIN-5 "Descargable" + IMPL-20260819-01.
 *
 * Cierre FND-20260818-04: retorna PDF BINARIO real (no HTML imprimible),
 * con SHA-256 verdadero en header `X-Pdf-Sha256`. Si el renderer no está
 * disponible (entorno dev sin chromium o `PDF_GENERATOR !== 'playwright'`),
 * responde 422 `NEM_ENTREGA_PDF_GENERATION_FAILED` — NUNCA HTML.
 *
 * Comparte el renderer con `services/entregas/entrega-actions.ts` vía
 * `lib/pdf/generate.ts`.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/auth/session';
import {
  buildPlaneacionHtml,
  type PlaneacionPdfData,
  renderPdfFromHtml,
  PdfGenerationUnavailableError,
} from '@/lib/pdf/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: 'NEM_AUTH_UNAUTHORIZED' },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const { data: planeacion } = await supabase
    .from('planeacion')
    .select(
      'id, nombre, problema_contexto, campos_formativos, ejes_articuladores, pdas, periodo_inicio, periodo_fin, docente_id, cct, ajustes_razonables, updated_at',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!planeacion) {
    return NextResponse.json(
      { error: 'NEM_PLANEACIONES_NOT_FOUND' },
      { status: 404 },
    );
  }
  if (planeacion.docente_id !== session.docenteId) {
    return NextResponse.json(
      { error: 'NEM_AUTH_RLS_VIOLATION' },
      { status: 403 },
    );
  }

  const html = buildPlaneacionHtml(planeacion as PlaneacionPdfData);

  try {
    const { pdf, sha256, size } = await renderPdfFromHtml(html);

    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="planeacion-${planeacion.id}.pdf"`,
        'Content-Length': String(size),
        'X-Pdf-Sha256': sha256,
        // Sin caché porque el hash podría ser estable sólo si el input es idéntico;
        // de todos modos permitimos al cliente reusar corto plazo.
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    if (err instanceof PdfGenerationUnavailableError) {
      return NextResponse.json(
        {
          error: err.code,
          message:
            'No se pudo generar el PDF en este entorno. Intenta de nuevo o exporta desde el navegador.',
        },
        { status: err.httpStatus },
      );
    }
    console.error('generar-pdf: error inesperado', err);
    return NextResponse.json(
      {
        error: 'NEM_ENTREGA_PDF_GENERATION_FAILED',
        message: 'No se pudo generar el PDF en este entorno. Intenta de nuevo o exporta desde el navegador.',
      },
      { status: 422 },
    );
  }
}
