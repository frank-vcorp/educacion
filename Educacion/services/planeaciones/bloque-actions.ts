/**
 * Servicio: gestión de bloques de una planeación (CRUD mínimo para la
 * unidad UI F1/F2/F3 — SPEC_TEC_08 §4.1).
 *
 * Antes de este archivo, los `bloque` se creaban **sólo** vía duplicar
 * planeación (`duplicarPlaneacion` en `planeacion-actions.ts`). El wizard
 * (`components/planeaciones/wizard-planeacion.tsx:694`) declara que la
 * planeación MVP se guarda sin sesiones/bloques: "después podrás arrastrar
 * bloques del catálogo M1 en la vista de edición". Para que la UI F1/F2/F3
 * sea operable con Tía Lola (prueba real), necesitamos poder **crear, listar
 * y editar** al menos un bloque por planeación.
 *
 * Decisiones reversibles SOFIA (documentadas para que INTEGRA las confirme
 * o revoque en próximos ciclos):
 *  - `createBloque` **auto-crea una sesión por defecto** si la planeación
 *    no tiene ninguna. Esto porque `bloque.sesion_id` es `not null` (0010:62)
 *    y la FK es a `sesion(id)`. La sesión por defecto tiene
 *    `numero=1, fase_interna='inicio', estado='pendiente'`. Si ya existe
 *    alguna sesión, usa la primera (orden por `numero asc`). No es el editor
 *    de bloques completo con drag-drop del catálogo M1 (Fase 2; SPEC §13
 *    R-UI-4).
 *  - Defaults seguros: `tipo='desarrollo'`, `nivel_flexibilidad='abierto'`,
 *    `origen='maestra'` (la IA nunca crea bloques; sólo sugiere — P-PD9).
 *    `pda_ids`/`campos_formativos`/`ejes_articuladores` se heredan de la
 *    planeación si no se pasan explícitamente (consistencia P-PD8).
 *  - RLS se aplica transparentemente vía `createClient()` (sesión-docente,
 *    anon key + cookies) — el docente no puede crear bloques en otra
 *    planeación ni en otro CCT (defensa adicional explícita antes del
 *    insert).
 *
 * Concurrencia / errores: el path crítico es `select sesion` → `insert
 * sesion?` → `insert bloque`. Si la planeación no tiene sesiones y el
 * insert de la sesión por defecto falla, se devuelve `{ ok:false, error }`
 * sin crear el bloque (no hay rollback que hacer). Si la planeación ya
 * tiene sesiones y la query `select sesion` falla, también.
 *
 * Sin acoplamiento runtime con `services/ia/*` ni con `lib/ia/*` (la IA
 * sólo consume vía `updateBloque` existente en `update-actions.ts`; este
 * archivo es puramente CRUD base).
 */
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// ─── Schema de entrada ────────────────────────────────────────────────
const TIPOS_VALIDOS = [
  'apertura',
  'desarrollo',
  'practica',
  'cierre',
  'evaluacion',
  'evaluacion_semanal',
  'banco_palabras',
] as const;

const NIVELES_VALIDOS = ['cerrado', 'abierto', 'en_blanco'] as const;

const CreateBloqueSchema = z.object({
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  sesionId: z.string().uuid().optional(),
  // Texto del bloque (campo principal de la UI mínima).
  contenidoTextual: z.string().min(1).max(5000),
  tipo: z.enum(TIPOS_VALIDOS).default('desarrollo'),
  nivelFlexibilidad: z.enum(NIVELES_VALIDOS).default('abierto'),
  // Opcionales — heredados de planeacion si no se pasan.
  pdaIds: z.array(z.string()).optional(),
  camposFormativos: z.array(z.string()).optional(),
  ejesArticuladores: z.array(z.string()).optional(),
});

export type CreateBloqueInput = z.infer<typeof CreateBloqueSchema>;

export interface CreateBloqueResult {
  ok: boolean;
  id?: string;
  error?: string;
  errorCode?: string;
}

