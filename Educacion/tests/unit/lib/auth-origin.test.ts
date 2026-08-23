/**
 * Unit tests — `lib/auth/origin.ts` (FIX-20260822-01).
 *
 * Verifica la precedencia production-safe del origin para los
 * `emailRedirectTo` de Supabase Auth:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` gana cuando está definido y parsea como URL.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` se usa con `https://` forzado.
 *  3. Cabeceras de la request sólo se consultan fuera de producción.
 *  4. Producción sin env vars falla con error explícito (NUNCA localhost).
 *  5. En dev/local cae a las cabeceras `host`/`x-forwarded-*`.
 *
 * El helper es puro (sin `next/headers`) para poder ejercer todas las
 * ramas desde tests sin necesidad de un servidor Next en marcha.
 */
import { describe, it, expect } from 'vitest';
import { resolveOrigin } from '@/lib/auth/origin';

describe('lib/auth/origin resolveOrigin (FIX-20260822-01)', () => {
  describe('precedencia en producción', () => {
    it('(P1) NEXT_PUBLIC_SITE_URL gana sobre VERCEL_PROJECT_PRODUCTION_URL', () => {
      const result = resolveOrigin({
        siteUrl: 'https://plataforma.mnem.edu.mx',
        vercelProd: 'plataforma.vercel.app',
        isProd: true,
      });
      expect(result).toBe('https://plataforma.mnem.edu.mx');
    });

    it('(P2) VERCEL_PROJECT_PRODUCTION_URL se usa con https:// forzado', () => {
      const result = resolveOrigin({
        vercelProd: 'plataforma.vercel.app',
        isProd: true,
      });
      expect(result).toBe('https://plataforma.vercel.app');
    });

    it('(P2.b) VERCEL_PROJECT_PRODUCTION_URL con slash final se normaliza', () => {
      const result = resolveOrigin({
        vercelProd: 'plataforma.vercel.app/',
        isProd: true,
      });
      expect(result).toBe('https://plataforma.vercel.app');
    });

    it('(P3) producción NUNCA devuelve localhost aunque el request traiga host arbitrario', () => {
      expect(() =>
        resolveOrigin({
          isProd: true,
          forwardedHost: 'attacker.example.com',
          forwardedProto: 'https',
          host: 'attacker.example.com',
        }),
      ).toThrow(/No production origin configured/);
    });

    it('(P3.b) producción sin env vars falla con error explícito', () => {
      expect(() => resolveOrigin({ isProd: true })).toThrow(
        /NEXT_PUBLIC_SITE_URL|VERCEL_PROJECT_PRODUCTION_URL/,
      );
    });

    it('(P4) NEXT_PUBLIC_SITE_URL malformado cae a VERCEL_PROJECT_PRODUCTION_URL', () => {
      const result = resolveOrigin({
        siteUrl: 'not-a-url',
        vercelProd: 'plataforma.vercel.app',
        isProd: true,
      });
      expect(result).toBe('https://plataforma.vercel.app');
    });

    it('(P4.b) NEXT_PUBLIC_SITE_URL con scheme no http/https es rechazado', () => {
      const result = resolveOrigin({
        siteUrl: 'file:///etc/passwd',
        vercelProd: 'plataforma.vercel.app',
        isProd: true,
      });
      expect(result).toBe('https://plataforma.vercel.app');
    });

    it('(P5) NEXT_PUBLIC_SITE_URL acepta http explícito (staging local)', () => {
      const result = resolveOrigin({
        siteUrl: 'http://staging.mnem.local:3000',
        isProd: true,
      });
      expect(result).toBe('http://staging.mnem.local:3000');
    });

    it('(P5.b) URL con path se reduce a su origin', () => {
      const result = resolveOrigin({
        siteUrl: 'https://plataforma.mnem.edu.mx/auth/callback',
        isProd: true,
      });
      expect(result).toBe('https://plataforma.mnem.edu.mx');
    });
  });

  describe('precedencia en desarrollo / local', () => {
    it('(D1) usa x-forwarded-host y x-forwarded-proto cuando están presentes', () => {
      const result = resolveOrigin({
        isProd: false,
        forwardedHost: 'dev.localtest.me',
        forwardedProto: 'https',
        host: 'localhost:3000',
      });
      expect(result).toBe('https://dev.localtest.me');
    });

    it('(D2) cae a `host` cuando no hay x-forwarded-host', () => {
      const result = resolveOrigin({
        isProd: false,
        host: 'localhost:3000',
        forwardedProto: 'http',
      });
      expect(result).toBe('http://localhost:3000');
    });

    it('(D3) sin headers cae al fallback localhost:3000 / http', () => {
      const result = resolveOrigin({ isProd: false });
      expect(result).toBe('http://localhost:3000');
    });

    it('(D4) NEXT_PUBLIC_SITE_URL gana incluso en dev (override explícito)', () => {
      const result = resolveOrigin({
        siteUrl: 'http://127.0.0.1:4000',
        isProd: false,
        forwardedHost: 'should-not-be-used',
        forwardedProto: 'https',
      });
      expect(result).toBe('http://127.0.0.1:4000');
    });
  });

  describe('inputs undefined / vacíos', () => {
    it('strings vacíos se tratan como no definidos', () => {
      const result = resolveOrigin({
        siteUrl: '   ',
        isProd: true,
        vercelProd: 'plataforma.vercel.app',
      });
      expect(result).toBe('https://plataforma.vercel.app');
    });

    it('sin ningún input y no-prod: cae a localhost', () => {
      const result = resolveOrigin({ isProd: false });
      expect(result).toBe('http://localhost:3000');
    });
  });
});
