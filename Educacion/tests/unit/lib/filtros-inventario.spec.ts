import { describe, expect, it } from 'vitest';
import type { BloqueCatalogo } from '@/services/catalogo/catalogo';
import {
  bloqueCatalogoCoincideGrado,
  bloqueModalidadCompatible,
  buildPdaGradoMap,
  filtrarBloquesCatalogo,
  filtrarPDAsPorGrado,
  ordenarBloquesPorContexto,
  puntuarBloqueCatalogo,
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

  it('centros_interes hereda catálogo de unidad_didactica', () => {
    expect(
      bloqueModalidadCompatible(['proyecto_comunitario', 'unidad_didactica'], 'centros_interes'),
    ).toBe(true);
    expect(bloqueModalidadCompatible(['proyecto_comunitario'], 'centros_interes')).toBe(true);
    expect(bloqueModalidadCompatible(['taller_critico'], 'centros_interes')).toBe(false);
  });

  it('filtrarBloquesCatalogo incluye bloques para centros_interes vía alias', () => {
    const bloques = [
      bloqueBase({
        codigo: 'SPC-1',
        pda_ids: ['PDA-F2-SPC-001'],
        modalidades_compatibles: ['proyecto_comunitario', 'unidad_didactica'],
      }),
    ];
    const filtrados = filtrarBloquesCatalogo(bloques, {
      modalidad: 'centros_interes',
      camposFormativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
      gradoPreescolar: '1°',
      pdaGradoPorCodigo: pdaMap,
    });
    expect(filtrados.map((b) => b.codigo)).toEqual(['SPC-1']);
  });

  it('ordena bloques por PDA y tema del centro', () => {
    const bloques = [
      bloqueBase({
        codigo: 'B',
        nombre: 'Conteo genérico',
        pda_ids: ['PDA-F2-SPC-003'],
      }),
      bloqueBase({
        codigo: 'A',
        nombre: 'Observación del entorno natural',
        descripcion: 'Elementos naturales y colores',
        pda_ids: ['PDA-F2-SPC-001'],
      }),
    ];
    const ordenados = ordenarBloquesPorContexto(bloques, {
      pdas: ['PDA-F2-SPC-001'],
      temaCentro: 'Colorín colorante — pinturas con naturaleza',
    });
    expect(ordenados[0].codigo).toBe('A');
    expect(puntuarBloqueCatalogo(ordenados[0], { pdas: ['PDA-F2-SPC-001'] })).toBeGreaterThan(0);
  });
});
