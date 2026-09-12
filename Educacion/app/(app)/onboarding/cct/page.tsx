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
          <h2 className="text-lg font-semibold">¿En qué jardín de niños trabajas?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Busca tu escuela de preescolar (mínimo 3 letras) o pega la clave CCT (10 caracteres).
            Primaria y secundaria tendrán su propio sistema más adelante.
          </p>
          <CCTPicker />
        </>
      )}
    </OnboardingShell>
  );
}
