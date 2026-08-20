import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  rateLimitHeaders,
  resetRateLimiter,
  __setRateLimitStoreForTests,
} from '@/services/ia/rate-limiter';

describe('services/ia/rate-limiter — in-memory 5 req/min', () => {
  beforeEach(() => {
    resetRateLimiter();
    __setRateLimitStoreForTests(null);
    process.env.AI_RATE_LIMIT_BACKEND = 'memory';
    process.env.AI_RATE_LIMIT = '5';
  });

  it('primer hit: allowed=true, remaining=4', () => {
    const r = checkRateLimit('doc1', 'ep1');
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
    expect(r.limit).toBe(5);
    expect(r.retryAfterSec).toBe(0);
  });

  it('5 hits en ventana: el 6º rejected + retryAfter', () => {
    for (let i = 0; i < 5; i += 1) {
      const r = checkRateLimit('doc1', 'ep1');
      expect(r.allowed).toBe(true);
    }
    const sixth = checkRateLimit('doc1', 'ep1');
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
    expect(sixth.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(sixth.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('distintos docentes NO comparten bucket', () => {
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit('doc1', 'ep1');
    }
    const doc2 = checkRateLimit('doc2', 'ep1');
    expect(doc2.allowed).toBe(true);
  });

  it('distintos endpoints NO comparten bucket', () => {
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit('doc1', 'ep1');
    }
    const other = checkRateLimit('doc1', 'ep2');
    expect(other.allowed).toBe(true);
  });

  it('rateLimitHeaders incluye Retry-After sólo si rejected', () => {
    const allowed = checkRateLimit('d', 'e');
    const hOk = rateLimitHeaders(allowed);
    expect(hOk['X-RateLimit-Limit']).toBe('5');
    expect(hOk['X-RateLimit-Remaining']).toBe('4');
    expect(hOk.RetryAfter).toBeUndefined();

    for (let i = 1; i < 5; i += 1) checkRateLimit('d', 'e');
    const blocked = checkRateLimit('d', 'e');
    const hBlock = rateLimitHeaders(blocked);
    expect(hBlock['Retry-After']).toBeDefined();
    expect(Number(hBlock['Retry-After'])).toBeGreaterThanOrEqual(1);
  });

  it('upstash backend lanza error (no implementado este turno)', () => {
    process.env.AI_RATE_LIMIT_BACKEND = 'upstash';
    expect(() => checkRateLimit('d', 'e')).toThrow(/upstash/i);
  });

  it('AI_RATE_LIMIT custom → aplica el límite custom', () => {
    process.env.AI_RATE_LIMIT = '2';
    expect(checkRateLimit('d', 'e').allowed).toBe(true);
    expect(checkRateLimit('d', 'e').allowed).toBe(true);
    expect(checkRateLimit('d', 'e').allowed).toBe(false);
  });
});