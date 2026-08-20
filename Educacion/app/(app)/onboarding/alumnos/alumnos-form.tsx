/**
 * Form para agregar alumnos (textarea, uno por línea).
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addAlumnos, skipAlumnos } from '@/lib/onboarding/actions';
import { Button } from '@/components/ui/button';

export function AlumnosForm({ grupoId }: { grupoId: string }) {
  const router = useRouter();
  const [nombres, setNombres] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const lineas = nombres
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lineas.length === 0) {
      setError('Ingresa al menos un nombre o haz clic en "Saltar"');
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set('grupoId', grupoId);
    formData.set('nombres', nombres);
    startTransition(async () => {
      const result = await addAlumnos(formData);
      if (!result.ok) {
        setError(result.error ?? 'Error');
        return;
      }
      router.push(result.redirectTo ?? '/onboarding/bienvenida');
    });
  }

  function handleSkip() {
    startTransition(async () => {
      const result = await skipAlumnos(grupoId);
      router.push(result.redirectTo ?? '/onboarding/bienvenida');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <input type="hidden" name="grupoId" value={grupoId} />
      <div>
        <label htmlFor="nombres" className="text-sm font-medium">
          Escribe un nombre por línea
        </label>
        <textarea
          id="nombres"
          name="nombres"
          value={nombres}
          onChange={(e) => setNombres(e.target.value)}
          rows={8}
          className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          placeholder="Sofía Hernández&#10;Mateo García&#10;Emilia López"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {lineas.length > 0 ? `${lineas.length} alumno(s) listo(s)` : 'Sin capturar aún'}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || lineas.length === 0} className="flex-1">
          {isPending ? 'Guardando…' : 'Agregar alumnos'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSkip}
          disabled={isPending}
        >
          Saltar
        </Button>
      </div>
    </form>
  );
}
