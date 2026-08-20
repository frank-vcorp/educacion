/**
 * Onboarding Paso 4 — Lista de alumnos (opcional).
 * SPEC_TEC_04 D-FIN-4.
 */
import { OnboardingShell } from '../_components/onboarding-shell';
import { AlumnosForm } from './alumnos-form';

export default function OnboardingPaso4() {
  return (
    <OnboardingShell paso={4}>
      {(ctx) => (
        <>
          <h2 className="text-lg font-semibold">Lista de alumnos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opcional. Puedes capturar después desde la sección de alumnos. Solo nombre —
            ningún dato sensible.
          </p>
          <AlumnosForm grupoId={ctx.grupoId ?? ''} />
        </>
      )}
    </OnboardingShell>
  );
}
