/**
 * Página de registro. SPEC_TEC_04 §9.1.
 */
import { RegisterForm } from './register-form';

export const metadata = {
  title: 'Regístrate',
  description: 'Crea tu cuenta NEM',
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-nem-verde">Crea tu cuenta</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Empieza a planear con NEM. Te tomará menos de 5 minutos.
      </p>
      <RegisterForm />
    </div>
  );
}
