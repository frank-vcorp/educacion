export type RolPlantel = 'docente' | 'director';

export type DirectorEstado =
  | 'pendiente_aprobacion'
  | 'pendiente_respaldo'
  | 'activo'
  | 'rechazado';

export interface HistorialRolItem {
  rol: RolPlantel;
  desde: string;
  hasta?: string | null;
  motivo?: string;
}

export interface RolPlantelConfig {
  rolActivo: RolPlantel;
  rolesDisponibles: RolPlantel[];
  directorEstado?: DirectorEstado;
  aprobadoPorDocentes?: string[];
  invitadoPor?: {
    id: string;
    nombre: string;
    rolObjetivo: RolPlantel;
  } | null;
  historialRoles?: HistorialRolItem[];
}

export function parseRolPlantelConfig(raw: unknown): RolPlantelConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rolActivo: RolPlantel = obj.rolActivo === 'director' ? 'director' : 'docente';
  const rolesRaw = Array.isArray(obj.rolesDisponibles) ? obj.rolesDisponibles : [rolActivo];
  const rolesDisponibles = Array.from(
    new Set(
      rolesRaw.filter((r): r is RolPlantel => r === 'docente' || r === 'director'),
    ),
  );
  if (rolesDisponibles.length === 0) rolesDisponibles.push(rolActivo);

  const directorEstado =
    obj.directorEstado === 'pendiente_aprobacion' ||
    obj.directorEstado === 'pendiente_respaldo' ||
    obj.directorEstado === 'activo' ||
    obj.directorEstado === 'rechazado'
      ? obj.directorEstado
      : undefined;

  const aprobadoPorDocentes = Array.isArray(obj.aprobadoPorDocentes)
    ? obj.aprobadoPorDocentes.filter((x): x is string => typeof x === 'string')
    : [];

  const historialRoles = Array.isArray(obj.historialRoles)
    ? (obj.historialRoles as HistorialRolItem[])
    : [];

  const invitadoPor =
    obj.invitadoPor && typeof obj.invitadoPor === 'object'
      ? (obj.invitadoPor as RolPlantelConfig['invitadoPor'])
      : null;

  return {
    rolActivo,
    rolesDisponibles,
    directorEstado,
    aprobadoPorDocentes,
    invitadoPor,
    historialRoles,
  };
}
