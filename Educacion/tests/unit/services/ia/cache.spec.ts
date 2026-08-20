import { describe, it, expect, beforeEach } from 'vitest';
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  requestHash,
  resetIaCache,
  __setCacheStoreForTests,
} from '@/services/ia/cache';

describe('services/ia/cache — in-memory 30 días (F1)', () => {
  beforeEach(() => {
    resetIaCache();
    __setCacheStoreForTests(null);
  });

  it('requestHash es determinista (mismas parts → mismo hash)', () => {
    const a = requestHash(['d1', 'b1', 'rural']);
    const b = requestHash(['d1', 'b1', 'rural']);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('requestHash: distintas parts → distinto hash', () => {
    expect(requestHash(['a'])).not.toBe(requestHash(['b']));
  });

  it('cacheGet/set: set luego get devuelve valor', () => {
    cacheSet('h1', 'variante rural');
    expect(cacheGet('h1')).toBe('variante rural');
  });

  it('cacheGet: entrada inexistente → null', () => {
    expect(cacheGet('nope')).toBeNull();
  });

  it('cacheInvalidate borra entrada', () => {
    cacheSet('h1', 'x');
    cacheInvalidate('h1');
    expect(cacheGet('h1')).toBeNull();
  });

  it('TTL expirado → cacheGet devuelve null', () => {
    cacheSet('h1', 'x', -1);
    expect(cacheGet('h1')).toBeNull();
  });

  it('TTL custom funciona', () => {
    cacheSet('h1', 'x', 60_000);
    expect(cacheGet('h1')).toBe('x');
  });

  it('resetIaCache borra todo el store', () => {
    cacheSet('a', '1');
    cacheSet('b', '2');
    resetIaCache();
    expect(cacheGet('a')).toBeNull();
    expect(cacheGet('b')).toBeNull();
  });
});