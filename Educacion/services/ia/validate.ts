/**
 * Validación post-IA de estructura NEM (SPEC_TEC_07 §5.1, §5.3).
 *
 * - F1: la respuesta NO debe alterar PDA/campos/ejes del bloque.
 *   Criterio: el proveedor sólo adapta texto. Si introduce códigos
 *   `PDA-F<n>-...` que no estaban en el bloque, es violación.
 * - F3: la respuesta NO debe introducir PDA no presentes en el catálogo
 *   oficial (regex `PDA-F\d-...`). Se compara contra `catalogoPdas`
 *   recibido del caller.
 *
 * Patrones PDA: `PDA-F<1-9>-<CAMPO>-<NNN>` (3 letras mayúsculas + 3 dígitos).
 * Coincide con el formato del seed (SPEC_TEC_02 §5.1.5).
 */
const PDA_PATTERN = /\bPDA-F\d-[A-Z]{3}-\d{3}\b/g;

export function extractPdaCodes(text: string): string[] {
  if (!text) return [];
  const matches = text.match(PDA_PATTERN) ?? [];
  return Array.from(new Set(matches));
}

/**
 * Valida que la respuesta F1 no introduzca PDA nuevos respecto al bloque.
 * Devuelve `null` si OK, o `{ ok:false, code, message, campo? }` si viola.
 */
export interface EstructuraF1Input {
  /** PDA declarados en el bloque original (DB). */
  pdaOriginales: ReadonlyArray<string>;
  /** Texto devuelto por el proveedor. */
  varianteTexto: string;
}

export interface EstructuraViolacion {
  code: 'NEM_IA_VARIANTE_VIOLA_ESTRUCTURA';
  message: string;
  pdaIntroducidos: string[];
}

export function validarEstructuraF1(input: EstructuraF1Input): EstructuraViolacion | null {
  const enVariante = new Set(extractPdaCodes(input.varianteTexto));
  const originales = new Set(input.pdaOriginales);
  const introducidos = [...enVariante].filter((p) => !originales.has(p));
  if (introducidos.length > 0) {
    return {
      code: 'NEM_IA_VARIANTE_VIOLA_ESTRUCTURA',
      message: `La respuesta introdujo PDA no presentes en el bloque: ${introducidos.join(', ')}`,
      pdaIntroducidos: introducidos,
    };
  }
  return null;
}

/**
 * Valida que la respuesta F3 no introduzca PDA no presentes en el catálogo.
 * `catalogoPdas` = lista de PDA activos recibida de la DB (vía caller).
 */
export interface ValidarF3Input {
  campo: string;
  textoPulido: string;
  catalogoPdas: ReadonlyArray<string>;
}

export function validarCampoPulidoF3(input: ValidarF3Input): EstructuraViolacion | null {
  const enTexto = new Set(extractPdaCodes(input.textoPulido));
  const catalogo = new Set(input.catalogoPdas);
  const introducidos = [...enTexto].filter((p) => !catalogo.has(p));
  if (introducidos.length > 0) {
    return {
      code: 'NEM_IA_VARIANTE_VIOLA_ESTRUCTURA',
      message: `PDA no en catálogo: ${introducidos.join(', ')}`,
      pdaIntroducidos: introducidos,
    };
  }
  return null;
}