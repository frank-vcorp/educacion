/**
 * Server actions para la entrevista inicial del niño — v2 (SPEC_TEC_09 §6, ADR-20260820-05).
 *
 * Acciones:
 *   - getEntrevista: lee la entrevista (bloques 1+2 en `respuestas` y bloque 3 en `directorio`)
 *                    del ciclo activo del alumno.
 *   - upsertEntrevista: inserta/actualiza la entrevista del alumno (gate A1 + ownership +
 *                       validación literal v2 + directorio).
 *   - archivarEntrevista: transiciona borrador|completa → archivada (C1+C2).
 *
 * No se expone ninguna acción de borrado físico; la retención C1+C2 es
 * conservar + archivar, no borrar (D9-07).
 *
 * Decisiones funcionales vigentes (DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD RESUELTO):
 *   A1  Gate de captura = aviso existente (aceptacion_aviso_privacidad, D-FIN-15).
 *   B1  Director sin acceso (no se crea policy, default-deny permanente).
 *   C1  Conservar durante el ciclo + C2 archivar al finalizar (no borrar).
 *   D1  Edición in-place, sin versionado visible.
 *   D9-05 No-envío a IA: este archivo NO se importa desde app/api (subpaths ia),
 *         services/ia ni lib/ia (verificación estática AC-21 con grep).
 *
 * Contrato de RLS:
 *   - `entrevista_inicial_alumno`: policy `entrevista_docente_own` (0022, inmutable).
 *   - `directorio` (columna añadida por 0023) comparte la misma policy docente.
 *   - La tabla de entrevista familiar (SPEC_TEC_11, tabla distinta) NO se
 *     referencia desde aquí (AC-19: directorio separado de la familiar).
 */
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  type EntrevistaInicialV2,
  type EntrevistaResult,
  validateCuestionarioV2,
} from '@/types/entrevista';

// ============ Schemas de entrada ============

const AlumnoIdSchema = z.string().uuid('alumnoId inválido');

const UpsertSchema = z.object({
  alumnoId: z.string().uuid(),
  fechaAplicacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'fechaAplicacion debe ser YYYY-MM-DD'),
  estado: z.enum(['borrador', 'completa']),
  respuestas: z.unknown(), // validado en validateCuestionarioV2 (§4B.1)
  directorio: z.unknown(), // validado en validateCuestionarioV2 (§4B.2)
});

// ============ Helpers internos ============

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getGrupoActivo(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  id: string;
  grado: string;
  grupo: string;
  ciclo_escolar: string;
  cct: string;
} | null> {
  const { data } = await supabase
    .from('grupo')
    .select('id, grado, grupo, ciclo_escolar, cct')
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
  ciclo_escolar: string;
  grupo_id: string;
  docente_id: string;
  cct: string;
} | null> {
  const { data } = await supabase
    .from('alumno')
    .select('id, nombre, grado, ciclo_escolar, grupo_id, docente_id, cct')
    .eq('id', alumnoId)
    .eq('docente_id', userId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Verifica que la docente tenga una aceptación previa del aviso de privacidad
 * (gate definitivo A1). Tabla `aceptacion_aviso_privacidad` es inmutable;
 * basta con que exista 1 fila para la docente.
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
 * Lee la entrevista del niño del alumno en el ciclo activo (incluye `respuestas`
 * v2 y `directorio`). Devuelve `data: null` si no existe entrevista. Si el alumno
 * no pertenece al grupo activo de la docente devuelve error (RLS + filtro explícito).
 */
export async function getEntrevista(
  alumnoId: string,
): Promise<EntrevistaResult | { ok: true; data: EntrevistaInicialV2 | null }> {
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
    .from('entrevista_inicial_alumno')
    .select(
      'id, alumno_id, grupo_id, docente_id, cct, ciclo_escolar, tipo_entrevista, respuestas, directorio, fecha_aplicacion, estado, created_at, updated_at',
    )
    .eq('alumno_id', idParse.data)
    .eq('ciclo_escolar', grupo.ciclo_escolar)
    .eq('tipo_entrevista', 'nino')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return { ok: true, data: (data ?? null) as EntrevistaInicialV2 | null };
}

/**
 * Crea o actualiza la entrevista del niño del alumno en el ciclo activo.
 * - Gate A1: requiere aviso aceptado.
 * - Ownership: el alumno debe pertenecer al grupo activo de la docente.
 * - Validación literal v2: `respuestas` (23 ítems + 16 celdas) y `directorio`
 *   (4 contactos) deben cumplir el contrato §4B; cada texto literal debe ser
 *   idéntico al array fuente (AC-12..AC-17, AC-19, AC-20).
 * - Upsert por la unique (alumno_id, ciclo_escolar, 'nino') (D9-03).
 */
export async function upsertEntrevista(
  input: z.infer<typeof UpsertSchema>,
): Promise<EntrevistaResult> {
  const parsed = UpsertSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? 'Datos inválidos',
      field: issue?.path[0]?.toString(),
    };
  }

  // Validación literal v2 (respuestas + directorio).
  const literal = validateCuestionarioV2({
    respuestas: parsed.data.respuestas,
    directorio: parsed.data.directorio,
  });
  if (!literal.ok) {
    return { ok: false, error: literal.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Gate A1: aviso de privacidad aceptado.
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

  // El ciclo_escolar se hereda del grupo activo; ignoramos cualquier valor
  // que el cliente intentara inyectar.
  const payload = {
    alumno_id: alumno.id,
    grupo_id: grupo.id,
    docente_id: user.id,
    cct: grupo.cct,
    ciclo_escolar: grupo.ciclo_escolar,
    tipo_entrevista: 'nino' as const,
    respuestas: literal.data.respuestas,
    directorio: literal.data.directorio,
    fecha_aplicacion: parsed.data.fechaAplicacion,
    estado: parsed.data.estado,
  };

  const { data, error } = await supabase
    .from('entrevista_inicial_alumno')
    .upsert(payload, {
      onConflict: 'alumno_id,ciclo_escolar,tipo_entrevista',
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  revalidatePath(`/alumnos/${alumno.id}`);
  return { ok: true, id: data.id };
}

/**
 * Archiva la entrevista del niño del alumno (D9-07, C1+C2).
 * Transiciona `borrador`/`completa` → `archivada`. Si ya está `archivada`
 * no duplica ni marca error.
 *
 * NO se expone ninguna acción de borrado físico (retención C1+C2: conservar
 * + archivar, no borrar).
 */
export async function archivarEntrevista(
  alumnoId: string,
): Promise<EntrevistaResult<null>> {
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

  // Idempotente: si ya está archivada, no actualiza ni duplica.
  const { data: existing, error: selError } = await supabase
    .from('entrevista_inicial_alumno')
    .select('id, estado')
    .eq('alumno_id', idParse.data)
    .eq('ciclo_escolar', grupo.ciclo_escolar)
    .eq('tipo_entrevista', 'nino')
    .maybeSingle();

  if (selError) return { ok: false, error: selError.message };
  if (!existing) {
    return { ok: false, error: 'No hay entrevista para archivar' };
  }
  if (existing.estado === 'archivada') {
    // Ya archivada: no duplica, no error.
    revalidatePath('/alumnos');
    return { ok: true, data: null };
  }

  const { error } = await supabase
    .from('entrevista_inicial_alumno')
    .update({ estado: 'archivada' })
    .eq('id', existing.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/alumnos');
  revalidatePath(`/alumnos/${alumno.id}`);
  return { ok: true, data: null };
}