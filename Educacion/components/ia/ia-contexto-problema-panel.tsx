'use client';

/**
 * IAContextoProblemaPanel — F0 — SPEC_TEC_10 §4.4 — IMPL-20260820-06.
 *
 * Panel cliente para el paso inicial del wizard de planeación. Llama a
 * `POST /api/planeaciones/ia/contexto-problema` y renderiza 3 bloques
 * (problema / propósito / ajustes) con área editable y botón
 * "Usar esta propuesta" independiente. Cada propuesta se aplica
 * explícitamente con clic; NUNCA autocompleta (P-PD9).
 *
 * Reglas:
 *  - Botón "Pedir sugerencia" deshabilitado si `problemaContexto` está vacío.
 *  - Anti-doble-submit: ref + `disabled` durante `loading`.
 *  - Snapshot `generadoCon = { modalidad, problemaContexto }` al recibir
 *    respuesta → si difiere del state actual y aún hay bloques pendientes,
 *    aparece badge "Posiblemente desactualizada" + botón "Regenerar". No
 *    se borran propuestas pendientes ni se revierten los aceptados.
 *  - Cambios sólo en `proposito` / `ajustes_razonables` NO invalidan.
 *  - `fallback_vacio` → mensaje + bloques editables (no bloquea el flujo).
 *  - D-FIN-13: la UI sólo hace `fetch` al route server-side.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Sparkles, Check, RotateCw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export type F0Origen = 'ia' | 'fallback_vacio';

export interface F0Data {
  problema_estructurado: string;
  proposito: string;
  ajustes_razonables: string;
  origen: F0Origen;
}

export interface IAContextoProblemaPanelProps {
  /** Modalidad vigente del FormState (snapshot del wizard). */
  modalidad: string;
  /** Borrador actual del problema (texto que la docente ha escrito). */
  problemaContexto: string;
  /** Borrador actual del propósito (puede ir vacío). */
  proposito: string;
  /** Borrador actual de ajustes razonables (puede ir vacío). */
  ajustesRazonables: string;
  /** Nivel educativo del grupo (`preescolar` | `primaria` | `secundaria` | null). */
  nivel: string | null;
  onApplyProblema: (texto: string) => void;
  onApplyProposito: (texto: string) => void;
  onApplyAjustes: (texto: string) => void;
}

type Estado =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: F0Data }
  | { kind: 'fallback_vacio' }
  | { kind: 'error'; code: string; message: string; retryAfterSec?: number };

interface Snapshot {
  modalidad: string;
  problemaContexto: string;
}

type Campo = 'problema' | 'proposito' | 'ajustes';

function mensajeError(
  code: string,
  fallback?: string,
): { message: string; retryAfterSec?: number } {
  switch (code) {
    case 'NEM_RATE_LIMIT_EXCEEDED':
      return {
        message:
          'Demasiadas solicitudes. Espera un momento antes de pedir otra sugerencia.',
        retryAfterSec: 60,
      };
    case 'NEM_IA_ANONYMIZER_BLOCKED':
      return {
        message:
          'El texto tiene mayúsculas sostenidas que podrían parecer nombres. Reformula en minúsculas o edita manualmente.',
      };
    case 'NEM_PLANEACIONES_VALIDATION_ERROR':
      return { message: 'Revisa los campos.' };
    case 'NEM_AUTH_UNAUTHORIZED':
      return { message: 'Sesión expirada. Recarga la página.' };
    default:
      return { message: fallback ?? 'Error inesperado.' };
  }
}

