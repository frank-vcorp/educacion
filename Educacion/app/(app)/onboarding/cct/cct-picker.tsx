/**
 * Picker de CCT con autocomplete (usa server action para búsqueda).
 * MVP: solo jardines de niños (preescolar).
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCCT } from '@/lib/onboarding/actions';
import { mensajeCCTNoPreescolar, mensajeSoloPreescolar } from '@/lib/nivel-educativo/scope';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';

interface CCTBasic {
  clave: string;
  nombre: string;
  nivel: string;
  turno: string | null;
  municipio_nombre: string | null;
  entidad_nombre: string | null;
}

function esCCTPreescolar(cct: CCTBasic): boolean {
  return cct.nivel === 'preescolar';
}

export function CCTPicker() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CCTBasic[]>([]);
  const [selected, setSelected] = useState<CCTBasic | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    setError(null);
    if (value.trim().length === 10 && /^[A-Z0-9]{10}$/i.test(value.trim())) {
      setSearching(true);
      const res = await fetch(`/api/cct/buscar?clave=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      setSearching(false);
      if (data.cct) {
        if (!esCCTPreescolar(data.cct)) {
          setSelected(null);
          setError(mensajeCCTNoPreescolar(data.cct.nivel));
          setResults([]);
          return;
        }
        setSelected(data.cct);
        setResults([]);
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
    setResults((data.results ?? []).filter(esCCTPreescolar));
  }

  function handleSelect(cct: CCTBasic) {
    if (!esCCTPreescolar(cct)) {
      setError(mensajeCCTNoPreescolar(cct.nivel));
      return;
    }
    setSelected(cct);
    setQuery(cct.nombre);
    setResults([]);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      setError('Selecciona una escuela de la lista');
      return;
    }
    if (!esCCTPreescolar(selected)) {
      setError(mensajeCCTNoPreescolar(selected.nivel));
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set('cct', selected.clave);
    startTransition(async () => {
      const result = await saveCCT(formData);
      if (!result.ok) {
        setError(result.error ?? 'Error');
        return;
      }
      router.push(result.redirectTo ?? '/onboarding/grupo');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <p className="text-sm text-muted-foreground">{mensajeSoloPreescolar()}</p>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar jardín de niños por nombre o clave CCT"
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
            CCT: {selected.clave} · Preescolar
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!selected || isPending} className="w-full">
        {isPending ? 'Guardando…' : 'Continuar'}
      </Button>
    </form>
  );
}
