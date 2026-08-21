/**
 * Contrato de la entrevista inicial del niño — v2 (SPEC_TEC_09 §4 + ADR-20260820-05).
 *
 * Cuestionario LITERAL e INMUTABLE (DEC-20260820-05). Reproduce el documento completo
 * `docx_extract/ENTREVISTA INICIAL.docx.pdf` (tres páginas) en tres bloques:
 *   (1) Entrevista inicial — 23 preguntas literales (orden 1..23).
 *   (2) Ambiente Familiar / Escuela — 16 celdas (8 filas × 2 columnas): 2 instrucciones
 *       de dibujo (tipo:'dibujo') + 14 preguntas (tipo:'pregunta').
 *   (3) Directorio de emergencia — 4 contactos con etiqueta literal + nombre + teléfono.
 *
 * Regla dura: el texto literal NO se modifica, deduplica, reordena ni corrige
 * (peculiaridades como `ENTEVISTA`, `JARDIN` sin tilde, `¿con quien vives…?`,
 * `Tablet` con T mayúscula, duplicados de capitalización `¿a qué…?` vs `¿A qué…?`
 * se conservan tal cual — ver §4.0 de SPEC_TEC_09).
 */
import { z } from 'zod';

// =========================================================================
// Bloque 1 — Entrevista inicial (23 preguntas literales; §4.1)
// =========================================================================

/**
 * Bloque 1 — 23 preguntas literales en orden 1..23 (SPEC_TEC_09 §4.1).
 * El array conserva duplicados, capitalización, acentos y peculiaridades (§4.0):
 *   - orden 6:  ¿con quien vives en tu casa?  (minúscula, "quien" sin tilde)
 *   - orden 7:  ¿tienes mascotas?
 *   - orden 9:  ¿a qué te gusta jugar?       («a» minúscula)
 *   - orden 12: ¿te leen cuentos en casa?    (minúscula)
 *   - orden 13: ¿Quién?                      (en misma celda que 12 — orden preservado)
 *   - orden 16: ¿tienes teléfono o Tablet?   («Tablet» con T mayúscula)
 *   - orden 17: ¿Qué ves ahí?                (en misma línea que 16 — orden preservado)
 *   - orden 18: ¿te gusta venir a la escuela? (minúscula)
 *   - orden 19: ¿Qué te gusta hacer en la escuela? (también en bloque 2, fila 3)
 */
export const ENTREVISTA_BLOQUE1 = [
  { orden: 1, pregunta: '¿Cómo te llamas?' },
  { orden: 2, pregunta: '¿Cuántos años tienes?' },
  { orden: 3, pregunta: '¿Cómo se llama tu mamá?' },
  { orden: 4, pregunta: '¿Cómo se llama tu papá?' },
  { orden: 5, pregunta: '¿Cuántos hermanos tienes?' },
  { orden: 6, pregunta: '¿con quien vives en tu casa?' },
  { orden: 7, pregunta: '¿tienes mascotas?' },
  { orden: 8, pregunta: '¿Qué haces en casa cuando llegas de la escuela?' },
  { orden: 9, pregunta: '¿a qué te gusta jugar?' },
  { orden: 10, pregunta: '¿con quién juegas?' },
  { orden: 11, pregunta: '¿Cuál es tu juguete favorito?' },
  { orden: 12, pregunta: '¿te leen cuentos en casa?' },
  { orden: 13, pregunta: '¿Quién?' },
  { orden: 14, pregunta: '¿Cuál es tu cuento favorito?' },
  { orden: 15, pregunta: '¿Qué te gusta ver en la televisión?' },
  { orden: 16, pregunta: '¿tienes teléfono o Tablet?' },
  { orden: 17, pregunta: '¿Qué ves ahí?' },
  { orden: 18, pregunta: '¿te gusta venir a la escuela?' },
  { orden: 19, pregunta: '¿Qué te gusta hacer en la escuela?' },
  { orden: 20, pregunta: '¿Qué te pone alegre?' },
  { orden: 21, pregunta: '¿Qué te pone triste?' },
  { orden: 22, pregunta: '¿Qué te pone enojado?' },
  { orden: 23, pregunta: '¿Qué te da miedo?' },
] as const satisfies ReadonlyArray<{ orden: number; pregunta: string }>;

export const ENTREVISTA_BLOQUE1_TOTAL = ENTREVISTA_BLOQUE1.length; // 23

// =========================================================================
// Bloque 2 — Ambiente Familiar / Escuela (16 celdas = 2 dibujos + 14 preguntas; §4.2)
// =========================================================================

