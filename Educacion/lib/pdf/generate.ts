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
  taller_critico?: {
    reflexion_inicial?: string | null;
    produccion?: string | null;
    socializacion?: string | null;
  } | null;
  rincones?: Array<{
    nombre: string;
    materiales?: string[] | string;
    reglas?: string | null;
  }> | null;
  abj?: {
    inicio_juego?: string | null;
    desarrollo_juego?: string | null;
    cierre_reflexion?: string | null;
  } | null;
  campos_nombres?: Record<string, string>;
  pdas_texto?: Record<string, string>;
  pda_campo_codigo?: Record<string, string>;
  ejes_nombres?: Record<string, string>;
  modalidad_label?: string;
  momento_labels?: Record<string, string>;
  rutinarias?: string[];
  recurrentes?: string[];
  sesiones?: PlaneacionPdfSesion[];
  /** Notas de bitácora diaria / diario de clase registradas */
  bitacoras?: Array<{
    fecha: string;
    sesion_numero?: number;
    participacion_grupo: number;
    dificultades?: string | null;
  }>;
  /** Concentrado de alumnos con semáforo y firmas */
  alumnos_evaluaciones?: Array<{
    alumno_nombre: string;
    nivel?: number | null;
    observaciones?: string | null;
  }>;
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

function getCampoBadgeStyle(campoCodigo: string | undefined, texto: string): { bg: string; text: string; border: string; label: string } {
  const norm = (campoCodigo || texto || '').toUpperCase();
  if (norm.includes('LENG') || /lenguaje|comunic/i.test(norm)) {
    return {
      bg: '#eff6ff',
      text: '#1e40af',
      border: '#bfdbfe',
      label: 'Lenguajes',
    };
  }
  if (norm.includes('SAB') || /ciencia|naturaleza|objeto|matem/i.test(norm)) {
    return {
      bg: '#ecfdf5',
      text: '#065f46',
      border: '#a7f3d0',
      label: 'Saberes y Pensamiento Científico',
    };
  }
  if (norm.includes('ETI') || /derecho|comunidad|convivencia|sociedad/i.test(norm)) {
    return {
      bg: '#fffbeb',
      text: '#92400e',
      border: '#fde68a',
      label: 'Ética, Naturaleza y Sociedades',
    };
  }
  if (norm.includes('HUM') || /emocion|cuerpo|juego|comunitar/i.test(norm)) {
    return {
      bg: '#faf5ff',
      text: '#6b21a8',
      border: '#e9d5ff',
      label: 'De lo Humano y lo Comunitario',
    };
  }
  return {
    bg: '#f8fafc',
    text: '#334155',
    border: '#cbd5e1',
    label: 'Campo Formativo NEM',
  };
}

function buildPdaTableRows(planeacion: PlaneacionPdfData): string {
  const pdas = planeacion.pdas ?? [];
  if (pdas.length === 0) {
    return '<tr><td colspan="2" class="td-empty">—</td></tr>';
  }
  const primerCampoCodigo = planeacion.campos_formativos?.[0];
  const primerCampoNombre = primerCampoCodigo
    ? planeacion.campos_nombres?.[primerCampoCodigo] ?? primerCampoCodigo
    : '—';

  return pdas
    .map((codigo) => {
      const texto = planeacion.pdas_texto?.[codigo] ?? codigo;
      const campoCodigo = planeacion.pda_campo_codigo?.[codigo];
      let campoNombre =
        (campoCodigo && planeacion.campos_nombres?.[campoCodigo]) || null;

      if (!campoNombre) {
        if (codigo.includes('LEN') || /lenguaje/i.test(texto)) {
          campoNombre = planeacion.campos_nombres?.['LENGUAJES'] ?? 'Lenguajes';
        } else if (codigo.includes('SAB') || /naturaleza|ciencia|objeto|matem/i.test(texto)) {
          campoNombre = planeacion.campos_nombres?.['SABERES_PENSAMIENTO_CIENTIFICO'] ?? 'Saberes y Pensamiento Científico';
        } else if (codigo.includes('ETI') || /derecho|comunidad|convivencia/i.test(texto)) {
          campoNombre = planeacion.campos_nombres?.['ETICA_NATURALEZA_SOCIEDADES'] ?? 'Ética, Naturaleza y Sociedades';
        } else if (codigo.includes('HUM') || /emocion|cuerpo|juego/i.test(texto)) {
          campoNombre = planeacion.campos_nombres?.['DE_LO_HUMANO_Y_LO_COMUNITARIO'] ?? 'De lo Humano y lo Comunitario';
        } else {
          campoNombre = primerCampoNombre;
        }
      }

      const badge = getCampoBadgeStyle(campoCodigo, campoNombre);

      return `<tr>
        <td class="td-campo">
          <span class="campo-badge" style="background-color: ${badge.bg}; color: ${badge.text}; border-color: ${badge.border};">
            <span class="badge-dot" style="background-color: ${badge.text};"></span>
            ${escapeHtml(campoNombre)}
          </span>
        </td>
        <td class="td-pda-desc">${escapeHtml(texto)}</td>
      </tr>`;
    })
    .join('\n');
}

