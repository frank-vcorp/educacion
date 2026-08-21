/**
 * Integration: POST /api/planeaciones/ia/contexto-problema  (F0, SPEC_TEC_10 §11)
 * IMPL-20260820-06 — AC-1 a AC-11.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const DOCENTE_ID = '11111111-1111-1111-1111-111111111111';
const CCT = '09DPR1234Z';

type AuditInsert = { payload: Record<string, unknown> };
const auditInserts: AuditInsert[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => buildSupabaseMock()),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}));

function buildSupabaseMock() {
  return {
    from: (table: string) => {
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

import { POST } from '@/app/api/planeaciones/ia/contexto-problema/route';
import { getServerSession } from '@/lib/auth/session';
import { resetRateLimiter, __setRateLimitStoreForTests } from '@/services/ia/rate-limiter';

const mockGetServerSession = vi.mocked(getServerSession);

function setSession(overrides: { docenteId: string | null; cct?: string | null }) {
  mockGetServerSession.mockResolvedValue(
    overrides.docenteId
      ? ({
          user: {
            id: overrides.docenteId,
          } as unknown as import('@supabase/supabase-js').User,
          // Si el override trae `cct: null`, queremos propagarlo (no usar
          // fallback). Si trae string, úsalo. Si no trae la clave, usa CCT.
          cct: 'cct' in overrides ? overrides.cct : CCT,
          docenteId: overrides.docenteId,
          hasAcceptedAviso: true,
          hasGrupoActivo: true,
        } as unknown as Awaited<ReturnType<typeof getServerSession>>)
      : null,
  );
}

function req(body: unknown): Request {
  return new Request('http://localhost:3000/api/planeaciones/ia/contexto-problema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function installFetch(body: unknown) {
  (globalThis as { fetch: typeof fetch }).fetch = (async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
}

describe('POST /api/planeaciones/ia/contexto-problema (F0, AC-1..AC-11)', () => {
  beforeEach(() => {
    setSession({ docenteId: DOCENTE_ID });
    resetRateLimiter();
    __setRateLimitStoreForTests(null);
    auditInserts.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // AC-1: 200 con data y origen=ia
  it('AC-1: 200 con problema_estructurado/proposito/ajustes_razonables no vacíos y origen=ia', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: '¿Cómo ayudamos a los niños a compartir en el rincón?',
              proposito: 'Promover la convivencia y el respeto en el rincón de juego.',
              ajustes_razonables: 'Parejas rotativas, turnos con tarjetas visuales.',
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({
        modalidad: 'rincones',
        problema_contexto: 'a los niños les cuesta compartir',
        nivel: 'preescolar',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.origen).toBe('ia');
    expect(body.data.problema_estructurado.length).toBeGreaterThan(0);
    expect(body.data.proposito.length).toBeGreaterThan(0);
    expect(body.data.ajustes_razonables.length).toBeGreaterThan(0);
  });

  // AC-2: JSON inválido → 200 fallback_vacio
  it('AC-2: respuesta no JSON válido → 200 origen=fallback_vacio con tres campos ""', async () => {
    installFetch({
      choices: [{ message: { content: 'Esto no es JSON válido' } }],
    });
    const res = await POST(
      req({ modalidad: 'rincones', problema_contexto: 'problema válido' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.origen).toBe('fallback_vacio');
    expect(body.data.problema_estructurado).toBe('');
    expect(body.data.proposito).toBe('');
    expect(body.data.ajustes_razonables).toBe('');
  });

  // AC-3: JSON válido con problema_estructurado='' → fallback_vacio
  it('AC-3: problema_estructurado="" → 200 origen=fallback_vacio', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: '   ',
              proposito: 'algo',
              ajustes_razonables: 'algo',
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({ modalidad: 'abj', problema_contexto: 'problema' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.origen).toBe('fallback_vacio');
  });

  // AC-4: proposito/ajustes vacíos → 200 origen=ia, problema presente
  it('AC-4: proposito/ajustes_razonables vacíos → 200 origen=ia con problema no vacío', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: 'Pregunta detonadora clara.',
              proposito: '',
              ajustes_razonables: '',
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({ modalidad: 'taller_critico', problema_contexto: 'problema' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.origen).toBe('ia');
    expect(body.data.problema_estructurado).toBe('Pregunta detonadora clara.');
    expect(body.data.proposito).toBe('');
    expect(body.data.ajustes_razonables).toBe('');
  });

  // AC-5: AI_API_KEY vacía → 200 fallback_vacio
  it('AC-5: AI_API_KEY vacía → 200 origen=fallback_vacio (no 5xx)', async () => {
    const orig = process.env.AI_API_KEY;
    process.env.AI_API_KEY = '';
    try {
      // Sin mock de fetch: la cliente hace fallback directo por isIaConfigured.
      const res = await POST(
        req({ modalidad: 'rincones', problema_contexto: 'problema' }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.origen).toBe('fallback_vacio');
    } finally {
      process.env.AI_API_KEY = orig ?? 'test-ai-key';
    }
  });

  // AC-6: modalidad inválida → 422
  it('AC-6: modalidad no en enum → 422 NEM_PLANEACIONES_VALIDATION_ERROR', async () => {
    const res = await POST(
      req({ modalidad: 'no_existe', problema_contexto: 'problema' }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_PLANEACIONES_VALIDATION_ERROR');
  });

  // AC-7: problema_contexto vacío → 422
  it('AC-7: problema_contexto="" → 422 VALIDATION', async () => {
    const res = await POST(req({ modalidad: 'rincones', problema_contexto: '' }));
    expect(res.status).toBe(422);
  });

  // AC-8: 6ª llamada → 429
  it('AC-8: 6ª llamada en 60s → 429 NEM_RATE_LIMIT_EXCEEDED + Retry-After', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: 'P',
              proposito: '',
              ajustes_razonables: '',
            }),
          },
        },
      ],
    });
    for (let i = 0; i < 5; i += 1) {
      const r = await POST(req({ modalidad: 'rincones', problema_contexto: 'p' }));
      expect(r.status).toBe(200);
    }
    const sixth = await POST(req({ modalidad: 'rincones', problema_contexto: 'p' }));
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get('Retry-After')).toBeTruthy();
  });

  // AC-9: anonimización del user message
  it('AC-9: problema_contexto con nombre propio → user message al proveedor sin el nombre', async () => {
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
          choices: [
            {
              message: {
                content: JSON.stringify({
                  problema_estructurado: '¿Cómo ayudar al grupo?',
                  proposito: '',
                  ajustes_razonables: '',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const res = await POST(
        req({
          modalidad: 'rincones',
          problema_contexto: 'En el grupo de María López hay peleas',
          nivel: 'preescolar',
        }),
      );
      expect(res.status).toBe(200);
      expect(receivedUserContent).not.toContain('María López');
      expect(receivedUserContent).toContain('[NOMBRE]');
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = orig;
    }
  });

  // AC-10: audit_log POST — 1 fila por request que alcanza procesamiento
  it('AC-10: 200 éxito → exactamente 1 audit_log.insert con CCT, method=POST, endpoint y body_hash hex', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: 'P1',
              proposito: 'R1',
              ajustes_razonables: 'A1',
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({ modalidad: 'rincones', problema_contexto: 'problema' }),
    );
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(1);
    const p = auditInserts[0]!.payload;
    expect(p.cct).toBe(CCT);
    expect(p.cct).not.toBe(DOCENTE_ID);
    expect(p.method).toBe('POST');
    expect(p.endpoint).toBe('planeaciones_contexto_problema');
    expect(p.docente_id).toBe(DOCENTE_ID);
    expect(p.response_status).toBe(200);
    expect(typeof p.body_hash).toBe('string');
    expect((p.body_hash as string)).toMatch(/^[0-9a-f]{16}$/);
  });

  // AC-10: 401/429/422 VALIDATION/500 ANONYMIZER no insertan audit_log
  it('AC-10: 401/422-VALIDATION → 0 inserts audit_log', async () => {
    // 401
    setSession({ docenteId: null });
    let res = await POST(req({ modalidad: 'rincones', problema_contexto: 'p' }));
    expect(res.status).toBe(401);
    expect(auditInserts).toHaveLength(0);

    // 422 VALIDATION
    setSession({ docenteId: DOCENTE_ID });
    res = await POST(req({ modalidad: 'rincones', problema_contexto: '' }));
    expect(res.status).toBe(422);
    expect(auditInserts).toHaveLength(0);

    // 422 VALIDATION modalidad inválida
    res = await POST(req({ modalidad: 'no_existe', problema_contexto: 'p' }));
    expect(res.status).toBe(422);
    expect(auditInserts).toHaveLength(0);
  });

  // 401 sin sesión
  it('401 NEM_AUTH_UNAUTHORIZED sin sesión', async () => {
    setSession({ docenteId: null });
    const res = await POST(
      req({ modalidad: 'rincones', problema_contexto: 'problema' }),
    );
    expect(res.status).toBe(401);
  });

  // 500 anonymizer blocked con MAYÚSCULAS sostenidas
  it('500 NEM_IA_ANONYMIZER_BLOCKED cuando hay PII irredactable', async () => {
    const res = await POST(
      req({
        modalidad: 'rincones',
        problema_contexto: 'MARÍA LÓPEZ GARCÍA tiene conflictos',
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('NEM_IA_ANONYMIZER_BLOCKED');
    expect(auditInserts).toHaveLength(0);
  });

  // 500 anonymizer con MAYÚSCULAS pero token seguro (México, etc.) → 200 OK
  it('mayúsculas con tokens seguros → 200 (no es PII irredactable)', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: 'P',
              proposito: 'R',
              ajustes_razonables: 'A',
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({
        modalidad: 'rincones',
        problema_contexto: 'Trabajar en el contexto MÉXICO NEM',
      }),
    );
    expect(res.status).toBe(200);
  });

  // JSON envuelto en markdown ```json ... ```
  it('JSON envuelto en ```json ... ``` se parsea', async () => {
    installFetch({
      choices: [
        {
          message: {
            content:
              '```json\n{"problema_estructurado":"Pregunta","proposito":"R","ajustes_razonables":"A"}\n```',
          },
        },
      ],
    });
    const res = await POST(
      req({ modalidad: 'abj', problema_contexto: 'problema' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.problema_estructurado).toBe('Pregunta');
    expect(body.data.origen).toBe('ia');
  });

  // proposito/ajustes_razonables opcionales (omitidos) → 200
  it('proposito y ajustes_razonables opcionales omitidos → 200', async () => {
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: 'P',
              proposito: '',
              ajustes_razonables: '',
            }),
          },
        },
      ],
    });
    const res = await POST(req({ modalidad: 'abj', problema_contexto: 'problema' }));
    expect(res.status).toBe(200);
  });

  // F0 NO lee tablas de alumnos
  it('F0 no accede a tablas de alumno/evaluacion_alumno/bitacora/entrevista_inicial_alumno', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const filePath = path.resolve(
      process.cwd(),
      'app/api/planeaciones/ia/contexto-problema/route.ts',
    );
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).not.toMatch(/from\(['"]alumno['"]/);
    expect(content).not.toMatch(/from\(['"]evaluacion_alumno['"]/);
    expect(content).not.toMatch(/from\(['"]bitacora['"]/);
    expect(content).not.toMatch(/from\(['"]entrevista_inicial_alumno['"]/);
  });

  // 200 OK con session.cct null → audit no se inserta (guard defensivo)
  it('session.cct=null → 200 OK con audit_log no insertado (sin cct)', async () => {
    setSession({ docenteId: DOCENTE_ID, cct: null });
    installFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problema_estructurado: 'P',
              proposito: '',
              ajustes_razonables: '',
            }),
          },
        },
      ],
    });
    const res = await POST(
      req({ modalidad: 'abj', problema_contexto: 'problema' }),
    );
    expect(res.status).toBe(200);
    expect(auditInserts).toHaveLength(0);
  });
});
