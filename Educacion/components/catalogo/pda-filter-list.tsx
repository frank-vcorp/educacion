/**
 * Lista filtrable de PDA por campo + grado (T7).
 * SPEC_TEC_02 §5.1.5.
 */
'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { CampoFormativo, PDA } from '@/services/catalogo/catalogo';

const GRADOS = [
  { value: '__all__', label: 'Todos los grados' },
  { value: '1°', label: '1° preescolar' },
  { value: '2°', label: '2° preescolar' },
  { value: '3°', label: '3° preescolar' },
];

interface Props {
  pdas: PDA[];
  campos: CampoFormativo[];
  selectedCampo?: string;
  selectedGrado?: string;
}

export function PdaFilterList({ pdas, campos, selectedCampo, selectedGrado }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [campo, setCampo] = useState<string>(selectedCampo ?? '__all__');
  const [grado, setGrado] = useState<string>(selectedGrado ?? '__all__');

  // Mapa campo-por-PDA (relación pda_por_campo_fase).
  const pdasConCampo = useMemo(() => {
    return pdas.map((p) => ({
      ...p,
      campos: campos.map((c) => c.codigo),
    }));
  }, [pdas, campos]);

  const filtrados = useMemo(() => {
    return pdasConCampo.filter((p) => {
      if (grado !== '__all__' && p.grado !== grado) return false;
      // filtro por campo es server-side (searchParam), no client-side
      return true;
    });
  }, [pdasConCampo, grado]);

  function aplicarFiltros(c: string, g: string) {
    const next = new URLSearchParams(params);
    if (c && c !== '__all__') next.set('campo', c);
    else next.delete('campo');
    if (g && g !== '__all__') next.set('grado', g);
    else next.delete('grado');
    router.push(`/catalogo/pda?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Campo formativo</label>
          <Select
            value={campo}
            onValueChange={(v) => {
              setCampo(v);
              aplicarFiltros(v, grado);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los campos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los campos</SelectItem>
              {campos.map((c) => (
                <SelectItem key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Grado</label>
          <Select
            value={grado}
            onValueChange={(v) => {
              setGrado(v);
              aplicarFiltros(campo, v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los grados" />
            </SelectTrigger>
            <SelectContent>
              {GRADOS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtrados.length} PDA {filtrados.length === 1 ? 'mostrado' : 'mostrados'}
      </p>

      <ul className="space-y-2">
        {filtrados.map((p) => (
          <Card key={p.codigo}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">{p.codigo}</CardTitle>
                <Badge variant="outline" className="mt-1">Grado {p.grado}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{p.texto}</p>
            </CardContent>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay PDA con esos filtros.
          </li>
        )}
      </ul>
    </div>
  );
}