function buildCalendarioHtml(planeacion: PlaneacionPdfData): string {
  const sesiones = planeacion.sesiones ?? [];
  if (sesiones.length === 0) return '';

  const dias = sesiones
    .map((s, idx) => {
      const numSesion = s.numero || (idx + 1);
      const bloquesHtml =
        s.bloques.length === 0
          ? '<p class="muted-box">Sin actividades registradas para esta jornada.</p>'
          : s.bloques
              .map((b) => {
                const momento = labelMomento(b.momento, planeacion.momento_labels);
                const momentoNorm = (b.momento || momento || '').toLowerCase();
                let momentoClass = 'momento-pill-default';
                if (/inicio|apertura/i.test(momentoNorm)) momentoClass = 'momento-pill-inicio';
                else if (/desarrollo|taller|practica/i.test(momentoNorm)) momentoClass = 'momento-pill-desarrollo';
                else if (/cierre|socializa|evalu/i.test(momentoNorm)) momentoClass = 'momento-pill-cierre';

                return `<article class="actividad-card">
                  <div class="act-header">
                    ${momento ? `<span class="momento-pill ${momentoClass}">
                      <span class="pill-dot"></span>${escapeHtml(momento)}
                    </span>` : ''}
                  </div>
                  <p class="act-texto">${escapeHtml(b.contenido)}</p>
                  ${b.recursos ? `<div class="act-meta-row act-recursos">
                    <span class="meta-label">Recursos:</span>
                    <span class="meta-value">${escapeHtml(b.recursos)}</span>
                  </div>` : ''}
                  ${b.observacion ? `<div class="act-meta-row act-obs">
                    <span class="meta-label">Observación:</span>
                    <span class="meta-value">${escapeHtml(b.observacion)}</span>
                  </div>` : ''}
                </article>`;
              })
              .join('\n');

      return `<div class="jornada-card">
        <div class="jornada-header">
          <div class="jornada-num-badge">Sesión ${numSesion}</div>
          <div class="jornada-title">${escapeHtml(s.etiqueta)}</div>
        </div>
        <div class="jornada-body">
          ${bloquesHtml}
        </div>
      </div>`;
    })
    .join('\n');

  return `<section class="bloque-seccion print-avoid-break">
    <div class="seccion-header">
      <div class="seccion-icon-bar"></div>
      <h2>Calendario de actividades</h2>
    </div>
    <div class="jornadas-grid">
      ${dias}
    </div>
  </section>`;
}

function buildRutinariasHtml(planeacion: PlaneacionPdfData): string {
  const rut = planeacion.rutinarias ?? [];
  const rec = planeacion.recurrentes ?? [];
  if (rut.length === 0 && rec.length === 0) return '';

  const rutChips = rut
    .map(
      (r) => `<div class="routine-chip">
        <svg class="routine-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span>${escapeHtml(r)}</span>
      </div>`,
    )
    .join('');

  const recChips = rec
    .map(
      (r) => `<div class="routine-chip recurrent-chip">
        <svg class="routine-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>
        <span>${escapeHtml(r)}</span>
      </div>`,
    )
    .join('');

  return `<section class="bloque-seccion print-avoid-break rutinarias">
    <div class="seccion-header">
      <div class="seccion-icon-bar"></div>
      <h2>Rutinarias y recurrentes</h2>
    </div>
    <div class="rutinas-container">
      ${
        rut.length > 0
          ? `<div class="rutinas-grupo">
              <span class="subtitulo">Actividades Rutinarias de la Jornada</span>
              <div class="chips-flex">${rutChips}</div>
            </div>`
          : ''
      }
      ${
        rec.length > 0
          ? `<div class="rutinas-grupo">
              <span class="subtitulo">Actividades Recurrentes y Complementarias</span>
              <div class="chips-flex">${recChips}</div>
            </div>`
          : ''
      }
    </div>
  </section>`;
}

