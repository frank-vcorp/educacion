/**
 * Client component: contenido del Dialog "Entrevista inicial" para un alumno.
 * SPEC_TEC_09 §7: la UI se renderiza dentro del modal de la fila del alumno (v2).
 *
 * - Carga la entrevista existente (si la hay) al montar el modal, invocando la
 *   server action `getEntrevista` desde el cliente (patrón válido: las acciones
 *   de un módulo `'use server'` son invocables desde Client Components). La
 *   acción valida RLS + ownership server-side; si el alumno no es accesible se
 *   muestra un estado de error controlado con reintento.
 * - Estados de lectura: loading / error / ready. El gate A1 (aviso aceptado)
 *   lo aplica `EntrevistaInicialForm` (banner + form deshabilitado) y lo
 *   refuerzan server-side `upsertEntrevista`/`archivarEntrevista`.
 * - Renderiza el client form `EntrevistaInicialForm` con el contrato v2
 *   (3 bloques + directorio).
 *
 * INVARIANTE: este componente vive dentro del árbol cliente de
 * `AlumnosManager` (`'use client'`). NO puede ser `async` ni usar `use()`:
 * un Client Component async lanza React error #482 en producción. La lectura
 * de datos se hace por efecto con la server action, nunca con await en render.
 */
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEntrevista } from '@/services/alumnos/entrevista-actions';
import { EntrevistaInicialForm } from '@/components/alumnos/entrevista-inicial-form';
import type {
  Directorio,
  EstadoEntrevista,
  RespuestasV2,
} from '@/types/entrevista';

interface Props {
  alumnoId: string;
  alumnoNombre: string;
  alumnoGrado: string;
  avisoAceptado: boolean;
  onSaved?: (msg: string) => void;
  onError?: (msg: string) => void;
}

/** Fila de entrevista existente proyectada al contrato `initial` del form. */
type EntrevistaInitial = {
  fecha_aplicacion: string;
  estado: EstadoEntrevista;
  respuestas: RespuestasV2;
  directorio: Directorio;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; initial: EntrevistaInitial | null };

export function EntrevistaDialogContent({
  alumnoId,
  alumnoNombre,
  alumnoGrado,
  avisoAceptado,
  onSaved,
  onError,
}: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Permite reintentar la lectura sin desmontar el modal.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const res = await getEntrevista(alumnoId);
        if (!active) return;
        if (!res.ok) {
          setState({
            status: 'error',
            message: res.error ?? 'No se pudo cargar la entrevista',
          });
          return;
        }
        const row = res.data;
        setState({
          status: 'ready',
          initial: row
            ? {
                fecha_aplicacion: row.fecha_aplicacion,
                estado: row.estado as EstadoEntrevista,
                respuestas: row.respuestas as RespuestasV2,
                directorio: row.directorio as Directorio,
              }
            : null,
        });
      } catch {
        if (!active) return;
        setState({
          status: 'error',
          message: 'No se pudo cargar la entrevista',
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [alumnoId, attempt]);

  if (state.status === 'loading') {
    return (
      <div
        className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"
        role="status"
        data-testid="entrevista-dialog-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando entrevista…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3 p-4" role="alert" data-testid="entrevista-dialog-error">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAttempt((n) => n + 1)}
          data-testid="entrevista-dialog-reintentar"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <EntrevistaInicialForm
      alumno={{ id: alumnoId, nombre: alumnoNombre, grado: alumnoGrado }}
      initial={state.initial}
      avisoAceptado={avisoAceptado}
      onSaved={onSaved}
      onError={onError}
    />
  );
}
