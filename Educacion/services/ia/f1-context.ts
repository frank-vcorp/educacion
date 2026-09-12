/**
 * Contexto pedagógico para F1 (adaptar actividad al entorno de la docente).
 */

export const F1_PROMPT_VERSION = 'v4';

export interface PdaContextoF1 {
  codigo: string;
  texto: string;
  campo?: string | null;
}

export interface ContextoPlaneacionF1 {
  nombre?: string | null;
  modalidad?: string | null;
  modalidadLabel?: string | null;
  periodo?: string | null;
  temaCentro?: string | null;
  problemaContexto?: string | null;
  proposito?: string | null;
  ajustesRazonables?: string | null;
  productoIntegrador?: string | null;
  preguntasDetonadoras?: string[];
  ejesArticuladores?: string[];
  camposFormativos?: string[];
  pdas?: PdaContextoF1[];
  momentosDelCentro?: string[];
  momentoActividad?: string | null;
  pdaIdsActividad?: string[];
  entornoSugerido?: 'urbana' | 'rural' | 'mixto';
}

export interface AdaptacionTrivial {
  code: 'NEM_IA_ADAPTACION_TRIVIAL';
  message: string;
}

export interface CatalogoF1Input {
  campos: ReadonlyArray<{ codigo: string; nombre: string }>;
  ejes: ReadonlyArray<{ codigo: string; nombre: string }>;
  pdas: ReadonlyArray<{ codigo: string; texto: string; contenido_codigo?: string | null }>;
  contenidos: ReadonlyArray<{ codigo: string; campo_codigo?: string | null }>;
}

export interface RecursoActividadF1 {
  categoria?: string;
  clave_busqueda?: string;
  cantidad?: number;
}

/** Contexto de la actividad arrastrada (catálogo NEM o propia). */
export interface ContextoActividadF1 {
  fuente: 'catalogo_nem' | 'actividad_propia';
  diaCalendario?: string | null;
  tipo?: string | null;
  tipoLabel?: string | null;
  nivelFlexibilidad?: string | null;
  nivelFlexibilidadLabel?: string | null;
  catalogoCodigo?: string | null;
  catalogoNombre?: string | null;
  catalogoDescripcion?: string | null;
  /** Texto plantilla del catálogo NEM (antes de adaptar). */
  plantillaNem?: string | null;
  recursosRequeridos?: RecursoActividadF1[];
  duracionMin?: number | null;
  observacion?: string | null;
  camposFormativos?: string[];
  ejesArticuladores?: string[];
  pdas?: PdaContextoF1[];
}

const TIPO_ACTIVIDAD_LABEL: Record<string, string> = {
  apertura: 'Inicio',
  desarrollo: 'Desarrollo',
  practica: 'Práctica',
  cierre: 'Cierre',
  evaluacion: 'Evaluación',
  evaluacion_semanal: 'Evaluación semanal',
  banco_palabras: 'Banco de palabras',
};

const NIVEL_FLEXIBILIDAD_LABEL: Record<string, string> = {
  cerrado: 'Casi lista (cerrada)',
  abierto: 'Adaptable (abierta)',
  en_blanco: 'En blanco (completar)',
};

function resolverPdasDesdeCodigos(
  codigos: string[],
  catalogo: CatalogoF1Input,
): PdaContextoF1[] {
  const { campos, pdas, contenidos } = catalogo;
  const campoPorCodigo = new Map(campos.map((c) => [c.codigo, c.nombre]));
  const pdaCampoCodigo: Record<string, string> = {};
  for (const pd of pdas) {
    if (!pd.contenido_codigo) continue;
    const cont = contenidos.find((c) => c.codigo === pd.contenido_codigo);
    if (cont?.campo_codigo) pdaCampoCodigo[pd.codigo] = cont.campo_codigo;
  }
  const out: PdaContextoF1[] = [];
  for (const codigo of codigos) {
    const pda = pdas.find((p) => p.codigo === codigo);
    if (!pda) continue;
    const campoCodigo = pdaCampoCodigo[pda.codigo];
    out.push({
      codigo: pda.codigo,
      texto: pda.texto,
      campo: campoCodigo ? (campoPorCodigo.get(campoCodigo) ?? campoCodigo) : null,
    });
  }
  return out;
}

const RURAL_HINTS =
  /\b(rural|campo|comunidad|ejido|rancho|huerto|milpa|ind[ií]gena|nahua|mixe|zapotec|maya|monte|sierra|pueblo|localidad)\b/i;
const URBAN_HINTS =
  /\b(urban[oa]|ciudad|colonia|avenida|parque|mercado|transporte|metro|autob[uú]s|escuela urbana)\b/i;