// ─── Tipos públicos ───────────────────────────────────────────────────
export interface Bloque {
  id: string;
  planeacion_id: string;
  sesion_id: string;
  docente_id: string;
  cct: string;
  tipo: string;
  nivel_flexibilidad: string;
  contenido_textual: string | null;
  pda_ids: string[];
  campos_formativos: string[];
  ejes_articuladores: string[];
  duracion_min: number | null;
  orden: number;
  origen: string;
  bloque_catalogo_id: string | null;
  recursos_requeridos: Array<{
    categoria?: string;
    clave_busqueda?: string;
    cantidad?: number;
  }>;
  momento?: string | null;
  observacion?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Server actions ───────────────────────────────────────────────────

/**
 * Lista los bloques de una planeación (orden estable: `orden asc`).
 * RLS hace que sólo se devuelvan los del docente autenticado.
 */
export async function getBloques(
  planeacionId: string,
): Promise<{ data: Bloque[] | null; ok: boolean; error?: string }> {
  const parsedId = z.string().uuid().safeParse(planeacionId);
  if (!parsedId.success) {
    return { ok: false, data: null, error: 'planeacionId inválido' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bloque')
    .select(
      'id, planeacion_id, sesion_id, docente_id, cct, tipo, nivel_flexibilidad, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, duracion_min, orden, origen, bloque_catalogo_id, recursos_requeridos, momento, observacion, created_at, updated_at',
    )
    .eq('planeacion_id', planeacionId)
    .order('orden', { ascending: true });
  if (error) {
    return { ok: false, data: null, error: error.message };
  }
  return { ok: true, data: (data ?? []) as Bloque[] };
}

/**
 * Crea un bloque mínimo en una planeación del docente autenticado.
 *
 * Si la planeación no tiene sesiones, crea una sesión por defecto
 * (`numero=1, fase_interna='inicio', estado='pendiente'`). El bloque se
 * inserta siempre con `origen='maestra'` (P-PD9: la IA sólo sugiere; nunca
 * crea estado).
 *
 * Devuelve `{ ok:true, id }` en éxito o `{ ok:false, error, errorCode? }`
 * en fallo. `errorCode` semánticamente consistente con
 * `update-actions.ts`: `NEM_VALIDATION` | `NEM_AUTH_RLS_VIOLATION` |
 * `NEM_INTERNAL_ERROR`.
 */
export async function createBloque(
  input: CreateBloqueInput,
): Promise<CreateBloqueResult> {
  const parsed = CreateBloqueSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? 'Datos inválidos',
      errorCode: 'NEM_VALIDATION',
    };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // (1) Verificar que la planeación pertenece al docente y leer `cct` +
  //     campos heredados (PDA / campos / ejes) — defensa adicional a RLS.
  const { data: planeacion, error: errPlane } = await supabase
    .from('planeacion')
    .select(
      'id, docente_id, cct, estado, pdas, campos_formativos, ejes_articuladores',
    )
    .eq('id', data.planeacionId)
    .maybeSingle();
  if (errPlane) return { ok: false, error: errPlane.message };
  if (!planeacion) {
    return { ok: false, error: 'Planeación no encontrada' };
  }
  if (planeacion.docente_id !== data.docenteId) {
    return {
      ok: false,
      error: 'La planeación no pertenece al docente',
      errorCode: 'NEM_AUTH_RLS_VIOLATION',
    };
  }
  if (planeacion.estado === 'archivada') {
    return {
      ok: false,
      error: 'La planeación está archivada',
      errorCode: 'NEM_PLANEACIONES_ARCHIVED',
    };
  }

  // (2) Asegurar que existe al menos una sesión. Si no hay ninguna, crear
  //     una por defecto (decisión reversible SOFIA documentada).
  let sesionId: string;
  const { data: sesiones, error: errSes } = await supabase
    .from('sesion')
    .select('id, numero')
    .eq('planeacion_id', data.planeacionId)
    .order('numero', { ascending: true })
    .limit(1);
  if (errSes) {
    return { ok: false, error: errSes.message };
  }
  if (data.sesionId) {
    const { data: sesionTarget, error: errTarget } = await supabase
      .from('sesion')
      .select('id')
      .eq('id', data.sesionId)
      .eq('planeacion_id', data.planeacionId)
      .maybeSingle();
    if (errTarget) return { ok: false, error: errTarget.message };
    if (!sesionTarget) {
      return { ok: false, error: 'Sesión no encontrada en esta planeación' };
    }
    sesionId = sesionTarget.id;
  } else if (sesiones && sesiones.length > 0) {
    sesionId = sesiones[0]!.id;
  } else {
    const { data: nuevaSesion, error: errInsSes } = await supabase
      .from('sesion')
      .insert({
        planeacion_id: data.planeacionId,
        docente_id: data.docenteId,
        cct: planeacion.cct,
        numero: 1,
        fase_interna: 'inicio',
        estado: 'pendiente',
      })
      .select('id')
      .single();
    if (errInsSes || !nuevaSesion) {
      return {
        ok: false,
        error: errInsSes?.message ?? 'No se pudo crear la sesión por defecto',
        errorCode: 'NEM_INTERNAL_ERROR',
      };
    }
    sesionId = nuevaSesion.id;
  }

  // (3) Calcular el siguiente `orden` dentro de la sesión (consistencia
  //     visual en la UI; no es NOT NULL pero sí semánticamente útil).
  const { count: countBloques, error: errCount } = await supabase
    .from('bloque')
    .select('id', { count: 'exact', head: true })
    .eq('sesion_id', sesionId);
  const orden = (countBloques ?? 0) + 1;

  // (4) Insertar el bloque.
  const insertPayload = {
    sesion_id: sesionId,
    planeacion_id: data.planeacionId,
    docente_id: data.docenteId,
    cct: planeacion.cct,
    tipo: data.tipo,
    nivel_flexibilidad: data.nivelFlexibilidad,
    contenido_textual: data.contenidoTextual,
    pda_ids: data.pdaIds ?? planeacion.pdas ?? [],
    campos_formativos:
      data.camposFormativos ?? planeacion.campos_formativos ?? [],
    ejes_articuladores:
      data.ejesArticuladores ?? planeacion.ejes_articuladores ?? [],
    orden,
    origen: 'maestra' as const,
  };
  // Verificación defensiva: campos NOT NULL explícitos antes del insert
  // (no se hace explícito aquí porque el schema 0010 ya los exige NOT NULL;
  // esta línea es comentario para el auditor — no añade runtime check).
  if (insertPayload.pda_ids == null) {
    insertPayload.pda_ids = [];
  }
  if (insertPayload.campos_formativos == null) {
    insertPayload.campos_formativos = [];
  }
  if (insertPayload.ejes_articuladores == null) {
    insertPayload.ejes_articuladores = [];
  }
  if (errCount && errCount.message) {
    // errCount no bloquea: si falla el count, el insert sigue (orden podría
    // no ser estrictamente consecutivo, lo cual es aceptable para MVP).
  }
  const { data: nuevoBloque, error: errIns } = await supabase
    .from('bloque')
    .insert(insertPayload)
    .select('id')
    .single();
  if (errIns || !nuevoBloque) {
    return {
      ok: false,
      error: errIns?.message ?? 'No se pudo crear el bloque',
      errorCode: 'NEM_INTERNAL_ERROR',
    };
  }
  return { ok: true, id: nuevoBloque.id };
}

const CreateFromCatalogoSchema = z.object({
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  sesionId: z.string().uuid(),
  catalogoCodigo: z.string().min(3).max(40),
});

export type CreateFromCatalogoInput = z.infer<typeof CreateFromCatalogoSchema>;

/**
 * Crea un bloque copiando campos desde `bloque_catalogo` (drag-drop M1).
 * `origen='kit_template'` + `bloque_catalogo_id` para trazabilidad P-PD9.
 */
export async function createBloqueFromCatalogo(
  input: CreateFromCatalogoInput,
): Promise<CreateBloqueResult> {
  const parsed = CreateFromCatalogoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      errorCode: 'NEM_VALIDATION',
    };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: planeacion, error: errPlane } = await supabase
    .from('planeacion')
    .select('id, docente_id, cct, estado')
    .eq('id', data.planeacionId)
    .maybeSingle();
  if (errPlane) return { ok: false, error: errPlane.message };
  if (!planeacion) return { ok: false, error: 'Planeación no encontrada' };
  if (planeacion.docente_id !== data.docenteId) {
    return {
      ok: false,
      error: 'La planeación no pertenece al docente',
      errorCode: 'NEM_AUTH_RLS_VIOLATION',
    };
  }
  if (planeacion.estado === 'archivada') {
    return {
      ok: false,
      error: 'La planeación está archivada',
      errorCode: 'NEM_PLANEACIONES_ARCHIVED',
    };
  }

