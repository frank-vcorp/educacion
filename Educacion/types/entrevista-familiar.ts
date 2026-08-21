/**
 * Contrato de la entrevista familiar — v1 (SPEC_TEC_11 §4 + ADR-20260820-04 revisado por DEC-20260821-01).
 *
 * Cuestionario LITERAL e INMUTABLE del PDF
 * `docx_extract/NUEVA ENTREVISTA.pdf`. Reproduce los 6 bloques tal cual, sin
 * resumir, deduplicar, reordenar ni corregir peculiaridades. La fuente del PDF
 * es la autoridad literal; si SOFIA detecta discrepancia, se reporta como
 * `SPEC-GAP` / `DISCOVERY-GAP` y nunca se normaliza silenciosamente.
 *
 * Bloques (§4.1 + §4.2):
 *   A — Encabezado e identificación (NOMBRE DEL ALUMNO, FECHA DE NACIMIENTO).
 *   B — Datos de MAMÁ y PAPÁ (tabla de 6 filas × 2 columnas; etiquetas literales).
 *   C — SITUACION LEGAL DE LA FAMILIA (5 casillas + texto "¿con quién vive el alumno?").
 *   D — Padres separados (condicional; 2 preguntas + sub-campo).
 *   E — HABITOS FAMILIARES (15 ítems numerados con salto 14→16 — sin 15).
 *   F — Cierre literal + firma por nombre tecleado de mamá/papá (sin imagen, D11-11).
 *
 * Regla dura: el texto literal NO se modifica, deduplica, reordena ni
 * corrige (peculiaridades conservadas: `escorar` sic en 13, `limites` sin tilde
 * en 10/11, `ocupación` minúscula en la tabla mamá/papá, mayúsculas sin tilde
 * `SITUACION LEGAL` / `HABITOS FAMILIARES`, salto 14→16, bloques de firma
 * literales).
 */
import { z } from 'zod';

// =========================================================================
// Encabezado e identificación
// =========================================================================

/**
 * Línea institucional literal (§4.1 Bloque A): `JARDIN DE NIÑOS "CELESTINO FREINET"`.
 * Conserva la JARDIN sin tilde y las comillas tipográficas.
 */
export const ENCABEZADO_INSTITUCION =
  'JARDIN DE NIÑOS “CELESTINO FREINET”';
export const TITULO_CUESTIONARIO = 'CUESTIONARIO A PADRES DE FAMILIA';

/**
 * Líneas de cierre literales (§4.1 Bloque F). Son `const` (no editables);
 * sirven de auditoría de literalidad.
 */
export const CIERRE_MENSAJE_GRACIAS =
  'GRACIAS POR SU TIEMPO PARA CONTESTAR ESTE CUESTIONARIO.';
export const CIERRE_MENSAJE_RECABADA =
  'LA INFORMACIÓN RECABADA SERVIRA AL DOCENTE PARA COMPRENDER ALGUNAS ACTITUDES DEL ALUMNO; PARA PLANEAR, VALORAR E INFORMAR PERTINENTEMENTE SOBRE LA ATENCION EDUCATIVA MAS ASERTIVA.';

/**
 * Bloque D (padres separados) — encabezado + etiquetas de pregunta (§4.1).
 */
export const PADRES_SEPARADOS_ENCABEZADO =
  'EN CASO DE PADRES SEPARADOS RESPONDER LAS SIGUIENTES PREGUNTAS';

/**
 * Etiquetas de las firmas (literal §4.1 Bloque F).
 * No se persiste URL ni hash; sólo el nombre tecleado (D11-11 / E1).
 */
export const FIRMA_ETIQUETA_MAMA = 'NOMBRE Y FIRMA DE MAMÁ';
export const FIRMA_ETIQUETA_PAPA = 'NOMBRE Y FIRMA DE PAPÁ';

