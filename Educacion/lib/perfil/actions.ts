/**
 * Server actions para gestión del perfil del docente.
 * SPEC-CORRECCIONES-2026-08-17 C-1.
 *
 * updateDocenteCCT: actualiza CCT y nivel del docente autenticado.
 * Valida que el CCT exista en el catálogo SEP.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Niveles = ['preescolar', 'primaria', 'secundaria'] as const;

const UpdateCCTSchema = z.object({
  cct: z.string().min(5, 'CCT inválido').max(20, 'CCT inválido'),
  nivel: z.enum(Niveles),
});

export type UpdateCCTResult = {
  ok: boolean;
  error?: string;
  field?: string;
};

export async function updateDocenteCCT(input: { cct: string; nivel: string }): Promise<UpdateCCTResult> {
  const parsed = UpdateCCTSchema.safeParse({
    cct: input.cct.trim().toUpperCase(),
    nivel: input.nivel,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Datos inválidos' };
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Verificar CCT existe
  const { data: cct } = await supabase
    .from('cct')
    .select('clave')
    .eq('clave', parsed.data.cct)
    .maybeSingle();
  if (!cct) return { ok: false, error: 'CCT no encontrado en catálogo SEP', field: 'cct' };

  const { error } = await supabase
    .from('docente')
    .update({ cct: parsed.data.cct, nivel: parsed.data.nivel })
    .eq('id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/perfil');
  revalidatePath('/dashboard');
  return { ok: true };
}
