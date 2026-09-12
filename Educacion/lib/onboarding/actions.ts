/**
 * Server actions para onboarding.
 * SPEC_TEC_04 D-FIN-4: 5 pasos (registro, CCT, grupo, alumnos, bienvenida).
 * Crea fila en `docente` con cct='', se completa al elegir CCT.
 */
'use server';

import { createClient } from '@/lib/supabase/server';
import { GRADOS_PREESCOLAR, NIVEL_EDUCATIVO_MVP } from '@/lib/nivel-educativo/scope';
import { nivelDocenteForzado, validarCCTPreescolar } from '@/lib/nivel-educativo/validar-cct';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const CCTSchema = z.object({
  cct: z.string().min(5, 'CCT inválido').max(20, 'CCT inválido'),
});

const GrupoSchema = z.object({
  cct: z.string().min(5),
  grado: z.enum(GRADOS_PREESCOLAR),
  grupo: z.string().min(1, 'Grupo requerido').max(2),
  cicloEscolar: z.string().regex(/^\d{4}-\d{4}$/, 'Ciclo debe ser YYYY-YYYY'),
  totalAlumnos: z
    .number()
    .int()
    .min(1, 'Mínimo 1 alumno')
    .max(60, 'Máximo 60 alumnos')
    .nullable(),
});

const AlumnosSchema = z.object({
  grupoId: z.string().uuid(),
  nombres: z.array(z.string().min(1).max(100)).max(60),
});

export type OnboardingResult = {
  ok: boolean;
  error?: string;
  field?: string;
  redirectTo?: string;
};

/**
 * Paso 2: guardar CCT seleccionado por el docente.
 * Crea/actualiza fila en `docente`.
 */
export async function saveCCT(formData: FormData): Promise<OnboardingResult> {
  const raw = {
    cct: String(formData.get('cct') ?? '').trim().toUpperCase(),
  };
  const parsed = CCTSchema.safeParse(raw);
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

  // Verificar que el CCT existe
  const { data: cct } = await supabase
    .from('cct')
    .select('clave, nivel')
    .eq('clave', parsed.data.cct)
    .maybeSingle();
  const cctValido = validarCCTPreescolar(cct);
  if (!cctValido.ok) return cctValido;

  // Upsert docente
  const { error } = await supabase
    .from('docente')
    .upsert(
      {
        id: user.id,
        nombre: (user.user_metadata?.nombre as string) ?? 'Docente',
        email: user.email!,
        cct: parsed.data.cct,
        nivel: nivelDocenteForzado(),
      },
      { onConflict: 'id' },
    );
  if (error) return { ok: false, error: error.message };

  return { ok: true, redirectTo: '/onboarding/grupo' };
}

/**
 * Paso 3: crear grupo.
 */
export async function createGrupo(formData: FormData): Promise<OnboardingResult> {
  const raw = {
    cct: String(formData.get('cct') ?? '').trim().toUpperCase(),
    grado: String(formData.get('grado') ?? ''),
    grupo: String(formData.get('grupo') ?? '').trim().toUpperCase(),
    cicloEscolar: String(formData.get('cicloEscolar') ?? ''),
    totalAlumnos:
      formData.get('totalAlumnos') && String(formData.get('totalAlumnos')) !== ''
        ? Number(formData.get('totalAlumnos'))
        : null,
  };
  const parsed = GrupoSchema.safeParse(raw);
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

  // Verificar que el docente no tenga ya 3 grupos (D-FIN-16)
  const { count } = await supabase
    .from('grupo')
    .select('id', { count: 'exact', head: true })
    .eq('docente_id', user.id)
    .eq('activo', true);
  if ((count ?? 0) >= 3) {
    return { ok: false, error: 'Máximo 3 grupos por docente (D-FIN-16)' };
  }

  const { data, error } = await supabase
    .from('grupo')
    .insert({
      docente_id: user.id,
      cct: parsed.data.cct,
      nivel: NIVEL_EDUCATIVO_MVP,
      grado: parsed.data.grado,
      grupo: parsed.data.grupo,
      ciclo_escolar: parsed.data.cicloEscolar,
      total_alumnos: parsed.data.totalAlumnos,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Ya tienes un grupo con esa combinación', field: 'grupo' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, redirectTo: `/onboarding/alumnos?grupo=${data.id}` };
}

/**
 * Paso 4: agregar lista de alumnos al grupo.
 * SPEC_TEC_02 §5.3.4: solo nombre + grado + ciclo (sin datos sensibles).
 */
export async function addAlumnos(formData: FormData): Promise<OnboardingResult> {
  const grupoId = String(formData.get('grupoId') ?? '');
  const nombresRaw = String(formData.get('nombres') ?? '');
  const nombres = nombresRaw
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const parsed = AlumnosSchema.safeParse({ grupoId, nombres });
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

  // Verificar que el grupo es del docente
  const { data: grupo } = await supabase
    .from('grupo')
    .select('id, cct, docente_id, grado, ciclo_escolar')
    .eq('id', parsed.data.grupoId)
    .maybeSingle();
  if (!grupo || grupo.docente_id !== user.id) {
    return { ok: false, error: 'Grupo no encontrado' };
  }

  const rows = parsed.data.nombres.map((nombre) => ({
    docente_id: user.id,
    grupo_id: parsed.data.grupoId,
    cct: grupo.cct,
    nombre,
    grado: grupo.grado,
    ciclo_escolar: grupo.ciclo_escolar,
  }));

  const { error } = await supabase.from('alumno').insert(rows);
  if (error) return { ok: false, error: error.message };

  return { ok: true, redirectTo: '/onboarding/bienvenida' };
}

/**
 * Skip paso 4 (alumnos opcionales).
 */
export async function skipAlumnos(grupoId: string): Promise<OnboardingResult> {
  if (!grupoId) return { ok: false, error: 'grupoId requerido' };
  return { ok: true, redirectTo: '/onboarding/bienvenida' };
}

/**
 * Finalizar onboarding y redirigir al dashboard.
 */
export async function finishOnboarding(): Promise<void> {
  redirect('/dashboard?welcome=1');
}