/**
 * Encabezado del bloque 2 (literal, §4.2):
 *   lineaInstitucion: "JARDIN DE NIÑOS “CELESTINO FREINET”"  (sic: JARDIN sin tilde)
 *   titulo:           "ENTEVISTA AL ALUMNO"                    (sic: falta la primera R)
 */
export const ENTREVISTA_BLOQUE2_ENCABEZADO = {
  lineaInstitucion: 'JARDIN DE NIÑOS “CELESTINO FREINET”',
  titulo: 'ENTEVISTA AL ALUMNO',
} as const;

/**
 * Bloque 2 — 16 celdas en orden de lectura (fila 1..8, ambiente_familiar | escuela)
 * según SPEC_TEC_09 §4.2 / tabla de 8 filas × 2 columnas.
 *
 *  - Celdas 1, 2 (fila 1):  tipo 'dibujo' (instrucciones literales, evidencia imagen|null).
 *  - Celdas 3..16 (filas 2..8): tipo 'pregunta'.
 *
 * Peculiaridades conservadas (§4.0):
 *   - celda 8  (fila 2 ambiente_familiar):  ¿Cómo te llamas?     (duplicado con bloque 1)
 *   - celda 13 (fila 5 ambiente_familiar):  ¿Cuántos años tienes? (duplicado con bloque 1)
 *   - celda 9  (fila 3 escuela):            ¿Qué te gusta hacer en la escuela? (dup. bloque 1)
 *   - celda 15 (fila 7 ambiente_familiar):  ¿A qué te gusta jugar? (mayúscula «A»; duplicado con bloque 1, orden 9, que va con minúscula)
 *   - bloque 1, orden 6 «¿con quien vives en tu casa?» NO es duplicado textual
 *     del bloque 2, orden 4 «¿Quién vive contigo?» (redacciones distintas — §4.0).
 */
export const ENTREVISTA_BLOQUE2_CELDAS = [
  // Fila 1: dos instrucciones de dibujo (D9-10 — no son preguntas)
  {
    orden: 1,
    columna: 'ambiente_familiar' as const,
    tipo: 'dibujo' as const,
    instruccion: 'Realiza un dibujo de cómo eres tú',
  },
  {
    orden: 2,
    columna: 'escuela' as const,
    tipo: 'dibujo' as const,
    instruccion: 'Dibuja a tus mejores amigos en la escuela',
  },
  // Fila 2
  {
    orden: 3,
    columna: 'ambiente_familiar' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Cómo te llamas?',
  },
  {
    orden: 4,
    columna: 'escuela' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Te gusta la escuela?',
  },
  // Fila 3
  {
    orden: 5,
    columna: 'ambiente_familiar' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Dónde vives?',
  },
  {
    orden: 6,
    columna: 'escuela' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Qué te gusta hacer en la escuela?',
  },
  // Fila 4
  {
    orden: 7,
    columna: 'ambiente_familiar' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Quién vive contigo?',
  },
  {
    orden: 8,
    columna: 'escuela' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Qué te desagrada de la escuela?',
  },
  // Fila 5
  {
    orden: 9,
    columna: 'ambiente_familiar' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Cuántos años tienes?',
  },
  {
    orden: 10,
    columna: 'escuela' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Quiénes son tus mejores amigos en la escuela?',
  },
  // Fila 6
  {
    orden: 11,
    columna: 'ambiente_familiar' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Qué haces cuando estás en tu casa?',
  },
  {
    orden: 12,
    columna: 'escuela' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Alguien te molesta en el salón?',
  },
  // Fila 7
  {
    orden: 13,
    columna: 'ambiente_familiar' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿A qué te gusta jugar?',
  },
  {
    orden: 14,
    columna: 'escuela' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Te agrada tu maestra?',
  },
  // Fila 8
  {
    orden: 15,
    columna: 'ambiente_familiar' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Quién es tu persona favorita en casa?',
  },
  {
    orden: 16,
    columna: 'escuela' as const,
    tipo: 'pregunta' as const,
    pregunta: '¿Eres feliz en la escuela?',
  },
] as const satisfies ReadonlyArray<{
  orden: number;
  columna: 'ambiente_familiar' | 'escuela';
  tipo: 'dibujo' | 'pregunta';
  instruccion?: string;
  pregunta?: string;
}>;

export const ENTREVISTA_BLOQUE2_TOTAL = ENTREVISTA_BLOQUE2_CELDAS.length; // 16
export const ENTREVISTA_BLOQUE2_PREGUNTAS = ENTREVISTA_BLOQUE2_CELDAS.filter(
  (c) => c.tipo === 'pregunta',
).length; // 14
export const ENTREVISTA_BLOQUE2_DIBUJOS = ENTREVISTA_BLOQUE2_CELDAS.filter(
  (c) => c.tipo === 'dibujo',
).length; // 2

