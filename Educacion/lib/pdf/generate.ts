/**
 * Renderer HTML→PDF compartido.
 *
 * SPEC_TEC_03 §6.30 (D-FIN-5 "Descargable") + IMPL-20260819-01 + IMPL-20260819-02.
 *
 * Cierre de FND-20260818-04: este módulo devuelve un PDF binario real con
 * SHA-256 verdadero, consumido tanto por:
 *   - `app/api/planeaciones/[id]/generar-pdf/route.ts` (descarga directa)
 *   - `services/entregas/entrega-actions.ts` (flujo entregar-director §6.7)
 *
 * Diseño inyectable para que las pruebas unitarias/intergración no necesiten
 * levantar chromium real (ver `RenderPdfOptions.renderer`).
 *
 * IMPL-20260819-02 (Fix P2-1 causa a): el footer del HTML usa una fecha
 * determinista derivada de `planeacion.updated_at` (no `new Date()`), para
 * que dos renders consecutivos de la misma planeación produzcan el mismo
 * HTML y, por construcción, entre en la misma órbita de estabilidad del
 * hash SHA-256. La causa (b) — `/CreationDate`/`/ModDate` embebidos por
 * Chromium — queda residual y se cierra en `ARCH-20260819-02` (Storage).
 *
 * IMPL-20260819-02 (Fix P2-3): `createPuppeteerRenderer` cierra el `browser`
 * en el `finally` para evitar procesos chromium huérfanos fuera de serverless.
 */
import { createHash } from 'node:crypto';

/** Resultado de un renderizado PDF determinista. */
export interface PdfRenderResult {
  pdf: Buffer;
  /** Hex SHA-256 (64 chars) del binario `pdf`. */
  sha256: string;
  /** Tamaño del binario en bytes. */
  size: number;
}

/** Interfaz de un renderer — desacopla el módulo del transport real (puppeteer/playwright). */
export interface PdfRenderer {
  renderHtmlToPdf(html: string): Promise<PdfRenderResult>;
}

/** Error tipado cuando el render no puede iniciar (env o chromium ausente). */
export class PdfGenerationUnavailableError extends Error {
  readonly code = 'NEM_ENTREGA_PDF_GENERATION_FAILED';
  readonly httpStatus = 422;
  constructor(message: string) {
    super(message);
    this.name = 'PdfGenerationUnavailableError';
  }
}

/** Datos mínimos de la planeación para alimentar la plantilla HTML. */
export interface PlaneacionPdfData {
  id: string;
  nombre: string;
  periodo_inicio: string;
  periodo_fin: string;
  problema_contexto: string;
  campos_formativos: string[] | null;
  ejes_articuladores: string[] | null;
  pdas: string[] | null;
  ajustes_razonables: string | null;
  cct: string;
  /**
   * Timestamp ISO de la última edición de la planeación. Usado por
   * `buildPlaneacionHtml` para renderizar una fecha determinista en el
   * footer (IMPL-20260819-02 Fix P2-1 causa a), de modo que dos renders
   * consecutivos de la misma planeación produzcan el mismo HTML.
   * Si es `null`/`undefined`, el footer omite la fecha y muestra sólo
   * `Plataforma NEM · CCT <cct>` (no se usa `new Date()` bajo ninguna circunstancia).
   */
  updated_at?: string | null;
}

/**
 * Hash determinista (SHA-256) sobre bytes arbitrarios.
 * Hex en minúsculas, 64 chars. Idempotente: mismo input → mismo output.
 */
export function sha256OfBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Calcula `PdfRenderResult` a partir de un Buffer ya generado (real o simulado).
 * Usado por los renderers reales para envolver el binario; usado por tests
 * para validar la lógica de hash estable sin invocar chromium.
 */
export function makePdfResult(buf: Buffer): PdfRenderResult {
  const sha256 = sha256OfBuffer(buf);
  return { pdf: buf, sha256, size: buf.length };
}

/** Escapa HTML para interpolación segura en la plantilla. */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Une strings escapados; útil para arrays (campos, ejes, pdas). */
export function joinEscaped(values: string[] | null | undefined, sep = ', '): string {
  if (!values || values.length === 0) return '';
  return values.map((v) => escapeHtml(v)).join(sep);
}

/**
 * Plantilla HTML canónica de la planeación (sin cambios respecto al endpoint
 * previo, para preservar contrato §3.5). Esta es la entrada del renderer PDF.
 *
 * IMPL-20260819-02 (Fix P2-1 causa a): el footer ya NO usa `new Date()`.
 * En su lugar, deriva una etiqueta de fecha determinista a partir de
 * `planeacion.updated_at` (cuando está disponible). Si no hay `updated_at`,
 * el footer omite la parte de fecha y deja sólo `Plataforma NEM · CCT <cct>`.
 * Esto garantiza que `buildPlaneacionHtml` es **función pura** respecto a su
 * input (mismo `PlaneacionPdfData` → mismo HTML).
 */
