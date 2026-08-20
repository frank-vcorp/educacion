/**
 * Mini-NLP on-write: sugerir campos formativos a partir del campo "uso" del recurso.
 * F-IA1 — SPEC_TEC_03 §6.23.
 * Algoritmo: keyword matching determinista (sin llamada externa en MVP).
 * Si en el futuro se conecta MiniMax, este módulo se reemplaza por un wrapper que
 * aplica ia_anonymizer (P-PD8) y rate-limiter (P-PD9).
 */

const KEYWORDS: Record<string, string[]> = {
  LENGUAJES: [
    'leer', 'lectura', 'cuento', 'cuentos', 'escribir', 'escritura', 'palabra', 'palabras',
    'narrar', 'narración', 'libro', 'libros', 'poema', 'rimas', 'canción', 'cuentacuentos',
    'letra', 'letras', 'vocabulario', 'oral', 'conversación', 'diálogo',
  ],
  SABERES_PENSAMIENTO_CIENTIFICO: [
    'contar', 'número', 'números', 'medir', 'tamaño', 'forma', 'figura', 'figuras',
    'suma', 'resta', 'clasificar', 'patrón', 'patrones', 'experimento', 'observar',
    'semilla', 'agua', 'planta', 'plantas', 'animal', 'animales', 'científico', 'científica',
  ],
  ETICA_NATURALEZA_SOCIEDADES: [
    'compartir', 'cuidar', 'cuidado', 'emociones', 'sentir', 'sentimientos', 'norma',
    'normas', 'regla', 'reglas', 'convivencia', 'respeto', 'medio ambiente', 'entorno',
    'comunidad', 'familia', 'tierra', 'naturaleza',
  ],
  LO_HUMANO_LO_COMUNITARIO: [
    'cuerpo', 'movimiento', 'saltar', 'correr', 'jugar', 'juego', 'cooperar',
    'cooperativo', 'identidad', 'autoconocimiento', 'salud', 'alimentación', 'ejercicio',
  ],
};

export interface SugerenciaUso {
  campo: string;
  campoCodigo: string;
  score: number;
}

const CAMPOS_POR_CODIGO: Record<string, string> = {
  LENGUAJES: 'Lenguajes',
  SABERES_PENSAMIENTO_CIENTIFICO: 'Saberes y Pensamiento Científico',
  ETICA_NATURALEZA_SOCIEDADES: 'Ética, Naturaleza y Sociedades',
  LO_HUMANO_LO_COMUNITARIO: 'De lo Humano y lo Comunitario',
};

const EMOJI_POR_CAMPO: Record<string, string> = {
  LENGUAJES: '📖',
  SABERES_PENSAMIENTO_CIENTIFICO: '🔬',
  ETICA_NATURALEZA_SOCIEDADES: '🌱',
  LO_HUMANO_LO_COMUNITARIO: '🤝',
};

/**
 * Devuelve las 3 sugerencias principales de campos formativos
 * a partir del texto libre "uso" del recurso.
 */
export function sugerirCamposPorUso(uso: string): SugerenciaUso[] {
  if (!uso || uso.trim().length === 0) return [];
  const normalizado = uso.toLowerCase();
  const tokens = normalizado.split(/\s+/).filter((t) => t.length >= 3);

  const scores = new Map<string, number>();
  for (const [campo, keywords] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (normalizado.includes(kw)) score += 2;
      for (const t of tokens) {
        if (t === kw || t.includes(kw) || kw.includes(t)) score += 1;
      }
    }
    if (score > 0) scores.set(campo, score);
  }

  const sugerencias: SugerenciaUso[] = Array.from(scores.entries())
    .map(([campoCodigo, score]) => ({
      campo: CAMPOS_POR_CODIGO[campoCodigo] ?? campoCodigo,
      campoCodigo,
      score,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return sugerencias;
}

export const CATEGORIAS_RECURSO: Array<{ codigo: string; emoji: string; nombre: string }> = [
  { codigo: 'manipulativos', emoji: '🧮', nombre: 'Manipulativos' },
  { codigo: 'impresos', emoji: '📖', nombre: 'Impresos' },
  { codigo: 'sensoriales', emoji: '🖐️', nombre: 'Sensoriales' },
  { codigo: 'simbolicos', emoji: '🎭', nombre: 'Simbólicos' },
  { codigo: 'musicales', emoji: '🥁', nombre: 'Percusión' },
  { codigo: 'plasticos', emoji: '🎨', nombre: 'Plásticos' },
];

export function emojiCategoria(codigo: string): string {
  return EMOJI_POR_CAMPO[codigo] ?? '📦';
}

export function emojiCampo(codigo: string): string {
  return EMOJI_POR_CAMPO[codigo] ?? '📚';
}