export function IAContextoProblemaPanel(props: IAContextoProblemaPanelProps) {
  const [estado, setEstado] = useState<Estado>({ kind: 'idle' });
  const [problemaEdit, setProblemaEdit] = useState('');
  const [propositoEdit, setPropositoEdit] = useState('');
  const [ajustesEdit, setAjustesEdit] = useState('');
  const [aceptados, setAceptados] = useState<Set<Campo>>(new Set());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const inFlightRef = useRef(false);

  const isLoading = estado.kind === 'loading';
  const problemaVacio = props.problemaContexto.trim().length === 0;
  const botonDeshabilitado = problemaVacio || isLoading;

  const desactualizado = useMemo(() => {
    if (!snapshot) return false;
    if (aceptados.size === 3) return false;
    return (
      snapshot.modalidad !== props.modalidad ||
      snapshot.problemaContexto !== props.problemaContexto
    );
  }, [snapshot, aceptados, props.modalidad, props.problemaContexto]);

  const fetchSugerencia = useCallback(async () => {
    if (inFlightRef.current) return;
    if (problemaVacio) return;
    inFlightRef.current = true;
    setEstado({ kind: 'loading' });
    try {
      const body = {
        modalidad: props.modalidad,
        problema_contexto: props.problemaContexto,
        proposito: props.proposito,
        ajustes_razonables: props.ajustesRazonables,
        nivel: props.nivel,
      };
      const res = await fetch('/api/planeaciones/ia/contexto-problema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const ra = Number(res.headers.get('Retry-After') ?? '60');
        setEstado({
          kind: 'error',
          code: 'NEM_RATE_LIMIT_EXCEEDED',
          message: '',
          retryAfterSec: ra,
        });
        return;
      }

      const json = (await res.json().catch(() => ({}))) as {
        data?: F0Data;
        error?: { code?: string; message?: string };
      };

      if (!res.ok) {
        const code = json.error?.code ?? 'NEM_INTERNAL_ERROR';
        const m = mensajeError(code, json.error?.message);
        setEstado({ kind: 'error', code, message: m.message, retryAfterSec: m.retryAfterSec });
        return;
      }

      const data = json.data;
      if (!data) {
        setEstado({ kind: 'fallback_vacio' });
        setProblemaEdit('');
        setPropositoEdit('');
        setAjustesEdit('');
        return;
      }

      if (data.origen === 'fallback_vacio') {
        setProblemaEdit('');
        setPropositoEdit('');
        setAjustesEdit('');
        setSnapshot(null);
        setEstado({ kind: 'fallback_vacio' });
        return;
      }

      setProblemaEdit(data.problema_estructurado);
      setPropositoEdit(data.proposito);
      setAjustesEdit(data.ajustes_razonables);
      setSnapshot({
        modalidad: props.modalidad,
        problemaContexto: props.problemaContexto,
      });
      // Nueva respuesta: limpia aceptados (regeneración).
      setAceptados(new Set());
      setEstado({ kind: 'success', data });
    } catch (err) {
      setEstado({
        kind: 'error',
        code: 'NEM_INTERNAL_ERROR',
        message: (err as Error).message || 'Error inesperado.',
      });
    } finally {
      inFlightRef.current = false;
    }
  }, [
    props.modalidad,
    props.problemaContexto,
    props.proposito,
    props.ajustesRazonables,
    props.nivel,
    problemaVacio,
  ]);

  const onAplicar = useCallback(
    (campo: Campo, texto: string) => {
      if (texto.trim().length === 0) return;
      if (campo === 'problema') props.onApplyProblema(texto);
      if (campo === 'proposito') props.onApplyProposito(texto);
      if (campo === 'ajustes') props.onApplyAjustes(texto);
      setAceptados((prev) => {
        const next = new Set(prev);
        next.add(campo);
        return next;
      });
    },
    [props],
  );

  const onReset = useCallback(() => {
    setEstado({ kind: 'idle' });
    setProblemaEdit('');
    setPropositoEdit('');
    setAjustesEdit('');
    setAceptados(new Set());
    setSnapshot(null);
  }, []);

  return (
    <div
      data-testid="ia-panel-f0"
      className="space-y-3 rounded-md border border-dashed border-nem-verde/40 bg-nem-verde/5 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-nem-verde" aria-hidden="true" />
          <Label className="text-sm font-medium">Sugerencias IA para tu contexto</Label>
        </div>
        {(estado.kind === 'success' || estado.kind === 'fallback_vacio') && (
          <Badge
            variant="outline"
            data-testid="ia-panel-f0-origen"
            className="text-[10px] uppercase"
          >
            origen:{' '}
            {estado.kind === 'success' ? estado.data.origen : 'fallback_vacio'}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={fetchSugerencia}
          disabled={botonDeshabilitado}
          data-testid="ia-panel-f0-solicitar"
          aria-label="Pedir sugerencia"
          aria-disabled={botonDeshabilitado}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Pidiendo…
            </>
          ) : (
            <>
              <Sparkles className="mr-1 h-4 w-4" />
              Pedir sugerencia
            </>
          )}
        </Button>
        {desactualizado && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fetchSugerencia}
            disabled={isLoading}
            data-testid="ia-panel-f0-regenerar"
            aria-label="Regenerar sugerencia"
          >
            <RotateCw className="mr-1 h-4 w-4" />
            Regenerar
          </Button>
        )}
        {(estado.kind === 'success' || estado.kind === 'fallback_vacio') && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onReset}
            disabled={isLoading}
            data-testid="ia-panel-f0-reset"
            aria-label="Reiniciar"
          >
            Reiniciar
          </Button>
        )}
      </div>

      {problemaVacio && (
        <p
          data-testid="ia-panel-f0-requiere-problema"
          className="text-xs text-muted-foreground"
        >
          Escribe primero el problema del contexto para poder pedir sugerencias.
        </p>
      )}

      {desactualizado && (
        <div
          role="status"
          data-testid="ia-panel-f0-desactualizada"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Posiblemente desactualizada: cambió la modalidad o el problema. Regenera si
            quieres propuestas alineadas al nuevo contexto. Los campos ya aceptados no
            se borran.
          </span>
        </div>
      )}

      {estado.kind === 'error' && (
        <div
          role="alert"
          data-testid="ia-panel-f0-error"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>{estado.message}</p>
          {estado.retryAfterSec !== undefined && (
            <p className="mt-1 text-xs">Retry-After: {estado.retryAfterSec}s</p>
          )}
        </div>
      )}

      {estado.kind === 'fallback_vacio' && (
        <div
          role="status"
          data-testid="ia-panel-f0-fallback"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          La IA no pudo generar una sugerencia ahora. Puedes escribir o editar
          manualmente.
        </div>
      )}

      {(estado.kind === 'success' || estado.kind === 'fallback_vacio') && (
        <div className="space-y-3">
          <Bloque
            campo="problema"
            label="Problema estructurado"
            value={problemaEdit}
            onChange={setProblemaEdit}
            disabled={isLoading}
            aceptado={aceptados.has('problema')}
            desactualizado={desactualizado}
            onAplicar={() => onAplicar('problema', problemaEdit)}
          />
          <Bloque
            campo="proposito"
            label="Propósito"
            value={propositoEdit}
            onChange={setPropositoEdit}
            disabled={isLoading}
            aceptado={aceptados.has('proposito')}
            desactualizado={desactualizado}
            onAplicar={() => onAplicar('proposito', propositoEdit)}
          />
          <Bloque
            campo="ajustes"
            label="Ajustes razonables"
            value={ajustesEdit}
            onChange={setAjustesEdit}
            disabled={isLoading}
            aceptado={aceptados.has('ajustes')}
            desactualizado={desactualizado}
            onAplicar={() => onAplicar('ajustes', ajustesEdit)}
          />
        </div>
      )}
    </div>
  );
}

