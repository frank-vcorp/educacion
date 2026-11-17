import { describe, it, expect } from 'vitest';
import {
  esLunes,
  esUltimoViernesDelMes,
  inferirMomentoPorTipo,
  obtenerAsuetoOficial,
  obtenerEfemeride,
  obtenerEstadoDiaEscolar,
} from '@/lib/planeaciones/calendario-escolar';

describe('calendario-escolar', () => {
  it('detecta lunes y último viernes del mes (CTE)', () => {
    expect(esLunes('2026-11-16')).toBe(true);
    expect(esLunes('2026-11-17')).toBe(false);

    // Noviembre 2026: último viernes es 2026-11-27
    expect(esUltimoViernesDelMes('2026-11-27')).toBe(true);
    expect(esUltimoViernesDelMes('2026-11-20')).toBe(false);
    expect(esUltimoViernesDelMes('2026-11-26')).toBe(false);
  });

  it('obtiene efemérides escolares de México', () => {
    expect(obtenerEfemeride('2026-11-20')?.nombre).toContain('Revolución Mexicana');
    expect(obtenerEfemeride('2026-02-24')?.nombre).toContain('Bandera');
    expect(obtenerEfemeride('2026-11-17')).toBeNull();
  });

  it('detecta asuetos oficiales, puentes SEP y vacaciones', () => {
    // 1er lunes de febrero 2026 = 2026-02-02
    expect(obtenerAsuetoOficial('2026-02-02')).toContain('Constitución');
    // 3er lunes de noviembre 2026 = 2026-11-16
    expect(obtenerAsuetoOficial('2026-11-16')).toContain('Revolución');
    // Día del Maestro
    expect(obtenerAsuetoOficial('2026-05-15')).toContain('Maestra');
    // Puente oficial no muestra Honores
    const puente = obtenerEstadoDiaEscolar('2026-11-16');
    expect(puente.esAsueto).toBe(true);
    expect(puente.esHonores).toBe(false);
  });

  it('infiere el momento de la modalidad desde el tipo del catálogo', () => {
    expect(inferirMomentoPorTipo('apertura', 'proyecto_comunitario')).toBe('motivacion');
    expect(inferirMomentoPorTipo('desarrollo', 'proyecto_comunitario')).toBe('accion');
    expect(inferirMomentoPorTipo('evaluacion', 'proyecto_comunitario')).toBe('evaluacion');
    expect(inferirMomentoPorTipo('apertura', 'abj')).toBe('inicio_juego');
  });
});
