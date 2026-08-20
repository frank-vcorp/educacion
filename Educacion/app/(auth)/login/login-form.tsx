/**
 * Form de login. Componente cliente para usar Server Actions.
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, sendMagicLink } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginFormProps {
  redirect?: string;
}

export function LoginForm({ redirect }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setField(null);
    const formData = new FormData(e.currentTarget);
    if (redirect) formData.set('redirect', redirect);

    startTransition(async () => {
      const result = await login(formData);
      if (!result.ok) {
        setError(result.error ?? 'Error desconocido');
        setField(result.field ?? null);
        return;
      }
      if (result.redirectTo === '/login?magic=ok') {
        setMagicSent(true);
        return;
      }
      router.push(result.redirectTo ?? '/dashboard');
      router.refresh();
    });
  }

  function handleMagicResend() {
    const formData = new FormData();
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    if (!email) {
      setError('Ingresa tu correo para reenviar el enlace');
      setField('email');
      return;
    }
    formData.set('email', email);
    setError(null);
    startTransition(async () => {
      const result = await sendMagicLink(email);
      if (!result.ok) {
        setError(result.error ?? 'Error desconocido');
        setField(result.field ?? null);
        return;
      }
      setMagicSent(true);
    });
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

      {!magicMode && (
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            className="mt-1"
          />
        </div>
      )}

      {error && (
        <p
          className="text-sm text-destructive"
          data-field={field ?? undefined}
          role="alert"
        >
          {error}
        </p>
      )}

      {magicSent && (
        <p className="text-sm text-nem-verde" role="status">
          Si el correo está registrado, recibirás un enlace mágico.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Enviando…' : magicMode ? 'Enviar enlace mágico' : 'Entrar'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setMagicMode(!magicMode);
            setError(null);
          }}
          className="text-primary underline-offset-4 hover:underline"
        >
          {magicMode ? 'Usar contraseña' : 'Enviar enlace mágico'}
        </button>
        <Link
          href="/recuperar-password"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {magicMode && !magicSent && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleMagicResend}
          disabled={isPending}
          className="w-full"
        >
          Reenviar enlace
        </Button>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link
          href="/registro"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}