const MODALIDAD_LABEL: Record<string, string> = {
  centros_interes: 'Centro de interés',
  proyecto_comunitario: 'Proyecto comunitario',
  unidad_didactica: 'Unidad didáctica',
  taller_critico: 'Taller crítico',
  abj: 'Aprendizaje basado en juego',
};

function parsePreguntasDet(modalidadData: Record<string, unknown>): string[] {
  const raw = modalidadData.preguntas_det;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function formatPeriodo(inicio?: string | null, fin?: string | null): string | null {
  if (!inicio && !fin) return null;
  if (inicio && fin) return `${inicio} → ${fin}`;
  return inicio ?? fin ?? null;
}

/** Infiere entorno a partir de ajustes, problema y tema del centro. */
export function inferirEntornoF1(ctx: ContextoPlaneacionF1): 'urbana' | 'rural' | 'mixto' {
  const blob = [
    ctx.ajustesRazonables,
    ctx.problemaContexto,
    ctx.temaCentro,
    ctx.proposito,
    ctx.nombre,
  ]
    .filter(Boolean)
    .join(' ');

  const rural = RURAL_HINTS.test(blob);
  const urban = URBAN_HINTS.test(blob);
  if (rural && !urban) return 'rural';
  if (urban && !rural) return 'urbana';
  return 'mixto';
}

export function buildContextoPlaneacionF1(input: {
  nombre?: string | null;
  problema_contexto?: string | null;
  proposito?: string | null;
  ajustes_razonables?: string | null;
  producto_integrador?: string | null;
  modalidad?: string | null;
  periodo_inicio?: string | null;
  periodo_fin?: string | null;
  campos_formativos?: string[] | null;
  ejes_articuladores?: string[] | null;
  pdas?: string[] | null;
  metadata?: unknown;
  momento_actividad?: string | null;
  momento_actividad_label?: string | null;
  pda_ids_actividad?: string[] | null;
  momentos_guia?: ReadonlyArray<{ key: string; label: string }>;
  catalogo?: CatalogoF1Input;
}): ContextoPlaneacionF1 {
  const modalidadData =
    input.metadata &&
    typeof input.metadata === 'object' &&
    'modalidad_data' in input.metadata &&
    input.metadata.modalidad_data &&
    typeof input.metadata.modalidad_data === 'object'
      ? (input.metadata.modalidad_data as Record<string, unknown>)
      : {};

  const modalidad = input.modalidad ?? null;
  const codigosCampos = (input.campos_formativos ?? []) as string[];
  const codigosEjes = (input.ejes_articuladores ?? []) as string[];
  const codigosPdas = (input.pdas ?? []) as string[];

  const ctx: ContextoPlaneacionF1 = {
    nombre: input.nombre ?? null,
    modalidad,
    modalidadLabel: modalidad ? (MODALIDAD_LABEL[modalidad] ?? modalidad) : null,
    periodo: formatPeriodo(input.periodo_inicio, input.periodo_fin),
    temaCentro: typeof modalidadData.tema === 'string' ? modalidadData.tema : null,
    problemaContexto: input.problema_contexto ?? null,
    proposito: input.proposito ?? null,
    ajustesRazonables: input.ajustes_razonables ?? null,
    productoIntegrador: input.producto_integrador ?? null,
    preguntasDetonadoras: parsePreguntasDet(modalidadData),
    momentosDelCentro: input.momentos_guia?.map((m) => m.label) ?? [],
    momentoActividad: input.momento_actividad_label ?? input.momento_actividad ?? null,
    pdaIdsActividad: input.pda_ids_actividad ?? [],
  };

  if (input.catalogo) {
    const { campos, ejes, pdas, contenidos } = input.catalogo;
    const campoPorCodigo = new Map(campos.map((c) => [c.codigo, c.nombre]));
    const pdaCampoCodigo: Record<string, string> = {};
    for (const pd of pdas) {
      if (!pd.contenido_codigo) continue;
      const cont = contenidos.find((c) => c.codigo === pd.contenido_codigo);
      if (cont?.campo_codigo) pdaCampoCodigo[pd.codigo] = cont.campo_codigo;
    }

    ctx.camposFormativos = codigosCampos
      .map((c) => campoPorCodigo.get(c))
      .filter((n): n is string => Boolean(n));
    ctx.ejesArticuladores = codigosEjes
      .map((c) => ejes.find((e) => e.codigo === c)?.nombre)
      .filter((n): n is string => Boolean(n));
    ctx.pdas = resolverPdasDesdeCodigos(codigosPdas, input.catalogo);
  }

  ctx.entornoSugerido = inferirEntornoF1(ctx);
  return ctx;
}

export function buildContextoActividadF1(input: {
  origen?: string | null;
  bloque_catalogo_id?: string | null;
  tipo?: string | null;
  nivel_flexibilidad?: string | null;
  pda_ids?: string[] | null;
  campos_formativos?: string[] | null;
  ejes_articuladores?: string[] | null;
  recursos_requeridos?: RecursoActividadF1[] | null;
  duracion_min?: number | null;
  observacion?: string | null;
  dia_calendario?: string | null;
  catalogo: CatalogoF1Input;
  plantilla_catalogo?: {
    codigo?: string;
    nombre?: string | null;
    descripcion?: string | null;
    contenido_textual?: string | null;
  } | null;
}): ContextoActividadF1 {
  const esCatalogo =
    Boolean(input.bloque_catalogo_id) || input.origen === 'kit_template';
  const codigosCampos = (input.campos_formativos ?? []) as string[];
  const codigosEjes = (input.ejes_articuladores ?? []) as string[];
  const codigosPdas = (input.pda_ids ?? []) as string[];
  const { campos, ejes } = input.catalogo;

  const ctx: ContextoActividadF1 = {
    fuente: esCatalogo ? 'catalogo_nem' : 'actividad_propia',
    diaCalendario: input.dia_calendario ?? null,
    tipo: input.tipo ?? null,
    tipoLabel: input.tipo ? (TIPO_ACTIVIDAD_LABEL[input.tipo] ?? input.tipo) : null,
    nivelFlexibilidad: input.nivel_flexibilidad ?? null,
    nivelFlexibilidadLabel: input.nivel_flexibilidad
      ? (NIVEL_FLEXIBILIDAD_LABEL[input.nivel_flexibilidad] ?? input.nivel_flexibilidad)
      : null,
    recursosRequeridos: input.recursos_requeridos ?? [],
    duracionMin: input.duracion_min ?? null,
    observacion: input.observacion ?? null,
    camposFormativos: codigosCampos
      .map((c) => campos.find((x) => x.codigo === c)?.nombre ?? c)
      .filter(Boolean),
    ejesArticuladores: codigosEjes
      .map((c) => ejes.find((x) => x.codigo === c)?.nombre ?? c)
      .filter(Boolean),
    pdas: resolverPdasDesdeCodigos(codigosPdas, input.catalogo),
  };

  if (esCatalogo && input.plantilla_catalogo) {
    ctx.catalogoCodigo =
      input.plantilla_catalogo.codigo ?? input.bloque_catalogo_id ?? null;
    ctx.catalogoNombre = input.plantilla_catalogo.nombre ?? null;
    ctx.catalogoDescripcion = input.plantilla_catalogo.descripcion ?? null;
    ctx.plantillaNem = input.plantilla_catalogo.contenido_textual ?? null;
  } else if (esCatalogo && input.bloque_catalogo_id) {
    ctx.catalogoCodigo = input.bloque_catalogo_id;
  }

  return ctx;
}

export function buildF1UserMessage(input: {
  contenidoTextual: string;
  contexto: ContextoPlaneacionF1;
  actividad: ContextoActividadF1;
  varianteTipo?: 'urbana' | 'rural';
  /** Nueva solicitud: pide redacción distinta a adaptaciones previas. */
  alternativaDistinta?: boolean;
  /** Rompe cache determinístico en re-solicitudes. */
  semilla?: string;
}): string {
  const entorno =
    input.varianteTipo ??
    (input.contexto.entornoSugerido === 'mixto'
      ? undefined
      : input.contexto.entornoSugerido);

  const payload = {
    texto_actividad: input.contenidoTextual,
    momento_actividad: input.contexto.momentoActividad ?? '',
    contexto_actividad: {
      fuente:
        input.actividad.fuente === 'catalogo_nem'
          ? 'Actividad del catálogo NEM'
          : 'Actividad propia de la docente',
      dia_calendario: input.actividad.diaCalendario ?? '',
      tipo: input.actividad.tipoLabel ?? input.actividad.tipo ?? '',
      nivel_flexibilidad:
        input.actividad.nivelFlexibilidadLabel ?? input.actividad.nivelFlexibilidad ?? '',
      catalogo_codigo: input.actividad.catalogoCodigo ?? '',
      catalogo_nombre: input.actividad.catalogoNombre ?? '',
      catalogo_descripcion: input.actividad.catalogoDescripcion ?? '',
      plantilla_nem: input.actividad.plantillaNem ?? '',
      recursos_requeridos: input.actividad.recursosRequeridos ?? [],
      duracion_min: input.actividad.duracionMin ?? null,
      observacion: input.actividad.observacion ?? '',
      campos_formativos: input.actividad.camposFormativos ?? [],
      ejes_articuladores: input.actividad.ejesArticuladores ?? [],
      pdas: (input.actividad.pdas ?? []).map((p) => ({
        campo: p.campo ?? '',
        texto: p.texto,
      })),
    },
    resumen_centro: {
      nombre: input.contexto.nombre ?? '',
      modalidad: input.contexto.modalidadLabel ?? input.contexto.modalidad ?? '',
      periodo: input.contexto.periodo ?? '',
      problematica: input.contexto.problemaContexto ?? '',
      proposito: input.contexto.proposito ?? '',
      tema_centro: input.contexto.temaCentro ?? '',
      producto_integrador: input.contexto.productoIntegrador ?? '',
      preguntas_detonadoras: input.contexto.preguntasDetonadoras ?? [],
      ejes_articuladores: input.contexto.ejesArticuladores ?? [],
      campos_formativos: input.contexto.camposFormativos ?? [],
      pdas: (input.contexto.pdas ?? []).map((p) => ({
        campo: p.campo ?? '',
        texto: p.texto,
      })),
      ajustes_razonables: input.contexto.ajustesRazonables ?? '',
      momentos_del_centro: input.contexto.momentosDelCentro ?? [],
    },
    entorno: entorno ?? input.contexto.entornoSugerido ?? 'mixto',
    instrucciones: [
      'Adapta el texto de `texto_actividad` usando `contexto_actividad` (origen, plantilla NEM si aplica, recursos, PDAs de la actividad) y `resumen_centro`.',
      'Si viene del catálogo NEM, conserva la intención pedagógica de `plantilla_nem` pero contextualízala al centro.',
      'Si es actividad propia, enriquece lo que la docente escribió con referencias concretas del proyecto.',
      'Usa materiales, lugares y referencias concretas (p. ej. naturaleza, pinturas, alimentos del tema).',
      'Respeta el momento pedagógico y el nivel de flexibilidad indicados.',
      'Sustituye marcadores como [FIGURA], [MATERIAL] por ejemplos reales del contexto.',
      'El texto debe ser claramente distinto al original, no una copia con una frase extra.',
      ...(input.alternativaDistinta
        ? [
            'IMPORTANTE: Propón una adaptación NUEVA y claramente distinta (materiales, dinámica, vocabulario u organización diferentes) manteniendo el mismo objetivo pedagógico.',
            'No repitas redacciones anteriores ni te quedes cerca del texto original sin cambios sustanciales.',
          ]
        : []),
    ],
    ...(input.semilla ? { semilla_solicitud: input.semilla } : {}),
  };

  return JSON.stringify(payload, null, 0);
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

const PLACEHOLDER_PATTERN = /\[[^\]]+\]/g;

/** Rechaza adaptaciones que casi no cambian el texto original. */
export function validarAdaptacionMinima(
  original: string,
  variante: string,
): AdaptacionTrivial | null {
  const o = original.trim();
  const v = variante.trim();
  if (!o || !v) return null;

  const wordsO = normalizeWords(o);
  const wordsV = normalizeWords(v);
  if (wordsO.length === 0 || wordsV.length === 0) return null;

  const setO = new Set(wordsO);
  const setV = new Set(wordsV);
  const union = new Set([...setO, ...setV]);
  const inter = [...setO].filter((w) => setV.has(w)).length;
  const jaccard = inter / union.size;
  const nuevas = [...setV].filter((w) => !setO.has(w));

  const lenRatio = Math.min(o.length, v.length) / Math.max(o.length, v.length);

  const placeholdersO: string[] = o.match(PLACEHOLDER_PATTERN) ?? [];
  const placeholdersV: string[] = v.match(PLACEHOLDER_PATTERN) ?? [];
  const placeholdersSinResolver =
    placeholdersV.length > 0 &&
    placeholdersV.every((p) => placeholdersO.includes(p));

  const esTrivial =
    (jaccard >= 0.78 && lenRatio >= 0.82) ||
    (placeholdersSinResolver && jaccard >= 0.72) ||
    (nuevas.length <= 3 && jaccard >= 0.75);

  if (esTrivial) {
    return {
      code: 'NEM_IA_ADAPTACION_TRIVIAL',
      message:
        'La adaptación quedó casi igual al texto original. Intenta de nuevo o edita manualmente.',
    };
  }

  return null;
}
