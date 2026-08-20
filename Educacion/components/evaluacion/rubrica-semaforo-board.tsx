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
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  // Map alumno_id -> nivel actual (para este PDA + fecha)
  const nivelPorAlumno = new Map<string, number>();
  for (const e of evaluacionesIniciales) {
    if (e.pda_codigo === pdaCodigo && e.fecha === fecha) {
      nivelPorAlumno.set(e.alumno_id, e.nivel);
    }
  }

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const dropzoneId = e.over?.id ? String(e.over.id) : null;
    if (!dropzoneId || !dropzoneId.startsWith('nivel-')) return;
    const nivel = Number(dropzoneId.replace('nivel-', '')) as Nivel;
    const alumnoId = String(e.active.id);
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return;

    // Persistir
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
        nivelPorAlumno.set(alumnoId, nivel);
        setToast(`${alumno.nombre} → nivel ${nivel}`);
        setTimeout(() => setToast(null), 1500);
      } else {
        setToast(`Error: ${res.error}`);
      }
    });
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
            <Dropzone key={n.nivel} nivel={n} alumnos={alumnos.filter((a) => nivelPorAlumno.get(a.id) === n.nivel)} />
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
                    <DraggableAlumno key={a.id} alumno={a} />
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
            <Badge variant="outline" className="px-3 py-1.5 text-sm">
              {alumnos.find((a) => a.id === activeId)?.nombre ?? '...'}
            </Badge>
          ) : null}
        </DragOverlay>
      </DndContext>

      {toast && (
        <div className="fixed bottom-4 right-4 rounded-md bg-nem-verde px-3 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Dropzone({
  nivel,
  alumnos,
}: {
  nivel: typeof NIVELES[number];
  alumnos: AlumnoLite[];
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
      <ul className="space-y-1">
        {alumnos.map((a) => (
          <li
            key={a.id}
            className="rounded-md border border-border bg-white px-2 py-1 text-sm shadow-sm"
          >
            {a.nombre}
          </li>
        ))}
        {alumnos.length === 0 && (
          <li className="text-xs italic text-muted-foreground">Arrastra aquí</li>
        )}
      </ul>
    </div>
  );
}

function DraggableAlumno({ alumno }: { alumno: AlumnoLite }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: alumno.id });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-full border border-border bg-background px-3 py-1.5 text-sm shadow-sm transition-opacity ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {alumno.nombre}
    </li>
  );
}