function Bloque(props: {
  campo: Campo;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  aceptado: boolean;
  desactualizado: boolean;
  onAplicar: () => void;
}) {
  const vacio = props.value.trim().length === 0;
  return (
    <div
      data-testid={`ia-panel-f0-bloque-${props.campo}`}
      className="space-y-1 rounded-md border bg-card p-2"
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`ia-f0-${props.campo}`} className="text-xs">
          {props.label}
        </Label>
        {props.aceptado && (
          <span
            data-testid={`ia-panel-f0-aceptado-${props.campo}`}
            className="text-[10px] uppercase text-nem-verde"
          >
            aceptado
          </span>
        )}
      </div>
      <Textarea
        id={`ia-f0-${props.campo}`}
        data-testid={`ia-panel-f0-text-${props.campo}`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={
          vacio
            ? 'La IA no devolvió propuesta para este campo. Puedes escribir manualmente.'
            : 'Sugerencia editable. Puedes ajustarla antes de aceptar.'
        }
        rows={3}
        disabled={props.disabled}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant={props.aceptado ? 'outline' : 'default'}
          onClick={props.onAplicar}
          disabled={props.disabled || vacio}
          data-testid={`ia-panel-f0-usar-${props.campo}`}
          aria-label={`Usar esta propuesta (${props.label})`}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Usar esta propuesta
        </Button>
      </div>
    </div>
  );
}
