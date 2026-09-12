/**
 * Vista detalle de una planeación (T9).
 * SPEC_TEC_02 §5.3.6.
 *
 * IMPL-20260819-01 — Incluye botón "Duplicar/Clonar" (D-FIN-17, §6.6)
 * para que la maestra pueda clonar hacia otro grupo del mismo CCT.
 *
 * IMPL-20260820-01 — Incluye unidades UI:
 *  - "Bloques" (`BloqueEditor`, SPEC_TEC_08 §4.1) — lista, crea, edita
 *    bloques y por cada bloque expone F1 + F2.
 *  - "Asistente IA" F3 (`IASugerenciaPanel` para F3 en cabecera) — pule
 *    `problema_contexto` / `proposito` / `producto_integrador` /
 *    `ajustes_razonables`.
 *
 * Las Cards preexistentes (problema, campos, PDA, ejes, ajustes) y los
 * botones (Evaluar / Entregar / Duplicar / Volver) se preservan intactos.
 * La unidad IA es aditiva.
 */
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getPlaneacion } from '@/services/planeaciones/planeacion-actions';
import { getBloques } from '@/services/planeaciones/bloque-actions';
import { ensureSesionesForPlaneacion } from '@/services/planeaciones/sesion-actions';
import { getRecursosPorPlaneacion } from '@/services/planeaciones/sesion-recurso-actions';
import {
  getBloquesCatalogo,
  getPDAs,
  getCamposFormativos,
  getContenidos,
  getEjesArticuladores,
} from '@/services/catalogo/catalogo';
import { buildPdaGradoMap } from '@/lib/nivel-educativo/filtros-inventario';
import { GRADOS_PREESCOLAR } from '@/lib/nivel-educativo/scope';
import { usaWorkbookLayout, type WorkbookContexto } from '@/lib/planeaciones/workbook-layout';
import { diasHabilesEnRango } from '@/lib/planeaciones/calendario-periodo';
import { resolverWorkbookConfig } from '@/lib/planeaciones/tipo-workbook';
import { listRecursos } from '@/services/recursos-aula/recurso-actions';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { DuplicarPlaneacionDialog } from '@/components/planeaciones/duplicar-planeacion-dialog';
import { ActividadesEditor } from '@/components/planeaciones/actividades-editor';
import { ModalidadEstructuraCard } from '@/components/planeaciones/modalidad-estructura-card';
import { PlaneacionNuevaBanner } from '@/components/planeaciones/planeacion-nueva-banner';
import { IASugerenciaPanel } from '@/components/ia/ia-sugerencia-panel';
import {
  MODALIDADES_LABELS,
  type Modalidad,
} from '@/lib/planeaciones/modalidad-ui';
import { GUIA_IA } from '@/lib/planeaciones/guias';
import { SectionHelp } from '@/components/ui/section-help';

export const dynamic = 'force-dynamic';

