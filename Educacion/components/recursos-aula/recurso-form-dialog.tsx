/**
 * Dialog para crear/editar recursos del aula (T10).
 * Incluye sugerencias automáticas via F-IA1 cuando la maestra escribe "uso".
 */
'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIAS_RECURSO } from '@/services/recursos-aula/sugerir-uso';
import { createRecurso } from '@/services/recursos-aula/recurso-actions';

interface Props {
  docenteId: string;
  cct: string;
}

export function RecursoFormDialog({ docenteId, cct }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sugerencias, setSugerencias] = useState<Array<{ campo: string; campoCodigo: string }>>([]);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('manipulativos');
  const [uso, setUso] = useState('');
  const [edad, setEdad] = useState<string>('todas');
  const [cantidad, setCantidad] = useState(1);

  async function fetchSugerencias(texto: string) {
    setUso(texto);
    if (texto.trim().length < 4) {
      setSugerencias([]);
      return;
    }
    try {
      const res = await fetch('/api/recursos-aula/ia-sugerir-uso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uso: texto }),
      });
      const json = await res.json();
      if (res.ok && json.data?.sugerencias) {
        setSugerencias(json.data.sugerencias);
      } else {
        setSugerencias([]);
      }
    } catch {
      setSugerencias([]);
    }
  }

  function submit() {
    setError(null);
    if (!nombre || !uso) {
      setError('Nombre y uso son obligatorios');
      return;
    }
    startTransition(async () => {
      const res = await createRecurso({
        docenteId,
        cct,
        nombre,
        categoria: categoria as never,
        uso,
        edad: edad as never,
        cantidad,
      });
      if (!res.ok) {
        setError(res.error ?? 'Error al guardar');
        return;
      }
      setOpen(false);
      setNombre('');
      setUso('');
      setCantidad(1);
      setSugerencias([]);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Agregar recurso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo recurso del aula</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="r-nombre">Nombre</Label>
            <Input
              id="r-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Bloques de madera"
            />
          </div>
          <div>
            <Label htmlFor="r-cat">Categoría pedagógica</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="r-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_RECURSO.map((c) => (
                  <SelectItem key={c.codigo} value={c.codigo}>
                    {c.emoji} {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="r-uso">
              Uso pedagógico <span className="text-xs text-muted-foreground">(1-5 palabras)</span>
            </Label>
            <Textarea
              id="r-uso"
              value={uso}
              onChange={(e) => fetchSugerencias(e.target.value)}
              rows={2}
              placeholder="Para contar y clasificar por colores"
            />
            {sugerencias.length > 0 && (
              <div className="mt-2 rounded-md border border-nem-verde/40 bg-nem-verde/5 p-2">
                <p className="text-xs font-medium text-nem-verde">
                  Sugerencias de campos formativos (F-IA1):
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sugerencias.map((s) => (
                    <Badge key={s.campoCodigo} variant="verde" className="text-[10px]">
                      {s.campo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="r-edad">Edad</Label>
              <Select value={edad} onValueChange={setEdad}>
                <SelectTrigger id="r-edad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-4">3-4</SelectItem>
                  <SelectItem value="4-5">4-5</SelectItem>
                  <SelectItem value="5-6">5-6</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="r-cant">Cantidad</Label>
              <Input
                id="r-cant"
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