// =========================================================================
// Bloque 3 — Directorio de emergencia (4 contactos; §4.3)
// =========================================================================

/**
 * Encabezado del bloque 3 (literal, §4.3):
 *   titulo:              "DIRECTORIO CELESTINO FREINET 24-25"  (sic: 24-25 del documento)
 *   subtitulo:           "2° “A” Educadora: María Dolores Marín Pastrana" (sic)
 *   encabezadoTelefonos: "Números telefónicos en caso de emergencia"
 */
export const DIRECTORIO_ENCABEZADO = {
  titulo: 'DIRECTORIO CELESTINO FREINET 24-25',
  subtitulo: '2° “A” Educadora: María Dolores Marín Pastrana',
  encabezadoTelefonos: 'Números telefónicos en caso de emergencia',
} as const;

/**
 * Bloque 3 — 4 contactos en orden, con etiqueta literal inmutable.
 * Etiqueta «Nombre de familiar y parentesco» aparece DOS veces (familiar 1 y 2) — se conserva.
 */
export const DIRECTORIO_ETIQUETAS = [
  { orden: 1, etiqueta: 'Nombre del padre' },
  { orden: 2, etiqueta: 'Nombre de la madre' },
  { orden: 3, etiqueta: 'Nombre de familiar y parentesco' },
  { orden: 4, etiqueta: 'Nombre de familiar y parentesco' },
] as const satisfies ReadonlyArray<{ orden: number; etiqueta: string }>;

export const DIRECTORIO_TOTAL = DIRECTORIO_ETIQUETAS.length; // 4

// =========================================================================
// Estado / tipo (sin cambios respecto a v1; vigentes por 0022)
// =========================================================================

export const ENTREVISTA_ESTADOS = ['borrador', 'completa', 'archivada'] as const;
export type EstadoEntrevista = (typeof ENTREVISTA_ESTADOS)[number];

export const ENTREVISTA_TIPOS = ['nino'] as const;
export type TipoEntrevista = (typeof ENTREVISTA_TIPOS)[number];

// =========================================================================
// Esquemas zod (espejo de §4B.1 y §4B.2; validación en server action)
// =========================================================================

/** MIME permitidos para evidencia de dibujo (imágenes). */
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Ítem de respuesta del bloque 1. */
export const Bloque1ItemSchema = z.object({
  orden: z.number().int().min(1).max(ENTREVISTA_BLOQUE1_TOTAL),
  pregunta: z.string().min(1).max(500),
  respuesta: z.string().max(1000),
});
export type Bloque1Item = z.infer<typeof Bloque1ItemSchema>;

/** Celda de dibujo del bloque 2 (sin `pregunta`, con `evidencia` opcional). */
export const Bloque2CeldaDibujoSchema = z.object({
  orden: z.number().int().min(1).max(ENTREVISTA_BLOQUE2_TOTAL),
  columna: z.enum(['ambiente_familiar', 'escuela']),
  tipo: z.literal('dibujo'),
  instruccion: z.string().min(1).max(500),
  evidencia: z
    .object({
      url: z.string().min(1).max(2000),
      mime: z.enum(MIMES_PERMITIDOS),
    })
    .nullable(),
});

/** Celda de pregunta del bloque 2. */
export const Bloque2CeldaPreguntaSchema = z.object({
  orden: z.number().int().min(1).max(ENTREVISTA_BLOQUE2_TOTAL),
  columna: z.enum(['ambiente_familiar', 'escuela']),
  tipo: z.literal('pregunta'),
  pregunta: z.string().min(1).max(500),
  respuesta: z.string().max(1000),
});

export const Bloque2CeldaSchema = z.discriminatedUnion('tipo', [
  Bloque2CeldaDibujoSchema,
  Bloque2CeldaPreguntaSchema,
]);
export type Bloque2Celda = z.infer<typeof Bloque2CeldaSchema>;

/** Encabezado del bloque 2 (`lineaInstitucion` y `titulo` son `const` literales). */
export const Bloque2EncabezadoSchema = z.object({
  lineaInstitucion: z.literal(ENTREVISTA_BLOQUE2_ENCABEZADO.lineaInstitucion),
  titulo: z.literal(ENTREVISTA_BLOQUE2_ENCABEZADO.titulo),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'fecha debe ser YYYY-MM-DD'),
  nombreAlumno: z.string().max(200),
});

