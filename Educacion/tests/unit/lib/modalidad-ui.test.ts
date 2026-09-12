import { describe, expect, it } from 'vitest';
import {
  buildModalidadDisplay,
  getEtiquetaActividades,
  getMensajeSinActividades,
} from '@/lib/planeaciones/modalidad-ui';

describe('modalidad-ui', () => {
  it('usa lenguaje de actividades para proyecto comunitario', () => {
    expect(getEtiquetaActividades('proyecto_comunitario')).toBe(
      'Actividades del proyecto',
    );
    expect(getMensajeSinActividades('proyecto_comunitario')).toMatch(/arrastra/i);
  });

  it('muestra fases guía para centro de interés', () => {
    const { secciones } = buildModalidadDisplay('centros_interes', {
      tema: 'Colorín colorante',
      preguntas_det: ['¿Qué colores encontraste?'],
    });
    expect(secciones.some((s) => s.label === 'Tema del centro')).toBe(true);
    expect(secciones.some((s) => s.label === 'Contacto con la realidad')).toBe(true);
  });

  it('mapea taller crítico desde metadata del wizard', () => {
    const { secciones } = buildModalidadDisplay('taller_critico', {
      reflexion_inicial: 'Preguntas detonadoras sobre narración',
      produccion: 'Taller de expresión corporal',
      socializacion: 'Asamblea final',
    });
    expect(secciones.find((s) => s.key === 'reflexion_inicial')?.contenido).toContain(
      'Preguntas',
    );
  });

  it('expone calendario semanal de unidad didáctica', () => {
    const { calendario } = buildModalidadDisplay('unidad_didactica', {
      sesiones_semana: { lunes: 'Honores', viernes: 'Evaluación' },
    });
    expect(calendario).toEqual([
      { dia: 'Lunes', titulo: 'Honores' },
      { dia: 'Viernes', titulo: 'Evaluación' },
    ]);
  });
});
