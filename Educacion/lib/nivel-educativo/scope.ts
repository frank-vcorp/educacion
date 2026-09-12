/**
 * Alcance del MVP: solo preescolar (Fase 2).
 * Primaria y secundaria quedan archivadas en futuro/primaria-secundaria/.
 */

export const NIVEL_EDUCATIVO_MVP = 'preescolar' as const;
export type NivelEducativoMVP = typeof NIVEL_EDUCATIVO_MVP;

export const GRADOS_PREESCOLAR = ['1°', '2°', '3°'] as const;
export type GradoPreescolar = (typeof GRADOS_PREESCOLAR)[number];

/** Plan de estudio NEM activo en este producto. */
export const FASE_CATALOGO_MVP = 'PLAN_2022_ED_2025_FASE_2' as const;

export function esNivelSoportado(nivel: string | null | undefined): nivel is NivelEducativoMVP {
  return nivel === NIVEL_EDUCATIVO_MVP;
}

export function mensajeCCTNoPreescolar(nivelCCT: string): string {
  return `Esta plataforma es para jardines de niños (preescolar). Tu escuela está registrada como ${nivelCCT}. Primaria y secundaria tendrán su propio sistema más adelante.`;
}

export function mensajeSoloPreescolar(): string {
  return 'Planeación NEM para preescolar (1°, 2° y 3° de jardín de niños).';
}
