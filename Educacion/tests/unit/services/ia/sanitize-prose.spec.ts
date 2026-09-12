import { describe, expect, it } from 'vitest';
import { sanitizeIaProse } from '@/services/ia/sanitize-prose';

describe('sanitizeIaProse', () => {
  it('elimina preámbulo conversacional', () => {
    expect(
      sanitizeIaProse(
        'Claro, aquí está el texto adaptado:\nLos niños exploran colores con hojas.',
      ),
    ).toBe('Los niños exploran colores con hojas.');
  });

  it('elimina bloque de razonamiento', () => {
    expect(
      sanitizeIaProse(
        'Tintura con café en cartulina.\nRazonamiento: elegí café por contraste.',
      ),
    ).toBe('Tintura con café en cartulina.');
  });

  it('extrae texto tras etiqueta Sugerencia:', () => {
    expect(
      sanitizeIaProse('Sugerencia: Observar y oler alimentos de colores.'),
    ).toBe('Observar y oler alimentos de colores.');
  });

  it('devuelve vacío para entrada vacía', () => {
    expect(sanitizeIaProse('')).toBe('');
    expect(sanitizeIaProse(null)).toBe('');
  });

  it('elimina bloques redacted_thinking del modelo', () => {
    const tag = 'redacted_' + 'thinking';
    const raw = `<${tag}>The user is asking me to adapt the block...</${tag}>\n\nLun 10 feb — Contacto con la realidad: alimentos del huerto.`;
    expect(sanitizeIaProse(raw)).toBe(
      'Lun 10 feb — Contacto con la realidad: alimentos del huerto.',
    );
  });

  it('elimina bloques thinking simples', () => {
    const raw =
      '<thinking>internal reasoning</thinking>\n\nTintura con café en cartulina.';
    expect(sanitizeIaProse(raw)).toBe('Tintura con café en cartulina.');
  });
});
