/**
 * Calendario dinámico del workbook según periodo_inicio → periodo_fin.
 * Genera un día hábil (L–V) por sesión, como el Word de Lolita (ej. 10–28 feb).
 */
import type { FilaSesionInsert } from '@/lib/planeaciones/sesiones-semana';

const MESES_CORTO = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

export type ClasificacionPeriodo = 'semanal' | 'quincenal' | 'mensual' | 'extendido';

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function esDiaHabil(d: Date): boolean {
  const dow = d.getDay();
  return dow >= 1 && dow <= 5;
}

/** Días L–V entre inicio y fin (inclusive). */
export function diasHabilesEnRango(inicioISO: string, finISO: string): Date[] {
  const inicio = parseISODate(inicioISO);
  const fin = parseISODate(finISO);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
    return [];
  }
  const dias: Date[] = [];
  const cur = new Date(inicio);
  while (cur <= fin) {
    if (esDiaHabil(cur)) dias.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dias;
}

export function clasificarPeriodo(inicioISO: string, finISO: string): ClasificacionPeriodo {
  const n = diasHabilesEnRango(inicioISO, finISO).length;
  if (n <= 5) return 'semanal';
  if (n <= 10) return 'quincenal';
  if (n <= 22) return 'mensual';
  return 'extendido';
}

export function etiquetaClasificacionPeriodo(c: ClasificacionPeriodo): string {
  switch (c) {
    case 'semanal':
      return 'Proyecto semanal';
    case 'quincenal':
      return 'Proyecto quincenal';
    case 'mensual':
      return 'Proyecto mensual';
    case 'extendido':
      return 'Proyecto extendido';
  }
}

export function formatDiaSesion(d: Date): string {
  const dow = DIAS_NOMBRE[d.getDay()] ?? 'Día';
  const dia = d.getDate();
  const mes = MESES_CORTO[d.getMonth()] ?? '';
  return `${dow} ${dia} ${mes}`;
}

/** Prefijo ISO parseable + etiqueta legible (ej. "2025-02-10 — Lunes 10 feb"). */
export function etiquetaSesionConFecha(iso: string): string {
  return `${iso} — ${formatDiaSesion(parseISODate(iso))}`;
}

export function fechaDesdeEtiquetaSesion(ajustes: string | null | undefined): string | null {
  if (!ajustes) return null;
  const m = ajustes.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

function faseParaIndice(indice: number, total: number): 'inicio' | 'desarrollo' | 'cierre' {
  if (total <= 1) return 'desarrollo';
  if (indice === 0) return 'inicio';
  if (indice >= total - 1) return 'cierre';
  return 'desarrollo';
}

/** Una sesión por día hábil del periodo. */
export function buildSesionesDesdePeriodo(input: {
  planeacionId: string;
  docenteId: string;
  cct: string;
  periodoInicio: string;
  periodoFin: string;
}): FilaSesionInsert[] {
  const dias = diasHabilesEnRango(input.periodoInicio, input.periodoFin);
  if (dias.length === 0) return [];

  return dias.map((d, idx) => {
    const iso = toISODateLocal(d);
    return {
      planeacion_id: input.planeacionId,
      docente_id: input.docenteId,
      cct: input.cct,
      numero: idx + 1,
      fase_interna: faseParaIndice(idx, dias.length),
      ajustes_sesion: etiquetaSesionConFecha(iso),
      estado: 'pendiente',
    };
  });
}

export interface SemanaCalendario {
  clave: string;
  etiqueta: string;
  fechasISO: string[];
}

/** Agrupa fechas ISO por semana calendaria (lunes–domingo) para UI del workbook. */
export function agruparFechasPorSemana(fechasISO: string[]): SemanaCalendario[] {
  const map = new Map<string, string[]>();
  for (const iso of fechasISO.sort()) {
    const d = parseISODate(iso);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const lunes = new Date(d);
    lunes.setDate(d.getDate() + diff);
    const clave = toISODateLocal(lunes);
    const list = map.get(clave) ?? [];
    list.push(iso);
    map.set(clave, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, fechas], i) => ({
      clave,
      etiqueta: `Semana ${i + 1} (${formatDiaSesion(parseISODate(fechas[0]!))} – ${formatDiaSesion(parseISODate(fechas[fechas.length - 1]!))})`,
      fechasISO: fechas,
    }));
}
