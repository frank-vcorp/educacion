'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface SesionRecursoAsignado {
  sesion_id: string;
  recurso_id: string;
  cantidad_usada: number;
  nombre: string;
  categoria: string;
}

export async function getRecursosPorPlaneacion(
  planeacionId: string,
): Promise<{ ok: boolean; data: SesionRecursoAsignado[] | null; error?: string }> {
  const parsed = z.string().uuid().safeParse(planeacionId);
  if (!parsed.success) {
    return { ok: false, data: null, error: 'planeacionId inválido' };
  }
  const supabase = await createClient();
  const { data: sesiones, error: errSes } = await supabase
    .from('sesion')
    .select('id')
    .eq('planeacion_id', planeacionId);
  if (errSes) return { ok: false, data: null, error: errSes.message };
  const ids = (sesiones ?? []).map((s) => s.id);
  if (ids.length === 0) return { ok: true, data: [] };

  const { data, error } = await supabase
    .from('sesion_recurso')
    .select('sesion_id, recurso_id, cantidad_usada, recurso_aula(nombre, categoria)')
    .in('sesion_id', ids);
  if (error) return { ok: false, data: null, error: error.message };

  const rows: SesionRecursoAsignado[] = (data ?? []).flatMap((row) => {
    const raw = row.recurso_aula as
      | { nombre: string; categoria: string }
      | { nombre: string; categoria: string }[]
      | null;
    const rec = Array.isArray(raw) ? raw[0] : raw;
    if (!rec) return [];
    return [
      {
        sesion_id: row.sesion_id,
        recurso_id: row.recurso_id,
        cantidad_usada: row.cantidad_usada,
        nombre: rec.nombre,
        categoria: rec.categoria,
      },
    ];
  });
  return { ok: true, data: rows };
}

const AssignSchema = z.object({
  sesionId: z.string().uuid(),
  recursoId: z.string().uuid(),
  docenteId: z.string().uuid(),
  cct: z.string().min(1),
  cantidadUsada: z.number().int().min(1).max(999).optional(),
});

export async function assignRecursoToSesion(
  input: z.infer<typeof AssignSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: sesion, error: errSes } = await supabase
    .from('sesion')
    .select('id, docente_id, cct')
    .eq('id', data.sesionId)
    .maybeSingle();
  if (errSes) return { ok: false, error: errSes.message };
  if (!sesion || sesion.docente_id !== data.docenteId) {
    return { ok: false, error: 'Sesión no encontrada' };
  }

  const { data: recurso, error: errRec } = await supabase
    .from('recurso_aula')
    .select('id, docente_id, activo')
    .eq('id', data.recursoId)
    .maybeSingle();
  if (errRec) return { ok: false, error: errRec.message };
  if (!recurso || recurso.docente_id !== data.docenteId || !recurso.activo) {
    return { ok: false, error: 'Recurso no encontrado' };
  }

  const { error } = await supabase.from('sesion_recurso').upsert(
    {
      sesion_id: data.sesionId,
      recurso_id: data.recursoId,
      cct: data.cct,
      cantidad_usada: data.cantidadUsada ?? 1,
    },
    { onConflict: 'sesion_id,recurso_id' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const RemoveSchema = z.object({
  sesionId: z.string().uuid(),
  recursoId: z.string().uuid(),
  docenteId: z.string().uuid(),
});

export async function removeRecursoFromSesion(
  input: z.infer<typeof RemoveSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const supabase = await createClient();
  const { data: sesion } = await supabase
    .from('sesion')
    .select('docente_id')
    .eq('id', parsed.data.sesionId)
    .maybeSingle();
  if (!sesion || sesion.docente_id !== parsed.data.docenteId) {
    return { ok: false, error: 'Sin permiso' };
  }
  const { error } = await supabase
    .from('sesion_recurso')
    .delete()
    .eq('sesion_id', parsed.data.sesionId)
    .eq('recurso_id', parsed.data.recursoId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
