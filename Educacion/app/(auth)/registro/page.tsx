/**
 * Página de registro. SPEC_TEC_04 §9.1.
 */
import { RegisterForm } from './register-form';
import {
  normalizarRolRegistro,
  verifyInvitacionCCT,
} from '@/lib/auth/invitacion-cct';

export const metadata = {
  title: 'Regístrate',
  description: 'Crea tu cuenta NEM',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: { rol?: string; inv?: string };
}) {
  const invToken = searchParams?.inv ?? '';
  const invPayload = invToken ? await verifyInvitacionCCT(invToken) : null;
  const rolInicial = invPayload
    ? invPayload.rolObjetivo
    : normalizarRolRegistro(searchParams?.rol);

  const esDirector = rolInicial === 'director';

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
      <div className="inline-flex items-center rounded-full bg-nem-verde/10 px-2.5 py-0.5 text-xs font-medium text-nem-verde">
        {esDirector ? 'Alta como Director(a)' : 'Alta como Docente'}
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-nem-verde">
        {esDirector ? 'Registro de Dirección' : 'Crea tu cuenta docente'}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {invPayload
          ? `Te invitó ${invPayload.inviterNombre} al plantel CCT ${invPayload.cct}.`
          : esDirector
            ? 'Vincula tu plantel (CCT). Al terminar, un docente de tu escuela confirmará tu alta.'
            : 'Empieza a planear con NEM en minutos. Te tomará menos de 5 minutos.'}
      </p>
      <RegisterForm
        rolInicial={rolInicial}
        invToken={invPayload ? invToken : ''}
        cctInvitado={invPayload?.cct ?? null}
      />
    </div>
  );
}
