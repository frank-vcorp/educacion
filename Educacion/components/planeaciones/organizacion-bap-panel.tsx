'use client';

import { useState } from 'react';
import { ChevronDown, MapPin, Plus, Trash2, Users, HeartHandshake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ESPACIOS_PRESETS,
  FORMAS_TRABAJO_PRESETS,
  type BapAlumnoItem,
} from '@/lib/planeaciones/organizacion-bap';

export function OrganizacionBapPanel({
  formasTrabajo,
  espacios,
  bapPorAlumno,
  alumnos,
  onChangeFormasTrabajo,
  onChangeEspacios,
  onChangeBapPorAlumno,
}: {
  formasTrabajo: string[];
  espacios: string[];
  bapPorAlumno: BapAlumnoItem[];
  alumnos: Array<{ id: string; nombre: string }>;
  onChangeFormasTrabajo: (next: string[]) => void;
  onChangeEspacios: (next: string[]) => void;
  onChangeBapPorAlumno: (next: BapAlumnoItem[]) => void;
}) {
  const [nuevaForma, setNuevaForma] = useState('');
  const [nuevoEspacio, setNuevoEspacio] = useState('');
  const [alumnoIdSel, setAlumnoIdSel] = useState(alumnos[0]?.id ?? '__manual__');
  const [alumnoNombreManual, setAlumnoNombreManual] = useState('');
  const [barrera, setBarrera] = useState('');
  const [estrategia, setEstrategia] = useState('');

  const toggleItem = (lista: string[], item: string, onChange: (next: string[]) => void) => {
    if (lista.includes(item)) {
      onChange(lista.filter((x) => x !== item));
    } else {
      onChange([...lista, item]);
    }
  };

  const agregarForma = () => {
    const t = nuevaForma.trim();
    if (!t || formasTrabajo.includes(t)) return;
    onChangeFormasTrabajo([...formasTrabajo, t]);
    setNuevaForma('');
  };

  const agregarEspacio = () => {
    const t = nuevoEspacio.trim();
    if (!t || espacios.includes(t)) return;
    onChangeEspacios([...espacios, t]);
    setNuevoEspacio('');
  };

  const agregarBapAlumno = () => {
    const est = estrategia.trim();
    if (!est) return;
    const alumnoObj =
      alumnoIdSel && alumnoIdSel !== '__manual__'
        ? alumnos.find((a) => a.id === alumnoIdSel)
        : undefined;
    const nombre = alumnoObj ? alumnoObj.nombre : alumnoNombreManual.trim();
    if (!nombre) return;

    onChangeBapPorAlumno([
      ...bapPorAlumno,
      {
        alumnoId: alumnoObj?.id,
        alumnoNombre: nombre,
        barrera: barrera.trim() || undefined,
        estrategia: est,
      },
    ]);
    setBarrera('');
    setEstrategia('');
    if (!alumnoObj) setAlumnoNombreManual('');
  };

  const resumen = [
    formasTrabajo.length > 0 ? `${formasTrabajo.length} formas de trabajo` : null,
    espacios.length > 0 ? `${espacios.length} espacios` : null,
    bapPorAlumno.length > 0 ? `${bapPorAlumno.length} apoyos BAP` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <details
      className="group mt-4 rounded-lg border border-nem-verde/25 bg-card shadow-sm"
      data-testid="organizacion-bap-panel"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-nem-verde">
            Organización del grupo, espacios y apoyos BAP por alumno
          </p>
          <p className="text-[11px] text-muted-foreground">
            {resumen || 'Define formas de trabajo, espacios y ajustes razonables específicos por alumno (se incluyen en el PDF).'}
          </p>
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="space-y-5 border-t border-dashed p-4">
        {/* Formas de trabajo */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-nem-verde" />
            Formas de trabajo
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FORMAS_TRABAJO_PRESETS.map((forma) => {
              const activa = formasTrabajo.includes(forma);
              return (
                <button
                  key={forma}
                  type="button"
                  onClick={() => toggleItem(formasTrabajo, forma, onChangeFormasTrabajo)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    activa
                      ? 'border-nem-verde bg-nem-verde text-white'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {forma}
                </button>
              );
            })}
            {formasTrabajo
              .filter((f) => !(FORMAS_TRABAJO_PRESETS as readonly string[]).includes(f))
              .map((extra) => (
                <Badge key={extra} variant="verde" className="gap-1 text-xs">
                  {extra}
                  <button
                    type="button"
                    onClick={() => onChangeFormasTrabajo(formasTrabajo.filter((x) => x !== extra))}
                    aria-label={`Quitar ${extra}`}
                    className="ml-0.5 hover:opacity-75"
                  >
                    ×
                  </button>
                </Badge>
              ))}
          </div>
          <div className="flex max-w-xs gap-1.5">
            <Input
              value={nuevaForma}
              onChange={(e) => setNuevaForma(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregarForma();
                }
              }}
              placeholder="Otra forma (ej. Rincones, Tutoría entre pares)"
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={agregarForma}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Espacios */}
        <div className="space-y-2 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <MapPin className="h-3.5 w-3.5 text-nem-verde" />
            Espacios educativos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ESPACIOS_PRESETS.map((esp) => {
              const activo = espacios.includes(esp);
              return (
                <button
                  key={esp}
                  type="button"
                  onClick={() => toggleItem(espacios, esp, onChangeEspacios)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    activo
                      ? 'border-nem-verde bg-nem-verde text-white'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {esp}
                </button>
              );
            })}
            {espacios
              .filter((e) => !(ESPACIOS_PRESETS as readonly string[]).includes(e))
              .map((extra) => (
                <Badge key={extra} variant="verde" className="gap-1 text-xs">
                  {extra}
                  <button
                    type="button"
                    onClick={() => onChangeEspacios(espacios.filter((x) => x !== extra))}
                    aria-label={`Quitar ${extra}`}
                    className="ml-0.5 hover:opacity-75"
                  >
                    ×
                  </button>
                </Badge>
              ))}
          </div>
          <div className="flex max-w-xs gap-1.5">
            <Input
              value={nuevoEspacio}
              onChange={(e) => setNuevoEspacio(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregarEspacio();
                }
              }}
              placeholder="Otro espacio (ej. Huerto escolar, Cancha)"
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={agregarEspacio}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Estrategias BAP por alumno */}
        <div className="space-y-2.5 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <HeartHandshake className="h-3.5 w-3.5 text-amber-600" />
            Estrategias y ajustes razonables (BAP) por alumno
          </p>
          <p className="text-[11px] text-muted-foreground">
            Registra apoyos específicos para alumnas o alumnos que requieren seguimiento diferenciado.
          </p>

          {bapPorAlumno.length > 0 && (
            <div className="space-y-2">
              {bapPorAlumno.map((item, idx) => (
                <div
                  key={`${item.alumnoNombre}-${idx}`}
                  className="flex items-start justify-between gap-2 rounded-md border border-amber-200/80 bg-amber-50/60 p-2.5 text-xs dark:bg-amber-950/20"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-foreground">{item.alumnoNombre}</span>
                      {item.barrera && (
                        <Badge variant="outline" className="text-[10px]">
                          {item.barrera}
                        </Badge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-muted-foreground">{item.estrategia}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 p-0 text-destructive"
                    onClick={() =>
                      onChangeBapPorAlumno(bapPorAlumno.filter((_, i) => i !== idx))
                    }
                    aria-label={`Eliminar apoyo de ${item.alumnoNombre}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Alumna / alumno
                </label>
                {alumnos.length > 0 ? (
                  <select
                    value={alumnoIdSel}
                    onChange={(e) => setAlumnoIdSel(e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
                  >
                    {alumnos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                    <option value="__manual__">Otro alumno (escribir nombre)…</option>
                  </select>
                ) : null}
                {(alumnos.length === 0 || alumnoIdSel === '__manual__') && (
                  <Input
                    value={alumnoNombreManual}
                    onChange={(e) => setAlumnoNombreManual(e.target.value)}
                    placeholder="Nombre del alumno/a"
                    className="mt-1 h-8 text-xs"
                  />
                )}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Área / barrera (opcional)
                </label>
                <Input
                  value={barrera}
                  onChange={(e) => setBarrera(e.target.value)}
                  placeholder="Ej. Lenguaje, Regulación emocional, Atención"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Estrategia / ajuste razonable
              </label>
              <Textarea
                value={estrategia}
                onChange={(e) => setEstrategia(e.target.value)}
                rows={2}
                placeholder="Ej. Sentar con compañeros de lenguaje fluido y motivar a expresar con palabras completas sin adivinarle."
                className="mt-1 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={agregarBapAlumno}
              disabled={
                !estrategia.trim() ||
                ((alumnos.length === 0 || alumnoIdSel === '__manual__') &&
                  !alumnoNombreManual.trim())
              }
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar apoyo BAP
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}
