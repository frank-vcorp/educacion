/**
 * Valida que un CCT del catálogo SEP sea de preescolar (jardín de niños).
 */
import {
  NIVEL_EDUCATIVO_MVP,
  esNivelSoportado,
  mensajeCCTNoPreescolar,
} from '@/lib/nivel-educativo/scope';

export type ValidacionCCTPreescolar =
  | { ok: true; clave: string }
  | { ok: false; error: string; field: 'cct' };

export function validarCCTPreescolar(cct: {
  clave: string;
  nivel: string;
} | null): ValidacionCCTPreescolar {
  if (!cct) {
    return { ok: false, error: 'CCT no encontrado en catálogo SEP', field: 'cct' };
  }
  if (!esNivelSoportado(cct.nivel)) {
    return { ok: false, error: mensajeCCTNoPreescolar(cct.nivel), field: 'cct' };
  }
  return { ok: true, clave: cct.clave };
}

export function nivelDocenteForzado(): typeof NIVEL_EDUCATIVO_MVP {
  return NIVEL_EDUCATIVO_MVP;
}
