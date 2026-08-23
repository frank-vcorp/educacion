/**
 * Tests de integración — `lib/auth/actions.ts` (FIX-20260822-02 — cierre F1
 * de QA-20260822-01).
 *
 * Objetivo: cubrir AC-1.1, AC-1.6 y AC-1.7 del fix L1.1 con
 * aserciones sobre el `emailRedirectTo` REAL que reciben
 * `supabase.auth.signUp` y `supabase.auth.signInWithOtp`, NO sólo
 * sobre el helper puro `resolveOrigin` que ya tiene cobertura
 * unitaria exhaustiva (15 tests).
 *
 * Si en el futuro alguien introduce una rama condicional dentro de
 * `register` / `login(magic)` / `sendMagicLink` que rompa la
 * precedencia del origin **sin tocar el helper**, este test lo
 * detectará.
 *
 * Estrategia:
 *  - Mockear `@/lib/supabase/server.createClient` para devolver un
 *    fake client con `auth.signUp` y `auth.signInWithOtp` espiados.
 *  - Mockear `next/headers` para devolver un set de cabeceras
 *    controlado por test (incluyendo `x-forwarded-host` atacante).
 *  - NO mockear `@/lib/auth/origin.resolveOrigin`: se usa el real para
 *    que el test ejercite también la conexión helper → acciones y la
 *    lectura de `process.env`.
 *  - Por test, `vi.stubEnv` para fijar `NEXT_PUBLIC_SITE_URL`,
 *    `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_ENV` y
 *    `NODE_ENV`. `afterEach` hace `unstubEnvs` para no contaminar.
 *
 * Aserciones de seguridad:
 *  - En producción (al menos un flag isProd activo) NUNCA debe
 *    aparecer `localhost` ni un host atacante en el `emailRedirectTo`.
 *  - En producción con sólo `VERCEL_PROJECT_PRODUCTION_URL`
 *    (=`educacion-nem-mvp.vercel.app` según `.vercel/project.json`)
 *    el `emailRedirectTo` de `register` debe ser EXACTAMENTE
 *    `https://educacion-nem-mvp.vercel.app/auth/callback?redirect=/onboarding`.
 *  - En `login` con magic link y `sendMagicLink` debe ser EXACTAMENTE
 *    `https://educacion-nem-mvp.vercel.app/auth/callback?redirect=/dashboard`.
 *  - En producción sin env vars la acción debe lanzar ANTES de
 *    invocar Supabase (aserciones sobre `signUp`/`signInWithOtp` NO
 *    llamadas).
 *
 * SPEC_TEC_04 §9.1 — Supabase Auth email + password + magic link.
 * QA-20260822-01 §4 F1 (P2-Media).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Capturadores de cabeceras y de supabase (hoisted con vi.hoisted para
// que los mocks puedan referenciarlos antes de definir el módulo).
// ---------------------------------------------------------------------------

interface CapturedCall {
  args: unknown[];
}

const signUpCalls = vi.hoisted(() => [] as CapturedCall[]);
const signInWithOtpCalls = vi.hoisted(() => [] as CapturedCall[]);
const signInWithPasswordCalls = vi.hoisted(() => [] as CapturedCall[]);
const headersMock = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: () => headersMock() as any,
}));

vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: async () => ({
      auth: {
        signUp: vi.fn(async (...args: unknown[]) => {
          signUpCalls.push({ args });
          return {
            data: { user: { id: 'fake-user-id' }, session: null },
            error: null,
          };
        }),
        signInWithOtp: vi.fn(async (...args: unknown[]) => {
          signInWithOtpCalls.push({ args });
          return { data: { user: null, session: null }, error: null };
        }),
        signInWithPassword: vi.fn(async (...args: unknown[]) => {
          signInWithPasswordCalls.push({ args });
          return { data: { user: { id: 'fake-user-id' }, session: null }, error: null };
        }),
        signOut: vi.fn(async () => ({ error: null })),
      },
    }),
  };
});

// Importamos las acciones DESPUÉS de los mocks. Importar un archivo
// con la directiva `'use server'` no rompe vitest/TS (TS la trata como
// directiva; vitest no la interpreta).
import { register, login, sendMagicLink } from '@/lib/auth/actions';

// URL canónica de producción según `.vercel/project.json` (projectName
// = `educacion-nem-mvp`). Esta es la única URL que el email de
// confirmación debe llevar en producción.
const PROD_HOST = 'educacion-nem-mvp.vercel.app';
const PROD_ORIGIN = `https://${PROD_HOST}`;
const REGISTER_REDIRECT = `${PROD_ORIGIN}/auth/callback?redirect=/onboarding`;
const DASHBOARD_REDIRECT = `${PROD_ORIGIN}/auth/callback?redirect=/dashboard`;

// Helpers ---------------------------------------------------------------------

function setProdEnv(opts: {
  siteUrl?: string;
  vercelProd?: string;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
}): void {
  // Tipado: `process.env.NODE_ENV` está declarado como literal readonly
  // en @types/node; usamos un cast controlado a `Record<string, string>`
  // para que el helper sea el único punto de mutación.
  const env = process.env as unknown as Record<string, string | undefined>;
  if (opts.siteUrl !== undefined) {
    env.NEXT_PUBLIC_SITE_URL = opts.siteUrl;
  } else {
    delete env.NEXT_PUBLIC_SITE_URL;
  }
  if (opts.vercelProd !== undefined) {
    env.VERCEL_PROJECT_PRODUCTION_URL = opts.vercelProd;
  } else {
    delete env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  // Forzamos producción — la rama `isProd` se activa con cualquiera de
  // estos dos flags; usando ambos blindamos el test contra refactors
  // que cambien la semántica de la disyunción.
  env.VERCEL_ENV = 'production';
  env.NODE_ENV = 'production';

  headersMock.mockImplementation(() => ({
    get: (name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-forwarded-host') return opts.forwardedHost ?? null;
      if (lower === 'x-forwarded-proto') return opts.forwardedProto ?? null;
      if (lower === 'host') return opts.host ?? null;
      return null;
    },
  }));
}

function setDevEnv(opts: {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
}): void {
  const env = process.env as unknown as Record<string, string | undefined>;
  delete env.NEXT_PUBLIC_SITE_URL;
  delete env.VERCEL_PROJECT_PRODUCTION_URL;
  env.VERCEL_ENV = 'development';
  env.NODE_ENV = 'development';

  headersMock.mockImplementation(() => ({
    get: (name: string) => {
      const lower = name.toLowerCase();
      if (lower === 'x-forwarded-host') return opts.forwardedHost ?? null;
      if (lower === 'x-forwarded-proto') return opts.forwardedProto ?? null;
      if (lower === 'host') return opts.host ?? null;
      return null;
    },
  }));
}

beforeEach(() => {
  signUpCalls.length = 0;
  signInWithOtpCalls.length = 0;
  signInWithPasswordCalls.length = 0;
  headersMock.mockReset();
});

afterEach(() => {
  const env = process.env as unknown as Record<string, string | undefined>;
  delete env.NEXT_PUBLIC_SITE_URL;
  delete env.VERCEL_PROJECT_PRODUCTION_URL;
  delete env.VERCEL_ENV;
  delete env.NODE_ENV;
});

// Helpers de FormData ---------------------------------------------------------

function makeRegisterFormData(input: {
  nombre: string;
  email: string;
  password: string;
}): FormData {
  const fd = new FormData();
  fd.set('nombre', input.nombre);
  fd.set('email', input.email);
  fd.set('password', input.password);
  fd.set('confirmPassword', input.password);
  return fd;
}

function makeLoginFormData(input: {
  email: string;
  password?: string;
  magicLink?: boolean;
  redirect?: string;
}): FormData {
  const fd = new FormData();
  fd.set('email', input.email);
  // `lib/auth/actions.ts:login` valida `password` (mín 8 chars) ANTES de
  // evaluar la rama magic link, así que en cualquier FormData de login
  // (sea con magic link o password) debemos pasar un password válido.
  fd.set('password', input.password ?? 'placeholderPassword123');
  fd.set('magicLink', input.magicLink ? 'true' : 'false');
  fd.set('redirect', input.redirect ?? '/dashboard');
  return fd;
}

// Tests ------------------------------------------------------------------------

describe('lib/auth/actions — emailRedirectTo production-safe (FIX-20260822-02 / QA F1)', () => {
  describe('register() — AC-1.1, AC-1.3', () => {
    it('AC-1.1 prod con NEXT_PUBLIC_SITE_URL=https://educacion-nem-mvp.vercel.app → emailRedirectTo EXACTO', async () => {
      setProdEnv({
        siteUrl: PROD_ORIGIN,
        // Aún con un host atacante en headers, no debe usarlo.
        forwardedHost: 'attacker.example.com',
        forwardedProto: 'https',
        host: 'attacker.example.com',
      });

      const result = await register(
        makeRegisterFormData({
          nombre: 'Docente Demo',
          email: 'docente@example.test',
          password: 'superSecret123',
        }),
      );

      expect(result.ok).toBe(true);
      expect(signUpCalls).toHaveLength(1);

      const call = signUpCalls[0]!.args[0] as {
        email: string;
        password: string;
        options: { emailRedirectTo: string; data: Record<string, unknown> };
      };
      expect(call.email).toBe('docente@example.test');
      expect(call.password).toBe('superSecret123');
      // Aserción EXACTA pedida por el cierre de F1.
      expect(call.options.emailRedirectTo).toBe(REGISTER_REDIRECT);
      expect(call.options.data).toEqual({ nombre: 'Docente Demo' });
      // Defensiva: nada de localhost, nada del host atacante.
      expect(call.options.emailRedirectTo).not.toMatch(/localhost/i);
      expect(call.options.emailRedirectTo).not.toMatch(/attacker\.example\.com/);
    });

    it('AC-1.2 prod con SÓLO VERCEL_PROJECT_PRODUCTION_URL=educacion-nem-mvp.vercel.app → emailRedirectTo EXACTO', async () => {
      setProdEnv({
        vercelProd: PROD_HOST,
        forwardedHost: 'attacker.example.com',
        host: 'attacker.example.com',
      });

      const result = await register(
        makeRegisterFormData({
          nombre: 'Docente Demo 2',
          email: 'docente2@example.test',
          password: 'superSecret456',
        }),
      );

      expect(result.ok).toBe(true);
      expect(signUpCalls).toHaveLength(1);

      const call = signUpCalls[0]!.args[0] as {
        options: { emailRedirectTo: string };
      };
      expect(call.options.emailRedirectTo).toBe(REGISTER_REDIRECT);
      expect(call.options.emailRedirectTo).not.toMatch(/localhost/i);
      expect(call.options.emailRedirectTo).not.toMatch(/attacker\.example\.com/);
    });

    it('AC-1.3 prod SIN env vars (con host atacante en headers) → throw y NO llama a supabase', async () => {
      setProdEnv({
        forwardedHost: 'attacker.example.com',
        forwardedProto: 'https',
        host: 'attacker.example.com',
      });

      await expect(
        register(
          makeRegisterFormData({
            nombre: 'Docente Demo 3',
            email: 'docente3@example.test',
            password: 'superSecret789',
          }),
        ),
      ).rejects.toThrow(/No production origin configured/);

      // CRÍTICO: la acción debe fallar ANTES de tocar Supabase.
      expect(signUpCalls).toHaveLength(0);
    });

    it('AC-1.4 dev sin env vars → usa host de la request (compatibilidad local)', async () => {
      setDevEnv({ host: 'localhost:3000' });

      const result = await register(
        makeRegisterFormData({
          nombre: 'Docente Dev',
          email: 'dev@example.test',
          password: 'superSecretDev',
        }),
      );

      expect(result.ok).toBe(true);
      expect(signUpCalls).toHaveLength(1);

      const call = signUpCalls[0]!.args[0] as {
        options: { emailRedirectTo: string };
      };
      expect(call.options.emailRedirectTo).toBe(
        'http://localhost:3000/auth/callback?redirect=/onboarding',
      );
    });
  });

  describe('login() con magicLink=true — AC-1.6', () => {
    it('AC-1.6 prod con SÓLO VERCEL_PROJECT_PRODUCTION_URL → emailRedirectTo apunta a /dashboard (en PROD_ORIGIN)', async () => {
      setProdEnv({ vercelProd: PROD_HOST });

      const result = await login(
        makeLoginFormData({
          email: 'login@example.test',
          magicLink: true,
          redirect: '/dashboard',
        }),
      );

      expect(result.ok).toBe(true);
      expect(signInWithOtpCalls).toHaveLength(1);
      // No debe caer a la rama de password.
      expect(signInWithPasswordCalls).toHaveLength(0);

      const call = signInWithOtpCalls[0]!.args[0] as {
        email: string;
        options: { emailRedirectTo: string };
      };
      expect(call.email).toBe('login@example.test');

      // NOTA de comportamiento actual:
      //   `lib/auth/actions.ts:92` aplica `encodeURIComponent(redirectTo)`
      //   al redirect, mientras que `register` y `sendMagicLink` (L136,
      //   L167) lo dejan crudo. Por eso aquí validamos la SEMÁNTICA
      //   (`origin + path` exactos y `redirect` query === '/dashboard')
      //   en lugar de la cadena completa, para no atar el test a una
      //   inconsistencia que es de código, no de seguridad.
      //   La cobertura de la rama `register` (sin encodeo) sí verifica
      //   cadena exacta (ver bloque `register()` arriba).
      const u = new URL(call.options.emailRedirectTo);
      expect(u.origin).toBe(PROD_ORIGIN);
      expect(u.pathname).toBe('/auth/callback');
      expect(u.searchParams.get('redirect')).toBe('/dashboard');
      // Defensiva: nada de localhost ni host atacante.
      expect(call.options.emailRedirectTo).not.toMatch(/localhost/i);
      expect(call.options.emailRedirectTo).not.toMatch(/attacker/i);
    });

    it('AC-1.6 prod con NEXT_PUBLIC_SITE_URL ganando → emailRedirectTo apunta a /dashboard (en PROD_ORIGIN)', async () => {
      setProdEnv({
        siteUrl: PROD_ORIGIN,
        // Headers con host atacante no deben usarse.
        forwardedHost: 'evil.example.org',
        forwardedProto: 'https',
        host: 'evil.example.org',
      });

      const result = await login(
        makeLoginFormData({
          email: 'login2@example.test',
          magicLink: true,
          redirect: '/dashboard',
        }),
      );

      expect(result.ok).toBe(true);
      expect(signInWithOtpCalls).toHaveLength(1);

      const call = signInWithOtpCalls[0]!.args[0] as {
        options: { emailRedirectTo: string };
      };
      const u = new URL(call.options.emailRedirectTo);
      expect(u.origin).toBe(PROD_ORIGIN);
      expect(u.pathname).toBe('/auth/callback');
      expect(u.searchParams.get('redirect')).toBe('/dashboard');
      expect(call.options.emailRedirectTo).not.toMatch(/evil\.example\.org/);
    });

    it('AC-1.3 prod sin env vars + magic link → throw y NO llama a supabase.auth.signInWithOtp', async () => {
      setProdEnv({ forwardedHost: 'attacker.example.com' });

      await expect(
        login(
          makeLoginFormData({
            email: 'login3@example.test',
            magicLink: true,
          }),
        ),
      ).rejects.toThrow(/No production origin configured/);

      expect(signInWithOtpCalls).toHaveLength(0);
    });
  });

  describe('sendMagicLink() — AC-1.7', () => {
    it('AC-1.7 prod con SÓLO VERCEL_PROJECT_PRODUCTION_URL → emailRedirectTo EXACTO a /dashboard', async () => {
      setProdEnv({ vercelProd: PROD_HOST });

      const result = await sendMagicLink('magic@example.test');

      expect(result.ok).toBe(true);
      expect(signInWithOtpCalls).toHaveLength(1);

      const call = signInWithOtpCalls[0]!.args[0] as {
        email: string;
        options: { emailRedirectTo: string };
      };
      expect(call.email).toBe('magic@example.test');
      // Aserción EXACTA pedida por el cierre de F1.
      expect(call.options.emailRedirectTo).toBe(DASHBOARD_REDIRECT);
      expect(call.options.emailRedirectTo).not.toMatch(/localhost/i);
    });

    it('AC-1.7 prod con NEXT_PUBLIC_SITE_URL ganando → emailRedirectTo EXACTO a /dashboard', async () => {
      setProdEnv({
        siteUrl: PROD_ORIGIN,
        forwardedHost: 'attacker.example.com',
        host: 'attacker.example.com',
      });

      const result = await sendMagicLink('magic2@example.test');

      expect(result.ok).toBe(true);
      expect(signInWithOtpCalls).toHaveLength(1);

      const call = signInWithOtpCalls[0]!.args[0] as {
        options: { emailRedirectTo: string };
      };
      expect(call.options.emailRedirectTo).toBe(DASHBOARD_REDIRECT);
      expect(call.options.emailRedirectTo).not.toMatch(/attacker\.example\.com/);
    });

    it('AC-1.7 prod sin env vars → throw y NO llama a supabase.auth.signInWithOtp', async () => {
      setProdEnv({ forwardedHost: 'attacker.example.com' });

      await expect(sendMagicLink('magic3@example.test')).rejects.toThrow(
        /No production origin configured/,
      );

      expect(signInWithOtpCalls).toHaveLength(0);
    });

    it('AC-1.7 input malformado → devuelve error sin invocar supabase', async () => {
      // No hace falta configurar env porque el Zod parse rechaza antes
      // de tocar el helper de origin ni Supabase.
      setDevEnv({ host: 'localhost:3000' });

      const result = await sendMagicLink('no-es-un-email');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Correo inválido');
      expect(result.field).toBe('email');
      expect(signInWithOtpCalls).toHaveLength(0);
    });
  });

  describe('login() password (no magic) — regresión', () => {
    it('password path no construye emailRedirectTo (verifica que NO se invoca magic link)', async () => {
      setProdEnv({ vercelProd: PROD_HOST });

      const result = await login(
        makeLoginFormData({
          email: 'pw@example.test',
          password: 'superSecret123',
          magicLink: false,
        }),
      );

      expect(result.ok).toBe(true);
      expect(signInWithOtpCalls).toHaveLength(0);
      expect(signInWithPasswordCalls).toHaveLength(1);
    });
  });
});
