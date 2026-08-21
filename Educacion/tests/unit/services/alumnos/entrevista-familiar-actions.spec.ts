/**
 * Unit: services/alumnos/entrevista-familiar-actions — SPEC_TEC_11 §9 (v1).
 *
 * Cubre AC-FF1..AC-FF11 (excepto AC-FF3..FF5 que son grep/E2E; ver handoff):
 *   - AC-FF1 cuestionario literal §4 (15 ítems {orden} ∈ {1..14,16}; peculiaridades).
 *   - AC-FF2 peculiaridades: salto 14→16, `escorar` sic en 13, `limites` sin tilde 10/11,
 *            `ocupación` minúscula, cierre literal.
 *   - AC-FF8 gate aviso (D11-07): sin aviso → error; con aviso → ok.
 *   - AC-FF9 edición in-place (D11-10): la 2ª llamada upsert actualiza la misma fila.
 *   - AC-FF10 archivado (D11-09): archivarEntrevistaFamiliar transiciona; idempotente;
 *            módulo NO expone deleteEntrevistaFamiliar.
 *   - AC-FF11 firma (D11-11): nombres tecleados como strings; sin upload/storage/imagen.
 *
 * Cubre además:
 *   - Sin exposición de deleteEntrevistaFamiliar en el módulo.
 *   - getEntrevistaFamiliar: ownership + ciclo activo.
 *   - AC-FF6 (separación): la infantil NO se referencia desde este módulo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  upsertEntrevistaFamiliar,
  archivarEntrevistaFamiliar,
  getEntrevistaFamiliar,
} from '@/services/alumnos/entrevista-familiar-actions';
import {
  HABITOS_FAMILIARES,
  HABITOS_FAMILIARES_TOTAL,
  HABITOS_FAMILIARES_ORDENES_PERMITIDOS,
  PROGENITOR_ETIQUETAS,
  PROGENITOR_TOTAL,
  buildRespuestasFamiliaresVaciasV1,
  validateCuestionarioFamiliarV1,
  CIERRE_MENSAJE_GRACIAS,
  CIERRE_MENSAJE_RECABADA,
  ENCABEZADO_INSTITUCION,
  TITULO_CUESTIONARIO,
} from '@/types/entrevista-familiar';

// ============ Mocks ============

const userId = '11111111-1111-1111-1111-111111111111';
const alumnoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const grupoId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const cct = '09DPR1234Z';
const ciclo = '2025-2026';

const entrevistaFamiliarStore: Array<Record<string, unknown>> = [];

type SupabaseLike = {
  from: (table: string) => unknown;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

function makeBuilder(
  table: string,
  opts: { skipAviso?: boolean; skipAlumno?: boolean } = {},
) {
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
    if (table === 'entrevista_familiar_alumno') {
      const out = applyFilters(entrevistaFamiliarStore);
      return { data: out[0] ?? null, error: null };
    }
    return { data: null, error: null };
  });
  builder.single = vi.fn(async () => {
    if (table === 'entrevista_familiar_alumno') {
      const out = applyFilters(entrevistaFamiliarStore);
      return { data: out[0] ?? null, error: null };
    }
    return { data: null, error: null };
  });
  builder.select = vi.fn((_sel?: string) => builder);
  builder.insert = vi.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
    const rows = Array.isArray(payload) ? payload : [payload];
    for (const row of rows) {
      entrevistaFamiliarStore.push({
        id: `ef-${entrevistaFamiliarStore.length + 1}`,
        ...row,
      });
    }
    return builder;
  });
  builder.update = vi.fn((patch: Record<string, unknown>) => {
    const out = applyFilters(entrevistaFamiliarStore);
    for (const row of out) {
      Object.assign(row, patch);
    }
    return builder;
  });
  builder.upsert = vi.fn(
    (payload: Record<string, unknown>, _opts?: unknown) => {
      const e = payload as Record<string, unknown>;
      const idx = entrevistaFamiliarStore.findIndex(
        (x) =>
          x.alumno_id === e.alumno_id && x.ciclo_escolar === e.ciclo_escolar,
      );
      if (idx >= 0) {
        Object.assign(entrevistaFamiliarStore[idx]!, e);
        return builder;
      }
      entrevistaFamiliarStore.push({
        id: `ef-${entrevistaFamiliarStore.length + 1}`,
        ...payload,
      });
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

// ============ Helpers ============

function makeValidPayload() {
  return buildRespuestasFamiliaresVaciasV1({
    nombreAlumno: 'Alumno Demo',
    fechaNacimiento: '2020-01-15',
  });
}

// ============ Tests ============

beforeEach(() => {
  entrevistaFamiliarStore.length = 0;
  mockSupabase.from = vi.fn((table: string) => makeBuilder(table));
  vi.clearAllMocks();
});

describe('IMPL-20260821-05 — entrevista-familiar-actions (AC-FF1..AC-FF11)', () => {
  it('AC-FF1: HABITOS_FAMILIARES tiene exactamente 15 ítems', () => {
    expect(HABITOS_FAMILIARES).toHaveLength(HABITOS_FAMILIARES_TOTAL);
    expect(HABITOS_FAMILIARES_TOTAL).toBe(15);
  });

  it('AC-FF1/AC-FF2: orden de hábitos ∈ {1..14,16} — sin 15, conserva el salto', () => {
    expect(HABITOS_FAMILIARES_ORDENES_PERMITIDOS).not.toContain(15);
    expect(HABITOS_FAMILIARES.map((h) => h.orden)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16,
    ]);
  });

  it('AC-FF2: peculiaridades literales preservadas (escorar, limites, ocupación, sin tildes)', () => {
    const h13 = HABITOS_FAMILIARES.find((h) => h.orden === 13);
    expect(h13?.pregunta).toContain('escorar'); // sic: "escorar" (no "escolar")
    expect(h13?.pregunta).not.toContain('escolar'); // NO autocorrectado

    const h10 = HABITOS_FAMILIARES.find((h) => h.orden === 10);
    const h11 = HABITOS_FAMILIARES.find((h) => h.orden === 11);
    expect(h10?.pregunta).toContain('limites'); // sin tilde
    expect(h11?.pregunta).toContain('limites'); // sin tilde
    expect(h10?.pregunta).not.toContain('límites');
    expect(h11?.pregunta).not.toContain('límites');

    // ocupación en minúscula (etiqueta de fila del bloque B)
    const fila5 = PROGENITOR_ETIQUETAS.find((f) => f.orden === 5);
    expect(fila5?.etiqueta).toBe('ocupación');
  });

  it('AC-FF1: encabezado institución y título del cuestionario (JARDIN sin tilde)', () => {
    expect(ENCABEZADO_INSTITUCION).toBe('JARDIN DE NIÑOS “CELESTINO FREINET”');
    expect(TITULO_CUESTIONARIO).toBe('CUESTIONARIO A PADRES DE FAMILIA');
  });

  it('AC-FF2: mensajes de cierre literales (sin tildes en MAS ASERTIVA)', () => {
    expect(CIERRE_MENSAJE_GRACIAS).toBe(
      'GRACIAS POR SU TIEMPO PARA CONTESTAR ESTE CUESTIONARIO.',
    );
    expect(CIERRE_MENSAJE_RECABADA).toBe(
      'LA INFORMACIÓN RECABADA SERVIRA AL DOCENTE PARA COMPRENDER ALGUNAS ACTITUDES DEL ALUMNO; PARA PLANEAR, VALORAR E INFORMAR PERTINENTEMENTE SOBRE LA ATENCION EDUCATIVA MAS ASERTIVA.',
    );
    // No las corregimos: faltan tildes en SERVIRA, PLANEAR, VALORAR, INFORMAR, EDUCATIVA, MAS, ASERTIVA.
    expect(CIERRE_MENSAJE_RECABADA).toContain('SERVIRA');
    expect(CIERRE_MENSAJE_RECABADA).toContain('MAS ASERTIVA');
  });

  it('AC-FF1: PROGENITOR_ETIQUETAS tiene 6 filas literales', () => {
    expect(PROGENITOR_ETIQUETAS).toHaveLength(PROGENITOR_TOTAL);
    expect(PROGENITOR_TOTAL).toBe(6);
  });

  it('AC-FF1: validateCuestionarioFamiliarV1 acepta respuestas con cuestionario literal', () => {
    const out = validateCuestionarioFamiliarV1(makeValidPayload());
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.habitosFamiliares.items).toHaveLength(
        HABITOS_FAMILIARES_TOTAL,
      );
    }
  });

  it('AC-FF1: validateCuestionarioFamiliarV1 rechaza orden incorrecto en hábitos', () => {
    const payload = makeValidPayload();
    // Cambiar orden 3 → 30; el sistema lo rechaza por orden fuera del enum.
    const alterado = JSON.parse(JSON.stringify(payload));
    alterado.habitosFamiliares.items[2].orden = 30;
    const out = validateCuestionarioFamiliarV1(alterado);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      // zod safeParse emite su mensaje; basta con que sea ok=false.
      expect(out.error.length).toBeGreaterThan(0);
    }
  });

  it('AC-FF1: validateCuestionarioFamiliarV1 rechaza pregunta alterada en hábito 13', () => {
    const payload = makeValidPayload();
    const alterado = JSON.parse(JSON.stringify(payload));
    alterado.habitosFamiliares.items[12].pregunta =
      '¿Qué esperan del ciclo escolar?';
    const out = validateCuestionarioFamiliarV1(alterado);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/Pregunta alterada.*h[áa]bito 13/);
    }
  });

  it('AC-FF2: NO se autocorrige `escorar` (sic) → `escolar`', () => {
    const out = validateCuestionarioFamiliarV1(makeValidPayload());
    expect(out.ok).toBe(true);
    if (out.ok) {
      const item13 = out.data.habitosFamiliares.items.find(
        (i) => i.orden === 13,
      );
      expect(item13?.pregunta).toContain('escorar');
      expect(item13?.pregunta).not.toContain('escolar');
    }
  });

  it('AC-FF2: validateCuestionarioFamiliarV1 rechaza cierre alterado', () => {
    const payload = makeValidPayload();
    const alterado = JSON.parse(JSON.stringify(payload));
    alterado.cierre.mensajeGracias = 'GRACIAS POR SU COLABORACIÓN.';
    const out = validateCuestionarioFamiliarV1(alterado);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      // zod emite "Invalid literal value" para el z.literal() del mensaje;
      // basta con que sea ok=false y el error mencione "literal".
      expect(out.error).toMatch(/literal|GRACIAS|Cuestionario familiar inválido/i);
    }
  });

  it('AC-FF1: validateCuestionarioFamiliarV1 rechaza subcampo alterado', () => {
    const payload = makeValidPayload();
    const alterado = JSON.parse(JSON.stringify(payload));
    // Hábito 1 tiene subcampo `¿Qué lugar ocupa el alumno?`
    alterado.habitosFamiliares.items[0].subcampo = '¿Qué lugar ocupa?';
    const out = validateCuestionarioFamiliarV1(alterado);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/subcampo alterado.*h[áa]bito 1/i);
  });

  it('AC-FF8: upsertEntrevistaFamiliar sin aviso → error de gate D11-07', async () => {
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, { skipAviso: true }));

    const res = await upsertEntrevistaFamiliar({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas: makeValidPayload(),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/aviso de privacidad/i);
  });

  it('AC-FF8: upsertEntrevistaFamiliar con alumno ajeno → "Alumno no encontrado"', async () => {
    mockSupabase.from = vi.fn((table: string) => makeBuilder(table, { skipAlumno: true }));

    const res = await upsertEntrevistaFamiliar({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas: makeValidPayload(),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Alumno no encontrado');
  });

  it('AC-FF9: upsert crea fila y segunda llamada actualiza el mismo registro (in-place)', async () => {
    const r1 = await upsertEntrevistaFamiliar({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas: makeValidPayload(),
    });
    expect(r1.ok).toBe(true);
    expect(entrevistaFamiliarStore).toHaveLength(1);

    const updated = makeValidPayload();
    updated.identificacion.nombreAlumno = 'Alumno Mod';
    updated.firmas.nombreMama = 'Mamá Mod';

    const r2 = await upsertEntrevistaFamiliar({
      alumnoId,
      fechaAplicacion: '2026-08-21',
      estado: 'completa',
      respuestas: updated,
    });
    expect(r2.ok).toBe(true);
    expect(entrevistaFamiliarStore).toHaveLength(1); // misma fila
    expect(entrevistaFamiliarStore[0]?.estado).toBe('completa');
    const stored = entrevistaFamiliarStore[0]?.respuestas as {
      identificacion: { nombreAlumno: string };
      firmas: { nombreMama: string; nombrePapa: string };
    };
    expect(stored.identificacion.nombreAlumno).toBe('Alumno Mod');
    expect(stored.firmas.nombreMama).toBe('Mamá Mod');
    expect(stored.firmas.nombrePapa).toBe('');
  });

  it('AC-FF9: upsertEntrevistaFamiliar rechaza cuando respuestas no cumplen §4.2', async () => {
    const alterado = makeValidPayload();
    (alterado as unknown as Record<string, unknown>).habitosFamiliares = {
      items: [],
    };
    const res = await upsertEntrevistaFamiliar({
      alumnoId,
      fechaAplicacion: '2026-08-20',
      estado: 'borrador',
      respuestas: alterado,
    });
    expect(res.ok).toBe(false);
  });

  it('AC-FF10: archivarEntrevistaFamiliar transiciona completa → archivada', async () => {
    entrevistaFamiliarStore.push({
      id: 'ef-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      respuestas: {},
      fecha_aplicacion: '2026-08-20',
      estado: 'completa',
    });
    const res = await archivarEntrevistaFamiliar(alumnoId);
    expect(res.ok).toBe(true);
    expect(entrevistaFamiliarStore[0]?.estado).toBe('archivada');
  });

  it('AC-FF10: archivarEntrevistaFamiliar idempotente (segunda vez no duplica ni error)', async () => {
    entrevistaFamiliarStore.push({
      id: 'ef-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      respuestas: {},
      fecha_aplicacion: '2026-08-20',
      estado: 'archivada',
    });
    const res = await archivarEntrevistaFamiliar(alumnoId);
    expect(res.ok).toBe(true);
    expect(entrevistaFamiliarStore).toHaveLength(1);
  });

  it('AC-FF10/AC-FF11: el módulo NO expone deleteEntrevistaFamiliar', async () => {
    const mod = await import('@/services/alumnos/entrevista-familiar-actions');
    expect(
      (mod as unknown as Record<string, unknown>).deleteEntrevistaFamiliar,
    ).toBeUndefined();
    expect(
      (mod as unknown as Record<string, unknown>).deleteEntrevistasFamiliares,
    ).toBeUndefined();
    expect(
      (mod as unknown as Record<string, unknown>).deleteEntrevista,
    ).toBeUndefined();
  });

  it('el módulo solo exporta funciones async (contrato "use server")', async () => {
    const mod = await import('@/services/alumnos/entrevista-familiar-actions');
    const entries = Object.entries(mod as unknown as Record<string, unknown>);
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, value] of entries) {
      expect(typeof value, `export "${name}" debe ser función`).toBe('function');
      expect(
        (value as { constructor: { name: string } }).constructor.name,
        `export "${name}" debe ser función async`,
      ).toBe('AsyncFunction');
    }
  });

  it('AC-FF8: getEntrevistaFamiliar devuelve fila del ciclo activo', async () => {
    const payload = makeValidPayload();
    entrevistaFamiliarStore.push({
      id: 'ef-1',
      alumno_id: alumnoId,
      grupo_id: grupoId,
      docente_id: userId,
      cct,
      ciclo_escolar: ciclo,
      respuestas: payload,
      fecha_aplicacion: '2026-08-20',
      estado: 'borrador',
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
    });
    const res = await getEntrevistaFamiliar(alumnoId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data?.id).toBe('ef-1');
    if (!res.data) return;
    expect(res.data.respuestas.habitosFamiliares.items).toHaveLength(
      HABITOS_FAMILIARES_TOTAL,
    );
  });

  it('AC-FF6: la entrevista familiar NO importa ni consulta entrevista_inicial_alumno', async () => {
    // Verificación estática por lectura del archivo (similar a AC-21 infantil).
    // Filtra líneas de comentario / docblock para validar referencias activas.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(
      'services/alumnos/entrevista-familiar-actions.ts',
      'utf8',
    );
    const codeLines = src
      .split(/\r?\n/)
      .filter((l) => !/^\s*(\/\/|\*)/.test(l) && !/^\s*\*/.test(l))
      .join('\n');
    expect(codeLines).not.toMatch(/\bentrevista_inicial_alumno\b/);
    // Importar `entrevista-actions` (infantil) o `types/entrevista` (sin sufijo)
    // está prohibido; pero SÍ permitimos `entrevista-familiar-actions` y
    // `types/entrevista-familiar`. Por eso usamos regex ancladas a un
    // delimitador que NO sea `-`.
    expect(codeLines).not.toMatch(/@\/services\/alumnos\/entrevista-actions['"`/)]/);
    expect(codeLines).not.toMatch(/@\/types\/entrevista['"`\/)\\;, ]/);
  });
});

