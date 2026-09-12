import { createAdminClient } from '@/lib/supabase/admin';

export interface PlaneacionResumen {
  id: string;
  nombre: string;
  estado: string;
  createdAt: string;
  bloquesCount: number;
  sesionesCount: number;
  tieneProposito: boolean;
  tieneProducto: boolean;
}

export interface DocenteResumen {
  id: string;
  nombre: string;
  email: string;
  cct: string;
  nivel: string;
  createdAt: string;
  ultimoAcceso: string | null;
  lastSignIn: string | null;
  gruposCount: number;
  alumnosCount: number;
  avisoAceptado: boolean;
  planeaciones: PlaneacionResumen[];
  entrevistasInicialesCompletas: number;
  entrevistasFamiliaresCompletas: number;
}

function countByKey<T extends string>(
  rows: Array<Record<string, unknown>>,
  key: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = String(row[key] ?? '');
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function getDocentesOverview(): Promise<DocenteResumen[]> {
  const admin = createAdminClient();

  const [
    docentesRes,
    gruposRes,
    alumnosRes,
    avisosRes,
    planeacionesRes,
    bloquesRes,
    sesionesRes,
    entIniRes,
    entFamRes,
    authUsersRes,
  ] = await Promise.all([
    admin.from('docente').select('id, nombre, email, cct, nivel, created_at, ultimo_acceso').order('created_at', { ascending: false }),
    admin.from('grupo').select('docente_id'),
    admin.from('alumno').select('docente_id'),
    admin.from('aceptacion_aviso_privacidad').select('docente_id'),
    admin.from('planeacion').select('id, docente_id, nombre, estado, created_at, proposito, producto_integrador'),
    admin.from('bloque').select('planeacion_id'),
    admin.from('sesion').select('planeacion_id'),
    admin.from('entrevista_inicial_alumno').select('docente_id, estado'),
    admin.from('entrevista_familiar_alumno').select('docente_id, estado'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (docentesRes.error) throw docentesRes.error;

  const gruposByDocente = countByKey(gruposRes.data ?? [], 'docente_id');
  const alumnosByDocente = countByKey(alumnosRes.data ?? [], 'docente_id');
  const avisoSet = new Set((avisosRes.data ?? []).map((r) => String(r.docente_id)));
  const bloquesByPlaneacion = countByKey(bloquesRes.data ?? [], 'planeacion_id');
  const sesionesByPlaneacion = countByKey(sesionesRes.data ?? [], 'planeacion_id');

  const entIniCompletas = new Map<string, number>();
  for (const row of entIniRes.data ?? []) {
    if (row.estado !== 'completa') continue;
    const id = String(row.docente_id);
    entIniCompletas.set(id, (entIniCompletas.get(id) ?? 0) + 1);
  }

  const entFamCompletas = new Map<string, number>();
  for (const row of entFamRes.data ?? []) {
    if (row.estado !== 'completa') continue;
    const id = String(row.docente_id);
    entFamCompletas.set(id, (entFamCompletas.get(id) ?? 0) + 1);
  }

  const lastSignInById = new Map<string, string>();
  for (const user of authUsersRes.data.users) {
    if (user.last_sign_in_at) lastSignInById.set(user.id, user.last_sign_in_at);
  }

  const planeacionesByDocente = new Map<string, PlaneacionResumen[]>();
  for (const p of planeacionesRes.data ?? []) {
    const docenteId = String(p.docente_id);
    const item: PlaneacionResumen = {
      id: String(p.id),
      nombre: String(p.nombre),
      estado: String(p.estado),
      createdAt: String(p.created_at),
      bloquesCount: bloquesByPlaneacion.get(String(p.id)) ?? 0,
      sesionesCount: sesionesByPlaneacion.get(String(p.id)) ?? 0,
      tieneProposito: Boolean(p.proposito?.toString().trim()),
      tieneProducto: Boolean(p.producto_integrador?.toString().trim()),
    };
    const list = planeacionesByDocente.get(docenteId) ?? [];
    list.push(item);
    planeacionesByDocente.set(docenteId, list);
  }

  return (docentesRes.data ?? []).map((d) => ({
    id: String(d.id),
    nombre: String(d.nombre),
    email: String(d.email),
    cct: String(d.cct),
    nivel: String(d.nivel),
    createdAt: String(d.created_at),
    ultimoAcceso: d.ultimo_acceso ? String(d.ultimo_acceso) : null,
    lastSignIn: lastSignInById.get(String(d.id)) ?? null,
    gruposCount: gruposByDocente.get(String(d.id)) ?? 0,
    alumnosCount: alumnosByDocente.get(String(d.id)) ?? 0,
    avisoAceptado: avisoSet.has(String(d.id)),
    planeaciones: planeacionesByDocente.get(String(d.id)) ?? [],
    entrevistasInicialesCompletas: entIniCompletas.get(String(d.id)) ?? 0,
    entrevistasFamiliaresCompletas: entFamCompletas.get(String(d.id)) ?? 0,
  }));
}
