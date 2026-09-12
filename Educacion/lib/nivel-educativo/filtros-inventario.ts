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

/** Modalidades con estructura diaria similar comparten catálogo. */
const MODALIDAD_ALIASES: Record<string, string[]> = {
  centros_interes: ['unidad_didactica', 'proyecto_comunitario'],
  abj: ['unidad_didactica'],
  rincones: ['unidad_didactica'],
  taller_critico: ['proyecto_comunitario'],
};

export function bloqueModalidadCompatible(
  modalidadesBloque: string[],
  modalidadPlaneacion: string,
): boolean {
  if (modalidadesBloque.length === 0) return true;
  if (modalidadesBloque.includes(modalidadPlaneacion)) return true;
  const aliases = MODALIDAD_ALIASES[modalidadPlaneacion] ?? [];
  return aliases.some((m) => modalidadesBloque.includes(m));
}

export interface ContextoSugerenciasCatalogo {
  pdas?: string[];
  temaCentro?: string | null;
  preguntasDet?: string[];
  problemaContexto?: string;
}

const STOPWORDS = new Set([
  'para',
  'como',
  'esta',
  'este',
  'qué',
  'que',
  'con',
  'los',
  'las',
  'del',
  'una',
  'uno',
  'por',
]);

function palabrasClaveContexto(ctx: ContextoSugerenciasCatalogo): string[] {
  const texto = [ctx.temaCentro, ctx.problemaContexto, ...(ctx.preguntasDet ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const tokens = texto.match(/[a-záéíóúñ]{4,}/gi) ?? [];
  return [...new Set(tokens.map((t) => t.toLowerCase()).filter((t) => !STOPWORDS.has(t)))];
}

/** Mayor puntaje = más relevante al contexto de la planeación. */
export function puntuarBloqueCatalogo(
  bloque: BloqueCatalogo,
  ctx: ContextoSugerenciasCatalogo,
): number {
  let score = 0;
  const pdas = ctx.pdas ?? [];
  if (pdas.length > 0) {
    score += bloque.pda_ids.filter((p) => pdas.includes(p)).length * 10;
  }
  const keywords = palabrasClaveContexto(ctx);
  const haystack = `${bloque.nombre} ${bloque.descripcion ?? ''}`.toLowerCase();
  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 3;
  }
  return score;
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
    if (!bloqueModalidadCompatible(b.modalidades_compatibles, opts.modalidad)) {
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

export function ordenarBloquesPorContexto(
  bloques: BloqueCatalogo[],
  ctx: ContextoSugerenciasCatalogo,
): BloqueCatalogo[] {
  return [...bloques].sort((a, b) => {
    const diff = puntuarBloqueCatalogo(b, ctx) - puntuarBloqueCatalogo(a, ctx);
    if (diff !== 0) return diff;
    return a.nombre.localeCompare(b.nombre, 'es');
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
