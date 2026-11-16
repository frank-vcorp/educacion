/**
 * Servicio: registrar evaluaciones de alumnos y bitácora post-clase (D-FIN-2, D-FIN-3, Flujo C).
 * SPEC_TEC_03 §6.12 — POST /api/v1/planeaciones/:id/evaluaciones.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const EvaluacionSchema = z.object({
  planeacionId: z.string().uuid(),
  sesionId: z.string().uuid().optional(),
  alumnoId: z.string().uuid(),
  docenteId: z.string().uuid(),
  cct: z.string().min(1),
  nivel: z.number().int().min(1).max(4),
  pdaCodigo: z.string().optional(),
  observaciones: z.string().max(500).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const BatchEvaluacionSchema = z.object({
  planeacionId: z.string().uuid(),
  sesionId: z.string().uuid().optional(),
  docenteId: z.string().uuid(),
  cct: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  evaluaciones: z.array(
    z.object({
      alumnoId: z.string().uuid(),
      nivel: z.number().int().min(1).max(4),
      pdaCodigo: z.string().optional(),
      observaciones: z.string().max(500).optional(),
    }),
  ),
});

const BitacoraSchema = z.object({
  sesionId: z.string().uuid(),
  planeacionId: z.string().uuid(),
  docenteId: z.string().uuid(),
  cct: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  participacionGrupo: z.number().int().min(1).max(5),
  actividadMejorBloqueId: z.string().uuid().optional().nullable(),
  dificultades: z.string().max(2000).optional().nullable(),
  evidenciaUrl: z.string().url().optional().nullable(),
  evidenciaStoragePath: z.string().optional().nullable(),
});

export type EvaluacionInput = z.infer<typeof EvaluacionSchema>;
export type BatchEvaluacionInput = z.infer<typeof BatchEvaluacionSchema>;
export type BitacoraInput = z.infer<typeof BitacoraSchema>;

export interface EvaluacionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface BitacoraResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function upsertEvaluacion(input: EvaluacionInput): Promise<EvaluacionResult> {
  const parsed = EvaluacionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  const supabase = await createClient();

  // Upsert por (alumno_id, fecha, pda_codigo, sesion_id).
  let query = supabase
    .from('evaluacion_alumno')
    .select('id')
    .eq('alumno_id', parsed.data.alumnoId)
    .eq('fecha', parsed.data.fecha);

  if (parsed.data.pdaCodigo) {
    query = query.eq('pda_codigo', parsed.data.pdaCodigo);
  } else {
    query = query.is('pda_codigo', null);
  }

  if (parsed.data.sesionId) {
    query = query.eq('sesion_id', parsed.data.sesionId);
  } else {
    query = query.is('sesion_id', null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('evaluacion_alumno')
      .update({ nivel: parsed.data.nivel, observaciones: parsed.data.observaciones ?? null })
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/planeaciones/${parsed.data.planeacionId}/evaluar`);
    revalidatePath(`/planeaciones/${parsed.data.planeacionId}/bitacora`);
    return { ok: true, id: existing.id };
  }

  const { data: row, error } = await supabase
    .from('evaluacion_alumno')
    .insert({
      planeacion_id: parsed.data.planeacionId,
      sesion_id: parsed.data.sesionId ?? null,
      alumno_id: parsed.data.alumnoId,
      docente_id: parsed.data.docenteId,
      cct: parsed.data.cct,
      nivel: parsed.data.nivel,
      pda_codigo: parsed.data.pdaCodigo ?? null,
      observaciones: parsed.data.observaciones ?? null,
      fecha: parsed.data.fecha,
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'No se pudo guardar' };
  revalidatePath(`/planeaciones/${parsed.data.planeacionId}/evaluar`);
  revalidatePath(`/planeaciones/${parsed.data.planeacionId}/bitacora`);
  return { ok: true, id: row.id };
}

export async function upsertEvaluacionesBatch(input: BatchEvaluacionInput): Promise<{ ok: boolean; count?: number; error?: string }> {
  const parsed = BatchEvaluacionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos de batch inválidos' };

  let count = 0;
  for (const item of parsed.data.evaluaciones) {
    const res = await upsertEvaluacion({
      planeacionId: parsed.data.planeacionId,
      sesionId: parsed.data.sesionId,
      alumnoId: item.alumnoId,
      docenteId: parsed.data.docenteId,
      cct: parsed.data.cct,
      nivel: item.nivel,
      pdaCodigo: item.pdaCodigo,
      observaciones: item.observaciones,
      fecha: parsed.data.fecha,
    });
    if (res.ok) count++;
  }

  return { ok: true, count };
}

export async function listEvaluaciones(planeacionId: string, sesionId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('evaluacion_alumno')
    .select('id, alumno_id, nivel, pda_codigo, fecha, observaciones, sesion_id')
    .eq('planeacion_id', planeacionId);

  if (sesionId) {
    query = query.eq('sesion_id', sesionId);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message, items: [] as never[] };
  return { ok: true, items: (data ?? []) };
}

/**
 * Operaciones sobre la bitácora post-clase diaria
 */
export async function upsertBitacora(input: BitacoraInput): Promise<BitacoraResult> {
  const parsed = BitacoraSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos de bitácora inválidos' };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('bitacora')
    .select('id')
    .eq('sesion_id', parsed.data.sesionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('bitacora')
      .update({
        fecha: parsed.data.fecha,
        participacion_grupo: parsed.data.participacionGrupo,
        actividad_mejor_bloque_id: parsed.data.actividadMejorBloqueId ?? null,
        dificultades: parsed.data.dificultades ?? null,
        evidencia_url: parsed.data.evidenciaUrl ?? null,
        evidencia_storage_path: parsed.data.evidenciaStoragePath ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) return { ok: false, error: error.message };
    revalidatePath(`/planeaciones/${parsed.data.planeacionId}/bitacora`);
    return { ok: true, id: existing.id };
  }

  const { data: row, error } = await supabase
    .from('bitacora')
    .insert({
      sesion_id: parsed.data.sesionId,
      planeacion_id: parsed.data.planeacionId,
      docente_id: parsed.data.docenteId,
      cct: parsed.data.cct,
      fecha: parsed.data.fecha,
      participacion_grupo: parsed.data.participacionGrupo,
      actividad_mejor_bloque_id: parsed.data.actividadMejorBloqueId ?? null,
      dificultades: parsed.data.dificultades ?? null,
      evidencia_url: parsed.data.evidenciaUrl ?? null,
      evidencia_storage_path: parsed.data.evidenciaStoragePath ?? null,
    })
    .select('id')
    .single();

  if (error || !row) return { ok: false, error: error?.message ?? 'No se pudo guardar la bitácora' };
  revalidatePath(`/planeaciones/${parsed.data.planeacionId}/bitacora`);
  return { ok: true, id: row.id };
}

export async function getBitacoraPorSesion(sesionId: string): Promise<{ ok: boolean; data?: any; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bitacora')
    .select('*')
    .eq('sesion_id', sesionId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? null };
}

export async function listBitacorasPorPlaneacion(planeacionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bitacora')
    .select('*')
    .eq('planeacion_id', planeacionId)
    .order('fecha', { ascending: true });

  if (error) return { ok: false, error: error.message, items: [] };
  return { ok: true, items: (data ?? []) };
}
