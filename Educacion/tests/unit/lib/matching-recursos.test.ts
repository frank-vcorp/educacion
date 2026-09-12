import { describe, expect, it } from 'vitest';
import { matchRecursosInventario } from '@/lib/planeaciones/matching-recursos';

describe('matchRecursosInventario', () => {
  const inventario = [
    { id: '1', nombre: 'Caja de colores', categoria: 'plasticos', uso: 'pintar y colorear' },
    { id: '2', nombre: 'Cuento del bosque', categoria: 'impresos', uso: 'lectura en círculo' },
  ];

  it('empareja por clave_busqueda en nombre', () => {
    const matches = matchRecursosInventario(
      [{ categoria: 'plasticos', clave_busqueda: 'colores' }],
      inventario,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.recursoId).toBe('1');
  });

  it('empareja por categoría si no hay clave', () => {
    const matches = matchRecursosInventario(
      [{ categoria: 'impresos' }],
      inventario,
    );
    expect(matches[0]?.recursoId).toBe('2');
  });

  it('no repite el mismo recurso', () => {
    const matches = matchRecursosInventario(
      [
        { clave_busqueda: 'colores' },
        { clave_busqueda: 'colores vinílicos' },
      ],
      inventario,
    );
    expect(matches).toHaveLength(1);
  });
});
