import { describe, expect, it } from 'vitest';
import {
  buildSesionesSemanaRows,
  modalidadUsaCalendarioSemanal,
  tituloSesionDia,
} from '@/lib/planeaciones/sesiones-semana';

describe('sesiones-semana', () => {
  it('genera 5 sesiones L–V', () => {
    const rows = buildSesionesSemanaRows({
      planeacionId: '00000000-0000-4000-8000-000000000001',
      docenteId: '00000000-0000-4000-8000-000000000002',
      cct: '22DJN0059R',
    });
    expect(rows).toHaveLength(5);
    expect(rows[0]?.ajustes_sesion).toBe('Lunes');
    expect(rows[4]?.ajustes_sesion).toBe('Viernes');
  });

  it('tituloSesionDia con extra', () => {
    expect(tituloSesionDia('martes', 'Tintura con café')).toBe('Martes: Tintura con café');
  });

  it('modalidadUsaCalendarioSemanal', () => {
    expect(modalidadUsaCalendarioSemanal('centros_interes')).toBe(true);
    expect(modalidadUsaCalendarioSemanal('abj')).toBe(false);
  });
});
