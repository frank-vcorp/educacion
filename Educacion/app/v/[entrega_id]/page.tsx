/**
 * Ruta pública: vista del director con URL firmada JWT (T12 + D-FIN-5).
 * SPEC_TEC_04 §3 (app/v/[entrega_id]).
 * El director NO requiere Supabase Auth.
 */
import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { verifyUrlFirmada } from '@/lib/auth/url-firmada';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCamposFormativos, getPDAs } from '@/services/catalogo/catalogo';
import { EntregaPublicaAcciones } from '@/components/entregas/entrega-publica-acciones';

export const dynamic = 'force-dynamic';

export default async function VerEntregaPage({
  params,
  searchParams,
}: {
  params: { entrega_id: string };
  searchParams: { t?: string };
}) {
  const token = searchParams.t;
  if (!token) notFound();

  const payload = await verifyUrlFirmada(token);
  if (!payload || payload.entrega_id !== params.entrega_id) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Enlace expirado o inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Esta URL firmada ya no es válida. Pide a la maestra una nueva entrega.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = createAdminClient();
  const [{ data: entrega }, camposCatalogo, pdasCatalogo] = await Promise.all([
    supabase
      .from('entrega')
      .select('id, version, estado, fecha_creacion, planeacion_id, cct, doc_pdf_url, comentario_director')
      .eq('id', payload.entrega_id)
      .maybeSingle(),
    getCamposFormativos(),
    getPDAs(),
  ]);
  if (!entrega) notFound();

  const { data: planeacion } = await supabase
    .from('planeacion')
    .select('id, nombre, periodo_inicio, periodo_fin, problema_contexto, campos_formativos, ejes_articuladores, pdas')
    .eq('id', entrega.planeacion_id)
    .maybeSingle();

  const campoNombrePorCodigo = new Map(camposCatalogo.map((c) => [c.codigo, c.nombre]));
  const pdaTextoPorCodigo = new Map(pdasCatalogo.map((p) => [p.codigo, p.texto]));
  const pdfUrlConToken = `/api/planeaciones/${entrega.planeacion_id}/generar-pdf?t=${encodeURIComponent(token)}`;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Entrega al director · CCT {entrega.cct} · v{entrega.version}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-nem-verde">
            {planeacion?.nombre ?? 'Planeación'}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={entrega.estado === 'recibida' ? 'verde' : 'secondary'}>
              {entrega.estado === 'recibida'
                ? 'Con Vo.Bo.'
                : entrega.estado === 'con_comentarios'
                  ? 'Con observaciones'
                  : 'Pendiente de revisión'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {entrega.fecha_creacion && new Date(entrega.fecha_creacion).toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        <Button asChild className="shrink-0">
          <a href={pdfUrlConToken} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Descargar Planeación (PDF)
          </a>
        </Button>
      </header>

      {planeacion && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Problema del contexto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{planeacion.problema_contexto}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{planeacion.periodo_inicio} → {planeacion.periodo_fin}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos formativos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {(planeacion.campos_formativos ?? []).map((c: string) => (
                <Badge key={c} variant="verde">
                  {campoNombrePorCodigo.get(c) ?? c}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDA trabajados</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {(planeacion.pdas ?? []).map((pd: string) => (
                  <li key={pd} className="rounded-md border bg-muted/20 px-3 py-2">
                    {pdaTextoPorCodigo.get(pd) ?? pd}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <EntregaPublicaAcciones
        entregaId={entrega.id}
        token={token}
        estadoInicial={entrega.estado}
        comentarioInicial={entrega.comentario_director}
      />

      <p className="mt-6 text-xs text-muted-foreground">
        Esta URL es personal e intransferible. El enlace expira en 30 días desde la entrega.
      </p>
    </div>
  );
}
