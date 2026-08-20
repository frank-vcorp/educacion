/**
 * Onboarding Paso 3 — Tu grupo.
 * SPEC_TEC_04 D-FIN-4.
 */
import { OnboardingShell } from '../_components/onboarding-shell';
import { GrupoForm } from './grupo-form';

export default function OnboardingPaso3() {
  return (
    <OnboardingShell paso={3}>
      {(ctx) => (
        <>
          <h2 className="text-lg font-semibold">Tu primer grupo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Puedes agregar hasta 3 grupos por ciclo escolar.
          </p>
          <GrupoForm cct={ctx.cct} nivel={ctx.nivel} />
        </>
      )}
    </OnboardingShell>
  );
}
