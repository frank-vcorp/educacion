/**
 * Onboarding Paso 1 — Registro.
 * NOTA: el registro real ocurre en /registro. Esta página es un resumen
 * si el usuario llegó por magic link sin establecer password.
 *
 * FIX-20260822-01: si la sesión está autenticada pero todavía no tiene fila
 * en `docente` (caso típico tras confirmar email con magic link), debe ir a
 * `/onboarding/cct` — NO a `/registro`. Es exactamente en `saveCCT` donde
 * se crea/actualiza la fila docente, y enviar al usuario a `/registro` lo
 * devuelve a un formulario de cuenta que ya existe.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';

export default async function OnboardingPaso1() {
  const session = await getServerSession();
  if (!session) redirect('/login?redirect=/onboarding');
  if (!session.docenteId) redirect('/onboarding/cct');
  redirect('/onboarding/cct');
}
