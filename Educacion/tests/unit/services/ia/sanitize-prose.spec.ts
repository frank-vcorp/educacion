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

  it('elimina razonamiento largo redacted_thinking (caso rural F1)', () => {
    const tag = 'redacted_' + 'thinking';
    const raw = `<${tag}>The user wants me to adapt the text of a planning block to a rural context. I need to:
- Not change PDAs, formative fields, articulating axes, or pedagogical structure
- Not invent new PDAs
Let me refine to make it sound more natural.</${tag}>
La docente reúne al grupo en el patio o bajo un árbol y coloca en el centro 3-4 elementos del entorno natural cercano (piedra del río, hoja de maíz, flor del campo, ramita de hierbabuena). Pregunta: "¿Qué ven? ¿Qué sienten?". Las niñas y niños exploran con los 5 sentidos (sin oler ni probar objetos que no sean seguros), reconociendo los recursos de su comunidad.`;
    const out = sanitizeIaProse(raw);
    expect(out.startsWith('La docente reúne')).toBe(true);
    expect(out).not.toMatch(/The user wants/i);
    expect(out).not.toMatch(/redacted/i);
  });

  it('elimina preámbulo en inglés sin tags', () => {
    const raw = `The user wants a shorter version.
Let me draft something.
Los niños exploran texturas con hojas del huerto.`;
    expect(sanitizeIaProse(raw)).toBe('Los niños exploran texturas con hojas del huerto.');
  });

  it('decodifica entidades HTML en tags thinking', () => {
    const raw =
      '&lt;thinking&gt;reasoning&lt;/thinking&gt;\n\nLa docente presenta materiales naturales.';
    expect(sanitizeIaProse(raw)).toBe('La docente presenta materiales naturales.');
  });
});
