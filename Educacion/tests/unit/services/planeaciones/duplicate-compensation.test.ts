// @vitest-environment node
/**
 * Tests de compensación para duplicarPlaneacion (D-FIN-17, §6.6).
 * IMPL-20260819-02 — Fix P2-2 (QA-20260819-01 P2-2, ADR-20260819-01 decisión 2).
 *
 * Verifica que cuando un `insert` de sesión o bloque falla a mitad del
 * clonado, el action ejecuta un hard-delete en orden inverso
 * (bloques → sesiones → planeacion) sobre los identificadores del
 * intento actual y devuelve {ok:false}. Cero filas huérfanas.
 *
 * AC cubiertos:
 *  - AC-4: fallo a mitad → compensación ejecuta y devuelve {ok:false}.
 *  - AC-5: la compensación opera sólo sobre IDs del intento (no borra
 *    filas ajenas; filtrada por `eq('planeacion_id', nueva.id)` /
 *    `in('sesion_id', sesionesCreadas)`).
 *  - AC-6: el path de éxito (tests previos) sigue pasando — no regresión.
 *
 * Se aísla en archivo propio con su propio mock de Supabase para no
 * contaminar `duplicate.test.ts` con `vi.doMock`/`vi.resetModules`
 * (que rompe `listGruposDocente` al usar `cookies()` fuera de request
 * scope).
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
    /**
     * Configuración mutable por test (vía `failConfig`).
     * Define cuándo falla cada insert por tabla + contador.
     */
    failConfig: {
      sesionFailOnCount: -1 as number, // -1 = nunca
      bloqueFailOnCount: -1 as number,
      planeacionFail: false,
      insertSesionCount: 0,
      insertBloqueCount: 0,
      // IMPL-20260819-03 (P3-N1 + P3-N3): flags de fallo para SELECT de
      // sesiones origen y para los 3 deletes de compensación.
      sesionSelectFail: false,
      deleteBloqueFail: false,
      deleteSesionFail: false,
      deletePlaneacionFail: false,
      // UUID determinista para tests que validan el mensaje verbatim.
      useFixedUuid: false,
      uuidCounter: 0,
    },
  };
});

type Row = Record<string, unknown> & { id: string };
type Table = 'planeacion' | 'sesion' | 'bloque' | 'evaluacion_alumno' | 'grupo';

