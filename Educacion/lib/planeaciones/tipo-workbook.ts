/**
 * Contrato explícito del workbook — se define al crear la planeación (wizard).
 *
 * Dos ejes:
 *  1. plantilla → estructura pedagógica (viene de la modalidad NEM)
 *  2. alcance_temporal → forma del calendario (semanal, quincenal, rango, mensual)
 */
import type { Modalidad } from '@/components/planeaciones/wizard-modalidad-data';
import {
  buildSesionesDesdePeriodo,
  diasHabilesEnRango,
  type ClasificacionPeriodo,
  clasificarPeriodo,
  etiquetaClasificacionPeriodo,
} from '@/lib/planeaciones/calendario-periodo';
import { buildSesionesSemanaRows, type FilaSesionInsert } from '@/lib/planeaciones/sesiones-semana';

export type AlcanceTemporal = 'semanal' | 'quincenal' | 'rango_fechas' | 'mensual';

export type PeriodoTipoDB = 'rango_fechas' | 'mensual' | 'trimestral' | 'semestral';

export type PlantillaWorkbook =
  | 'centro_interes'
  | 'proyecto_comunitario'
  | 'unidad_semanal'
  | 'sin_workbook';

export type EstrategiaSesiones = 'semana_lv' | 'dias_habiles_rango' | 'calendario_wizard';

export interface WorkbookMetadata {
  plantilla: PlantillaWorkbook;
  alcance_temporal: AlcanceTemporal;
  periodo_tipo: PeriodoTipoDB;
  estrategia_sesiones: EstrategiaSesiones;
}

export interface WorkbookConfig extends WorkbookMetadata {
  usaWorkbook: boolean;
  etiquetaAlcance: string;
}

export const ALCANCES_TEMPORALES: Array<{
  value: AlcanceTemporal;
  label: string;
  descripcion: string;
}> = [
  {
    value: 'semanal',
    label: 'Una semana',
    descripcion: 'Planeación L–V de una semana (como unidad corta).',
  },
  {
    value: 'quincenal',
    label: 'Quincenal',
    descripcion: 'Proyecto de unas 2 semanas escolares (~10 días hábiles).',
  },
  {
    value: 'rango_fechas',
    label: 'Por fechas (proyecto)',
    descripcion: 'Del día X al día Y — como tu Word (ej. 10 al 28 de febrero).',
  },
  {
    value: 'mensual',
    label: 'Mensual',
    descripcion: 'Proyecto o centro que abarca casi todo el mes.',
  },
];

export function plantillaDesdeModalidad(modalidad: Modalidad): PlantillaWorkbook {
  switch (modalidad) {
    case 'centros_interes':
      return 'centro_interes';
    case 'proyecto_comunitario':
      return 'proyecto_comunitario';
    case 'unidad_didactica':
      return 'unidad_semanal';
    default:
      return 'sin_workbook';
  }
}

export function modalidadRequiereAlcanceTemporal(modalidad: Modalidad): boolean {
  return (
    modalidad === 'centros_interes' ||
    modalidad === 'proyecto_comunitario' ||
    modalidad === 'unidad_didactica'
  );
}

export function alcancePorDefecto(modalidad: Modalidad): AlcanceTemporal {
  if (modalidad === 'unidad_didactica') return 'semanal';
  return 'rango_fechas';
}

export function periodoTipoDesdeAlcance(alcance: AlcanceTemporal): PeriodoTipoDB {
  switch (alcance) {
    case 'mensual':
      return 'mensual';
    case 'semanal':
    case 'quincenal':
    case 'rango_fechas':
    default:
      return 'rango_fechas';
  }
}

export function estrategiaSesionesDesde(
  plantilla: PlantillaWorkbook,
  alcance: AlcanceTemporal,
): EstrategiaSesiones {
  if (plantilla === 'unidad_semanal') return 'calendario_wizard';
  if (alcance === 'semanal') return 'semana_lv';
  return 'dias_habiles_rango';
}

