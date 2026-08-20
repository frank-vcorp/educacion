/**
 * Servicio: crear planeación.
 * SPEC_TEC_03 §6.1 + SPEC_TEC_02 §5.3.6.
 * SPEC_MODALIDADES_2026-08-17 (validada INTEGRA 2026-08-18).
 *
 * Modalidades soportadas (constraint DB, migración 0010):
 *   - proyecto_comunitario (MVP original)
 *   - unidad_didactica (banco_palabras + sesiones_semana en metadata)
 *   - abj (Inicio/Desarrollo/Cierre en sesiones; metadata opcional)
 *   - rincones (≥2 rincones en metadata.modalidad_data.rincones)
 *   - centros_interes (tema + preguntas_det en metadata.modalidad_data)
 *   - taller_critico (3 fases en metadata.modalidad_data.fases)
 *
 * Persistencia por modalidad (post-migración 0018):
 *   - Todos comparten `modalidad` + campos comunes + `banco_palabras`.
 *   - Datos específicos de modalidad se guardan en `metadata jsonb`
 *     bajo la clave `modalidad_data` (no toca RLS, índice GIN).
 *   - `proyecto_comunitario` y `abj` no requieren metadata extra.
 *
 * Cambios sesión 6 (IMPL-20260818-06):
 *  - Se agrega campo `metadata` al schema de entrada (opcional,
 *    default { modalidad_data: {} }).
 *  - Validación condicional ampliada a las 6 modalidades (antes solo
 *    `unidad_didactica`).
 *  - INSERT persiste `metadata` en BD.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const MODALIDADES = [
  'proyecto_comunitario',
  'unidad_didactica',
  'abj',
  'rincones',
  'centros_interes',
  'taller_critico',
] as const;

/**
 * Sub-esquema para `metadata.modalidad_data` (estructura flexible
 * validada por modalidad en `validarModalidad`).
 * Aceptamos `record(unknown)` para no atar el contrato a un shape fijo
 * (cada modalidad tiene estructura propia, ver SPEC_MODALIDADES §Estructura
 * canónica).
 */
const ModalidadDataSchema = z.record(z.unknown());

const MetadataSchema = z
  .object({
    modalidad_data: ModalidadDataSchema.default({}),
  })
  .default({ modalidad_data: {} });