function buildBitacorasHtml(planeacion: PlaneacionPdfData): string {
  const bitacoras = planeacion.bitacoras ?? [];
  if (bitacoras.length === 0) return '';

  const filas = bitacoras
    .map((b) => {
      const participacionTxt =
        ['—', 'Muy baja', 'Baja', 'Media', 'Buena', 'Excelente'][b.participacion_grupo] ||
        `${b.participacion_grupo}/5`;
      const isHigh = b.participacion_grupo >= 4;
      return `<tr>
        <td class="td-bold nowrap">${escapeHtml(b.fecha)}${b.sesion_numero ? ` (Sesión ${b.sesion_numero})` : ''}</td>
        <td class="text-center">
          <span class="status-pill ${isHigh ? 'status-pill-green' : 'status-pill-neutral'}">
            ${escapeHtml(participacionTxt)}
          </span>
        </td>
        <td class="td-muted-desc">${escapeHtml(b.dificultades || '—')}</td>
      </tr>`;
    })
    .join('\n');

  return `<section class="bloque-seccion print-avoid-break">
    <div class="seccion-header">
      <div class="seccion-icon-bar"></div>
      <h2>Bitácora y reflexiones post-clase</h2>
    </div>
    <table class="pda bitacora-table">
      <thead>
        <tr>
          <th style="width: 25%;">Fecha / Sesión</th>
          <th style="width: 20%; text-align: center;">Participación</th>
          <th>Observaciones y dificultades pedagógicas</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  </section>`;
}

function buildConcentradoAlumnosHtml(planeacion: PlaneacionPdfData): string {
  const alumnos = planeacion.alumnos_evaluaciones ?? [];
  if (alumnos.length === 0) return '';

  const nivelesMap: Record<number, { label: string; emoji: string; pillClass: string }> = {
    1: { label: 'Logrado sin apoyo', emoji: '🟢', pillClass: 'pill-nivel-1' },
    2: { label: 'Con apoyo', emoji: '🟡', pillClass: 'pill-nivel-2' },
    3: { label: 'Apoyo constante', emoji: '🟠', pillClass: 'pill-nivel-3' },
    4: { label: 'Requiere apoyo', emoji: '🔴', pillClass: 'pill-nivel-4' },
  };

  const filas = alumnos
    .map((a, idx) => {
      const niv = a.nivel ? nivelesMap[a.nivel] : null;
      const nivelTxt = niv ? `${niv.emoji} ${niv.label}` : '—';
      const pillClass = niv ? niv.pillClass : '';
      return `<tr>
        <td class="text-center text-muted idx-col">${idx + 1}</td>
        <td class="td-bold">${escapeHtml(a.alumno_nombre)}</td>
        <td>
          <span class="nivel-pill ${pillClass}">
            ${escapeHtml(nivelTxt)}
          </span>
        </td>
        <td class="td-muted-desc">${escapeHtml(a.observaciones || '—')}</td>
      </tr>`;
    })
    .join('\n');

  return `<section class="bloque-seccion print-avoid-break">
    <div class="seccion-header">
      <div class="seccion-icon-bar"></div>
      <h2>Concentrado de valoración formativa por alumno</h2>
    </div>
    <table class="pda concentrado-table">
      <thead>
        <tr>
          <th style="width: 6%; text-align: center;">#</th>
          <th style="width: 34%;">Nombre de la alumna / alumno</th>
          <th style="width: 28%;">Nivel de logro</th>
          <th>Observaciones cualitativas</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  </section>`;
}

