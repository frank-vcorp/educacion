/**
 * Form de edición de grupo + botón eliminar.
 * SPEC-CORRECCIONES-2026-08-17 C-2.
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateGrupo, deleteGrupo } from '@/lib/grupos/actions';

const GRADOS = ['1°', '2°', '3°'] as const;

export function EditarGrupoForm({
  grupoId,
  inicial,
  totalAlumnosRegistrados,
}: {
  grupoId: string;
  inicial: { grado: string; grupo: string; cicloEscolar: string; totalAlumnos: number | null };
  totalAlumnosRegistrados: number;
}) {
  const router = useRouter();
  const [grado, setGrado] = useState(inicial.grado);
  const [grupo, setGrupo] = useState(inicial.grupo);
  const [cicloEscolar, setCicloEscolar] = useState(inicial.cicloEscolar);
  const [totalAlumnos, setTotalAlumnos] = useState<string>(
    inicial.totalAlumnos != null ? String(inicial.totalAlumnos) : '',
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateGrupo({
        id: grupoId,
        grado,
        grupo,
        cicloEscolar,
        totalAlumnos: totalAlumnos ? Number(totalAlumnos) : null,
      });
      if (!res.ok) {
        setError(res.error ?? 'Error al guardar');
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteGrupo({ id: grupoId });
      if (!res.ok) {
        setError(res.error ?? 'Error al eliminar');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del grupo</CardTitle>
          <CardDescription>
            Modifica grado, grupo, ciclo escolar o total de alumnos. Los alumnos ya registrados
            permanecerán.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="grado" className="text-sm font-medium">
                  Grado
                </label>
                <select
                  id="grado"
                  value={grado}
                  onChange={(e) => setGrado(e.target.value)}
                  className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                  disabled={isPending}
                >
                  {GRADOS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="grupo" className="text-sm font-medium">
                  Grupo
                </label>
                <Input
                  id="grupo"
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value.toUpperCase())}
                  maxLength={2}
                  required
                  className="mt-1"
                  disabled={isPending}
                />
              </div>
            </div>

            <div>
              <label htmlFor="cicloEscolar" className="text-sm font-medium">
                Ciclo escolar
              </label>
              <Input
                id="cicloEscolar"
                value={cicloEscolar}
                onChange={(e) => setCicloEscolar(e.target.value)}
                required
                pattern="\d{4}-\d{4}"
                className="mt-1"
                placeholder="2025-2026"
                disabled={isPending}
              />
            </div>

            <div>
              <label htmlFor="totalAlumnos" className="text-sm font-medium">
                Total aproximado de alumnos
              </label>
              <Input
                id="totalAlumnos"
                type="number"
                min={1}
                max={60}
                value={totalAlumnos}
                onChange={(e) => setTotalAlumnos(e.target.value)}
                className="mt-1"
                placeholder="Ej. 25"
                disabled={isPending}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Alumnos registrados: <span className="font-medium text-foreground">{totalAlumnosRegistrados}</span>
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {savedAt && (
              <p className="text-sm text-nem-verde">✓ Cambios guardados a las {savedAt.toLocaleTimeString()}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona peligrosa</CardTitle>
          <CardDescription>
            Eliminar el grupo lo marcará como inactivo. Los alumnos registrados permanecerán en tu
            historial pero dejarán de contar para este grupo. Esta acción no se puede deshacer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar grupo
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar este grupo?</DialogTitle>
            <DialogDescription>
              El grupo <strong>{grado}° {grupo}</strong> (ciclo {cicloEscolar}) será marcado como
              inactivo. {totalAlumnosRegistrados > 0 && (
                <>Tiene {totalAlumnosRegistrados} alumno(s) registrado(s) que permanecerán en tu historial.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
