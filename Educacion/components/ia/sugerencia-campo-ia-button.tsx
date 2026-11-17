'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Modalidad } from '@/components/planeaciones/wizard-modalidad-data';

export interface SugerenciaCampoIaButtonProps {
  campo: 'problema' | 'proposito' | 'ajustes_razonables';
  modalidad: Modalidad;
  alcanceTemporal?: string;
  periodoInicio?: string;
  periodoFin?: string;
  nombre: string;
  problemaContexto: string;
  proposito: string;
  valorActual: string;
  onApply: (texto: string) => void;
}

export function SugerenciaCampoIaButton({
  campo,
  modalidad,
  alcanceTemporal,
  periodoInicio,
  periodoFin,
  nombre,
  problemaContexto,
  proposito,
  valorActual,
  onApply,
}: SugerenciaCampoIaButtonProps) {
  const [loading, setLoading] = useState(false);
  const [propuesta, setPropuesta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const sinContexto =
    !nombre.trim() && !problemaContexto.trim() && !proposito.trim();

  async function handlePedir() {
    if (loading || sinContexto) return;
    setLoading(true);
    setAviso(null);
    setPropuesta(null);

    try {
      const res = await fetch('/api/planeaciones/ia/campo-contexto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campo,
          modalidad,
          alcance_temporal: alcanceTemporal ?? '',
          periodo_inicio: periodoInicio ?? '',
          periodo_fin: periodoFin ?? '',
          nombre,
          problema_contexto: problemaContexto,
          proposito,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        data?: { texto?: string; origen?: 'ia' | 'fallback_vacio' };
        error?: { message?: string };
      };

      if (!res.ok) {
        setAviso(json.error?.message ?? 'No se pudo generar la sugerencia.');
        return;
      }

      const texto = json.data?.texto?.trim() ?? '';
      if (!texto || json.data?.origen === 'fallback_vacio') {
        setAviso('La IA no pudo responder ahora. Intenta de nuevo o escribe manualmente.');
        return;
      }

      // Si el campo está vacío, aplica directo para agilizar; si ya tiene texto, pide confirmación.
      if (!valorActual.trim()) {
        onApply(texto);
      } else {
        setPropuesta(texto);
      }
    } catch {
      setAviso('Error de conexión con IA.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePedir}
          disabled={loading || sinContexto}
          title={
            sinContexto
              ? 'Escribe primero el nombre o una idea para que la IA tenga contexto'
              : 'Generar sugerencia IA solo para este campo'
          }
          className="h-7 px-2.5 text-xs gap-1.5 border-nem-verde/40 text-nem-verde hover:bg-nem-verde/10"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          <span>{loading ? 'Generando...' : 'Sugerir con IA'}</span>
        </Button>
      </div>

      {aviso && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1">
          {aviso}
        </p>
      )}

      {propuesta && (
        <div className="rounded-md border border-nem-verde/40 bg-emerald-50/60 p-2.5 text-xs space-y-2">
          <p className="text-slate-800 whitespace-pre-wrap">{propuesta}</p>
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPropuesta(null)}
              className="h-6 px-2 text-[11px]"
            >
              <X className="h-3 w-3 mr-1" />
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(propuesta);
                setPropuesta(null);
              }}
              className="h-6 px-2.5 text-[11px] bg-nem-verde hover:bg-nem-verde/90 text-white"
            >
              <Check className="h-3 w-3 mr-1" />
              Reemplazar texto
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
