'use client';

/**
 * `IASugerenciaPanel` — panel reutilizable para que la docente active F1, F2
 * o F3 desde la UI (SPEC_TEC_08 §4.2 + IMPL-20260820-01).
 *
 * Responsabilidades:
 *  - Botón "Pedir sugerencia" (F1/F2/F3) → `POST /api/planeaciones/[id]/ia/…`
 *  - Render de la sugerencia en un área **editable** (no autocompleta el
 *    bloque/planeación — P-PD9).
 *  - Máquina de estados `idle → loading → {success|fallback_vacio|error}
 *    → {accepted|rejected}` con `origen` visible como badge.
 *  - Anti-doble-submit: el botón se deshabilita durante `loading` (AC-UI-2).
 *  - Manejo de errores: 422 estructura, 429 rate-limit (Retry-After),
 *    500 anonymizer blocked, 401/403 sesión, fallos de PATCH.
 *  - Tras aceptar, invoca `updateBloque` (F1/F2) o `updatePlaneacion` (F3)
 *    y refresca la vista (router.refresh).
 *  - F3 → botón "Descargar PDF" tras aceptar → GET al route existente.
 *
 * D-FIN-13 preservado: la UI NO llama al proveedor; sólo `fetch` al route
 * server-side. `AI_API_KEY` nunca cruza al bundle.
 */
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Check, X, FileDown, RotateCw } from 'lucide-react';
import { updateBloque, updatePlaneacion } from '@/services/planeaciones/update-actions';

// ─── Tipos ────────────────────────────────────────────────────────────
export type Feature = 'F1' | 'F2' | 'F3';
export type SugerenciaOrigen = 'ia' | 'cache' | 'fallback_vacio';

export interface IASugerenciaPanelProps {
  planeacionId: string;
  docenteId: string;
  cct: string;
  feature: Feature;
  /** F1/F2: id del bloque sobre el que aplica. F3: omitido. */
  bloqueId?: string;
  /** F1/F2: contenido textual actual del bloque (para contextualizar). */
  textoBase?: string;
  /** F3: campos a pulir; default los 4 campos del enum. */
  camposPulir?: string[];
  /** Etiqueta humana del botón (Tía Lola). Default derivado de `feature`. */
  label?: string;
  /** Variante para F1: urbana | rural (default rural). */
  varianteTipo?: 'urbana' | 'rural';
  /** Acción F2: expandir | simplificar. Default: expandir. */
  f2Accion?: 'expandir' | 'simplificar';
  /** F2 simplificar requiere edad destino. */
  f2EdadDestino?: '3-4' | '4-5' | '5-6';
  /** Tras aceptar F3, callback opcional que abre la descarga PDF. */
  onF3Accepted?: (planeacionId: string) => void;
}

type Estado =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: unknown; origen: SugerenciaOrigen }
  | { kind: 'fallback_vacio' }
  | { kind: 'error'; code: string; message: string; retryAfterSec?: number }
  | { kind: 'accepted' }
  | { kind: 'rejected' };

// ─── Helpers ──────────────────────────────────────────────────────────
function endpointFor(feature: Feature): string {
  if (feature === 'F1') return 'variantes-bloque';
  if (feature === 'F2') return 'help-redaccion';
  return 'pulir-pdf';
}

function defaultLabel(feature: Feature): string {
  if (feature === 'F1') return 'Variante de bloque (F1)';
  if (feature === 'F2') return 'Ayuda a redactar (F2)';
  return 'Pulir campos del PDF (F3)';
}

