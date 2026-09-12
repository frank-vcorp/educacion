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

export interface PlaneacionPdfBloque {
  contenido: string;
  momento?: string | null;
  observacion?: string | null;
  recursos?: string | null;
}

export interface PlaneacionPdfSesion {
  numero: number;
  etiqueta: string;
  bloques: PlaneacionPdfBloque[];
}

/** Datos de la planeación para la plantilla HTML (documento corrido). */
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
  modalidad?: string;
  proposito?: string | null;
  producto_integrador?: string | null;
  grupo_etiqueta?: string | null;
  tema_centro?: string | null;
  preguntas_det?: string[];
  campos_nombres?: Record<string, string>;
  pdas_texto?: Record<string, string>;
  pda_campo_codigo?: Record<string, string>;
  ejes_nombres?: Record<string, string>;
  modalidad_label?: string;
  momento_labels?: Record<string, string>;
  rutinarias?: string[];
  recurrentes?: string[];
  sesiones?: PlaneacionPdfSesion[];
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

/** Ancho fijo del documento corrido (mm). */
export const PDF_DOC_WIDTH_MM = 210;

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
function labelMomento(
  key: string | null | undefined,
  labels: Record<string, string> | undefined,
): string {
  if (!key) return '';
  return labels?.[key] ?? key;
}

function buildPdaTableRows(planeacion: PlaneacionPdfData): string {
  const pdas = planeacion.pdas ?? [];
  if (pdas.length === 0) {
    return '<tr><td colspan="2">—</td></tr>';
  }
  return pdas
    .map((codigo) => {
      const texto = planeacion.pdas_texto?.[codigo] ?? codigo;
      const campoCodigo = planeacion.pda_campo_codigo?.[codigo];
      const campoNombre =
        (campoCodigo && planeacion.campos_nombres?.[campoCodigo]) ||
        '—';
      return `<tr>
        <td>${escapeHtml(campoNombre)}</td>
        <td>${escapeHtml(texto)}</td>
      </tr>`;
    })
    .join('\n');
}

function buildCalendarioHtml(planeacion: PlaneacionPdfData): string {
  const sesiones = planeacion.sesiones ?? [];
  if (sesiones.length === 0) return '';

  const dias = sesiones
    .map((s) => {
      const bloquesHtml =
        s.bloques.length === 0
          ? '<p class="muted">Sin actividades registradas.</p>'
          : s.bloques
              .map((b) => {
                const momento = labelMomento(b.momento, planeacion.momento_labels);
                return `<article class="actividad">
                  ${momento ? `<p class="act-momento"><strong>Momento:</strong> ${escapeHtml(momento)}</p>` : ''}
                  <p class="act-texto">${escapeHtml(b.contenido)}</p>
                  ${b.recursos ? `<p class="act-recursos"><strong>Recursos:</strong> ${escapeHtml(b.recursos)}</p>` : ''}
                  ${b.observacion ? `<p class="act-obs"><strong>Observación:</strong> ${escapeHtml(b.observacion)}</p>` : ''}
                </article>`;
              })
              .join('\n');

      return `<section class="dia">
        <h3>${escapeHtml(s.etiqueta)}</h3>
        ${bloquesHtml}
      </section>`;
    })
    .join('\n');

  return `<section class="bloque-seccion">
    <h2>Calendario de actividades</h2>
    ${dias}
  </section>`;
}

function buildRutinariasHtml(planeacion: PlaneacionPdfData): string {
  const rut = planeacion.rutinarias ?? [];
  const rec = planeacion.recurrentes ?? [];
  if (rut.length === 0 && rec.length === 0) return '';

  const rutList = rut.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  const recList = rec.map((r) => `<li>${escapeHtml(r)}</li>`).join('');

  return `<section class="bloque-seccion rutinarias">
    <h2>Rutinarias y recurrentes</h2>
    ${rut.length > 0 ? `<p class="subtitulo">Rutinarias</p><ul>${rutList}</ul>` : ''}
    ${rec.length > 0 ? `<p class="subtitulo">Recurrentes</p><ul>${recList}</ul>` : ''}
  </section>`;
}

/**
 * Plantilla HTML: un solo documento corrido (como Word), sin secciones paginadas.
 */
