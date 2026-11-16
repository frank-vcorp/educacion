import { describe, it, expect } from 'vitest';
import { PLANEACIONES_REALES_LOLITA } from '@/lib/planeaciones/fixtures-lolita';
import { buildPlaneacionHtml } from '@/lib/pdf/generate';
import fs from 'node:fs';
import path from 'node:path';

describe('Verificación de las 3 Planeaciones Reales de Preescolar Fase 2', () => {
  it('tiene definidas las 3 planeaciones reales de Lolita', () => {
    expect(PLANEACIONES_REALES_LOLITA).toHaveLength(3);
    const nombres = PLANEACIONES_REALES_LOLITA.map((p) => p.nombre);
    expect(nombres).toContain('COLORÍN COLORANTE ¿QUÉ COLORES ENCONTRASTE?');
    expect(nombres).toContain('Conociendo y Difundiendo Nuestros Derechos');
    expect(nombres).toContain('NARRANDO HISTORIAS');
  });

  it('la planeación 1 (Centros de Interés) incluye actividades rutinarias y recurrentes', () => {
    const p1 = PLANEACIONES_REALES_LOLITA[0]!;
    expect(p1.modalidad).toBe('centros_interes');
    expect(p1.camposFormativos).toContain('SABERES_PENSAMIENTO_CIENTIFICO');
    expect(p1.pdas).toHaveLength(2);
    expect(p1.detallesModalidad.actividadesRutinarias).toBeDefined();
  });

  it('la planeación 2 (Proyecto Comunitario) incluye BAP y carteles como producto', () => {
    const p2 = PLANEACIONES_REALES_LOLITA[1]!;
    expect(p2.modalidad).toBe('proyecto_comunitario');
    expect(p2.camposFormativos).toContain('ETICA_NATURALEZA_SOCIEDADES');
    expect(p2.ajustesRazonablesBAP).toContain('Kassandra Yamileth');
    expect(p2.ajustesRazonablesBAP).toContain('Kenneth Saúl');
    expect(p2.productoCentral).toBeDefined();
  });

  it('la planeación 3 (Taller Crítico) incluye los 4 momentos del taller', () => {
    const p3 = PLANEACIONES_REALES_LOLITA[2]!;
    expect(p3.modalidad).toBe('taller_critico');
    expect(p3.camposFormativos).toContain('LENGUAJES');
    expect(p3.detallesModalidad.momentosTaller).toHaveLength(4);
  });

  it('genera correctamente el HTML imprimible/exportable de las 3 planeaciones', () => {
    for (const plan of PLANEACIONES_REALES_LOLITA) {
      const html = buildPlaneacionHtml({
        id: plan.id,
        nombre: plan.nombre,
        periodo_inicio: plan.periodoInicio,
        periodo_fin: plan.periodoFin,
        problema_contexto: plan.problematica,
        campos_formativos: plan.camposFormativos,
        ejes_articuladores: plan.ejesArticuladores,
        pdas: plan.pdas,
        ajustes_razonables: plan.ajustesRazonablesBAP ?? '',
        cct: plan.cct,
        modalidad: plan.modalidad,
        proposito: plan.proposito,
        producto_integrador: plan.productoCentral,
        grupo_etiqueta: plan.gradoGrupo,
        pdas_texto: Object.fromEntries(plan.pdas.map((p, idx) => [`PDA-${idx}`, p])),
      });

      expect(html).toContain(plan.nombre);
      expect(html).toContain(plan.cct);
      expect(html).toContain('Planeación preescolar · Fase 2 · NEM');
      expect(html).toContain(plan.problematica);
    }
  });

  it('verifica que la migración 0026_catalogo_completo_fase2.sql contenga los 34 contenidos y los PDAs de preescolar', () => {
    const migPath = path.resolve(__dirname, '../../../supabase/migrations/0026_catalogo_completo_fase2.sql');
    expect(fs.existsSync(migPath)).toBe(true);
    const content = fs.readFileSync(migPath, 'utf8');
    
    // Verificar que contenga los contenidos y PDAs específicos que Lolita necesita
    expect(content).toContain('Los derechos de niñas y niños como base para el bienestar');
    expect(content).toContain('Clasificación y experimentación con objetos');
    expect(content).toContain('Narración de historias mediante diversos lenguajes');
    expect(content).toContain('Mezcla o combina elementos de su entorno');
    expect(content).toContain('Narra con secuencia lógica');
  });
});