// =========================================================================
// Bloque B — Datos de MAMÁ y PAPÁ (tabla 6 filas × 2 columnas)
// =========================================================================

/**
 * Etiquetas literales de las filas del bloque B (§4.1 Bloque B).
 * Etiqueta #5 conserva la minúscula inicial (`ocupación`).
 */
export const PROGENITOR_ETIQUETAS = [
  { orden: 1, etiqueta: 'Nombre' },
  { orden: 2, etiqueta: 'Teléfono celular' },
  { orden: 3, etiqueta: 'Edad' },
  { orden: 4, etiqueta: 'Nivel de estudios' },
  { orden: 5, etiqueta: 'ocupación' },
  { orden: 6, etiqueta: 'Horario de trabajo' },
] as const satisfies ReadonlyArray<{ orden: number; etiqueta: string }>;

export const PROGENITOR_TOTAL = PROGENITOR_ETIQUETAS.length; // 6

// =========================================================================
// Bloque C — SITUACION LEGAL DE LA FAMILIA (5 casillas + texto)
// =========================================================================

/**
 * Bloque C — 5 casillas booleanas (`casados`, `unión libre`, `divorciados`,
 * `madre soltera`) + campo texto `¿con quién vive el alumno?` (casilla-pregunta
 * adjunta en el PDF, tras los dos primeros).
 *
 * Orden visual del PDF (literal, §4.1 Bloque C):
 *   línea 1: casados | unión libre | ¿con quién vive el alumno?
 *   línea 2: divorciados | madre soltera
 */
export const SITUACION_LEGAL_ENCABEZADO = 'SITUACION LEGAL DE LA FAMILIA';
export const SITUACION_LEGAL_TEXTO_CONQUIENVIVE_PREGUNTA = '¿con quién vive el alumno?';

// =========================================================================
// Bloque D — Padres separados (condicional, §4.1)
// =========================================================================

export const PADRES_SEPARADOS_PREGUNTA_PATRIA = '¿quién tiene la patria potestad?';
export const PADRES_SEPARADOS_PREGUNTA_CONVIVE = '¿convive con la otra parte (papá o mamá)?';
export const PADRES_SEPARADOS_SUBCAMPO_EXPLICACION =
  'si no es así, explique brevemente por qué?';

// =========================================================================
// Bloque E — HABITOS FAMILIARES (15 ítems con salto 14→16)
// =========================================================================

/**
 * Bloque E — 15 ítems en orden literal (1,2,3,4,5,6,7,8,9,10,11,12,13,14,16).
 * Conserva el salto 14→16 (no existe ítem 15), peculiaridades ortográficas
 * (`escorar` sic en 13, `limites` sin tilde en 10/11, `mencione` minúscula en
 * 9 y 11, inicio con `¿después` minúscula en 2) y capitalización mixta.
 */
