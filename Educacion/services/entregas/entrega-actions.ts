/**
 * Servicio: entregar planeación al director (D-FIN-5 + D-FIN-19).
 * Genera URL firmada JWT (30 días) + link wa.me con mensaje pre-armado.
 *
 * IMPL-20260819-01: usa `lib/pdf/generate.ts` para producir un binario PDF
 * real (no HTML) y persiste el SHA-256 verdadero en `entrega.pdf_sha256`,
 * alineado con el endpoint §6.30 (`GET /api/planeaciones/:id/generar-pdf`).
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { signUrlFirmada } from '@/lib/auth/url-firmada';
import {
  buildPlaneacionHtml,
  type PlaneacionPdfData,
  renderPdfFromHtml,
  PdfGenerationUnavailableError,
} from '@/lib/pdf/generate';

const EntregarSchema = z.object({
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  cct: z.string().min(1),
  directorCelular: z
    .string()
    .regex(/^\d{10,15}$/, 'Celular a 10-15 dígitos (solo números)')
    .optional(),
  mensajePersonalizado: z.string().max(500).optional(),
});

export type EntregarInput = z.infer<typeof EntregarSchema>;

export interface EntregarResult {
  ok: boolean;
  entregaId?: string;
  urlFirmada?: string;
  urlWhatsapp?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Genera PDF binario real + calcula SHA-256 del mismo binario que será
 * retornado por el endpoint `/api/planeaciones/:id/generar-pdf`.
 * El `renderer` puede inyectarse en tests para evitar chromium real.
 */
export interface GenerarPdfParaEntregaOptions {
  renderer?: import('@/lib/pdf/generate').PdfRenderer;
}

export async function generarPdfParaEntrega(
  data: { planeacionId: string; cct: string },
  options: GenerarPdfParaEntregaOptions = {},
): Promise<{ pdf: Buffer; sha256: string; size: number }> {
  const supabase = await createClient();
  const { data: planeacion } = await supabase
    .from('planeacion')
    .select(
      'id, nombre, problema_contexto, campos_formativos, ejes_articuladores, pdas, periodo_inicio, periodo_fin, docente_id, cct, ajustes_razonables, updated_at',
    )
    .eq('id', data.planeacionId)
    .maybeSingle();
  if (!planeacion) {
    throw new Error('Planeación no encontrada para generar PDF');
  }
  const html = buildPlaneacionHtml(planeacion as PlaneacionPdfData);
  return renderPdfFromHtml(html, { renderer: options.renderer });
}

export async function entregarDirector(input: EntregarInput): Promise<EntregarResult> {
  const parsed = EntregarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // Generar PDF binario y obtener SHA-256 REAL del mismo binario que E30 entrega.
  let pdfSha256Real: string;
  try {
    const { sha256 } = await generarPdfParaEntrega({
      planeacionId: data.planeacionId,
      cct: data.cct,
    });
    pdfSha256Real = sha256;
  } catch (err) {
    if (err instanceof PdfGenerationUnavailableError) {
      return {
        ok: false,
        error: err.message,
        errorCode: err.code,
      };
    }
    return { ok: false, error: (err as Error).message };
  }

  const version = 1;
  const docPdfStoragePath = `ccts/${data.cct}/planeaciones/${data.planeacionId}/${version}.pdf`;
  const docPdfUrl = `/api/planeaciones/${data.planeacionId}/generar-pdf`;

  // Insertar entrega inicial
  const { data: entregaRow, error: insErr } = await supabase
    .from('entrega')
    .insert({
      planeacion_id: data.planeacionId,
      docente_id: data.docenteId,
      cct: data.cct,
      version,
      estado: 'entregada',
      doc_pdf_url: docPdfUrl,
      doc_pdf_storage_path: docPdfStoragePath,
      pdf_sha256: pdfSha256Real,
      director_celular: data.directorCelular ?? null,
      url_firmada_token: 'pending',
      url_firmada_expira_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();
  if (insErr || !entregaRow) {
    return { ok: false, error: insErr?.message ?? 'No se pudo crear la entrega' };
  }

  // Firmar JWT
  const { token, expiraAt } = await signUrlFirmada({
    entrega_id: entregaRow.id,
    cct: data.cct,
    docente_id: data.docenteId,
    scope: 'director:view',
  });

  // Actualizar con el token firmado
  await supabase
    .from('entrega')
    .update({ url_firmada_token: token, url_firmada_expira_at: expiraAt.toISOString() })
    .eq('id', entregaRow.id);

  // Marcar planeación como entregada
  await supabase
    .from('planeacion')
    .update({ estado: 'entregada' })
    .eq('id', data.planeacionId);

  const urlFirmada = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nem.mx'}/v/${entregaRow.id}?t=${token}`;

  // Construir wa.me deep link
  const mensajeBase = data.mensajePersonalizado
    ? data.mensajePersonalizado
    : 'Hola, te comparto mi planeación didáctica NEM. Ábrela en el enlace:';
  const urlWhatsapp = data.directorCelular
    ? `https://wa.me/${data.directorCelular}?text=${encodeURIComponent(`${mensajeBase}\n\n${urlFirmada}`)}`
    : undefined;

  revalidatePath(`/planeaciones/${data.planeacionId}`);
  return {
    ok: true,
    entregaId: entregaRow.id,
    urlFirmada,
    urlWhatsapp,
  };
}
