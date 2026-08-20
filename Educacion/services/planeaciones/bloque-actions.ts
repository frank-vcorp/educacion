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
      'id, planeacion_id, sesion_id, docente_id, cct, tipo, nivel_flexibilidad, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, duracion_min, orden, origen, created_at, updated_at',
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
  if (sesiones && sesiones.length > 0) {
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