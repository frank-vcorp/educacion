import { describe, it, expect } from 'vitest';
import { anonymizeText, anonymizeRequest, _INTERNAL_PATTERNS } from '@/lib/ia/anonymizer';

describe('ia_anonymizer — PII filter (P-PD8, P-PD9, D-FIN-13)', () => {
  it('anonimiza nombres propios (2+ palabras capitalizadas)', () => {
    const r = anonymizeText('La alumna María López García necesita apoyo');
    expect(r).toContain('[NOMBRE]');
    expect(r).not.toContain('María López García');
  });

  it('NO anonimiza tokens seguros del dominio NEM', () => {
    expect(anonymizeText('México NEM SEP')).toBe('México NEM SEP');
    expect(anonymizeText('El proyecto NEM avanza')).toContain('NEM');
  });

  it('anonimiza celulares (10-15 dígitos)', () => {
    const r = anonymizeText('Llamar al 5215555555555 por favor');
    expect(r).toContain('[CELULAR]');
    expect(r).not.toContain('5215555555555');
  });

  it('anonimiza correos electrónicos', () => {
    const r = anonymizeText('Escribir a maria.lopez@escuela.edu.mx');
    expect(r).toContain('[EMAIL]');
    expect(r).not.toContain('maria.lopez@escuela.edu.mx');
  });

  it('anonimiza CCT con formato estándar 5+2+3', () => {
    const r = anonymizeText('CCT 09DPR1234Z');
    expect(r).toContain('[CCT]');
  });

  it('anonimiza CURP', () => {
    const r = anonymizeText('CURP LOMG850623HDFRPR09');
    expect(r).toContain('[CURP]');
  });

  it('preserva palabras con 1 sola mayúscula (verbos en inicio de oración)', () => {
    const r = anonymizeText('Aprender es divertido');
    expect(r).toBe('Aprender es divertido');
  });

  it('maneja entrada vacía', () => {
    expect(anonymizeText('')).toBe('');
  });

  it('anonymizeRequest anonimiza prompt y contexto por separado', () => {
    const r = anonymizeRequest({
      prompt: 'Sugerir variante para María López',
      context: 'CCT 09DPR1234Z',
      observaciones: '',
    });
    expect(r.prompt).toContain('[NOMBRE]');
    expect(r.context).toContain('[CCT]');
  });

  it('los patrones internos son regex válidos', () => {
    expect(_INTERNAL_PATTERNS.NOMBRE_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.CELULAR_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.EMAIL_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.CCT_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.CURP_PATTERN).toBeInstanceOf(RegExp);
  });
});
