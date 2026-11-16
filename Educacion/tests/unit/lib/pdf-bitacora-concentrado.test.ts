import { describe, it, expect } from 'vitest';
import {
  buildPlaneacionHtml,
  type PlaneacionPdfData,
} from '@/lib/pdf/generate';

describe('PDF con Bitácora y Concentrado de Alumnos', () => {
  const basePlaneacion: PlaneacionPdfData = {
    id: '12345678-1234-1234-1234-123456789abc',
    nombre: 'Exploradores de la naturaleza',
    periodo_inicio: '2026-10-01',
    periodo_fin: '2026-10-15',
    problema_contexto: 'Reconocimiento del entorno natural y cuidado del medio ambiente.',
    campos_formativos: ['ETICA_NATURALEZA_Y_SOCIEDADES'],
    ejes_articuladores: ['PENSAMIENTO_CRITICO'],
    pdas: ['PDA-ENS-01'],
    ajustes_razonables: 'Material concreto para alumnos con dificultades motoras.',
    cct: '09DPR1234Z',
  };

  it('renderiza la sección de bitácora y reflexiones post-clase cuando hay registros', () => {
    const dataConBitacora: PlaneacionPdfData = {
      ...basePlaneacion,
      bitacoras: [
        {
          fecha: '2026-10-02',
          sesion_numero: 1,
          participacion_grupo: 5,
          dificultades: 'Gran entusiasmo en la recolección de hojas secas.',
        },
        {
          fecha: '2026-10-03',
          sesion_numero: 2,
          participacion_grupo: 4,
          dificultades: 'Se requirió apoyo en el uso de lupas.',
        },
      ],
    };

    const html = buildPlaneacionHtml(dataConBitacora);
    expect(html).toContain('Bitácora y reflexiones post-clase');
    expect(html).toContain('2026-10-02 (Sesión 1)');
    expect(html).toContain('Excelente');
    expect(html).toContain('Gran entusiasmo en la recolección de hojas secas.');
    expect(html).toContain('2026-10-03 (Sesión 2)');
    expect(html).toContain('Se requirió apoyo en el uso de lupas.');
  });

  it('renderiza la tabla del concentrado de alumnos con semáforo y observaciones', () => {
    const dataConAlumnos: PlaneacionPdfData = {
      ...basePlaneacion,
      alumnos_evaluaciones: [
        {
          alumno_nombre: 'Sofía Morales',
          nivel: 1,
          observaciones: 'Identifica con claridad los seres vivos.',
        },
        {
          alumno_nombre: 'Mateo Hernández',
          nivel: 2,
          observaciones: 'Requiere guía para clasificar hojas por tamaño.',
        },
      ],
    };

    const html = buildPlaneacionHtml(dataConAlumnos);
    expect(html).toContain('Concentrado de valoración formativa por alumno');
    expect(html).toContain('Sofía Morales');
    expect(html).toContain('🟢 Logrado sin apoyo');
    expect(html).toContain('Identifica con claridad los seres vivos.');
    expect(html).toContain('Mateo Hernández');
    expect(html).toContain('🟡 Con apoyo');
    expect(html).toContain('Requiere guía para clasificar hojas por tamaño.');
  });

  it('incluye la cuadrícula de firmas oficiales de la docente y dirección escolar', () => {
    const html = buildPlaneacionHtml(basePlaneacion);
    expect(html).toContain('Docente de Grupo');
    expect(html).toContain('Educadora Titular');
    expect(html).toContain('Vo. Bo. Dirección Escolar');
    expect(html).toContain('Directora / Directora del Plantel');
  });
});
