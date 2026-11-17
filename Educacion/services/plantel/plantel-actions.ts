'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getServerSession } from '@/lib/auth/session';
import { resolveOrigin } from '@/lib/auth/origin';
import {
  signInvitacionCCT,
  type RolInvitacion,
} from '@/lib/auth/invitacion-cct';
import {
  parseRolPlantelConfig,
  type DirectorEstado,
  type RolPlantel,
} from '@/lib/auth/roles-cct';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SolicitudDirectorPendiente {
  id: string;
  nombre: string;
  email: string;
  directorEstado: DirectorEstado;
  invitadoPorNombre?: string | null;
}

export interface EstadoPlantel {
  cct: string;
  cctNombre: string | null;
  rolActivo: RolPlantel;
  rolesDisponibles: RolPlantel[];
  directorEstado?: DirectorEstado;
  totalDocentes: number;
  directorActivo: { id: string; nombre: string } | null;
  solicitudesPendientes: SolicitudDirectorPendiente[];
}

export async function generarLinkInvitacionPlantel(
  rolObjetivo: RolInvitacion,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) {
    return { ok: false, error: 'Debes completar tu registro y plantel (CCT) primero.' };
  }

  const token = await signInvitacionCCT({
    cct: session.cct,
    rolObjetivo,
    inviterId: session.docenteId,
    inviterNombre: session.docenteNombre ?? 'Colega del plantel',
  });

  const h = headers();
  const origin = resolveOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelProd: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    isProd:
      process.env.VERCEL_ENV === 'production' ||
      process.env.NODE_ENV === 'production',
    forwardedHost: h.get('x-forwarded-host'),
    forwardedProto: h.get('x-forwarded-proto'),
    host: h.get('host'),
  });

  const url = `${origin}/registro?inv=${encodeURIComponent(token)}`;
  return { ok: true, url };
}

export async function getEstadoPlantelParaUsuario(): Promise<EstadoPlantel | null> {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) return null;

  try {
    const admin = createAdminClient();
    const [{ data: cctRow }, { data: docentesCct }] = await Promise.all([
      admin
        .from('cct')
        .select('clave, nombre')
        .eq('clave', session.cct)
        .maybeSingle(),
      admin
        .from('docente')
        .select('id, nombre, email, configuracion_m4, activo')
        .eq('cct', session.cct)
        .eq('activo', true),
    ]);

    const lista = docentesCct ?? [];
    let directorActivo: { id: string; nombre: string } | null = null;
    const solicitudesPendientes: SolicitudDirectorPendiente[] = [];

    for (const d of lista) {
      const cfg = parseRolPlantelConfig(d.configuracion_m4);
      if (cfg.directorEstado === 'activo' && cfg.rolActivo === 'director') {
        directorActivo = { id: d.id, nombre: d.nombre };
      }
      if (
        d.id !== session.docenteId &&
        (cfg.directorEstado === 'pendiente_aprobacion' ||
          cfg.directorEstado === 'pendiente_respaldo')
      ) {
        solicitudesPendientes.push({
          id: d.id,
          nombre: d.nombre,
          email: d.email,
          directorEstado: cfg.directorEstado,
          invitadoPorNombre: cfg.invitadoPor?.nombre ?? null,
        });
      }
    }

    return {
      cct: session.cct,
      cctNombre: cctRow?.nombre ?? null,
      rolActivo: session.rolActivo,
      rolesDisponibles: session.rolesDisponibles,
      directorEstado: session.directorEstado,
      totalDocentes: lista.length,
      directorActivo,
      solicitudesPendientes,
    };
  } catch {
    return {
      cct: session.cct,
      cctNombre: null,
      rolActivo: session.rolActivo,
      rolesDisponibles: session.rolesDisponibles,
      directorEstado: session.directorEstado,
      totalDocentes: 1,
      directorActivo: null,
      solicitudesPendientes: [],
    };
  }
}

