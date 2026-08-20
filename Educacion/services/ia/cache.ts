/**
 * Cache in-memory para F1 (SPEC_TEC_07 §4.2 + Decisión 7 ADR-20260819-02).
 *
 * - Clave: `requestHash(parts)` = sha256(parts.join('|')).
 * - TTL por defecto: 30 días (2_592_000_000 ms).
 * - Store in-memory sustituible en tests (`__setCacheStoreForTests`).
 * - Cierre total: tabla `ia_sugerencia(request_hash, expires_at)` en migración
 *   0020 (no aplicada este turno).
 */
import { createHash } from 'node:crypto';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

type Store = Map<string, CacheEntry<unknown>>;

let globalStore: Store = new Map();

/** Tests: sustituye el store (aislamiento entre tests). */
export function __setCacheStoreForTests(store: Store | null): void {
  globalStore = store ?? new Map();
}

/** Reset completo del cache. */
export function resetIaCache(): void {
  globalStore = new Map();
}

/**
 * Hash canónico de una solicitud. Determinista: mismas parts → mismo hash.
 */
export function requestHash(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Lee del cache. Devuelve `null` si la entrada no existe o está expirada.
 */
export function cacheGet<T>(hash: string): T | null {
  const entry = globalStore.get(hash);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    globalStore.delete(hash);
    return null;
  }
  return entry.value as T;
}

/**
 * Escribe en cache. `ttlMs` por defecto 30 días.
 */
export function cacheSet<T>(hash: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  globalStore.set(hash, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalida una entrada específica (para `forzar_refresh`).
 */
export function cacheInvalidate(hash: string): void {
  globalStore.delete(hash);
}