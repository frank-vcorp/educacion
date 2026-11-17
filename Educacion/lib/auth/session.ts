/**
 * Helpers de sesión y usuario.
 * SPEC_TEC_04 §7.4: getServerSession, useUser.
 * Patrón seguro: getUser() (valida JWT contra Supabase), NUNCA getSession().
 */
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import {
  parseRolPlantelConfig,
  type DirectorEstado,
  type RolPlantel,
} from '@/lib/auth/roles-cct';

export interface SessionInfo {
  user: User;
  cct: string | null;
  docenteId: string | null;
  docenteNombre: string | null;
  /** Nivel del docente en BD; MVP solo admite preescolar. */
  nivelDocente: string | null;
  rolActivo: RolPlantel;
  rolesDisponibles: RolPlantel[];
  directorEstado?: DirectorEstado;
  hasAcceptedAviso: boolean;
  hasGrupoActivo: boolean;
}

/**
 * Server-side: obtiene sesión validada y datos del docente. Para Server Components.
 * Retorna null si no hay sesión válida.
 */
export async function getServerSession(): Promise<SessionInfo | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Cargar docente, aviso de privacidad y conteo de grupos en paralelo
  const [docenteRes, avisoRes, gruposRes] = await Promise.all([
    supabase
      .from('docente')
      .select('id, nombre, cct, nivel, activo, configuracion_m4')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('aceptacion_aviso_privacidad')
      .select('id')
      .eq('docente_id', user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('grupo')
      .select('id', { count: 'exact', head: true })
      .eq('docente_id', user.id)
      .eq('activo', true),
  ]);

  const rolCfg = parseRolPlantelConfig(docenteRes.data?.configuracion_m4);

  return {
    user,
    cct: docenteRes.data?.cct ?? null,
    docenteId: docenteRes.data?.id ?? null,
    docenteNombre:
      docenteRes.data?.nombre ??
      (user.user_metadata?.nombre as string | undefined) ??
      null,
    nivelDocente: docenteRes.data?.nivel ?? null,
    rolActivo: rolCfg.rolActivo,
    rolesDisponibles: rolCfg.rolesDisponibles,
    directorEstado: rolCfg.directorEstado,
    hasAcceptedAviso: !!avisoRes.data,
    hasGrupoActivo: (gruposRes.count ?? 0) > 0,
  };
}

/**
 * Server-side: requiere sesión válida. Lanza redirect a /login si no hay.
 * Usar en Layouts/Server Components de rutas (app)/*.
 */
export async function requireSession(): Promise<SessionInfo> {
  const session = await getServerSession();
  if (!session) {
    // No podemos usar redirect() desde un helper; el caller debe manejarlo.
    // Lanzamos error estilizado para que el caller lo capture.
    throw new Error('UNAUTHENTICATED');
  }
  return session;
}
