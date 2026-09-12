import type { Modalidad } from '@/lib/planeaciones/modalidad-ui';
import {
  plantillaDesdeModalidad,
  type WorkbookMetadata,
} from '@/lib/planeaciones/tipo-workbook';

/** Layout 3 columnas + footer (centro de interés y proyecto comunitario). */
export function usaWorkbookLayout(modalidad: Modalidad): boolean {
  const p = plantillaDesdeModalidad(modalidad);
  return p === 'centro_interes' || p === 'proyecto_comunitario';
}

export type { WorkbookMetadata };

export interface WorkbookContexto {
  nombre: string;
  periodoInicio: string;
  periodoFin: string;
  problemaContexto: string;
  proposito: string | null;
  campos: Array<{ codigo: string; nombre: string }>;
  pdas: Array<{ codigo: string; texto: string }>;
  ejes: Array<{ codigo: string; nombre: string }>;
  ajustesRazonables: string | null;
  temaCentro?: string | null;
  preguntasDet?: string[];
  etiquetaGrupo?: string | null;
  cct?: string | null;
  clasificacionPeriodo?: string | null;
  totalDiasHabiles?: number;
  workbook?: WorkbookMetadata | null;
  /** PDA codigo → campo formativo codigo */
  pdaCampoCodigo?: Record<string, string>;
  productoIntegrador?: string | null;
}
