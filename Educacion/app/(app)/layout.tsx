/**
 * Layout para rutas autenticadas — header con GrupoSelector + AvisoPrivacidad gate.
 * SPEC_TEC_04 §3: (app) route group.
 * SPEC_TEC_04 D-FIN-15: Aviso de Privacidad antes de capturar alumnos.
 */
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { AppHeader } from './_components/app-header';
import { AvisoPrivacidadGate } from './_components/aviso-privacidad-gate';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  // /onboarding/* tiene su propio shell (no requiere cct ni aviso)
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session.user} />
      <main className="flex-1">{children}</main>
      {!session.hasAcceptedAviso && session.docenteId && (
        <AvisoPrivacidadGate docenteId={session.docenteId} cct={session.cct ?? ''} />
      )}
    </div>
  );
}
