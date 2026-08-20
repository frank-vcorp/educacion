/**
 * Banco de palabras para Unidad Didáctica (D-FIN-7).
 * SPEC_MODALIDADES_2026-08-17.
 *
 * Input que acepta texto separado por comas, lo convierte a array y notifica
 * al wizard padre vía `onChange`. Máximo 10 palabras, sin duplicados.
 * Vista previa como chips/badges con botón eliminar.
 */
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const MAX_PALABRAS = 10;

export function parseBancoPalabras(text: string): string[] {
  return text
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
}

interface Props {
  value: string[];
  onChange: (palabras: string[]) => void;
}

export function WizardBancoPalabras({ value, onChange }: Props) {
  const [input, setInput] = useState('');

  function agregar(texto: string) {
    const palabras = parseBancoPalabras(texto);
    if (palabras.length === 0) return;

    const set = new Set(value);
    for (const p of palabras) {
      if (set.size >= MAX_PALABRAS) break;
      set.add(p);
    }
    onChange(Array.from(set));
    setInput('');
  }

  function eliminar(palabra: string) {
    onChange(value.filter((p) => p !== palabra));
  }

  const restantes = MAX_PALABRAS - value.length;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="banco-input">
          Banco de palabras ({value.length}/{MAX_PALABRAS})
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Escribe palabras separadas por comas. Se guardan en minúsculas y sin duplicados.
        </p>
      </div>
      <Input
        id="banco-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            agregar(input);
          } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
            const last = value[value.length - 1];
            if (last) eliminar(last);
          }
        }}
        onBlur={() => {
          if (input.trim()) agregar(input);
        }}
        placeholder="Ej. agua, río, semilla, comunidad, cuidar"
        disabled={value.length >= MAX_PALABRAS}
        aria-describedby="banco-help"
      />
      <p id="banco-help" className="text-xs text-muted-foreground">
        {restantes > 0
          ? `Puedes agregar ${restantes} más.`
          : 'Has alcanzado el máximo de palabras.'}
      </p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Palabras agregadas">
          {value.map((p) => (
            <Badge
              key={p}
              variant="secondary"
              className="flex items-center gap-1 bg-nem-verde/10 px-2 py-1 text-sm text-nem-verde"
              role="listitem"
            >
              <span>{p}</span>
              <button
                type="button"
                onClick={() => eliminar(p)}
                className="ml-1 rounded-sm hover:bg-nem-verde/20"
                aria-label={`Eliminar palabra ${p}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}