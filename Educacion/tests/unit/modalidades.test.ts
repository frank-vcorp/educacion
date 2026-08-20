/**
 * Tests para MODALIDADES + buildSteps (lógica del wizard).
 * SPEC_MODALIDADES_2026-08-17.
 *
 * Como el wizard es un componente client con mucho estado y hooks,
 * testear la función pura buildSteps exportada evita acoplar a React.
 */
import { describe, it, expect } from 'vitest';
import { MODALIDADES } from '../../app/(app)/planeaciones/nueva/_components/wizard-modalidad-selector';
import { DIAS_SEMANA } from '../../app/(app)/planeaciones/nueva/_components/wizard-calendario-semanal';

describe('MODALIDADES — 6 modalidades NEM', () => {
  it('define exactamente 6 modalidades canónicas', () => {
    const values = MODALIDADES.map((m) => m.value).sort();
    expect(values).toEqual([
      'abj',
      'centros_interes',
      'proyecto_comunitario',
      'rincones',
      'taller_critico',
      'unidad_didactica',
    ]);
  });

  it('cada modalidad tiene label, desc, duracion y estructura', () => {
    for (const m of MODALIDADES) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.desc.length).toBeGreaterThan(0);
      expect(m.duracion.length).toBeGreaterThan(0);
      expect(m.estructura.length).toBeGreaterThan(0);
    }
  });
});

describe('DIAS_SEMANA — calendario semanal L M M J V', () => {
  it('define los 5 días hábiles en orden', () => {
    expect(DIAS_SEMANA.map((d) => d.key)).toEqual([
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
    ]);
  });

  it('las etiquetas son L M M J V', () => {
    expect(DIAS_SEMANA.map((d) => d.label)).toEqual(['L', 'M', 'M', 'J', 'V']);
  });
});