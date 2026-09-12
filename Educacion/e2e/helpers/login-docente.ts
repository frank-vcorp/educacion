import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Page } from '@playwright/test';
import { resolveSupabaseCreds } from './supabase-creds';

const DEFAULT_EMAIL = 'frank@vcorp.mx';

export async function dismissAvisoIfVisible(page: Page): Promise<void> {
  const checkbox = page.getByRole('checkbox', {
    name: /he leído|aviso de privacidad/i,
  });
  if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    await checkbox.check();
    await page.getByRole('button', { name: /aceptar/i }).click();
    await page.waitForTimeout(500);
  }
}

async function injectSupabaseSession(
  page: Page,
  baseURL: string,
  supabaseUrl: string,
  anonKey: string,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookies) {
        cookiesToSet.push(...cookies);
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw new Error(`setSession E2E: ${error.message}`);
  }

  const normalizeSameSite = (value: CookieOptions['sameSite']): 'Lax' | 'Strict' | 'None' => {
    const s = String(value ?? 'lax').toLowerCase();
    if (s === 'strict') return 'Strict';
    if (s === 'none') return 'None';
    return 'Lax';
  };

  const { hostname } = new URL(baseURL);
  await page.context().addCookies(
    cookiesToSet.map(({ name, value, options }) => ({
      name,
      value,
      domain: hostname,
      path: options.path ?? '/',
      httpOnly: options.httpOnly ?? false,
      secure: options.secure ?? baseURL.startsWith('https'),
      sameSite: normalizeSameSite(options.sameSite),
      expires: options.maxAge
        ? Math.floor(Date.now() / 1000) + options.maxAge
        : undefined,
    })),
  );
}

async function loginWithPassword(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login?redirect=/planeaciones/nueva');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await page.waitForURL(/\/(dashboard|planeaciones|onboarding)/, { timeout: 30_000 });
  await dismissAvisoIfVisible(page);
}

async function loginWithMagicLink(page: Page, email: string, baseURL: string): Promise<void> {
  const { url: supabaseUrl, serviceRoleKey, anonKey } = await resolveSupabaseCreds();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${baseURL.replace(/\/$/, '')}/auth/callback?redirect=/planeaciones/nueva`,
    },
  });

  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? 'No se pudo generar magic link de admin');
  }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: 'email',
  });

  if (verifyError || !verified.session) {
    throw new Error(verifyError?.message ?? 'verifyOtp falló en E2E');
  }

  await injectSupabaseSession(
    page,
    baseURL,
    supabaseUrl,
    anonKey,
    verified.session.access_token,
    verified.session.refresh_token,
  );

  await page.goto('/planeaciones/nueva');
  await page.waitForURL(/\/(planeaciones\/nueva|dashboard|onboarding)/, { timeout: 30_000 });
  await dismissAvisoIfVisible(page);
}

/** Inicia sesión como docente (contraseña o magic link admin). */
export async function loginDocente(page: Page, baseURL: string): Promise<string> {
  const email = process.env.E2E_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (password) {
    await loginWithPassword(page, email, password);
  } else {
    await loginWithMagicLink(page, email, baseURL);
  }

  return email;
}
