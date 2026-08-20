/**
 * Panel de sugerencias estáticas para "problema del contexto" del wizard.
 * SPEC-CORRECCIONES-2026-08-17 C-5 + INTEGRA valid 2026-08-18 P-PD9.
 *
 * Click en una sugerencia → rellena el textarea.
 * NO hace llamadas a IA externa.
 *
 * Cumplimiento P-PD9 (corregido en sesión 6, IMPL-20260818-06):
 *  - Disparador explícito: botón "💡 Ver sugerencias para tu contexto".
 *    El panel está colapsado por defecto. La maestra decide cuándo verlo.
 *  - Botón descartar "✕ Descartar": cierra el panel y, mientras el
 *    wizard esté montado, NO vuelve a mostrarse automáticamente.
 *    Si la maestra quiere ver sugerencias de nuevo, debe hacer clic
 *    en "Volver a mostrar" (botón secundario, accesible).
 */
'use client';

import { useState } from 'react';
import { Lightbulb, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSugerencias } from './sugerencias-data';

export function SugerenciasIA({
  nivel,
  onSelect,
}: {
  nivel: string | null | undefined;
  onSelect: (texto: string) => void;
}) {
  const sugerencias = getSugerencias(nivel);

  // Estados del panel:
  //  - 'hidden'  → maestra descartó, no se muestra automáticamente.
  //  - 'closed'  → aún no se ha visto (o se reabrió tras descartar).
  //  - 'open'    → panel visible.
  const [estado, setEstado] = useState<'closed' | 'open' | 'hidden'>('closed');

  if (estado === 'hidden') {
    return (
      <div className="mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEstado('closed')}
          className="text-xs text-muted-foreground"
        >
          💡 Volver a mostrar sugerencias
        </Button>
      </div>
    );
  }

  if (estado === 'closed') {
    return (
      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEstado('open')}
          className="border-nem-verde/40 text-nem-verde hover:bg-nem-verde/5"
        >
          <Lightbulb className="mr-1 h-4 w-4" />
          💡 Ver sugerencias para tu contexto
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-nem-verde/30 bg-nem-verde/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-nem-verde" />
          <p className="text-sm font-medium">Sugerencias para tu contexto</p>
          <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            Estático · sin IA
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEstado('hidden')}
          aria-label="Descartar sugerencias"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" />
          Descartar
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Ejemplos de problemas frecuentes en tu nivel. Click para usar como punto de partida.
      </p>
      <ul className="mt-3 space-y-2">
        {sugerencias.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className="group flex w-full items-start gap-2 rounded-md border bg-card p-3 text-left text-sm transition-colors hover:border-nem-verde/50 hover:bg-card/80"
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nem-verde/70 transition-colors group-hover:text-nem-verde" />
              <span>{s}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
