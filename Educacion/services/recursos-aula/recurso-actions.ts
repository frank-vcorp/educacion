/**
 * Servicio: CRUD de recursos del aula (E21 §5).
 * SPEC_TEC_02 §5.3.10 — recurso_aula.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RecursoCreate = z.object({
  docenteId: z.string().uuid(),
  cct: z.string().min(1),
  nombre: z.string().min(1).max(80),
  categoria: z.enum(['manipulativos', 'impresos', 'sensoriales', 'simbolicos', 'musicales', 'plasticos', 'otro']),
  uso: z.string().min(1, 'Describe para qué lo usas (1-5 palabras)').max(200),
  edad: z.enum(['3-4', '4-5', '5-6', 'todas']).optional(),
  cantidad: z.number().int().min(1).max(999),
  fotoUrl: z.string().url().optional(),
});

const RecursoUpdate = RecursoCreate.partial().extend({ id: z.string().uuid() });

export type RecursoCreateInput = z.infer<typeof RecursoCreate>;

export async function createRecurso(input: RecursoCreateInput) {
  const parsed = RecursoCreate.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Datos inválidos',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  const data = parsed.data;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('recurso_aula')
    .insert({
      docente_id: data.docenteId,
      cct: data.cct,
      nombre: data.nombre,
      categoria: data.categoria,
      uso: data.uso,
      edad: data.edad ?? null,
      cantidad: data.cantidad,
      foto_url: data.fotoUrl ?? null,
      uso_fuente: 'maestra',
      activo: true,
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'No se pudo crear el recurso' };
  revalidatePath('/recursos-aula');
  return { ok: true, id: row.id };
}

export async function listRecursos(docenteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurso_aula')
    .select('id, nombre, categoria, uso, edad, cantidad, foto_url, uso_fuente, activo, created_at')
    .eq('docente_id', docenteId)
    .eq('activo', true)
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message, items: [] as never[] };
  return { ok: true, items: (data ?? []) };
}

export async function deleteRecurso(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('recurso_aula')
    .update({ activo: false })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/recursos-aula');
  return { ok: true };
}

export async function updateRecurso(input: z.infer<typeof RecursoUpdate>) {
  const parsed = RecursoUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  const supabase = await createClient();
  const { id, ...rest } = parsed.data;
  const payload: Record<string, unknown> = {};
  if (rest.nombre !== undefined) payload.nombre = rest.nombre;
  if (rest.categoria !== undefined) payload.categoria = rest.categoria;
  if (rest.uso !== undefined) payload.uso = rest.uso;
  if (rest.edad !== undefined) payload.edad = rest.edad;
  if (rest.cantidad !== undefined) payload.cantidad = rest.cantidad;
  if (rest.fotoUrl !== undefined) payload.foto_url = rest.fotoUrl;
  const { error } = await supabase.from('recurso_aula').update(payload).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/recursos-aula');
  return { ok: true };
}
