/**
 * Tablero de rúbrica semáforo (T11 + D-FIN-2, D-FIN-3).
 * Drag & drop con @dnd-kit — alumnos a 4 niveles (verde/amarillo/naranja/rojo).
 */
'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { upsertEvaluacion } from '@/services/evaluacion/evaluacion-actions';

type Nivel = 1 | 2 | 3 | 4;

const NIVELES: Array<{
  nivel: Nivel;
  label: string;
  emoji: string;
  description: string;
  bg: string;
  border: string;
  variant: 'verde' | 'amarillo' | 'naranja' | 'rojo';
}> = [
  {
    nivel: 1,
    label: 'Logrado sin apoyo',
    emoji: '🟢',
    description: 'Verde',
    bg: 'bg-green-50',
    border: 'border-green-400',
    variant: 'verde',
  },
  {
    nivel: 2,
    label: 'Logrado con apoyo',
    emoji: '🟡',
    description: 'Amarillo',
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    variant: 'amarillo',
  },
  {
    nivel: 3,
    label: 'Requiere apoyo constante',
    emoji: '🟠',
    description: 'Naranja',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    variant: 'naranja',
  },
  {
    nivel: 4,
    label: 'No logrado',
    emoji: '🔴',
    description: 'Rojo',
    bg: 'bg-red-50',
    border: 'border-red-400',
    variant: 'rojo',
  },
];

interface AlumnoLite {
  id: string;
  nombre: string;
}

interface EvaluacionLite {
  id: string;
  alumno_id: string;
  nivel: number;
  pda_codigo: string | null;
  fecha: string;
}

interface Props {
  planeacionId: string;
  docenteId: string;
  cct: string;
  pdas: string[];
  alumnos: AlumnoLite[];
  evaluacionesIniciales: EvaluacionLite[];
}