export async function aprobarDirectorPlantel(
  candidatoId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) {
    return { ok: false, error: 'No autenticado' };
  }
  if (candidatoId === session.docenteId) {
    return { ok: false, error: 'Otro docente del plantel debe aprobar tu solicitud.' };
  }

  const admin = createAdminClient();
  const { data: candidato, error: errRead } = await admin
    .from('docente')
    .select('id, nombre, cct, configuracion_m4')
    .eq('id', candidatoId)
    .maybeSingle();

  if (errRead || !candidato) {
    return { ok: false, error: 'No se encontró al usuario.' };
  }
  if (candidato.cct !== session.cct) {
    return { ok: false, error: 'El usuario no pertenece a tu mismo CCT.' };
  }

  const rawMeta =
    candidato.configuracion_m4 && typeof candidato.configuracion_m4 === 'object'
      ? (candidato.configuracion_m4 as Record<string, unknown>)
      : {};
  const cfg = parseRolPlantelConfig(rawMeta);
  const aprobadores = Array.from(
    new Set([...(cfg.aprobadoPorDocentes ?? []), session.docenteId]),
  );
  const rolesDisponibles = Array.from(new Set([...cfg.rolesDisponibles, 'director']));
  const historial = [
    ...(cfg.historialRoles ?? []),
    {
      rol: 'director' as const,
      desde: new Date().toISOString(),
      motivo: `Aprobado por docente del plantel (${session.docenteNombre ?? session.docenteId})`,
    },
  ];

  const { error: errUpd } = await admin
    .from('docente')
    .update({
      configuracion_m4: {
        ...rawMeta,
        rolActivo: 'director',
        rolesDisponibles,
        directorEstado: 'activo',
        aprobadoPorDocentes: aprobadores,
        historialRoles: historial,
      },
    })
    .eq('id', candidatoId);

  if (errUpd) return { ok: false, error: errUpd.message };

  await admin.from('director').upsert(
    {
      id: candidato.id,
      nombre: candidato.nombre,
      celular: 'validado_cct',
      cct: candidato.cct,
      otp_verificado: true,
    },
    { onConflict: 'id' },
  );

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function rechazarDirectorPlantel(
  candidatoId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) {
    return { ok: false, error: 'No autenticado' };
  }
  if (candidatoId === session.docenteId) {
    return { ok: false, error: 'Operación inválida.' };
  }

  const admin = createAdminClient();
  const { data: candidato } = await admin
    .from('docente')
    .select('id, cct, configuracion_m4')
    .eq('id', candidatoId)
    .maybeSingle();

  if (!candidato || candidato.cct !== session.cct) {
    return { ok: false, error: 'Usuario no encontrado en tu CCT.' };
  }

  const rawMeta =
    candidato.configuracion_m4 && typeof candidato.configuracion_m4 === 'object'
      ? (candidato.configuracion_m4 as Record<string, unknown>)
      : {};

  const { error: errUpd } = await admin
    .from('docente')
    .update({
      configuracion_m4: {
        ...rawMeta,
        rolActivo: 'docente',
        rolesDisponibles: ['docente'],
        directorEstado: 'rechazado',
      },
    })
    .eq('id', candidatoId);

  if (errUpd) return { ok: false, error: errUpd.message };
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function cambiarRolActivo(
  nuevoRol: RolPlantel,
): Promise<{ ok: boolean; error?: string; mensaje?: string }> {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) {
    return { ok: false, error: 'No autenticado' };
  }

  const admin = createAdminClient();
  const { data: yo } = await admin
    .from('docente')
    .select('id, nombre, cct, configuracion_m4')
    .eq('id', session.docenteId)
    .maybeSingle();

  if (!yo) return { ok: false, error: 'Perfil no encontrado' };

  const rawMeta =
    yo.configuracion_m4 && typeof yo.configuracion_m4 === 'object'
      ? (yo.configuracion_m4 as Record<string, unknown>)
      : {};
  const cfg = parseRolPlantelConfig(rawMeta);
  const ahora = new Date().toISOString();

  if (nuevoRol === 'docente') {
    const rolesDisponibles = Array.from(new Set([...cfg.rolesDisponibles, 'docente']));
    const historial = [
      ...(cfg.historialRoles ?? []),
      { rol: 'docente' as const, desde: ahora, motivo: 'Cambio a rol docente' },
    ];
    const { error } = await admin
      .from('docente')
      .update({
        configuracion_m4: {
          ...rawMeta,
          rolActivo: 'docente',
          rolesDisponibles,
          historialRoles: historial,
        },
      })
      .eq('id', session.docenteId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard');
    revalidatePath('/planeaciones');
    return {
      ok: true,
      mensaje: 'Ahora estás en rol Docente. Tu historial directivo se conserva en solo lectura.',
    };
  }

  // Cambiar a rol 'director'
  if (cfg.rolesDisponibles.includes('director') && cfg.directorEstado === 'activo') {
    const historial = [
      ...(cfg.historialRoles ?? []),
      { rol: 'director' as const, desde: ahora, motivo: 'Regreso a rol director' },
    ];
    const { error } = await admin
      .from('docente')
      .update({
        configuracion_m4: {
          ...rawMeta,
          rolActivo: 'director',
          historialRoles: historial,
        },
      })
      .eq('id', session.docenteId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/dashboard');
    revalidatePath('/planeaciones');
    return {
      ok: true,
      mensaje: 'Ahora estás en rol Director(a). Tus planeaciones como docente se conservan en solo lectura.',
    };
  }

  // Solicitar rol de director por primera vez en el CCT
  const { data: docentesCct } = await admin
    .from('docente')
    .select('id, configuracion_m4')
    .eq('cct', session.cct)
    .eq('activo', true);

  const otroDirectorActivo = (docentesCct ?? []).some((d) => {
    if (d.id === session.docenteId) return false;
    const c = parseRolPlantelConfig(d.configuracion_m4);
    return c.directorEstado === 'activo' && c.rolActivo === 'director';
  });

  if (otroDirectorActivo) {
    return {
      ok: false,
      error:
        'Ya existe un(a) Director(a) activo(a) en este plantel. Debe ceder el cargo primero.',
    };
  }

  const hayOtrosDocentes = (docentesCct ?? []).some((d) => d.id !== session.docenteId);
  const nuevoEstado: DirectorEstado = hayOtrosDocentes
    ? 'pendiente_aprobacion'
    : 'pendiente_respaldo';

  const { error } = await admin
    .from('docente')
    .update({
      configuracion_m4: {
        ...rawMeta,
        rolActivo: 'director',
        directorEstado: nuevoEstado,
      },
    })
    .eq('id', session.docenteId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard');
  return {
    ok: true,
    mensaje: hayOtrosDocentes
      ? 'Solicitud enviada. Un docente de tu plantel debe aprobar tu alta como Director(a).'
      : 'Invita al menos a 1 docente de tu plantel para confirmar tu alta como Director(a).',
  };
}
