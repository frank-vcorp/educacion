/**
 * Tests para parseBancoPalabras (wizard-banco-palabras).
 * SPEC_MODALIDADES_2026-08-17 §T2.
 */
import { describe, it, expect } from 'vitest';
import { parseBancoPalabras } from '../../app/(app)/planeaciones/nueva/_components/wizard-banco-palabras';

describe('parseBancoPalabras', () => {
  it('separa por comas', () => {
    expect(parseBancoPalabras('agua, semilla, comunidad')).toEqual([
      'agua',
      'semilla',
      'comunidad',
    ]);
  });

  it('ignora espacios en blanco y entradas vacías', () => {
    expect(parseBancoPalabras(' agua , , semilla  ,')).toEqual(['agua', 'semilla']);
  });

  it('normaliza a minúsculas', () => {
    expect(parseBancoPalabras('Agua, SEMILLA, Comunidad')).toEqual([
      'agua',
      'semilla',
      'comunidad',
    ]);
  });

  it('devuelve array vacío con string vacío', () => {
    expect(parseBancoPalabras('')).toEqual([]);
    expect(parseBancoPalabras('   ')).toEqual([]);
    expect(parseBancoPalabras(',,,')).toEqual([]);
  });
});