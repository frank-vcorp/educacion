/**
 * Referencia para sistemas futuros — NO importar en la app MVP preescolar.
 * Ver README.md en este directorio.
 */

export const NIVELES_EDUCATIVOS = ['preescolar', 'primaria', 'secundaria'] as const;
export type NivelEducativo = (typeof NIVELES_EDUCATIVOS)[number];

export const GRADOS_POR_NIVEL = {
  preescolar: ['1°', '2°', '3°'],
  primaria: ['1°', '2°', '3°', '4°', '5°', '6°'],
  secundaria: ['1°', '2°', '3°'],
} as const satisfies Record<NivelEducativo, readonly string[]>;

/** Planes de estudio NEM por fase (referencia). */
export const FASES_CATALOGO = {
  preescolar: 'PLAN_2022_ED_2025_FASE_2',
  primaria: 'PLAN_2022_ED_2025_FASE_1',
  secundaria: 'PLAN_2022_ED_2025_FASE_3',
} as const;
