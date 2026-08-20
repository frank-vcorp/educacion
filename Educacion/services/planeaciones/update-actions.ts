/**
 * Servicio: actualizar bloque / planeación aceptando sugerencia IA.
 *
 * SPEC_TEC_07 §6.1 + IMPL-20260819-04 (AC-11, AC-17): tras POST F1/F2/F3,
 * la maestra decide si acepta. Si acepta, PATCH al bloque o planeación
 * persiste el texto con `origen` trazable. P-PD9: la IA sólo sugiere.
 *
 * Decisión reversible SOFIA: estos actions se crean ahora porque no
 * existían y los AC-11/AC-17 requieren PATCH posterior. Patrón idéntico
 * a `createPlaneacion`: zod → `createClient()` → RLS → `audit_log`.
 *
 * `origen` permitido: `'ia_sugerencia'` | `'maestra_editado_de_ia'`
 * (los demás son readonly por invariante funcional).
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { auditPostIA } from '@/lib/ia/audit-post';

const ORIGEN_IA = ['ia_sugerencia', 'maestra_editado_de_ia'] as const;
type OrigenIA = (typeof ORIGEN_IA)[number];

const UpdateBloqueSchema = z.object({
  bloqueId: z.string().uuid(),
  docenteId: z.string().uuid(),
  contenidoTextual: z.string().min(1).max(5000),
  origen: z.enum(ORIGEN_IA),
});

export type UpdateBloqueInput = z.infer<typeof UpdateBloqueSchema>;

export interface UpdateBloqueResult {
  ok: boolean;
  id?: string;
  error?: string;
  errorCode?: string;
  /**
   * P1-2 (SPEC §6.1.1): cuando el insert `audit_log` falla, se expone aquí
   * el código de error para observabilidad sin revertir el update de bloque
   * ya aplicado. Backward-compatible: ausente si el insert tuvo éxito.
   */
  auditError?: string;
}

/**
 * Actualiza `contenido_textual` y `origen` de un bloque. El docente debe
 * ser el dueño (RLS + verificación explícita). NO modifica PDA / campos /
 * ejes (P-PD8); esos campos se mantienen intactos.
 */
export async function updateBloque(input: UpdateBloqueInput): Promise<UpdateBloqueResult> {
  const parsed = UpdateBloqueSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? 'Datos inválidos',
      errorCode: 'NEM_VALIDATION',
    };
  }
  const { bloqueId, docenteId, contenidoTextual, origen } = parsed.data;

  const supabase = await createClient();

  // (1) Cargar bloque y verificar ownership (defensa adicional a RLS).
  // NOTA (P1-2): se selecciona `cct` para usarlo en el insert `audit_log`
  // (FK a `cct(clave)`, migración 0013:58). Antes no se seleccionaba y se
  // usaba `bloque.docente_id` (UUID) → `foreign_key_violation` 100%.
  const { data: bloque, error: errRead } = await supabase
    .from('bloque')
    .select('id, docente_id, cct')
    .eq('id', bloqueId)
    .maybeSingle();
  if (errRead) return { ok: false, error: errRead.message };
  if (!bloque) return { ok: false, error: 'Bloque no encontrado' };
  if (bloque.docente_id !== docenteId) {
    return { ok: false, error: 'El bloque no pertenece al docente', errorCode: 'NEM_AUTH_RLS_VIOLATION' };
  }

  // (2) Update contenido_textual + origen. Mantiene pda_ids / campos / ejes.
  const { error: errUpd } = await supabase
    .from('bloque')
    .update({ contenido_textual: contenidoTextual, origen })
    .eq('id', bloqueId);
  if (errUpd) return { ok: false, error: errUpd.message };

  // (3) Audit trail: trazar la aceptación (post-IA).
  // NOTA (P1-2): se usa `bloque.cct` (CCT real, formato `cct.clave`) en vez
  // de `bloque.docente_id` (UUID). Se inspecciona `{ error }` y, si falla,
  // se loggea y se expone `auditError` para observabilidad sin revertir el
  // update ya aplicado (fail-loud, SPEC §6.1.1).
  const auditRes = await auditPostIA(supabase, {
    cct: bloque.cct,
    docenteId,
    endpoint: 'update_bloque_post_ia',
    method: 'PATCH',
    bodyHashSource: `${bloqueId}|${origen}|${contenidoTextual}`,
    responseStatus: 200,
  });

  revalidatePath(`/dashboard/planeaciones`);
  if (!auditRes.ok) {
    return { ok: true, id: bloqueId, auditError: auditRes.error.code ?? auditRes.error.message };
  }
  return { ok: true, id: bloqueId };
}