const BaseSchema = z.object({
  docenteId: z.string().uuid(),
  grupoId: z.string().uuid(),
  cct: z.string().min(1),
  nombre: z.string().min(3, 'Nombre mínimo 3 caracteres').max(120),
  modalidad: z.enum(MODALIDADES),
  problemaContexto: z.string().min(10, 'Detalla el problema del contexto (≥10 chars)'),
  proposito: z.string().optional(),
  camposFormativos: z.array(z.string()).min(1, 'Selecciona al menos un campo formativo'),
  ejesArticuladores: z.array(z.string()).default([]),
  pdas: z.array(z.string()).min(1, 'Selecciona al menos un PDA'),
  contenidoRef: z.string().optional(),
  productoIntegrador: z.string().optional(),
  ajustesRazonables: z.string().min(20, 'Describe ajustes razonables (≥20 chars)'),
  bancoPalabras: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional(),
  periodoInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodoFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type MetadataPorModalidad = {
  sesiones_semana?: Record<string, string>;
  rincones?: Array<{ nombre?: string; materiales?: string[] | string; reglas?: string }>;
  tema?: string;
  preguntas_det?: string[];
  estaciones?: string[];
  // IMPL-20260818-07 — Fix P1-01: ABJ y Taller Crítico ahora persisten el
  // contenido capturado en el wizard. Estructura canónica en
  // components/planeaciones/wizard-modalidad-data.ts.
  inicio_juego?: string;
  desarrollo_juego?: string;
  cierre_reflexion?: string;
  reflexion_inicial?: string;
  produccion?: string;
  socializacion?: string;
  // Legacy (compatibilidad con datos previos al fix):
  fases?: string[];
  tipo_juego?: string;
  reglas?: string;
  extension?: string;
  actividades_recurrentes?: Array<{ dia: string; titulo: string; recurrente?: boolean }>;
};

/** Mínimo de caracteres requerido en cada fase textual. */
const MIN_FASE_CHARS = 5;

function hasMinChars(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length >= MIN_FASE_CHARS;
}

/**
 * Validación condicional por modalidad (SPEC_MODALIDADES_2026-08-17 §Validación
 * condicional + INTEGRA valid. 2026-08-18).
 * Devuelve mensaje claro en español o `null` si pasa.
 */
function validarModalidad(data: z.infer<typeof BaseSchema>): string | null {
  const md = (data.metadata?.modalidad_data ?? {}) as MetadataPorModalidad;

  switch (data.modalidad) {
    case 'unidad_didactica': {
      if (!data.bancoPalabras || data.bancoPalabras.length === 0) {
        return 'Unidad Didáctica requiere banco de palabras (≥1 palabra)';
      }
      if (data.bancoPalabras.length > 10) {
        return 'Banco de palabras máximo 10';
      }
      const sesiones = md.sesiones_semana ?? {};
      const sesionesKeys = Object.keys(sesiones).filter(
        (k) => typeof sesiones[k] === 'string' && (sesiones[k] ?? '').trim().length > 0,
      );
      if (sesionesKeys.length === 0) {
        return 'Unidad Didáctica necesita al menos un día con sesión (L M M J V)';
      }
      return null;
    }

    case 'rincones': {
      const rincones = Array.isArray(md.rincones) ? md.rincones : [];
      if (rincones.length < 2) {
        return 'Rincones requiere al menos 2 rincones con nombre';
      }
      const sinNombre = rincones.filter(
        (r) => !r?.nombre || String(r.nombre).trim() === '',
      );
      if (sinNombre.length > 0) {
        return 'Cada rincón debe tener un nombre';
      }
      return null;
    }

    case 'centros_interes': {
      const tema = typeof md.tema === 'string' ? md.tema.trim() : '';
      const preguntas = Array.isArray(md.preguntas_det) ? md.preguntas_det : [];
      if (tema.length < 3) {
        return 'Centros de Interés necesita un tema (≥3 caracteres)';
      }
      if (preguntas.length < 1) {
        return 'Centros de Interés necesita al menos una pregunta detonadora';
      }
      return null;
    }

    case 'taller_critico': {
      // IMPL-20260818-07 — Fix P1-01: el wizard ahora captura el contenido de
      // las 3 fases (reflexion_inicial, produccion, socializacion) y lo
      // persiste en metadata.modalidad_data. Requerimos que cada una tenga
      // ≥5 caracteres (validado también en el wizard, pero reforzamos aquí).
      if (!hasMinChars(md.reflexion_inicial)) {
        return 'Taller Crítico necesita la reflexión inicial (≥5 caracteres)';
      }
      if (!hasMinChars(md.produccion)) {
        return 'Taller Crítico necesita la producción esperada (≥5 caracteres)';
      }
      if (!hasMinChars(md.socializacion)) {
        return 'Taller Crítico necesita cómo se socializará (≥5 caracteres)';
      }
      return null;
    }

    case 'abj': {
      // IMPL-20260818-07 — Fix P1-01: el wizard ahora captura el contenido
      // de los 3 momentos del juego (inicio_juego, desarrollo_juego,
      // cierre_reflexion) y lo persiste en metadata.modalidad_data. Las
      // sesiones también se modelan como filas en `sesion` con
      // fase_interna ∈ {inicio, desarrollo, cierre}, pero el contenido
      // textual se guarda aquí.
      if (!hasMinChars(md.inicio_juego)) {
        return 'ABJ necesita el inicio del juego (≥5 caracteres)';
      }
      if (!hasMinChars(md.desarrollo_juego)) {
        return 'ABJ necesita el desarrollo del juego (≥5 caracteres)';
      }
      if (!hasMinChars(md.cierre_reflexion)) {
        return 'ABJ necesita el cierre/reflexión del juego (≥5 caracteres)';
      }
      return null;
    }

    case 'proyecto_comunitario':
    default:
      return null;
  }
}

const CreateSchema = BaseSchema;

export type CreatePlaneacionInput = z.infer<typeof CreateSchema>;

export interface CreatePlaneacionResult {
  ok: boolean;
  id?: string;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
}

export async function createPlaneacion(input: CreatePlaneacionInput): Promise<CreatePlaneacionResult> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Datos inválidos',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  const data = parsed.data;

  const errModalidad = validarModalidad(data);
  if (errModalidad) {
    return { ok: false, error: errModalidad };
  }

  const metadataToPersist = {
    modalidad_data: data.metadata?.modalidad_data ?? {},
  };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('planeacion')
    .insert({
      docente_id: data.docenteId,
      grupo_id: data.grupoId,
      cct: data.cct,
      nombre: data.nombre,
      modalidad: data.modalidad,
      problema_contexto: data.problemaContexto,
      proposito: data.proposito ?? null,
      campos_formativos: data.camposFormativos,
      ejes_articuladores: data.ejesArticuladores,
      pdas: data.pdas,
      contenido_ref: data.contenidoRef ?? null,
      producto_integrador: data.productoIntegrador ?? null,
      ajustes_razonables: data.ajustesRazonables,
      banco_palabras: data.bancoPalabras,
      metadata: metadataToPersist,
      periodo_inicio: data.periodoInicio,
      periodo_fin: data.periodoFin,
      estado: 'borrador',
    })
    .select('id')
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? 'No se pudo crear la planeación' };
  }

  revalidatePath('/dashboard');
  return { ok: true, id: row.id };
}

