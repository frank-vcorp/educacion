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

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);

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
        <label htmlFor="email" className="text-sm font-medium">
          Correo institucional
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1"
          placeholder="tu@escuela.edu.mx"
        />
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
