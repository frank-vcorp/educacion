import { describe, it, expect } from 'vitest';
import {
  buildContextoPlaneacionF1,
  buildF1UserMessage,
  inferirEntornoF1,
  validarAdaptacionMinima,
} from '@/services/ia/f1-context';

describe('f1-context', () => {
  it('infiere entorno rural desde ajustes', () => {
    expect(
      inferirEntornoF1({
        ajustesRazonables: 'Escuela rural con huerto escolar y materiales del campo',
      }),
    ).toBe('rural');
  });

  it('infiere entorno urbano', () => {
    expect(
      inferirEntornoF1({
        problemaContexto: 'Exploramos el mercado y el transporte en la ciudad',
      }),
    ).toBe('urbana');
  });

  it('buildContextoPlaneacionF1 extrae tema del centro', () => {
    const ctx = buildContextoPlaneacionF1({
      problema_contexto: '¿Cómo pintamos con la naturaleza?',
      metadata: { modalidad_data: { tema: 'Colorín colorante' } },
    });
    expect(ctx.temaCentro).toBe('Colorín colorante');
    expect(ctx.problemaContexto).toContain('naturaleza');
  });

  it('buildF1UserMessage incluye resumen completo del centro', () => {
    const msg = buildF1UserMessage({
      contenidoTextual: 'Buscan objetos con forma [FIGURA].',
      contexto: {
        nombre: 'Colorín colorante',
        temaCentro: 'Pinturas con naturaleza',
        problemaContexto: 'Los NN no conocen elementos de la naturaleza.',
        preguntasDetonadoras: ['¿La Jamaica se podrá usar para pintar?'],
        ejesArticuladores: ['Inclusión'],
        pdas: [{ codigo: 'PDA-F2-SPC-001', texto: 'Usan los sentidos.', campo: 'Saberes' }],
        momentosDelCentro: ['Contacto con la realidad'],
        momentoActividad: 'Contacto con la realidad',
        entornoSugerido: 'rural',
      },
      varianteTipo: 'rural',
    });
    const parsed = JSON.parse(msg) as {
      texto_actividad: string;
      resumen_centro: {
        tema_centro: string;
        preguntas_detonadoras: string[];
        pdas: Array<{ texto: string }>;
      };
      entorno: string;
    };
    expect(parsed.texto_actividad).toContain('[FIGURA]');
    expect(parsed.resumen_centro.tema_centro).toBe('Pinturas con naturaleza');
    expect(parsed.resumen_centro.preguntas_detonadoras[0]).toContain('Jamaica');
    expect(parsed.resumen_centro.pdas[0].texto).toContain('sentidos');
    expect(parsed.entorno).toBe('rural');
  });

  it('buildContextoPlaneacionF1 enriquece PDAs y ejes desde catálogo', () => {
    const ctx = buildContextoPlaneacionF1({
      nombre: 'Colorín colorante',
      modalidad: 'centros_interes',
      campos_formativos: ['SPC'],
      ejes_articuladores: ['INCLUSION'],
      pdas: ['PDA-F2-SPC-001'],
      metadata: {
        modalidad_data: {
          tema: 'Pinturas con naturaleza',
          preguntas_det: ['¿Con limón podremos escribir?'],
        },
      },
      catalogo: {
        campos: [{ codigo: 'SPC', nombre: 'Saberes y pensamiento científico' }],
        ejes: [{ codigo: 'INCLUSION', nombre: 'Inclusión' }],
        pdas: [
          {
            codigo: 'PDA-F2-SPC-001',
            texto: 'Experimentan con elementos naturales.',
            contenido_codigo: 'C1',
          },
        ],
        contenidos: [{ codigo: 'C1', campo_codigo: 'SPC' }],
      },
    });
    expect(ctx.preguntasDetonadoras?.[0]).toContain('limón');
    expect(ctx.ejesArticuladores).toEqual(['Inclusión']);
    expect(ctx.pdas?.[0].texto).toContain('Experimentan');
  });

  it('validarAdaptacionMinima rechaza cambios triviales', () => {
    const original =
      'La docente presenta la figura "[FIGURA]". Las niñas/niños buscan objetos del aula con esa forma.';
    const casiIgual =
      'La docente presenta la figura "[FIGURA]". Las niñas y los niños buscan objetos del aula y del entorno natural cercano con esa forma.';
    expect(validarAdaptacionMinima(original, casiIgual)).not.toBeNull();
  });

  it('validarAdaptacionMinima acepta adaptación sustancial', () => {
    const original =
      'La docente presenta la figura "[FIGURA]". Las niñas/niños buscan objetos del aula con esa forma.';
    const adaptado =
      'En el huerto escolar, la docente muestra hojas de maguey y piedras redondas. Las niñas y los niños recorren el patio buscando objetos con forma circular o triangular para pegarlos en la tabla colectiva.';
    expect(validarAdaptacionMinima(original, adaptado)).toBeNull();
  });
});
