/**
 * Client component: contenedor con dos pestañas para la sección "Entrevistas"
 * del perfil del alumno (SPEC_TEC_11 §6, ADR-20260820-04; DEC-20260821-01).
 *
 * - Contenedor con dos pestañas claramente separadas:
 *   `Entrevista del niño` (comportamiento existente — `EntrevistaInicialForm`
 *   intacto, sin cambios de comportamiento) y `Entrevista familiar` (formulario
 *   nuevo `EntrevistaFamiliarForm` con el cuestionario literal §4).
 * - Cada pestaña carga su propia entrevista por separado (`getEntrevista` para
 *   la infantil, `getEntrevistaFamiliar` para la familiar); los formularios
 *   NO comparten estado ni consultan tablas cruzadas (AC-FF6).
 * - El gate A1 / D11-07 (aviso aceptado) aplica a ambas pestañas; el caller
 *   pasa `avisoAceptado` y `EntrevistaInicialForm`/`EntrevistaFamiliarForm`
 *   lo refuerzan con banner + form deshabilitado y vía las server actions.
 * - Mobile-first 375×812 sin scroll horizontal; las pestañas usan Radix
 *   Tabs (sub-pestañas con scroll horizontal interno si es necesario).
 * - La separación es funcional (UI) y estructural (cada tabla es distinta,
 *   con RLS y políticas independientes — ver SPEC §3, §7).
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEntrevista } from '@/services/alumnos/entrevista-actions';
import { getEntrevistaFamiliar } from '@/services/alumnos/entrevista-familiar-actions';
import { EntrevistaInicialForm } from '@/components/alumnos/entrevista-inicial-form';
import { EntrevistaFamiliarForm } from '@/components/alumnos/entrevista-familiar-form';
import type {
  Directorio,
  EstadoEntrevista,
  RespuestasV2,
} from '@/types/entrevista';
import type {
  EstadoEntrevistaFamiliar,
  RespuestasFamiliarV1,
} from '@/types/entrevista-familiar';

interface Props {
  alumnoId: string;
  alumnoNombre: string;
  alumnoGrado: string;
  avisoAceptado: boolean;
  onSaved?: (msg: string) => void;
  onError?: (msg: string) => void;
}

/** Pestañas disponibles (orden de aparición). */
type TabKey = 'nino' | 'familiar';
const TABS: ReadonlyArray<{ id: TabKey; label: string; short: string }> = [
  { id: 'nino', label: 'Entrevista del niño', short: 'Entrevista del niño' },
  { id: 'familiar', label: 'Entrevista familiar', short: 'Entrevista familiar' },
];

/** Fila de entrevista inicial del niño proyectada al contrato del form. */
type EntrevistaInitialNino = {
  fecha_aplicacion: string;
  estado: EstadoEntrevista;
  respuestas: RespuestasV2;
  directorio: Directorio;
};

/** Fila de entrevista familiar proyectada al contrato del form. */
type EntrevistaInitialFamiliar = {
  fecha_aplicacion: string;
  estado: EstadoEntrevistaFamiliar;
  respuestas: RespuestasFamiliarV1;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      nino: EntrevistaInitialNino | null;
      familiar: EntrevistaInitialFamiliar | null;
    };

export function EntrevistaDialogContent({
  alumnoId,
  alumnoNombre,
  alumnoGrado,
  avisoAceptado,
  onSaved,
  onError,
}: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('nino');

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    void (async () => {
      try {
        // Cargas independientes — cada server action valida RLS + ownership
        // server-side; el fallo de una no impide ver la otra pestaña.
        const [nino, familiar] = await Promise.all([
          getEntrevista(alumnoId),
          getEntrevistaFamiliar(alumnoId),
        ]);
        if (!active) return;
        if (!nino.ok) {
          setState({
            status: 'error',
            message: nino.error ?? 'No se pudo cargar la entrevista del niño',
          });
          return;
        }
        if (!familiar.ok) {
          setState({
            status: 'error',
            message: familiar.error ?? 'No se pudo cargar la entrevista familiar',
          });
          return;
        }
        const ninoData = nino.data;
        const familiarData = familiar.data;
        setState({
          status: 'ready',
          nino: ninoData
            ? {
                fecha_aplicacion: ninoData.fecha_aplicacion,
                estado: ninoData.estado as EstadoEntrevista,
                respuestas: ninoData.respuestas as RespuestasV2,
                directorio: ninoData.directorio as Directorio,
              }
            : null,
          familiar: familiarData
            ? {
                fecha_aplicacion: familiarData.fecha_aplicacion,
                estado: familiarData.estado as EstadoEntrevistaFamiliar,
                respuestas: familiarData.respuestas as RespuestasFamiliarV1,
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
        Cargando entrevistas…
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
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as TabKey)}
      className="flex flex-col gap-3"
      data-testid="entrevista-dialog-tabs"
    >
      {/* Lista de pestañas — wcag; scroll horizontal en móvil si la suma
          excede el ancho del modal. */}
      <div className="overflow-x-auto">
        <TabsList
          className="inline-flex w-auto min-w-full sm:min-w-0"
          aria-label="Entrevistas del alumno"
          data-testid="entrevista-dialog-tabs-list"
        >
          {TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="whitespace-nowrap"
              data-testid={`entrevista-dialog-tab-${t.id}`}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Pestaña 1 — Entrevista del niño (intacta, comportamiento v2). */}
      <TabsContent
        value="nino"
        forceMount
        hidden={activeTab !== 'nino'}
        data-testid="entrevista-dialog-content-nino"
      >
        {activeTab === 'nino' && (
          <EntrevistaInicialForm
            alumno={{ id: alumnoId, nombre: alumnoNombre, grado: alumnoGrado }}
            initial={state.nino}
            avisoAceptado={avisoAceptado}
            onSaved={onSaved}
            onError={onError}
          />
        )}
      </TabsContent>

      {/* Pestaña 2 — Entrevista familiar (nueva, cuestionario literal §4). */}
      <TabsContent
        value="familiar"
        forceMount
        hidden={activeTab !== 'familiar'}
        data-testid="entrevista-dialog-content-familiar"
      >
        {activeTab === 'familiar' && (
          <EntrevistaFamiliarForm
            alumno={{ id: alumnoId, nombre: alumnoNombre, grado: alumnoGrado }}
            initial={state.familiar}
            avisoAceptado={avisoAceptado}
            onSaved={onSaved}
            onError={onError}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
