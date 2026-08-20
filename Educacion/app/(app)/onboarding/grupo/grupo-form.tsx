/**
 * Form para crear grupo.
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGrupo } from '@/lib/onboarding/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GRADOS = ['1°', '2°', '3°'] as const;

function currentCicloEscolar(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Agosto (7) inicia nuevo ciclo. Antes: año anterior-actual
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function GrupoForm({ cct, nivel }: { cct: string; nivel: string }) {
  const router = useRouter();
  const [grado, setGrado] = useState('1°');
  const [grupo, setGrupo] = useState('A');
  const [cicloEscolar, setCicloEscolar] = useState(currentCicloEscolar());
  const [totalAlumnos, setTotalAlumnos] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set('cct', cct);
    formData.set('nivel', nivel);
    formData.set('grado', grado);
    formData.set('grupo', grupo);
    formData.set('cicloEscolar', cicloEscolar);
    if (totalAlumnos) formData.set('totalAlumnos', totalAlumnos);

    startTransition(async () => {
      const result = await createGrupo(formData);
      if (!result.ok) {
        setError(result.error ?? 'Error');
        return;
      }
      router.push(result.redirectTo ?? '/onboarding/alumnos');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <input type="hidden" name="cct" value={cct} />
      <input type="hidden" name="nivel" value={nivel} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="grado" className="text-sm font-medium">
            Grado
          </label>
          <select
            id="grado"
            value={grado}
            onChange={(e) => setGrado(e.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          >
            {GRADOS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grupo" className="text-sm font-medium">
            Grupo
          </label>
          <Input
            id="grupo"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value.toUpperCase())}
            maxLength={2}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cicloEscolar" className="text-sm font-medium">
          Ciclo escolar
        </label>
        <Input
          id="cicloEscolar"
          value={cicloEscolar}
          onChange={(e) => setCicloEscolar(e.target.value)}
          required
          pattern="\d{4}-\d{4}"
          className="mt-1"
          placeholder="2025-2026"
        />
      </div>

      <div>
        <label htmlFor="totalAlumnos" className="text-sm font-medium">
          Total aproximado de alumnos (opcional)
        </label>
        <Input
          id="totalAlumnos"
          type="number"
          min={1}
          max={60}
          value={totalAlumnos}
          onChange={(e) => setTotalAlumnos(e.target.value)}
          className="mt-1"
          placeholder="Ej. 25"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Lo podrás ajustar después. Esto nos ayuda a previsualizar la planeación.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creando…' : 'Crear grupo y continuar'}
      </Button>
    </form>
  );
}
