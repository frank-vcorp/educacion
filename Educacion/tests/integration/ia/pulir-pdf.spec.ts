/**
 * Integration: POST /api/planeaciones/:id/ia/pulir-pdf  (F3, SPEC_TEC_07 §5.3)
 * IMPL-20260819-04 — AC-12 a AC-15 (enumeración, validación PDA, fallback graceful).
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
  problema_contexto: 'Contexto inicial del problema.',
  proposito: 'Propósito pedagógico inicial.',
  producto_integrador: 'Producto integrador inicial.',
  ajustes_razonables: 'Ajustes razonables iniciales con suficiente detalle para validar.',
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
      if (table === 'pda') {
        return {
          select: () => ({
            eq: () => ({
              // El handler hace `.from('pda').select('codigo').eq('activo', true)`
              // y trata el resultado como data[].
              then: undefined,
              // Como el handler hace await directo:
              // await supabase.from('pda').select('codigo').eq('activo', true);
              // necesitamos un thenable. Vitest await sobre objeto plano
              // funciona si el objeto tiene `then`. Más simple: lo hacemos
              // await-able manualmente:
              [Symbol.toPrimitive]: () => undefined,
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

import { POST } from '@/app/api/planeaciones/[id]/ia/pulir-pdf/route';
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
    `http://localhost:3000/api/planeaciones/${PLANEACION_ID}/ia/pulir-pdf`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

function installFetch(body: unknown) {
  (globalThis as { fetch: typeof fetch }).fetch = (async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
}

describe('POST /api/planeaciones/:id/ia/pulir-pdf (F3, AC-12..AC-15)', () => {
  beforeEach(() => {
    setSession({ docenteId: DOCENTE_ID });
    resetRateLimiter();
    __setRateLimitStoreForTests(null);
    auditInserts.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // AC-12: 200 con campos_pulidos
  it('AC-12: 200 con campos_pulidos cuando proveedor devuelve JSON válido', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              campos: [
                { campo: 'problema_contexto', texto_pulido: 'Contexto pulido con mejor prosa.' },
                { campo: 'proposito', texto_pulido: 'Propósito pulido y claro.' },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({ campos_a_pulir: ['problema_contexto', 'proposito'] }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.campos_pulidos).toHaveLength(2);
    expect(body.data.origen).toBe('ia');
  });

  // AC-13: array vacío → 422
  it('AC-13: campos_a_pulir vacío → 422 validation', async () => {
    const res = await POST(req({ campos_a_pulir: [] }), { params: { id: PLANEACION_ID } });
    expect(res.status).toBe(422);
  });

  // AC-14: enum inválido "objetivo" → 422
  it('AC-14: campos_a_pulir=["objetivo"] → 422 validation (no en enum)', async () => {
    const res = await POST(req({ campos_a_pulir: ['objetivo'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(422);
  });

  // AC-15: PDA no en catálogo → 422
  it('AC-15: PDA no en catálogo → 422 NEM_IA_VARIANTE_VIOLA_ESTRUCTURA con details.campo', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              campos: [
                {
                  campo: 'proposito',
                  texto_pulido: 'Propósito con PDA-F2-XXX-999 nuevo.',
                },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_IA_VARIANTE_VIOLA_ESTRUCTURA');
    expect(body.error.details.campo).toBe('proposito');
  });

  // F3 NO se invoca desde lib/pdf/generate.ts
  it('AC-16: lib/pdf/generate.ts no contiene referencias a services/ia', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'lib/pdf/generate.ts');
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).not.toMatch(/services\/ia/);
  });

  // Respuesta no es JSON válido → 200 fallback_vacio, NO 422
  it('respuesta del proveedor no es JSON válido → 200 origen=fallback_vacio, campos_pulidos=[]', async () => {
    installFetch({
      choices: [{ message: { content: 'Esto no es JSON válido' } }],
    });
    const res = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.origen).toBe('fallback_vacio');
    expect(body.data.campos_pulidos).toEqual([]);
  });

  // JSON envuelto en ```json ... ```
  it('JSON envuelto en markdown ```json ... ``` se parsea', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: '```json\n{"campos":[{"campo":"proposito","texto_pulido":"pulido"}]}\n```',
          },
        },
      ],
    });
    const res = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.campos_pulidos).toHaveLength(1);
    expect(body.data.campos_pulidos[0].campo).toBe('proposito');
    expect(body.data.campos_pulidos[0].texto_pulido).toBe('pulido');
  });

  // 401 sin sesión
  it('401 NEM_AUTH_UNAUTHORIZED sin sesión', async () => {
    setSession({ docenteId: null });
    const res = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(401);
  });

  // AI_API_KEY vacía → 200 fallback_vacio
  it('AI_API_KEY vacía → 200 origen=fallback_vacio', async () => {
    const orig = process.env.AI_API_KEY;
    process.env.AI_API_KEY = '';
    try {
      const res = await POST(req({ campos_a_pulir: ['proposito'] }), {
        params: { id: PLANEACION_ID },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.origen).toBe('fallback_vacio');
    } finally {
      process.env.AI_API_KEY = orig ?? 'test-ai-key';
    }
  });

  // Rate-limit
  it('6ª llamada → 429', async () => {
    installFetch({
      choices: [{ message: { content: JSON.stringify({ campos: [] }) } }],
    });
    for (let i = 0; i < 5; i += 1) {
      const r = await POST(req({ campos_a_pulir: ['proposito'] }), {
        params: { id: PLANEACION_ID },
      });
      expect(r.status).toBe(200);
    }
    const sixth = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(sixth.status).toBe(429);
  });

  // ─── AC-29 (P1-1, audit_log POST en F3) ─────────────────────────────

  it('AC-29: 200 éxito → exactamente 1 audit_log.insert con CCT real, method=POST y body_hash hex', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              campos: [
                { campo: 'proposito', texto_pulido: 'Propósito pulido y claro.' },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({ campos_a_pulir: ['proposito'] }),
      { params: { id: PLANEACION_ID } },
    );
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(1);
    const p = auditInserts[0]!.payload;
    expect(p.cct).toBe(CCT);
    expect(p.cct).not.toBe(DOCENTE_ID);
    expect(p.method).toBe('POST');
    expect(p.endpoint).toBe('planeaciones_pulir_pdf');
    expect(p.docente_id).toBe(DOCENTE_ID);
    expect(p.response_status).toBe(200);
    expect(typeof p.body_hash).toBe('string');
    expect((p.body_hash as string)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('AC-29: 200 fallback_vacio (JSON inválido) → 1 insert con response_status=200', async () => {
    installFetch({
      choices: [{ message: { content: 'Esto no es JSON válido' } }],
    });
    const res = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]!.payload.response_status).toBe(200);
    expect(auditInserts[0]!.payload.cct).toBe(CCT);
  });

  it('AC-29: 422 PDA no en catálogo → 1 insert con response_status=422', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              campos: [
                { campo: 'proposito', texto_pulido: 'Propósito con PDA-F2-XXX-999 nuevo.' },
              ],
            }),
          },
        },
      ],
    });
    const res = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(422);
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]!.payload.response_status).toBe(422);
    expect(auditInserts[0]!.payload.cct).toBe(CCT);
  });

  it('AC-29: 401/429/422-VALIDATION → 0 inserts audit_log', async () => {
    // 401 sin sesión
    setSession({ docenteId: null });
    let res = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(res.status).toBe(401);
    expect(auditInserts).toHaveLength(0);

    // 422 VALIDATION (array vacío)
    setSession({ docenteId: DOCENTE_ID });
    res = await POST(req({ campos_a_pulir: [] }), { params: { id: PLANEACION_ID } });
    expect(res.status).toBe(422);
    expect(auditInserts).toHaveLength(0);

    // 429
    installFetch({
      choices: [{ message: { content: JSON.stringify({ campos: [] }) } }],
    });
    for (let i = 0; i < 5; i += 1) {
      await POST(req({ campos_a_pulir: ['proposito'] }), {
        params: { id: PLANEACION_ID },
      });
    }
    auditInserts.length = 0;
    const sixth = await POST(req({ campos_a_pulir: ['proposito'] }), {
      params: { id: PLANEACION_ID },
    });
    expect(sixth.status).toBe(429);
    expect(auditInserts).toHaveLength(0);
  });
});