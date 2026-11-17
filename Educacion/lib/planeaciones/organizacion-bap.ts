import type {
  DiaEventoConfig,
  RutinaGrupoItem,
} from '@/lib/planeaciones/calendario-escolar';

export const FORMAS_TRABAJO_PRESETS = [
  'En grupo',
  'En equipos',
  'Individual',
  'En parejas',
  'Asamblea / plenaria',
] as const;

export const ESPACIOS_PRESETS = [
  'Salón de clases',
  'Patio cívico / escolar',
  'Biblioteca',
  'Áreas verdes',
  'Casa / familia',
] as const;

export interface BapAlumnoItem {
  alumnoId?: string;
  alumnoNombre: string;
  barrera?: string;
  estrategia: string;
}

export interface PlaneacionOrganizacionMetadata {
  formas_trabajo?: string[];
  espacios?: string[];
  bap_por_alumno?: BapAlumnoItem[];
  rutinas_grupo?: RutinaGrupoItem[];
  eventos_por_fecha?: Record<string, DiaEventoConfig>;
}

export function formatearRutinaConDias(rutina: RutinaGrupoItem): string {
  const DIAS: Record<number, string> = {
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
  };
  const dias = (rutina.diasSemana ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DIAS[d] ?? '')
    .filter(Boolean);
  if (dias.length === 0 || dias.length === 5) {
    return rutina.titulo;
  }
  return `${rutina.titulo} (${dias.join(', ')})`;
}
