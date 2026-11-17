'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Sparkles, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { obtenerEstadoDiaEscolar } from '@/lib/planeaciones/calendario-escolar';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toISO(anio: number, mes0: number, dia: number): string {
  const m = String(mes0 + 1).padStart(2, '0');
  const d = String(dia).padStart(2, '0');
  return `${anio}-${m}-${d}`;
}

export function CalendarioEscolarView({
  anioInicial,
  mes0Inicial,
}: {
  anioInicial: number;
  mes0Inicial: number;
}) {
  const [anio, setAnio] = useState(anioInicial);
  const [mes0, setMes0] = useState(mes0Inicial);

  const irAnterior = () => {
    if (mes0 === 0) {
      setMes0(11);
      setAnio((a) => a - 1);
    } else {
      setMes0((m) => m - 1);
    }
  };

  const irSiguiente = () => {
    if (mes0 === 11) {
      setMes0(0);
      setAnio((a) => a + 1);
    } else {
      setMes0((m) => m + 1);
    }
  };

  const { celdas, resumenMes } = useMemo(() => {
    const primerDia = new Date(anio, mes0, 1);
    const ultimoDia = new Date(anio, mes0 + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    // Lunes = 0 ... Domingo = 6
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const listaCeldas: Array<{
      dia: number | null;
      iso: string | null;
      esFinDeSemana: boolean;
      estado: ReturnType<typeof obtenerEstadoDiaEscolar> | null;
    }> = [];

    for (let i = 0; i < offsetInicio; i++) {
      listaCeldas.push({ dia: null, iso: null, esFinDeSemana: false, estado: null });
    }

    const eventosResumen: Array<{
      fecha: string;
      dia: number;
      tipo: 'asueto' | 'cte' | 'efemeride';
      titulo: string;
    }> = [];

    for (let d = 1; d <= diasEnMes; d++) {
      const iso = toISO(anio, mes0, d);
      const dow = new Date(anio, mes0, d).getDay();
      const esFinDeSemana = dow === 0 || dow === 6;
      const estado = obtenerEstadoDiaEscolar(iso);

      listaCeldas.push({ dia: d, iso, esFinDeSemana, estado });

      if (estado.esAsueto && estado.motivoAsueto && !esFinDeSemana) {
        eventosResumen.push({
          fecha: iso,
          dia: d,
          tipo: 'asueto',
          titulo: estado.motivoAsueto,
        });
      } else if (estado.esCte) {
        eventosResumen.push({
          fecha: iso,
          dia: d,
          tipo: 'cte',
          titulo: 'Consejo Técnico Escolar (CTE — Sin clase)',
        });
      }

      if (estado.efemeride) {
        eventosResumen.push({
          fecha: iso,
          dia: d,
          tipo: 'efemeride',
          titulo: estado.efemeride.nombre,
        });
      }
    }

    return { celdas: listaCeldas, resumenMes: eventosResumen };
  }, [anio, mes0]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={irAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold text-nem-verde">
            {MESES[mes0]} {anio}
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={irSiguiente}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
            Asueto / Vacaciones SEP
          </Badge>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
            Consejo Técnico (CTE)
          </Badge>
          <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-900">
            Efeméride
          </Badge>
          <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800">
            Honores (Lunes)
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground">
            {DIAS_CORTO.map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {celdas.map((cel, idx) => {
              if (!cel.dia || !cel.estado) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[82px] rounded-md bg-muted/20"
                  />
                );
              }
              const { esAsueto, motivoAsueto, esCte, esHonores, efemeride } = cel.estado;
              const bgClass = cel.esFinDeSemana
                ? 'bg-muted/30 text-muted-foreground'
                : esAsueto
                  ? 'border-rose-200 bg-rose-50/70'
                  : esCte
                    ? 'border-amber-200 bg-amber-50/70'
                    : 'bg-background';

              return (
                <div
                  key={cel.iso}
                  className={`flex min-h-[82px] flex-col rounded-md border p-1.5 text-xs ${bgClass}`}
                >
                  <span className="font-semibold">{cel.dia}</span>
                  <div className="mt-1 space-y-1">
                    {esAsueto && !cel.esFinDeSemana && motivoAsueto && (
                      <p className="rounded bg-rose-100 px-1 py-0.5 text-[10px] font-medium leading-tight text-rose-900">
                        {motivoAsueto}
                      </p>
                    )}
                    {esCte && (
                      <p className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium leading-tight text-amber-900">
                        CTE (Sin clase)
                      </p>
                    )}
                    {esHonores && (
                      <p className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium leading-tight text-blue-900">
                        Honores
                      </p>
                    )}
                    {efemeride && (
                      <p className="rounded bg-purple-100 px-1 py-0.5 text-[10px] font-medium leading-tight text-purple-900">
                        {efemeride.nombre}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-nem-verde" />
            Fechas clave de {MESES[mes0]} {anio}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumenMes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay asuetos, CTE ni efemérides registradas en este mes (solo lunes de Honores).
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {resumenMes.map((ev, i) => (
                <li key={`${ev.fecha}-${ev.tipo}-${i}`} className="flex items-center gap-2">
                  {ev.tipo === 'asueto' && <Sun className="h-3.5 w-3.5 shrink-0 text-rose-600" />}
                  {ev.tipo === 'cte' && <Flag className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
                  {ev.tipo === 'efemeride' && (
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                  )}
                  <span className="font-semibold">
                    {ev.dia} de {MESES[mes0]}:
                  </span>
                  <span>{ev.titulo}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
