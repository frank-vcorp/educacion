/**
 * Servicios de catálogo NEM (lectura pública, sin RLS).
 * SPEC_TEC_02 §5.1 + §7.3: tablas sin RLS, lectura para todos.
 */
import { createClient } from '@/lib/supabase/server';

export interface CampoFormativo {
  codigo: string;
  nombre: string;
  orden: number;
  descripcion: string;
}

export interface EjeArticulador {
  codigo: string;
  nombre: string;
  orden: number;
  descripcion: string;
}

export interface PDA {
  codigo: string;
  texto: string;
  grado: string;
  contenido_codigo: string;
  activo: boolean;
}

export interface Contenido {
  codigo: string;
  texto: string;
  campo_codigo: string;
  fase_codigo: string;
}

export interface ReferenciaConaliteg {
  id: number;
  grado: string;
  campo: string;
  titulo_libro: string;
  url_publica: string;
  isbn: string | null;
  edicion: string;
  tipo: 'alumnos' | 'transversal';
  formato: string;
  notas: string | null;
}

export interface BloqueCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'apertura' | 'desarrollo' | 'practica' | 'cierre' | 'evaluacion' | 'evaluacion_semanal' | 'banco_palabras';
  nivel_flexibilidad: 'cerrado' | 'abierto' | 'en_blanco';
  contenido_textual: string | null;
  pda_ids: string[];
  campos_formativos: string[];
  ejes_articuladores: string[];
  recursos_requeridos: Array<{ categoria: string; clave_busqueda: string; cantidad: number }>;
  modalidades_compatibles: string[];
  duracion_min: number | null;
}

export interface CCTBasico {
  clave: string;
  nombre: string;
  nivel: string;
  turno: string | null;
  municipio_nombre: string | null;
  entidad_nombre: string | null;
}

/**
 * Obtiene los 4 campos formativos NEM ordenados.
 */
export async function getCamposFormativos(): Promise<CampoFormativo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campo_formativo')
    .select('codigo, nombre, orden, descripcion')
    .order('orden', { ascending: true });
  if (error) {
    console.error('getCamposFormativos:', error.message);
    return [];
  }
  return (data ?? []) as CampoFormativo[];
}

/**
 * Obtiene los 7 ejes articuladores.
 */
export async function getEjesArticuladores(): Promise<EjeArticulador[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('eje_articulador')
    .select('codigo, nombre, orden, descripcion')
    .order('orden', { ascending: true });
  if (error) {
    console.error('getEjesArticuladores:', error.message);
    return [];
  }
  return (data ?? []) as EjeArticulador[];
}

/**
 * PDA filtrables por campo y/o grado.
 */
export async function getPDAs(opts: {
  campoCodigo?: string;
  grado?: string;
} = {}): Promise<PDA[]> {
  const supabase = await createClient();
  let query = supabase
    .from('pda')
    .select('codigo, texto, grado, contenido_codigo, activo')
    .eq('activo', true);
  if (opts.grado) query = query.eq('grado', opts.grado);
  if (opts.campoCodigo) {
    const { data: rels } = await supabase
      .from('pda_por_campo_fase')
      .select('pda_codigo')
      .eq('campo_codigo', opts.campoCodigo);
    const codigos = (rels ?? []).map((r) => r.pda_codigo);
    if (codigos.length === 0) return [];
    query = query.in('codigo', codigos);
  }
  const { data, error } = await query.order('codigo', { ascending: true });
  if (error) {
    console.error('getPDAs:', error.message);
    return [];
  }
  return (data ?? []) as PDA[];
}

/**
 * Obtener los 4 contenidos oficiales.
 */
export async function getContenidos(): Promise<Contenido[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contenido')
    .select('codigo, texto, campo_codigo, fase_codigo')
    .order('codigo', { ascending: true });
  if (error) {
    console.error('getContenidos:', error.message);
    return [];
  }
  return (data ?? []) as Contenido[];
}

/**
 * Obtener las 19 referencias a libros CONALITEG.
 */
export async function getReferenciasConaliteg(): Promise<ReferenciaConaliteg[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('referencia_libro_conaliteg')
    .select(
      'id, grado, campo, titulo_libro, url_publica, isbn, edicion, tipo, formato, notas',
    )
    .order('id', { ascending: true });
  if (error) {
    console.error('getReferenciasConaliteg:', error.message);
    return [];
  }
  return (data ?? []) as ReferenciaConaliteg[];
}

/**
 * Catálogo M1 de bloques arrastrables (D-FIN-1).
 * Filtros opcionales: campo_formativo, tipo, nivel_flexibilidad, modalidad.
 */
export async function getBloquesCatalogo(opts: {
  campoCodigo?: string;
  tipo?: BloqueCatalogo['tipo'];
  nivelFlexibilidad?: BloqueCatalogo['nivel_flexibilidad'];
} = {}): Promise<BloqueCatalogo[]> {
  const supabase = await createClient();
  let query = supabase
    .from('bloque_catalogo')
    .select(
      'id, codigo, nombre, descripcion, tipo, nivel_flexibilidad, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, recursos_requeridos, modalidades_compatibles, duracion_min',
    );
  if (opts.campoCodigo) query = query.contains('campos_formativos', [opts.campoCodigo]);
  if (opts.tipo) query = query.eq('tipo', opts.tipo);
  if (opts.nivelFlexibilidad)
    query = query.eq('nivel_flexibilidad', opts.nivelFlexibilidad);
  const { data, error } = await query.order('codigo', { ascending: true });
  if (error) {
    console.error('getBloquesCatalogo:', error.message);
    return [];
  }
  return (data ?? []) as BloqueCatalogo[];
}

/**
 * Búsqueda de CCTs por nombre (autocomplete de onboarding).
 * Usa índice trigram (idx_cct_nombre_trgm).
 */
export async function buscarCCTs(query: string, limit = 10): Promise<CCTBasico[]> {
  if (query.trim().length < 3) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cct')
    .select('clave, nombre, nivel, turno, municipio_nombre, entidad_nombre')
    .ilike('nombre', `%${query.trim()}%`)
    .limit(limit);
  if (error) {
    console.error('buscarCCTs:', error.message);
    return [];
  }
  return (data ?? []) as CCTBasico[];
}

/**
 * Obtener CCT por clave exacta.
 */
export async function getCCTByClave(clave: string): Promise<CCTBasico | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cct')
    .select('clave, nombre, nivel, turno, municipio_nombre, entidad_nombre')
    .eq('clave', clave)
    .maybeSingle();
  if (error) {
    console.error('getCCTByClave:', error.message);
    return null;
  }
  return (data ?? null) as CCTBasico | null;
}