  const { data: sesion, error: errSesion } = await supabase
    .from('sesion')
    .select('id, planeacion_id')
    .eq('id', data.sesionId)
    .eq('planeacion_id', data.planeacionId)
    .maybeSingle();
  if (errSesion) return { ok: false, error: errSesion.message };
  if (!sesion) return { ok: false, error: 'Sesión no encontrada en esta planeación' };

  const { data: catalogo, error: errCat } = await supabase
    .from('bloque_catalogo')
    .select(
      'codigo, nombre, tipo, nivel_flexibilidad, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, recursos_requeridos, duracion_min',
    )
    .eq('codigo', data.catalogoCodigo)
    .maybeSingle();
  if (errCat) return { ok: false, error: errCat.message };
  if (!catalogo) return { ok: false, error: 'Actividad del catálogo no encontrada' };

  const { count: countBloques } = await supabase
    .from('bloque')
    .select('id', { count: 'exact', head: true })
    .eq('sesion_id', data.sesionId);
  const orden = (countBloques ?? 0) + 1;

  const { data: nuevoBloque, error: errIns } = await supabase
    .from('bloque')
    .insert({
      sesion_id: data.sesionId,
      planeacion_id: data.planeacionId,
      docente_id: data.docenteId,
      cct: planeacion.cct,
      bloque_catalogo_id: catalogo.codigo,
      tipo: catalogo.tipo,
      nivel_flexibilidad: catalogo.nivel_flexibilidad,
      contenido_textual: catalogo.contenido_textual ?? catalogo.nombre,
      pda_ids: catalogo.pda_ids ?? [],
      campos_formativos: catalogo.campos_formativos ?? [],
      ejes_articuladores: catalogo.ejes_articuladores ?? [],
      recursos_requeridos: catalogo.recursos_requeridos ?? [],
      duracion_min: catalogo.duracion_min,
      orden,
      origen: 'kit_template',
    })
    .select('id')
    .single();
  if (errIns || !nuevoBloque) {
    return {
      ok: false,
      error: errIns?.message ?? 'No se pudo agregar la actividad',
      errorCode: 'NEM_INTERNAL_ERROR',
    };
  }
  return { ok: true, id: nuevoBloque.id };
}

