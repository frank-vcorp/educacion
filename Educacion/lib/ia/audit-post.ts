/**
 * Helper compartido para la fila `audit_log` POST en los 3 routes IA
 * (F1/F2/F3). SPEC_TEC_07 §6.1.1 v1.1 + Decisión 9 ADR-02 + handoff
 * `SPEC-HANDOFF-20260819-SOFIA-P1-P2-FIXES.md` (P1-1).
 *
 * Características (contrato de columnas de SPEC §6.1.1):
 *  - `cct`: string formato `cct.clave` (NUNCA UUID). Origen: `bloque.cct`
 *    (F1) o `planeacion.cct` (F2/F3). Validado por el caller.
 *  - `docente_id`: UUID de la sesión.
 *  - `endpoint`: identificador estable del route.
 *  - `method`: 'POST' (admite también PATCH desde otros callers si se reusa).
 *  - `body_hash`: sha256 truncado 16 hex de una representación **anonimizada**
 *    del request — el mismo user message que se envió al proveedor. La entrada
 *    ya no contiene PII (ver §6.1.1).
 *  - `response_status`: 200 (éxito, cache, fallback_vacio) o 422
 *    (`NEM_IA_VARIANTE_VIOLA_ESTRUCTURA`).
 *  - `ip`, `user_agent`: opcionales (no se usan este turno).
 *
 * Comportamiento fail-loud (no silencioso, §6.1.1): el insert NO aborta la
 * respuesta 200/422 al cliente (la sugerencia ya se generó); si falla, se
 * loggea con `console.error` para observabilidad. Sin atomicidad route↔audit
 * (cierre total en migración `0020_ia_trazabilidad.sql`, fuera de L1).
 */
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditPostInput {
  cct: string | null | undefined;
  docenteId: string;
  endpoint: string;
  /** 'POST' para los 3 routes IA; 'PATCH' para callers que reusen. */
  method: 'POST' | 'PATCH';
  /** Material ya anonimizado (post-anonymizeRequest). NUNCA el prompt crudo. */
  bodyHashSource: string;
  /** 200 (éxito/cache/fallback) o 422 (violación estructura). */
  responseStatus: 200 | 422;
}

export type AuditPostClient = Pick<SupabaseClient, 'from'>;

/**
 * Inserta 1 fila `audit_log` con `body_hash` derivado de `bodyHashSource`.
 * Inspecciona `{ error }` y, si falla, hace `console.error` con contexto
 * (no aborta el flujo de la docente).
 *
 * Defensa ante `cct` ausente (`null`/`undefined`/`''`): omite el insert y
 * loguea `console.error` con contexto (fail-loud). Esto cubre dos casos:
 *  (a) tests que mockean `bloque.cct`/`planeacion.cct` como `null` para
 *      verificar el guard defensivo;
 *  (b) dato corrupto en runtime (el schema declara `not null`, pero si el
 *      join falla y devuelve `null`, no abortamos el flujo de la docente).
 *
 * Devuelve `{ ok: true }` cuando el insert tuvo éxito, `{ ok: false, error }`
 * cuando el insert falló (para que callers que quieran exponerlo, como
 * `updateBloque`, puedan propagar `auditError`), o `{ ok: false, skipped: true }`
 * cuando se omitió el insert por `cct` ausente.
 */
export async function auditPostIA(
  supabase: AuditPostClient,
  input: AuditPostInput,
): Promise<
  | { ok: true; skipped: false }
  | { ok: false; skipped: boolean; error: { code?: string; message: string } }
> {
  if (!input.cct) {
    // Fail-loud: omitir el insert (FK `audit_log.cct → cct(clave)` lo
    // rechazaría de todos modos), pero registrar para observabilidad.
    // eslint-disable-next-line no-console
    console.error('[audit_log] skipped: missing cct', {
      endpoint: input.endpoint,
      docenteId: input.docenteId,
    });
    return {
      ok: false,
      skipped: true,
      error: { message: 'cct missing' },
    };
  }
  const body_hash = hashShort(input.bodyHashSource);
  const { error } = await supabase.from('audit_log').insert({
    cct: input.cct,
    docente_id: input.docenteId,
    endpoint: input.endpoint,
    method: input.method,
    body_hash,
    response_status: input.responseStatus,
  });
  if (error) {
    // Fail-loud: nunca se silencia (P1-1 §6.1.1). Log explícito con contexto
    // operacional (nunca prompt crudo ni PII; sólo ids y código).
    // eslint-disable-next-line no-console
    console.error('[audit_log] insert failed', {
      endpoint: input.endpoint,
      docenteId: input.docenteId,
      errorCode: error.code,
      message: error.message,
    });
    return {
      ok: false,
      skipped: false,
      error: { code: error.code, message: error.message },
    };
  }
  return { ok: true, skipped: false };
}

/**
 * Hash corto determinista (16 hex) sobre una cadena ya anonimizada.
 * Replica el patrón de `services/planeaciones/update-actions.ts:hashShort`
 * para mantener consistencia entre callers.
 */
export function hashShort(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}
