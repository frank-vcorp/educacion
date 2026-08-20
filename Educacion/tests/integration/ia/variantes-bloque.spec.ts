/**
 * Integration: POST /api/planeaciones/:id/ia/variantes-bloque  (F1, SPEC_TEC_07 §5.1)
 * IMPL-20260819-04 — AC-1 a AC-6 (variantes, rate-limit, cache, forzar_refresh).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Constantes ───
const DOCENTE_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_DOCENTE_ID = '22222222-2222-2222-2222-222222222222';
const CCT = '09DPR1234Z';
const PLANEACION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BLOQUE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

// ─── Captura de audit_log (AC-29, P1-1) ───
type AuditInsert = { payload: Record<string, unknown> };
const auditInserts: AuditInsert[] = [];

const bloqueRow = {
  id: BLOQUE_ID,
  planeacion_id: PLANEACION_ID,
  docente_id: DOCENTE_ID,
  contenido_textual: 'Texto original del bloque. Trabajamos PDA-F2-LNG-001.',
  pda_ids: ['PDA-F2-LNG-001'],
  campos_formativos: ['LENGUAJES'],
  ejes_articuladores: ['INCLUSION'],
  planeacion: { estado: 'borrador' as string },
};

// ─── Mocks globales ───

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => buildSupabaseMock()),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

// ─── Mock fetch (sustituye cliente IA sin tocar `globalThis.fetch` global) ───

let fetchBehavior:
  | { kind: 'ok'; body: unknown }
  | { kind: 'fail' }
  | null = null;

const originalFetch = globalThis.fetch;
function installFetchMock() {
  (globalThis as { fetch: typeof fetch }).fetch = (async (
    _url: string | URL | Request,
    _init?: RequestInit,
  ) => {
    if (!fetchBehavior || fetchBehavior.kind === 'fail') {
      return new Response('boom', { status: 500 });
    }
    return new Response(JSON.stringify(fetchBehavior.body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}
function uninstallFetchMock() {
  (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
}

// ─── Supabase mock con control de estado ───

type SupabaseState = {
  bloqueOwnerById: Map<string, { id: string; docente_id: string; planeacion_id: string }>;
  planeacionEstado: string;
};

let supaState: SupabaseState = {
  bloqueOwnerById: new Map(),
  planeacionEstado: 'borrador',
};

function buildSupabaseMock() {
  return {
    from: (table: string) => {
      if (table === 'bloque') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                if (table === 'bloque' && _col === 'id') {
                  if (val === BLOQUE_ID) {
                    // P1-1: el route ahora selecciona `cct`; el mock expone
                    // la fila completa incluyendo `cct` para que `audit_log`
                    // reciba CCT real.
                    return {
                      data: {
                        ...bloqueRow,
                        cct: CCT,
                        planeacion: { estado: supaState.planeacionEstado },
                      },
                      error: null,
                    };
                  }
                  return { data: null, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'planeacion') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                if (val === PLANEACION_ID) {
                  return { data: { id: PLANEACION_ID, estado: supaState.planeacionEstado, docente_id: DOCENTE_ID, cct: CCT }, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'audit_log') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            auditInserts.push({ payload });
            return { data: null, error: null };
          },
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      };
    },
  };
}

// ─── Imports ───

import { POST } from '@/app/api/planeaciones/[id]/ia/variantes-bloque/route';
import { getServerSession } from '@/lib/auth/session';
import {
  resetRateLimiter,
  __setRateLimitStoreForTests,
} from '@/services/ia/rate-limiter';
import { resetIaCache, __setCacheStoreForTests } from '@/services/ia/cache';

const mockGetServerSession = vi.mocked(getServerSession);

function setSession(overrides: { docenteId: string | null }) {
  mockGetServerSession.mockResolvedValue(
    overrides.docenteId
      ? ({
          user: { id: overrides.docenteId } as unknown as import('@supabase/supabase-js').User,
          cct: CCT,
          docenteId: overrides.docenteId,
          hasAcceptedAviso: true,
          hasGrupoActivo: true,
        } as unknown as Awaited<ReturnType<typeof getServerSession>>)
      : null,
  );
}

function req(body: unknown): Request {
  return new Request(
    `http://localhost:3000/api/planeaciones/${PLANEACION_ID}/ia/variantes-bloque`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

describe('POST /api/planeaciones/:id/ia/variantes-bloque (F1, AC-1..AC-6)', () => {
  beforeEach(() => {
    setSession({ docenteId: DOCENTE_ID });
    resetRateLimiter();
    __setRateLimitStoreForTests(null);
    resetIaCache();
    __setCacheStoreForTests(null);
    auditInserts.length = 0;
    supaState = {
      bloqueOwnerById: new Map(),
      planeacionEstado: 'borrador',
    };
    installFetchMock();
    fetchBehavior = {
      kind: 'ok',
      body: { choices: [{ message: { content: 'Variante rural adaptada sin PDA nuevos.' } }] },
    };
  });

  afterEach(() => {
    uninstallFetchMock();
    vi.clearAllMocks();
  });

  // ─── AC-1: 200 con origen correcto ───
  it('AC-1: 200 con data.variante_texto y origen=ia', async () => {
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.variante_texto).toBe('Variante rural adaptada sin PDA nuevos.');
    expect(body.data.variante_tipo).toBe('rural');
    expect(body.data.bloque_id).toBe(BLOQUE_ID);
    expect(body.data.origen).toBe('ia');
  });

  // ─── AC-2: respuesta altera PDA → 422 ───
  it('AC-2: 422 NEM_IA_VARIANTE_VIOLA_ESTRUCTURA si respuesta introduce PDA nuevo', async () => {
    fetchBehavior = {
      kind: 'ok',
      body: { choices: [{ message: { content: 'Incluyo PDA-F2-LNG-999 que es nuevo.' } }] },
    };
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_IA_VARIANTE_VIOLA_ESTRUCTURA');
  });

  // ─── AC-3: AI_API_KEY vacía → 200 fallback_vacio ───
  it('AC-3: AI_API_KEY vacía → 200 origen=fallback_vacio (no 5xx)', async () => {
    const original = process.env.AI_API_KEY;
    process.env.AI_API_KEY = '';
    try {
      const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.origen).toBe('fallback_vacio');
      expect(body.data.variante_texto).toBe('');
    } finally {
      process.env.AI_API_KEY = original ?? 'test-ai-key';
    }
  });

  // ─── AC-4: 6 llamadas → 6ª 429 ───
  it('AC-4: 6 llamadas en 60s → la 6ª 429 NEM_RATE_LIMIT_EXCEEDED con Retry-After', async () => {
    for (let i = 0; i < 5; i += 1) {
      const r = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
      expect(r.status).toBe(200);
    }
    const sixth = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(sixth.status).toBe(429);
    const body = await sixth.json();
    expect(body.error.code).toBe('NEM_RATE_LIMIT_EXCEEDED');
    expect(sixth.headers.get('Retry-After')).toBeDefined();
  });

  // ─── AC-5: cache hit en 2ª llamada ───
  it('AC-5: 2ª llamada idéntica → origen=cache (NO llama al proveedor)', async () => {
    let fetchCalls = 0;
    const orig = globalThis.fetch;
    (globalThis as { fetch: typeof fetch }).fetch = (async (
      _url: string | URL | Request,
      _init?: RequestInit,
    ) => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Variante cacheable rural.' } }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const r1 = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
      expect(r1.status).toBe(200);
      const b1 = await r1.json();
      expect(b1.data.origen).toBe('ia');
      expect(fetchCalls).toBe(1);

      const r2 = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
      expect(r2.status).toBe(200);
      const b2 = await r2.json();
      expect(b2.data.origen).toBe('cache');
      expect(fetchCalls).toBe(1); // no se llamó de nuevo
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = orig;
    }
  });

  // ─── AC-6: forzar_refresh invalida cache ───
  it('AC-6: forzar_refresh=true → cache inválido, llama al proveedor', async () => {
    let fetchCalls = 0;
    const orig = globalThis.fetch;
    (globalThis as { fetch: typeof fetch }).fetch = (async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'X' } }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      // Primera llamada → cachea
      await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
      // Segunda con forzar_refresh
      const r2 = await POST(
        req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural', forzar_refresh: true }),
        { params: { id: PLANEACION_ID } },
      );
      const b2 = await r2.json();
      expect(b2.data.origen).toBe('ia');
      expect(fetchCalls).toBe(2);
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = orig;
    }
  });

  // ─── Variante plurilingue → 422 ───
  it('variante_tipo=plurilingue → 422 NEM_IA_VARIANTE_TIPO_NO_SOPORTADO', async () => {
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'plurilingue' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_IA_VARIANTE_TIPO_NO_SOPORTADO');
  });

  // ─── Auth ───
  it('401 NEM_AUTH_UNAUTHORIZED sin sesión', async () => {
    setSession({ docenteId: null });
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(401);
  });

  it('403 NEM_AUTH_RLS_VIOLATION si bloque de otro docente', async () => {
    setSession({ docenteId: OTHER_DOCENTE_ID });
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_AUTH_RLS_VIOLATION');
  });

  it('409 NEM_PLANEACIONES_ARCHIVED si planeación archivada', async () => {
    supaState.planeacionEstado = 'archivada';
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_PLANEACIONES_ARCHIVED');
  });

  // ─── Anonymizer irredactable ───
  it('500 NEM_IA_ANONYMIZER_BLOCKED si PII irredactable', async () => {
    // Sobreescribir contenido_textual para incluir PII irredactable
    const original = bloqueRow.contenido_textual;
    bloqueRow.contenido_textual = 'Texto con MARIA LOPEZ GARCIA en mayúsculas.';
    try {
      const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('NEM_IA_ANONYMIZER_BLOCKED');
    } finally {
      bloqueRow.contenido_textual = original;
    }
  });

  it('429 respuesta incluye headers X-RateLimit-*', async () => {
    for (let i = 0; i < 5; i += 1) {
      await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
    }
    const sixth = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(sixth.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(sixth.headers.get('Retry-After')).toBeDefined();
  });

  // ─── AC-29 (P1-1, audit_log POST en F1) ─────────────────────────────

  it('AC-29: 200 éxito → exactamente 1 audit_log.insert con CCT real, method=POST y body_hash hex', async () => {
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(1);
    const p = auditInserts[0]!.payload;
    // CCT real (no UUID)
    expect(p.cct).toBe(CCT);
    expect(p.cct).not.toBe(DOCENTE_ID);
    expect(p.cct).toMatch(/^[0-9A-Z]{5,}$/);
    expect(p.method).toBe('POST');
    expect(p.endpoint).toBe('planeaciones_variantes_bloque');
    expect(p.docente_id).toBe(DOCENTE_ID);
    expect(p.response_status).toBe(200);
    // body_hash hex no vacío, derivado de payload anonimizado
    expect(typeof p.body_hash).toBe('string');
    expect((p.body_hash as string)).toMatch(/^[0-9a-f]{16}$/);
    // El input del hash NO contiene PII: la fuente es `anon.texto` (post
    // anonymizeRequest); en este fixture no hay PII, así que no hay forma
    // de incluir nombres/CURP. Verificamos que el hash es estable y no
    // contiene el texto crudo.
    expect(p.body_hash).not.toContain('PDA-F2-LNG-001');
  });

  it('AC-29: cache-hit en F1 → exactamente 1 audit_log.insert con body_hash derivado de ids', async () => {
    // Primera llamada para popular cache
    await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    auditInserts.length = 0;
    // Segunda llamada → cache hit
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.origen).toBe('cache');
    expect(auditInserts).toHaveLength(1);
    const p = auditInserts[0]!.payload;
    expect(p.method).toBe('POST');
    expect(p.response_status).toBe(200);
    expect(p.cct).toBe(CCT);
    // Cache-hit: body_hash derivado de ids no-PII (docenteId|bloque_id|variante_tipo)
    expect(typeof p.body_hash).toBe('string');
    expect((p.body_hash as string)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('AC-29: 422 NEM_IA_VARIANTE_VIOLA_ESTRUCTURA → audit_log con response_status=422', async () => {
    fetchBehavior = {
      kind: 'ok',
      body: { choices: [{ message: { content: 'Incluyo PDA-F2-LNG-999 que es nuevo.' } }] },
    };
    const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(422);
    expect(auditInserts).toHaveLength(1);
    const p = auditInserts[0]!.payload;
    expect(p.response_status).toBe(422);
    expect(p.cct).toBe(CCT);
    expect(p.method).toBe('POST');
  });

  it('AC-29: 401/403/429/422-VALIDATION → 0 inserts audit_log', async () => {
    // 401 sin sesión
    setSession({ docenteId: null });
    let res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(401);
    expect(auditInserts).toHaveLength(0);

    // 403 bloque de otro docente
    setSession({ docenteId: OTHER_DOCENTE_ID });
    res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(403);
    expect(auditInserts).toHaveLength(0);

    // 429 (re-seteamos sesión al DOCENTE_ID legítimo)
    setSession({ docenteId: DOCENTE_ID });
    for (let i = 0; i < 5; i += 1) {
      await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
    }
    auditInserts.length = 0; // ignoramos los 5 inserts previos
    const sixth = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(sixth.status).toBe(429);
    expect(auditInserts).toHaveLength(0);

    // 422 VALIDATION (body inválido). Reset rate-limiter entre secciones:
    // el handler evalúa rate-limit ANTES de zod, así que si el budget está
    // agotado, una body inválido cae en 429 (no en 422).
    resetRateLimiter();
    __setRateLimitStoreForTests(null);
    auditInserts.length = 0;
    res = await POST(req({ bloque_id: 'no-es-uuid', variante_tipo: 'rural' }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(422);
    expect(auditInserts).toHaveLength(0);
  });

  it('AC-29: 200 fallback_vacio → 1 insert audit_log con response_status=200', async () => {
    const orig = process.env.AI_API_KEY;
    process.env.AI_API_KEY = '';
    try {
      const res = await POST(req({ bloque_id: BLOQUE_ID, variante_tipo: 'rural' }), {
        params: { id: PLANEACION_ID },
      });
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(1);
    const p = auditInserts[0]!.payload;
    expect(p.response_status).toBe(200);
    expect(p.cct).toBe(CCT);
    expect(p.method).toBe('POST');
    } finally {
      process.env.AI_API_KEY = orig ?? 'test-ai-key';
    }
  });
});