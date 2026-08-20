/**
 * Form de edición de CCT (reutiliza CCTPicker del onboarding).
 * SPEC-CORRECCIONES-2026-08-17 C-1.
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateDocenteCCT } from '@/lib/perfil/actions';

interface CCTBasic {
  clave: string;
  nombre: string;
  nivel: string;
  turno: string | null;
  municipio_nombre: string | null;
  entidad_nombre: string | null;
}

const NIVELES = [
  { value: 'preescolar', label: 'Preescolar' },
  { value: 'primaria', label: 'Primaria' },
  { value: 'secundaria', label: 'Secundaria' },
];

export function EditarCCTForm({ cctInicial, nivelInicial }: { cctInicial: string; nivelInicial: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(cctInicial);
  const [results, setResults] = useState<CCTBasic[]>([]);
  const [selected, setSelected] = useState<CCTBasic | null>(
    cctInicial ? { clave: cctInicial, nombre: cctInicial, nivel: nivelInicial, turno: null, municipio_nombre: null, entidad_nombre: null } : null,
  );
  const [nivel, setNivel] = useState(nivelInicial || 'preescolar');
  const [isPending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    setSuccess(false);
    // Clave exacta 10 chars → lookup directo
    if (value.trim().length === 10 && /^[A-Z0-9]{10}$/i.test(value.trim())) {
      setSearching(true);
      const res = await fetch(`/api/cct/buscar?clave=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      setSearching(false);
      if (data.cct) {
        setSelected(data.cct);
        setResults([]);
        if (['preescolar', 'primaria', 'secundaria'].includes(data.cct.nivel)) {
          setNivel(data.cct.nivel);
        }
      } else {
        setSelected(null);
      }
      return;
    }
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/cct/buscar?q=${encodeURIComponent(value.trim())}`);
    const data = await res.json();
    setSearching(false);
    setResults(data.results ?? []);
  }

  function handleSelect(c: CCTBasic) {
    setSelected(c);
    setQuery(c.clave);
    setResults([]);
    if (['preescolar', 'primaria', 'secundaria'].includes(c.nivel)) {
      setNivel(c.nivel);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      setError('Selecciona una escuela de la lista');
      return;
    }
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateDocenteCCT({ cct: selected.clave, nivel });
      if (!res.ok) {
        setError(res.error ?? 'Error al guardar');
        return;
      }
      setSuccess(true);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Editar CCT y nivel
        </Button>
        {success && (
          <p className="mt-2 text-xs text-nem-verde">✓ CCT actualizado correctamente</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre o clave CCT"
          className="pl-9"
          autoComplete="off"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="max-h-64 overflow-y-auto rounded-md border bg-popover shadow">
          {results.map((c) => (
            <li key={c.clave}>
              <button
                type="button"
                onClick={() => handleSelect(c)}
                className="flex w-full flex-col items-start gap-1 border-b p-3 text-left text-sm last:border-b-0 hover:bg-accent"
              >
                <span className="font-medium">{c.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {c.clave} · {c.nivel} · {c.turno ?? '—'}
                  {c.municipio_nombre && ` · ${c.municipio_nombre}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="rounded-md border border-nem-verde/30 bg-nem-verde/5 p-3">
          <p className="text-sm font-medium">{selected.nombre}</p>
          <p className="text-xs text-muted-foreground">
            CCT: {selected.clave} · {selected.nivel}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="nivel" className="text-sm font-medium">
          Nivel educativo
        </label>
        <select
          id="nivel"
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
          className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        >
          {NIVELES.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!selected || isPending}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