function buildModalidadHtml(planeacion: PlaneacionPdfData): string {
  let html = '';

  // 1. Taller Crítico
  if (planeacion.taller_critico) {
    const { reflexion_inicial, produccion, socializacion } = planeacion.taller_critico;
    if (reflexion_inicial || produccion || socializacion) {
      html += `<section class="bloque-seccion print-avoid-break">
        <div class="seccion-header">
          <div class="seccion-icon-bar"></div>
          <h2>Fases del Taller Crítico</h2>
        </div>
        <div class="fases-container">
          ${reflexion_inicial ? `<div class="fase-item"><span class="subtitulo">Reflexión Inicial</span><p class="act-texto">${escapeHtml(reflexion_inicial)}</p></div>` : ''}
          ${produccion ? `<div class="fase-item"><span class="subtitulo">Producción</span><p class="act-texto">${escapeHtml(produccion)}</p></div>` : ''}
          ${socializacion ? `<div class="fase-item"><span class="subtitulo">Socialización</span><p class="act-texto">${escapeHtml(socializacion)}</p></div>` : ''}
        </div>
      </section>`;
    }
  }

  // 2. Rincones de Aprendizaje
  if (planeacion.rincones && planeacion.rincones.length > 0) {
    const rinconesHtml = planeacion.rincones
      .map((r, idx) => {
        const nombre = r.nombre || `Rincón ${idx + 1}`;
        const mats = Array.isArray(r.materiales)
          ? r.materiales.join(', ')
          : (r.materiales ?? '');
        return `<article class="actividad-card rincon-card">
          <span class="subtitulo" style="margin-top:0;"><strong>${escapeHtml(nombre)}</strong></span>
          ${mats ? `<div class="act-meta-row act-recursos"><span class="meta-label">Materiales:</span> <span class="meta-value">${escapeHtml(mats)}</span></div>` : ''}
          ${r.reglas ? `<div class="act-meta-row act-obs"><span class="meta-label">Reglas:</span> <span class="meta-value">${escapeHtml(r.reglas)}</span></div>` : ''}
        </article>`;
      })
      .join('\n');

    html += `<section class="bloque-seccion print-avoid-break">
      <div class="seccion-header">
        <div class="seccion-icon-bar"></div>
        <h2>Rincones de Aprendizaje</h2>
      </div>
      <div class="fases-container">
        ${rinconesHtml}
      </div>
    </section>`;
  }

  // 3. Aprendizaje Basado en Juego (ABJ)
  if (planeacion.abj) {
    const { inicio_juego, desarrollo_juego, cierre_reflexion } = planeacion.abj;
    if (inicio_juego || desarrollo_juego || cierre_reflexion) {
      html += `<section class="bloque-seccion print-avoid-break">
        <div class="seccion-header">
          <div class="seccion-icon-bar"></div>
          <h2>Fases de Aprendizaje Basado en Juego (ABJ)</h2>
        </div>
        <div class="fases-container">
          ${inicio_juego ? `<div class="fase-item"><span class="subtitulo">Inicio del Juego</span><p class="act-texto">${escapeHtml(inicio_juego)}</p></div>` : ''}
          ${desarrollo_juego ? `<div class="fase-item"><span class="subtitulo">Desarrollo del Juego</span><p class="act-texto">${escapeHtml(desarrollo_juego)}</p></div>` : ''}
          ${cierre_reflexion ? `<div class="fase-item"><span class="subtitulo">Cierre / Reflexión</span><p class="act-texto">${escapeHtml(cierre_reflexion)}</p></div>` : ''}
        </div>
      </section>`;
    }
  }

  return html;
}