export function buildPlaneacionHtml(planeacion: PlaneacionPdfData): string {
  const campos = joinEscaped(planeacion.campos_formativos) || '—';
  const ejes = joinEscaped(planeacion.ejes_articuladores) || '—';
  const pdas = (planeacion.pdas ?? [])
    .map((pda) => `    <li>${escapeHtml(pda)}</li>`)
    .join('\n');
  const ajustes = escapeHtml(planeacion.ajustes_razonables) || '—';

  // Footer determinista (FIX P2-1 causa a):
  //  - Si `updated_at` está presente → "Generado el <fecha-formateada> · ..."
  //  - Si `updated_at` es null/undefined → sólo "Plataforma NEM · CCT <cct>"
  // NUNCA se usa `new Date()` aquí (rompería el invariante de estabilidad).
  const footerEtiquetaFecha = formatFechaEsMx(planeacion.updated_at);
  const footer = footerEtiquetaFecha
    ? `Generado el ${footerEtiquetaFecha} · Plataforma NEM · CCT ${escapeHtml(planeacion.cct)}`
    : `Plataforma NEM · CCT ${escapeHtml(planeacion.cct)}`;

  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(planeacion.nombre)} — Planeación NEM</title>
  <style>
    @page { margin: 2cm; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.4; color: #111; }
    h1 { color: #2f6e3a; border-bottom: 2px solid #2f6e3a; padding-bottom: 4px; }
    h2 { color: #444; margin-top: 24px; }
    dl { display: grid; grid-template-columns: 160px 1fr; gap: 4px 12px; }
    dt { font-weight: 600; color: #555; }
    .footer { margin-top: 32px; font-size: 10pt; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(planeacion.nombre)}</h1>
  <p><strong>Periodo:</strong> ${escapeHtml(planeacion.periodo_inicio)} → ${escapeHtml(planeacion.periodo_fin)}</p>

  <h2>Problema del contexto</h2>
  <p>${escapeHtml(planeacion.problema_contexto)}</p>

  <h2>Campos formativos</h2>
  <p>${campos}</p>

  <h2>Ejes articuladores</h2>
  <p>${ejes}</p>

  <h2>PDA trabajados</h2>
  <ul>
${pdas || '    <li>—</li>'}
  </ul>

  <h2>Ajustes razonables</h2>
  <p>${ajustes}</p>

  <div class="footer">
    ${footer}
  </div>
</body>
</html>`;
}

/**
 * Formatea una fecha ISO a una etiqueta legible en es-MX para el footer.
 *  - Si `iso` es `null`/`undefined`/string vacío → devuelve `''`.
 *  - Si la fecha es inválida → devuelve `''` (no lanza).
 *  - Si es válida → devuelve formato es-MX largo (ej. "19 de agosto de 2026").
 *
 * Función pura: no usa `new Date()` implícito, depende sólo del input.
 * Aislada para que se pueda testear de forma unitaria sin arrastrar el resto
 * de la plantilla.
 */
export function formatFechaEsMx(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Resuelve si el binario parece PDF válido (cabecera `%PDF-`).
 * No hace un parse completo: sólo valida el magic header por contrato.
 */
export function isPdfBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 5) return false;
  return buf.subarray(0, 5).toString('ascii') === '%PDF-';
}

export interface RenderPdfOptions {
  /**
   * Renderer inyectado. Si se omite, se usa `getDefaultRenderer()`
   * (puppeteer-core + @sparticuz/chromium).
   */
  renderer?: PdfRenderer;
}

/**
 * Punto de entrada único: HTML → PDF binario + hash verdadero.
 *
 * Lanza `PdfGenerationUnavailableError` (con `httpStatus=422`, `code='NEM_ENTREGA_PDF_GENERATION_FAILED'`)
 * si el entorno no tiene el renderer disponible y no se inyectó uno.
 */
export async function renderPdfFromHtml(
  html: string,
  options: RenderPdfOptions = {},
): Promise<PdfRenderResult> {
  return renderWithResolved(html, options);
}

/* ────────────────────────────────────────────────────────────────────── *
 * Testing hooks (sólo usados por tests; no deben usarse en producción).   *
 * Permiten forzar un renderer sin levantar chromium real cuando el       *
 * entorno de CI/sandbox no dispone del binario. Diseñados para no tener  *
 * ningún efecto en producción (sin env var ni side-effects globales).    *
 * ────────────────────────────────────────────────────────────────────── */

let __testingRendererOverride: PdfRenderer | null = null;

/** Tests: instala un renderer global que sustituye al default. */
export function __setTestingRenderer(renderer: PdfRenderer | null): void {
  __testingRendererOverride = renderer;
}

/**
 * Resuelve el renderer respetando:
 *   1. `options.renderer` explícito (test directo)
 *   2. Override de testing (`__setTestingRenderer`)
 *   3. Default real (puppeteer-core + @sparticuz/chromium)
 */
export async function resolveRenderer(options: RenderPdfOptions = {}): Promise<PdfRenderer> {
  return (
    options.renderer ??
    __testingRendererOverride ??
    (await getDefaultRenderer())
  );
}

/** Wrapper para uso interno: delega en `resolveRenderer`. */
async function renderWithResolved(html: string, options: RenderPdfOptions = {}): Promise<PdfRenderResult> {
  const renderer = await resolveRenderer(options);
  return renderer.renderHtmlToPdf(html);
}

/**
 * ¿Está habilitado el render binario en este entorno?
 * SPEC_TEC_03 §6.30: `PDF_GENERATOR === 'playwright'`.
 */
export function isPdfGeneratorEnabled(): boolean {
  return process.env.PDF_GENERATOR === 'playwright';
}

/** Crea un renderer real a partir de puppeteer-core + @sparticuz/chromium. */

/**
 * Renderer por defecto. Lazy-loaded para que el bundle del módulo sea ligero
 * y los tests que mockean `renderer` no paguen el costo de chromium.
 *
 * Carga perezosa: si `PDF_GENERATOR !== 'playwright'`, NO se importan las
 * dependencias (ahorra ~50MB en arranque local) y se lanza error tipado.
 */
export async function getDefaultRenderer(): Promise<PdfRenderer> {
  if (!isPdfGeneratorEnabled()) {
    throw new PdfGenerationUnavailableError(
      `PDF_GENERATOR !== 'playwright' (actual: ${process.env.PDF_GENERATOR ?? 'unset'}). ` +
        `Configura PDF_GENERATOR=playwright para habilitar el render binario.`,
    );
  }

  let chromium: { executablePath: () => Promise<string>; args: string[] };
  try {
    const chromiumMod = (await import('@sparticuz/chromium')) as unknown as {
      default: { executablePath: () => Promise<string>; args: string[] };
    };
    chromium = chromiumMod.default;
  } catch (err) {
    throw new PdfGenerationUnavailableError(
      `No se pudo cargar @sparticuz/chromium: ${(err as Error).message}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let puppeteer: typeof import('puppeteer-core');
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const pupMod = (await import('puppeteer-core')) as unknown as {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      default?: typeof import('puppeteer-core');
    };
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    puppeteer = pupMod.default ?? (pupMod as unknown as typeof import('puppeteer-core'));
  } catch (err) {
    throw new PdfGenerationUnavailableError(
      `No se pudo cargar puppeteer-core: ${(err as Error).message}`,
    );
  }

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });

  return createPuppeteerRenderer(browser);
}

