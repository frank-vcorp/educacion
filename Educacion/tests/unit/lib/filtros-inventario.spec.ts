import { describe, expect, it } from 'vitest';
import type { BloqueCatalogo } from '@/services/catalogo/catalogo';
import {
  bloqueCatalogoCoincideGrado,
  buildPdaGradoMap,
  filtrarBloquesCatalogo,
  filtrarPDAsPorGrado,
} from '@/lib/nivel-educativo/filtros-inventario';

const pdaMap = buildPdaGradoMap([
  { codigo: 'PDA-F2-SPC-001', grado: '1°' },
  { codigo: 'PDA-F2-SPC-003', grado: '2°' },
  { codigo: 'PDA-F2-LNG-005', grado: '3°' },
]);

const bloqueBase = (overrides: Partial<BloqueCatalogo>): BloqueCatalogo => ({
  id: '1',
  codigo: 'BLQ-TEST',
  nombre: 'Test',
  descripcion: null,
  tipo: 'desarrollo',
  nivel_flexibilidad: 'cerrado',
  contenido_textual: null,
  pda_ids: ['PDA-F2-SPC-001'],
  campos_formativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
  ejes_articuladores: [],
  recursos_requeridos: [],
  modalidades_compatibles: ['centros_interes'],
  duracion_min: 30,
  ...overrides,
});

describe('filtros-inventario', () => {
  it('bloqueCatalogoCoincideGrado por PDA del grado', () => {
    expect(
      bloqueCatalogoCoincideGrado({ pda_ids: ['PDA-F2-SPC-003'] }, '2°', pdaMap),
    ).toBe(true);
    expect(
      bloqueCatalogoCoincideGrado({ pda_ids: ['PDA-F2-SPC-001'] }, '2°', pdaMap),
    ).toBe(false);
    expect(bloqueCatalogoCoincideGrado({ pda_ids: [] }, '2°', pdaMap)).toBe(true);
  });

  it('filtrarBloquesCatalogo aplica modalidad, campo y grado', () => {
    const bloques = [
      bloqueBase({
        codigo: 'A',
        pda_ids: ['PDA-F2-SPC-003'],
        campos_formativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
        modalidades_compatibles: ['centros_interes'],
      }),
      bloqueBase({
        codigo: 'B',
        pda_ids: ['PDA-F2-SPC-001'],
        campos_formativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
        modalidades_compatibles: ['centros_interes'],
      }),
    ];

    const filtrados = filtrarBloquesCatalogo(bloques, {
      modalidad: 'centros_interes',
      camposFormativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
      gradoPreescolar: '2°',
      pdaGradoPorCodigo: pdaMap,
    });

    expect(filtrados.map((b) => b.codigo)).toEqual(['A']);
  });

  it('filtrarPDAsPorGrado', () => {
    const pdas = [
      { codigo: 'A', grado: '1°', texto: '', contenido_codigo: '', activo: true },
      { codigo: 'B', grado: '2°', texto: '', contenido_codigo: '', activo: true },
    ];
    expect(filtrarPDAsPorGrado(pdas, '2°')).toHaveLength(1);
  });
});
