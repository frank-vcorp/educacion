import { describe, expect, it } from 'vitest';
import {
  buildSesionesDesdePeriodo,
  clasificarPeriodo,
  diasHabilesEnRango,
  etiquetaSesionConFecha,
  agruparFechasPorSemana,
} from '@/lib/planeaciones/calendario-periodo';

describe('calendario-periodo', () => {
  it('Lolita Colorín: 10–28 feb 2025 genera días hábiles L–V', () => {
    const dias = diasHabilesEnRango('2025-02-10', '2025-02-28');
    expect(dias.length).toBeGreaterThan(5);
    expect(clasificarPeriodo('2025-02-10', '2025-02-28')).toBe('mensual');
  });

  it('semana corta = semanal', () => {
    expect(clasificarPeriodo('2025-02-10', '2025-02-14')).toBe('semanal');
    expect(diasHabilesEnRango('2025-02-10', '2025-02-14')).toHaveLength(5);
  });

  it('buildSesionesDesdePeriodo una sesión por día', () => {
    const rows = buildSesionesDesdePeriodo({
      planeacionId: '00000000-0000-4000-8000-000000000001',
      docenteId: '00000000-0000-4000-8000-000000000002',
      cct: '22DJN0059R',
      periodoInicio: '2025-02-10',
      periodoFin: '2025-02-12',
    });
    expect(rows).toHaveLength(3);
    expect(rows[0]?.ajustes_sesion).toBe(etiquetaSesionConFecha('2025-02-10'));
  });

  it('agruparFechasPorSemana', () => {
    const semanas = agruparFechasPorSemana(['2025-02-10', '2025-02-11', '2025-02-17']);
    expect(semanas.length).toBe(2);
  });
});
