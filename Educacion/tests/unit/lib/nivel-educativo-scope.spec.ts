import { describe, expect, it } from 'vitest';
import {
  GRADOS_PREESCOLAR,
  NIVEL_EDUCATIVO_MVP,
  esNivelSoportado,
  mensajeCCTNoPreescolar,
} from '@/lib/nivel-educativo/scope';
import { validarCCTPreescolar } from '@/lib/nivel-educativo/validar-cct';

describe('nivel-educativo scope', () => {
  it('MVP solo admite preescolar', () => {
    expect(NIVEL_EDUCATIVO_MVP).toBe('preescolar');
    expect(esNivelSoportado('preescolar')).toBe(true);
    expect(esNivelSoportado('primaria')).toBe(false);
    expect(esNivelSoportado('secundaria')).toBe(false);
  });

  it('grados preescolar son 1° 2° 3°', () => {
    expect(GRADOS_PREESCOLAR).toEqual(['1°', '2°', '3°']);
  });

  it('rechaza CCT de primaria', () => {
    const res = validarCCTPreescolar({ clave: '09DPR0001A', nivel: 'primaria' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(mensajeCCTNoPreescolar('primaria'));
    }
  });

  it('acepta CCT preescolar', () => {
    const res = validarCCTPreescolar({ clave: '22DJN0059R', nivel: 'preescolar' });
    expect(res.ok).toBe(true);
  });
});
