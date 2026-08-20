/**
 * Calendario semanal L M M J V para Unidad Didáctica.
 * SPEC_MODALIDADES_2026-08-17.
 *
 * Grid 5 días (Lunes a Viernes). Cada día puede tener un título de sesión.
 * Usa @dnd-kit para drag & drop entre celdas vacías (UX mejor), pero también
 * permite asignar manualmente con un select (fallback accesible sin DnD).
 *
 * Estructura de salida:
 *  sesiones: { lunes?: string, martes?: string, miercoles?: string, jueves?: string, viernes?: string }
 *
 * Máximo: 5 sesiones (1 por día). El valor se persiste como objeto JSON-like
 * dentro del state del wizard padre (ver wizard-planeacion.tsx).
 */
'use client';

import { useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CalendarDays, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const DIAS_SEMANA = [
  { key: 'lunes', label: 'L', nombre: 'Lunes' },
  { key: 'martes', label: 'M', nombre: 'Martes' },
  { key: 'miercoles', label: 'M', nombre: 'Miércoles' },
  { key: 'jueves', label: 'J', nombre: 'Jueves' },
  { key: 'viernes', label: 'V', nombre: 'Viernes' },
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number]['key'];
export type SesionesSemana = Partial<Record<DiaSemana, string>>;

interface Props {
  value: SesionesSemana;
  onChange: (sesiones: SesionesSemana) => void;
}

function DraggableSesion({
  dia,
  titulo,
  onLimpiar,
}: {
  dia: DiaSemana;
  titulo: string;
  onLimpiar: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${dia}-sesion`,
    data: { dia },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-1 rounded-md border border-nem-verde/40 bg-nem-verde/10 px-2 py-1.5 text-xs ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label={`Mover sesión de ${dia}`}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="flex-1 truncate font-medium text-nem-verde" title={titulo}>
        {titulo}
      </span>
      <button
        type="button"
        onClick={onLimpiar}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Quitar sesión de ${dia}`}
      >
        ×
      </button>
    </div>
  );
}

function DroppableCelda({
  dia,
  nombre,
  sesion,
  onLimpiar,
  onSolicitarAsignar,
}: {
  dia: DiaSemana;
  nombre: string;
  sesion?: string;
  onLimpiar: () => void;
  onSolicitarAsignar: (dia: DiaSemana, nombre: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${dia}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[88px] flex-col gap-2 rounded-lg border p-2 transition-colors ${
        isOver
          ? 'border-nem-verde bg-nem-verde/10'
          : sesion
          ? 'border-nem-verde/30 bg-nem-verde/5'
          : 'border-dashed bg-muted/30'
      }`}
    >
      <p className="text-center text-xs font-semibold text-muted-foreground">{nombre}</p>
      {sesion ? (
        <DraggableSesion dia={dia} titulo={sesion} onLimpiar={onLimpiar} />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-muted-foreground hover:bg-nem-verde/10"
          onClick={() => onSolicitarAsignar(dia, nombre)}
        >
          + Asignar sesión
        </Button>
      )}
    </div>
  );
}

export function WizardCalendarioSemanal({ value, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [error, setError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<
    | { open: false }
    | { open: true; dia: DiaSemana; nombre: string; titulo: string }
  >({ open: false });

  function asignar(dia: DiaSemana, titulo: string) {
    const total = Object.keys(value).length;
    if (!value[dia] && total >= 5) {
      setError('Máximo 5 sesiones (1 por día)');
      return;
    }
    setError(null);
    onChange({ ...value, [dia]: titulo });
  }

  function solicitarAsignar(dia: DiaSemana, nombre: string) {
    setError(null);
    setDialogState({ open: true, dia, nombre, titulo: '' });
  }

  function confirmarAsignar() {
    if (!dialogState.open) return;
    const titulo = dialogState.titulo.trim();
    if (!titulo) return;
    asignar(dialogState.dia, titulo);
    setDialogState({ open: false });
  }

  function cancelarDialog() {
    setDialogState({ open: false });
  }

  function limpiar(dia: DiaSemana) {
    setError(null);
    const { [dia]: _removed, ...rest } = value;
    void _removed;
    onChange(rest);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const origen = active.data.current?.dia as DiaSemana | undefined;
    const dropDia = String(over.id).replace('drop-', '') as DiaSemana;
    if (!origen || origen === dropDia) return;
    const titulo = value[origen];
    if (!titulo) return;
    const total = Object.keys(value).length;
    if (!value[dropDia] && total >= 5) {
      setError('Máximo 5 sesiones (1 por día)');
      return;
    }
    const newSesiones: SesionesSemana = { ...value, [dropDia]: titulo };
    delete newSesiones[origen];
    setError(null);
    onChange(newSesiones);
  }

  const totalAsignados = Object.keys(value).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-nem-verde" />
            Calendario semanal
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Asigna una sesión a cada día L M M J V. Arrastra para reordenar.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalAsignados}/5 días
        </span>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-2">
          {DIAS_SEMANA.map(({ key, nombre }) => (
            <DroppableCelda
              key={key}
              dia={key}
              nombre={nombre}
              sesion={value[key]}
              onLimpiar={() => limpiar(key)}
              onSolicitarAsignar={solicitarAsignar}
            />
          ))}
        </div>
      </DndContext>

      <Dialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) setDialogState({ open: false });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar sesión del {dialogState.open ? dialogState.nombre : ''}</DialogTitle>
            <DialogDescription>
              Escribe el título de la sesión. Ej. "Lectura compartida: el ciclo del agua".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="titulo-sesion" className="sr-only">
              Título de la sesión
            </Label>
            <Input
              id="titulo-sesion"
              autoFocus
              value={dialogState.open ? dialogState.titulo : ''}
              onChange={(e) =>
                setDialogState((s) =>
                  s.open ? { ...s, titulo: e.target.value } : s,
                )
              }
              placeholder="Título de la sesión"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && dialogState.open) {
                  e.preventDefault();
                  confirmarAsignar();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelarDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmarAsignar} disabled={!dialogState.open || dialogState.titulo.trim().length === 0}>
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <details className="rounded-md border bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-muted-foreground">
          Entrada manual (alternativa al drag & drop)
        </summary>
        <div className="mt-3 space-y-2">
          {DIAS_SEMANA.map(({ key, nombre }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-20 text-muted-foreground">{nombre}</span>
              <Input
                value={value[key] ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.trim() === '') {
                    limpiar(key);
                  } else {
                    asignar(key, v);
                  }
                }}
                placeholder={`Sesión ${nombre}`}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}