// ============ AC-FF7 — No-IA extendido: scan real de la capa IA ============
// Garantizamos que ninguna ruta de la capa IA lee la tabla ni el módulo
// `entrevista-familiar-actions` / `types/entrevista-familiar` /
// `entrevista-familiar-form` (patrón idéntico al AC-21 infantil).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

describe('AC-FF7 (IMPL-20260821-05) — No-IA extendido: scan real de la capa IA', () => {
  const REPO_ROOT = resolve(__dirname, '../../../../');
  const IA_BLACKLIST_DIRS = [
    'app/api/planeaciones/[id]/ia',
    'app/api/recursos-aula/ia-sugerir-uso',
    'services/ia',
    'lib/ia',
  ];
  const FORBIDDEN_PATTERNS: ReadonlyArray<{ name: string; rx: RegExp }> = [
    {
      name: 'entrevista_familiar_alumno',
      rx: /\bentrevista_familiar_alumno\b/,
    },
    {
      name: 'entrevista-familiar-actions',
      rx: /@?\/services\/alumnos\/entrevista-familiar-actions\b/,
    },
    {
      name: 'types/entrevista-familiar',
      rx: /@?\/types\/entrevista-familiar\b/,
    },
    {
      name: 'entrevista-familiar-form',
      rx: /@?\/components\/alumnos\/entrevista-familiar-form\b/,
    },
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

  it('AC-FF7: existe al menos un archivo bajo cada directorio IA (sanity)', () => {
    for (const rel of IA_BLACKLIST_DIRS) {
      const abs = join(REPO_ROOT, rel);
      const files = walk(abs);
      expect(files.length, `Directorio IA esperado no presente: ${rel}`).toBeGreaterThan(0);
    }
  });

  it('AC-FF7: ningún archivo de la capa IA referencia la tabla, módulo o form de la entrevista familiar', () => {
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
        `AC-FF7 violated: la capa IA referencia la entrevista familiar. Offenders:\n${msg}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});

// ============ AC-FF3 — verificar contrato estructural de la migración ============

import { describe as describe2 } from 'vitest';
describe2('IMPL-20260821-05 — AC-FF3/AC-FF4 sobre `0024_entrevista_familiar_alumno.sql`', () => {
  it('AC-FF3: contiene `create table if not exists entrevista_familiar_alumno`', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    expect(sql).toMatch(
      /create table if not exists entrevista_familiar_alumno\b/,
    );
  });

  it('AC-FF3: habilita RLS y crea policy `entrevista_familiar_docente_own`', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/create policy "entrevista_familiar_docente_own"/);
  });

  it('AC-FF3: trigger `trg_entrevista_familiar_updated`', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    expect(sql).toMatch(/create trigger trg_entrevista_familiar_updated/);
    expect(sql).toMatch(/set_updated_at\(\)/);
  });

  it('AC-FF3: `unique (alumno_id, ciclo_escolar)` (D11-10)', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    expect(sql).toMatch(/unique \(alumno_id, ciclo_escolar\)/);
  });

  it('AC-FF4: NO contiene policy de director (D11-08)', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    // El nombre literal de la policy de director NO debe aparecer en ninguna
    // sentencia SQL (drop/create). Verificación robusta: filtrar las líneas
    // que NO son comentario.
    const nonCommentLines = sql
      .split(/\r?\n/)
      .filter((l) => !/^\s*--/.test(l))
      .join('\n');
    expect(nonCommentLines).not.toMatch(/create policy\s+"?entrevista_familiar_director_cct"?/i);
    expect(nonCommentLines).not.toMatch(/drop policy\s+"?entrevista_familiar_director_cct"?/i);
    // Y el nombre tampoco debe estar tokenizado en ninguna sentencia ejecutable.
    expect(nonCommentLines).not.toMatch(/\bentrevista_familiar_director_cct\b/);
  });

  it('AC-FF3: `comment on table entrevista_familiar_alumno` con DEC-20260821-01 + D11-*', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    expect(sql).toMatch(/comment on table entrevista_familiar_alumno is/);
    expect(sql).toContain('DEC-20260821-01');
    expect(sql).toContain('D11-08');
    expect(sql).toContain('D11-09');
    expect(sql).toContain('D11-11');
  });

  it('AC-FF10: NO crea columna/tabla de versiones; sin tabla `version`', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    expect(sql).not.toMatch(/entrevista_familiar_alumno_version/i);
    expect(sql).not.toMatch(/firma_imagen|firma_hash|storage/i);
  });

  it('AC-FF11: NO crea columna `firma_imagen` ni hash ni storage', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync(
      'supabase/migrations/0024_entrevista_familiar_alumno.sql',
      'utf8',
    );
    expect(sql).not.toMatch(/firma_imagen/);
    expect(sql).not.toMatch(/firma_hash/);
    expect(sql).not.toMatch(/firma_storage|bucket|upload/i);
  });

  it('migrations_master.sql contiene la sección 0024', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const sql = readFileSync('supabase/migrations_master.sql', 'utf8');
    expect(sql).toMatch(/0024_entrevista_familiar_alumno\.sql/);
  });
});