/** Adapter: dado un `Browser` de puppeteer-core, produce un `PdfRenderer`. */
export function createPuppeteerRenderer(
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  browser: import('puppeteer-core').Browser,
): PdfRenderer {
  return {
    async renderHtmlToPdf(html: string): Promise<PdfRenderResult> {
      // FIX P3-N2 (IMPL-20260819-03): `newPage()` se ejecuta DENTRO del
      // `try`. Antes precedía al try; si fallaba, el browser quedaba
      // huérfano (misma clase de fuga que P2-3 cierra, pero en el path
      // de fallo). Si `newPage()` rechaza, `page` permanece `undefined`
      // → el guard `page?.close()` del finally no aplica → `browser.close()`
      // cierra el browser y el error se propaga al caller (no se traga).
      let page: Awaited<ReturnType<typeof browser.newPage>> | undefined;
      try {
        page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        const pdfUint8 = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        });
        const buf = Buffer.from(pdfUint8);
        return makePdfResult(buf);
      } finally {
        // FIX P2-3 (IMPL-20260819-02): cerrar también la `page` y el `browser`
        // para no dejar procesos chromium huérfanos en procesos long-running.
        // El `.catch(() => undefined)` evita propagar errores de cierre:
        // el PDF ya se generó (o ya falló) y el resultado ya está determinado.
        // Guard `?.` para el caso en que `newPage()` falló (FIX P3-N2).
        await page?.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
      }
    },
  };
}
