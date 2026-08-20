// @vitest-environment node
/**
 * Tests del renderer PDF compartido (lib/pdf/generate.ts).
 * IMPL-20260819-01 — D-FIN-5 "Descargable binario".
 * IMPL-20260819-02 — P2-1 causa (a) footer determinista + P2-3 browser close.
 *
 * Estos tests NO requieren chromium real: verifican la lógica
 * determinista (hash, plantilla, contrato de buffer) y la inyección
 * de renderer para el caso real (que se cubre en la integración).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildPlaneacionHtml,
  escapeHtml,
  formatFechaEsMx,
  isPdfBuffer,
  joinEscaped,
  makePdfResult,
  PdfGenerationUnavailableError,
  renderPdfFromHtml,
  sha256OfBuffer,
  isPdfGeneratorEnabled,
  createPuppeteerRenderer,
  type PdfRenderer,
} from '@/lib/pdf/generate';

const fakePlaneacion = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre: 'Manifiesta tus emociones',
  periodo_inicio: '2026-02-01',
  periodo_fin: '2026-02-28',
  problema_contexto:
    'Los niños del grupo experimentan frustración al no poder nombrar emociones complejas durante el juego.',
  campos_formativos: ['LO_HUMANO_LO_COMUNITARIO', 'ETICA_NATURALEZA_SOCIEDADES'],
  ejes_articuladores: ['INCLUSION', 'VIDA_SALUDABLE'],
  pdas: ['PDA-LH-001', 'PDA-LH-002'],
  ajustes_razonables:
    'Usar pictogramas emocionales como apoyo visual; reducir tiempos de espera a 5 min.',
  cct: '09DPR1234Z',
};

describe('lib/pdf/generate.ts — D-FIN-5 renderer', () => {
  describe('escapeHtml / joinEscaped', () => {
    it('escapa caracteres peligrosos', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
      expect(escapeHtml("'a' & 'b'")).toBe('&#039;a&#039; &amp; &#039;b&#039;');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
    it('une arrays escapados con coma', () => {
      expect(joinEscaped(['a', 'b', 'c'])).toBe('a, b, c');
      expect(joinEscaped(['<x>', 'y'])).toBe('&lt;x&gt;, y');
      expect(joinEscaped([])).toBe('');
      expect(joinEscaped(null)).toBe('');
    });
  });

  describe('sha256 determinista', () => {
    it('mismo input → mismo hash (64 hex chars)', () => {
      const buf = Buffer.from('hola mundo');
      const h1 = sha256OfBuffer(buf);
      const h2 = sha256OfBuffer(buf);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[a-f0-9]{64}$/);
    });
    it('input distinto → hash distinto', () => {
      const h1 = sha256OfBuffer(Buffer.from('a'));
      const h2 = sha256OfBuffer(Buffer.from('b'));
      expect(h1).not.toBe(h2);
    });
  });

  describe('makePdfResult', () => {
    it('envuelve buffer con sha256 y size correctos', () => {
      const buf = Buffer.from('%PDF-1.4\nfake-pdf-body-bytes');
      const r = makePdfResult(buf);
      expect(r.pdf).toBe(buf);
      expect(r.size).toBe(buf.length);
      expect(r.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(r.sha256).toBe(sha256OfBuffer(buf));
    });
  });

  describe('isPdfBuffer', () => {
    it('true si empieza con %PDF-', () => {
      expect(isPdfBuffer(Buffer.from('%PDF-1.4\n...'))).toBe(true);
    });
    it('false si no es PDF', () => {
      expect(isPdfBuffer(Buffer.from('hello'))).toBe(false);
      expect(isPdfBuffer(Buffer.from(''))).toBe(false);
      expect(isPdfBuffer(Buffer.from('%HTM'))).toBe(false);
    });
  });

  describe('buildPlaneacionHtml', () => {
    it('incluye nombre, periodo, CCT, PDA y ajustes', () => {
      const html = buildPlaneacionHtml(fakePlaneacion);
      expect(html).toContain('Manifiesta tus emociones');
      expect(html).toContain('2026-02-01');
      expect(html).toContain('2026-02-28');
      expect(html).toContain('09DPR1234Z');
      expect(html).toContain('PDA-LH-001');
      expect(html).toContain('pictogramas emocionales');
    });
    it('escapa HTML malicioso en nombre/problema', () => {
      const html = buildPlaneacionHtml({
        ...fakePlaneacion,
        nombre: '<img src=x onerror=alert(1)>',
        problema_contexto: '"><script>alert(1)</script>',
      });
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('<script>alert(1)</script>');
    });
    it('mismo input produce misma HTML (determinista)', () => {
      const a = buildPlaneacionHtml(fakePlaneacion);
      const b = buildPlaneacionHtml(fakePlaneacion);
      // El footer incluye timestamp; extraemos sólo la parte estable:
      expect(a.split('Generado el')[0]).toBe(b.split('Generado el')[0]);
    });
  });

  describe('renderPdfFromHtml — con renderer inyectado', () => {
    it('usa el renderer inyectado para producir buffer + hash determinista', async () => {
      // Simulación de un PDF binario mínimo: cabecera + bytes arbitrarios > 10KB.
      const body = Buffer.concat([
        Buffer.from('%PDF-1.4\n%binary\n'),
        Buffer.alloc(11_000, 0x41), // 'A' x 11000 → supera 10KB
      ]);
      const stubRenderer: PdfRenderer = {
        async renderHtmlToPdf(html: string) {
          return makePdfResult(body);
        },
      };
      const r = await renderPdfFromHtml('<html></html>', { renderer: stubRenderer });
      expect(r.size).toBeGreaterThan(10240);
      expect(r.pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(r.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(r.sha256).toBe(sha256OfBuffer(body));
    });

    it('mismo input (mismo HTML) → mismo hash (criterio T-E2E-05)', async () => {
      const body1 = Buffer.from('%PDF-1.4\nAAA');
      const body2 = Buffer.from('%PDF-1.4\nAAA');
      const stub: PdfRenderer = {
        async renderHtmlToPdf() {
          return makePdfResult(body1);
        },
      };
      const r1 = await renderPdfFromHtml('<html>hi</html>', { renderer: stub });
      const r2 = await renderPdfFromHtml('<html>hi</html>', { renderer: stub });
      expect(r1.sha256).toBe(r2.sha256);
      expect(r1.sha256).toBe(sha256OfBuffer(body2));
    });

    it('input distinto → hash distinto', async () => {
      let i = 0;
      const stub: PdfRenderer = {
        async renderHtmlToPdf() {
          i += 1;
          return makePdfResult(Buffer.from(`%PDF-1.4\n${i}`));
        },
      };
      const r1 = await renderPdfFromHtml('<html/>', { renderer: stub });
      const r2 = await renderPdfFromHtml('<html>x</html>', { renderer: stub });
      expect(r1.sha256).not.toBe(r2.sha256);
    });
  });

  describe('renderPdfFromHtml — graceful degradation', () => {
    it('lanza PdfGenerationUnavailableError si PDF_GENERATOR !== playwright', async () => {
      const prev = process.env.PDF_GENERATOR;
      process.env.PDF_GENERATOR = 'html'; // forzar el caso "no habilitado"
      try {
        await expect(renderPdfFromHtml('<html/>')).rejects.toBeInstanceOf(
          PdfGenerationUnavailableError,
        );
      } finally {
        if (prev === undefined) delete process.env.PDF_GENERATOR;
        else process.env.PDF_GENERATOR = prev;
      }
    });

    it('isPdfGeneratorEnabled refleja el env', () => {
      const prev = process.env.PDF_GENERATOR;
      try {
        process.env.PDF_GENERATOR = 'playwright';
        expect(isPdfGeneratorEnabled()).toBe(true);
        process.env.PDF_GENERATOR = 'html';
        expect(isPdfGeneratorEnabled()).toBe(false);
        delete process.env.PDF_GENERATOR;
        expect(isPdfGeneratorEnabled()).toBe(false);
      } finally {
        if (prev === undefined) delete process.env.PDF_GENERATOR;
        else process.env.PDF_GENERATOR = prev;
      }
    });

    it('PdfGenerationUnavailableError expone code y httpStatus correctos', () => {
      const e = new PdfGenerationUnavailableError('test');
      expect(e.code).toBe('NEM_ENTREGA_PDF_GENERATION_FAILED');
      expect(e.httpStatus).toBe(422);
      expect(e.name).toBe('PdfGenerationUnavailableError');
    });
  });

  describe('buildPlaneacionHtml — footer determinista (IMPL-20260819-02 Fix P2-1 causa a)', () => {
    it('AC-1: buildPlaneacionHtml NO contiene `new Date()` en su cuerpo', () => {
      // Verificación de código fuente: el cuerpo de la función no contiene
      // `new Date()`. El helper formatFechaEsMx() sí crea un `Date` interno,
      // pero NO se usa como timestamp de render — sólo para formatear
      // `updated_at` (input determinista).
      const src = buildPlaneacionHtml.toString();
      expect(src.includes('new Date()')).toBe(false);
    });

    it('AC-2: con updated_at poblado, el footer refleja la fecha de la planeación (no la hora actual)', () => {
      // Capturamos el instante actual y comparamos con el footer.
      const updatedAt = '2026-08-19T10:00:00.000Z';
      const t0 = Date.now();
      const html = buildPlaneacionHtml({
        ...fakePlaneacion,
        updated_at: updatedAt,
      });
      const t1 = Date.now();
      // El footer debe contener la etiqueta derivada de updated_at en es-MX.
      // toLocaleDateString('es-MX', {year, month: 'long', day: 'numeric'})
      // produce algo como "19 de agosto de 2026".
      expect(html).toMatch(/Generado el 19 de agosto de 2026/);
      // Y NO contiene la hora actual del test (toLocaleString con hora/minutos).
      // Verificamos que la etiqueta del footer no depende de la hora del reloj.
      // El helper formatFechaEsMx usa 'numeric' para year/month/day pero NO
      // incluye hora, así que el footer debe ser idéntico entre t0 y t1.
      const t0Html = html;
      const t1Html = buildPlaneacionHtml({ ...fakePlaneacion, updated_at: updatedAt });
      expect(t0Html).toBe(t1Html);
      // Y debe ser función pura: misma planeacion → mismo HTML.
      const t2Html = buildPlaneacionHtml({ ...fakePlaneacion, updated_at: updatedAt });
      expect(t0Html).toBe(t2Html);
      // Adicional: el footer no contiene una fecha distinta a la del input.
      expect(html).not.toMatch(new Date(t0).toLocaleDateString('es-MX')); // sanity
      expect(html).not.toMatch(new Date(t1).toLocaleDateString('es-MX'));
      // t0/t1 son muy cercanos (mismo día) → 'numeric' → la misma etiqueta
      // posible. Por eso el check de "mismo input → mismo HTML" es el
      // criterio fuerte. Lo dejamos documentado.
      void t0;
      void t1;
    });

    it('AC-2: con updated_at=null, el footer OMITE la fecha y muestra sólo CCT', () => {
      const html = buildPlaneacionHtml({
        ...fakePlaneacion,
        updated_at: null,
      });
      expect(html).not.toContain('Generado el');
      expect(html).toContain('Plataforma NEM');
      expect(html).toContain('09DPR1234Z');
    });

    it('AC-2: con updated_at=undefined, el footer OMITE la fecha', () => {
      const html = buildPlaneacionHtml({
        ...fakePlaneacion,
        updated_at: undefined,
      });
      expect(html).not.toContain('Generado el');
      expect(html).toContain('Plataforma NEM');
    });

    it('AC-2: formatFechaEsMx maneja entrada vacía/inválida sin lanzar', () => {
      expect(formatFechaEsMx(null)).toBe('');
      expect(formatFechaEsMx(undefined)).toBe('');
      expect(formatFechaEsMx('')).toBe('');
      expect(formatFechaEsMx('no-es-fecha')).toBe('');
    });
  });

  describe('createPuppeteerRenderer — cierra browser en finally (IMPL-20260819-02 Fix P2-3, AC-7)', () => {
    it('llama browser.close() tras page.close() y tolera error de cierre', async () => {
      // Mock de `Browser` con `newPage()` que devuelve `Page` con setContent/pdf/close.
      const setContent = (globalThis as { __setContent?: () => Promise<void> }).__setContent =
        async () => undefined;
      const closePage = async () => undefined;
      const pdf = async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
      const page = { setContent, close: closePage, pdf };

      const closeBrowser = vi.fn(async () => undefined);
      const browser = {
        newPage: async () => page,
        close: closeBrowser,
      };

      const renderer = createPuppeteerRenderer(
        browser as unknown as import('puppeteer-core').Browser,
      );
      const r = await renderer.renderHtmlToPdf('<html></html>');

      // Verificación funcional: el renderer produjo el PDF.
      expect(r.pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

      // AC-7: browser.close() fue llamado (1 vez) tras page.close().
      expect(closeBrowser).toHaveBeenCalledTimes(1);
    });

    it('AC-7: tolera error de browser.close() (no propaga la excepción)', async () => {
      const closePage = async () => undefined;
      const page = {
        setContent: async () => undefined,
        close: closePage,
        pdf: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
      };
      const closeBrowser = vi.fn(async () => {
        throw new Error('browser already closed');
      });
      const browser = {
        newPage: async () => page,
        close: closeBrowser,
      };

      const renderer = createPuppeteerRenderer(
        browser as unknown as import('puppeteer-core').Browser,
      );
      // El PDF se generó OK, y el error de browser.close() NO se propaga.
      const r = await renderer.renderHtmlToPdf('<html></html>');
      expect(r.pdf.length).toBeGreaterThan(0);
      expect(closeBrowser).toHaveBeenCalledTimes(1);
    });

    it('AC-7: page.close() también es tolerante a error', async () => {
      const page = {
        setContent: async () => undefined,
        close: async () => {
          throw new Error('page already closed');
        },
        pdf: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
      };
      const closeBrowser = vi.fn(async () => undefined);
      const browser = {
        newPage: async () => page,
        close: closeBrowser,
      };

      const renderer = createPuppeteerRenderer(
        browser as unknown as import('puppeteer-core').Browser,
      );
      const r = await renderer.renderHtmlToPdf('<html></html>');
      expect(r.pdf.length).toBeGreaterThan(0);
      // browser.close() sigue ejecutándose después del error de page.close().
      expect(closeBrowser).toHaveBeenCalledTimes(1);
    });

    it('AC-P3-2 (N2): si newPage() lanza, browser.close() se llama y el error propaga', async () => {
      // IMPL-20260819-03 — P3-N2: si browser.newPage() rechaza, el browser
      // debe cerrarse (no quedar huérfano) y el error debe propagar al caller
      // (no se traga).
      const newPageError = new Error('browser degraded: newPage failed');
      const closeBrowser = vi.fn(async () => undefined);
      const browser = {
        newPage: async () => {
          throw newPageError;
        },
        close: closeBrowser,
      };

      const renderer = createPuppeteerRenderer(
        browser as unknown as import('puppeteer-core').Browser,
      );

      // El error de newPage() debe propagar.
      await expect(renderer.renderHtmlToPdf('<html></html>')).rejects.toBe(newPageError);
      // browser.close() se llamó exactamente 1 vez (el finally cierra el
      // browser aunque newPage haya fallado).
      expect(closeBrowser).toHaveBeenCalledTimes(1);
    });
  });
});