export function RubricaSemaforoBoard({
  planeacionId,
  docenteId,
  cct,
  pdas,
  alumnos,
  evaluacionesIniciales,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pdaCodigo, setPdaCodigo] = useState<string>(pdas[0] ?? '');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionLite[]>(evaluacionesIniciales);
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  // Map alumno_id -> nivel actual (para este PDA + fecha)
  const nivelPorAlumno = new Map<string, number>();
  for (const e of evaluaciones) {
    if ((e.pda_codigo ?? '') === pdaCodigo && e.fecha === fecha) {
      nivelPorAlumno.set(e.alumno_id, e.nivel);
    }
  }

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  function asignarNivel(alumnoId: string, nivel: Nivel) {
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return;

    // Optimistic update en estado React
    setEvaluaciones((prev) => {
      const idx = prev.findIndex(
        (e) => e.alumno_id === alumnoId && (e.pda_codigo ?? '') === pdaCodigo && e.fecha === fecha,
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx]!, nivel };
        return copy;
      }
      return [
        ...prev,
        {
          id: `temp-${alumnoId}-${Date.now()}`,
          alumno_id: alumnoId,
          nivel,
          pda_codigo: pdaCodigo || null,
          fecha,
        },
      ];
    });

    startTransition(async () => {
      const res = await upsertEvaluacion({
        planeacionId,
        docenteId,
        cct,
        alumnoId,
        nivel,
        pdaCodigo: pdaCodigo || undefined,
        fecha,
      });
      if (res.ok) {
        setToast(`${alumno.nombre} → ${NIVELES.find((n) => n.nivel === nivel)?.emoji ?? ''} nivel ${nivel}`);
        setTimeout(() => setToast(null), 1500);
      } else {
        setToast(`Error: ${res.error}`);
      }
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const dropzoneId = e.over?.id ? String(e.over.id) : null;
    if (!dropzoneId || !dropzoneId.startsWith('nivel-')) return;
    const nivel = Number(dropzoneId.replace('nivel-', '')) as Nivel;
    asignarNivel(String(e.active.id), nivel);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">PDA evaluado</label>
          <select
            value={pdaCodigo}
            onChange={(e) => setPdaCodigo(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {pdas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            {pdas.length === 0 && (
              <option value="">Sin PDA definidos en la planeación</option>
            )}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-4">
          {NIVELES.map((n) => (
            <Dropzone
              key={n.nivel}
              nivel={n}
              alumnos={alumnos.filter((a) => nivelPorAlumno.get(a.id) === n.nivel)}
              onQuickAssign={asignarNivel}
            />
          ))}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Alumnos sin clasificar ({alumnos.filter((a) => !nivelPorAlumno.has(a.id)).length})
          </h3>
          <Card className="mt-2">
            <CardContent className="p-3">
              <ul className="flex flex-wrap gap-2">
                {alumnos
                  .filter((a) => !nivelPorAlumno.has(a.id))
                  .map((a) => (
                    <DraggableAlumno key={a.id} alumno={a} onQuickAssign={asignarNivel} />
                  ))}
                {alumnos.filter((a) => !nivelPorAlumno.has(a.id)).length === 0 && (
                  <li className="text-sm text-muted-foreground">Todos clasificados ✓</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <DragOverlay>
          {activeId ? (
            <Badge variant="outline" className="bg-background px-3 py-1.5 text-sm shadow-md">
              {alumnos.find((a) => a.id === activeId)?.nombre ?? '...'}
            </Badge>
          ) : null}
        </DragOverlay>
      </DndContext>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-nem-verde px-3 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Dropzone({
  nivel,
  alumnos,
  onQuickAssign,
}: {
  nivel: typeof NIVELES[number];
  alumnos: AlumnoLite[];
  onQuickAssign: (alumnoId: string, nivel: Nivel) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `nivel-${nivel.nivel}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[180px] rounded-lg border-2 ${nivel.border} ${nivel.bg} p-3 transition-colors ${
        isOver ? 'ring-2 ring-nem-verde' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-2xl">{nivel.emoji}</p>
          <p className="text-sm font-medium">{nivel.label}</p>
        </div>
        <Badge variant={nivel.variant}>{alumnos.length}</Badge>
      </div>
      <ul className="space-y-1.5">
        {alumnos.map((a) => (
          <DraggableAlumno
            key={a.id}
            alumno={a}
            currentNivel={nivel.nivel}
            compact
            onQuickAssign={onQuickAssign}
          />
        ))}
        {alumnos.length === 0 && (
          <li className="text-xs italic text-muted-foreground">Arrastra aquí o toca un color</li>
        )}
      </ul>
    </div>
  );
}

function DraggableAlumno({
  alumno,
  currentNivel,
  compact = false,
  onQuickAssign,
}: {
  alumno: AlumnoLite;
  currentNivel?: Nivel;
  compact?: boolean;
  onQuickAssign: (alumnoId: string, nivel: Nivel) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: alumno.id });
  return (
    <li
      ref={setNodeRef}
      className={`flex items-center justify-between gap-2 border border-border bg-white shadow-sm transition-opacity ${
        compact ? 'rounded-md px-2.5 py-1.5 text-sm' : 'rounded-full px-3 py-1.5 text-sm'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <span
        {...listeners}
        {...attributes}
        className="cursor-grab font-medium select-none truncate"
        title="Arrastra para cambiar de nivel"
      >
        {alumno.nombre}
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        {NIVELES.map((n) => (
          <button
            key={n.nivel}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAssign(alumno.id, n.nivel);
            }}
            aria-label={`Marcar ${alumno.nombre} como ${n.label}`}
            title={n.label}
            className={`h-6 w-6 rounded-full text-xs leading-none transition-transform hover:scale-110 ${
              currentNivel === n.nivel ? 'bg-slate-200 ring-1 ring-slate-400' : 'opacity-75 hover:opacity-100'
            }`}
          >
            {n.emoji}
          </button>
        ))}
      </div>
    </li>
  );
}
