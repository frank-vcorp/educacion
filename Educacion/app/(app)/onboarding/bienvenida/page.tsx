/**
 * Onboarding Paso 5 — Bienvenida.
 * SPEC_TEC_04 D-FIN-4.
 */
import Link from 'next/link';
import { OnboardingShell } from '../_components/onboarding-shell';
import { finishOnboarding } from '@/lib/onboarding/actions';

export default function OnboardingPaso5() {
  return (
    <OnboardingShell paso={5}>
      {() => (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-nem-verde/10 text-3xl">
            🎉
          </div>
          <h2 className="text-lg font-semibold">¡Listo!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu espacio está configurado. Ahora puedes crear tu primera planeación.
          </p>

          <div className="mt-6 rounded-md border bg-muted/30 p-4 text-left">
            <p className="text-sm font-medium">Tip del día</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Empieza con un <strong>Proyecto Comunitario</strong>: parte de una pregunta
              detonadora sobre tu entorno y conecta con un contenido del programa sintético.
              La maestra Tía Lola tiene un ejemplo en la biblioteca.
            </p>
          </div>

          <form action={finishOnboarding} className="mt-6">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-nem-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-nem-verde/90"
            >
              Ir a mis planeaciones
            </button>
          </form>
          <Link
            href="/dashboard"
            className="mt-3 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Ir al dashboard
          </Link>
        </div>
      )}
    </OnboardingShell>
  );
}
