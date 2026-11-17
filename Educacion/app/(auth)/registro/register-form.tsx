/**
 * Form de registro.
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RegisterForm({
  rolInicial = 'docente',
  invToken = '',
  cctInvitado = null,
}: {
  rolInicial?: 'docente' | 'director';
  invToken?: string;
  cctInvitado?: string | null;
} = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [rol, setRol] = useState<'docente' | 'director'>(rolInicial);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setField(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await register(formData);
      if (!result.ok) {
        setError(result.error ?? 'Error desconocido');
        setField(result.field ?? null);
        return;
      }
      router.push(result.redirectTo ?? '/onboarding');
      router.refresh();
    });
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <input type="hidden" name="rol" value={rol} />
      {invToken && <input type="hidden" name="inv" value={invToken} />}

      {cctInvitado ? (
        <div className="rounded-md border border-nem-verde/30 bg-nem-verde/5 px-3 py-2 text-xs text-nem-verde">
          Invitación ligada al plantel <strong>CCT {cctInvitado}</strong> como{' '}
          <strong>{rol === 'director' ? 'Director(a)' : 'Docente'}</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setRol('docente')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              rol === 'docente'
                ? 'bg-nem-verde text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Soy Docente
          </button>
          <button
            type="button"
            onClick={() => setRol('director')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              rol === 'director'
                ? 'bg-nem-verde text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Soy Director(a)
          </button>
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre completo
        </label>
        <Input
          id="nombre"
          name="nombre"
          type="text"
          required
          autoComplete="name"
          minLength={2}
          maxLength={100}
          className="mt-1"
          placeholder="Como te conocen Tus alumnos"
        />
      </div>

      <div>
        <label htmlFor="whatsapp" className="text-sm font-medium">
          Número de WhatsApp
        </label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          className="mt-1"
          placeholder="Ej. 55 1234 5678"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          10 dígitos (México) o con lada internacional. Será tu usuario de acceso.
        </p>
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar contraseña
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          className="mt-1"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" data-field={field ?? undefined} role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>

      <p className="mt-6 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
