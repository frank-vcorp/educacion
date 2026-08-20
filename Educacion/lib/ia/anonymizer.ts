/**
 * Filtro de PII antes de enviar datos a un proveedor IA configurable.
 *
 * - Nombres propios en español (palabras capitalizadas contiguas) → [NOMBRE]
 * - 10+ dígitos consecutivos → [CELULAR]
 * - Correos electrónicos → [EMAIL]
 * - CCTs (formato 2 dígitos + 3 letras + 4 dígitos + letra opcional) → [CCT]
 * - CURP (formato 4 letras + 6 dígitos + 6 alfanum) → [CURP]
 *
 * D-FIN-13: server-side + anonimizador + cero datos de menores.
 * P-PD8 + P-PD9: contratos protectores de estructura NEM y trazabilidad.
 *
 * USO:
 *   const safe = anonymizeText('La alumna María López García necesita apoyo');
 *   // → 'La alumna [NOMBRE] necesita apoyo'
 */

const NOMBRE_PATTERN = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}\b/g;
const CELULAR_PATTERN = /\b\d{10,15}\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CCT_PATTERN = /\b\d{2}[A-Z]{3}\d{4}[A-Z]?\b/g;
const CURP_PATTERN = /\b[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]{2}\b/g;

const SAFE_TOKENS = new Set([
  // Original case + mayúsculas (para que IRREDACTABLE_PATTERN los ignore).
  'México', 'Mexicana', 'Mexicano', 'MÉXICO', 'MEXICANA', 'MEXICANO',
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
  'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO',
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO',
  'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
  'NEM', 'SEP', 'CONALITEG',
  'Preescolar', 'Primaria', 'Secundaria',
  'PREESCOLAR', 'PRIMARIA', 'SECUNDARIA',
  'Inicio', 'Desarrollo', 'Cierre', 'Apertura', 'Práctica',
  'INICIO', 'DESARROLLO', 'CIERRE', 'APERTURA', 'PRÁCTICA',
  'Verde', 'Amarillo', 'Naranja', 'Rojo',
  'VERDE', 'AMARILLO', 'NARANJA', 'ROJO',
  'Logrado', 'Apoyo', 'Constante', 'Proyecto', 'Comunitario',
  'LOGRADO', 'APOYO', 'CONSTANTE', 'PROYECTO', 'COMUNITARIO',
  'LFPDPPP',
]);

export interface AnonymizeOptions {
  /** Reemplazar también palabras de 1 sola mayúscula (probable apellido) */
  singleCap?: boolean;
  /** Mantener el texto original en logs (no redactor) */
  preserve?: boolean;
}

/**
 * Indica si el anonimizador detectó PII que no pudo redactar limpiamente.
 * Caso patológico: texto que parece contener un nombre propio pero no
 * encaja en el patrón `NOMBRE_PATTERN` (p.ej. "MARÍA LÓPEZ" todo en
 * mayúsculas, sin acentos). Se conserva como heurística defensiva para
 * activar el error `NEM_IA_ANONYMIZER_BLOCKED` (500) en los route handlers.
 *
 * Criterio "irredactable":
 *  - 2+ palabras TODO MAYÚSCULAS seguidas, de longitud ≥3 cada una.
 *  - Que NO coincidan con ningún token seguro (cargado en mayúsculas).
 */
const IRREDACTABLE_PATTERN = /\b[A-ZÁÉÍÓÚÑ]{3,}(?:\s+[A-ZÁÉÍÓÚÑ]{3,}){1,3}\b/g;

export function detectIrredactablePII(text: string): boolean {
  if (!text) return false;
  const matches = text.match(IRREDACTABLE_PATTERN) ?? [];
  for (const m of matches) {
    // Si TODAS las palabras del match son tokens seguros, no es PII
    // irredactable (caso "MÉXICO NEM SEP").
    const words = m.split(/\s+/);
    const allSafe = words.every((w) => SAFE_TOKENS.has(w) || SAFE_TOKENS.has(w.toUpperCase()));
    if (!allSafe) return true;
  }
  return false;
}

export function anonymizeText(text: string, _opts: AnonymizeOptions = {}): string {
  if (!text) return text;

  let out = text;

  // Orden: primero los patrones específicos (email, CCT, CURP, celular)
  out = out.replace(CURP_PATTERN, '[CURP]');
  out = out.replace(CCT_PATTERN, '[CCT]');
  out = out.replace(EMAIL_PATTERN, '[EMAIL]');
  out = out.replace(CELULAR_PATTERN, '[CELULAR]');

  // Nombres propios (2+ palabras capitalizadas)
  out = out.replace(NOMBRE_PATTERN, (match) =>
    SAFE_TOKENS.has(match) ? match : '[NOMBRE]',
  );

  return out;
}

/**
 * Shape ampliado para F1/F2/F3 (SPEC_TEC_07 §4.2).
 * Antes: `{ prompt, context, observaciones }`.
 * Ahora: cualquier string que vaya al proveedor. Todos los campos se
 * anonimizan con `anonymizeText`. Los patrones regex ya cubren la PII
 * habitual; el shape nuevo es de entrada, no de detección.
 */
export interface AnonymizeRequest {
  prompt?: string;
  context?: string;
  observaciones?: string;
  texto_base?: string;
  texto?: string;
  contenido_textual?: string;
  variante_tipo?: string;
  accion?: string;
  campos_a_pulir?: ReadonlyArray<string>;
  /** Cualquier otro campo libre (anonimización defensiva). */
  extras?: Readonly<Record<string, string>>;
}

export function anonymizeRequest(req: AnonymizeRequest): AnonymizeRequest {
  const anonymize = (v: string | undefined) =>
    typeof v === 'string' && v.length > 0 ? anonymizeText(v) : v;

  const extrasAnon: Record<string, string> = {};
  if (req.extras) {
    for (const [k, v] of Object.entries(req.extras)) {
      extrasAnon[k] = anonymizeText(v);
    }
  }

  return {
    prompt: anonymize(req.prompt),
    context: anonymize(req.context),
    observaciones: anonymize(req.observaciones),
    texto_base: anonymize(req.texto_base),
    texto: anonymize(req.texto),
    contenido_textual: anonymize(req.contenido_textual),
    variante_tipo: req.variante_tipo, // enum seguro, no requiere anonimización
    accion: req.accion, // enum seguro
    campos_a_pulir: req.campos_a_pulir,
    extras: extrasAnon,
  };
}

/**
 * Helper para aplicar `detectIrredactablePII` sobre todos los campos string
 * de un `AnonymizeRequest`. Devuelve el primer campo sospechoso (no anon.) o
 * `null` si todo limpio.
 */
export function findIrredactableField(
  req: AnonymizeRequest,
): string | null {
  const fields: Array<[string, string | undefined]> = [
    ['prompt', req.prompt],
    ['context', req.context],
    ['observaciones', req.observaciones],
    ['texto_base', req.texto_base],
    ['texto', req.texto],
    ['contenido_textual', req.contenido_textual],
  ];
  for (const [name, value] of fields) {
    if (value && detectIrredactablePII(value)) return name;
  }
  if (req.extras) {
    for (const [k, v] of Object.entries(req.extras)) {
      if (v && detectIrredactablePII(v)) return `extras.${k}`;
    }
  }
  return null;
}

/** Auto-test de cobertura del filtro (para tests). */
export const _INTERNAL_PATTERNS = {
  NOMBRE_PATTERN,
  CELULAR_PATTERN,
  EMAIL_PATTERN,
  CCT_PATTERN,
  CURP_PATTERN,
  IRREDACTABLE_PATTERN,
};