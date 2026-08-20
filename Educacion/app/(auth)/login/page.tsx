/**
 * Página de login con email + password + magic link.
 * SPEC_TEC_04 §9.1: Auth Supabase.
 */
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta NEM',
};

interface SearchParams {
  redirect?: string;
  magic?: string;
  error?: string;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-nem-verde">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ingresa con tu correo institucional. Te enviaremos un enlace mágico si lo prefieres.
      </p>

      {searchParams.magic === 'ok' && (
        <div className="mt-4 rounded border border-nem-verde/30 bg-nem-verde/10 p-3 text-sm text-nem-verde">
          Te enviamos un enlace mágico. Revisa tu correo.
        </div>
      )}
      {searchParams.error === 'auth_callback_failed' && (
        <div className="mt-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          El enlace expiró o ya se usó. Vuelve a intentar.
        </div>
      )}

      <LoginForm redirect={searchParams.redirect} />
    </div>
  );
}
