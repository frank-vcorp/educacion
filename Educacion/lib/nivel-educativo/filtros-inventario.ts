/**
 * Filtrado de inventarios (catálogo M1, PDA) por grado preescolar.
 */
import type { BloqueCatalogo, PDA } from '@/services/catalogo/catalogo';
import type { GradoPreescolar } from '@/lib/nivel-educativo/scope';
import { GRADOS_PREESCOLAR } from '@/lib/nivel-educativo/scope';

export type PdaGradoMap = Record<string, string>;

export function buildPdaGradoMap(pdas: Pick<PDA, 'codigo' | 'grado'>[]): PdaGradoMap {
  return Object.fromEntries(pdas.map((p) => [p.codigo, p.grado]));
}

export function esGradoPreescolarValido(grado: string): grado is GradoPreescolar {
  return (GRADOS_PREESCOLAR as readonly string[]).includes(grado);
}

/** Bloque visible si algún PDA vinculado es del grado (o no tiene PDAs). */
export function bloqueCatalogoCoincideGrado(
  bloque: Pick<BloqueCatalogo, 'pda_ids'>,
  grado: string,
  pdaGradoPorCodigo: PdaGradoMap,
): boolean {
  if (!bloque.pda_ids?.length) return true;
  return bloque.pda_ids.some((codigo) => pdaGradoPorCodigo[codigo] === grado);
}

export interface FiltroCatalogoOpts {
  modalidad: string;
  camposFormativos: string[];
  gradoPreescolar: string;
  pdaGradoPorCodigo: PdaGradoMap;
  busqueda?: string;
}

export function filtrarBloquesCatalogo(
  bloques: BloqueCatalogo[],
  opts: FiltroCatalogoOpts,
): BloqueCatalogo[] {
  const q = (opts.busqueda ?? '').trim().toLowerCase();

  return bloques.filter((b) => {
    if (opts.camposFormativos.length > 0) {
      const matchCampo = b.campos_formativos.some((c) => opts.camposFormativos.includes(c));
      if (!matchCampo) return false;
    }
    if (
      b.modalidades_compatibles.length > 0 &&
      !b.modalidades_compatibles.includes(opts.modalidad)
    ) {
      return false;
    }
    if (!bloqueCatalogoCoincideGrado(b, opts.gradoPreescolar, opts.pdaGradoPorCodigo)) {
      return false;
    }
    if (!q) return true;
    return (
      b.nombre.toLowerCase().includes(q) ||
      (b.descripcion ?? '').toLowerCase().includes(q) ||
      b.codigo.toLowerCase().includes(q)
    );
  });
}

export function filtrarPDAsPorGrado<T extends Pick<PDA, 'grado'>>(pdas: T[], grado: string): T[] {
  return pdas.filter((p) => p.grado === grado);
}

export function etiquetaContextoInventario(parts: {
  grado: string;
  modalidadLabel?: string;
  camposCount?: number;
}): string {
  const segmentos = [`${parts.grado} preescolar`];
  if (parts.modalidadLabel) segmentos.push(parts.modalidadLabel);
  if (parts.camposCount != null && parts.camposCount > 0) {
    segmentos.push(`${parts.camposCount} campo${parts.camposCount === 1 ? '' : 's'}`);
  }
  return segmentos.join(' · ');
}