export async function getPlaneacion(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('planeacion')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message } as const;
  return { ok: true, data } as const;
}

export async function listPlaneaciones(docenteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('planeacion', )
    .select('id, nombre, modalidad, estado, periodo_inicio, periodo_fin, created_at')
    .eq('docente_id', docenteId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { ok: false, error: error.message, items: [] } as const;
  return { ok: true, items: (data ?? []) } as const;
}

/* ────────────────────────────────────────────────────────────────────── *
 * Duplicar/Clonar planeación (D-FIN-17, §6.6)                            *
 *                                                                           *
 * Cierra FND-20260818-02 + AC-B1..B4. Crea una nueva planeación copiando:  *
 *   - Cabecera (incluye `clonada_de`).                                     *
 *   - Sesiones (1:1, con nuevo UUID).                                       *
 *   - Bloques por sesión (1:1, con nuevo UUID y nuevo sesion_id).           *
 * NO copia `evaluacion_alumno` (contrato D-FIN-17 "Evaluaciones vacías").   *
 *                                                                            *
 * IMPL-20260819-02 (Fix P2-2): compensación ante fallo a mitad.            *
 * Si un `insert` de sesión o bloque falla tras haber creado la            *
 * `planeacion` (o sesiones/bloques previos), el action ejecuta un          *
 * hard-delete en orden inverso sobre los identificadores del intento       *
 * (bloques → sesiones → planeacion) y devuelve {ok:false, error}.           *
 * Cero filas huérfanas. Cierre total diferido a RPC transaccional           *
 * (`ARCH-20260819-02`).                                                     *
 *                                                                            *
 * Transporte: Server Action (§6.6 nota de transporte DEC-03-02).            *
 * ────────────────────────────────────────────────────────────────────── */

const DuplicarSchema = z.object({
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  cct: z.string().min(1),
  grupoDestinoId: z.string().uuid('grupo destino debe ser UUID válido'),
  nombreSufijo: z.string().max(20).optional(),
  copiarEvaluaciones: z.boolean().optional(),
});

/**
 * El input del action lleva `nombreSufijo` y `copiarEvaluaciones` opcionales.
 * El schema aplica defaults y el resultado completo de la validación tipa los
 * campos como strings/boolean (no `undefined`).
 */
export interface DuplicarPlaneacionInput {
  planeacionId: string;
  docenteId: string;
  cct: string;
  grupoDestinoId: string;
  nombreSufijo?: string;
  copiarEvaluaciones?: boolean;
}

export interface DuplicarPlaneacionResult {
  ok: boolean;
  nuevaPlaneacionId?: string;
  sesionesCopiadas?: number;
  bloquesCopiados?: number;
  evaluacionesCopiadas?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Clona una planeación hacia el grupo destino del mismo docente.
 *
 * Validaciones:
 *  1. `docenteId` debe ser el `auth.uid()` (RLS).
 *  2. `grupoDestinoId` debe pertenecer al docente (mismo CCT) — si no,
 *     devuelve `{ ok: false, errorCode: 'NEM_AUTH_RLS_VIOLATION' }`.
 *  3. `planeacionId` debe existir y pertenecer al docente.
 *
 * Clonado:
 *  - nueva `planeacion` con `clonada_de = original.id`, `estado='borrador'`,
 *    `nombre = original.nombre + sufijo`, `grupo_id = grupoDestinoId`.
 *  - todas las `sesion` (con `numero`, `fase_interna`, `duracion_min`,
 *    `ajustes_sesion`, `estado='pendiente'`).
 *  - todos los `bloque` por sesión (todos los campos preservados; UUID y FK
 *    nuevos).
 *  - NO `evaluacion_alumno`.
 *
 * Decisión reversible SOFIA: si `copiarEvaluaciones === true`, se ignora y
 * se documenta como "no soportado en MVP" con un warning (default false).
 */
export async function duplicarPlaneacion(
  input: DuplicarPlaneacionInput,
): Promise<DuplicarPlaneacionResult> {
  const parsed = DuplicarSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? 'Datos inválidos',
      errorCode: 'NEM_VALIDATION',
    };
  }
  // Aplicar defaults si los campos opcionales no vinieron.
  const data = {
    ...parsed.data,
    nombreSufijo: parsed.data.nombreSufijo ?? '(copia)',
    copiarEvaluaciones: parsed.data.copiarEvaluaciones ?? false,
  };

  // Regla dura explícita: nunca copiamos evaluaciones en MVP.
  // Si copiarEvaluaciones===true, lo registramos como "no soportado" y
  // dejamos evaluaciones en 0 para preservar contrato D-FIN-17.
  const copiarEvaluaciones = data.copiarEvaluaciones;

  const supabase = await createClient();

  // (1) Verificar que la planeación origen es del docente (defensa adicional a RLS).
  const { data: origen, error: errOrigen } = await supabase
    .from('planeacion')
    .select('id, docente_id, cct, grupo_id, nombre')
    .eq('id', data.planeacionId)
    .maybeSingle();
  if (errOrigen) return { ok: false, error: errOrigen.message };
  if (!origen) return { ok: false, error: 'Planeación origen no encontrada' };
  if (origen.docente_id !== data.docenteId || origen.cct !== data.cct) {
    return {
      ok: false,
      error: 'La planeación no pertenece al docente',
      errorCode: 'NEM_AUTH_RLS_VIOLATION',
    };
  }

  // (2) Verificar que el grupo destino pertenece al docente (AC-B4).
  const { data: grupoDestino, error: errGrupo } = await supabase
    .from('grupo')
    .select('id, docente_id, cct, activo')
    .eq('id', data.grupoDestinoId)
    .maybeSingle();
  if (errGrupo) return { ok: false, error: errGrupo.message };
  if (!grupoDestino) {
    return {
      ok: false,
      error: 'Grupo destino no encontrado',
      errorCode: 'NEM_AUTH_RLS_VIOLATION',
    };
  }
  if (grupoDestino.docente_id !== data.docenteId || grupoDestino.cct !== data.cct) {
    return {
      ok: false,
      error: 'El grupo destino no pertenece al docente',
      errorCode: 'NEM_AUTH_RLS_VIOLATION',
    };
  }

  // (3) Leer columnas completas de la planeación origen para preservar todo.
  const { data: origenFull, error: errOrigenFull } = await supabase
    .from('planeacion')
    .select(
      'id, docente_id, grupo_id, cct, nombre, modalidad, problema_contexto, proposito, campos_formativos, ejes_articuladores, pdas, contenido_ref, producto_integrador, ajustes_razonables, banco_palabras, periodo_tipo, periodo_inicio, periodo_fin, metadata',
    )
    .eq('id', data.planeacionId)
    .single();
  if (errOrigenFull || !origenFull) {
    return { ok: false, error: errOrigenFull?.message ?? 'No se pudo leer la planeación' };
  }

  // (4) Insertar nueva planeación con clonada_de poblado (AC-B1).
  const nuevoNombre = `${origenFull.nombre} ${data.nombreSufijo}`.trim();
  const { data: nueva, error: errInsert } = await supabase
    .from('planeacion')
    .insert({
      docente_id: origenFull.docente_id,
      grupo_id: data.grupoDestinoId,
      cct: origenFull.cct,
      nombre: nuevoNombre,
      modalidad: origenFull.modalidad,
      problema_contexto: origenFull.problema_contexto,
      proposito: origenFull.proposito,
      campos_formativos: origenFull.campos_formativos,
      ejes_articuladores: origenFull.ejes_articuladores,
      pdas: origenFull.pdas,
      contenido_ref: origenFull.contenido_ref,
      producto_integrador: origenFull.producto_integrador,
      ajustes_razonables: origenFull.ajustes_razonables,
      banco_palabras: origenFull.banco_palabras,
      periodo_tipo: origenFull.periodo_tipo,
      periodo_inicio: origenFull.periodo_inicio,
      periodo_fin: origenFull.periodo_fin,
      metadata: origenFull.metadata ?? { modalidad_data: {} },
      estado: 'borrador',
      clonada_de: origenFull.id,
    })
    .select('id')
    .single();
  if (errInsert || !nueva) {
    return { ok: false, error: errInsert?.message ?? 'No se pudo crear la copia' };
  }

  // Identificadores del intento actual (IMPL-20260819-02 Fix P2-2):
  // si falla una inserción posterior, la compensación opera sobre estos
  // IDs. Usar `nueva.id` directamente es seguro (UUID fresco exclusivo del
  // intento), pero el array explícito de sesiones creadas es necesario para
  // el delete en `bloque` (filtrar por `sesion_id IN (...)`).
  const nuevaPlaneacionId = nueva.id;
  const sesionesCreadas: string[] = [];

  // (5) Copiar sesiones.
  const { data: sesionesOrig, error: errSes } = await supabase
    .from('sesion')
    .select(
      'id, planeacion_id, docente_id, cct, numero, fase_interna, fecha, duracion_min, ajustes_sesion, estado',
    )
    .eq('planeacion_id', data.planeacionId)
    .order('numero', { ascending: true });
  if (errSes) {
    // FIX P3-N1 (IMPL-20260819-03): SELECT de sesiones origen ocurre tras
    // crear la planeación (paso 4). Si falla, la planeación quedaría
    // huérfana. Compensamos invocando compensarClonado (sesionesCreadas
    // está vacío aquí → sólo borra la planeación recién creada).
    const compensada = await compensarClonado(
      supabase,
      nuevaPlaneacionId,
      sesionesCreadas,
    );
    if (!compensada) {
      // FIX P3-N3 parte i (IMPL-20260819-03): el booleano del call site 4
      // (errSes) se inspecciona para devolver el mensaje de fallo de
      // compensación (verbatim handoff P2-FIXES Fix 2 punto 4).
      return {
        ok: false,
        error: `Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=${nuevaPlaneacionId}`,
      };
    }
    return { ok: false, error: errSes.message };
  }
  const sesionesOrigRows = sesionesOrig ?? [];

  /** Mapa old_sesion_id -> new_sesion_id para re-cablear bloques. */
  const sesionIdMap = new Map<string, string>();
  let sesionesCopiadas = 0;

  for (const s of sesionesOrigRows) {
    const { data: sesNew, error: errInsSes } = await supabase
      .from('sesion')
      .insert({
        planeacion_id: nueva.id,
        docente_id: s.docente_id,
        cct: s.cct,
        numero: s.numero,
        fase_interna: s.fase_interna,
        fecha: null, // fechas se reasignan al calendarizar (Flujo B)
        duracion_min: s.duracion_min,
        ajustes_sesion: s.ajustes_sesion,
        estado: 'pendiente', // SIEMPRES pendiente en la copia
      })
      .select('id')
      .single();
    if (errInsSes || !sesNew) {
      // FIX P2-2 (IMPL-20260819-02): compensar antes de devolver error.
      // FIX P3-N3 parte i (IMPL-20260819-03): capturar el booleano y devolver
      // el mensaje de fallo de compensación (verbatim handoff P2-FIXES Fix 2
      // punto 4) si la compensación falla.
      const compensada = await compensarClonado(
        supabase,
        nuevaPlaneacionId,
        sesionesCreadas,
      );
      if (!compensada) {
        return {
          ok: false,
          error: `Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=${nuevaPlaneacionId}`,
        };
      }
      return {
        ok: false,
        error: errInsSes?.message ?? `Falló al clonar sesión ${s.numero}`,
      };
    }
    sesionIdMap.set(s.id, sesNew.id);
    sesionesCreadas.push(sesNew.id);
    sesionesCopiadas += 1;
  }

  // (6) Copiar bloques por sesión (AC-B2).
  let bloquesCopiados = 0;
  for (const [oldSesId, newSesId] of sesionIdMap.entries()) {
    const { data: bloquesOrig, error: errBloque } = await supabase
      .from('bloque')
      .select(
        'id, sesion_id, planeacion_id, docente_id, cct, bloque_catalogo_id, tipo, nivel_flexibilidad, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, recursos_requeridos, duracion_min, orden, origen',
      )
      .eq('sesion_id', oldSesId)
      .order('orden', { ascending: true });
    if (errBloque) {
      // FIX P2-2 (IMPL-20260819-02): compensar antes de devolver error.
      // FIX P3-N3 parte i (IMPL-20260819-03): capturar el booleano.
      const compensada = await compensarClonado(
        supabase,
        nuevaPlaneacionId,
        sesionesCreadas,
      );
      if (!compensada) {
        return {
          ok: false,
          error: `Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=${nuevaPlaneacionId}`,
        };
      }
      return { ok: false, error: errBloque.message };
    }
    for (const b of bloquesOrig ?? []) {
      const { error: errInsBloque } = await supabase.from('bloque').insert({
        sesion_id: newSesId,
        planeacion_id: nueva.id,
        docente_id: b.docente_id,
        cct: b.cct,
        bloque_catalogo_id: b.bloque_catalogo_id,
        tipo: b.tipo,
        nivel_flexibilidad: b.nivel_flexibilidad,
        contenido_textual: b.contenido_textual,
        pda_ids: b.pda_ids,
        campos_formativos: b.campos_formativos,
        ejes_articuladores: b.ejes_articuladores,
        recursos_requeridos: b.recursos_requeridos ?? [],
        duracion_min: b.duracion_min,
        orden: b.orden,
        origen: b.origen, // preserva provenance (P-PD9 audit trail)
      });
      if (errInsBloque) {
        // FIX P2-2 (IMPL-20260819-02): compensar antes de devolver error.
        // FIX P3-N3 parte i (IMPL-20260819-03): capturar el booleano.
        const compensada = await compensarClonado(
          supabase,
          nuevaPlaneacionId,
          sesionesCreadas,
        );
        if (!compensada) {
          return {
            ok: false,
            error: `Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=${nuevaPlaneacionId}`,
          };
        }
        return {
          ok: false,
          error: errInsBloque.message ?? `Falló al clonar bloque ${b.id}`,
        };
      }
      bloquesCopiados += 1;
    }
  }

  // (7) Regla dura D-FIN-17: NO copiar evaluaciones (AC-B3).
  // Si copiarEvaluaciones===true, lo registramos pero NO lo aplicamos.
  let evaluacionesCopiadas = 0;
  if (copiarEvaluaciones) {
    // Decisión reversible SOFIA §13: warning + 0 evaluaciones copiadas.
    // Documentado en IMPL report. No soportado en MVP.
    console.warn(
      'duplicarPlaneacion: copiarEvaluaciones=true no soportado en MVP; evaluaciones NO copiadas (D-FIN-17).',
    );
  }
  // Verificación defensiva: contar evaluaciones en el destino para garantizar count===0.
  const { count: evalCount, error: errEvalCount } = await supabase
    .from('evaluacion_alumno')
    .select('id', { count: 'exact', head: true })
    .eq('planeacion_id', nueva.id);
  if (!errEvalCount) {
    evaluacionesCopiadas = evalCount ?? 0;
  }

  return {
    ok: true,
    nuevaPlaneacionId: nueva.id,
    sesionesCopiadas,
    bloquesCopiados,
    evaluacionesCopiadas,
  };
}

