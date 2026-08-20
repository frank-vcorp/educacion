/**
 * Server action: registrar aceptación del aviso de privacidad.
 * SPEC_TEC_04 D-FIN-15. La tabla `aceptacion_aviso_privacidad` es inmutable
 * (solo INSERT, sin updated_at) — alineado con §5.3.5.
 */
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { z } from 'zod';

const AcceptSchema = z.object({
  docenteId: z.string().uuid('docenteId inválido'),
  cct: z.string().min(1, 'CCT requerido'),
  version: z.string().default('v1.0-2026-08-16'),
});

export type AvisoResult = {
  ok: boolean;
  error?: string;
};

export async function acceptAvisoPrivacidad(formData: FormData): Promise<AvisoResult> {
  const raw = {
    docenteId: String(formData.get('docenteId') ?? ''),
    cct: String(formData.get('cct') ?? ''),
    version: String(formData.get('version') ?? 'v1.0-2026-08-16'),
  };
  const parsed = AcceptSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const supabase = await createClient();
  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = h.get('user-agent') ?? null;

  const { error } = await supabase.from('aceptacion_aviso_privacidad').insert({
    docente_id: parsed.data.docenteId,
    cct: parsed.data.cct,
    version_aviso: parsed.data.version,
    ip: ip ?? undefined,
    user_agent: userAgent ?? undefined,
  });
  if (error) {
    // Si ya tiene aceptación (race condition o doble-click), tratarlo como éxito
    if (error.code === '23505' || error.message.includes('duplicate')) {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Server-side: chequea si el docente ya aceptó el aviso. Para Server Components.
 */
export async function hasAcceptedAviso(docenteId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('aceptacion_aviso_privacidad')
    .select('id')
    .eq('docente_id', docenteId)
    .limit(1)
    .maybeSingle();
  return !!data;
}
