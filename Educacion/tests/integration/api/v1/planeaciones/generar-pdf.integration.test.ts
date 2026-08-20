// @vitest-environment node
/**
 * Integration: GET /api/planeaciones/:id/generar-pdf  (SPEC_TEC_03 §6.30, T-E2E-05).
 * IMPL-20260819-01 — D-FIN-5 "Descargable binario".
 *
 * Usa `__setTestingRenderer` (hook declarado en lib/pdf/generate.ts) para
 * inyectar un renderer simulado, evitando depender de chromium real.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';

// ─────────────── Estado mutable para los mocks ───────────────

const DOCENTE_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_DOCENTE_ID = '22222222-2222-2222-2222-222222222222';
const CCT = '09DPR1234Z';
const PLANEACION_ID = 'p-001';

const planeacionRow = {
  id: PLANEACION_ID,
  nombre: 'Manifiesta tus emociones',
  problema_contexto: 'Contexto de prueba para render binario',
  campos_formativos: ['LO_HUMANO_LO_COMUNITARIO'],
  ejes_articuladores: ['INCLUSION'],
  pdas: ['PDA-LH-001'],
  periodo_inicio: '2026-02-01',
  periodo_fin: '2026-02-28',
  docente_id: DOCENTE_ID,
  cct: CCT,
  ajustes_razonables: 'Ajustes razonables de prueba',
};

// Buffer simulado: cabecera %PDF- + 11 000 bytes → > 10 KB
const fakePdfBody = Buffer.concat([
  Buffer.from('%PDF-1.4\n%binary\n'),
  Buffer.alloc(11_000, 0x42),
]);
const fakeSha = createHash('sha256').update(fakePdfBody).digest('hex');

const rendererState: {
  failNext: { code: string; message: string } | null;
  callCount: number;
  failFor: 'all' | 'next' | null;
} = {
  failNext: null,
  callCount: 0,
  failFor: null,
};

const fakeRenderer = {
  async renderHtmlToPdf(_html: string) {
    rendererState.callCount += 1;
    const shouldFail =
      rendererState.failFor === 'all' ||
      (rendererState.failFor === 'next' && (rendererState.failNext ?? null) !== null);
    if (shouldFail && rendererState.failNext) {
      const f = rendererState.failNext;
      rendererState.failNext = null;
      rendererState.failFor = null;
      throw new (class extends Error {
        readonly code = f.code;
        readonly httpStatus = 422;
      })(f.message);
    }
    return { pdf: fakePdfBody, sha256: fakeSha, size: fakePdfBody.length };
  },
};

// ─────────────── Mocks globales ───────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table !== 'planeacion') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        };
      }
      return {
        select: () => ({
          eq: (_col: string, val: string) => ({
            maybeSingle: async () => {
              if (val === PLANEACION_ID) return { data: planeacionRow, error: null };
              return { data: null, error: null };
            },
          }),
        }),
      };
    },
  })),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

// ─────────────── Imports (después de mocks) ───────────────

import { GET } from '@/app/api/planeaciones/[id]/generar-pdf/route';
import { getServerSession } from '@/lib/auth/session';
import { __setTestingRenderer } from '@/lib/pdf/generate';

const mockGetServerSession = vi.mocked(getServerSession);

function setSessionWith(overrides: { docenteId: string | null; userId?: string }) {
  const userId = overrides.userId ?? overrides.docenteId ?? 'anonymous';
  mockGetServerSession.mockResolvedValue(
    overrides.docenteId
      ? ({
          user: { id: userId } as unknown as import('@supabase/supabase-js').User,
          cct: CCT,
          docenteId: overrides.docenteId,
          hasAcceptedAviso: true,
          hasGrupoActivo: true,
        } as unknown as Awaited<ReturnType<typeof getServerSession>>)
      : null,
  );
}

describe('GET /api/planeaciones/:id/generar-pdf (T-E2E-05, §6.30)', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    rendererState.failNext = null;
    rendererState.callCount = 0;
    rendererState.failFor = null;
    __setTestingRenderer(fakeRenderer);
    process.env.PDF_GENERATOR = 'playwright';
    // Silenciar el console.error que el route emite cuando el renderer falla.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    __setTestingRenderer(null);
    vi.clearAllMocks();
  });

  it('200 application/pdf + Content-Disposition attachment + X-Pdf-Sha256 (docente owner)', async () => {
    setSessionWith({ docenteId: DOCENTE_ID });
    const res = await GET(makeReq(), { params: { id: PLANEACION_ID } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe(
      `attachment; filename="planeacion-${PLANEACION_ID}.pdf"`,
    );
    const sha = res.headers.get('X-Pdf-Sha256');
    expect(sha).toBe(fakeSha);
    expect(sha).toMatch(/^[a-f0-9]{64}$/);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buf.length).toBe(fakePdfBody.length);
    expect(buf.length).toBeGreaterThan(10240);
    expect(rendererState.callCount).toBe(1);
  });

  it('401 NEM_AUTH_UNAUTHORIZED sin sesión', async () => {
    setSessionWith({ docenteId: null });
    const res = await GET(makeReq(), { params: { id: PLANEACION_ID } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('NEM_AUTH_UNAUTHORIZED');
  });

  it('403 NEM_AUTH_RLS_VIOLATION cuando el :id es de otro docente', async () => {
    setSessionWith({ docenteId: OTHER_DOCENTE_ID });
    const res = await GET(makeReq(), { params: { id: PLANEACION_ID } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('NEM_AUTH_RLS_VIOLATION');
  });

  it('404 NEM_PLANEACIONES_NOT_FOUND cuando la planeación no existe', async () => {
    setSessionWith({ docenteId: DOCENTE_ID });
    const res = await GET(makeReq(), { params: { id: 'no-existe' } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NEM_PLANEACIONES_NOT_FOUND');
  });

  it('422 NEM_ENTREGA_PDF_GENERATION_FAILED cuando el renderer falla (NO retorna HTML)', async () => {
    setSessionWith({ docenteId: DOCENTE_ID });
    rendererState.failFor = 'next';
    rendererState.failNext = {
      code: 'NEM_ENTREGA_PDF_GENERATION_FAILED',
      message: 'chromium no disponible',
    };
    const res = await GET(makeReq(), { params: { id: PLANEACION_ID } });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('NEM_ENTREGA_PDF_GENERATION_FAILED');
    // CRÍTICO: nunca debe responder con text/html (cerramos la desviación §6.7)
    expect(res.headers.get('Content-Type')).not.toMatch(/text\/html/);
  });

  it('422 cuando PDF_GENERATOR !== playwright (degradación graceful del env)', async () => {
    // Apagamos el renderer inyectado y cambiamos el env para forzar el caso
    // real de "no hay chromium disponible" sin necesitar el binario.
    __setTestingRenderer(null);
    process.env.PDF_GENERATOR = 'html'; // o unset
    setSessionWith({ docenteId: DOCENTE_ID });
    const res = await GET(makeReq(), { params: { id: PLANEACION_ID } });
    expect(res.status).toBe(422);
    expect(res.headers.get('Content-Type')).not.toMatch(/text\/html/);
  });

  it('mismo input (mismo id) → mismo X-Pdf-Sha256 (estabilidad del hash con renderer inyectado)', async () => {
    setSessionWith({ docenteId: DOCENTE_ID });
    const r1 = await GET(makeReq(), { params: { id: PLANEACION_ID } });
    const r2 = await GET(makeReq(), { params: { id: PLANEACION_ID } });
    expect(r1.headers.get('X-Pdf-Sha256')).toBe(r2.headers.get('X-Pdf-Sha256'));
    expect(r1.headers.get('X-Pdf-Sha256')).toBe(fakeSha);
  });
});

function makeReq(): Request {
  return new Request('http://localhost:3000/api/planeaciones/x/generar-pdf', {
    method: 'GET',
  });
}