export function buildWorkbookMetadata(
  modalidad: Modalidad,
  alcanceTemporal: AlcanceTemporal,
): WorkbookMetadata {
  const plantilla = plantillaDesdeModalidad(modalidad);
  return {
    plantilla,
    alcance_temporal: alcanceTemporal,
    periodo_tipo: periodoTipoDesdeAlcance(alcanceTemporal),
    estrategia_sesiones: estrategiaSesionesDesde(plantilla, alcanceTemporal),
  };
}

export function resolverWorkbookConfig(input: {
  modalidad: Modalidad | string;
  alcanceTemporal?: AlcanceTemporal | string | null;
  workbookMetadata?: Partial<WorkbookMetadata> | null;
}): WorkbookConfig {
  const modalidad = input.modalidad as Modalidad;
  const plantilla =
    input.workbookMetadata?.plantilla ?? plantillaDesdeModalidad(modalidad);
  const alcance =
    (input.workbookMetadata?.alcance_temporal as AlcanceTemporal | undefined) ??
    (input.alcanceTemporal as AlcanceTemporal | undefined) ??
    alcancePorDefecto(modalidad);

  const usaWorkbook = plantilla !== 'sin_workbook';
  const clasificacion: ClasificacionPeriodo = alcance === 'semanal'
    ? 'semanal'
    : alcance === 'quincenal'
      ? 'quincenal'
      : alcance === 'mensual'
        ? 'mensual'
        : 'extendido';

  return {
    plantilla,
    alcance_temporal: alcance,
    periodo_tipo:
      input.workbookMetadata?.periodo_tipo ?? periodoTipoDesdeAlcance(alcance),
    estrategia_sesiones:
      input.workbookMetadata?.estrategia_sesiones ??
      estrategiaSesionesDesde(plantilla, alcance),
    usaWorkbook,
    etiquetaAlcance: etiquetaClasificacionPeriodo(clasificacion),
  };
}

export function validarFechasContraAlcance(
  alcance: AlcanceTemporal,
  periodoInicio: string,
  periodoFin: string,
): string | null {
  const n = diasHabilesEnRango(periodoInicio, periodoFin).length;
  if (n === 0) return 'El periodo no tiene días hábiles (L–V). Revisa las fechas.';
  const clasif = clasificarPeriodo(periodoInicio, periodoFin);
  switch (alcance) {
    case 'semanal':
      if (n > 5) return 'Para alcance semanal usa máximo 5 días hábiles (una semana L–V).';
      break;
    case 'quincenal':
      if (n > 10) return 'Para alcance quincenal usa hasta ~10 días hábiles.';
      if (n < 3) return 'Para alcance quincenal indica al menos 3 días hábiles.';
      break;
    case 'mensual':
      if (n > 22) return 'Para alcance mensual usa hasta ~22 días hábiles.';
      break;
    case 'rango_fechas':
      if (clasif === 'extendido' && n > 40) {
        return 'El rango es muy largo. Considera dividir en dos planeaciones.';
      }
      break;
  }
  return null;
}

export function generarSesionesWorkbook(input: {
  config: WorkbookConfig;
  planeacionId: string;
  docenteId: string;
  cct: string;
  periodoInicio: string;
  periodoFin: string;
  sesionesSemanaWizard?: Record<string, string>;
}): FilaSesionInsert[] {
  const base = {
    planeacionId: input.planeacionId,
    docenteId: input.docenteId,
    cct: input.cct,
  };

  switch (input.config.estrategia_sesiones) {
    case 'calendario_wizard': {
      const titulos: Partial<Record<'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes', string>> =
        {};
      const raw = input.sesionesSemanaWizard ?? {};
      for (const dia of ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const) {
        const t = raw[dia];
        if (typeof t === 'string' && t.trim()) titulos[dia] = t;
      }
      return buildSesionesSemanaRows({ ...base, titulosPorDia: titulos });
    }
    case 'semana_lv':
      return buildSesionesSemanaRows(base);
    case 'dias_habiles_rango': {
      const desdePeriodo = buildSesionesDesdePeriodo({
        ...base,
        periodoInicio: input.periodoInicio,
        periodoFin: input.periodoFin,
      });
      return desdePeriodo.length > 0 ? desdePeriodo : buildSesionesSemanaRows(base);
    }
    default:
      return [];
  }
}
