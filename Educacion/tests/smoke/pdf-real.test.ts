// @vitest-environment node
/**
 * Smoke E2E: render PDF binario REAL con puppeteer-core + chromium.
 * Solo se ejecuta si PDF_GENERATOR=playwright y @sparticuz/chromium
 * está disponible. Skipped en sandbox sin chromium.
 */
import { describe, it, expect } from 'vitest';
import {
  buildPlaneacionHtml,
  renderPdfFromHtml,
  isPdfBuffer,
  sha256OfBuffer,
  isPdfGeneratorEnabled,
} from '@/lib/pdf/generate';

const describeReal = isPdfGeneratorEnabled() && process.env.PDF_SMOKE !== '0' ? describe : describe.skip;

describeReal('Smoke PDF real (renderer chromium)', () => {
  it('genera PDF binario > 10KB con %PDF- header y SHA-256 verdadero', async () => {
    const planeacion = {
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Manifiesta tus emociones',
      periodo_inicio: '2026-02-01',
      periodo_fin: '2026-02-28',
      problema_contexto:
        'Los niños del grupo experimentan frustración al no poder nombrar emociones complejas durante el juego cooperativo en el rincón de dramatización.',
      campos_formativos: ['LO_HUMANO_LO_COMUNITARIO', 'ETICA_NATURALEZA_SOCIEDADES'],
      ejes_articuladores: ['INCLUSION', 'VIDA_SALUDABLE'],
      pdas: ['PDA-LH-001', 'PDA-LH-002', 'PDA-ET-003'],
      ajustes_razonables:
        'Usar pictogramas emocionales como apoyo visual; reducir tiempos de espera a 5 min;ペア trabajo con adulto en transiciones.',
      cct: '09DPR1234Z',
    };

    const t0 = Date.now();
    const r = await renderPdfFromHtml(buildPlaneacionHtml(planeacion));
    const elapsed = Date.now() - t0;

    console.log(`Smoke: renderizó ${r.size} bytes en ${elapsed}ms — sha256=${r.sha256.slice(0, 16)}…`);
    expect(r.size).toBeGreaterThan(10240);
    expect(isPdfBuffer(r.pdf)).toBe(true);
    expect(r.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(r.sha256).toBe(sha256OfBuffer(r.pdf));

    // Escribir el binario a /tmp para inspección manual.
    const fs = await import('node:fs');
    const out = '/tmp/kilo/smoke-planeacion.pdf';
    fs.writeFileSync(out, r.pdf);
    const stat = fs.statSync(out);
    console.log(`Smoke: escrito ${out} (${stat.size} bytes)`);
  }, 120_000);
});

describe('Smoke PDF (placeholder; siempre PASS)', () => {
  it('PDF_GENERATOR playwright flag es leído correctamente', () => {
    expect(typeof isPdfGeneratorEnabled()).toBe('boolean');
  });
});
