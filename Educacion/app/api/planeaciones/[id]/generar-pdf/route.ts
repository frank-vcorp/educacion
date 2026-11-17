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
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerSession } from '@/lib/auth/session';
import { verifyUrlFirmada } from '@/lib/auth/url-firmada';
import { isSuperuserEmail } from '@/lib/auth/superuser';
import {
  buildPlaneacionHtml,
  renderPdfFromHtml,
  PdfGenerationUnavailableError,
} from '@/lib/pdf/generate';
import { fetchPlaneacionPdfPayload } from '@/lib/pdf/planeacion-pdf-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const incluirSeguimiento =
    url.searchParams.get('seguimiento') === '1' ||
    url.searchParams.get('seguimiento') === 'true';

  const tokenPayload = token ? await verifyUrlFirmada(token) : null;
  const session = await getServerSession();

  if (!session && !tokenPayload) {
    return NextResponse.json(
      { error: 'NEM_AUTH_UNAUTHORIZED' },
      { status: 401 },
    );
  }

  // Si viene token firmado válido (vista pública de director sin login), usamos admin client
  // después de validar que la entrega corresponde a esta planeación.
  const supabase = tokenPayload ? createAdminClient() : await createClient();

  if (tokenPayload) {
    const { data: entrega } = await supabase
      .from('entrega')
      .select('id, planeacion_id')
      .eq('id', tokenPayload.entrega_id)
      .maybeSingle();
    if (!entrega || entrega.planeacion_id !== params.id) {
      return NextResponse.json(
        { error: 'NEM_AUTH_RLS_VIOLATION' },
        { status: 403 },
      );
    }
  }

  const loaded = await fetchPlaneacionPdfPayload(supabase, params.id);
  if (!loaded) {
    return NextResponse.json(
      { error: 'NEM_PLANEACIONES_NOT_FOUND' },
      { status: 404 },
    );
  }

  if (!tokenPayload) {
    const isOwner = loaded.docenteId === session?.docenteId;
    const isSameCctDirector =
      Boolean(session?.cct) && session?.cct === loaded.data.cct;
    const isSuperuser = isSuperuserEmail(session?.user?.email);

    if (!isOwner && !isSameCctDirector && !isSuperuser) {
      return NextResponse.json(
        { error: 'NEM_AUTH_RLS_VIOLATION' },
        { status: 403 },
      );
    }
  }

  const html = buildPlaneacionHtml(loaded.data, { incluirSeguimiento });

  try {
    const { pdf, sha256, size } = await renderPdfFromHtml(html);

    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="planeacion-${loaded.data.id}.pdf"`,
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
