/**
 * Contrato de la entrevista inicial del niño.
 * SPEC_TEC_09 (SPEC-20260820-09) §4 + ADR-20260820-02.
 *
 * El cuestionario es LITERAL e INMUTABLE (DEC-20260820-01). Cualquier cambio
 * de texto, orden, capitalización o número de ítems es DECISIÓN FUNCIONAL
 * de Frank/ATLAS, no decisión reversible de SOFIA.
 */
import { z } from 'zod';

/**
 * Cuestionario literal (SPEC_TEC_09 §4).
 * Mantener sincronizado con la tabla del SPEC — `pregunta` se persiste tal cual.
 */
export const ENTREVISTA_CUESTIONARIO: ReadonlyArray<{
  readonly orden: number;
  readonly pregunta: string;
  readonly naturaleza: 'abierta' | 'compuesta' | 'emocional' | 'administrativa';
}> = [
  { orden: 1, pregunta: '¿Cómo te llamas?', naturaleza: 'abierta' },
  { orden: 2, pregunta: '¿Cuántos años tienes?', naturaleza: 'abierta' },
  {
    orden: 3,
    pregunta: '¿Cuántos hermanos tienes? ¿Cómo se llaman?',
    naturaleza: 'compuesta',
  },
  { orden: 4, pregunta: '¿Cómo se llama tu papá?', naturaleza: 'abierta' },
  { orden: 5, pregunta: '¿Con quién vives en tu casa?', naturaleza: 'abierta' },
  { orden: 6, pregunta: '¿Cómo se llama tu mamá?', naturaleza: 'abierta' },
  { orden: 7, pregunta: '¿Cuál es tu color Favorito?', naturaleza: 'abierta' },
  {
    orden: 8,
    pregunta: '¿Tienes mascota? ¿Qué animal es? ¿Cómo se llama?',
    naturaleza: 'compuesta',
  },
  { orden: 9, pregunta: '¿Cuál es tu comida favorita?', naturaleza: 'abierta' },
  { orden: 10, pregunta: '¿Cuáles son tus frutas favoritas?', naturaleza: 'abierta' },
  {
    orden: 11,
    pregunta: '¿Cuál es tu película (caricatura) favorita?',
    naturaleza: 'abierta',
  },
  {
    orden: 12,
    pregunta: '¿A que te gusta jugar? ¿Con quién?',
    naturaleza: 'compuesta',
  },
  { orden: 13, pregunta: '¿Qué te hace feliz?', naturaleza: 'emocional' },
  { orden: 14, pregunta: '¿Qué te pone triste?', naturaleza: 'emocional' },
  { orden: 15, pregunta: '¿Qué te hace enojar?', naturaleza: 'emocional' },
  { orden: 16, pregunta: '¿Qué te da miedo?', naturaleza: 'emocional' },
  { orden: 17, pregunta: 'Observaciones:', naturaleza: 'abierta' },
  { orden: 18, pregunta: 'Nombre del Alumno:', naturaleza: 'administrativa' },
  { orden: 19, pregunta: 'Grado:', naturaleza: 'administrativa' },
  { orden: 20, pregunta: 'Grupo:', naturaleza: 'administrativa' },
  { orden: 21, pregunta: 'Fecha de aplicación.', naturaleza: 'administrativa' },
] as const;

export const ENTREVISTA_TOTAL_ITEMS = ENTREVISTA_CUESTIONARIO.length; // 21

/**
 * Estado de la entrevista (D9-07: 'archivada' al finalizar el ciclo, C1+C2).
 * No se expone `deleteEntrevista` (retención C1+C2: conservar + archivar, no borrar).
 */
export const ENTREVISTA_ESTADOS = ['borrador', 'completa', 'archivada'] as const;
export type EstadoEntrevista = (typeof ENTREVISTA_ESTADOS)[number];

/**
 * Tipo de entrevista. En MVP solo 'nino' (DEC-20260820-01; entrevista familiar
 * fuera de alcance, OQ-20260820-04 open).
 */
export const ENTREVISTA_TIPOS = ['nino'] as const;
export type TipoEntrevista = (typeof ENTREVISTA_TIPOS)[number];

/**
 * Ítem de respuesta (SPEC_TEC_09 §4.1).
 * `pregunta` es INMUTABLE: la UI la muestra no editable y se persiste idéntica
 * a la tabla §4 (auditable, AC-7).
 */
export const RespuestaItemSchema = z.object({
  orden: z.number().int().min(1).max(ENTREVISTA_TOTAL_ITEMS),
  pregunta: z.string().min(1).max(500),
  respuesta: z.string().max(1000),
});

export const RespuestasSchema = z.object({
  items: z
    .array(RespuestaItemSchema)
    .length(ENTREVISTA_TOTAL_ITEMS, 'La entrevista debe tener exactamente 21 ítems'),
});

export type RespuestaItem = z.infer<typeof RespuestaItemSchema>;
export type Respuestas = z.infer<typeof RespuestasSchema>;

/**
 * Tipo de la fila persistida (contrato `entrevista_inicial_alumno`).
 * `alumno_id`/`grupo_id`/`docente_id`/`cct`/`ciclo_escolar` se derivan server-side
 * del grupo activo del docente; el cliente nunca los envía.
 */
export type EntrevistaInicial = {
  id: string;
  alumno_id: string;
  grupo_id: string;
  docente_id: string;
  cct: string;
  ciclo_escolar: string;
  tipo_entrevista: TipoEntrevista;
  respuestas: Respuestas;
  fecha_aplicacion: string; // ISO date 'YYYY-MM-DD'
  estado: EstadoEntrevista;
  created_at: string;
  updated_at: string;
};

export type EntrevistaResult<T = EntrevistaInicial> = {
  ok: boolean;
  data?: T;
  error?: string;
  field?: string;
  id?: string;
};

/**
 * Validador estructural del cuestionario contra la tabla §4.
 * Garantiza que el cliente no puede brincar, reordenar ni alterar el texto
 * literal de las preguntas (AC-7).
 */
export function validateCuestionarioLiteral(respuestas: unknown): {
  ok: boolean;
  data?: Respuestas;
  error?: string;
} {
  const parsed = RespuestasSchema.safeParse(respuestas);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? 'Cuestionario inválido' };
  }

  const items = parsed.data.items;
  const expected = ENTREVISTA_CUESTIONARIO;

  for (let i = 0; i < expected.length; i++) {
    const it = items[i];
    const exp = expected[i];
    if (!it || !exp) {
      return { ok: false, error: 'Cuestionario incompleto' };
    }
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

  return { ok: true, data: parsed.data };
}

/**
 * Helper: genera un `respuestas` inicial en blanco respetanto el orden y
 * `pregunta` literales. Los ítems 18-21 se pre-pueblan con datos del alumno/grupo
 * (server-side los reemplaza con los valores reales del alumno).
 */
export function buildRespuestasVacias(prefill?: {
  nombreAlumno?: string;
  grado?: string;
  grupo?: string;
  fechaAplicacion?: string;
}): Respuestas {
  const items = ENTREVISTA_CUESTIONARIO.map((q) => ({
    orden: q.orden,
    pregunta: q.pregunta,
    respuesta:
      q.orden === 18
        ? (prefill?.nombreAlumno ?? '')
        : q.orden === 19
          ? (prefill?.grado ?? '')
          : q.orden === 20
            ? (prefill?.grupo ?? '')
            : q.orden === 21
              ? (prefill?.fechaAplicacion ?? '')
              : '',
  }));
  return { items };
}
