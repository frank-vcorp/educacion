/**
 * Unit: services/alumnos/entrevista-actions — SPEC_TEC_09 (SPEC-20260820-09).
 *
 * Cubre AC-6, AC-7, AC-11 del handoff IMPL-20260820-03:
 *  - upsertEntrevista: gate aviso, ownership, upsert idempotente, validar 21 ítems.
 *  - archivarEntrevista: transición borrador|completa → archivada, idempotente.
 *  - validateCuestionarioLiteral: 21 ítems literales (orden + pregunta).
 *  - getEntrevista: ownership + ciclo activo.
 *  - No exponer deleteEntrevista (AC-11 retención C1+C2).
 *  - No-IA por construcción (AC-8): ningún archivo de la capa IA importa ni
 *    referencia `entrevista_inicial_alumno`, `entrevista-actions` o el módulo
 *    `@/services/alumnos/entrevista-actions`. Verificado mediante scan real
 *    de archivos en IMPL-20260820-04 (P3-3 de QA-20260820-02).
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
  ENTREVISTA_CUESTIONARIO,
  buildRespuestasVacias,
  validateCuestionarioLiteral,
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

// ============ Tests ============

beforeEach(() => {
  entrevistaStore.length = 0;
  // Reset from to a clean factory (opts default = correcto).
  mockSupabase.from = vi.fn((table: string) => makeBuilder(table));
  vi.clearAllMocks();
});

describe('IMPL-20260820-03 — entrevista-actions (AC-6, AC-7, AC-11)', () => {
  it('AC-7: validateCuestionarioLiteral acepta 21 ítems literales', () => {
    const resp = buildRespuestasVacias({
      nombreAlumno: 'Demo',
      grado: '1°',
      grupo: 'A',
      fechaAplicacion: '2026-08-20',
    });
    const out = validateCuestionarioLiteral(resp);
    expect(out.ok).toBe(true);
    expect(out.data?.items).toHaveLength(21);
    expect(out.data?.items[0]?.pregunta).toBe('¿Cómo te llamas?');
    expect(out.data?.items[6]?.pregunta).toBe('¿Cuál es tu color Favorito?');
    expect(out.data?.items[11]?.pregunta).toBe('¿A que te gusta jugar? ¿Con quién?');
  });

  it('AC-7: validateCuestionarioLiteral rechaza 20 ítems', () => {
    const resp = buildRespuestasVacias();
    const out = validateCuestionarioLiteral({ items: resp.items.slice(0, 20) });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/21 ítems|exactamente/i);
  });

  it('AC-7: validateCuestionarioLiteral rechaza pregunta alterada', () => {
    const resp = buildRespuestasVacias();
    const alterado = {
      items: resp.items.map((it) =>
        it.orden === 7 ? { ...it, pregunta: '¿Cuál es tu color favorito?' } : it,
      ),
    };
    const out = validateCuestionarioLiteral(alterado);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/ítem 7/i);
  });

  it('AC-6: upsertEntrevista sin aviso → error con mensaje del gate A1', async () => {
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, { skipAviso: true }));

    const resp = buildRespuestasVacias();
    const res = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas: resp,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/aviso de privacidad/i);
  });

  it('AC-6: upsertEntrevista con alumno ajeno → "Alumno no encontrado"', async () => {
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, { skipAlumno: true }));

    const resp = buildRespuestasVacias();
    const res = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas: resp,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Alumno no encontrado');
  });

  it('AC-6: upsertEntrevista crea la fila y la segunda llamada actualiza la misma fila', async () => {
    const resp = buildRespuestasVacias({
      nombreAlumno: 'Demo',
      grado: '1°',
      grupo: 'A',
      fechaAplicacion: '2026-08-20',
    });
    const r1 = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas: resp,
    });
    expect(r1.ok).toBe(true);
    expect(entrevistaStore).toHaveLength(1);

    const updated = buildRespuestasVacias({
      nombreAlumno: 'Demo',
      grado: '1°',
      grupo: 'A',
      fechaAplicacion: '2026-08-20',
    });
    updated.items[0]!.respuesta = 'Me llamo Demo';
    const r2 = await upsertEntrevista({
      alumnoId,
      fechaAplicacion: '2026-08-21',
      estado: 'completa',
      respuestas: updated,
    });
    expect(r2.ok).toBe(true);
    expect(entrevistaStore).toHaveLength(1); // misma fila
    expect(entrevistaStore[0]?.estado).toBe('completa');
    expect((entrevistaStore[0]?.respuestas as { items: Array<{ orden: number; respuesta: string }> }).items[0]?.respuesta).toBe('Me llamo Demo');
  });

  it('AC-11: archivarEntrevista transiciona completa → archivada', async () => {
    entrevistaStore.push({
      id: 'e-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      tipo_entrevista: 'nino',
      respuestas: {},
      fecha_aplicacion: '2026-08-20',
      estado: 'completa',
    });
    const res = await archivarEntrevista(alumnoId);
    expect(res.ok).toBe(true);
    expect(entrevistaStore[0]?.estado).toBe('archivada');
  });

  it('AC-11: archivarEntrevista idempotente (segunda vez no duplica ni error)', async () => {
    entrevistaStore.push({
      id: 'e-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      tipo_entrevista: 'nino',
      respuestas: {},
      fecha_aplicacion: '2026-08-20',
      estado: 'archivada',
    });
    const res = await archivarEntrevista(alumnoId);
    expect(res.ok).toBe(true);
    expect(entrevistaStore).toHaveLength(1); // no duplica
  });

  it('AC-11: el módulo NO expone deleteEntrevista', async () => {
    const mod = await import('@/services/alumnos/entrevista-actions');
    expect((mod as unknown as Record<string, unknown>).deleteEntrevista).toBeUndefined();
    expect((mod as unknown as Record<string, unknown>).deleteEntrevistas).toBeUndefined();
  });

  it('AC-6: getEntrevista devuelve la fila del ciclo activo', async () => {
    entrevistaStore.push({
      id: 'e-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      tipo_entrevista: 'nino',
      respuestas: { items: [] },
      fecha_aplicacion: '2026-08-20',
      estado: 'borrador',
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
    });
    const res = await getEntrevista(alumnoId);
    expect(res.ok).toBe(true);
    expect(res.data?.id).toBe('e-1');
  });

  it('AC-7: el cuestionario tiene exactamente 21 ítems y orden 1..21', () => {
    expect(ENTREVISTA_CUESTIONARIO).toHaveLength(21);
    ENTREVISTA_CUESTIONARIO.forEach((q, i) => {
      expect(q.orden).toBe(i + 1);
    });
  });
});

// ============ P3-3 (QA-20260820-02) — No-IA por construcción ============
// Verificación REAL (no declarativa): escanea cada archivo TS de la capa IA
// (rutas API `/ia/*`, `services/ia/*`, `lib/ia/*`) y falla si alguno contiene
// alguna referencia a la tabla o al módulo de entrevista.
//
// Cobertura verificada:
//   app/api/planeaciones/[id]/ia/{help-redaccion,pulir-pdf,variantes-bloque}/route.ts
//   app/api/recursos-aula/ia-sugerir-uso/route.ts
//   services/ia/*.ts
//   lib/ia/*.ts
describe('P3-3 (IMPL-20260820-04) — AC-8 No-IA: scan real de la capa IA', () => {
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

  it('AC-8: existe al menos un archivo bajo cada directorio IA (sanity)', () => {
    for (const rel of IA_BLACKLIST_DIRS) {
      const abs = join(REPO_ROOT, rel);
      const files = walk(abs);
      expect(files.length, `Directorio IA esperado no presente: ${rel}`).toBeGreaterThan(0);
    }
  });

  it('AC-8: ningún archivo de la capa IA referencia la tabla o el módulo de entrevista', () => {
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
        `AC-8 violated: la capa IA referencia la entrevista. Offenders:\n${msg}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});
