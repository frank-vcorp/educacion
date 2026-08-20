/**
 * Grid filtrable de bloques del catálogo M1 (T8).
 * SPEC_TEC_04 D-FIN-1.
 */
'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { GripVertical } from 'lucide-react';
import type { BloqueCatalogo, CampoFormativo } from '@/services/catalogo/catalogo';

const TIPOS = [
  { value: '__all__', label: 'Todos los tipos' },
  { value: 'apertura', label: 'Apertura' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'practica', label: 'Práctica' },
  { value: 'cierre', label: 'Cierre' },
  { value: 'evaluacion_semanal', label: 'Evaluación semanal' },
];

const NIVELES = [
  { value: '__all__', label: 'Todos los niveles' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_blanco', label: 'En blanco' },
];

const NIVEL_COLOR: Record<string, 'verde' | 'amarillo' | 'naranja' | 'outline'> = {
  cerrado: 'verde',
  abierto: 'amarillo',
  en_blanco: 'naranja',
};

interface Props {
  bloques: BloqueCatalogo[];
  campos: CampoFormativo[];
}

export function BloquesGrid({ bloques, campos }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [campo, setCampo] = useState<string>(params.get('campo') ?? '__all__');
  const [tipo, setTipo] = useState<string>(params.get('tipo') ?? '__all__');
  const [nivel, setNivel] = useState<string>(params.get('nivel') ?? '__all__');

  const filtrados = useMemo(() => {
    return bloques.filter((b) => {
      if (campo !== '__all__' && !b.campos_formativos.includes(campo)) return false;
      if (tipo !== '__all__' && b.tipo !== tipo) return false;
      if (nivel !== '__all__' && b.nivel_flexibilidad !== nivel) return false;
      return true;
    });
  }, [bloques, campo, tipo, nivel]);

  function aplicar() {
    const next = new URLSearchParams();
    if (campo !== '__all__') next.set('campo', campo);
    if (tipo !== '__all__') next.set('tipo', tipo);
    if (nivel !== '__all__') next.set('nivel', nivel);
    const qs = next.toString();
    router.push(qs ? `/catalogo/bloques?${qs}` : '/catalogo/bloques');
  }

  function limpiar() {
    setCampo('__all__');
    setTipo('__all__');
    setNivel('__all__');
    router.push('/catalogo/bloques');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Campo formativo</label>
          <Select value={campo} onValueChange={setCampo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los campos</SelectItem>
              {campos.map((c) => (
                <SelectItem key={c.codigo} value={c.codigo}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nivel</label>
          <Select value={nivel} onValueChange={setNivel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NIVELES.map((n) => (
                <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="default" size="sm" onClick={aplicar}>Filtrar</Button>
        <Button variant="outline" size="sm" onClick={limpiar}>Limpiar</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtrados.length} bloques {filtrados.length === 1 ? 'mostrado' : 'mostrados'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex-1">
                  <CardTitle className="text-base leading-tight">{b.nombre}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">{b.codigo}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">{b.tipo}</Badge>
                <Badge variant={NIVEL_COLOR[b.nivel_flexibilidad] ?? 'outline'}>
                  {b.nivel_flexibilidad}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {b.descripcion && (
                <p className="text-xs leading-relaxed text-muted-foreground">{b.descripcion}</p>
              )}
              {b.contenido_textual && (
                <p className="line-clamp-3 text-xs leading-relaxed">{b.contenido_textual}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {b.pda_ids.slice(0, 2).map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                ))}
                {b.pda_ids.length > 2 && (
                  <Badge variant="outline" className="text-[10px]">+{b.pda_ids.length - 2}</Badge>
                )}
              </div>
              {b.duracion_min && (
                <p className="text-[10px] text-muted-foreground">~{b.duracion_min} min</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
