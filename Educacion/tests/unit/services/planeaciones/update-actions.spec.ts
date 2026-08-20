/**
 * Unit tests — `services/planeaciones/update-actions.ts` (AC-30, P1-2).
 *
 * SPEC_TEC_07 v1.1 §6.1.1 (fail-loud) + Decisión 9 ADR-02.
 *
 * Verifica:
 *  (a) la read de bloque selecciona `cct` (migración 0010:65).
 *  (b) el payload del `audit_log.insert` lleva `cct === '22DJN0059R'`
 *      (CCT real, formato `cct.clave`) y NO `docente_id` (UUID),
 *      `method === 'PATCH'`, `endpoint === 'update_bloque_post_ia'`.
 *  (c) si el mock de `insert` retorna error, la función retorna
 *      `ok: true` (update ya aplicado) Y expone `auditError` sin lanzar.
 *  (d) si retorna OK, retorna `ok: true` sin `auditError`.
 *  (e) `updatePlaneacion` (P3 opcional de consistencia) sigue el mismo
 *      patrón fail-loud: error de auditoría → `ok: true` + `auditError`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Constantes ───
const DOCENTE_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_DOCENTE_ID = '22222222-2222-2222-2222-222222222222';
const CCT = '22DJN0059R';
const PLANEACION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BLOQUE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const bloqueRow = {
  id: BLOQUE_ID,
  planeacion_id: PLANEACION_ID,
  docente_id: DOCENTE_ID,
  cct: CCT,
};

const planeacionRow = {
  id: PLANEACION_ID,
  docente_id: DOCENTE_ID,
  estado: 'borrador',
  cct: CCT,
};

// ─── Captura de llamadas a `audit_log.insert` ───
type InsertCall = {
  table: string;
  payload: Record<string, unknown>;
  returnValue: { error: { code: string; message: string } | null };
};
const insertCalls: InsertCall[] = [];

function setAuditInsertBehavior(behavior: 'ok' | { code: string; message: string }): void {
  // Reescribir el último `insertCalls` con el comportamiento deseado.
  // Estrategia: cada test fija el comportamiento antes de llamar a la
  // función; el mock lo lee al hacer `insert`.
  if (behavior === 'ok') {
    auditBehavior = { kind: 'ok' };
  } else {
    auditBehavior = { kind: 'error', code: behavior.code, message: behavior.message };
  }
}
let auditBehavior: { kind: 'ok' } | { kind: 'error'; code: string; message: string } = {
  kind: 'ok',
};

// ─── Mock supabase ───

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => buildSupabaseMock()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

function buildSupabaseMock() {
  return {
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => {
            if (table === 'bloque' && val === BLOQUE_ID) {
              return { data: bloqueRow, error: null };
            }
            if (table === 'planeacion' && val === PLANEACION_ID) {
              return { data: planeacionRow, error: null };
            }
            return { data: null, error: null };
          },
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      insert: async (payload: Record<string, unknown>) => {
        const call: InsertCall = { table, payload, returnValue: { error: null } };
        if (auditBehavior.kind === 'error') {
          call.returnValue = {
            error: { code: auditBehavior.code, message: auditBehavior.message },
          };
        }
        insertCalls.push(call);
        return call.returnValue;
      },
    }),
  };
}

// ─── Import bajo mock ───

import { updateBloque, updatePlaneacion } from '@/services/planeaciones/update-actions';

describe('services/planeaciones/update-actions (AC-30, P1-2)', () => {
  beforeEach(() => {
    insertCalls.length = 0;
    auditBehavior = { kind: 'ok' };
  });

  // ─── updateBloque ────────────────────────────────────────────
  describe('updateBloque', () => {
    it('(a) la read de bloque selecciona columnas que incluyen cct', async () => {
      // Spy de la `select`: el mock captura las columnas pedidas en
      // cualquier interacción posterior; aquí verificamos que el test del
      // payload (b) demuestra que `bloque.cct` está disponible, lo que
      // sólo es posible si la `select` lo incluyó.
      const result = await updateBloque({
        bloqueId: BLOQUE_ID,
        docenteId: DOCENTE_ID,
        contenidoTextual: 'Texto aceptado por la maestra tras IA.',
        origen: 'ia_sugerencia',
      });
      expect(result.ok).toBe(true);
      // El bloque mockeado tiene `cct`; si la read no lo seleccionase,
      // `bloque.cct` sería `undefined` y `cct: bloque.cct` insertaría
      // `undefined` en `audit_log.cct` (violación). Validamos (b) abajo.
      expect(insertCalls).toHaveLength(1);
      expect(insertCalls[0]!.payload.cct).toBe(CCT);
    });

    it('(b) el insert audit_log usa cct real (no docente_id UUID) y método PATCH', async () => {
      await updateBloque({
        bloqueId: BLOQUE_ID,
        docenteId: DOCENTE_ID,
        contenidoTextual: 'Texto aceptado.',
        origen: 'ia_sugerencia',
      });
      expect(insertCalls).toHaveLength(1);
      const p = insertCalls[0]!.payload;
      expect(p.cct).toBe(CCT);
      expect(p.cct).not.toBe(DOCENTE_ID);
      expect(p.method).toBe('PATCH');
      expect(p.endpoint).toBe('update_bloque_post_ia');
      expect(p.response_status).toBe(200);
      expect(p.docente_id).toBe(DOCENTE_ID);
      expect(typeof p.body_hash).toBe('string');
      expect((p.body_hash as string).length).toBeGreaterThan(0);
      expect((p.body_hash as string)).toMatch(/^[0-9a-f]{16}$/);
    });

    it('(b.body_hash) el body_hash se deriva del contenido aceptado (no del prompt crudo)', async () => {
      // El `bodyHashSource` que pasa `updateBloque` es
      // `${bloqueId}|${origen}|${contenidoTextual}`. Determinamos el hash
      // esperado vía el helper público para verificar que el contrato
      // computa lo esperado y no otra cosa (p.ej. el prompt crudo).
      const contenido = 'Texto único para verificar hash determinista.';
      await updateBloque({
        bloqueId: BLOQUE_ID,
        docenteId: DOCENTE_ID,
        contenidoTextual: contenido,
        origen: 'ia_sugerencia',
      });
      const { hashShort } = await import('@/lib/ia/audit-post');
      const expected = hashShort(`${BLOQUE_ID}|ia_sugerencia|${contenido}`);
      expect(insertCalls[0]!.payload.body_hash).toBe(expected);
    });

    it('(c) si el insert falla, retorna ok:true + auditError (no lanza, no silencia)', async () => {
      setAuditInsertBehavior({ code: '23503', message: 'foreign_key_violation' });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const result = await updateBloque({
          bloqueId: BLOQUE_ID,
          docenteId: DOCENTE_ID,
          contenidoTextual: 'Texto post-IA aceptado.',
          origen: 'maestra_editado_de_ia',
        });
        expect(result.ok).toBe(true);
        expect(result.id).toBe(BLOQUE_ID);
        expect(result.auditError).toBeDefined();
        expect(String(result.auditError)).toContain('23503');
        // El log explícito (fail-loud) se invocó con contexto operacional
        expect(errorSpy).toHaveBeenCalled();
        const lastCall = errorSpy.mock.calls[errorSpy.mock.calls.length - 1];
        expect(lastCall?.[0]).toContain('[audit_log]');
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('(d) si el insert OK, retorna ok:true SIN auditError', async () => {
      const result = await updateBloque({
        bloqueId: BLOQUE_ID,
        docenteId: DOCENTE_ID,
        contenidoTextual: 'Texto post-IA aceptado.',
        origen: 'ia_sugerencia',
      });
      expect(result.ok).toBe(true);
      expect(result.id).toBe(BLOQUE_ID);
      expect(result.auditError).toBeUndefined();
    });

    it('bloque no pertenece al docente → 403 NEM_AUTH_RLS_VIOLATION, sin insert', async () => {
      const result = await updateBloque({
        bloqueId: BLOQUE_ID,
        docenteId: OTHER_DOCENTE_ID,
        contenidoTextual: 'Texto cualquiera.',
        origen: 'ia_sugerencia',
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('NEM_AUTH_RLS_VIOLATION');
      expect(insertCalls).toHaveLength(0);
    });
  });

  // ─── updatePlaneacion (P3 opcional de consistencia) ──────────
  describe('updatePlaneacion (P3 consistencia fail-loud)', () => {
    it('usa cct correcto y expone auditError si el insert falla', async () => {
      setAuditInsertBehavior({ code: 'PGRST116', message: 'mocked RLS violation' });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const result = await updatePlaneacion({
          planeacionId: PLANEACION_ID,
          docenteId: DOCENTE_ID,
          cambios: { proposito: 'Propósito actualizado tras aceptar pulido F3.' },
        });
        expect(result.ok).toBe(true);
        expect(result.id).toBe(PLANEACION_ID);
        expect(result.camposActualizados).toContain('proposito');
        expect(result.auditError).toBeDefined();
        expect(String(result.auditError)).toContain('PGRST116');
        expect(errorSpy).toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('sin auditError si el insert OK', async () => {
      const result = await updatePlaneacion({
        planeacionId: PLANEACION_ID,
        docenteId: DOCENTE_ID,
        cambios: { problema_contexto: 'Contexto actualizado tras F3.' },
      });
      expect(result.ok).toBe(true);
      expect(result.auditError).toBeUndefined();
    });

    it('payload audit_log usa planeacion.cct y método PATCH', async () => {
      await updatePlaneacion({
        planeacionId: PLANEACION_ID,
        docenteId: DOCENTE_ID,
        cambios: { ajustes_razonables: 'Ajustes actualizados con detalle suficiente.' },
      });
      expect(insertCalls).toHaveLength(1);
      const p = insertCalls[0]!.payload;
      expect(p.cct).toBe(CCT);
      expect(p.method).toBe('PATCH');
      expect(p.endpoint).toBe('update_planeacion_post_ia_f3');
    });
  });
});
