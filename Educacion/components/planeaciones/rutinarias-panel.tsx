'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  RUTINAS_PRESETS_PREESCOLAR,
  type DiaSemanaHabil,
  type RutinaGrupoItem,
} from '@/lib/planeaciones/calendario-escolar';

const DIAS_CORTO: Array<{ dia: DiaSemanaHabil; label: string }> = [
  { dia: 1, label: 'L' },
  { dia: 2, label: 'M' },
  { dia: 3, label: 'Mi' },
  { dia: 4, label: 'J' },
  { dia: 5, label: 'V' },
];

export function RutinariasPanel({
  rutinas = [],
  onChangeRutinas,
}: {
  rutinas?: RutinaGrupoItem[];
  onChangeRutinas?: (next: RutinaGrupoItem[]) => void;
} = {}) {
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<RutinaGrupoItem['categoria']>('especial');
  const [dias, setDias] = useState<DiaSemanaHabil[]>([1, 3]);

  const toggleDia = (d: DiaSemanaHabil) => {
    setDias((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  };

  const agregarRutina = () => {
    if (!onChangeRutinas || !titulo.trim() || dias.length === 0) return;
    onChangeRutinas([
      ...rutinas,
      {
        id: `rut-${Date.now()}`,
        titulo: titulo.trim(),
        categoria,
        diasSemana: dias,
      },
    ]);
    setTitulo('');
  };

  const agregarPreset = (preset: Omit<RutinaGrupoItem, 'id'>) => {
    if (!onChangeRutinas) return;
    if (rutinas.some((r) => r.titulo.toLowerCase() === preset.titulo.toLowerCase())) return;
    onChangeRutinas([
      ...rutinas,
      {
        id: `rut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...preset,
      },
    ]);
  };

  const toggleDiaItem = (id: string, d: DiaSemanaHabil) => {
    if (!onChangeRutinas) return;
    onChangeRutinas(
      rutinas.map((r) => {
        if (r.id !== id) return r;
        const nextDias = r.diasSemana.includes(d)
          ? r.diasSemana.filter((x) => x !== d)
          : [...r.diasSemana, d].sort();
        return { ...r, diasSemana: nextDias };
      }),
    );
  };

  const eliminar = (id: string) => {
    if (!onChangeRutinas) return;
    onChangeRutinas(rutinas.filter((r) => r.id !== id));
  };

  return (
    <details
      className="group mt-4 rounded-lg border bg-muted/20"
      data-testid="rutinarias-panel"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-medium">
            Horario del grupo: Rutinarias, Recurrentes y Clases especiales
          </p>
          <p className="text-[11px] text-muted-foreground">
            Lunes incluye Honores y el último viernes CTE automáticamente. Configura aquí Música, Educación física y rutinas de tu grupo ({rutinas.length} activas).
          </p>
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t px-3 pb-3 pt-3">
        {rutinas.length > 0 && (
          <div className="space-y-2">
            {rutinas.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.titulo}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {r.categoria === 'especial' ? 'Clase especial' : r.categoria}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {DIAS_CORTO.map(({ dia, label }) => {
                    const activo = r.diasSemana.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => toggleDiaItem(r.id, dia)}
                        className={`h-6 w-6 rounded text-[10px] font-medium transition-colors ${
                          activo
                            ? 'bg-nem-verde text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => eliminar(r.id)}
                    aria-label={`Eliminar ${r.titulo}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Agregar rápido al horario del grupo:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RUTINAS_PRESETS_PREESCOLAR.map((p) => (
              <Button
                key={p.titulo}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                onClick={() => agregarPreset(p)}
              >
                <Plus className="h-3 w-3" />
                {p.titulo}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2">
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Otra rutina o clase (ej. Inglés, Computación, Lectura)..."
            className="h-8 min-w-[180px] flex-1 text-xs"
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as RutinaGrupoItem['categoria'])}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="especial">Clase especial</option>
            <option value="rutinaria">Rutinaria</option>
            <option value="recurrente">Recurrente</option>
          </select>
          <div className="flex items-center gap-1">
            {DIAS_CORTO.map(({ dia, label }) => {
              const activo = dias.includes(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(dia)}
                  className={`h-7 w-7 rounded text-[11px] font-medium ${
                    activo
                      ? 'bg-nem-verde text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={agregarRutina}
            disabled={!titulo.trim() || dias.length === 0}
            className="h-8 text-xs"
          >
            Agregar
          </Button>
        </div>
      </div>
    </details>
  );
}
