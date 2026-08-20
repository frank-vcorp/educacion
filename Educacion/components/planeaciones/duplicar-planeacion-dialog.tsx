'use client';

/**
 * Diálogo modal "Duplicar/Clonar planeación" (D-FIN-17, §6.6).
 *
 * Selector de grupos del docente + botón "Clonar". Al éxito, redirige a la
 * nueva planeación. Mensajes en es-MX.
 *
 * Carga inicial de grupos: usa la Server Action `listGruposDocente` que
 * ya valida pertenencia al docente (RLS por CCT).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { listGruposDocente, duplicarPlaneacion } from '@/services/planeaciones/planeacion-actions';

interface DuplicarPlaneacionDialogProps {
  planeacionId: string;
  docenteId: string;
  cct: string;
  grupoActualId: string;
  planeacionNombre: string;
}

export function DuplicarPlaneacionDialog({
  planeacionId,
  docenteId,
  cct,
  grupoActualId,
  planeacionNombre,
}: DuplicarPlaneacionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [grupos, setGrupos] = useState<Array<{ id: string; grado: string; grupo: string; nivel: string | null }>>([]);
  const [grupoDestinoId, setGrupoDestinoId] = useState<string>(grupoActualId);
  const [sufijo, setSufijo] = useState('(copia)');
  const [cargando, setCargando] = useState(false);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingGrupos(true);
    listGruposDocente(docenteId, cct)
      .then((res) => {
        if (!res.ok) {
          setError(res.error ?? 'No se pudieron cargar los grupos');
        } else {
          setGrupos(
            res.items
              .filter((g) => g.activo)
              .map((g) => ({ id: g.id, grado: g.grado, grupo: g.grupo, nivel: g.nivel })),
          );
          setError(null);
        }
      })
      .finally(() => setLoadingGrupos(false));
  }, [open, docenteId, cct]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await duplicarPlaneacion({
        planeacionId,
        docenteId,
        cct,
        grupoDestinoId,
        nombreSufijo: sufijo.trim() || '(copia)',
        copiarEvaluaciones: false,
      });
      if (!res.ok) {
        setError(res.error ?? 'No se pudo clonar');
        return;
      }
      setOpen(false);
      // Notificación y redirect a la nueva planeación.
      router.push(`/planeaciones/${res.nuevaPlaneacionId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          Duplicar/Clonar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clonar planeación</DialogTitle>
          <DialogDescription>
            Crea una copia de &laquo;{planeacionNombre}&raquo; para otro grupo. Las
            sesiones y bloques se copian; los alumnos y evaluaciones del grupo
            destino se quedan vacíos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grupo-destino">Grupo destino</Label>
            {loadingGrupos ? (
              <div className="text-sm text-muted-foreground">Cargando grupos…</div>
            ) : grupos.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No tienes grupos activos. Crea uno antes de clonar.
              </div>
            ) : (
              <Select value={grupoDestinoId} onValueChange={setGrupoDestinoId}>
                <SelectTrigger id="grupo-destino" aria-label="Grupo destino">
                  <SelectValue placeholder="Selecciona un grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.grado}&deg; {g.grupo} &middot; {g.nivel ?? '—'}
                      {g.id === grupoActualId ? ' (actual)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre-sufijo">Sufijo del nombre</Label>
            <Input
              id="nombre-sufijo"
              type="text"
              value={sufijo}
              onChange={(e) => setSufijo(e.target.value.slice(0, 20))}
              maxLength={20}
              placeholder="(copia)"
            />
            <p className="text-xs text-muted-foreground">
              Se agregará al nombre original. Máximo 20 caracteres.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={cargando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={cargando || loadingGrupos || grupos.length === 0}>
              {cargando ? 'Clonando…' : 'Clonar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
