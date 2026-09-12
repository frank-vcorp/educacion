/**
 * Carga datos completos de una planeación para el PDF corrido (workbook).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCamposFormativos,
  getContenidos,
  getEjesArticuladores,
  getPDAs,
} from '@/services/catalogo/catalogo';
import {
  getSeccionesGuia,
  MODALIDADES_LABELS,
  type Modalidad,
} from '@/lib/planeaciones/modalidad-ui';
import {
  RUTINARIAS_PREESCOLAR,
  RECURRENTES_EJEMPLO,
} from '@/lib/planeaciones/rutinarias-preescolar';
import type { PlaneacionPdfData } from '@/lib/pdf/generate';

export async function fetchPlaneacionPdfPayload(
  supabase: SupabaseClient,
  planeacionId: string,
): Promise<{ data: PlaneacionPdfData; docenteId: string } | null> {
  const { data: planeacion } = await supabase
    .from('planeacion')
    .select(
      'id, nombre, modalidad, problema_contexto, proposito, producto_integrador, campos_formativos, ejes_articuladores, pdas, periodo_inicio, periodo_fin, docente_id, cct, ajustes_razonables, updated_at, metadata, grupo_id',
    )
    .eq('id', planeacionId)
    .maybeSingle();

  if (!planeacion) return null;

  let grupoEtiqueta: string | null = null;
  if (planeacion.grupo_id) {
    const { data: grupo } = await supabase
      .from('grupo')
      .select('grado, grupo')
      .eq('id', planeacion.grupo_id)
      .maybeSingle();
    if (grupo) grupoEtiqueta = `${grupo.grado} ${grupo.grupo}`.trim();
  }

  const [camposCatalogo, ejesCatalogo, pdasCatalogo, contenidos, sesionesRes, bloquesRes] =
    await Promise.all([
      getCamposFormativos(),
      getEjesArticuladores(),
      getPDAs(),
      getContenidos(),
      supabase
        .from('sesion')
        .select('id, numero, ajustes_sesion')
        .eq('planeacion_id', planeacionId)
        .order('numero', { ascending: true }),
      supabase
        .from('bloque')
        .select(
          'id, sesion_id, contenido_textual, momento, observacion, recursos_requeridos, orden',
        )
        .eq('planeacion_id', planeacionId)
        .order('orden', { ascending: true }),
    ]);

  const modalidad = (planeacion.modalidad ?? 'proyecto_comunitario') as Modalidad;
  const modalidadData =
    ((planeacion.metadata as { modalidad_data?: Record<string, unknown> } | null)
      ?.modalidad_data ?? {}) as Record<string, unknown>;

  const momentoLabels: Record<string, string> = {};
  for (const m of getSeccionesGuia(modalidad)) {
    momentoLabels[m.key] = m.label;
  }

  const codigosCampos = (planeacion.campos_formativos ?? []) as string[];
  const codigosPdas = (planeacion.pdas ?? []) as string[];
  const codigosEjes = (planeacion.ejes_articuladores ?? []) as string[];

  const pdaCampoCodigo: Record<string, string> = {};
  for (const pd of pdasCatalogo) {
    if (!pd.contenido_codigo) continue;
    const cont = contenidos.find((c) => c.codigo === pd.contenido_codigo);
    if (cont?.campo_codigo) pdaCampoCodigo[pd.codigo] = cont.campo_codigo;
  }

  const bloquesPorSesion = new Map<string, typeof bloquesRes.data>();
  for (const b of bloquesRes.data ?? []) {
    const list = bloquesPorSesion.get(b.sesion_id) ?? [];
    list.push(b);
    bloquesPorSesion.set(b.sesion_id, list);
  }

  const sesiones = (sesionesRes.data ?? []).map((s) => ({
    numero: s.numero,
    etiqueta: s.ajustes_sesion ?? `Sesión ${s.numero}`,
    bloques: (bloquesPorSesion.get(s.id) ?? []).map((b) => ({
      contenido: b.contenido_textual ?? '',
      momento: b.momento ?? null,
      observacion: b.observacion ?? null,
      recursos: formatRecursos(b.recursos_requeridos),
    })),
  }));

  const preguntasRaw = modalidadData.preguntas_det;

  return {
    data: {
    id: planeacion.id,
    nombre: planeacion.nombre,
    modalidad,
    modalidad_label: MODALIDADES_LABELS[modalidad] ?? modalidad,
    periodo_inicio: planeacion.periodo_inicio,
    periodo_fin: planeacion.periodo_fin,
    problema_contexto: planeacion.problema_contexto,
    proposito: planeacion.proposito ?? null,
    producto_integrador: planeacion.producto_integrador ?? null,
    campos_formativos: codigosCampos,
    ejes_articuladores: codigosEjes,
    pdas: codigosPdas,
    ajustes_razonables: planeacion.ajustes_razonables,
    cct: planeacion.cct,
    updated_at: planeacion.updated_at,
    grupo_etiqueta: grupoEtiqueta,
    tema_centro: typeof modalidadData.tema === 'string' ? modalidadData.tema : null,
    preguntas_det: Array.isArray(preguntasRaw)
      ? preguntasRaw.filter((x): x is string => typeof x === 'string')
      : [],
    campos_nombres: Object.fromEntries(
      camposCatalogo
        .filter((c) => codigosCampos.includes(c.codigo))
        .map((c) => [c.codigo, c.nombre]),
    ),
    pdas_texto: Object.fromEntries(
      pdasCatalogo.filter((p) => codigosPdas.includes(p.codigo)).map((p) => [p.codigo, p.texto]),
    ),
    pda_campo_codigo: pdaCampoCodigo,
    ejes_nombres: Object.fromEntries(
      ejesCatalogo.filter((e) => codigosEjes.includes(e.codigo)).map((e) => [e.codigo, e.nombre]),
    ),
    momento_labels: momentoLabels,
    rutinarias: [...RUTINARIAS_PREESCOLAR],
    recurrentes: [...RECURRENTES_EJEMPLO],
    sesiones,
    },
    docenteId: planeacion.docente_id,
  };
}

function formatRecursos(
  raw: unknown,
): string | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parts = raw
    .map((r) => {
      if (typeof r !== 'object' || r == null) return '';
      const o = r as { nombre?: string; clave_busqueda?: string; categoria?: string };
      return o.nombre ?? o.clave_busqueda ?? o.categoria ?? '';
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}
