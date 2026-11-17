import { getSeccionesGuia, type Modalidad } from '@/lib/planeaciones/modalidad-ui';
import { parseISODate } from '@/lib/planeaciones/calendario-periodo';

export interface EfemerideEscolar {
  nombre: string;
  tipo: 'civica' | 'conmemorativa';
}

export type DiaSemanaHabil = 1 | 2 | 3 | 4 | 5; // 1=Lun .. 5=Vie

export interface RutinaGrupoItem {
  id: string;
  titulo: string;
  categoria: 'rutinaria' | 'recurrente' | 'especial';
  diasSemana: DiaSemanaHabil[];
}

export interface DiaEventoConfig {
  sinClase?: boolean;
  motivoSinClase?: string;
  ocultarHonores?: boolean;
  tareaCasa?: string;
}

const EFEMERIDES_MEXICO: Record<string, EfemerideEscolar> = {
  '01-06': { nombre: 'Día de Reyes / Regreso a clases', tipo: 'conmemorativa' },
  '02-05': { nombre: 'Promulgación de la Constitución Mexicana', tipo: 'civica' },
  '02-14': { nombre: 'Día del Amor y la Amistad', tipo: 'conmemorativa' },
  '02-24': { nombre: 'Día de la Bandera Mexicana', tipo: 'civica' },
  '03-08': { nombre: 'Día Internacional de la Mujer', tipo: 'conmemorativa' },
  '03-21': { nombre: 'Natalicio de Benito Juárez / Primavera', tipo: 'civica' },
  '04-30': { nombre: 'Día de la Niña y el Niño', tipo: 'conmemorativa' },
  '05-01': { nombre: 'Día del Trabajo', tipo: 'civica' },
  '05-05': { nombre: 'Batalla de Puebla', tipo: 'civica' },
  '05-10': { nombre: 'Día de las Madres', tipo: 'conmemorativa' },
  '05-15': { nombre: 'Día de la Maestra y el Maestro', tipo: 'conmemorativa' },
  '09-16': { nombre: 'Independencia de México', tipo: 'civica' },
  '10-12': { nombre: 'Día de la Pluriculturalidad', tipo: 'conmemorativa' },
  '11-02': { nombre: 'Día de Muertos', tipo: 'conmemorativa' },
  '11-20': { nombre: 'Revolución Mexicana', tipo: 'civica' },
};

export function diaSemanaHabil(iso: string): DiaSemanaHabil | null {
  const d = parseISODate(iso);
  const dow = d.getDay();
  if (dow >= 1 && dow <= 5) return dow as DiaSemanaHabil;
  return null;
}

export function esLunes(iso: string): boolean {
  return diaSemanaHabil(iso) === 1;
}

/**
 * En el calendario escolar SEP México, el último viernes de cada mes
 * corresponde a sesión ordinaria de Consejo Técnico Escolar (CTE).
 */
export function esUltimoViernesDelMes(iso: string): boolean {
  const d = parseISODate(iso);
  if (d.getDay() !== 5) return false;
  const siguienteViernes = new Date(d.getTime());
  siguienteViernes.setDate(d.getDate() + 7);
  return siguienteViernes.getMonth() !== d.getMonth();
}

export function obtenerEfemeride(iso: string): EfemerideEscolar | null {
  const mmdd = iso.slice(5, 10);
  return EFEMERIDES_MEXICO[mmdd] ?? null;
}

/**
 * Pre-asigna el `momento` (fase) de un bloque agregado desde el Catálogo NEM
 * según el `tipo` de la plantilla y la `modalidad` de la planeación.
 */
export function inferirMomentoPorTipo(
  tipo: string | null | undefined,
  modalidad: string | null | undefined,
): string | null {
  if (!tipo || !modalidad) return null;
  const secciones = getSeccionesGuia(modalidad as Modalidad);
  if (secciones.length === 0) return null;

  const first = secciones[0]!.key;
  const second = secciones[1]?.key ?? first;
  const middle = secciones[Math.floor(secciones.length / 2)]?.key ?? second;
  const last = secciones[secciones.length - 1]!.key;
  const prevLast = secciones[Math.max(0, secciones.length - 2)]?.key ?? last;

  switch (tipo) {
    case 'apertura':
      return first;
    case 'desarrollo':
      return middle;
    case 'practica':
      return second;
    case 'cierre':
      return prevLast;
    case 'evaluacion':
    case 'evaluacion_semanal':
      return last;
    default:
      return null;
  }
}

export const RUTINAS_PRESETS_PREESCOLAR: Array<Omit<RutinaGrupoItem, 'id'>> = [
  { titulo: 'Clase de música', categoria: 'especial', diasSemana: [1, 3] },
  { titulo: 'Clase de educación física', categoria: 'especial', diasSemana: [2, 4] },
  { titulo: 'Aseo del área de trabajo', categoria: 'rutinaria', diasSemana: [1, 2, 3, 4, 5] },
  { titulo: 'Conteo y fecha diaria', categoria: 'recurrente', diasSemana: [1, 2, 3, 4, 5] },
  { titulo: 'Reconocimiento de vocales / nombre', categoria: 'recurrente', diasSemana: [2, 4] },
];
