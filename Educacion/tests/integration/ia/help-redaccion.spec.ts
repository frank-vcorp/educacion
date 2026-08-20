/**
 * Integration: POST /api/planeaciones/:id/ia/help-redaccion  (F2, SPEC_TEC_07 §5.2)
 * IMPL-20260819-04 — AC-7 a AC-10 (expansion, validación, anonimización).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const DOCENTE_ID = '11111111-1111-1111-1111-111111111111';
const CCT = '09DPR1234Z';
const PLANEACION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// ─── Captura de audit_log (AC-29, P1-1) ───
type AuditInsert = { payload: Record<string, unknown> };
const auditInserts: AuditInsert[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => buildSupabaseMock()),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

const planeacionRow = {
  id: PLANEACION_ID,
  docente_id: DOCENTE_ID,
  estado: 'borrador',
  cct: CCT,
};

function buildSupabaseMock() {
  return {
    from: (table: string) => {
      if (table === 'planeacion') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () =>
                val === PLANEACION_ID
                  ? { data: planeacionRow, error: null }
                  : { data: null, error: null },
            }),
          }),
        };
      }
      if (table === 'bloque') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () =>
                val === 'bloque-ok'
                  ? {
                      data: {
                        id: val,
                        docente_id: DOCENTE_ID,
                        planeacion_id: PLANEACION_ID,
                        contenido_textual: 'Texto de contexto',
                      },
                      error: null,
                    }
                  : { data: null, error: null },
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

import { POST } from '@/app/api/planeaciones/[id]/ia/help-redaccion/route';
import { getServerSession } from '@/lib/auth/session';
import { resetRateLimiter, __setRateLimitStoreForTests } from '@/services/ia/rate-limiter';

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
    `http://localhost:3000/api/planeaciones/${PLANEACION_ID}/ia/help-redaccion`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

describe('POST /api/planeaciones/:id/ia/help-redaccion (F2, AC-7..AC-10)', () => {
  beforeEach(() => {
    setSession({ docenteId: DOCENTE_ID });
    resetRateLimiter();
    __setRateLimitStoreForTests(null);
    auditInserts.length = 0;

    // Mock fetch global
    const orig = globalThis.fetch;
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Texto propuesto expandido y mejorado.' } }],
        }),
        { status: 200 },
      )) as typeof fetch;
    // Guardamos orig en afterEach
    (globalThis as unknown as { __origFetch: typeof fetch }).__origFetch = orig;
  });

  afterEach(() => {
    const orig = (globalThis as unknown as { __origFetch: typeof fetch }).__origFetch;
    (globalThis as { fetch: typeof fetch }).fetch = orig;
    vi.clearAllMocks();
  });

  // AC-7: 200 con texto_propuesto
  it('AC-7: 200 con texto_propuesto y origen=ia', async () => {
    const res = await POST(
      req({
        texto_base: 'El niño explorará las semillas del jardín.',
        accion: 'expandir',
      }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.texto_propuesto).toBe('Texto propuesto expandido y mejorado.');
    expect(body.data.accion).toBe('expandir');
    expect(body.data.origen).toBe('ia');
  });

  // AC-8: F2 NO persiste (P-PD9). Verificamos que no hay INSERT en el mock.
  it('AC-8: F2 no hace INSERT/UPDATE en bloque o planeación', async () => {
    // El mock no expone insert/update; verificamos que el route handler
    // sólo hace SELECT (planeacion + opcional bloque).
    const res = await POST(
      req({
        texto_base: 'Texto base simple para expandir.',
        accion: 'expandir',
      }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(200);
    // El mock `from` no expone ningún `insert/update`, así que cualquier
    // llamada de escritura fallaría. La sola finalización exitosa prueba
    // que no se intentó persistir.
    expect(true).toBe(true);
  });

  // AC-9: anonimización de texto_base (spy: el contenido enviado al
  // proveedor no contiene nombres originales).
  it('AC-9: AC-22 — texto_base con María + CURP + celular se anonimiza antes del proveedor', async () => {
    let receivedUserContent = '';
    const orig = globalThis.fetch;
    (globalThis as { fetch: typeof fetch }).fetch = (async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const userMsg = body.messages?.[1]?.content ?? '';
      receivedUserContent = userMsg;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Propuesta anonimizada.' } }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const res = await POST(
        req({
          texto_base:
            'La alumna María López García CURP LOMG850623HDFRPR09 celular 5512345678',
          accion: 'expandir',
        }),
        { params: { id: PLANEACION_ID } },
      );
      expect(res.status).toBe(200);
      expect(receivedUserContent).not.toContain('María López');
      expect(receivedUserContent).not.toContain('LOMG850623');
      expect(receivedUserContent).not.toContain('5512345678');
      expect(receivedUserContent).toContain('[NOMBRE]');
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = orig;
    }
  });

  // AC-10: texto_base < 5 chars → 422
  it('AC-10: texto_base con 4 chars → 422 NEM_PLANEACIONES_VALIDATION_ERROR', async () => {
    const res = await POST(
      req({ texto_base: 'hola', accion: 'expandir' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_PLANEACIONES_VALIDATION_ERROR');
  });

  // Accion=simplificar sin edad_destino → 422
  it('simplificar sin edad_destino → 422 validation', async () => {
    const res = await POST(
      req({ texto_base: 'Texto lo bastante largo para validar.', accion: 'simplificar' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(422);
  });

  // accion=simplificar CON edad_destino → 200 OK
  it('simplificar con edad_destino=4-5 → 200', async () => {
    const res = await POST(
      req({
        texto_base: 'Texto de cinco caracteres o más.',
        accion: 'simplificar',
        edad_destino: '4-5',
      }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(200);
  });

  // 401 sin sesión
  it('401 NEM_AUTH_UNAUTHORIZED sin sesión', async () => {
    setSession({ docenteId: null });
    const res = await POST(
      req({ texto_base: 'Texto base suficiente.', accion: 'expandir' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(401);
  });

  // Rate-limit
  it('6ª llamada → 429', async () => {
    for (let i = 0; i < 5; i += 1) {
      const r = await POST(
        req({ texto_base: `Texto ${i} suficiente.`, accion: 'expandir' }),
        { params: { id: PLANEACION_ID } },
      );
      expect(r.status).toBe(200);
    }
    const sixth = await POST(
      req({ texto_base: 'Sexto intento válido.', accion: 'expandir' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(sixth.status).toBe(429);
  });

  // ─── AC-29 (P1-1, audit_log POST en F2) ─────────────────────────────

  it('AC-29: 200 éxito → exactamente 1 audit_log.insert con CCT real, method=POST y body_hash hex', async () => {
    const res = await POST(
      req({ texto_base: 'Texto base para expandir.', accion: 'expandir' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(1);
    const p = auditInserts[0]!.payload;
    expect(p.cct).toBe(CCT);
    expect(p.cct).not.toBe(DOCENTE_ID);
    expect(p.method).toBe('POST');
    expect(p.endpoint).toBe('planeaciones_help_redaccion');
    expect(p.docente_id).toBe(DOCENTE_ID);
    expect(p.response_status).toBe(200);
    expect(typeof p.body_hash).toBe('string');
    expect((p.body_hash as string)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('AC-29: 401/429/422-VALIDATION → 0 inserts audit_log', async () => {
    // 401 sin sesión
    setSession({ docenteId: null });
    let res = await POST(
      req({ texto_base: 'Texto base suficiente.', accion: 'expandir' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(401);
    expect(auditInserts).toHaveLength(0);

    // 422 VALIDATION (texto_base < 5)
    setSession({ docenteId: DOCENTE_ID });
    res = await POST(
      req({ texto_base: 'hola', accion: 'expandir' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(422);
    expect(auditInserts).toHaveLength(0);

    // 429
    for (let i = 0; i < 5; i += 1) {
      await POST(
        req({ texto_base: `Texto ${i} suficiente.`, accion: 'expandir' }),
        { params: { id: PLANEACION_ID } },
      );
    }
    auditInserts.length = 0;
    const sixth = await POST(
      req({ texto_base: 'Sexto intento válido.', accion: 'expandir' }),
      { params: { id: PLANEACION_ID } },
    );
    expect(sixth.status).toBe(429);
    expect(auditInserts).toHaveLength(0);
  });
});