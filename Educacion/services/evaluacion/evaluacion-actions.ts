/**
 * Servicio: registrar evaluaciones de alumnos (D-FIN-2, D-FIN-3).
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

const BatchSchema = z.array(EvaluacionSchema).min(1).max(50);

export type EvaluacionInput = z.infer<typeof EvaluacionSchema>;

export interface EvaluacionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function upsertEvaluacion(input: EvaluacionInput): Promise<EvaluacionResult> {
  const parsed = EvaluacionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  const supabase = await createClient();

  // Upsert por (alumno_id, fecha, pda_codigo, sesion_id).
  const { data: existing } = await supabase
    .from('evaluacion_alumno')
    .select('id')
    .eq('alumno_id', parsed.data.alumnoId)
    .eq('fecha', parsed.data.fecha)
    .eq('pda_codigo', parsed.data.pdaCodigo ?? null)
    .eq('sesion_id', parsed.data.sesionId ?? null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('evaluacion_alumno')
      .update({ nivel: parsed.data.nivel, observaciones: parsed.data.observaciones ?? null })
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/planeaciones/${parsed.data.planeacionId}/evaluar`);
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
  return { ok: true, id: row.id };
}

export async function listEvaluaciones(planeacionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('evaluacion_alumno')
    .select('id, alumno_id, nivel, pda_codigo, fecha, observaciones')
    .eq('planeacion_id', planeacionId);
  if (error) return { ok: false, error: error.message, items: [] as never[] };
  return { ok: true, items: (data ?? []) };
}
