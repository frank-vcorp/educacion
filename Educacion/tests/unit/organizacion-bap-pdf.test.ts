import { describe, expect, it } from 'vitest';
import { formatearRutinaConDias } from '@/lib/planeaciones/organizacion-bap';
import { buildPlaneacionHtml, type PlaneacionPdfData } from '@/lib/pdf/generate';

describe('organizacion-bap y PDF Bloque B', () => {
  it('formatea rutinas con días seleccionados y omite días cuando es L-V completo', () => {
    expect(
      formatearRutinaConDias({
        id: 'musica',
        titulo: 'Clase de música',
        categoria: 'especial',
        diasSemana: [1, 3],
      }),
    ).toBe('Clase de música (Lun, Mié)');

    expect(
      formatearRutinaConDias({
        id: 'aseo',
        titulo: 'Aseo',
        categoria: 'rutinaria',
        diasSemana: [1, 2, 3, 4, 5],
      }),
    ).toBe('Aseo');
  });

  it('renderiza en HTML del PDF formas de trabajo, espacios, BAP por alumno, calendario SEP y ¿Qué se observará?', () => {
    const data: PlaneacionPdfData = {
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Centro de interés: Colorín colorante',
      periodo_inicio: '2026-02-23',
      periodo_fin: '2026-02-27',
      problema_contexto: 'Explorar pigmentos naturales',
      campos_formativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
      ejes_articuladores: ['PENSAMIENTO_CRITICO'],
      pdas: [],
      ajustes_razonables: 'Consignas claras y apoyos visuales.',
      cct: '15DJN0001A',
      formas_trabajo: ['En grupo', 'En equipos'],
      espacios: ['Salón de clases', 'Patio cívico / escolar'],
      bap_por_alumno: [
        {
          alumnoNombre: 'Kassandra Yamileth',
          barrera: 'Lenguaje',
          estrategia: 'Sentar con pares de lenguaje fluido y motivar expresión oral.',
        },
      ],
      eventos_por_fecha: {
        '2026-02-23': { tareaCasa: 'Traer una flor o verdura de color intenso.' },
      },
      sesiones: [
        {
          numero: 1,
          etiqueta: 'Lunes 23 de Febrero',
          fecha: '2026-02-23',
          bloques: [
            {
              contenido: 'Contacto con jamaica y betabel.',
              observacion: 'Participación y escucha activa.',
            },
          ],
        },
        {
          numero: 2,
          etiqueta: 'Martes 24 de Febrero',
          fecha: '2026-02-24',
          bloques: [],
        },
        {
          numero: 5,
          etiqueta: 'Viernes 27 de Febrero',
          fecha: '2026-02-27',
          bloques: [],
        },
      ],
    };

    const html = buildPlaneacionHtml(data);
    expect(html).toContain('Organización del grupo y espacios');
    expect(html).toContain('En grupo, En equipos');
    expect(html).toContain('Salón de clases, Patio cívico / escolar');
    expect(html).toContain('Kassandra Yamileth');
    expect(html).toContain('Sentar con pares de lenguaje fluido');
    expect(html).toContain('Honores a la bandera');
    expect(html).toContain('Día de la Bandera Mexicana');
    expect(html).toContain('Consejo Técnico Escolar (CTE)');
    expect(html).toContain('TAREA: Traer una flor o verdura de color intenso.');
    expect(html).toContain('¿Qué se observará?:');
  });
});
