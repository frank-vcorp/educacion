/**
 * Cliente de gestión de alumnos (CRUD).
 * SPEC-CORRECCIONES-2026-08-17 C-3.
 *
 * - Lista con búsqueda
 * - Botón "Agregar alumno" (modal)
 * - Cada fila: editar / eliminar (confirmación)
 */
'use client';

import { useState, useTransition, useMemo } from 'react';
import { Pencil, Trash2, UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createAlumno, updateAlumno, deleteAlumno, bulkAddAlumnos } from '@/services/alumnos/alumno-actions';

interface Alumno {
  id: string;
  nombre: string;
  created_at?: string;
}

export function AlumnosManager({ initialAlumnos }: { initialAlumnos: Alumno[] }) {
  const [alumnos, setAlumnos] = useState<Alumno[]>(initialAlumnos);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Alumno | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alumno | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return alumnos;
    const q = search.toLowerCase();
    return alumnos.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [alumnos, search]);

  function onCreated(a: Alumno) {
    setAlumnos((prev) => [...prev, a].sort((x, y) => x.nombre.localeCompare(y.nombre)));
  }
  function onUpdated(a: Alumno) {
    setAlumnos((prev) => prev.map((x) => (x.id === a.id ? a : x)).sort((x, y) => x.nombre.localeCompare(y.nombre)));
  }
  function onDeleted(id: string) {
    setAlumnos((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            Agregar varios
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Agregar alumno
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_auto] gap-2 border-b bg-muted/30 p-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[1fr_140px_auto]">
          <span>Nombre</span>
          <span className="hidden sm:block">Acciones</span>
          <span className="sr-only sm:hidden">Acción</span>
        </div>
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {search ? 'Sin coincidencias.' : 'No hay alumnos en este grupo.'}
          </p>
        ) : (
          <ul>
            {filtered.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[1fr_auto] items-center gap-2 border-b p-3 text-sm last:border-b-0 sm:grid-cols-[1fr_140px_auto]"
              >
                <span className="truncate font-medium">{a.nombre}</span>
                <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditTarget(a)}
                    aria-label={`Editar ${a.nombre}`}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Editar</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(a)}
                    aria-label={`Eliminar ${a.nombre}`}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Eliminar</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Total: <span className="font-medium text-foreground">{alumnos.length}</span> alumno(s)
      </p>

      {/* Modal agregar uno */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar alumno</DialogTitle>
            <DialogDescription>
              Captura el nombre del alumno. Lo agregaremos al grupo activo.
            </DialogDescription>
          </DialogHeader>
          <AlumnoForm
            mode="create"
            onCancel={() => setAddOpen(false)}
            onDone={(a) => {
              onCreated(a);
              setAddOpen(false);
            }}
            onError={setError}
          />
        </DialogContent>
      </Dialog>

      {/* Modal agregar varios */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar varios alumnos</DialogTitle>
            <DialogDescription>
              Escribe un nombre por línea (máximo 60).
            </DialogDescription>
          </DialogHeader>
          <BulkForm
            onCancel={() => setBulkOpen(false)}
            onDone={(added) => {
              setAlumnos((prev) => [...prev, ...added].sort((x, y) => x.nombre.localeCompare(y.nombre)));
              setBulkOpen(false);
            }}
            onError={setError}
          />
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar alumno</DialogTitle>
            <DialogDescription>Cambia el nombre del alumno.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <AlumnoForm
              mode="edit"
              initialNombre={editTarget.nombre}
              id={editTarget.id}
              onCancel={() => setEditTarget(null)}
              onDone={(a) => {
                onUpdated(a);
                setEditTarget(null);
              }}
              onError={setError}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación eliminar */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar alumno?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará a{' '}
              <strong>{deleteTarget?.nombre}</strong> del grupo activo.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <EliminarDialog
              id={deleteTarget.id}
              nombre={deleteTarget.nombre}
              onCancel={() => setDeleteTarget(null)}
              onDone={() => {
                onDeleted(deleteTarget.id);
                setDeleteTarget(null);
              }}
              onError={setError}
            />
          )}
        </DialogContent>
      </Dialog>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            className="ml-2 text-xs underline"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- subcomponentes ----------

function AlumnoForm({
  mode,
  initialNombre = '',
  id,
  onCancel,
  onDone,
  onError,
}: {
  mode: 'create' | 'edit';
  initialNombre?: string;
  id?: string;
  onCancel: () => void;
  onDone: (a: Alumno) => void;
  onError: (msg: string | null) => void;
}) {
  const [nombre, setNombre] = useState(initialNombre);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (nombre.trim().length === 0) {
      onError('Ingresa un nombre');
      return;
    }
    onError(null);
    startTransition(async () => {
      if (mode === 'create') {
        const res = await createAlumno({ nombre });
        if (!res.ok) {
          onError(res.error ?? 'Error');
          return;
        }
        onDone({ id: res.id!, nombre: nombre.trim() });
      } else if (id) {
        const res = await updateAlumno({ id, nombre });
        if (!res.ok) {
          onError(res.error ?? 'Error');
          return;
        }
        onDone({ id, nombre: nombre.trim() });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del alumno"
        maxLength={100}
        disabled={isPending}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || nombre.trim().length === 0}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Agregar' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function BulkForm({
  onCancel,
  onDone,
  onError,
}: {
  onCancel: () => void;
  onDone: (added: Alumno[]) => void;
  onError: (msg: string | null) => void;
}) {
  const [nombres, setNombres] = useState('');
  const [isPending, startTransition] = useTransition();
  const lineas = nombres.split('\n').map((n) => n.trim()).filter((n) => n.length > 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lineas.length === 0) {
      onError('Ingresa al menos un nombre');
      return;
    }
    onError(null);
    startTransition(async () => {
      const res = await bulkAddAlumnos({ nombres });
      if (!res.ok) {
        onError(res.error ?? 'Error');
        return;
      }
      onDone(lineas.map((nombre, i) => ({ id: `new-${Date.now()}-${i}`, nombre })));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={nombres}
        onChange={(e) => setNombres(e.target.value)}
        rows={8}
        className="block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
        placeholder="Sofía Hernández&#10;Mateo García&#10;Emilia López"
        disabled={isPending}
      />
      <p className="text-xs text-muted-foreground">
        {lineas.length > 0 ? `${lineas.length} alumno(s) listo(s)` : 'Sin capturar aún'}
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || lineas.length === 0}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Agregar {lineas.length > 0 ? `(${lineas.length})` : ''}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EliminarDialog({
  id,
  nombre,
  onCancel,
  onDone,
  onError,
}: {
  id: string;
  nombre: string;
  onCancel: () => void;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    onError(null);
    startTransition(async () => {
      const res = await deleteAlumno({ id });
      if (!res.ok) {
        onError(res.error ?? 'Error');
        return;
      }
      onDone();
    });
  }

  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        Cancelar
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={handleConfirm}
        disabled={isPending}
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Eliminar a {nombre.split(' ')[0]}
      </Button>
    </DialogFooter>
  );
}