export const HABITOS_FAMILIARES = [
  {
    orden: 1,
    pregunta: '¿Cuántos hijos tienen?',
    subcampo: '¿Qué lugar ocupa el alumno?',
  },
  {
    orden: 2,
    pregunta: '¿después del horario de clases quien es responsable del alumno?',
    subcampo: null,
  },
  {
    orden: 3,
    pregunta: '¿con quién duerme el alumno?',
    subcampo: '¿se viste solo?',
  },
  {
    orden: 4,
    pregunta: '¿Quién lo apoya en las tareas?',
    subcampo: '¿con quién juega?',
  },
  {
    orden: 5,
    pregunta:
      '¿qué aparatos tecnológicos utiliza el alumno? (computadora, video juegos, celular o Tablet) ¿Quién supervisa su uso?',
    subcampo: null,
  },
  {
    orden: 6,
    pregunta: '¿Cuánto tiempo ve la televisión?',
    subcampo: '¿Qué programación le gusta?',
  },
  {
    orden: 7,
    pregunta: '¿su hijo tiene tareas de colaboración en casa? ¿Cuáles son?',
    subcampo: '¿si no las cumple, que ocurre?',
  },
  {
    orden: 8,
    pregunta: '¿tiene actividades extraescolares por la tarde? ¿Cuáles?',
    subcampo: null,
  },
  {
    orden: 9,
    pregunta: 'mencione las actividades que realizan en familia',
    subcampo: null,
  },
  {
    orden: 10,
    pregunta: '¿Quién marca los limites y reglas en casa?',
    subcampo: null,
  },
  {
    orden: 11,
    pregunta: 'mencione 2 limites o reglas establecidas en casa para el menor',
    subcampo: null,
  },
  {
    orden: 12,
    pregunta:
      '¿ustedes que consideran que se le dificulta a su hijo en el aprendizaje escolar?',
    subcampo: null,
  },
  {
    orden: 13,
    pregunta: '¿Qué esperan que aprenda su hijo en este ciclo escorar?',
    subcampo: null,
  },
  {
    orden: 14,
    pregunta: '¿Qué esperan de su maestra?',
    subcampo: null,
  },
  {
    orden: 16,
    pregunta:
      '¿a qué se comprometen como padres de familia para lograr los aprendizajes de su hijo?',
    subcampo: null,
  },
] as const satisfies ReadonlyArray<{
  orden: number;
  pregunta: string;
  subcampo: string | null;
}>;

export const HABITOS_FAMILIARES_TOTAL = HABITOS_FAMILIARES.length; // 15
/** Conjunto de orden numérico permitido en ítems (1..14,16). */
export const HABITOS_FAMILIARES_ORDENES_PERMITIDOS = HABITOS_FAMILIARES.map(
  (h) => h.orden,
) as readonly number[];

// =========================================================================
// Esquemas zod (espejo de §4.2; server-side)
// =========================================================================

/** Tamaño máximo compartido (1.5 KB). */
const MAX = 1500;

/** Bloque A — identificación (A.NOMBRE / A.FECHA). */
export const IdentificacionFamiliarSchema = z.object({
  nombreAlumno: z.string().max(200).default(''),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'fechaNacimiento debe ser YYYY-MM-DD')
    .or(z.literal(''))
    .default(''),
});
export type IdentificacionFamiliar = z.infer<typeof IdentificacionFamiliarSchema>;

/** Bloque B — progenitor (6 campos con longitudes máximas alineadas al §4.2). */
export const BloqueProgenitorSchema = z.object({
  nombre: z.string().max(200).default(''),
  telefonoCelular: z.string().max(50).default(''),
  edad: z.string().max(20).default(''),
  nivelEstudios: z.string().max(200).default(''),
  ocupacion: z.string().max(200).default(''),
  horarioTrabajo: z.string().max(300).default(''),
});
export type BloqueProgenitor = z.infer<typeof BloqueProgenitorSchema>;

/** Bloque C — situación legal: 4 booleanos + texto. */
export const BloqueSituacionLegalSchema = z.object({
  casados: z.boolean().default(false),
  unionLibre: z.boolean().default(false),
  divorciados: z.boolean().default(false),
  madreSoltera: z.boolean().default(false),
  conQuienVive: z.string().max(500).default(''),
});
export type BloqueSituacionLegal = z.infer<typeof BloqueSituacionLegalSchema>;

/** Bloque D — padres separados (condicional; null cuando no aplica). */
export const BloquePadresSeparadosSchema = z.object({
  patriaPotestad: z.string().max(500).default(''),
  conviveOtraParte: z.boolean().default(false),
  explicacion: z.string().max(1000).default(''),
});
export type BloquePadresSeparados = z.infer<typeof BloquePadresSeparadosSchema>;

