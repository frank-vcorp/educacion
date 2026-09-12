/**
 * Guías contextuales por bloque — DEC-20260821-02.
 *
 * Texto breve (visible bajo el título) + texto extendido (tooltip/disclosure).
 * **No** modifica, resume ni sustituye preguntas del PDF; las preguntas
 * permanecen literales (DEC-20260821-02 + DEC-20260820-05 + DEC-20260821-01).
 *
 * Cubre:
 *  - Qué se captura en el bloque.
 *  - Para qué sirve (uso pedagógico; contexto del alumno).
 *  - Quién responde (alumno, familia, docente).
 *  - Evidencia de dibujos / directorio.
 *  - Guardar vs Archivar.
 *  - No se envía a IA.
 */

export interface SectionGuide {
  /** Identificador único (sufijo aria/testid). */
  id: string;
  /** Etiqueta humana para el botón "Ayuda" (aria-label). */
  ariaLabel: string;
  /** Texto breve SIEMPRE visible bajo el `<legend>` del bloque. */
  breve: string;
  /** Texto extendido para el tooltip. */
  detalle: string;
}

/** Infantiles — Entrevista del niño (3 bloques). */
export const GUIAS_INFANTIL = [
  {
    id: 'infantil-bloque-1',
    ariaLabel: 'Ayuda del bloque 1 — Entrevista inicial',
    breve:
      '23 preguntas literales del alumno. Lo que responde el niño al inicio del ciclo; no se modifica.',
    detalle:
      'Qué se captura: las 23 preguntas del documento en orden literal.\n' +
      'Para qué sirve: conocer contexto, intereses y emociones del alumno al inicio del ciclo y darle seguimiento durante el año escolar.\n' +
      'Quién responde: el alumno, en conversación con su docente.\n' +
      'Guardar vs Archivar: Guardar conserva los cambios como borrador o completa para seguir editando; Archivar cierra la entrevista al final del ciclo y la deja en modo de solo lectura.\n' +
      'No se envía a ninguna IA: las respuestas del niño se quedan en su perfil.',
  },
  {
    id: 'infantil-bloque-2',
    ariaLabel: 'Ayuda del bloque 2 — Ambiente familiar y escuela',
    breve:
      '16 celdas literales: 2 instrucciones de dibujo (subir foto) y 14 preguntas sobre familia y escuela.',
    detalle:
      'Qué se captura: 16 celdas del documento en orden literal (2 celdas de dibujo y 14 preguntas).\n' +
      'Para qué sirve: documentar la percepción del niño sobre su familia y su escuela.\n' +
      'Quién responde: el alumno; las instrucciones de dibujo se atienden subiendo una foto del dibujo hecho por el niño (JPG, PNG o WEBP).\n' +
      'Evidencia de dibujo: sube una imagen por celda de dibujo (no se sustituye el dibujo por texto).\n' +
      'Guardar vs Archivar: Guardar conserva los cambios; Archivar cierra la entrevista al final del ciclo y la deja en solo lectura.\n' +
      'No se envía a ninguna IA: las respuestas y las imágenes de dibujo se quedan en el perfil del alumno.',
  },
  {
    id: 'infantil-bloque-3',
    ariaLabel: 'Ayuda del bloque 3 — Directorio de emergencia',
    breve:
      '4 contactos de emergencia literales. Dato sensible: solo la docente responsable lo consulta.',
    detalle:
      'Qué se captura: los 4 contactos del directorio en orden literal (Nombre + Teléfono).\n' +
      'Para qué sirve: tener a mano referencias de la familia para una emergencia escolar.\n' +
      'Quién responde: la familia del alumno (la docente captura la información que la familia comparte).\n' +
      'Evidencia de directorio: no se sube imagen; el nombre y el teléfono se teclean directamente.\n' +
      'Guardar vs Archivar: Guardar conserva los cambios; Archivar cierra la entrevista al final del ciclo y deja el directorio en solo lectura.\n' +
      'No se envía a ninguna IA: este directorio nunca se envía a ningún proveedor de IA.',
  },
] as const satisfies ReadonlyArray<SectionGuide>;