const F3_CAMPOS = [
  'problema_contexto',
  'proposito',
  'producto_integrador',
  'ajustes_razonables',
] as const;
type F3Campo = (typeof F3_CAMPOS)[number];

const UpdatePlaneacionSchema = z.object({
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  cambios: z
    .object({
      problema_contexto: z.string().min(1).optional(),
      proposito: z.string().optional(),
      producto_integrador: z.string().optional(),
      ajustes_razonables: z.string().min(20).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: 'Debe incluir al menos un campo a actualizar',
    }),
});

export type UpdatePlaneacionInput = z.infer<typeof UpdatePlaneacionSchema>;

export interface UpdatePlaneacionResult {
  ok: boolean;
  id?: string;
  camposActualizados?: F3Campo[];
  error?: string;
  errorCode?: string;
  /**
   * P3 opcional de consistencia (mismo patrón fail-loud que `updateBloque`,
   * SPEC §6.1.1): si el insert `audit_log` falla, se expone aquí el código
   * de error sin revertir el update de planeación ya aplicado.
   * Backward-compatible: ausente si el insert tuvo éxito.
   */
  auditError?: string;
}

/**
 * Actualiza campos abiertos de una planeación (F3). Verifica ownership
 * (RLS + check explícito). Sólo permite los 4 campos del enum F3.
 */
export async function updatePlaneacion(
  input: UpdatePlaneacionInput,
): Promise<UpdatePlaneacionResult> {
  const parsed = UpdatePlaneacionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? 'Datos inválidos',
      errorCode: 'NEM_VALIDATION',
    };
  }
  const { planeacionId, docenteId, cambios } = parsed.data;

  const supabase = await createClient();

  // (1) Verificar ownership y estado no archivado.
  const { data: planeacion, error: errRead } = await supabase
    .from('planeacion')
    .select('id, docente_id, estado, cct')
    .eq('id', planeacionId)
    .maybeSingle();
  if (errRead) return { ok: false, error: errRead.message };
  if (!planeacion) return { ok: false, error: 'Planeación no encontrada' };
  if (planeacion.docente_id !== docenteId) {
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

  // (2) Filtrar sólo campos permitidos (defensa en profundidad).
  const patch: Partial<Record<F3Campo, string>> = {};
  const camposActualizados: F3Campo[] = [];
  for (const campo of F3_CAMPOS) {
    const value = cambios[campo];
    if (typeof value === 'string') {
      patch[campo] = value;
      camposActualizados.push(campo);
    }
  }
  if (camposActualizados.length === 0) {
    return { ok: false, error: 'Sin campos válidos para actualizar' };
  }

  // (3) Update.
  const { error: errUpd } = await supabase
    .from('planeacion')
    .update(patch)
    .eq('id', planeacionId);
  if (errUpd) return { ok: false, error: errUpd.message };

  // (4) Audit trail (mismo patrón fail-loud que `updateBloque`, P3 de
  // consistencia). `cct` ya es correcto aquí; el cambio respecto a IMPL-04
  // es inspeccionar `{ error }` y exponer `auditError` sin revertir el
  // update ya aplicado (SPEC §6.1.1).
  const auditRes = await auditPostIA(supabase, {
    cct: planeacion.cct,
    docenteId,
    endpoint: 'update_planeacion_post_ia_f3',
    method: 'PATCH',
    bodyHashSource: `${planeacionId}|${camposActualizados.join(',')}`,
    responseStatus: 200,
  });

  revalidatePath(`/dashboard/planeaciones`);
  if (!auditRes.ok) {
    return {
      ok: true,
      id: planeacionId,
      camposActualizados,
      auditError: auditRes.error.code ?? auditRes.error.message,
    };
  }
  return { ok: true, id: planeacionId, camposActualizados };
}

// La trazabilidad PATCH (post-IA) la maneja `auditPostIA` importada desde
// `@/lib/ia/audit-post` (helper único reusable por los 3 routes IA y por
// ambos server actions). `hashShort` vive en ese mismo helper; este archivo
// ya no la importa ni la duplica.

export const F3_CAMPOS_PULIBLES = F3_CAMPOS;