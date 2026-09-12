import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { resolveSupabaseCreds } from './supabase-creds';

const DEFAULT_EMAIL = 'frank@vcorp.mx';

async function dismissAvisoIfVisible(page: Page): Promise<void> {
  const checkbox = page.getByRole('checkbox', {
    name: /he leído|aviso de privacidad/i,
  });
  if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    await checkbox.check();
    await page.getByRole('button', { name: /aceptar/i }).click();
    await page.waitForTimeout(500);
  }
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
  const { url: supabaseUrl, serviceRoleKey: serviceKey } = await resolveSupabaseCreds();

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const redirectTo = `${baseURL.replace(/\/$/, '')}/auth/callback?redirect=/planeaciones/nueva`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error || !data.properties?.action_link) {
    throw new Error(error?.message ?? 'No se pudo generar magic link de admin');
  }

  await page.goto(data.properties.action_link);
  await page.waitForURL(/\/planeaciones\/nueva|\/dashboard|\/onboarding/, {
    timeout: 45_000,
  });
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
