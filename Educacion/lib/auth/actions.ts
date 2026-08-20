/**
 * Server actions para auth: login, registro, logout, magic link.
 * SPEC_TEC_04 §9.1 — Supabase Auth con email + password + magic link.
 * NO OAuth social en MVP.
 */
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';

const EmailSchema = z.string().email('Correo institucional inválido');
const PasswordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres');

const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  magicLink: z.boolean().optional(),
});

const RegisterSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido').max(100),
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: PasswordSchema,
});

export type AuthResult = {
  ok: boolean;
  error?: string;
  field?: string;
  redirectTo?: string;
};

function getOrigin() {
  const h = headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/**
 * Login con email + password (o magic link si magicLink=true).
 */
export async function login(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
    magicLink: formData.get('magicLink') === 'true',
  };
  const redirectTo = String(formData.get('redirect') ?? '/dashboard');

  const parsed = LoginSchema.safeParse({
    email: raw.email,
    password: raw.password,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Datos inválidos' };
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() };
  }

  const supabase = await createClient();

  if (raw.magicLink) {
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${getOrigin()}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, redirectTo: '/login?magic=ok' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: 'Correo o contraseña incorrectos' };

  return { ok: true, redirectTo };
}

/**
 * Registro de docente. Crea fila en `docente` con cct='' (se completa en onboarding).
 */
export async function register(formData: FormData): Promise<AuthResult> {
  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Datos inválidos' };
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { ok: false, error: 'Las contraseñas no coinciden', field: 'confirmPassword' };
  }

  const supabase = await createClient();

  // 1) Crear usuario en auth.users
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getOrigin()}/auth/callback?redirect=/onboarding`,
      data: { nombre: parsed.data.nombre },
    },
  });
  if (signUpError) return { ok: false, error: signUpError.message };
  if (!signUpData.user) return { ok: false, error: 'No se pudo crear la cuenta' };

  return { ok: true, redirectTo: '/onboarding' };
}

/**
 * Logout. Server action para usar en formularios.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Reenvío de magic link (para usuarios existentes).
 */
export async function sendMagicLink(email: string): Promise<AuthResult> {
  const parsed = EmailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) {
    return { ok: false, error: 'Correo inválido', field: 'email' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${getOrigin()}/auth/callback?redirect=/dashboard`,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
