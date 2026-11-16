/**
 * Utilidades para la distribución equitativa de materiales y generación de recados (WhatsApp / Imprimible).
 */

export interface MaterialItem {
  nombre: string;
  cantidad?: string | number;
  categoria?: string;
}

export interface AlumnoItem {
  id: string;
  nombre: string;
}

export interface AsignacionMaterial {
  alumnoId: string;
  alumnoNombre: string;
  material: string;
  entregado?: boolean;
}

/**
 * Distribuye una lista de materiales de forma red-robin / equitativa entre los alumnos.
 */
export function distribuirMaterialesEquitativamente(
  materiales: (string | MaterialItem)[],
  alumnos: AlumnoItem[],
): AsignacionMaterial[] {
  if (!alumnos || alumnos.length === 0) return [];
  if (!materiales || materiales.length === 0) return [];

  const matNombres = materiales
    .map((m) => (typeof m === 'string' ? m.trim() : (m.nombre ?? '').trim()))
    .filter((m) => m.length > 0);

  if (matNombres.length === 0) return [];

  return alumnos.map((alumno, index) => {
    const materialAsignado = matNombres[index % matNombres.length] ?? '';
    return {
      alumnoId: alumno.id,
      alumnoNombre: alumno.nombre,
      material: materialAsignado,
      entregado: false,
    };
  });
}

/**
 * Genera el texto del recado formal y cálido para WhatsApp o tirita impresa
 * cuando es el mismo material para todos.
 */
export function generarMensajeMismoMaterial({
  nombrePlaneacion,
  materiales,
  fechaEntrega,
  docenteNombre,
}: {
  nombrePlaneacion?: string;
  materiales: (string | MaterialItem)[];
  fechaEntrega?: string;
  docenteNombre?: string;
}): string {
  const listaMats = materiales
    .map((m) => (typeof m === 'string' ? m.trim() : (m.nombre ?? '').trim()))
    .filter((m) => m.length > 0);

  const matsTexto = listaMats.length > 0
    ? listaMats.map((m) => `  • ${m}`).join('\n')
    : '  • Material escolar de apoyo para la actividad';

  const fechaTexto = fechaEntrega ? ` a más tardar el *${fechaEntrega}*` : '';
  const firmaTexto = docenteNombre ? `\n\nAtentamente,\n*${docenteNombre}*\nEducadora` : '\n\nAtentamente,\n*Docente de Grupo*';

  return `Estimadas familias del grupo:

Esperando se encuentren muy bien. Con el gusto de saludarles y continuar enriqueciendo las experiencias de aprendizaje de nuestros pequeños${nombrePlaneacion ? ` en la situación didáctica *"${nombrePlaneacion}"*` : ''}, solicitamos de su valioso apoyo con el siguiente material${fechaTexto}:

${matsTexto}

Favor de enviar el material debidamente identificado con el nombre de su hija o hijo.

¡Agradecemos mucho su compromiso y apoyo en la educación de nuestros alumnos!${firmaTexto}`.trim();
}

/**
 * Genera un texto individual de recado para un alumno con su material asignado.
 */
export function generarMensajeMaterialIndividual({
  alumnoNombre,
  material,
  nombrePlaneacion,
  fechaEntrega,
  docenteNombre,
}: {
  alumnoNombre: string;
  material: string;
  nombrePlaneacion?: string;
  fechaEntrega?: string;
  docenteNombre?: string;
}): string {
  const fechaTexto = fechaEntrega ? ` para el día *${fechaEntrega}*` : '';
  const firmaTexto = docenteNombre ? `\n\nAtentamente,\n*${docenteNombre}*` : '\n\nAtentamente,\n*Docente de Grupo*';

  return `Estimada familia de *${alumnoNombre}*:

Esperando se encuentren muy bien. Para el desarrollo de nuestras actividades${nombrePlaneacion ? ` ("${nombrePlaneacion}")` : ''}, a ${alumnoNombre} le correspondió apoyar al grupo con el siguiente material${fechaTexto}:

  • *${material}*

Favor de enviarlo rotulado con su nombre. ¡Muchas gracias por su constante apoyo y colaboración!${firmaTexto}`.trim();
}

/**
 * Datos requeridos para renderizar una etiqueta térmica de material para playera/recado de alumno.
 */
export interface EtiquetaTermicaItem {
  alumnoNombre: string;
  material: string;
}

export interface GenerarEtiquetasTermicasOptions {
  etiquetas: EtiquetaTermicaItem[];
  tamano?: '40x30' | '50x30';
  mensajeCortesia?: string;
  institucion?: string;
  fechaEntrega?: string;
}

/**
 * Genera el documento HTML completo listo para imprimir en rollo de etiquetas térmicas continuas
 * (ej. Niimbot B21/B1, Phomemo, PeriPage) con tamaño 40x30mm o 50x30mm y salto de página `page-break-after: always`.
 */
export function generarHtmlEtiquetasTermicas({
  etiquetas,
  tamano = '50x30',
  mensajeCortesia,
  institucion = 'Jardín de Niños',
  fechaEntrega,
}: GenerarEtiquetasTermicasOptions): string {
  const anchoMm = tamano === '40x30' ? 40 : 50;
  const altoMm = 30;

  const etiquetasHtml = etiquetas
    .map((item) => {
      const lineaFecha = fechaEntrega ? `Para: ${fechaEntrega}` : '';
      const pieTexto = mensajeCortesia
        ? mensajeCortesia
        : [lineaFecha, institucion].filter(Boolean).join(' · ');

      return `
      <div class="sticker-page">
        <div class="sticker-content">
          <div class="sticker-header">🎒 MATERIAL ESCOLAR</div>
          <div class="sticker-alumno">${escapeHtml(item.alumnoNombre)}</div>
          <div class="sticker-material-box">
            <span class="sticker-material-icon">📦</span>
            <span class="sticker-material-text">${escapeHtml(item.material)}</span>
          </div>
          ${pieTexto ? `<div class="sticker-footer">${escapeHtml(pieTexto)}</div>` : ''}
        </div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiquetas Térmicas - Materiales</title>
  <style>
    @page {
      size: ${anchoMm}mm ${altoMm}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .sticker-page {
      width: ${anchoMm}mm;
      height: ${altoMm}mm;
      max-width: ${anchoMm}mm;
      max-height: ${altoMm}mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 1.5mm 2mm;
    }
    .sticker-content {
      width: 100%;
      height: 100%;
      border: 1px dashed #000;
      border-radius: 2mm;
      padding: 1.2mm 1.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
    }
    .sticker-header {
      font-size: 6pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1;
      color: #333;
    }
    .sticker-alumno {
      font-size: 8.5pt;
      font-weight: 800;
      line-height: 1.1;
      color: #000;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sticker-material-box {
      width: 100%;
      background: #f1f1f1;
      border: 0.8px solid #000;
      border-radius: 1.5mm;
      padding: 1mm 1.5mm;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5mm;
    }
    .sticker-material-icon {
      font-size: 8pt;
      line-height: 1;
    }
    .sticker-material-text {
      font-size: 7.5pt;
      font-weight: 700;
      line-height: 1.1;
      color: #000;
      word-break: break-word;
    }
    .sticker-footer {
      font-size: 5.5pt;
      font-weight: 600;
      color: #444;
      line-height: 1;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media screen {
      body {
        background: #e5e7eb;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .sticker-page {
        background: #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        margin-bottom: 8px;
      }
    }
  </style>
</head>
<body>
  ${etiquetasHtml}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

