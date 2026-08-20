/**
 * Unit: lib/ia/audit-post (P3-N1, QA-20260819-05 §D).
 *
 * Cubre la rama defensiva del guard `cct` ausente (`null`/`undefined`/`''`)
 * de `auditPostIA`. Previamente descubierta (77.27% líneas, 80% branch).
 * Contrato verificado:
 *   - Devuelve `{ ok: false, skipped: true, error: { message: 'cct missing' } }`
 *   - Llama `console.error('[audit_log] skipped: missing cct', { endpoint, docenteId })`
 *   - NO llama `supabase.from('audit_log').insert(...)`
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditPostIA } from '@/lib/ia/audit-post';

const ENDPOINT = 'planeaciones_variantes_bloque';
const DOCENTE_ID = '11111111-1111-1111-1111-111111111111';

type InsertCall = Record<string, unknown>;
const insertCalls: InsertCall[] = [];

function buildSupabaseMock() {
  return {
    from: (table: string) => {
      if (table === 'audit_log') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            insertCalls.push(payload);
            return { data: null, error: null };
          },
        };
      }
      return {
        insert: async () => {
          throw new Error(`unexpected table ${table}`);
        },
      };
    },
  };
}

describe('lib/ia/audit-post — guard defensivo cct ausente (P3-N1, QA-05 §D)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    insertCalls.length = 0;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('cct=null → skip + console.error + 0 inserts (contract skipped:true, error.message="cct missing")', async () => {
    const supa = buildSupabaseMock();
    const res = await auditPostIA(supa as never, {
      cct: null,
      docenteId: DOCENTE_ID,
      endpoint: ENDPOINT,
      method: 'POST',
      bodyHashSource: 'cualquiera',
      responseStatus: 200,
    });
    expect(res.ok).toBe(false);
    expect(res.skipped).toBe(true);
    if (!res.ok) {
      expect(res.error.message).toBe('cct missing');
    }
    expect(insertCalls).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[audit_log] skipped: missing cct',
      expect.objectContaining({
        endpoint: ENDPOINT,
        docenteId: DOCENTE_ID,
      }),
    );
  });

  it('cct=undefined → mismo contrato (skip + console.error + 0 inserts)', async () => {
    const supa = buildSupabaseMock();
    const res = await auditPostIA(supa as never, {
      // cct omitido explícitamente: undefined por inferencia TS.
      cct: undefined as unknown as string,
      docenteId: DOCENTE_ID,
      endpoint: ENDPOINT,
      method: 'PATCH',
      bodyHashSource: 'update_bloque',
      responseStatus: 200,
    });
    expect(res.ok).toBe(false);
    expect(res.skipped).toBe(true);
    expect(insertCalls).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('cct="" (string vacío) → mismo contrato (skip + console.error + 0 inserts)', async () => {
    const supa = buildSupabaseMock();
    const res = await auditPostIA(supa as never, {
      cct: '',
      docenteId: DOCENTE_ID,
      endpoint: ENDPOINT,
      method: 'POST',
      bodyHashSource: 'vacio',
      responseStatus: 200,
    });
    expect(res.ok).toBe(false);
    expect(res.skipped).toBe(true);
    expect(insertCalls).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});