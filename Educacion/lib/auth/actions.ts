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
import { resolveOrigin } from '@/lib/auth/origin';

import {
  normalizarWhatsapp,
  resolverIdentificadorLogin,
  whatsappToAuthEmail,
} from '@/lib/auth/whatsapp';

const EmailSchema = z.string().email('Correo institucional inválido');
const PasswordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres');

const LoginSchema = z.object({
  identificador: z.string().min(1, 'Ingresa tu WhatsApp o correo'),
  password: PasswordSchema,
  magicLink: z.boolean().optional(),
});

const RegisterSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido').max(100),
  whatsapp: z.string().min(10, 'Número de WhatsApp inválido').max(25),
  password: PasswordSchema,
  confirmPassword: PasswordSchema,
});

export type AuthResult = {
  ok: boolean;
  error?: string;
  field?: string;
  redirectTo?: string;
};

/**
 * Resuelve el `origin` de forma production-safe (FIX-20260822-01).
 *
 * Wrapper interno que pasa el entorno actual al helper puro
 * `resolveOrigin` (exportado en `@/lib/auth/origin`).
 *
 * Producción nunca debe usar `localhost` ni aceptar un host arbitrario
 * del request (las cabeceras `host` / `x-forwarded-host` son controladas
 * por el cliente y envenenarían el `emailRedirectTo`). Ver
 * `lib/auth/origin.ts` para precedencia completa.
 */
function getOrigin(): string {
  const h = headers();
  return resolveOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelProd: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    isProd:
      process.env.VERCEL_ENV === 'production' ||
      process.env.NODE_ENV === 'production',
    forwardedHost: h.get('x-forwarded-host'),
    forwardedProto: h.get('x-forwarded-proto'),
    host: h.get('host'),
  });
}

/**
 * Login con WhatsApp o correo + password (o magic link si es correo y magicLink=true).
 */
export async function login(formData: FormData): Promise<AuthResult> {
  const rawIdentificador = String(
    formData.get('identificador') ?? formData.get('email') ?? ''
  ).trim();
  const raw = {
    identificador: rawIdentificador,
    password: String(formData.get('password') ?? ''),
    magicLink: formData.get('magicLink') === 'true',
  };
  const redirectTo = String(formData.get('redirect') ?? '/dashboard');

  const parsed = LoginSchema.safeParse({
    identificador: raw.identificador,
    password: raw.password,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return { ok: false, error: 'Datos inválidos' };
    return { ok: false, error: issue.message, field: issue.path[0]?.toString() };
  }

  const resolved = resolverIdentificadorLogin(parsed.data.identificador);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, field: 'identificador' };
  }

  const supabase = await createClient();

  if (raw.magicLink) {
    if (!resolved.esCorreo) {
      return {
        ok: false,
        error: 'El enlace mágico solo está disponible para cuentas con correo electrónico.',
        field: 'identificador',
      };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: resolved.authEmail,
      options: {
        emailRedirectTo: `${getOrigin()}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, redirectTo: '/login?magic=ok' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: resolved.authEmail,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: 'WhatsApp/correo o contraseña incorrectos' };

  return { ok: true, redirectTo };
}

/**
 * Registro de docente/director con WhatsApp. Crea usuario en auth.users sin fricción.
 */
export async function register(formData: FormData): Promise<AuthResult> {
  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    whatsapp: String(formData.get('whatsapp') ?? '').trim(),
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

  const whatsappDigits = normalizarWhatsapp(parsed.data.whatsapp);
  if (!whatsappDigits) {
    return {
      ok: false,
      error: 'Ingresa un número de WhatsApp válido (10 dígitos en México o con lada)',
      field: 'whatsapp',
    };
  }

  const rolParam = String(formData.get('rol') ?? '').trim();
  const invToken = String(formData.get('inv') ?? '').trim();

  const { normalizarRolRegistro, verifyInvitacionCCT } = await import(
    '@/lib/auth/invitacion-cct'
  );
  const invPayload = invToken ? await verifyInvitacionCCT(invToken) : null;
  const rolInicial = invPayload
    ? invPayload.rolObjetivo
    : normalizarRolRegistro(rolParam);

  const supabase = await createClient();

  // 1) Crear usuario en auth.users usando el correo interno derivado del WhatsApp
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: whatsappToAuthEmail(whatsappDigits),
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getOrigin()}/auth/callback?redirect=/onboarding`,
      data: {
        nombre: parsed.data.nombre,
        whatsapp: `+${whatsappDigits}`,
        rol_inicial: rolInicial,
        ...(invPayload
          ? {
              cct_invitado: invPayload.cct,
              inv_por_id: invPayload.inviterId,
              inv_por_nombre: invPayload.inviterNombre,
            }
          : {}),
      },
    },
  });
  if (signUpError) {
    const msg = signUpError.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return {
        ok: false,
        error: 'Este número de WhatsApp ya está registrado. Inicia sesión.',
        field: 'whatsapp',
      };
    }
    return { ok: false, error: signUpError.message };
  }
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