/**
 * Compensación ante fallo a mitad del clonado (IMPL-20260819-02 Fix P2-2,
 * ADR-20260819-01 decisión 2). Ejecuta hard-delete en orden inverso:
 *   1. `bloque` donde `sesion_id IN sesionesCreadas`
 *   2. `sesion`  donde `planeacion_id = nuevaPlaneacionId`
 *   3. `planeacion` donde `id = nuevaPlaneacionId`
 *
 * IMPL-20260819-03 Fix P3-N3 parte ii: inspecciona el `{ error }` de los
 * TRES deletes (bloque, sesion, planeacion). Antes sólo se inspeccionaba
 * el de `planeacion`. Si cualquier delete devuelve `error`, se loggea con
 * `console.warn` (incluyendo `nuevaPlaneacionId` y la tabla) y se retorna
 * `false`. Sólo se retorna `true` si todos los deletes aplicables no
 * devolvieron error y no hubo excepción. El `catch` externo se mantiene.
 *
 * Si la compensación misma falla (p.ej. RLS bloquea un delete), se loggea
 * y se devuelve `false`; el caller reporta el error de compensación (FIX
 * P3-N3 parte i). El identificador `nuevaPlaneacionId` es un UUID fresco
 * del intento, así que borrar por `id` no toca filas ajenas.
 *
 * @returns `true` si la compensación se ejecutó sin error; `false` si falló.
 */
