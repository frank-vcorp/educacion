import { describe, it, expect } from 'vitest';
import { buildPlaneacionHtml, type PlaneacionPdfData } from '@/lib/pdf/generate';

const base: PlaneacionPdfData = {
  id: 'cal-1',
  nombre: 'Colorín colorante',
  periodo_inicio: '2025-02-10', // lunes
  periodo_fin: '2025-02-21',
  problema_contexto: 'x',
  campos_formativos: [],
  ejes_articuladores: [],
  pdas: [],
  ajustes_razonables: null,
  cct: '22DJN0059R',
  sesiones: [
    { numero: 1, etiqueta: 'Lunes 10 de Febrero — Contacto con la realidad', bloques: [{ contenido: 'Honores a la bandera.', momento: 'inicio', resumen: 'Honores' }] },
    { numero: 2, etiqueta: 'Martes — Conteo', bloques: [{ contenido: 'Actividades de conteo y clasificación por color. Clase de educación física.', momento: 'desarrollo' }] },
    { numero: 3, etiqueta: 'Sesión 3', fecha: '2025-02-17', bloques: [] },
  ],
};

describe('Calendario semanal lunes–viernes con links a la especificación', () => {
  const html = buildPlaneacionHtml(base);

  it('renderiza la malla con columnas Lunes a Viernes', () => {
    expect(html).toContain('Calendario semanal de actividades');
    for (const d of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']) {
      expect(html).toContain(`<th>${d}</th>`);
    }
    expect(html).toContain('10 Feb');
    expect(html).toContain('21 Feb');
  });

  it('cada sesión del calendario enlaza a su ancla de especificación', () => {
    expect(html).toContain('href="#sesion-1"');
    expect(html).toContain('id="sesion-1"');
    expect(html).toContain('href="#sesion-3"');
    expect(html).toContain('id="sesion-3"');
    expect(html).toContain('href="#calendario"');
  });

  it('usa resumen explícito o deriva la viñeta de la primera frase', () => {
    expect(html).toContain('>Honores</li>');
    expect(html).toContain('Actividades de conteo y clasificación');
  });

  it('calcula fechas por día hábil y respeta fecha explícita', () => {
    expect(html).toContain('<div class="cal-fecha">11 Feb</div>');
    expect(html).toContain('Lunes 17 de febrero de 2025');
  });
});