/** Ítem de HABITOS_FAMILIARES (orden ∈ {1..14,16}; pregunta/subcampo literal). */
export const BloqueHabitoItemSchema = z.object({
  orden: z
    .number()
    .int()
    .refine((n) => HABITOS_FAMILIARES_ORDENES_PERMITIDOS.includes(n), {
      message: 'orden de hábito debe estar en {1..14,16}',
    }),
  pregunta: z.string(),
  subcampo: z.string().nullable(),
  respuesta: z.string().max(MAX).default(''),
  respuestaSubcampo: z.string().max(MAX).nullable().default(null),
});
export type BloqueHabito = z.infer<typeof BloqueHabitoItemSchema>;

/** Bloque E — HABITOS_FAMILIARES — exactamente 15 ítems. */
export const BloqueHabitosFamiliaresSchema = z.object({
  items: z
    .array(BloqueHabitoItemSchema)
    .length(HABITOS_FAMILIARES_TOTAL, 'Hábitos familiares debe tener 15 ítems'),
});
export type BloqueHabitosFamiliares = z.infer<typeof BloqueHabitosFamiliaresSchema>;

/** Bloque F — cierre literal (`const` para auditoría de literalidad). */
export const BloqueCierreSchema = z.object({
  mensajeGracias: z.literal(CIERRE_MENSAJE_GRACIAS),
  mensajeRecabada: z.literal(CIERRE_MENSAJE_RECABADA),
});
export type BloqueCierre = z.infer<typeof BloqueCierreSchema>;

/** Firmas (D11-11): nombre tecleado de mamá y papá; sin URL/has/imagen. */
export const BloqueFirmasSchema = z.object({
  nombreMama: z.string().max(200).default(''),
  nombrePapa: z.string().max(200).default(''),
});
export type BloqueFirmas = z.infer<typeof BloqueFirmasSchema>;

/** `respuestas` v1 (jsonb) — espejo literal del §4.2. */
export const RespuestasFamiliarV1Schema = z.object({
  identificacion: IdentificacionFamiliarSchema,
  mama: BloqueProgenitorSchema,
  papa: BloqueProgenitorSchema,
  situacionLegal: BloqueSituacionLegalSchema,
  padresSeparados: BloquePadresSeparadosSchema.nullable(),
  habitosFamiliares: BloqueHabitosFamiliaresSchema,
  cierre: BloqueCierreSchema,
  firmas: BloqueFirmasSchema,
});
export type RespuestasFamiliarV1 = z.infer<typeof RespuestasFamiliarV1Schema>;

// =========================================================================
// Fila persistida v1
// =========================================================================

/** Estados (idénticos a la infantil `0022`). */
export const ENTREVISTA_FAMILIAR_ESTADOS = [
  'borrador',
  'completa',
  'archivada',
] as const;
export type EstadoEntrevistaFamiliar = (typeof ENTREVISTA_FAMILIAR_ESTADOS)[number];

export type EntrevistaFamiliarV1 = {
  id: string;
  alumno_id: string;
  grupo_id: string;
  docente_id: string;
  cct: string;
  ciclo_escolar: string;
  respuestas: RespuestasFamiliarV1;
  fecha_aplicacion: string; // ISO 'YYYY-MM-DD'
  estado: EstadoEntrevistaFamiliar;
  created_at: string;
  updated_at: string;
};

export type EntrevistaFamiliarResult<T = EntrevistaFamiliarV1> = {
  ok: boolean;
  data?: T;
  error?: string;
  field?: string;
  id?: string;
};

// =========================================================================
// Helpers de validación literal y construcción
// =========================================================================

/**
 * Valida que el `respuestas` recibido cumpla el contrato §4.2 (zod) **y** que
 * cada texto literal sea idéntico al array fuente (literalidad AC-FF1/AC-FF2).
 * Devuelve `{ ok, data, error }`.
 */
