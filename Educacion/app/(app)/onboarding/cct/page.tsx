/**
 * Onboarding Paso 2 — CCT (autocomplete desde catálogo SEP).
 * SPEC_TEC_04 D-FIN-4.
 */
import { OnboardingShell } from '../_components/onboarding-shell';
import { CCTPicker } from './cct-picker';

export default function OnboardingPaso2() {
  return (
    <OnboardingShell paso={2}>
      {() => (
        <>
          <h2 className="text-lg font-semibold">¿En qué escuela trabajas?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribe el nombre de la escuela (mínimo 3 letras). También puedes pegar la clave
            CCT (10 caracteres) directamente.
          </p>
          <CCTPicker />
        </>
      )}
    </OnboardingShell>
  );
}
