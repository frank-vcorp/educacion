/**
 * Formulario de la entrevista inicial del niño (SPEC_TEC_09 §7).
 * Renderiza los 21 ítems LITERALES en orden (DEC-20260820-01).
 *
 * - UI cliente (`'use client'`) que llama a los server actions de
 *   `services/alumnos/entrevista-actions.ts`.
 * - Mobile-first (P-UX4): usable a 375×812 sin scroll horizontal.
 * - Anti-doble-submit (P-UX): botón deshabilitado durante `isPending`.
 * - El texto de la pregunta NO es editable (sólo la respuesta).
 * - Los ítems 18-21 se pre-pueblan con datos del alumno/grupo (server-side).
 * - Accesibilidad WCAG 2.1 AA: labels asociados, foco visible, navegación por teclado.
 */
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2, FileText, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  upsertEntrevista,
  archivarEntrevista,
} from '@/services/alumnos/entrevista-actions';
import {
  ENTREVISTA_CUESTIONARIO,
  ENTREVISTA_TOTAL_ITEMS,
  buildRespuestasVacias,
  type Respuestas,
  type EstadoEntrevista,
} from '@/types/entrevista';

interface AlumnoLite {
  id: string;
  nombre: string;
  grado: string;
}

interface GrupoLite {
  id: string;
  grado: string;
  grupo: string;
  ciclo_escolar: string;
}