function uuid(): string {
  // IMPL-20260819-03: cuando `useFixedUuid` está activo, devolver un UUID
  // predecible derivado del contador para que los tests que validan el
  // mensaje verbatim de fallo de compensación puedan conocer
  // `nuevaPlaneacionId` de antemano.
  if (failConfig.useFixedUuid) {
    failConfig.uuidCounter += 1;
    const c = String(failConfig.uuidCounter).padStart(12, '0');
    return `00000000-0000-4000-8000-${c}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const {
  DOCENTE_ID,
  CCT_A,
  PLANEACION_ID,
  GRUPO_ORIGEN_ID,
  GRUPO_DESTINO_ID,
} = hoisted.constants;
const { sesionOrig, bloqueOrig, grupoOrig, planeacionOrigenLight, planeacionOrigenFull } =
  hoisted.helpers;
const store = hoisted.store;
const failConfig = hoisted.failConfig;

interface FilterState {
  eqs: Array<{ col: string; val: unknown }>;
  ins: Array<{ col: string; vals: unknown[] }>;
  orderBy?: { col: string; ascending: boolean };
}

function applyFilters(rows: Row[], state: FilterState): Row[] {
  return rows.filter((r) => {
    for (const f of state.eqs) {
      if (r[f.col] !== f.val) return false;
    }
    for (const f of state.ins) {
      if (!f.vals.includes(r[f.col])) return false;
    }
    return true;
  });
}

function buildQuery(table: Table, state: FilterState) {
  return {
    eq(col: string, val: unknown) {
      return buildQuery(table, { ...state, eqs: [...state.eqs, { col, val }] });
    },
    in(col: string, vals: unknown[]) {
      return buildQuery(table, { ...state, ins: [...state.ins, { col, vals }] });
    },
    order(col: string, opts: { ascending: boolean } = { ascending: true }) {
      return buildQuery(table, { ...state, orderBy: { col, ascending: opts.ascending } });
    },
    then(resolve: (v: { data: Row[]; error: null } | { data: null; error: Error }) => void) {
      // IMPL-20260819-03 (P3-N1): inyección de fallo del SELECT de sesiones
      // origen. La heurística es: si la tabla es `sesion` y el filtro incluye
      // `eq('planeacion_id', PLANEACION_ID)`, estamos en el SELECT del paso 5
      // → devolver error.
      if (table === 'sesion' && failConfig.sesionSelectFail) {
        const hasOriginEq = state.eqs.some(
          (f) => f.col === 'planeacion_id' && f.val === PLANEACION_ID,
        );
        if (hasOriginEq) {
          resolve({ data: null, error: new Error('mock select failed: sesion origen') });
          return;
        }
      }
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
 * Variante de buildQuery que, en sus terminales, ELIMINA filas de
 * `store.inserted[table]`. Usada por `delete()` en el mock — sólo aplica
 * los filtros `eq` y `in` (no `orderBy` ni lectura).
 */
function buildDeleteQuery(table: Table, state: FilterState) {
  function matchRow(r: Row): boolean {
    for (const f of state.eqs) {
      if (r[f.col] !== f.val) return false;
    }
    for (const f of state.ins) {
      if (!f.vals.includes(r[f.col])) return false;
    }
    return true;
  }
  return {
    eq(col: string, val: unknown) {
      return buildDeleteQuery(table, { ...state, eqs: [...state.eqs, { col, val }] });
    },
    in(col: string, vals: unknown[]) {
      return buildDeleteQuery(table, { ...state, ins: [...state.ins, { col, vals }] });
    },
    then(resolve: (v: { data: Row[]; error: null } | { data: null; error: Error }) => void) {
      // IMPL-20260819-03 (P3-N3 parte ii): inyección de fallo por tabla para
      // simular errores intermedios en los 3 deletes de compensación
      // (RLS patológico o fallo transitorio). El boolean de `compensarClonado`
      // debe ser `false` cuando CUALQUIER delete devuelva error.
      if (table === 'bloque' && failConfig.deleteBloqueFail) {
        resolve({ data: null, error: new Error('mock delete failed: bloque') });
        return;
      }
      if (table === 'sesion' && failConfig.deleteSesionFail) {
        resolve({ data: null, error: new Error('mock delete failed: sesion') });
        return;
      }
      if (table === 'planeacion' && failConfig.deletePlaneacionFail) {
        resolve({ data: null, error: new Error('mock delete failed: planeacion') });
        return;
      }
      store.inserted[table] = store.inserted[table].filter((r) => !matchRow(r));
      resolve({ data: [], error: null });
    },
    async maybeSingle() {
      store.inserted[table] = store.inserted[table].filter((r) => !matchRow(r));
      return { data: null, error: null };
    },
    async single() {
      store.inserted[table] = store.inserted[table].filter((r) => !matchRow(r));
      return { data: null, error: null };
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from(table: Table) {
      return {
        select(_cols?: string) {
          return buildQuery(table, { eqs: [], ins: [] });
        },
        insert(row: Row | Row[]) {
          const arr = Array.isArray(row) ? row : [row];
          // Reglas de inyección de fallo (leídas de `failConfig` en `hoisted`).
          if (table === 'planeacion' && failConfig.planeacionFail) {
            return {
              select(_cols?: string) {
                return {
                  async single() {
                    return {
                      data: null,
                      error: new Error('mock insert failed: planeacion'),
                    };
                  },
                };
              },
            };
          }
          if (table === 'sesion') {
            failConfig.insertSesionCount++;
            if (
              failConfig.sesionFailOnCount >= 0 &&
              failConfig.insertSesionCount === failConfig.sesionFailOnCount
            ) {
              return {
                select(_cols?: string) {
                  return {
                    async single() {
                      return {
                        data: null,
                        error: new Error('mock insert failed: sesion K+1'),
                      };
                    },
                  };
                },
              };
            }
          }
          if (table === 'bloque') {
            failConfig.insertBloqueCount++;
            if (
              failConfig.bloqueFailOnCount >= 0 &&
              failConfig.insertBloqueCount === failConfig.bloqueFailOnCount
            ) {
              // Producción hace `await supabase.from('bloque').insert(...)` sin
              // encadenar `.select().single()`. Devolvemos un thenable que al
              // hacer `await` resuelve a `{ error }`.
              return {
                then(resolve: (v: { data: null; error: Error }) => void) {
                  resolve({ data: null, error: new Error('mock insert failed: bloque K+1') });
                },
              };
            }
          }
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
        delete() {
          return buildDeleteQuery(table, { eqs: [], ins: [] });
        },
      };
    },
  }),
}));

import { duplicarPlaneacion } from '@/services/planeaciones/planeacion-actions';

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
      grupoOrig('dddddddd-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '09DPR9999X'),
    ],
  };
  store.inserted = {
    planeacion: [],
    sesion: [],
    bloque: [],
    evaluacion_alumno: [],
    grupo: [],
  };
  // Resetear contadores de inyección de fallos.
  failConfig.sesionFailOnCount = -1;
  failConfig.bloqueFailOnCount = -1;
  failConfig.planeacionFail = false;
  failConfig.insertSesionCount = 0;
  failConfig.insertBloqueCount = 0;
  failConfig.sesionSelectFail = false;
  failConfig.deleteBloqueFail = false;
  failConfig.deleteSesionFail = false;
  failConfig.deletePlaneacionFail = false;
  failConfig.useFixedUuid = false;
  failConfig.uuidCounter = 0;
}

describe('duplicarPlaneacion — compensación (IMPL-20260819-02 Fix P2-2, AC-4/AC-5)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('AC-4 caso A: fallo al insertar la PRIMERA sesión (sesiones vacías) → compensación ejecuta y {ok:false}', async () => {
    failConfig.sesionFailOnCount = 1;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/mock insert failed: sesion K\+1/);

    // AC-4: la compensación DEBE haber borrado la planeacion creada en (4).
    const planeacionesHuerfanas = store.inserted.planeacion.filter(
      (p) => p.estado === 'borrador' && (p as Row).clonada_de === PLANEACION_ID,
    );
    expect(planeacionesHuerfanas.length).toBe(0);
    // El insert de la primera sesion falló antes de push → no hay sesiones.
    expect(store.inserted.sesion.length).toBe(0);
    expect(store.inserted.bloque.length).toBe(0);
  });

  it('AC-4 caso B: fallo al insertar bloque tras K sesiones → compensación borra planeacion + sesiones del intento', async () => {
    // Dejamos que pasen las 3 sesiones (count 1, 2, 3 → succeed) y forzamos
    // fallo en el PRIMER insert de bloque (count 1).
    failConfig.bloqueFailOnCount = 1;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/mock insert failed: bloque K\+1/);

    // AC-4 + AC-5: la compensación borró las 3 sesiones (por .in('sesion_id', ...))
    // y la planeacion (por .eq('id', nueva.id)). No debe quedar ningún bloque.
    expect(store.inserted.planeacion.length).toBe(0);
    expect(store.inserted.sesion.length).toBe(0);
    expect(store.inserted.bloque.length).toBe(0);
  });

  it('AC-4 caso C: fallo al insertar bloque en una sesión posterior → compensación incluye esa sesión', async () => {
    // Pasamos las 3 sesiones; forzamos fallo en el 2º bloque insertado (count 2).
    // El primer bloque pertenece a sesion-1 (que ya se borró junto con el resto).
    failConfig.bloqueFailOnCount = 2;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/mock insert failed: bloque K\+1/);

    expect(store.inserted.planeacion.length).toBe(0);
    expect(store.inserted.sesion.length).toBe(0);
    expect(store.inserted.bloque.length).toBe(0);
  });

  it('AC-4 caso D: fallo temprano (insert de planeacion) → no hay nada que compensar, {ok:false}', async () => {
    failConfig.planeacionFail = true;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/mock insert failed: planeacion/);
    // No hay nada del intento: ni planeacion, ni sesiones, ni bloques.
    expect(store.inserted.planeacion.length).toBe(0);
    expect(store.inserted.sesion.length).toBe(0);
    expect(store.inserted.bloque.length).toBe(0);
  });

  it('AC-5: la compensación sólo opera sobre IDs del intento (no borra filas ajenas)', async () => {
    // Sembramos filas ajenas al intento en `store.inserted` (con planeacion_id
    // distinto al de la nueva planeacion) y verificamos que la compensación
    // no las toca.
    const OTRO_PLANEACION_ID = '99999999-9999-9999-9999-999999999999';
    const SESION_AJENA_ID = '88888888-8888-8888-8888-888888888888';
    store.inserted.sesion.push({
      id: SESION_AJENA_ID,
      planeacion_id: OTRO_PLANEACION_ID,
      docente_id: DOCENTE_ID,
      cct: CCT_A,
      numero: 99,
      fase_interna: 'inicio',
      estado: 'pendiente',
    } as Row);

    failConfig.sesionFailOnCount = 1;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    expect(r.ok).toBe(false);

    // La compensación borró la planeacion del intento (eq id = nueva).
    expect(store.inserted.planeacion.length).toBe(0);
    // La fila ajena NO fue tocada (su planeacion_id ≠ nueva.id).
    expect(
      store.inserted.sesion.some((s) => (s.id as string) === SESION_AJENA_ID),
    ).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────
  // IMPL-20260819-03 — Cierre P3-N1 (errSes) + P3-N3 (mensaje + errores intermedios)
  // ────────────────────────────────────────────────────────────────────────

  it('AC-P3-1 (N1): fallo en SELECT de sesiones origen tras insert de planeacion → compensación ejecuta y store termina con planeacion.length === 0', async () => {
    // El SELECT del paso 5 (sesion by planeacion_id=origen) falla tras el
    // insert exitoso de planeacion (paso 4). El nuevo path de compensación
    // (FIX P3-N1) debe borrar la planeacion recién creada. La compensación
    // usa `sesionesCreadas=[]` → sólo borra la planeacion.
    failConfig.sesionSelectFail = true;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    expect(r.ok).toBe(false);
    // La compensación fue exitosa (booleano true) → el caller devuelve el
    // error original del SELECT, no el mensaje de fallo de compensación.
    expect(r.error).toMatch(/mock select failed: sesion origen/);
    // Store quedó sin planeación huérfana.
    expect(store.inserted.planeacion.length).toBe(0);
    expect(store.inserted.sesion.length).toBe(0);
    expect(store.inserted.bloque.length).toBe(0);
  });

  it('AC-P3-3 (N3 i): compensación falla (delete de planeacion devuelve error) → caller devuelve el mensaje verbatim con el UUID', async () => {
    // Forzamos que el primer insert de sesion falle Y que el delete de
    // compensacion sobre planeacion devuelva error. El booleano del call
    // site (FIX P3-N3 parte i) es `false` → el caller devuelve el mensaje
    // verbatim del handoff P2-FIXES Fix 2 punto 4.
    failConfig.sesionFailOnCount = 1;
    failConfig.deletePlaneacionFail = true;
    failConfig.useFixedUuid = true;
    failConfig.uuidCounter = 0;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    // nuevaPlaneacionId fue el primer UUID generado (counter=1).
    const expectedId = '00000000-0000-4000-8000-000000000001';
    expect(r.ok).toBe(false);
    expect(r.error).toBe(
      `Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=${expectedId}`,
    );
  });

  it('AC-P3-4 (N3 ii): sólo el delete de bloque falla (sesion y planeacion exitosos, sesionesCreadas no vacío) → compensarClonado retorna false → caller devuelve el mensaje verbatim', async () => {
    // Forzamos que el primer insert de bloque falle (tras 3 sesiones OK),
    // Y que el delete de compensación sobre bloque devuelva error. El booleano
    // del call site (FIX P3-N3 parte i) es `false` (porque FIX P3-N3 parte ii
    // inspecciona el {error} del delete de bloque) → el caller devuelve el
    // mensaje verbatim.
    failConfig.bloqueFailOnCount = 1;
    failConfig.deleteBloqueFail = true;
    failConfig.useFixedUuid = true;
    failConfig.uuidCounter = 0;

    const r = await duplicarPlaneacion({
      planeacionId: PLANEACION_ID,
      docenteId: DOCENTE_ID,
      cct: CCT_A,
      grupoDestinoId: GRUPO_DESTINO_ID,
    });

    const expectedId = '00000000-0000-4000-8000-000000000001';
    expect(r.ok).toBe(false);
    expect(r.error).toBe(
      `Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=${expectedId}`,
    );
    // El mensaje contiene la sub-cadena canónica (verbatim).
    expect(r.error).toContain('Falló la compensación del clonado');
  });
});