export function buildPlaneacionHtml(planeacion: PlaneacionPdfData): string {
  const ajustes = escapeHtml(planeacion.ajustes_razonables) || '—';
  const ejes = (planeacion.ejes_articuladores ?? [])
    .map((c) => escapeHtml(planeacion.ejes_nombres?.[c] ?? c))
    .join(', ') || '—';

  const footerEtiquetaFecha = formatFechaEsMx(planeacion.updated_at);
  const footer = footerEtiquetaFecha
    ? `Generado el ${footerEtiquetaFecha} · Plataforma NEM · CCT ${escapeHtml(planeacion.cct)}`
    : `Plataforma NEM · CCT ${escapeHtml(planeacion.cct)}`;

  const preguntas =
    (planeacion.preguntas_det ?? []).length > 0
      ? `<section class="bloque-seccion">
          <h2>Preguntas detonadoras</h2>
          <ul>${(planeacion.preguntas_det ?? []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </section>`
      : '';

  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(planeacion.nombre)} — Planeación NEM</title>
  <style>
    /* Documento corrido: una sola página de altura variable (sin saltos A4). */
    @page { size: ${PDF_DOC_WIDTH_MM}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: auto; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111;
      width: ${PDF_DOC_WIDTH_MM}mm;
      padding: 14mm 16mm 18mm;
      background: #fff;
    }
    .doc { width: 100%; }
    h1 {
      color: #2f6e3a;
      font-size: 16pt;
      margin: 0 0 8px;
      border-bottom: 2px solid #2f6e3a;
      padding-bottom: 6px;
    }
    h2 {
      color: #333;
      font-size: 12pt;
      margin: 20px 0 8px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
    }
    h3 {
      color: #2f6e3a;
      font-size: 11pt;
      margin: 14px 0 6px;
    }
    .meta { font-size: 10pt; color: #555; margin-bottom: 12px; }
    .meta p { margin: 2px 0; }
    .bloque-seccion { margin-bottom: 8px; }
    .subtitulo { font-weight: 600; font-size: 10pt; margin: 8px 0 4px; color: #444; }
    table.pda { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 6px; }
    table.pda th, table.pda td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: left; }
    table.pda th { background: #f5f5f5; font-weight: 600; }
    .dia { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; }
    .actividad { margin: 8px 0; padding: 8px; background: #fafafa; border-left: 3px solid #2f6e3a; }
    .act-momento { font-size: 9.5pt; color: #444; margin: 0 0 4px; }
    .act-texto { margin: 0; white-space: pre-wrap; }
    .act-recursos, .act-obs { font-size: 9.5pt; color: #555; margin: 6px 0 0; }
    .muted { color: #888; font-size: 10pt; font-style: italic; }
    ul { margin: 4px 0 8px; padding-left: 20px; }
    p { margin: 6px 0; }
    .footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="doc">
    <header>
      <p class="meta">Planeación preescolar · Fase 2 · NEM</p>
      <h1>${escapeHtml(planeacion.nombre)}</h1>
      <div class="meta">
        <p><strong>CCT:</strong> ${escapeHtml(planeacion.cct)}${planeacion.grupo_etiqueta ? ` · <strong>Grupo:</strong> ${escapeHtml(planeacion.grupo_etiqueta)}` : ''}</p>
        <p><strong>Periodo:</strong> ${escapeHtml(planeacion.periodo_inicio)} → ${escapeHtml(planeacion.periodo_fin)}</p>
        ${planeacion.modalidad_label ? `<p><strong>Modalidad:</strong> ${escapeHtml(planeacion.modalidad_label)}</p>` : ''}
      </div>
    </header>

    <section class="bloque-seccion">
      <h2>Problemática</h2>
      <p>${escapeHtml(planeacion.problema_contexto)}</p>
    </section>

    ${planeacion.proposito ? `<section class="bloque-seccion"><h2>Propósito</h2><p>${escapeHtml(planeacion.proposito)}</p></section>` : ''}
    ${planeacion.tema_centro ? `<section class="bloque-seccion"><h2>Tema del centro</h2><p>${escapeHtml(planeacion.tema_centro)}</p></section>` : ''}
    ${preguntas}
    ${planeacion.producto_integrador ? `<section class="bloque-seccion"><h2>Producto integrador</h2><p>${escapeHtml(planeacion.producto_integrador)}</p></section>` : ''}

    <section class="bloque-seccion">
      <h2>Campos formativos y PDA</h2>
      <table class="pda">
        <thead><tr><th>Campo formativo</th><th>PDA</th></tr></thead>
        <tbody>${buildPdaTableRows(planeacion)}</tbody>
      </table>
    </section>

    <section class="bloque-seccion">
      <h2>Ejes articuladores</h2>
      <p>${ejes}</p>
    </section>

    <section class="bloque-seccion">
      <h2>Estrategias / ajustes razonables</h2>
      <p>${ajustes}</p>
    </section>

    ${buildRutinariasHtml(planeacion)}
    ${buildCalendarioHtml(planeacion)}

    <div class="footer">${footer}</div>
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
        // Documento corrido: una sola página tan alta como el contenido (sin paginar A4).
        const heightPx = await page.evaluate(() => {
          const el = document.documentElement;
          return Math.ceil(Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight));
        });
        const pdfUint8 = await page.pdf({
          width: `${PDF_DOC_WIDTH_MM}mm`,
          height: `${Math.max(heightPx, 200)}px`,
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          pageRanges: '1',
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
