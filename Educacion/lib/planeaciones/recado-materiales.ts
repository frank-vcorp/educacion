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