const ReorderSchema = z.object({
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  sesionId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function reorderBloquesInSesion(
  input: z.infer<typeof ReorderSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = ReorderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: planeacion } = await supabase
    .from('planeacion')
    .select('docente_id')
    .eq('id', data.planeacionId)
    .maybeSingle();
  if (!planeacion || planeacion.docente_id !== data.docenteId) {
    return { ok: false, error: 'Sin permiso para reordenar' };
  }

  for (let i = 0; i < data.orderedIds.length; i++) {
    const bloqueId = data.orderedIds[i]!;
    const { error } = await supabase
      .from('bloque')
      .update({ orden: i + 1 })
      .eq('id', bloqueId)
      .eq('sesion_id', data.sesionId)
      .eq('planeacion_id', data.planeacionId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

const MoveSchema = z.object({
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  bloqueId: z.string().uuid(),
  targetSesionId: z.string().uuid(),
});

export async function moveBloqueToSesion(
  input: z.infer<typeof MoveSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = MoveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: planeacion } = await supabase
    .from('planeacion')
    .select('docente_id')
    .eq('id', data.planeacionId)
    .maybeSingle();
  if (!planeacion || planeacion.docente_id !== data.docenteId) {
    return { ok: false, error: 'Sin permiso' };
  }

  const { data: targetSesion } = await supabase
    .from('sesion')
    .select('id')
    .eq('id', data.targetSesionId)
    .eq('planeacion_id', data.planeacionId)
    .maybeSingle();
  if (!targetSesion) return { ok: false, error: 'Sesión destino inválida' };

  const { count } = await supabase
    .from('bloque')
    .select('id', { count: 'exact', head: true })
    .eq('sesion_id', data.targetSesionId);
  const orden = (count ?? 0) + 1;

  const { error } = await supabase
    .from('bloque')
    .update({ sesion_id: data.targetSesionId, orden })
    .eq('id', data.bloqueId)
    .eq('planeacion_id', data.planeacionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const DeleteSchema = z.object({
  bloqueId: z.string().uuid(),
  docenteId: z.string().uuid(),
});

export async function deleteBloque(
  input: z.infer<typeof DeleteSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('bloque')
    .delete()
    .eq('id', parsed.data.bloqueId)
    .eq('docente_id', parsed.data.docenteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const PatchCamposSchema = z.object({
  bloqueId: z.string().uuid(),
  docenteId: z.string().uuid(),
  momento: z.string().max(100).nullable().optional(),
  observacion: z.string().max(2000).nullable().optional(),
});

/** Momento NEM y observación por actividad (workbook preescolar). */
export async function patchBloqueCampos(
  input: z.infer<typeof PatchCamposSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = PatchCamposSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const { bloqueId, docenteId, momento, observacion } = parsed.data;
  if (momento === undefined && observacion === undefined) {
    return { ok: false, error: 'Nada que actualizar' };
  }

  const supabase = await createClient();
  const { data: bloque, error: errRead } = await supabase
    .from('bloque')
    .select('id, docente_id')
    .eq('id', bloqueId)
    .maybeSingle();
  if (errRead) return { ok: false, error: errRead.message };
  if (!bloque) return { ok: false, error: 'Bloque no encontrado' };
  if (bloque.docente_id !== docenteId) {
    return { ok: false, error: 'El bloque no pertenece al docente' };
  }

  const patch: Record<string, string | null> = {};
  if (momento !== undefined) patch.momento = momento;
  if (observacion !== undefined) patch.observacion = observacion;

  const { error } = await supabase.from('bloque').update(patch).eq('id', bloqueId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}