/**
 * Server actions para gestión de alumnos.
 * SPEC-CORRECCIONES-2026-08-17 C-3.
 *
 * - createAlumno: agregar un alumno al grupo activo
 * - updateAlumno: editar nombre de un alumno existente
 * - deleteAlumno: marcar alumno como inactivo (soft delete)
 * - bulkAddAlumnos: agregar varios alumnos a la vez
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const CreateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

const BulkSchema = z.object({
  nombres: z.array(z.string().min(1).max(100)).min(1).max(60),
});

export type AlumnoResult = {
  ok: boolean;
  error?: string;
  field?: string;
  id?: string;
};

async function getGrupoActivoId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('grupo')
    .select('id, grado, ciclo_escolar, cct')
    .eq('docente_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function getGrupoInfo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('grupo')
    .select('id, grado, ciclo_escolar, cct, docente_id')
    .eq('docente_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function createAlumno(input: { nombre: string }): Promise<AlumnoResult> {
  const parsed = CreateSchema.safeParse({ nombre: input.nombre.trim() });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Datos inválidos' };
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const grupo = await getGrupoInfo(supabase);
  if (!grupo) return { ok: false, error: 'No tienes un grupo activo' };

  const { data, error } = await supabase
    .from('alumno')
    .insert({
      docente_id: user.id,
      grupo_id: grupo.id,
      cct: grupo.cct,
      nombre: parsed.data.nombre,
      grado: grupo.grado,
      ciclo_escolar: grupo.ciclo_escolar,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  revalidatePath('/dashboard');
  return { ok: true, id: data.id };
}

export async function updateAlumno(input: { id: string; nombre: string }): Promise<AlumnoResult> {
  const parsed = UpdateSchema.safeParse({ id: input.id, nombre: input.nombre.trim() });
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
    .from('alumno')
    .select('id')
    .eq('id', parsed.data.id)
    .eq('docente_id', user.id)
    .maybeSingle();
  if (!owns) return { ok: false, error: 'Alumno no encontrado' };

  const { error } = await supabase
    .from('alumno')
    .update({ nombre: parsed.data.nombre })
    .eq('id', parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  return { ok: true };
}

export async function deleteAlumno(input: { id: string }): Promise<AlumnoResult> {
  const parsed = DeleteSchema.safeParse({ id: input.id });
  if (!parsed.success) return { ok: false, error: 'ID inválido' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Verificar ownership
  const { data: owns } = await supabase
    .from('alumno')
    .select('id')
    .eq('id', parsed.data.id)
    .eq('docente_id', user.id)
    .maybeSingle();
  if (!owns) return { ok: false, error: 'Alumno no encontrado' };

  // Soft delete: marcar activo=false
  const { error } = await supabase
    .from('alumno')
    .update({ activo: false })
    .eq('id', parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function bulkAddAlumnos(input: { nombres: string }): Promise<AlumnoResult & { count?: number }> {
  const list = input.nombres
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const parsed = BulkSchema.safeParse({ nombres: list });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Datos inválidos' };
    return { ok: false, error: issue.message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const grupo = await getGrupoInfo(supabase);
  if (!grupo) return { ok: false, error: 'No tienes un grupo activo' };

  const rows = parsed.data.nombres.map((nombre) => ({
    docente_id: user.id,
    grupo_id: grupo.id,
    cct: grupo.cct,
    nombre,
    grado: grupo.grado,
    ciclo_escolar: grupo.ciclo_escolar,
  }));

  const { error } = await supabase.from('alumno').insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  revalidatePath('/dashboard');
  return { ok: true, count: rows.length };
}
