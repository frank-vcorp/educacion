/**
 * Rate-limiter in-memory por docente + endpoint (SPEC_TEC_07 §4.2 + §7).
 *
 * Decisión 6 ADR-20260819-02: in-memory por instancia para MVP / Tía Lola.
 * Ventana deslizante simple: 60s, límite 5, burst 1.
 *
 * Si `AI_RATE_LIMIT_BACKEND=upstash` → no implementado este turno; lanza
 * error tipado para que el caller sepa que requiere Upstash (Decisión 6).
 *
 * Headers `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset`
 * se emiten en cada respuesta IA. Esta función devuelve los números
 * exactos para que el route handler los ponga en `Headers`.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix epoch ms del próximo reset de la ventana. */
  resetAt: number;
  limit: number;
  /** Segundos hasta el reset (para `Retry-After`). */
  retryAfterSec: number;
}

const DEFAULT_LIMIT = 5;
const WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Store in-memory por (docenteId + endpoint). Sustituible en tests.
 */
type Store = Map<string, Bucket>;

let globalStore: Store = new Map();

/** Tests: sustituye el store (aislamiento entre tests). */
export function __setRateLimitStoreForTests(store: Store | null): void {
  globalStore = store ?? new Map();
}

/** Reset completo del store (uso en tests y entre invocaciones). */
export function resetRateLimiter(): void {
  globalStore = new Map();
}

function keyFor(docenteId: string, endpoint: string): string {
  return `${docenteId}::${endpoint}`;
}

function readLimit(): number {
  const raw = process.env.AI_RATE_LIMIT;
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
}

function readBackend(): 'memory' | 'upstash' {
  return process.env.AI_RATE_LIMIT_BACKEND === 'upstash' ? 'upstash' : 'memory';
}

/**
 * Registra un hit del docente en el endpoint y devuelve el estado resultante.
 * - `allowed=true` → consume 1 crédito.
 * - `allowed=false` → no consume crédito adicional (la maestra ya gastó 5).
 */
export function checkRateLimit(
  docenteId: string,
  endpoint: string,
): RateLimitResult {
  const backend = readBackend();
  if (backend === 'upstash') {
    throw new Error(
      'AI_RATE_LIMIT_BACKEND=upstash no implementado en este turno (Decisión 6 ADR-20260819-02)',
    );
  }

  const limit = readLimit();
  const now = Date.now();
  const key = keyFor(docenteId, endpoint);
  const existing = globalStore.get(key);

  // Sin bucket o ventana expirada → ventana nueva.
  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    const windowStart = now;
    globalStore.set(key, { count: 1, windowStart });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: windowStart + WINDOW_MS,
      limit,
      retryAfterSec: 0,
    };
  }

  if (existing.count < limit) {
    existing.count += 1;
    return {
      allowed: true,
      remaining: limit - existing.count,
      resetAt: existing.windowStart + WINDOW_MS,
      limit,
      retryAfterSec: 0,
    };
  }

  // Bloqueado. Reset al final de la ventana actual.
  const resetAt = existing.windowStart + WINDOW_MS;
  const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));
  return {
    allowed: false,
    remaining: 0,
    resetAt,
    limit,
    retryAfterSec,
  };
}

/**
 * Helper para construir los headers HTTP canónicos a partir del resultado.
 */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.floor(r.resetAt / 1000)),
    ...(r.allowed ? {} : { 'Retry-After': String(r.retryAfterSec) }),
  };
}