export interface EntrevistaInicialFormProps {
  alumno: AlumnoLite;
  grupo: GrupoLite;
  /** Fila de entrevista existente (si ya fue creada/archivada). */
  initial?: {
    fecha_aplicacion: string;
    estado: EstadoEntrevista;
    respuestas: Respuestas;
  } | null;
  /** Si la docente NO aceptó el aviso de privacidad; deshabilita el form. */
  avisoAceptado: boolean;
  onSaved?: (msg: string) => void;
  onError?: (msg: string) => void;
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function EntrevistaInicialForm({
  alumno,
  grupo,
  initial,
  avisoAceptado,
  onSaved,
  onError,
}: EntrevistaInicialFormProps) {
  const fechaPorDefecto = useMemo(
    () => initial?.fecha_aplicacion ?? todayISODate(),
    [initial?.fecha_aplicacion],
  );

  const initialRespuestas: Respuestas = useMemo(() => {
    if (initial?.respuestas?.items?.length === ENTREVISTA_TOTAL_ITEMS) {
      return initial.respuestas;
    }
    // P3-2: pre-rellenar ítem 19 (Grado) con `grupo.grado` cuando `alumno.grado`
    // no esté disponible (la query actual de /alumnos no selecciona `grado`).
    // SPEC_TEC_09 §240 acepta cualquiera de las dos fuentes.
    return buildRespuestasVacias({
      nombreAlumno: alumno.nombre,
      grado: alumno.grado || grupo.grado || '',
      grupo: grupo.grupo,
      fechaAplicacion: fechaPorDefecto,
    });
  }, [initial, alumno.nombre, alumno.grado, grupo.grado, grupo.grupo, fechaPorDefecto]);

  const [respuestas, setRespuestas] = useState<Respuestas>(initialRespuestas);
  const [fechaAplicacion, setFechaAplicacion] = useState<string>(fechaPorDefecto);
  const [estado, setEstado] = useState<EstadoEntrevista>(initial?.estado ?? 'borrador');
  const [isPending, startTransition] = useTransition();
  const [isArchiving, startArchiving] = useTransition();

  useEffect(() => {
    setRespuestas(initialRespuestas);
    setFechaAplicacion(fechaPorDefecto);
    setEstado(initial?.estado ?? 'borrador');
  }, [initialRespuestas, fechaPorDefecto, initial?.estado]);

  function setRespuesta(orden: number, value: string) {
    setRespuestas((prev) => ({
      items: prev.items.map((it) =>
        it.orden === orden ? { ...it, respuesta: value } : it,
      ),
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!avisoAceptado) {
      onError?.('Se requiere aceptar el aviso de privacidad antes de registrar la entrevista');
      return;
    }
    // Reflejar el ítem 21 (Fecha de aplicación) en el payload sin alterar la
    // pregunta literal persistida.
    const items = respuestas.items.map((it) =>
      it.orden === 21 ? { ...it, respuesta: fechaAplicacion } : it,
    );

    // archivada NO se envía a upsert: se cambia vía archivarEntrevista.
    const estadoPayload: 'borrador' | 'completa' =
      estado === 'archivada' ? 'completa' : estado;

    startTransition(async () => {
      const res = await upsertEntrevista({
        alumnoId: alumno.id,
        fechaAplicacion,
        estado: estadoPayload,
        respuestas: { items },
      });
      if (!res.ok) {
        onError?.(res.error ?? 'Error al guardar');
        return;
      }
      onSaved?.('Entrevista guardada');
    });
  }

  function handleArchivar() {
    if (!avisoAceptado) {
      onError?.('Se requiere aceptar el aviso de privacidad antes de archivar');
      return;
    }
    startArchiving(async () => {
      const res = await archivarEntrevista(alumno.id);
      if (!res.ok) {
        onError?.(res.error ?? 'Error al archivar');
        return;
      }
      setEstado('archivada');
      onSaved?.('Entrevista archivada');
    });
  }

  const archivada = estado === 'archivada';
  const deshabilitado = !avisoAceptado || isPending || isArchiving;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="entrevista-form">
      <header className="space-y-1">
        <h3 className="text-base font-semibold leading-none">
          Entrevista inicial
        </h3>
        <p className="text-xs text-muted-foreground">
          Cuestionario de 21 ítems (literal). Captura editable en sitio; archivar al
          finalizar el ciclo.
        </p>
      </header>

      {!avisoAceptado && (
        <div
          className="rounded-md border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-900"
          data-testid="entrevista-gate-aviso"
        >
          Acepta el aviso de privacidad para registrar la entrevista.
        </div>
      )}

      <fieldset
        disabled={deshabilitado}
        className="space-y-4"
        aria-label="Cuestionario de la entrevista inicial"
      >
        {ENTREVISTA_CUESTIONARIO.map((q) => {
          const item = respuestas.items.find((it) => it.orden === q.orden);
          const useTextarea = q.naturaleza !== 'abierta' || q.orden >= 13;
          const id = `entrevista-item-${q.orden}`;
          return (
            <div key={q.orden} className="space-y-1.5" data-testid={`entrevista-item-${q.orden}`}>
              <Label htmlFor={id} className="text-sm font-medium">
                <span className="text-muted-foreground">{q.orden}.</span>{' '}
                <span>{q.pregunta}</span>
              </Label>
              {useTextarea ? (
                <Textarea
                  id={id}
                  value={item?.respuesta ?? ''}
                  onChange={(e) => setRespuesta(q.orden, e.target.value)}
                  maxLength={1000}
                  rows={q.orden === 17 ? 3 : 2}
                  aria-label={`Respuesta ${q.orden}`}
                />
              ) : (
                <Input
                  id={id}
                  value={item?.respuesta ?? ''}
                  onChange={(e) => setRespuesta(q.orden, e.target.value)}
                  maxLength={1000}
                  aria-label={`Respuesta ${q.orden}`}
                />
              )}
            </div>
          );
        })}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="entrevista-fecha">Fecha de aplicación</Label>
          <Input
            id="entrevista-fecha"
            type="date"
            value={fechaAplicacion}
            onChange={(e) => setFechaAplicacion(e.target.value)}
            disabled={deshabilitado}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entrevista-estado">Estado</Label>
          {archivada ? (
            <Input
              id="entrevista-estado"
              value="Archivada"
              disabled
              readOnly
              aria-readonly
            />
          ) : (
            <Select
              value={estado}
              onValueChange={(v) => setEstado(v as EstadoEntrevista)}
              disabled={deshabilitado}
            >
              <SelectTrigger id="entrevista-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="completa">Completa</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleArchivar}
          disabled={deshabilitado || archivada}
          data-testid="entrevista-archivar"
        >
          {isArchiving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Archive className="mr-2 h-4 w-4" />
          )}
          {archivada ? 'Archivada' : 'Archivar'}
        </Button>
        <Button
          type="submit"
          disabled={deshabilitado}
          data-testid="entrevista-guardar"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>
    </form>
  );
}