/** Bloque 2 completo. */
export const Bloque2Schema = z.object({
  encabezado: Bloque2EncabezadoSchema,
  celdas: z
    .array(Bloque2CeldaSchema)
    .length(ENTREVISTA_BLOQUE2_TOTAL, 'El bloque 2 debe tener exactamente 16 celdas'),
});

/** Bloque 1 completo. */
export const Bloque1Schema = z.object({
  items: z
    .array(Bloque1ItemSchema)
    .length(ENTREVISTA_BLOQUE1_TOTAL, 'La entrevista inicial debe tener exactamente 23 ítems'),
});

/** `respuestas` v2 = `{ entrevista_inicial, ambiente_familiar_escuela }` (§4B.1). */
export const RespuestasV2Schema = z.object({
  entrevista_inicial: Bloque1Schema,
  ambiente_familiar_escuela: Bloque2Schema,
});
export type Bloque2 = z.infer<typeof Bloque2Schema>;
export type RespuestasV2 = z.infer<typeof RespuestasV2Schema>;

/** Contacto del directorio. */
export const DirectorioContactoSchema = z.object({
  orden: z.number().int().min(1).max(DIRECTORIO_TOTAL),
  etiqueta: z.string().min(1).max(200),
  nombre: z.string().max(200),
  telefono: z.string().max(50),
});
export type DirectorioContacto = z.infer<typeof DirectorioContactoSchema>;

/** `directorio` v2 (§4B.2). */
export const DirectorioSchema = z.object({
  titulo: z.literal(DIRECTORIO_ENCABEZADO.titulo),
  subtitulo: z.literal(DIRECTORIO_ENCABEZADO.subtitulo),
  nombreAlumno: z.string().max(200),
  encabezadoTelefonos: z.literal(DIRECTORIO_ENCABEZADO.encabezadoTelefonos),
  contactos: z
    .array(DirectorioContactoSchema)
    .length(DIRECTORIO_TOTAL, 'El directorio debe tener exactamente 4 contactos'),
});
export type Directorio = z.infer<typeof DirectorioSchema>;

// =========================================================================
// Fila persistida (v2). Incluye `directorio` (columna nueva por `0023`).
// =========================================================================

export type EntrevistaInicialV2 = {
  id: string;
  alumno_id: string;
  grupo_id: string;
  docente_id: string;
  cct: string;
  ciclo_escolar: string;
  tipo_entrevista: TipoEntrevista;
  respuestas: RespuestasV2;
  directorio: Directorio;
  fecha_aplicacion: string; // ISO 'YYYY-MM-DD'
  estado: EstadoEntrevista;
  created_at: string;
  updated_at: string;
};

