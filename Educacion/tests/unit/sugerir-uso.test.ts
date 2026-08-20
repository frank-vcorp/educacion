import { describe, it, expect } from 'vitest';
import { sugerirCamposPorUso, CATEGORIAS_RECURSO } from '@/services/recursos-aula/sugerir-uso';

describe('F-IA1 mini-NLP — sugerir campos formativos por uso (E21 §3.3.1)', () => {
  it('detecta campo LENGUAJES por keywords', () => {
    const r = sugerirCamposPorUso('Para leer cuentos y narrar historias');
    expect(r.some((s) => s.campoCodigo === 'LENGUAJES')).toBe(true);
  });

  it('detecta campo SABERES por keywords matemáticos', () => {
    const r = sugerirCamposPorUso('Para contar números y medir tamaños');
    expect(r.some((s) => s.campoCodigo === 'SABERES_PENSAMIENTO_CIENTIFICO')).toBe(true);
  });

  it('detecta campo ETICA por keywords socioemocionales', () => {
    const r = sugerirCamposPorUso('Para trabajar emociones y convivencia');
    expect(r.some((s) => s.campoCodigo === 'ETICA_NATURALEZA_SOCIEDADES')).toBe(true);
  });

  it('detecta campo LO_HUMANO por keywords de cuerpo/juego', () => {
    const r = sugerirCamposPorUso('Para jugar y hacer ejercicio');
    expect(r.some((s) => s.campoCodigo === 'LO_HUMANO_LO_COMUNITARIO')).toBe(true);
  });

  it('devuelve vacío si el texto no contiene keywords', () => {
    expect(sugerirCamposPorUso('xxxxx')).toEqual([]);
  });

  it('ordena por score descendente', () => {
    const r = sugerirCamposPorUso('leer cuentos leer cuentos leer cuentos');
    expect(r.length).toBeGreaterThan(0);
    if (r.length >= 2) {
      expect(r[0]!.score).toBeGreaterThanOrEqual(r[1]!.score);
    }
  });

  it('maneja texto vacío', () => {
    expect(sugerirCamposPorUso('')).toEqual([]);
  });

  it('categorías tienen emoji y nombre', () => {
    expect(CATEGORIAS_RECURSO.length).toBe(6);
    for (const c of CATEGORIAS_RECURSO) {
      expect(c.emoji).toBeTruthy();
      expect(c.nombre).toBeTruthy();
    }
  });
});