export default async function PlaneacionDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { nueva?: string };
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const res = await getPlaneacion(params.id);
  if (!res.ok || !res.data) notFound();

  const p = res.data;
  const isOwner = p.docente_id === session.docenteId;

  // Bloques (RLS hace que sólo se devuelvan los del docente). Si la
  // consulta falla (p.ej. timeout), degradación graceful: la UI sigue
  // mostrando el resto de la planeación; `BloqueEditor` mostrará "sin
  // bloques" y el docente podrá crear uno nuevo.
  const bloquesRes = isOwner
    ? await getBloques(p.id).catch(() => ({ ok: false, data: null, error: 'timeout' as const }))
    : { ok: false, data: null, error: 'not-owner' as const };
  const bloquesIniciales = bloquesRes.ok && bloquesRes.data ? bloquesRes.data : [];
  const sesionesRes = isOwner
    ? await ensureSesionesForPlaneacion(p.id, session.docenteId!).catch(() => ({
        ok: false as const,
        data: null,
        error: 'timeout',
      }))
    : { ok: false as const, data: null, error: 'not-owner' };
  const sesionesIniciales = sesionesRes.ok && sesionesRes.data ? sesionesRes.data : [];
  const catalogoInicial = isOwner ? await getBloquesCatalogo() : [];
  const pdasCatalogo = isOwner ? await getPDAs() : [];
  const pdaGradoPorCodigo = buildPdaGradoMap(pdasCatalogo);

  let gradoPreescolar = GRADOS_PREESCOLAR[0];
  let etiquetaGrupo: string | null = null;
  if (p.grupo_id && isOwner) {
    const supabase = await createClient();
    const { data: grupoPlaneacion } = await supabase
      .from('grupo')
      .select('grado, grupo')
      .eq('id', p.grupo_id)
      .maybeSingle();
    if (grupoPlaneacion?.grado) gradoPreescolar = grupoPlaneacion.grado as typeof gradoPreescolar;
    if (grupoPlaneacion) {
      etiquetaGrupo = `${grupoPlaneacion.grado} ${grupoPlaneacion.grupo}`.trim();
    }
  }
  const recursosRes = isOwner
    ? await listRecursos(session.docenteId!)
    : { ok: false as const, items: [] };
  const recursosInventario = (recursosRes.items ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    uso: r.uso,
    cantidad: r.cantidad,
  }));
  const recursosAsignadosRes = isOwner
    ? await getRecursosPorPlaneacion(p.id)
    : { ok: false as const, data: null };
  const recursosAsignadosInicial =
    recursosAsignadosRes.ok && recursosAsignadosRes.data
      ? recursosAsignadosRes.data
      : [];
  const modalidad = p.modalidad as Modalidad;
  const modalidadData =
    ((p.metadata as { modalidad_data?: Record<string, unknown> } | null)?.modalidad_data ??
      {}) as Record<string, unknown>;
  const esNueva = searchParams?.nueva === '1';
  const esWorkbook = usaWorkbookLayout(modalidad);

  let workbook: WorkbookContexto | null = null;
  if (isOwner && esWorkbook) {
    const [camposCatalogo, ejesCatalogo, todosPdas, contenidos] = await Promise.all([
      getCamposFormativos(),
      getEjesArticuladores(),
      getPDAs(),
      getContenidos(),
    ]);
    const pdaCampoCodigo: Record<string, string> = {};
    for (const pd of todosPdas) {
      if (!pd.contenido_codigo) continue;
      const cont = contenidos.find((c) => c.codigo === pd.contenido_codigo);
      if (cont?.campo_codigo) pdaCampoCodigo[pd.codigo] = cont.campo_codigo;
    }
    const codigosCampos = (p.campos_formativos ?? []) as string[];
    const codigosPdas = (p.pdas ?? []) as string[];
    const codigosEjes = (p.ejes_articuladores ?? []) as string[];
    const preguntasRaw = modalidadData.preguntas_det;
    const metadataFull = (p.metadata ?? {}) as {
      workbook?: import('@/lib/planeaciones/tipo-workbook').WorkbookMetadata;
    };
    const wbConfig = resolverWorkbookConfig({
      modalidad,
      workbookMetadata: metadataFull.workbook ?? null,
    });
    const diasHabiles = diasHabilesEnRango(p.periodo_inicio, p.periodo_fin);
    workbook = {
      nombre: p.nombre,
      periodoInicio: p.periodo_inicio,
      periodoFin: p.periodo_fin,
      clasificacionPeriodo: wbConfig.etiquetaAlcance,
      totalDiasHabiles: diasHabiles.length,
      workbook: metadataFull.workbook ?? null,
      problemaContexto: p.problema_contexto,
      proposito: p.proposito ?? null,
      campos: camposCatalogo.filter((c) => codigosCampos.includes(c.codigo)),
      pdas: todosPdas.filter((pd) => codigosPdas.includes(pd.codigo)),
      ejes: ejesCatalogo.filter((e) => codigosEjes.includes(e.codigo)),
      ajustesRazonables: p.ajustes_razonables ?? null,
      temaCentro: typeof modalidadData.tema === 'string' ? modalidadData.tema : null,
      preguntasDet: Array.isArray(preguntasRaw)
        ? preguntasRaw.filter((x): x is string => typeof x === 'string')
        : [],
      etiquetaGrupo,
      cct: p.cct,
      pdaCampoCodigo,
      productoIntegrador: p.producto_integrador ?? null,
    };
  }

  return (
    <div
      className={`container mx-auto px-4 py-6 ${esWorkbook ? 'max-w-[1400px]' : 'max-w-6xl'}`}
    >
      {isOwner && esNueva && (
        <PlaneacionNuevaBanner modalidad={modalidad} planeacionId={p.id} />
      )}
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-nem-verde">{p.nombre}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.periodo_inicio} → {p.periodo_fin} ·{' '}
              {MODALIDADES_LABELS[modalidad] ?? p.modalidad}
              {etiquetaGrupo ? ` · ${etiquetaGrupo} preescolar` : ''}
            </p>
          </div>
          <Badge variant="secondary">{p.estado}</Badge>
        </div>
      </header>

      {!esWorkbook && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Problema del contexto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{p.problema_contexto}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos formativos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {(p.campos_formativos ?? []).map((c: string) => (
                <Badge key={c} variant="verde">{c}</Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDA trabajados</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {(p.pdas ?? []).map((pd: string) => (
                <Badge key={pd} variant="outline">{pd}</Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ejes articuladores</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {(p.ejes_articuladores ?? []).length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                (p.ejes_articuladores ?? []).map((e: string) => (
                  <Badge key={e} variant="amarillo">{e}</Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ajustes razonables</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{p.ajustes_razonables ?? '—'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isOwner && (
        <>
          <Separator className="my-6" />
          {!esWorkbook && (
            <ModalidadEstructuraCard modalidad={modalidad} modalidadData={modalidadData} />
          )}
          <section className="mt-4 space-y-4" aria-labelledby="actividades-heading">
            <h2 id="actividades-heading" className="sr-only">
              Actividades
            </h2>
            <ActividadesEditor
              planeacionId={p.id}
              docenteId={session.docenteId!}
              cct={p.cct}
              modalidad={modalidad}
              camposFormativos={(p.campos_formativos ?? []) as string[]}
              gradoPreescolar={gradoPreescolar}
              pdaGradoPorCodigo={pdaGradoPorCodigo}
              bloquesIniciales={bloquesIniciales}
              sesionesIniciales={sesionesIniciales}
              catalogoInicial={catalogoInicial}
              recursosInventario={recursosInventario}
              recursosAsignadosInicial={recursosAsignadosInicial}
              workbook={workbook}
            />
          </section>

          <section
            className="mt-6"
            aria-labelledby="asistente-ia-heading"
          >
            <h2
              id="asistente-ia-heading"
              className="mb-3 text-base font-semibold"
            >
              Asistente IA
            </h2>
            <SectionHelp
              helpId={GUIA_IA.id}
              ariaLabel={GUIA_IA.ariaLabel}
              breve={GUIA_IA.breve}
              detalle={GUIA_IA.detalle}
              className="mb-3"
            />
            <IASugerenciaPanel
              planeacionId={p.id}
              docenteId={session.docenteId!}
              cct={p.cct}
              feature="F3"
              label="Pulir campos del PDF (F3)"
            />
          </section>
        </>
      )}

      <Separator className="my-6" />

      <div className="flex flex-wrap gap-2">
        {isOwner && (
          <>
            <Button asChild variant="outline">
              <Link href={`/planeaciones/${p.id}/evaluar`}>Evaluar</Link>
            </Button>
            <Button asChild>
              <Link href={`/planeaciones/${p.id}/entregar`}>Entregar al director</Link>
            </Button>
            {/* D-FIN-17 — Duplicar/Clonar */}
            <DuplicarPlaneacionDialog
              planeacionId={p.id}
              docenteId={session.docenteId!}
              cct={p.cct}
              grupoActualId={p.grupo_id}
              planeacionNombre={p.nombre}
            />
          </>
        )}
        <Button asChild variant="ghost">
          <Link href="/planeaciones">← Mis planeaciones</Link>
        </Button>
      </div>
    </div>
  );
}