export type EntrevistaResult<T = EntrevistaInicialV2> = {
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
 * Valida que el `respuestas` y `directorio` recibidos cumplan el contrato v2
 * (zod) **y** que cada texto literal sea idéntico al array fuente (literalidad
 * AC-13..AC-17). Devuelve `{ ok, data, error }`.
 */
export function validateCuestionarioV2(input: {
  respuestas: unknown;
  directorio: unknown;
}): { ok: true; data: { respuestas: RespuestasV2; directorio: Directorio } } | { ok: false; error: string } {
  const respParsed = RespuestasV2Schema.safeParse(input.respuestas);
  if (!respParsed.success) {
    const issue = respParsed.error.issues[0];
    return { ok: false, error: issue?.message ?? 'Cuestionario inválido' };
  }
  const dirParsed = DirectorioSchema.safeParse(input.directorio);
  if (!dirParsed.success) {
    const issue = dirParsed.error.issues[0];
    return { ok: false, error: issue?.message ?? 'Directorio inválido' };
  }

  // Literalidad bloque 1: orden 1..23 + pregunta idéntica.
  const items = respParsed.data.entrevista_inicial.items;
  for (let i = 0; i < ENTREVISTA_BLOQUE1.length; i++) {
    const it = items[i];
    const exp = ENTREVISTA_BLOQUE1[i];
    if (!it || !exp) return { ok: false, error: 'Cuestionario incompleto' };
    if (it.orden !== exp.orden) {
      return { ok: false, error: `Orden incorrecto en ítem ${i + 1}` };
    }
    if (it.pregunta !== exp.pregunta) {
      return {
        ok: false,
        error: `Pregunta alterada en ítem ${exp.orden} (debe ser literal)`,
      };
    }
  }

  // Literalidad bloque 2: orden 1..16, tipo, columna, texto (instruccion|pregunta).
  const celdas = respParsed.data.ambiente_familiar_escuela.celdas;
  for (let i = 0; i < ENTREVISTA_BLOQUE2_CELDAS.length; i++) {
    const c = celdas[i];
    const exp = ENTREVISTA_BLOQUE2_CELDAS[i];
    if (!c || !exp) return { ok: false, error: 'Bloque 2 incompleto' };
    if (c.orden !== exp.orden) {
      return { ok: false, error: `Orden incorrecto en celda ${i + 1}` };
    }
    if (c.columna !== exp.columna) {
      return { ok: false, error: `Columna incorrecta en celda ${exp.orden}` };
    }
    if (c.tipo !== exp.tipo) {
      return { ok: false, error: `Tipo incorrecto en celda ${exp.orden}` };
    }
    if (exp.tipo === 'dibujo') {
      if (c.tipo !== 'dibujo') {
        return { ok: false, error: `Tipo incorrecto en celda ${exp.orden}` };
      }
      if (c.instruccion !== exp.instruccion) {
        return {
          ok: false,
          error: `Instrucción alterada en celda ${exp.orden} (debe ser literal)`,
        };
      }
    } else {
      if (c.tipo !== 'pregunta') {
        return { ok: false, error: `Tipo incorrecto en celda ${exp.orden}` };
      }
      if (c.pregunta !== exp.pregunta) {
        return {
          ok: false,
          error: `Pregunta alterada en celda ${exp.orden} (debe ser literal)`,
        };
      }
    }
  }

  // Literalidad directorio: orden 1..4 + etiqueta idéntica (incluye el duplicado).
  const contactos = dirParsed.data.contactos;
  for (let i = 0; i < DIRECTORIO_ETIQUETAS.length; i++) {
    const ct = contactos[i];
    const exp = DIRECTORIO_ETIQUETAS[i];
    if (!ct || !exp) return { ok: false, error: 'Directorio incompleto' };
    if (ct.orden !== exp.orden) {
      return { ok: false, error: `Orden incorrecto en contacto ${i + 1}` };
    }
    if (ct.etiqueta !== exp.etiqueta) {
      return {
        ok: false,
        error: `Etiqueta alterada en contacto ${exp.orden} (debe ser literal)`,
      };
    }
  }

  return {
    ok: true,
    data: { respuestas: respParsed.data, directorio: dirParsed.data },
  };
}

/**
 * Construye un `respuestas` v2 vacío respetando orden, texto y tipo literales
 * (bloque 1: 23 preguntas; bloque 2: 16 celdas, 2 dibujos con `evidencia:null`
 * + 14 preguntas). El encabezado del bloque 2 se pre-puebla con los datos del
 * alumno/grupo/fecha (server-side los reemplaza con los valores reales).
 */
export function buildRespuestasVaciasV2(prefill?: {
  nombreAlumno?: string;
  fechaAplicacion?: string;
}): RespuestasV2 {
  const items = ENTREVISTA_BLOQUE1.map((q) => ({
    orden: q.orden,
    pregunta: q.pregunta,
    respuesta: '',
  }));

  const celdas = ENTREVISTA_BLOQUE2_CELDAS.map((c) => {
    if (c.tipo === 'dibujo') {
      return {
        orden: c.orden,
        columna: c.columna,
        tipo: 'dibujo' as const,
        instruccion: c.instruccion,
        evidencia: null,
      };
    }
    return {
      orden: c.orden,
      columna: c.columna,
      tipo: 'pregunta' as const,
      pregunta: c.pregunta,
      respuesta: '',
    };
  });

  return {
    entrevista_inicial: { items },
    ambiente_familiar_escuela: {
      encabezado: {
        lineaInstitucion: ENTREVISTA_BLOQUE2_ENCABEZADO.lineaInstitucion,
        titulo: ENTREVISTA_BLOQUE2_ENCABEZADO.titulo,
        fecha: prefill?.fechaAplicacion ?? '',
        nombreAlumno: prefill?.nombreAlumno ?? '',
      },
      celdas,
    },
  };
}

/** Construye un `directorio` v2 vacío con etiquetas literales y 4 contactos vacíos. */
export function buildDirectorioVacio(prefill?: { nombreAlumno?: string }): Directorio {
  return {
    titulo: DIRECTORIO_ENCABEZADO.titulo,
    subtitulo: DIRECTORIO_ENCABEZADO.subtitulo,
    nombreAlumno: prefill?.nombreAlumno ?? '',
    encabezadoTelefonos: DIRECTORIO_ENCABEZADO.encabezadoTelefonos,
    contactos: DIRECTORIO_ETIQUETAS.map((e) => ({
      orden: e.orden,
      etiqueta: e.etiqueta,
      nombre: '',
      telefono: '',
    })),
  };
}