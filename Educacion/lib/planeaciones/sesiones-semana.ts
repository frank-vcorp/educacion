/**
 * Generación de sesiones L–V para planeaciones tipo workbook.
 */
export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

export function tituloSesionDia(dia: string, tituloExtra?: string): string {
  const diaLabel = DIAS_LABEL[dia] ?? dia;
  const extra = tituloExtra?.trim();
  return extra ? `${diaLabel}: ${extra}` : diaLabel;
}

export type FilaSesionInsert = {
  planeacion_id: string;
  docente_id: string;
  cct: string;
  numero: number;
  fase_interna: string;
  ajustes_sesion: string | null;
  estado: string;
};

function faseParaNumero(numero: number): 'inicio' | 'desarrollo' | 'cierre' {
  if (numero <= 1) return 'inicio';
  if (numero >= 5) return 'cierre';
  return 'desarrollo';
}

export function buildSesionesSemanaRows(input: {
  planeacionId: string;
  docenteId: string;
  cct: string;
  titulosPorDia?: Partial<Record<(typeof DIAS_SEMANA)[number], string>>;
}): FilaSesionInsert[] {
  return DIAS_SEMANA.map((dia, idx) => ({
    planeacion_id: input.planeacionId,
    docente_id: input.docenteId,
    cct: input.cct,
    numero: idx + 1,
    fase_interna: faseParaNumero(idx + 1),
    ajustes_sesion: tituloSesionDia(dia, input.titulosPorDia?.[dia]),
    estado: 'pendiente',
  }));
}

export function modalidadUsaCalendarioSemanal(modalidad: string): boolean {
  return (
    modalidad === 'unidad_didactica' ||
    modalidad === 'centros_interes' ||
    modalidad === 'proyecto_comunitario'
  );
}
