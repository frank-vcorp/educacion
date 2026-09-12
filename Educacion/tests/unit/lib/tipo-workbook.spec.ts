import { describe, expect, it } from 'vitest';
import {
  buildWorkbookMetadata,
  generarSesionesWorkbook,
  resolverWorkbookConfig,
  validarFechasContraAlcance,
} from '@/lib/planeaciones/tipo-workbook';

describe('tipo-workbook', () => {
  it('buildWorkbookMetadata para centro + rango', () => {
    const m = buildWorkbookMetadata('centros_interes', 'rango_fechas');
    expect(m.plantilla).toBe('centro_interes');
    expect(m.estrategia_sesiones).toBe('dias_habiles_rango');
    expect(m.periodo_tipo).toBe('rango_fechas');
  });

  it('semanal usa estrategia semana_lv', () => {
    const m = buildWorkbookMetadata('centros_interes', 'semanal');
    expect(m.estrategia_sesiones).toBe('semana_lv');
  });

  it('validarFechasContraAlcance rechaza semana larga', () => {
    const err = validarFechasContraAlcance('semanal', '2025-02-10', '2025-02-28');
    expect(err).toMatch(/semanal/i);
  });

  it('generarSesionesWorkbook rango genera días hábiles', () => {
    const config = resolverWorkbookConfig({
      modalidad: 'centros_interes',
      alcanceTemporal: 'rango_fechas',
    });
    const rows = generarSesionesWorkbook({
      config,
      planeacionId: '00000000-0000-4000-8000-000000000001',
      docenteId: '00000000-0000-4000-8000-000000000002',
      cct: '22DJN0059R',
      periodoInicio: '2025-02-10',
      periodoFin: '2025-02-14',
    });
    expect(rows).toHaveLength(5);
  });
});