function messageForError(
  code: string,
  fallbackMessage?: string,
): { message: string; retryAfterSec?: number } {
  switch (code) {
    case 'NEM_IA_VARIANTE_VIOLA_ESTRUCTURA':
    case 'NEM_IA_PDA_NO_EN_CATALOGO':
      return {
        message:
          'La sugerencia viola la estructura NEM. Intenta con otro texto o edita manualmente.',
      };
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
    case 'NEM_AUTH_RLS_VIOLATION':
      return { message: 'Sesión expirada o sin permisos. Recarga la página.' };
    case 'NEM_PLANEACIONES_NOT_FOUND':
      return { message: 'No se encontró la planeación o el bloque.' };
    case 'NEM_PLANEACIONES_ARCHIVED':
      return { message: 'La planeación está archivada.' };
    default:
      return { message: fallbackMessage ?? 'Error inesperado.' };
  }
}

const F3_CAMPOS_DEFAULT = [
  'problema_contexto',
  'proposito',
  'producto_integrador',
  'ajustes_razonables',
] as const;

// ─── Componente ───────────────────────────────────────────────────────
export function IASugerenciaPanel(props: IASugerenciaPanelProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ kind: 'idle' });
  const [sugerenciaTexto, setSugerenciaTexto] = useState('');
  const [f3Campos, setF3Campos] = useState<Record<string, string>>({});
  const [errorPatch, setErrorPatch] = useState<string | null>(null);
  // Ref anti-doble-submit defensivo (complemento al `disabled` visual).
  const inFlightRef = useRef(false);

  const fetchSugerencia = useCallback(async () => {
    if (inFlightRef.current) return; // anti-doble-submit (defensa en profundidad)
    inFlightRef.current = true;
    setEstado({ kind: 'loading' });
    setErrorPatch(null);
    try {
      const endpoint = endpointFor(props.feature);
      let body: Record<string, unknown>;
      if (props.feature === 'F1') {
        if (!props.bloqueId) {
          setEstado({
            kind: 'error',
            code: 'CLIENT_MISSING_BLOQUE',
            message: 'F1 requiere un bloque seleccionado.',
          });
          return;
        }
        body = {
          bloque_id: props.bloqueId,
          variante_tipo: props.varianteTipo ?? 'rural',
        };
      } else if (props.feature === 'F2') {
        body = {
          texto_base: props.textoBase ?? '',
          accion: props.f2Accion ?? 'expandir',
          ...(props.f2Accion === 'simplificar'
            ? { edad_destino: props.f2EdadDestino ?? '4-5' }
            : {}),
          ...(props.bloqueId ? { bloque_id: props.bloqueId } : {}),
        };
      } else {
        body = { campos_a_pulir: props.camposPulir ?? F3_CAMPOS_DEFAULT };
      }

      const res = await fetch(
        `/api/planeaciones/${props.planeacionId}/ia/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

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
        data?: { variante_texto?: string; texto_propuesto?: string; campos_pulidos?: Array<{ campo: string; texto_pulido: string }>; origen?: SugerenciaOrigen };
        error?: { code?: string; message?: string };
      };

      if (!res.ok) {
        const code = json.error?.code ?? 'NEM_INTERNAL_ERROR';
        const m = messageForError(code, json.error?.message);
        setEstado({
          kind: 'error',
          code,
          message: m.message,
          retryAfterSec: m.retryAfterSec,
        });
        return;
      }

      const data = json.data ?? {};
      const origen: SugerenciaOrigen = data.origen ?? 'ia';

      if (origen === 'fallback_vacio') {
        setSugerenciaTexto(
          props.feature === 'F1'
            ? (data.variante_texto ?? '')
            : (data.texto_propuesto ?? ''),
        );
        setEstado({ kind: 'fallback_vacio' });
        return;
      }

      // éxito
      if (props.feature === 'F3') {
        const map: Record<string, string> = {};
        for (const c of data.campos_pulidos ?? []) {
          map[c.campo] = c.texto_pulido;
        }
        setF3Campos(map);
        setSugerenciaTexto('');
      } else {
        setSugerenciaTexto(
          props.feature === 'F1'
            ? (data.variante_texto ?? '')
            : (data.texto_propuesto ?? ''),
        );
        setF3Campos({});
      }
      setEstado({ kind: 'success', data, origen });
    } catch (err) {
      setEstado({
        kind: 'error',
        code: 'NEM_INTERNAL_ERROR',
        message: (err as Error).message || 'Error inesperado.',
      });
    } finally {
      inFlightRef.current = false;
    }
  }, [props]);

  const onAceptar = useCallback(async () => {
    if (estado.kind !== 'success' && estado.kind !== 'fallback_vacio') return;
    setEstado({ kind: 'loading' });
    setErrorPatch(null);
    try {
      if (props.feature === 'F3') {
        const cambios: Record<string, string> = {};
        for (const [k, v] of Object.entries(f3Campos)) {
          if (typeof v === 'string' && v.trim().length > 0) cambios[k] = v;
        }
        const r = await updatePlaneacion({
          planeacionId: props.planeacionId,
          docenteId: props.docenteId,
          cambios: cambios as {
            problema_contexto?: string;
            proposito?: string;
            producto_integrador?: string;
            ajustes_razonables?: string;
          },
        });
        if (!r.ok) {
          setErrorPatch(r.error ?? 'No se pudo guardar.');
          setEstado({
            kind: 'error',
            code: 'NEM_INTERNAL_ERROR',
            message: r.error ?? 'No se pudo guardar.',
          });
          return;
        }
        setEstado({ kind: 'accepted' });
        router.refresh();
      } else {
        if (!props.bloqueId) {
          setEstado({
            kind: 'error',
            code: 'CLIENT_MISSING_BLOQUE',
            message: 'No se puede aceptar sin bloque seleccionado.',
          });
          return;
        }
        const texto = sugerenciaTexto.trim();
        if (texto.length === 0) {
          setErrorPatch('La sugerencia está vacía.');
          setEstado({
            kind: 'error',
            code: 'NEM_VALIDATION',
            message: 'La sugerencia está vacía.',
          });
          return;
        }
        const r = await updateBloque({
          bloqueId: props.bloqueId,
          docenteId: props.docenteId,
          contenidoTextual: texto,
          // Si la docente editó la sugerencia antes de aceptar → origen
          // distinto (P-PD9 + SPEC §6.1 tabla F1).
          origen:
            texto === (props.textoBase ?? '')
              ? 'ia_sugerencia'
              : 'maestra_editado_de_ia',
        });
        if (!r.ok) {
          setErrorPatch(r.error ?? 'No se pudo guardar.');
          setEstado({
            kind: 'error',
            code: r.errorCode ?? 'NEM_INTERNAL_ERROR',
            message: r.error ?? 'No se pudo guardar.',
          });
          return;
        }
        setEstado({ kind: 'accepted' });
        router.refresh();
      }
    } catch (err) {
      setErrorPatch((err as Error).message);
      setEstado({
        kind: 'error',
        code: 'NEM_INTERNAL_ERROR',
        message: (err as Error).message ?? 'No se pudo guardar.',
      });
    }
  }, [
    estado,
    props,
    sugerenciaTexto,
    f3Campos,
    router,
  ]);

  const onRechazar = useCallback(() => {
    setEstado({ kind: 'rejected' });
    setSugerenciaTexto('');
    setF3Campos({});
  }, []);

  const onReset = useCallback(() => {
    setEstado({ kind: 'idle' });
    setSugerenciaTexto('');
    setF3Campos({});
    setErrorPatch(null);
  }, []);

  const isLoading = estado.kind === 'loading';
  const label = props.label ?? defaultLabel(props.feature);

  return (
    <div
      data-testid={`ia-panel-${props.feature}`}
      className="space-y-3 rounded-md border border-dashed border-nem-verde/40 bg-nem-verde/5 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-nem-verde" aria-hidden="true" />
          <Label className="text-sm font-medium">{label}</Label>
        </div>
        {estado.kind === 'success' && (
          <Badge variant="outline" className="text-[10px] uppercase">
            origen: {estado.origen}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={fetchSugerencia}
          disabled={isLoading}
          data-testid={`ia-panel-${props.feature}-solicitar`}
          aria-label={label}
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
        {(estado.kind === 'success' ||
          estado.kind === 'fallback_vacio') && (
          <>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={onAceptar}
              disabled={isLoading}
              data-testid={`ia-panel-${props.feature}-aceptar`}
              aria-label="Aceptar sugerencia"
            >
              <Check className="mr-1 h-4 w-4" />
              Aceptar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRechazar}
              disabled={isLoading}
              data-testid={`ia-panel-${props.feature}-rechazar`}
              aria-label="Rechazar sugerencia"
            >
              <X className="mr-1 h-4 w-4" />
              Rechazar
            </Button>
          </>
        )}
        {estado.kind === 'error' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fetchSugerencia}
            disabled={isLoading}
          >
            <RotateCw className="mr-1 h-4 w-4" />
            Reintentar
          </Button>
        )}
      </div>

      {estado.kind === 'error' && (
        <div
          role="alert"
          data-testid={`ia-panel-${props.feature}-error`}
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>{estado.message}</p>
          {estado.retryAfterSec !== undefined && (
            <p className="mt-1 text-xs">Retry-After: {estado.retryAfterSec}s</p>
          )}
          {errorPatch && (
            <p className="mt-1 text-xs">Detalle PATCH: {errorPatch}</p>
          )}
        </div>
      )}

      {estado.kind === 'fallback_vacio' && (
        <div
          role="status"
          data-testid={`ia-panel-${props.feature}-fallback`}
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          La IA no pudo generar una sugerencia ahora. Puedes escribir o
          editar manualmente.
        </div>
      )}

      {(estado.kind === 'success' || estado.kind === 'fallback_vacio') &&
        props.feature !== 'F3' && (
          <div className="space-y-1">
            <Label htmlFor={`ia-text-${props.feature}-${props.bloqueId ?? 'planeacion'}`} className="text-xs">
              Sugerencia (editable)
            </Label>
            <Textarea
              id={`ia-text-${props.feature}-${props.bloqueId ?? 'planeacion'}`}
              data-testid={`ia-panel-${props.feature}-texto`}
              value={sugerenciaTexto}
              onChange={(e) => setSugerenciaTexto(e.target.value)}
              placeholder="La sugerencia aparecerá aquí. Puedes editarla antes de aceptar."
              rows={4}
              disabled={isLoading}
            />
          </div>
        )}

      {(estado.kind === 'success' || estado.kind === 'fallback_vacio') &&
        props.feature === 'F3' && (
          <div className="space-y-2">
            {(props.camposPulir ?? F3_CAMPOS_DEFAULT).map((campo) => (
              <div key={campo} className="space-y-1">
                <Label htmlFor={`ia-f3-${campo}`} className="text-xs capitalize">
                  {campo.replace(/_/g, ' ')}
                </Label>
                <Textarea
                  id={`ia-f3-${campo}`}
                  data-testid={`ia-panel-F3-${campo}`}
                  value={f3Campos[campo] ?? ''}
                  onChange={(e) =>
                    setF3Campos((prev) => ({ ...prev, [campo]: e.target.value }))
                  }
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
        )}

      {estado.kind === 'accepted' && props.feature === 'F3' && (
        <Button
          asChild
          size="sm"
          variant="default"
          data-testid={`ia-panel-F3-descargar-pdf`}
        >
          <a
            href={`/api/planeaciones/${props.planeacionId}/generar-pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileDown className="mr-1 h-4 w-4" />
            Descargar PDF
          </a>
        </Button>
      )}

      {estado.kind === 'accepted' && (
        <p
          role="status"
          data-testid={`ia-panel-${props.feature}-accepted`}
          className="text-xs text-nem-verde"
        >
          Sugerencia guardada.
        </p>
      )}

      {(estado.kind === 'rejected' || estado.kind === 'accepted') && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onReset}
          data-testid={`ia-panel-${props.feature}-reset`}
        >
          Pedir otra sugerencia
        </Button>
      )}
    </div>
  );
}