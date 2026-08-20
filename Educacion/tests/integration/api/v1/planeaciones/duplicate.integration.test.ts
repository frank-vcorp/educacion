// @vitest-environment node
/**
 * Integration: T-I-04 — Duplicar planeación (D-FIN-17, §6.6).
 * IMPL-20260819-01 — Incremento B.
 *
 * Cubre los 4 casos especificados en SPEC_TEC_06 §T-I-04:
 *  (a) mismo grupo del docente
 *  (b) otro grupo del docente
 *  (c) evaluaciones no copiadas (count 0 en destino)
 *  (d) RLS 403 si grupo destino es de otro CCT
 *
 * La acción se ejecuta como Server Action. Se mockea el cliente Supabase para
 * no depender de Postgres real (T-I-04 es unit/integration puro).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  type Row = Record<string, unknown> & { id: string };
  type Table = 'planeacion' | 'sesion' | 'bloque' | 'evaluacion_alumno' | 'grupo';
  const DOCENTE_ID = '11111111-1111-1111-1111-111111111111';
  const OTHER_DOCENTE_ID = '22222222-2222-2222-2222-222222222222';
  const CCT_A = '09DPR1234Z';
  const CCT_B = '09DPR9999X';
  const PLANEACION_ID = 'aaaaaaaa-1111-1111-1111-111111111111';
  const GRUPO_ORIGEN_ID = 'bbbbbbbb-1111-1111-1111-111111111111';
  const GRUPO_DESTINO_ID = 'cccccccc-2222-2222-2222-222222222222';
  const GRUPO_OTRO_CCT_ID = 'dddddddd-3333-3333-3333-333333333333';

  const sesionOrig = (id: string, numero: number, fase: string): Row => ({
    id,
    planeacion_id: PLANEACION_ID,
    docente_id: DOCENTE_ID,
    cct: CCT_A,
    numero,
    fase_interna: fase,
    fecha: '2026-02-02',
    duracion_min: 45,
    ajustes_sesion: null,
    estado: 'completa',
  });

  const bloqueOrig = (id: string, sesionId: string, orden: number, tipo: string): Row => ({
    id,
    sesion_id: sesionId,
    planeacion_id: PLANEACION_ID,
    docente_id: DOCENTE_ID,
    cct: CCT_A,
    bloque_catalogo_id: 'BC-001',
    tipo,
    nivel_flexibilidad: 'abierto',
    contenido_textual: 'C',
    pda_ids: ['PDA-LH-001'],
    campos_formativos: ['LO_HUMANO_LO_COMUNITARIO'],
    ejes_articuladores: ['INCLUSION'],
    recursos_requeridos: [],
    duracion_min: 10,
    orden,
    origen: 'maestra',
  });

  const grupoOrig = (id: string, docenteId: string, cct: string): Row => ({
    id,
    docente_id: docenteId,
    cct,
    grado: '1°',
    grupo: 'A',
    nivel: 'PREESCOLAR',
    ciclo_escolar: '2025-2026',
    total_alumnos: 20,
    activo: true,
  });

  const planeacionOrigenLight = {
    id: PLANEACION_ID,
    docente_id: DOCENTE_ID,
    cct: CCT_A,
    grupo_id: GRUPO_ORIGEN_ID,
    nombre: 'Manifiesta tus emociones',
  };

  const planeacionOrigenFull = {
    id: PLANEACION_ID,
    docente_id: DOCENTE_ID,
    grupo_id: GRUPO_ORIGEN_ID,
    cct: CCT_A,
    nombre: 'Manifiesta tus emociones',
    modalidad: 'proyecto_comunitario',
    problema_contexto: 'Contexto de prueba',
    proposito: null,
    campos_formativos: ['LO_HUMANO_LO_COMUNITARIO'],
    ejes_articuladores: ['INCLUSION'],
    pdas: ['PDA-LH-001'],
    contenido_ref: null,
    producto_integrador: null,
    ajustes_razonables: 'Ajustes razonables de prueba',
    banco_palabras: [],
    periodo_tipo: 'rango_fechas',
    periodo_inicio: '2026-02-01',
    periodo_fin: '2026-02-28',
    metadata: { modalidad_data: {} },
  };

  return {
    constants: {
      DOCENTE_ID,
      OTHER_DOCENTE_ID,
      CCT_A,
      CCT_B,
      PLANEACION_ID,
      GRUPO_ORIGEN_ID,
      GRUPO_DESTINO_ID,
      GRUPO_OTRO_CCT_ID,
    },
    helpers: { sesionOrig, bloqueOrig, grupoOrig, planeacionOrigenLight, planeacionOrigenFull },
    store: {
      fixture: {
        planeacion: [] as Row[],
        sesion: [] as Row[],
        bloque: [] as Row[],
        evaluacion_alumno: [] as Row[],
        grupo: [] as Row[],
      },
      inserted: {
        planeacion: [] as Row[],
        sesion: [] as Row[],
        bloque: [] as Row[],
        evaluacion_alumno: [] as Row[],
        grupo: [] as Row[],
      },
    },
  } as {
    constants: {
      DOCENTE_ID: string;
      OTHER_DOCENTE_ID: string;
      CCT_A: string;
      CCT_B: string;
      PLANEACION_ID: string;
      GRUPO_ORIGEN_ID: string;
      GRUPO_DESTINO_ID: string;
      GRUPO_OTRO_CCT_ID: string;
    };
    helpers: {
      sesionOrig: (id: string, numero: number, fase: string) => Row;
      bloqueOrig: (id: string, sesionId: string, orden: number, tipo: string) => Row;
      grupoOrig: (id: string, docenteId: string, cct: string) => Row;
      planeacionOrigenLight: Row;
      planeacionOrigenFull: Row;
    };
    store: {
      fixture: Record<Table, Row[]>;
      inserted: Record<Table, Row[]>;
    };
  };
});

type Row = Record<string, unknown> & { id: string };
type Table = 'planeacion' | 'sesion' | 'bloque' | 'evaluacion_alumno' | 'grupo';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const {
  DOCENTE_ID,
  CCT_A,
  CCT_B,
  PLANEACION_ID,
  GRUPO_ORIGEN_ID,
  GRUPO_DESTINO_ID,
  GRUPO_OTRO_CCT_ID,
} = hoisted.constants;
const {
  sesionOrig,
  bloqueOrig,
  grupoOrig,
  planeacionOrigenLight,
  planeacionOrigenFull,
} = hoisted.helpers;
const store = hoisted.store;

interface FilterState {
  eqs: Array<{ col: string; val: unknown }>;
  orderBy?: { col: string; ascending: boolean };
}

function applyFilters(rows: Row[], state: FilterState): Row[] {
  return rows.filter((r) => state.eqs.every((f) => r[f.col] === f.val));
}

function buildQuery(table: Table, state: FilterState) {
  return {
    eq(col: string, val: unknown) {
      return buildQuery(table, { ...state, eqs: [...state.eqs, { col, val }] });
    },
    order(col: string, opts: { ascending: boolean } = { ascending: true }) {
      return buildQuery(table, { ...state, orderBy: { col, ascending: opts.ascending } });
    },
    then(resolve: (v: { data: Row[]; error: null }) => void) {
      const rows = applyFilters(store.fixture[table], state);
      let sorted = rows;
      if (state.orderBy) {
        const { col, ascending } = state.orderBy;
        sorted = [...rows].sort((a, b) => {
          const av = a[col] ?? '';
          const bv = b[col] ?? '';
          if (av === bv) return 0;
          return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
        });
      }
      resolve({ data: sorted, error: null });
    },
    async maybeSingle() {
      if (
        table === 'planeacion' &&
        state.eqs.length === 1 &&
        state.eqs[0]!.col === 'id' &&
        state.eqs[0]!.val === PLANEACION_ID
      ) {
        return { data: planeacionOrigenLight, error: null };
      }
      const rows = applyFilters(store.fixture[table], state);
      return { data: rows[0] ?? null, error: null };
    },
    async single() {
      if (
        table === 'planeacion' &&
        state.eqs.length === 1 &&
        state.eqs[0]!.col === 'id' &&
        state.eqs[0]!.val === PLANEACION_ID
      ) {
        return { data: planeacionOrigenFull, error: null };
      }
      const rows = applyFilters(store.fixture[table], state);
      if (rows.length !== 1) {
        return { data: null, error: new Error(`expected 1 row, got ${rows.length}`) };
      }
      return { data: rows[0], error: null };
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from(table: Table) {
      return {
        select(_cols?: string) {
          return buildQuery(table, { eqs: [] });
        },
        insert(row: Row | Row[]) {
          const arr = Array.isArray(row) ? row : [row];
          const rowsWithId = arr.map((r) => ({ ...r, id: uuid() }) as Row);
          for (const r of rowsWithId) {
            store.inserted[table].push(r);
          }
          return {
            select(_cols?: string) {
              return {
                async single() {
                  return { data: rowsWithId[0] ?? null, error: null };
                },
              };
            },
          };
        },
      };
    },
  }),
}));

import { duplicarPlaneacion, type DuplicarPlaneacionInput } from '@/services/planeaciones/planeacion-actions';

function resetStore() {
  store.fixture = {
    planeacion: [{ ...planeacionOrigenFull }, { ...planeacionOrigenLight }],
    sesion: [
      sesionOrig('00000001-1111-1111-1111-111111111111', 1, 'inicio'),
      sesionOrig('00000002-2222-2222-2222-222222222222', 2, 'desarrollo'),
      sesionOrig('00000003-3333-3333-3333-333333333333', 3, 'cierre'),
    ],
    bloque: [
      bloqueOrig('10000001-1111-1111-1111-111111111111', '00000001-1111-1111-1111-111111111111', 1, 'apertura'),
      bloqueOrig('10000002-1111-1111-1111-111111111111', '00000002-2222-2222-2222-222222222222', 1, 'desarrollo'),
      bloqueOrig('10000003-1111-1111-1111-111111111111', '00000002-2222-2222-2222-222222222222', 2, 'cierre'),
      bloqueOrig('10000004-1111-1111-1111-111111111111', '00000003-3333-3333-3333-333333333333', 1, 'evaluacion_semanal'),
    ],
    evaluacion_alumno: [],
    grupo: [
      grupoOrig(GRUPO_ORIGEN_ID, DOCENTE_ID, CCT_A),
      grupoOrig(GRUPO_DESTINO_ID, DOCENTE_ID, CCT_A),
      grupoOrig(GRUPO_OTRO_CCT_ID, '22222222-2222-2222-2222-222222222222', CCT_B),
    ],
  };
  store.inserted = {
    planeacion: [],
    sesion: [],
    bloque: [],
    evaluacion_alumno: [],
    grupo: [],
  };
}

describe('T-I-04: POST /planeaciones/:id/duplicar (vía Server Action)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('(a) clonar al mismo grupo del docente', async () => {
    const input: DuplicarPlaneacionInput = {
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_ORIGEN_ID,
    };
    const r = await duplicarPlaneacion(input);
    expect(r.ok).toBe(true);
    expect(store.inserted.planeacion.length).toBe(1);
    expect(store.inserted.planeacion[0]!.grupo_id).toBe(GRUPO_ORIGEN_ID);
    expect(store.inserted.planeacion[0]!.clonada_de).toBe(PLANEACION_ID);
    expect(String(store.inserted.planeacion[0]!.nombre)).toContain('(copia)');
  });

  it('(b) clonar a otro grupo del mismo docente', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });
    expect(r.ok).toBe(true);
    expect(store.inserted.planeacion[0]!.grupo_id).toBe(GRUPO_DESTINO_ID);
    expect(store.inserted.planeacion[0]!.clonada_de).toBe(PLANEACION_ID);
  });

  it('(c) evaluaciones NO se copian', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
      copiarEvaluaciones: true,
    });
    expect(r.ok).toBe(true);
    expect(r.evaluacionesCopiadas).toBe(0);
    const evalInserted = store.inserted.evaluacion_alumno.filter(
      (e) => e.planeacion_id === r.nuevaPlaneacionId,
    );
    expect(evalInserted.length).toBe(0);
  });

  it('(d) grupo destino de OTRO CCT → 403 / NEM_AUTH_RLS_VIOLATION', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_OTRO_CCT_ID,
    });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('NEM_AUTH_RLS_VIOLATION');
    expect(store.inserted.planeacion.length).toBe(0);
  });
});