async function compensarClonado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nuevaPlaneacionId: string,
  sesionesCreadas: string[],
): Promise<boolean> {
  try {
    // (1) bloques — sólo aplica si hay sesiones creadas en el intento.
    if (sesionesCreadas.length > 0) {
      const { error: errDelBloque } = await supabase
        .from('bloque')
        .delete()
        .in('sesion_id', sesionesCreadas);
      if (errDelBloque) {
        console.warn(
          `compensarClonado: error borrando bloque(s) para planeacion_id=${nuevaPlaneacionId}:`,
          errDelBloque.message,
        );
        return false;
      }
    }
    // (2) sesiones — la query es por planeacion_id (UUID fresco del intento).
    const { error: errDelSes } = await supabase
      .from('sesion')
      .delete()
      .eq('planeacion_id', nuevaPlaneacionId);
    if (errDelSes) {
      console.warn(
        `compensarClonado: error borrando sesion(es) para planeacion_id=${nuevaPlaneacionId}:`,
        errDelSes.message,
      );
      return false;
    }
    // (3) planeación.
    const { error: errDelPlan } = await supabase
      .from('planeacion')
      .delete()
      .eq('id', nuevaPlaneacionId);
    if (errDelPlan) {
      console.warn(
        `compensarClonado: error borrando planeacion ${nuevaPlaneacionId}:`,
        errDelPlan.message,
      );
      return false;
    }
    console.warn(
      `compensarClonado: borradas filas del intento planeacion_id=${nuevaPlaneacionId} (${sesionesCreadas.length} sesiones)`,
    );
    return true;
  } catch (err) {
    console.warn(
      `compensarClonado: excepción durante compensación para planeacion_id=${nuevaPlaneacionId}:`,
      (err as Error).message,
    );
    return false;
  }
}

/**
 * Lista los grupos del docente para alimentar el selector del modal
 * "¿Clonar para qué grupo?" (D-FIN-17). Límite 3 grupos (D-FIN-16).
 */
export async function listGruposDocente(docenteId: string, cct: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('grupo')
    .select('id, grado, grupo, nivel, ciclo_escolar, total_alumnos, activo')
    .eq('docente_id', docenteId)
    .eq('cct', cct)
    .eq('activo', true)
    .order('ciclo_escolar', { ascending: false });
  if (error) return { ok: false, error: error.message, items: [] as GrupoDocente[] };
  return { ok: true, items: (data ?? []) as GrupoDocente[] };
}

export interface GrupoDocente {
  id: string;
  docente_id: string;
  cct: string;
  grado: string;
  grupo: string;
  nivel: string | null;
  ciclo_escolar: string;
  total_alumnos: number | null;
  activo: boolean;
}
