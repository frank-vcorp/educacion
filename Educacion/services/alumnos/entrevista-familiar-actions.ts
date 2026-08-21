/**
 * Server actions para la entrevista familiar — v1 (SPEC_TEC_11 §9, ADR-20260820-04).
 *
 * Decisiones vigentes (cerradas por DEC-20260821-01):
 *   D11-01 Tabla dedicada `entrevista_familiar_alumno`; sin `tipo_entrevista='familia'`.
 *   D11-07 Gate aviso existente (aceptacion_aviso_privacidad).
 *   D11-08 RLS única de docente; director sin acceso (default-deny).
 *   D11-09 Retención: conservar durante el ciclo + archivar al finalizar; sin borrado físico.
 *   D11-10 Edición in-place, sin versionado visible; `unique (alumno_id, ciclo_escolar)`.
 *   D11-11 Firma = nombre tecleado de mamá/papá; sin URL/imagen/hash.
 *   D11-04 No-envío a IA: este archivo NO se importa desde app/api (ia),
 *           services/ia ni lib/ia (verificación estática por grep, AC-FF7).
 *
 * ACCESOS PROTEGIDOS (NO TOCAR):
 *   - la tabla del instrumento infantil (0022/0023) — sigue intacta. La
 *     infantil NO comparte tabla ni permissions con la familiar (AC-FF6).
 *   - `services/alumnos/entrevista-actions.ts` — intacto (infantil).
 *   - `types/entrevista.ts` — intacto (infantil).
 *
 * INMUTABLES: 0001..0023 (incluyendo 0022/0023 infantil). NO se renumeran ni reescriben.
 *
 * Regla "no-use-server-required": las server actions devuelven SIEMPRE
 * `{ ok, error?, data?, id? }`; nunca lanzan excepciones al cliente.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  type EntrevistaFamiliarV1,
  type EntrevistaFamiliarResult,
  validateCuestionarioFamiliarV1,
} from '@/types/entrevista-familiar';

// ============ Schemas de entrada ============

const AlumnoIdSchema = z.string().uuid('alumnoId inválido');

const UpsertSchema = z.object({
  alumnoId: z.string().uuid(),
  fechaAplicacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'fechaAplicacion debe ser YYYY-MM-DD'),
  estado: z.enum(['borrador', 'completa']),
  respuestas: z.unknown(), // validado en validateCuestionarioFamiliarV1
});

// ============ Helpers internos ============

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getGrupoActivo(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  id: string;
  ciclo_escolar: string;
  cct: string;
} | null> {
  const { data } = await supabase
    .from('grupo')
    .select('id, ciclo_escolar, cct')
    .eq('docente_id', userId)
    .eq('activo', true)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function getAlumnoForDocente(
  supabase: SupabaseClient,
  alumnoId: string,
  userId: string,
): Promise<{
  id: string;
  nombre: string;
  grado: string;
  grupo_id: string;
  docente_id: string;
  cct: string;
} | null> {
  const { data } = await supabase
    .from('alumno')
    .select('id, nombre, grado, grupo_id, docente_id, cct')
    .eq('id', alumnoId)
    .eq('docente_id', userId)
    .maybeSingle();
  return data ?? null;
}

/**
 * D11-07 — Gate: verifica que la docente tenga una aceptación previa del aviso
 * de privacidad. Tabla `aceptacion_aviso_privacidad` es inmutable; basta con
 * que exista ≥1 fila para la docente.
 */
