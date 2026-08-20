/**
 * Onboarding Paso 1 — Registro.
 * NOTA: el registro real ocurre en /registro. Esta página es un resumen
 * si el usuario llegó por magic link sin establecer password.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';

export default async function OnboardingPaso1() {
  const session = await getServerSession();
  if (!session) redirect('/login?redirect=/onboarding');
  if (!session.docenteId) redirect('/registro');
  redirect('/onboarding/cct');
}