/**
 * Plantilla HTML: documento oficial institucional de la Nueva Escuela Mexicana (NEM).
 * Maquetado con soporte Letter (@page Letter / 215.9mm x 279.4mm) y reglas de impresión limpia.
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
      ? `<section class="bloque-seccion print-avoid-break">
          <div class="seccion-header">
            <div class="seccion-icon-bar"></div>
            <h2>Preguntas detonadoras</h2>
          </div>
          <ul class="styled-list">${(planeacion.preguntas_det ?? []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </section>`
      : '';

  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(planeacion.nombre)} — Planeación NEM</title>
  <style>
    /* Documento corrido con compatibilidad Carta / Letter e impresión limpia */
    @page { size: ${PDF_DOC_WIDTH_MM}mm auto; margin: 10mm 12mm 12mm 12mm; }
    @media print {
      @page { size: letter portrait; margin: 10mm 12mm 12mm 12mm; }
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    body {
      width: 100%;
      max-width: ${PDF_DOC_WIDTH_MM}mm;
      margin: 0 auto;
      padding: 6mm 8mm 12mm;
    }
    .doc { width: 100%; }

    /* ==========================================================================
       CABECERA INSTITUCIONAL NEM / SEP
       ========================================================================== */
    .cintillo-superior {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 65%, #047857 100%);
      color: #ffffff;
      border-radius: 8px 8px 0 0;
      padding: 10px 16px 8px;
      position: relative;
      border-bottom: 3.5px solid #d97706; /* Detalle oro / ambar institucional */
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .cintillo-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cintillo-emblema {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cintillo-escudo {
      width: 28px;
      height: 28px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11pt;
      color: #fef3c7;
      letter-spacing: 0.5px;
    }
    .cintillo-texto-inst {
      display: flex;
      flex-direction: column;
    }
    .inst-sup {
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #a7f3d0;
      line-height: 1.1;
    }
    .inst-sub {
      font-size: 9.5pt;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 0.2px;
      line-height: 1.2;
    }
    .cintillo-tag {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    /* TÍTULO Y METADATOS */
    .header-content {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 14px 18px 12px;
      margin-bottom: 14px;
    }
    .plan-meta-sup {
      font-size: 8.5pt;
      font-weight: 600;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 0 0 4px;
    }
    h1 {
      color: #0f172a;
      font-size: 15pt;
      font-weight: 800;
      line-height: 1.25;
      margin: 0 0 10px;
      letter-spacing: -0.2px;
    }
    .meta-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    .meta-chip-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 8px;
    }
    .meta-chip-label {
      font-size: 6.8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 2px;
    }
    .meta-chip-val {
      font-size: 8.8pt;
      font-weight: 600;
      color: #0f172a;
    }

    /* SECCIONES Y ENCABEZADOS */
    .bloque-seccion {
      margin-bottom: 14px;
      page-break-inside: auto;
    }
    .print-avoid-break {
      page-break-inside: avoid;
    }
    .seccion-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .seccion-icon-bar {
      width: 4px;
      height: 14px;
      background: #047857;
      border-radius: 2px;
    }
    h2 {
      color: #0f172a;
      font-size: 10.5pt;
      font-weight: 700;
      letter-spacing: 0.2px;
      margin: 0;
      text-transform: uppercase;
    }
    h3 {
      color: #065f46;
      font-size: 10pt;
      font-weight: 700;
      margin: 0 0 4px;
    }
    .subtitulo {
      display: block;
      font-size: 8.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }
    p { margin: 4px 0; }
    .prose-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 3.5px solid #047857;
      border-radius: 0 6px 6px 0;
      padding: 8px 12px;
      font-size: 9.5pt;
      color: #334155;
      line-height: 1.45;
    }
    .prose-card-amber {
      border-left-color: #d97706;
      background: #fffbeb;
    }

    /* TABLAS ESTILIZADAS */
    table.pda {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 9pt;
      margin-top: 6px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
    }
    table.pda th, table.pda td {
      padding: 7px 10px;
      vertical-align: middle;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    table.pda th {
      background: #f1f5f9;
      color: #334155;
      font-size: 7.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 2px solid #cbd5e1;
    }
    table.pda tr:last-child td {
      border-bottom: none;
    }
    table.pda tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .td-campo {
      width: 32%;
      vertical-align: top;
    }
    .td-pda-desc {
      color: #1e293b;
      line-height: 1.4;
    }
    .td-empty {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
    }
    .td-bold {
      font-weight: 600;
      color: #0f172a;
    }
    .td-muted-desc {
      color: #475569;
      font-size: 8.5pt;
    }
    .idx-col {
      font-weight: 600;
      font-size: 8.5pt;
      color: #64748b;
    }
    .nowrap { white-space: nowrap; }
    .text-center { text-align: center; }

    /* BADGES DE CAMPOS FORMATIVOS NEM */
    .campo-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 9999px;
      border: 1px solid transparent;
      font-size: 7.8pt;
      font-weight: 700;
      line-height: 1.2;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* JORNADAS PEDAGÓGICAS / DÍAS */
    .jornadas-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .jornada-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      overflow: hidden;
      page-break-inside: avoid;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .jornada-header {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .jornada-num-badge {
      background: #047857;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .jornada-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .jornada-body {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .actividad-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #047857;
      border-radius: 4px;
      padding: 7px 9px;
    }
    .act-header {
      margin-bottom: 3px;
    }
    .momento-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 9999px;
    }
    .pill-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .momento-pill-inicio {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .momento-pill-desarrollo {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .momento-pill-cierre {
      background: #fdf2f8;
      color: #be185d;
      border: 1px solid #fbcfe8;
    }
    .momento-pill-default {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .act-texto {
      margin: 2px 0 0;
      font-size: 9pt;
      color: #1e293b;
      line-height: 1.42;
      white-space: pre-wrap;
    }
    .act-meta-row {
      display: flex;
      gap: 5px;
      align-items: baseline;
      font-size: 8pt;
      margin-top: 4px;
      padding-top: 3px;
      border-top: 1px dashed #e2e8f0;
    }
    .meta-label {
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      font-size: 7.2pt;
    }
    .meta-value {
      color: #334155;
    }
    .muted-box {
      color: #94a3b8;
      font-style: italic;
      font-size: 8.5pt;
      margin: 2px 0;
    }

    /* RUTINAS Y CHIPS */
    .rutinas-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chips-flex {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 3px;
    }
    .routine-chip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 8.5pt;
      color: #334155;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .recurrent-chip {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }
    .routine-icon {
      width: 13px;
      height: 13px;
      color: #047857;
      flex-shrink: 0;
    }

    /* PILLS DE EVALUACIÓN */
    .status-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
    }
    .status-pill-green {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .status-pill-neutral {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .nivel-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 8.5pt;
      font-weight: 600;
      color: #1e293b;
    }

    /* MODALIDADES ESPECIALES */
    .fases-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fase-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #d97706;
      border-radius: 4px;
      padding: 6px 10px;
    }

    /* CUADRÍCULA DE FIRMAS CON SELLO */
    .firmas-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 32px;
      padding-top: 10px;
      page-break-inside: avoid;
    }
    .firma-col {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sello-box-placeholder {
      width: 80px;
      height: 60px;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6.8pt;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .firma-linea {
      width: 100%;
      border-top: 1.5px solid #334155;
      padding-top: 5px;
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .firma-cargo {
      font-size: 8pt;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* FOOTER */
    .footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 7.8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-inside: avoid;
    }
    .styled-list {
      margin: 4px 0 6px;
      padding-left: 18px;
      font-size: 9.2pt;
      color: #334155;
    }
    .styled-list li {
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="doc">
    <!-- CINTILLO INSTITUCIONAL NEM -->
    <header>
      <div class="cintillo-superior">
        <div class="cintillo-row">
          <div class="cintillo-emblema">
            <div class="cintillo-escudo">SEP</div>
            <div class="cintillo-texto-inst">
              <span class="inst-sup">Secretaría de Educación Pública · NEM</span>
              <span class="inst-sub">Planeación Didáctica Preescolar · Fase 2</span>
            </div>
          </div>
          <div class="cintillo-tag">Documento Oficial</div>
        </div>
      </div>

      <div class="header-content">
        <p class="plan-meta-sup">Planeación preescolar · Fase 2 · NEM</p>
        <h1>${escapeHtml(planeacion.nombre)}</h1>

        <div class="meta-cards-grid">
          <div class="meta-chip-box">
            <span class="meta-chip-label">CCT</span>
            <span class="meta-chip-val">${escapeHtml(planeacion.cct)}</span>
          </div>
          ${
            planeacion.grupo_etiqueta
              ? `<div class="meta-chip-box">
                  <span class="meta-chip-label">Grupo</span>
                  <span class="meta-chip-val">${escapeHtml(planeacion.grupo_etiqueta)}</span>
                </div>`
              : ''
          }
          <div class="meta-chip-box">
            <span class="meta-chip-label">Periodo de Ejecución</span>
            <span class="meta-chip-val">${escapeHtml(planeacion.periodo_inicio)} → ${escapeHtml(planeacion.periodo_fin)}</span>
          </div>
          ${
            planeacion.modalidad_label
              ? `<div class="meta-chip-box">
                  <span class="meta-chip-label">Metodología / Modalidad</span>
                  <span class="meta-chip-val">${escapeHtml(planeacion.modalidad_label)}</span>
                </div>`
              : ''
          }
        </div>
      </div>
    </header>

    <!-- PROBLEMÁTICA DEL CONTEXTO -->
    <section class="bloque-seccion print-avoid-break">
      <div class="seccion-header">
        <div class="seccion-icon-bar"></div>
        <h2>Problemática</h2>
      </div>
      <div class="prose-card">
        ${escapeHtml(planeacion.problema_contexto)}
      </div>
    </section>

    ${
      planeacion.proposito
        ? `<section class="bloque-seccion print-avoid-break">
            <div class="seccion-header">
              <div class="seccion-icon-bar"></div>
              <h2>Propósito</h2>
            </div>
            <div class="prose-card">${escapeHtml(planeacion.proposito)}</div>
          </section>`
        : ''
    }

    ${
      planeacion.tema_centro
        ? `<section class="bloque-seccion print-avoid-break">
            <div class="seccion-header">
              <div class="seccion-icon-bar"></div>
              <h2>Tema del centro</h2>
            </div>
            <div class="prose-card">${escapeHtml(planeacion.tema_centro)}</div>
          </section>`
        : ''
    }

    ${preguntas}

    ${
      planeacion.producto_integrador
        ? `<section class="bloque-seccion print-avoid-break">
            <div class="seccion-header">
              <div class="seccion-icon-bar"></div>
              <h2>Producto integrador</h2>
            </div>
            <div class="prose-card">${escapeHtml(planeacion.producto_integrador)}</div>
          </section>`
        : ''
    }

    <!-- TABLA DE CAMPOS FORMATIVOS Y PDA -->
    <section class="bloque-seccion">
      <div class="seccion-header">
        <div class="seccion-icon-bar"></div>
        <h2>Campos formativos y PDA</h2>
      </div>
      <table class="pda">
        <thead>
          <tr>
            <th style="width: 32%;">Campo formativo</th>
            <th>Proceso de Desarrollo de Aprendizaje (PDA)</th>
          </tr>
        </thead>
        <tbody>
          ${buildPdaTableRows(planeacion)}
        </tbody>
      </table>
    </section>

    <!-- EJES ARTICULADORES -->
    <section class="bloque-seccion print-avoid-break">
      <div class="seccion-header">
        <div class="seccion-icon-bar"></div>
        <h2>Ejes articuladores</h2>
      </div>
      <div class="prose-card">
        ${ejes}
      </div>
    </section>

    <!-- AJUSTES RAZONABLES (BAP) -->
    <section class="bloque-seccion print-avoid-break">
      <div class="seccion-header">
        <div class="seccion-icon-bar" style="background: #d97706;"></div>
        <h2>Estrategias / ajustes razonables</h2>
      </div>
      <div class="prose-card prose-card-amber">
        ${ajustes}
      </div>
    </section>

    <!-- FASES / MODALIDADES ESPECIALES -->
    ${buildModalidadHtml(planeacion)}

    <!-- ACTIVIDADES RUTINARIAS Y RECURRENTES -->
    ${buildRutinariasHtml(planeacion)}

    <!-- CALENDARIO DÍA A DÍA -->
    ${buildCalendarioHtml(planeacion)}

    <!-- BITÁCORAS DIARIAS -->
    ${buildBitacorasHtml(planeacion)}

    <!-- CONCENTRADO FORMATIVO DE ALUMNOS -->
    ${buildConcentradoAlumnosHtml(planeacion)}

    <!-- FIRMAS OFICIALES CON ESPACIO DE SELLO -->
    <div class="firmas-grid">
      <div class="firma-col">
        <div class="sello-box-placeholder">Sello Escolar</div>
        <div class="firma-linea">Docente de Grupo</div>
        <div class="firma-cargo">Educadora Titular</div>
      </div>
      <div class="firma-col">
        <div class="sello-box-placeholder">Sello Escolar</div>
        <div class="firma-linea">Vo. Bo. Dirección Escolar</div>
        <div class="firma-cargo">Directora / Directora del Plantel</div>
      </div>
    </div>

    <!-- PIE DE PÁGINA DETERMINISTA -->
    <div class="footer">
      <span>${footer}</span>
      <span>Fase 2 Preescolar · Secretaría de Educación Pública</span>
    </div>
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