export function validateCuestionarioFamiliarV1(
  input: unknown,
):
  | { ok: true; data: RespuestasFamiliarV1 }
  | { ok: false; error: string } {
  const parsed = RespuestasFamiliarV1Schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? 'Cuestionario familiar inválido' };
  }

  // Literalidad bloque E: orden, pregunta, subcampo byte-a-byte contra §4.1.
  const items = parsed.data.habitosFamiliares.items;
  for (let i = 0; i < HABITOS_FAMILIARES.length; i++) {
    const it = items[i];
    const exp = HABITOS_FAMILIARES[i];
    if (!it || !exp) return { ok: false, error: 'Hábitos familiares incompletos' };
    if (it.orden !== exp.orden) {
      return { ok: false, error: `Orden incorrecto en hábito ${i + 1}` };
    }
    if (it.pregunta !== exp.pregunta) {
      return {
        ok: false,
        error: `Pregunta alterada en hábito ${exp.orden} (debe ser literal)`,
      };
    }
    const expectedSub = exp.subcampo;
    const gotSub = it.subcampo;
    if (expectedSub === null && gotSub !== null) {
      return {
        ok: false,
        error: `Subcampo inesperado en hábito ${exp.orden}`,
      };
    }
    if (expectedSub !== null && gotSub !== expectedSub) {
      return {
        ok: false,
        error: `Subcampo alterado en hábito ${exp.orden} (debe ser literal)`,
      };
    }
  }

  // Literalidad firmas: etiquetas (no se persisten, pero las validamos en `validate*`
  // vía constant — aquí basta con `z.string()` que ya exige string). El contrato
  // cierra con las etiquetas literales en la UI; el server NO las reescribe.
  return { ok: true, data: parsed.data };
}

/**
 * Construye el esqueleto vacío de `respuestas` con 15 ítems pre-poblados con
 * el orden/pregunta/subcampo literales y respuestas vacías. Útil para crear
 * una entrevista nueva sin disparar la validación (la docente introduce los
 * valores poco a poco).
 */
export function buildRespuestasFamiliaresVaciasV1(prefill?: {
  nombreAlumno?: string;
  fechaNacimiento?: string;
}): RespuestasFamiliarV1 {
  return {
    identificacion: {
      nombreAlumno: prefill?.nombreAlumno ?? '',
      fechaNacimiento: prefill?.fechaNacimiento ?? '',
    },
    mama: {
      nombre: '',
      telefonoCelular: '',
      edad: '',
      nivelEstudios: '',
      ocupacion: '',
      horarioTrabajo: '',
    },
    papa: {
      nombre: '',
      telefonoCelular: '',
      edad: '',
      nivelEstudios: '',
      ocupacion: '',
      horarioTrabajo: '',
    },
    situacionLegal: {
      casados: false,
      unionLibre: false,
      divorciados: false,
      madreSoltera: false,
      conQuienVive: '',
    },
    padresSeparados: null,
    habitosFamiliares: {
      items: HABITOS_FAMILIARES.map((h) => ({
        orden: h.orden,
        pregunta: h.pregunta,
        subcampo: h.subcampo,
        respuesta: '',
        respuestaSubcampo: null,
      })),
    },
    cierre: {
      mensajeGracias: CIERRE_MENSAJE_GRACIAS,
      mensajeRecabada: CIERRE_MENSAJE_RECABADA,
    },
    firmas: {
      nombreMama: '',
      nombrePapa: '',
    },
  };
}

/**
 * Helper para la UI: cuando se marca `casados` o `unionLibre`, los campos del
 * bloque D se ocultan y se persisten como `null`. Cuando se marca
 * `divorciados` o `madreSoltera` se persiste un objeto con tres campos vacíos.
 */
export function normalizarPadresSeparadosSegunSituacion(
  prev: BloquePadresSeparados | null | undefined,
  situacion: BloqueSituacionLegal,
): BloquePadresSeparados | null {
  const aplica = !situacion.casados && !situacion.unionLibre;
  if (!aplica) return null;
  if (prev) return prev;
  return {
    patriaPotestad: '',
    conviveOtraParte: false,
    explicacion: '',
  };
}
