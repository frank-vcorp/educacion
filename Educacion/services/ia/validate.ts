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

/**
 * F0 — respuesta del proveedor para el paso inicial del wizard.
 * SPEC_TEC_10 §4.2 — IMPL-20260820-06.
 *
 * Tolerante: extrae el primer bloque JSON del texto (admite envoltura
 * ```json ... ```), igual que el patrón de `pulir-pdf`.
 * Devuelve `null` si el JSON es inválido o si `problema_estructurado`
 * está vacío tras `trim()`. `proposito` y `ajustes_razonables` se
 * normalizan a `''` si faltan o vienen vacíos.
 */
export interface F0Respuesta {
  problema_estructurado: string;
  proposito: string;
  ajustes_razonables: string;
}

export function parseRespuestaF0(texto: string | undefined | null): F0Respuesta | null {
  if (!texto || typeof texto !== 'string') return null;
  let candidate = texto.trim();
  if (candidate.length === 0) return null;

  // Tolerar envoltura ```json ... ``` o primer {...} embebido en prosa.
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence && fence[1]) {
    candidate = fence[1];
  } else {
    const firstBrace = candidate.match(/\{[\s\S]*\}/);
    if (firstBrace) candidate = firstBrace[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const problemaRaw = obj.problema_estructurado;
  if (typeof problemaRaw !== 'string') return null;
  const problema = problemaRaw.trim();
  if (problema.length === 0) return null;

  const propositoRaw = obj.proposito;
  const ajustesRaw = obj.ajustes_razonables;
  const proposito = typeof propositoRaw === 'string' ? propositoRaw : '';
  const ajustes = typeof ajustesRaw === 'string' ? ajustesRaw : '';

  return {
    problema_estructurado: problema,
    proposito: proposito.trim(),
    ajustes_razonables: ajustes.trim(),
  };
}