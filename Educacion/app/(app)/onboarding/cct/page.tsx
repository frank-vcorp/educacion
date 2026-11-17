/**
 * Onboarding Paso 2 — CCT (autocomplete desde catálogo SEP).
 * SPEC_TEC_04 D-FIN-4.
 */
import { OnboardingShell } from '../_components/onboarding-shell';
import { CCTPicker } from './cct-picker';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPaso2() {
  const session = await getServerSession();
  const cctInvitadoClave =
    typeof session?.user.user_metadata?.cct_invitado === 'string'
      ? session.user.user_metadata.cct_invitado
      : null;

  let cctInvitado = null;
  if (cctInvitadoClave) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('cct')
      .select('clave, nombre, nivel, turno, municipio_nombre, entidad_nombre')
      .eq('clave', cctInvitadoClave)
      .maybeSingle();
    if (data) cctInvitado = data;
  }

  return (
    <OnboardingShell paso={2}>
      {() => (
        <>
          <h2 className="text-lg font-semibold">¿En qué jardín de niños trabajas?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Busca tu escuela de preescolar (mínimo 3 letras) o pega la clave CCT (10 caracteres).
            Primaria y secundaria tendrán su propio sistema más adelante.
          </p>
          <CCTPicker cctInvitado={cctInvitado} />
        </>
      )}
    </OnboardingShell>
  );
}