async function docenteAceptoAviso(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('aceptacion_aviso_privacidad')
    .select('id')
    .eq('docente_id', userId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

// ============ Server actions ============

/**
 * D11-10 — Lee la entrevista familiar del alumno en el ciclo activo. Devuelve
 * `data: null` si no existe entrevista. Si el alumno no pertenece al grupo
 * activo de la docente, devuelve error (RLS + filtro explícito).
 *
 * NOTA: la entrevista del niño NO se referencia aquí (AC-FF6 — separación estricta).
 */
export async function getEntrevistaFamiliar(
  alumnoId: string,
): Promise<
  | { ok: true; data: EntrevistaFamiliarV1 | null }
  | { ok: false; error: string }
> {
  const idParse = AlumnoIdSchema.safeParse(alumnoId);
  if (!idParse.success) {
    return { ok: false, error: 'ID de alumno inválido' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const grupo = await getGrupoActivo(supabase, user.id);
  if (!grupo) return { ok: false, error: 'No tienes un grupo activo' };

  const alumno = await getAlumnoForDocente(supabase, idParse.data, user.id);
  if (!alumno) return { ok: false, error: 'Alumno no encontrado' };

  const { data, error } = await supabase
    .from('entrevista_familiar_alumno')
    .select(
      'id, alumno_id, grupo_id, docente_id, cct, ciclo_escolar, respuestas, fecha_aplicacion, estado, created_at, updated_at',
    )
    .eq('alumno_id', idParse.data)
    .eq('ciclo_escolar', grupo.ciclo_escolar)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return { ok: true, data: (data ?? null) as EntrevistaFamiliarV1 | null };
}

/**
 * D11-09 / D11-10 — Upsert por (alumno_id, ciclo_escolar). Edición in-place; el
 * trigger `trg_entrevista_familiar_updated` actualiza `updated_at`. Gate D11-07
 * + ownership + validación literal §4.1/§4.2 antes de persistir.
 */
export async function upsertEntrevistaFamiliar(
  input: z.infer<typeof UpsertSchema>,
): Promise<EntrevistaFamiliarResult> {
  const parsed = UpsertSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? 'Datos inválidos',
      field: issue?.path[0]?.toString(),
    };
  }

  // Validación literal §4.2 + peculiaridades.
  const literal = validateCuestionarioFamiliarV1(parsed.data.respuestas);
  if (!literal.ok) {
    return { ok: false, error: literal.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Gate D11-07.
  const avisoOk = await docenteAceptoAviso(supabase, user.id);
  if (!avisoOk) {
    return {
      ok: false,
      error: 'Se requiere aceptar el aviso de privacidad antes de registrar la entrevista',
    };
  }

  const grupo = await getGrupoActivo(supabase, user.id);
  if (!grupo) return { ok: false, error: 'No tienes un grupo activo' };

  const alumno = await getAlumnoForDocente(supabase, parsed.data.alumnoId, user.id);
  if (!alumno) return { ok: false, error: 'Alumno no encontrado' };

  // Server-side: ciclo_escolar y cct se heredan del grupo activo. No aceptamos
  // valores inyectados por el cliente.
  const payload = {
    alumno_id: alumno.id,
    grupo_id: grupo.id,
    docente_id: user.id,
    cct: grupo.cct,
    ciclo_escolar: grupo.ciclo_escolar,
    respuestas: literal.data,
    fecha_aplicacion: parsed.data.fechaAplicacion,
    estado: parsed.data.estado,
  };

  const { data, error } = await supabase
    .from('entrevista_familiar_alumno')
    .upsert(payload, {
      onConflict: 'alumno_id,ciclo_escolar',
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  revalidatePath(`/alumnos/${alumno.id}`);
  return { ok: true, id: data.id };
}

/**
 * D11-09 — Archiva la entrevista familiar (transiciona
 * `borrador`/`completa` → `archivada`). Idempotente. SIN borrado físico; la
 * política C1+C2 es conservar + archivar, no borrado físico (D11-09).
 */
export async function archivarEntrevistaFamiliar(
  alumnoId: string,
): Promise<EntrevistaFamiliarResult<null>> {
  const idParse = AlumnoIdSchema.safeParse(alumnoId);
  if (!idParse.success) {
    return { ok: false, error: 'ID de alumno inválido' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const grupo = await getGrupoActivo(supabase, user.id);
  if (!grupo) return { ok: false, error: 'No tienes un grupo activo' };

  const alumno = await getAlumnoForDocente(supabase, idParse.data, user.id);
  if (!alumno) return { ok: false, error: 'Alumno no encontrado' };

  // Idempotente: si ya está archivada no duplica ni marca error.
  const { data: existing, error: selError } = await supabase
    .from('entrevista_familiar_alumno')
    .select('id, estado')
    .eq('alumno_id', idParse.data)
    .eq('ciclo_escolar', grupo.ciclo_escolar)
    .maybeSingle();

  if (selError) return { ok: false, error: selError.message };
  if (!existing) {
    return { ok: false, error: 'No hay entrevista para archivar' };
  }
  if (existing.estado === 'archivada') {
    revalidatePath('/alumnos');
    return { ok: true, data: null };
  }

  const { error } = await supabase
    .from('entrevista_familiar_alumno')
    .update({ estado: 'archivada' })
    .eq('id', existing.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  revalidatePath(`/alumnos/${alumno.id}`);
  return { ok: true, data: null };
}
