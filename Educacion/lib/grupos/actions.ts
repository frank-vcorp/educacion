/**
 * Server actions para gestión de grupos.
 * SPEC-CORRECCIONES-2026-08-17 C-2.
 *
 * - updateGrupo: editar grado, grupo, ciclo_escolar, total_alumnos
 * - deleteGrupo: soft delete (activo=false) y opcionalmente desactivar alumnos
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Grados = ['1°', '2°', '3°'] as const;

const UpdateSchema = z.object({
  id: z.string().uuid(),
  grado: z.enum(Grados),
  grupo: z.string().min(1, 'Grupo requerido').max(2),
  cicloEscolar: z.string().regex(/^\d{4}-\d{4}$/, 'Ciclo debe ser YYYY-YYYY'),
  totalAlumnos: z
    .number()
    .int()
    .min(1, 'Mínimo 1 alumno')
    .max(60, 'Máximo 60 alumnos')
    .nullable()
    .optional(),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

export type GrupoResult = {
  ok: boolean;
  error?: string;
  field?: string;
};

export async function updateGrupo(input: {
  id: string;
  grado: string;
  grupo: string;
  cicloEscolar: string;
  totalAlumnos: number | null;
}): Promise<GrupoResult> {
  const parsed = UpdateSchema.safeParse({
    id: input.id,
    grado: input.grado,
    grupo: input.grupo.trim().toUpperCase(),
    cicloEscolar: input.cicloEscolar,
    totalAlumnos: input.totalAlumnos ?? null,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Datos inválidos' };
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Verificar ownership
  const { data: owns } = await supabase
    .from('grupo')
    .select('id')
    .eq('id', parsed.data.id)
    .eq('docente_id', user.id)
    .maybeSingle();
  if (!owns) return { ok: false, error: 'Grupo no encontrado' };

  const { error } = await supabase
    .from('grupo')
    .update({
      grado: parsed.data.grado,
      grupo: parsed.data.grupo,
      ciclo_escolar: parsed.data.cicloEscolar,
      total_alumnos: parsed.data.totalAlumnos ?? null,
    })
    .eq('id', parsed.data.id);

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Ya tienes un grupo con esa combinación', field: 'grupo' };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/planeaciones/nueva');
  revalidatePath('/alumnos');
  revalidatePath(`/grupos/${parsed.data.id}/editar`);
  return { ok: true };
}

export async function deleteGrupo(input: { id: string }): Promise<GrupoResult> {
  const parsed = DeleteSchema.safeParse({ id: input.id });
  if (!parsed.success) return { ok: false, error: 'ID inválido' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Verificar ownership
  const { data: owns } = await supabase
    .from('grupo')
    .select('id')
    .eq('id', parsed.data.id)
    .eq('docente_id', user.id)
    .maybeSingle();
  if (!owns) return { ok: false, error: 'Grupo no encontrado' };

  // Soft delete: marcar grupo como inactivo
  const { error } = await supabase
    .from('grupo')
    .update({ activo: false })
    .eq('id', parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/alumnos');
  revalidatePath('/planeaciones');
  return { ok: true };
}
