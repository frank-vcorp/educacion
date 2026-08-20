// @vitest-environment node
/**
 * Tests unitarios de duplicarPlaneacion (D-FIN-17, §6.6).
 * IMPL-20260819-01 — Incremento B.
 * IMPL-20260819-02 — Fix P2-2: compensación ante fallo a mitad.
 *
 * AC cubiertos:
 *  - AC-B1 clonada_de poblado, nombre con sufijo, estado='borrador', grupo_id=nuevo
 *  - AC-B2 sesiones/bloques copiados 1:1, nuevos UUIDs
 *  - AC-B3 evaluaciones NO copiadas
 *  - AC-B4 RLS: grupo destino no pertenece al docente → NEM_AUTH_RLS_VIOLATION
 *  - AC-4 IMPL-20260819-02: si un insert de sesión/bloque falla, se ejecuta
 *    compensación (hard-delete en orden inverso) y {ok:false}.
 *  - AC-5 IMPL-20260819-02: la compensación opera sólo sobre IDs del intento.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/* ─────────────── Hoisted: accesibles por el mock factory ─────────────── */

const { store, constants, fixtureData } = vi.hoisted(() => {
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

  const sesionOrig = (numero: number, fase: string, id?: string): Row => ({
    id: id ?? `0000000${numero}-1111-1111-1111-111111111111`,
    planeacion_id: PLANEACION_ID,
    docente_id: DOCENTE_ID,
    cct: CCT_A,
    numero,
    fase_interna: fase,
    fecha: '2026-02-02',
    duracion_min: 45,
    ajustes_sesion: `Plan B para ${fase}`,
    estado: 'completa',
  });

  const bloqueOrig = (id: string, sesionId: string, orden: number, tipo: string): Row => ({
    id: id ?? `1111111${orden}-1111-1111-1111-111111111111`,
    sesion_id: sesionId,
    planeacion_id: PLANEACION_ID,
    docente_id: DOCENTE_ID,
    cct: CCT_A,
    bloque_catalogo_id: 'BC-001',
    tipo,
    nivel_flexibilidad: 'abierto',
    contenido_textual: `Contenido de ${tipo}`,
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
    problema_contexto: 'Contexto de prueba con suficiente detalle para validación',
    proposito: 'Propósito de prueba',
    campos_formativos: ['LO_HUMANO_LO_COMUNITARIO'],
    ejes_articuladores: ['INCLUSION'],
    pdas: ['PDA-LH-001'],
    contenido_ref: null,
    producto_integrador: 'Producto integrador',
    ajustes_razonables: 'Ajustes razonables de prueba suficientemente largos',
    banco_palabras: ['emoción', 'sentir'],
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
    fixtureData: {
      sesionOrig,
      bloqueOrig,
      grupoOrig,
      planeacionOrigenLight,
      planeacionOrigenFull,
    },
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
  OTHER_DOCENTE_ID,
  CCT_A,
  CCT_B,
  PLANEACION_ID,
  GRUPO_ORIGEN_ID,
  GRUPO_DESTINO_ID,
  GRUPO_OTRO_CCT_ID,
} = constants;
const {
  sesionOrig,
  bloqueOrig,
  grupoOrig,
  planeacionOrigenLight,
  planeacionOrigenFull,
} = fixtureData;

/* ─────────────── Mock de Supabase (factory cerrado sobre `store`) ─────────────── */

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

/**
 * NOTA: `buildDeleteQuery` (variante que elimina filas de `store.inserted`,
 * usada por la compensación FIX P2-2) vive en
 * `tests/unit/services/planeaciones/duplicate-compensation.test.ts`.
 */

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

import {
  duplicarPlaneacion,
  type DuplicarPlaneacionInput,
} from '@/services/planeaciones/planeacion-actions';

function resetStore() {
  store.fixture = {
    planeacion: [{ ...planeacionOrigenFull }, { ...planeacionOrigenLight }],
    sesion: [sesionOrig(1, 'inicio', 's-1'), sesionOrig(2, 'desarrollo', 's-2'), sesionOrig(3, 'cierre', 's-3')],
    bloque: [
      bloqueOrig('b-1', 's-1', 1, 'apertura'),
      bloqueOrig('b-2', 's-2', 1, 'desarrollo'),
      bloqueOrig('b-3', 's-2', 2, 'cierre'),
      bloqueOrig('b-4', 's-3', 1, 'evaluacion_semanal'),
    ],
    evaluacion_alumno: [],
    grupo: [
      grupoOrig(GRUPO_ORIGEN_ID, DOCENTE_ID, CCT_A),
      grupoOrig(GRUPO_DESTINO_ID, DOCENTE_ID, CCT_A),
      grupoOrig(GRUPO_OTRO_CCT_ID, OTHER_DOCENTE_ID, CCT_B),
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

describe('duplicarPlaneacion (D-FIN-17 / T-I-04)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('AC-B1: clona a MISMO grupo → clonada_de poblado, nombre con sufijo, estado=borrador', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_ORIGEN_ID,
    });
    expect(r.ok).toBe(true);
    expect(r.nuevaPlaneacionId).toBeTruthy();
    const inserted = store.inserted.planeacion[0]!;
    expect(inserted.clonada_de).toBe(PLANEACION_ID);
    expect(inserted.estado).toBe('borrador');
    expect(inserted.grupo_id).toBe(GRUPO_ORIGEN_ID);
    expect(inserted.docente_id).toBe(DOCENTE_ID);
    expect(String(inserted.nombre)).toContain('(copia)');
    expect(String(inserted.nombre)).toContain('Manifiesta');
  });

  it('AC-B1: clona a OTRO grupo del mismo docente → grupo_id=nuevo grupo', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
      nombreSufijo: '[para 2°B]',
    });
    expect(r.ok).toBe(true);
    const inserted = store.inserted.planeacion[0]!;
    expect(inserted.grupo_id).toBe(GRUPO_DESTINO_ID);
    expect(String(inserted.nombre)).toContain('[para 2°B]');
  });

  it('AC-B2: copia TODAS las sesiones y bloques con nuevos UUIDs', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });
    expect(r.ok).toBe(true);
    expect(r.sesionesCopiadas).toBe(3);
    expect(r.bloquesCopiados).toBe(4);

    const origSesionIds = ['s-1', 's-2', 's-3'];
    const origBloqueIds = ['b-1', 'b-2', 'b-3', 'b-4'];

    for (const ns of store.inserted.sesion) {
      expect(origSesionIds).not.toContain(ns.id);
      expect(ns.planeacion_id).toBe(r.nuevaPlaneacionId);
      expect(ns.docente_id).toBe(DOCENTE_ID);
      expect(ns.estado).toBe('pendiente');
    }
    for (const nb of store.inserted.bloque) {
      expect(origBloqueIds).not.toContain(nb.id);
      expect(nb.planeacion_id).toBe(r.nuevaPlaneacionId);
      expect(origSesionIds).not.toContain(nb.sesion_id);
    }
  });

  it('AC-B3: evaluaciones NO se copian (count 0 incluso con copiarEvaluaciones=true)', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
      copiarEvaluaciones: true,
    });
    expect(r.ok).toBe(true);
    expect(r.evaluacionesCopiadas).toBe(0);
    const evalInsertadas = store.inserted.evaluacion_alumno.filter(
      (e) => e.planeacion_id === r.nuevaPlaneacionId,
    );
    expect(evalInsertadas.length).toBe(0);
  });

  it('AC-B4: RLS — grupo destino de OTRO CCT → NEM_AUTH_RLS_VIOLATION', async () => {
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

  it('AC: validación de schema — grupoDestinoId no UUID', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: 'no-es-uuid',
    } as unknown as DuplicarPlaneacionInput);
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('NEM_VALIDATION');
  });

  it('AC: nombre_sufijo respeta maxLength=20', async () => {
    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
      nombreSufijo: 'x'.repeat(25),
    });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('NEM_VALIDATION');
  });
});

/**
 * NOTA: los tests de compensación (IMPL-20260819-02 Fix P2-2, AC-4/AC-5)
 * viven en `duplicate-compensation.test.ts` con su propio mock aislado.
 */

describe('listGruposDocente', () => {
  beforeEach(() => {
    resetStore();
  });

  it('lista hasta 3 grupos del docente/CCT', async () => {
    const { listGruposDocente } = await import(
      '@/services/planeaciones/planeacion-actions'
    );
    const r = await listGruposDocente(DOCENTE_ID, CCT_A);
    expect(r.ok).toBe(true);
    expect(r.items.length).toBe(2);
    expect(r.items.every((g) => g.cct === CCT_A)).toBe(true);
  });
});
