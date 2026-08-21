/**
 * Unit: services/alumnos/entrevista-actions — SPEC_TEC_09 (SPEC-20260820-09) v2.1.
 *
 * Cubre AC-12..AC-27 del handoff IMPL-20260820-08:
 *  - Literalidad bloque 1 (23 preguntas) y bloque 2 (16 celdas: 14 preguntas + 2 dibujos).
 *  - Literalidad directorio (4 contactos con etiquetas literales + duplicado).
 *  - Sin inferir: no permitir alterar/reordenar/deduplicar/preguntas en dibujos.
 *  - upsertEntrevista: gate aviso (A1), ownership, upsert idempotente, validar v2 + directorio.
 *  - archivarEntrevista: transición borrador|completa → archivada, idempotente.
 *  - getEntrevista: ownership + ciclo activo (devuelve respuestas + directorio).
 *  - No exponer deleteEntrevista (AC-27 retención C1+C2).
 *  - No-IA por construcción (AC-21): ningún archivo de la capa IA importa ni
 *    referencia `entrevista_inicial_alumno`, `entrevista-actions` o el módulo
 *    `@/services/alumnos/entrevista-actions` ni `entrevista-evidencia`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import {
  upsertEntrevista,
  archivarEntrevista,
  getEntrevista,
} from '@/services/alumnos/entrevista-actions';
import {
  ENTREVISTA_BLOQUE1,
  ENTREVISTA_BLOQUE1_TOTAL,
  ENTREVISTA_BLOQUE2_CELDAS,
  ENTREVISTA_BLOQUE2_TOTAL,
  ENTREVISTA_BLOQUE2_ENCABEZADO,
  ENTREVISTA_BLOQUE2_PREGUNTAS,
  ENTREVISTA_BLOQUE2_DIBUJOS,
  DIRECTORIO_ENCABEZADO,
  DIRECTORIO_ETIQUETAS,
  DIRECTORIO_TOTAL,
  buildRespuestasVaciasV2,
  buildDirectorioVacio,
  validateCuestionarioV2,
} from '@/types/entrevista';

// ============ Mocks ============

const userId = '11111111-1111-1111-1111-111111111111';
const alumnoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const grupoId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const cct = '09DPR1234Z';
const ciclo = '2025-2026';

// Estado mutable del "DB" mockeado para `from('entrevista_inicial_alumno')`.
const entrevistaStore: Array<Record<string, unknown>> = [];

type SupabaseLike = {
  from: (table: string) => unknown;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

function makeBuilder(
  table: string,
  opts: { skipAviso?: boolean; skipAlumno?: boolean } = {},
) {
  // Para cada operación retornamos un builder que cumpla la forma que el código
  // espera según el método chain `.from(...).select/.insert/.update/.upsert/.eq/.maybeSingle/.single`.
  const builder: Record<string, unknown> = {};
  const filters: Array<[string, unknown]> = [];

  function applyFilters<T>(rows: T[]): T[] {
    return rows.filter((row) =>
      filters.every(([k, v]) => (row as Record<string, unknown>)[k] === v),
    );
  }

  builder.eq = vi.fn((col: string, val: unknown) => {
    filters.push([col, val]);
    return builder;
  });
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => {
    if (table === 'alumno') {
      if (opts.skipAlumno) return { data: null, error: null };
      const rows = [
        {
          id: alumnoId,
          nombre: 'Alumno Demo',
          grado: '1°',
          ciclo_escolar: ciclo,
          grupo_id: grupoId,
          docente_id: userId,
          cct,
        },
      ];
      const out = applyFilters(rows);
      return { data: out[0] ?? null, error: null };
    }
    if (table === 'grupo') {
      const rows = [
        {
          id: grupoId,
          grado: '1°',
          grupo: 'A',
          ciclo_escolar: ciclo,
          cct,
          docente_id: userId,
          activo: true,
        },
      ];
      const out = applyFilters(rows);
      return { data: out[0] ?? null, error: null };
    }
    if (table === 'aceptacion_aviso_privacidad') {
      if (opts.skipAviso) return { data: null, error: null };
      const rows = [{ id: 'aviso-1', docente_id: userId, cct }];
      const out = applyFilters(rows);
      return { data: out[0] ?? null, error: null };
    }
    if (table === 'entrevista_inicial_alumno') {
      const out = applyFilters(entrevistaStore);
      return { data: out[0] ?? null, error: null };
    }
    return { data: null, error: null };
  });
  builder.single = vi.fn(async () => {
    if (table === 'entrevista_inicial_alumno') {
      const out = applyFilters(entrevistaStore);
      return { data: out[0] ?? null, error: null };
    }
    return { data: null, error: null };
  });
  builder.select = vi.fn((_sel?: string) => builder);
  builder.insert = vi.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
    const rows = Array.isArray(payload) ? payload : [payload];
    for (const row of rows) {
      entrevistaStore.push({ id: `e-${entrevistaStore.length + 1}`, ...row });
    }
    return builder;
  });
  builder.update = vi.fn((patch: Record<string, unknown>) => {
    const out = applyFilters(entrevistaStore);
    for (const row of out) {
      Object.assign(row, patch);
    }
    return builder;
  });
  builder.upsert = vi.fn(
    (payload: Record<string, unknown>, _opts?: unknown) => {
      // idempotente: si ya existe el unique (alumno_id, ciclo_escolar, tipo_entrevista), update.
      const e = (payload as Record<string, unknown>);
      const idx = entrevistaStore.findIndex(
        (x) =>
          x.alumno_id === e.alumno_id &&
          x.ciclo_escolar === e.ciclo_escolar &&
          x.tipo_entrevista === e.tipo_entrevista,
      );
      if (idx >= 0) {
        Object.assign(entrevistaStore[idx]!, e);
        return builder;
      }
      entrevistaStore.push({ id: `e-${entrevistaStore.length + 1}`, ...payload });
      return builder;
    },
  );
  return builder;
}

const mockSupabase: SupabaseLike = {
  from: vi.fn((table: string) => makeBuilder(table)),
  auth: {
    getUser: async () => ({ data: { user: { id: userId } } }),
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => mockSupabase,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ============ Helpers de payload válido ============

function makeValidPayload() {
  const respuestas = buildRespuestasVaciasV2({
    nombreAlumno: 'Alumno Demo',
    fechaAplicacion: '2026-08-20',
  });
  const directorio = buildDirectorioVacio({ nombreAlumno: 'Alumno Demo' });
  return { respuestas, directorio };
}

// ============ Tests ============

beforeEach(() => {
  entrevistaStore.length = 0;
  // Reset from to a clean factory (opts default = correcto).
  mockSupabase.from = vi.fn((table: string) => makeBuilder(table));
  vi.clearAllMocks();
});

describe('IMPL-20260820-08 — entrevista-actions (AC-12..AC-27)', () => {
  it('AC-12: bloque 1 tiene exactamente 23 ítems en orden 1..23', () => {
    expect(ENTREVISTA_BLOQUE1).toHaveLength(ENTREVISTA_BLOQUE1_TOTAL);
    expect(ENTREVISTA_BLOQUE1_TOTAL).toBe(23);
    ENTREVISTA_BLOQUE1.forEach((q, i) => {
      expect(q.orden).toBe(i + 1);
    });
  });

  it('AC-12: bloque 2 tiene exactamente 16 celdas (14 preguntas + 2 dibujos) en orden 1..16', () => {
    expect(ENTREVISTA_BLOQUE2_CELDAS).toHaveLength(ENTREVISTA_BLOQUE2_TOTAL);
    expect(ENTREVISTA_BLOQUE2_TOTAL).toBe(16);
    expect(ENTREVISTA_BLOQUE2_PREGUNTAS).toBe(14);
    expect(ENTREVISTA_BLOQUE2_DIBUJOS).toBe(2);
    ENTREVISTA_BLOQUE2_CELDAS.forEach((c, i) => {
      expect(c.orden).toBe(i + 1);
    });
  });

  it('AC-12: directorio tiene exactamente 4 contactos', () => {
    expect(DIRECTORIO_ETIQUETAS).toHaveLength(DIRECTORIO_TOTAL);
    expect(DIRECTORIO_TOTAL).toBe(4);
  });

  it('AC-13: validateCuestionarioV2 acepta 23 ítems + 16 celdas + 4 contactos literales', () => {
    const { respuestas, directorio } = makeValidPayload();
    const out = validateCuestionarioV2({ respuestas, directorio });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.respuestas.entrevista_inicial.items).toHaveLength(23);
      expect(out.data.respuestas.ambiente_familiar_escuela.celdas).toHaveLength(16);
      expect(out.data.directorio.contactos).toHaveLength(4);
    }
  });

  it('AC-13: validateCuestionarioV2 rechaza pregunta alterada en bloque 1', () => {
    const { respuestas, directorio } = makeValidPayload();
    const alterado = {
      ...respuestas,
      entrevista_inicial: {
        items: respuestas.entrevista_inicial.items.map((it) =>
          it.orden === 1 ? { ...it, pregunta: '¿Como te llamas?' } : it,
        ),
      },
    };
    const out = validateCuestionarioV2({ respuestas: alterado, directorio });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/ítem 1/i);
  });

  it('AC-13: validateCuestionarioV2 rechaza instrucción alterada en celda de dibujo', () => {
    const { respuestas, directorio } = makeValidPayload();
    const alterado = {
      ...respuestas,
      ambiente_familiar_escuela: {
        ...respuestas.ambiente_familiar_escuela,
        celdas: respuestas.ambiente_familiar_escuela.celdas.map((c) =>
          c.orden === 1 ? { ...c, instruccion: 'Haz un dibujo de ti mismo' } : c,
        ),
      },
    };
    const out = validateCuestionarioV2({ respuestas: alterado, directorio });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/celda 1/i);
  });

  it('AC-18: validateCuestionarioV2 rechaza dibujo con tipo "pregunta"', () => {
    const { respuestas, directorio } = makeValidPayload();
    // Forzar la celda 1 a "pregunta" — debe rechazarse.
    const alterado = {
      ...respuestas,
      ambiente_familiar_escuela: {
        ...respuestas.ambiente_familiar_escuela,
        celdas: respuestas.ambiente_familiar_escuela.celdas.map((c) => {
          if (c.orden !== 1) return c;
          return {
            orden: 1,
            columna: 'ambiente_familiar' as const,
            tipo: 'pregunta' as const,
            pregunta: 'Describe tu dibujo',
          };
        }),
      },
    };
    const out = validateCuestionarioV2({ respuestas: alterado, directorio });
    expect(out.ok).toBe(false);
  });

  it('AC-15: validateCuestionarioV2 rechaza etiqueta del directorio alterada', () => {
    const { respuestas, directorio } = makeValidPayload();
    const alterado = {
      ...directorio,
      contactos: directorio.contactos.map((c) =>
        c.orden === 1 ? { ...c, etiqueta: 'Nombre del papá' } : c,
      ),
    };
    const out = validateCuestionarioV2({ respuestas, directorio: alterado });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/contacto 1/i);
  });

  it('AC-12: validateCuestionarioV2 rechaza bloque 1 con 22 ó 24 ítems', () => {
    const { respuestas, directorio } = makeValidPayload();
    const corto = {
      ...respuestas,
      entrevista_inicial: { items: respuestas.entrevista_inicial.items.slice(0, 22) },
    };
    expect(validateCuestionarioV2({ respuestas: corto, directorio }).ok).toBe(false);
    const largo = {
      ...respuestas,
      entrevista_inicial: {
        items: [
          ...respuestas.entrevista_inicial.items,
          {
            orden: 24,
            pregunta: '¿otra?',
            respuesta: '',
          },
        ],
      },
    };
    expect(validateCuestionarioV2({ respuestas: largo, directorio }).ok).toBe(false);
  });

  it('AC-12: validateCuestionarioV2 rechaza bloque 2 con 15 ó 17 celdas', () => {
    const { respuestas, directorio } = makeValidPayload();
    const corto = {
      ...respuestas,
      ambiente_familiar_escuela: {
        ...respuestas.ambiente_familiar_escuela,
        celdas: respuestas.ambiente_familiar_escuela.celdas.slice(0, 15),
      },
    };
    expect(validateCuestionarioV2({ respuestas: corto, directorio }).ok).toBe(false);
    const extraCelda = {
      orden: 17,
      columna: 'ambiente_familiar' as const,
      tipo: 'pregunta' as const,
      pregunta: '¿otra?',
    };
    const largo = {
      ...respuestas,
      ambiente_familiar_escuela: {
        ...respuestas.ambiente_familiar_escuela,
        celdas: [...respuestas.ambiente_familiar_escuela.celdas, extraCelda],
      },
    };
    expect(validateCuestionarioV2({ respuestas: largo, directorio }).ok).toBe(false);
  });

  it('AC-15: validateCuestionarioV2 rechaza directorio con 3 ó 5 contactos', () => {
    const { respuestas, directorio } = makeValidPayload();
    const corto = {
      ...directorio,
      contactos: directorio.contactos.slice(0, 3),
    };
    expect(validateCuestionarioV2({ respuestas, directorio: corto }).ok).toBe(false);
    const extra = {
      orden: 5,
      etiqueta: 'otro',
      nombre: '',
      telefono: '',
    };
    const largo = {
      ...directorio,
      contactos: [...directorio.contactos, extra],
    };
    expect(validateCuestionarioV2({ respuestas, directorio: largo }).ok).toBe(false);
  });

  it('AC-16: el array literal conserva los duplicados (preguntas en bloque 1 y bloque 2)', () => {
    // Duplicados §4.0: ¿Cómo te llamas?, ¿Cuántos años tienes?,
    // ¿Qué te gusta hacer en la escuela?, ¿A qué te gusta jugar? (cap. distinta).
    expect(ENTREVISTA_BLOQUE1.filter((q) => q.pregunta === '¿Cómo te llamas?')).toHaveLength(1);
    const enBloque2ComoTeLlamas = ENTREVISTA_BLOQUE2_CELDAS.filter(
      (c) => c.tipo === 'pregunta' && c.pregunta === '¿Cómo te llamas?',
    );
    expect(enBloque2ComoTeLlamas).toHaveLength(1); // bloque 2 fila 2 AF

    expect(ENTREVISTA_BLOQUE1.filter((q) => q.pregunta === '¿Cuántos años tienes?')).toHaveLength(1);
    const enBloque2Edad = ENTREVISTA_BLOQUE2_CELDAS.filter(
      (c) => c.tipo === 'pregunta' && c.pregunta === '¿Cuántos años tienes?',
    );
    expect(enBloque2Edad).toHaveLength(1); // bloque 2 fila 5 AF

    const enBloque1HacerEscuela = ENTREVISTA_BLOQUE1.filter(
      (q) => q.pregunta === '¿Qué te gusta hacer en la escuela?',
    );
    expect(enBloque1HacerEscuela).toHaveLength(1);
    const enBloque2HacerEscuela = ENTREVISTA_BLOQUE2_CELDAS.filter(
      (c) => c.tipo === 'pregunta' && c.pregunta === '¿Qué te gusta hacer en la escuela?',
    );
    expect(enBloque2HacerEscuela).toHaveLength(1); // bloque 2 fila 3 ESC

    // Bloque 1 usa minúscula «a», bloque 2 mayúscula «A» — se conserva la diferencia.
    const b1Jugar = ENTREVISTA_BLOQUE1.find((q) => q.orden === 9);
    expect(b1Jugar?.pregunta).toBe('¿a qué te gusta jugar?');
    const b2Jugar = ENTREVISTA_BLOQUE2_CELDAS.find(
      (c) => c.orden === 13,
    );
    if (b2Jugar?.tipo === 'pregunta') {
      expect(b2Jugar.pregunta).toBe('¿A qué te gusta jugar?');
    } else {
      throw new Error('celda 13 debería ser pregunta');
    }
  });

  it('AC-17: el array fuente conserva las peculiaridades literales (§4.0)', () => {
    expect(ENTREVISTA_BLOQUE2_ENCABEZADO.lineaInstitucion).toBe(
      'JARDIN DE NIÑOS “CELESTINO FREINET”',
    ); // JARDIN sin tilde
    expect(ENTREVISTA_BLOQUE2_ENCABEZADO.titulo).toBe('ENTEVISTA AL ALUMNO'); // falta R
    expect(DIRECTORIO_ENCABEZADO.titulo).toBe('DIRECTORIO CELESTINO FREINET 24-25');
    expect(DIRECTORIO_ENCABEZADO.subtitulo).toBe(
      '2° “A” Educadora: María Dolores Marín Pastrana',
    );
    expect(DIRECTORIO_ENCABEZADO.encabezadoTelefonos).toBe(
      'Números telefónicos en caso de emergencia',
    );

    // Bloque 1: peculiaridades §4.0
    const ord6 = ENTREVISTA_BLOQUE1.find((q) => q.orden === 6);
    expect(ord6?.pregunta).toBe('¿con quien vives en tu casa?');
    const ord7 = ENTREVISTA_BLOQUE1.find((q) => q.orden === 7);
    expect(ord7?.pregunta).toBe('¿tienes mascotas?');
    const ord16 = ENTREVISTA_BLOQUE1.find((q) => q.orden === 16);
    expect(ord16?.pregunta).toBe('¿tienes teléfono o Tablet?');
    const ord18 = ENTREVISTA_BLOQUE1.find((q) => q.orden === 18);
    expect(ord18?.pregunta).toBe('¿te gusta venir a la escuela?');

    // Directorio: la etiqueta «Nombre de familiar y parentesco» aparece dos veces.
    const dup = DIRECTORIO_ETIQUETAS.filter(
      (e) => e.etiqueta === 'Nombre de familiar y parentesco',
    );
    expect(dup).toHaveLength(2);
  });

  it('AC-25: upsertEntrevista sin aviso → error con mensaje del gate A1', async () => {
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, { skipAviso: true }));

    const { respuestas, directorio } = makeValidPayload();
    const res = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas,
      directorio,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/aviso de privacidad/i);
  });

  it('AC-25: upsertEntrevista con alumno ajeno → "Alumno no encontrado"', async () => {
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, { skipAlumno: true }));

    const { respuestas, directorio } = makeValidPayload();
    const res = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas,
      directorio,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Alumno no encontrado');
  });

  it('AC-25: upsertEntrevista crea la fila y la segunda llamada actualiza la misma fila', async () => {
    const { respuestas, directorio } = makeValidPayload();
    const r1 = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas,
      directorio,
    });
    expect(r1.ok).toBe(true);
    expect(entrevistaStore).toHaveLength(1);
    expect(entrevistaStore[0]?.directorio).toBeDefined();

    const updatedRespuestas = buildRespuestasVaciasV2({
      nombreAlumno: 'Alumno Demo',
      fechaAplicacion: '2026-08-20',
    });
    updatedRespuestas.entrevista_inicial.items[0]!.respuesta = 'Me llamo Demo';
    const updatedDirectorio = buildDirectorioVacio({ nombreAlumno: 'Alumno Demo' });
    updatedDirectorio.contactos[0]!.nombre = 'Padre Demo';
    updatedDirectorio.contactos[0]!.telefono = '555-1234';

    const r2 = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-21',
      estado: 'completa',
      respuestas: updatedRespuestas,
      directorio: updatedDirectorio,
    });
    expect(r2.ok).toBe(true);
    expect(entrevistaStore).toHaveLength(1); // misma fila (idempotente)
    expect(entrevistaStore[0]?.estado).toBe('completa');
    const stored = entrevistaStore[0]?.respuestas as {
      entrevista_inicial: { items: Array<{ orden: number; respuesta: string }> };
    };
    expect(stored.entrevista_inicial.items[0]?.respuesta).toBe('Me llamo Demo');
    const storedDir = entrevistaStore[0]?.directorio as {
      contactos: Array<{ orden: number; nombre: string; telefono: string }>;
    };
    expect(storedDir.contactos[0]?.nombre).toBe('Padre Demo');
    expect(storedDir.contactos[0]?.telefono).toBe('555-1234');
  });

  it('AC-25: upsertEntrevista rechaza cuando el directorio no tiene 4 contactos', async () => {
    const { respuestas, directorio } = makeValidPayload();
    const directorioInvalido = {
      ...directorio,
      contactos: directorio.contactos.slice(0, 3),
    };
    const res = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas,
      directorio: directorioInvalido,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/4 contactos|directorio/i);
  });

  it('AC-27: archivarEntrevista transiciona completa → archivada', async () => {
    entrevistaStore.push({
      id: 'e-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      tipo_entrevista: 'nino',
      respuestas: {},
      directorio: {},
      fecha_aplicacion: '2026-08-20',
      estado: 'completa',
    });
    const res = await archivarEntrevista(alumnoId);
    expect(res.ok).toBe(true);
    expect(entrevistaStore[0]?.estado).toBe('archivada');
  });

  it('AC-27: archivarEntrevista idempotente (segunda vez no duplica ni error)', async () => {
    entrevistaStore.push({
      id: 'e-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      tipo_entrevista: 'nino',
      respuestas: {},
      directorio: {},
      fecha_aplicacion: '2026-08-20',
      estado: 'archivada',
    });
    const res = await archivarEntrevista(alumnoId);
    expect(res.ok).toBe(true);
    expect(entrevistaStore).toHaveLength(1); // no duplica
  });

  it('AC-27: el módulo NO expone deleteEntrevista', async () => {
    const mod = await import('@/services/alumnos/entrevista-actions');
    expect((mod as unknown as Record<string, unknown>).deleteEntrevista).toBeUndefined();
    expect((mod as unknown as Record<string, unknown>).deleteEntrevistas).toBeUndefined();
  });

  it('el módulo solo exporta funciones async (contrato "use server" de Next.js)', async () => {
    // Next.js evalúa en runtime que todo export de un módulo 'use server' sea
    // una función (ensureServerEntryExports); un export no-función (p.ej. un
    // objeto helper) lanza "A 'use server' file can only export async
    // functions" al invocar cualquier acción del módulo.
    const mod = await import('@/services/alumnos/entrevista-actions');
    const entries = Object.entries(mod as unknown as Record<string, unknown>);
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, value] of entries) {
      expect(typeof value, `export "${name}" debe ser función`).toBe('function');
      expect(
        (value as { constructor: { name: string } }).constructor.name,
        `export "${name}" debe ser función async`,
      ).toBe('AsyncFunction');
    }
    expect((mod as unknown as Record<string, unknown>).__test_only__).toBeUndefined();
  });

  it('AC-25: getEntrevista devuelve la fila del ciclo activo (respuestas + directorio)', async () => {
    const { respuestas, directorio } = makeValidPayload();
    entrevistaStore.push({
      id: 'e-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      tipo_entrevista: 'nino',
      respuestas,
      directorio,
      fecha_aplicacion: '2026-08-20',
      estado: 'borrador',
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
    });
    const res = await getEntrevista(alumnoId);
    expect(res.ok).toBe(true);
    expect(res.data?.id).toBe('e-1');
    expect(res.data?.respuestas.entrevista_inicial.items).toHaveLength(23);
    expect(res.data?.directorio.contactos).toHaveLength(4);
  });
});

// ============ AC-21: No-IA por construcción — scan real de la capa IA ============
// Verificación REAL (no declarativa): escanea cada archivo TS de la capa IA
// (rutas API `/ia/*`, `services/ia/*`, `lib/ia/*`) y falla si alguno contiene
// alguna referencia a la tabla, al bucket o al módulo de entrevista.
describe('AC-21 (IMPL-20260820-08) — No-IA extendido: scan real de la capa IA', () => {
  const REPO_ROOT = resolve(__dirname, '../../../../');
  // Rutas absolutas (relativas al repo) que la capa IA debe mantener limpias.
  const IA_BLACKLIST_DIRS = [
    'app/api/planeaciones/[id]/ia',
    'app/api/recursos-aula/ia-sugerir-uso',
    'services/ia',
    'lib/ia',
  ];
  // Patrones prohibidos: cualquier referencia a la entrevista debe fallar este test.
  const FORBIDDEN_PATTERNS: ReadonlyArray<{ name: string; rx: RegExp }> = [
    { name: 'entrevista_inicial_alumno', rx: /\bentrevista_inicial_alumno\b/ },
    { name: 'entrevista-actions', rx: /@?\/services\/alumnos\/entrevista-actions\b/ },
    { name: 'types/entrevista', rx: /@?\/types\/entrevista\b/ },
    { name: 'entrevista-evidencia', rx: /\bentrevista-evidencia\b/ },
  ];

  function walk(dir: string, acc: string[] = []): string[] {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return acc;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full, acc);
      } else if (st.isFile() && /\.tsx?$/u.test(name)) {
        acc.push(full);
      }
    }
    return acc;
  }

  it('AC-21: existe al menos un archivo bajo cada directorio IA (sanity)', () => {
    for (const rel of IA_BLACKLIST_DIRS) {
      const abs = join(REPO_ROOT, rel);
      const files = walk(abs);
      expect(files.length, `Directorio IA esperado no presente: ${rel}`).toBeGreaterThan(0);
    }
  });

  it('AC-21: ningún archivo de la capa IA referencia la tabla, bucket o módulo de entrevista', () => {
    const offenders: Array<{ file: string; pattern: string; snippet: string }> = [];
    const seen = new Set<string>();
    for (const rel of IA_BLACKLIST_DIRS) {
      const abs = join(REPO_ROOT, rel);
      for (const file of walk(abs)) {
        if (seen.has(file)) continue;
        seen.add(file);
        const content = readFileSync(file, 'utf8');
        for (const { name, rx } of FORBIDDEN_PATTERNS) {
          if (rx.test(content)) {
            const lineMatch = content.split(/\r?\n/).findIndex((l) => rx.test(l));
            const line = lineMatch >= 0 ? content.split(/\r?\n/)[lineMatch]!.trim() : '';
            offenders.push({
              file: relative(REPO_ROOT, file),
              pattern: name,
              snippet: line.slice(0, 160),
            });
          }
        }
      }
    }
    if (offenders.length > 0) {
      const msg = offenders
        .map((o) => `  - ${o.file} :: ${o.pattern} :: ${o.snippet}`)
        .join('\n');
      throw new Error(
        `AC-21 violated: la capa IA referencia la entrevista. Offenders:\n${msg}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});