/** Familiares — Entrevista familiar (6 bloques A..F). */
export const GUIAS_FAMILIAR = [
  {
    id: 'familiar-bloque-a',
    ariaLabel: 'Ayuda del bloque A — Identificación',
    breve:
      'Encabezado e identificación del alumno. Datos que la familia confirma al inicio.',
    detalle:
      'Qué se captura: Nombre del alumno y fecha de nacimiento (los demás campos del encabezado son derivados del perfil del grupo).\n' +
      'Para qué sirve: confirmar la identidad del alumno al que se aplica la entrevista familiar.\n' +
      'Quién responde: la familia (la docente captura la información que la familia proporciona).\n' +
      'Guardar vs Archivar: Guardar conserva los cambios como borrador o completa; Archivar cierra la entrevista al final del ciclo y la deja en solo lectura.\n' +
      'No se envía a ninguna IA: estos datos no salen del perfil del alumno.',
  },
  {
    id: 'familiar-bloque-b',
    ariaLabel: 'Ayuda del bloque B — Datos de mamá y papá',
    breve:
      'Tabla literal mamá/papá (6 filas). Las filas vacías se ignoran si la familia no llena todos los campos.',
    detalle:
      'Qué se captura: 6 filas por progenitor (Nombre, Teléfono celular, Edad, Nivel de estudios, ocupación, Horario de trabajo) en orden literal del PDF.\n' +
      'Para qué sirve: registrar la información de contacto y formación de las personas responsables.\n' +
      'Quién responde: la familia; las filas sin información se pueden dejar en blanco.\n' +
      'Guardar vs Archivar: Guardar conserva los cambios; Archivar cierra la entrevista al final del ciclo y la deja en solo lectura.\n' +
      'No se envía a ninguna IA: ningún dato de la mamá o el papá se envía a IA.',
  },
  {
    id: 'familiar-bloque-c',
    ariaLabel: 'Ayuda del bloque C — Situación legal de la familia',
    breve:
      '5 casillas literales (casados, unión libre, con quién vive, divorciados, madre soltera).',
    detalle:
      'Qué se captura: 5 opciones del documento (casados, unión libre, con quién vive, divorciados, madre soltera) en orden literal. Casados y unión libre son excluyentes entre sí; divorciados y madre soltera también.\n' +
      'Para qué sirve: registrar la configuración familiar reportada por la familia.\n' +
      'Quién responde: la familia (la docente captura la información que la familia comparte).\n' +
      'Guardar vs Archivar: Guardar conserva los cambios; Archivar cierra la entrevista al final del ciclo y la deja en solo lectura.\n' +
      'No se envía a ninguna IA: la situación legal de la familia no se envía a IA.',
  },
  {
    id: 'familiar-bloque-d',
    ariaLabel: 'Ayuda del bloque D — Padres separados',
    breve:
      'Bloque condicional. Solo aparece si en el bloque C no se marcó "casados" o "unión libre".',
    detalle:
      'Qué se captura: patria potestad, convivencia con la otra parte y explicación de la separación.\n' +
      'Para qué sirve: dejar registro de los acuerdos cuando los padres no viven juntos.\n' +
      'Quién responde: la familia (la docente captura la información que la familia comparte).\n' +
      'Guardar vs Archivar: Guardar conserva los cambios; Archivar cierra la entrevista al final del ciclo y la deja en solo lectura.\n' +
      'No se envía a ninguna IA: ningún detalle de la separación se envía a IA.',
  },
  {
    id: 'familiar-bloque-e',
    ariaLabel: 'Ayuda del bloque E — Hábitos familiares',
    breve:
      '15 ítems literales (el 15 no existe: salto 14→16). Algunas preguntas tienen subcampo opcional.',
    detalle:
      'Qué se captura: 15 preguntas del documento en orden literal (1..14, 16 — el ítem 15 no existe en el PDF original). Algunas preguntas incluyen un subcampo opcional aclaratorio.\n' +
      'Para qué sirve: registrar los hábitos y la dinámica familiar.\n' +
      'Quién responde: la familia; la docente captura la información que la familia comparte.\n' +
      'Guardar vs Archivar: Guardar conserva los cambios; Archivar cierra la entrevista al final del ciclo y la deja en solo lectura.\n' +
      'No se envía a ninguna IA: los hábitos familiares no se envían a IA.',
  },
  {
    id: 'familiar-bloque-f',
    ariaLabel: 'Ayuda del bloque F — Cierre y firmas',
    breve:
      'Cierre literal y firmas como nombre tecleado de mamá y papá (sin imagen, sin valor legal).',
    detalle:
      'Qué se captura: cierre literal del PDF y dos campos de texto para Nombre de la mamá y Nombre del papá.\n' +
      'Para qué sirve: registrar la conformidad de la familia con la información capturada.\n' +
      'Quién responde: la familia (la docente teclea el nombre que la familia le proporcione).\n' +
      'No se sube imagen ni se genera hash: la firma se registra como nombre tecleado, no tiene valor legal de firma manuscrita y no se sube a ningún almacenamiento de imágenes.\n' +
      'Guardar vs Archivar: Guardar conserva los cambios; Archivar cierra la entrevista al final del ciclo y la deja en solo lectura.\n' +
      'No se envía a ninguna IA: ningún nombre ni dato del bloque de firmas se envía a IA.',
  },
] as const satisfies ReadonlyArray<SectionGuide>;
