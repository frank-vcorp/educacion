/**
 * Formulario de la entrevista familiar — v1 (SPEC_TEC_11 §6, ADR-20260820-04).
 *
 * Renderiza los 6 bloques del cuestionario literal del PDF
 * `docx_extract/NUEVA ENTREVISTA.pdf`:
 *   A — Encabezado e identificación (alumno + fecha de nacimiento).
 *   B — Datos de MAMÁ y PAPÁ (tabla 6 filas × 2 cols con etiquetas literales).
 *   C — SITUACION LEGAL DE LA FAMILIA (5 casillas booleanas + texto).
 *   D — Padres separados (condicional; se muestra sólo si NO se marca
 *       `casados`/`unión libre`).
 *   E — HABITOS FAMILIARES (15 ítems con salto 14→16; conserva peculiaridades).
 *   F — Cierre literal (`const`) y firma como nombre tecleado mamá/papá (D11-11).
 *
 * Decisiones vigentes (privacidad + UI):
 *   - Gate D11-07 (aviso aceptado) lo aplica el caller y bloquea el form.
 *   - Móvil-first 375×812 sin scroll horizontal; una pregunta/grupo por
 *     bloque largo (P-UX1 / P-UX4).
 *   - Anti-doble-submit (botón deshabilitado durante `isPending`).
 *   - Sin emojis ni gamificación.
 *   - El texto de cada pregunta/subcampo/etiqueta NO es editable.
 *
 * Contratos PROTEGIDOS (NO TOCAR):
 *   - `entrevista_inicial_alumno`, `entrevista-inicial-form.tsx`,
 *     `entrevista-actions.ts`, `types/entrevista.ts`.
 */
'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  Archive,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  upsertEntrevistaFamiliar,
  archivarEntrevistaFamiliar,
} from '@/services/alumnos/entrevista-familiar-actions';
import {
  ENCABEZADO_INSTITUCION,
  TITULO_CUESTIONARIO,
  SITUACION_LEGAL_ENCABEZADO,
  SITUACION_LEGAL_TEXTO_CONQUIENVIVE_PREGUNTA,
  PADRES_SEPARADOS_ENCABEZADO,
  PADRES_SEPARADOS_PREGUNTA_PATRIA,
  PADRES_SEPARADOS_PREGUNTA_CONVIVE,
  PADRES_SEPARADOS_SUBCAMPO_EXPLICACION,
  HABITOS_FAMILIARES,
  HABITOS_FAMILIARES_TOTAL,
  PROGENITOR_ETIQUETAS,
  PROGENITOR_TOTAL,
  FIRMA_ETIQUETA_MAMA,
  FIRMA_ETIQUETA_PAPA,
  CIERRE_MENSAJE_GRACIAS,
  CIERRE_MENSAJE_RECABADA,
  buildRespuestasFamiliaresVaciasV1,
  normalizarPadresSeparadosSegunSituacion,
  type BloqueHabito,
  type BloquePadresSeparados,
  type BloqueProgenitor,
  type BloqueSituacionLegal,
  type EstadoEntrevistaFamiliar,
  type RespuestasFamiliarV1,
} from '@/types/entrevista-familiar';

interface AlumnoLite {
  id: string;
  nombre: string;
  grado: string;
}

export interface EntrevistaFamiliarFormProps {
  alumno: AlumnoLite;
  /** Fila existente (si ya fue creada/archivada). */
  initial?: {
    fecha_aplicacion: string;
    estado: EstadoEntrevistaFamiliar;
    respuestas: RespuestasFamiliarV1;
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

const STORAGE_PREFIX = 'entrevista:familiar:v1:';

export function EntrevistaFamiliarForm({
  alumno,
  initial,
  avisoAceptado,
  onSaved,
  onError,
}: EntrevistaFamiliarFormProps) {
  const fechaPorDefecto = useMemo(
    () => initial?.fecha_aplicacion ?? todayISODate(),
    [initial?.fecha_aplicacion],
  );

  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}${alumno.id}`,
    [alumno.id],
  );

  function buildRespuestasInicial(): RespuestasFamiliarV1 {
    if (initial?.respuestas) return initial.respuestas;
    if (typeof window === 'undefined') {
      return buildRespuestasFamiliaresVaciasV1({
        nombreAlumno: alumno.nombre,
        fechaNacimiento: fechaPorDefecto,
      });
    }
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) {
        return buildRespuestasFamiliaresVaciasV1({
          nombreAlumno: alumno.nombre,
          fechaNacimiento: fechaPorDefecto,
        });
      }
      const parsed = JSON.parse(raw) as { respuestas?: RespuestasFamiliarV1 };
      if (
        parsed.respuestas?.habitosFamiliares?.items?.length === HABITOS_FAMILIARES_TOTAL
      ) {
        return parsed.respuestas;
      }
    } catch {
      // ignore
    }
    return buildRespuestasFamiliaresVaciasV1({
      nombreAlumno: alumno.nombre,
      fechaNacimiento: fechaPorDefecto,
    });
  }

  function loadFechaInicial(): string {
    if (initial?.fecha_aplicacion) return initial.fecha_aplicacion;
    if (typeof window === 'undefined') return fechaPorDefecto;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return fechaPorDefecto;
      const parsed = JSON.parse(raw) as { fechaAplicacion?: string };
      if (typeof parsed.fechaAplicacion === 'string') return parsed.fechaAplicacion;
    } catch {
      // ignore
    }
    return fechaPorDefecto;
  }

  function loadEstadoInicial(): EstadoEntrevistaFamiliar {
    if (initial?.estado) return initial.estado;
    if (typeof window === 'undefined') return 'borrador';
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return 'borrador';
      const parsed = JSON.parse(raw) as { estado?: EstadoEntrevistaFamiliar };
      if (parsed.estado === 'borrador' || parsed.estado === 'completa') {
        return parsed.estado;
      }
    } catch {
      // ignore
    }
    return 'borrador';
  }

  const [respuestas, setRespuestas] = useState<RespuestasFamiliarV1>(
    buildRespuestasInicial,
  );
  const [fechaAplicacion, setFechaAplicacion] = useState<string>(loadFechaInicial);
  const [estado, setEstado] = useState<EstadoEntrevistaFamiliar>(loadEstadoInicial);
  const [isPending, startTransition] = useTransition();
  const [isArchiving, startArchiving] = useTransition();

  // Sincroniza cuando llega `initial` desde el servidor (post `getEntrevistaFamiliar`).
  const skipFirstSyncRef = useFirstSkipTrue();
  useEffect(() => {
    if (skipFirstSyncRef.current) {
      skipFirstSyncRef.current = false;
      return;
    }
    if (initial?.respuestas) {
      setRespuestas(initial.respuestas);
    }
    setFechaAplicacion(fechaPorDefecto);
    setEstado(initial?.estado ?? 'borrador');
  }, [initial?.respuestas, initial?.estado, fechaPorDefecto, skipFirstSyncRef]);

  // Persistencia local best-effort (borrador en sesión; NO sustituye BD).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({ respuestas, fechaAplicacion, estado }),
      );
    } catch {
      // ignore
    }
  }, [storageKey, respuestas, fechaAplicacion, estado]);

  const clearLocalDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  // ============ Mutadores por bloque ============

  function setIdentificacion(patch: Partial<RespuestasFamiliarV1['identificacion']>) {
    setRespuestas((prev) => ({
      ...prev,
      identificacion: { ...prev.identificacion, ...patch },
    }));
  }

  function setProgenitor(
    side: 'mama' | 'papa',
    patch: Partial<BloqueProgenitor>,
  ) {
    setRespuestas((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  }

  function setSituacionLegal(patch: Partial<BloqueSituacionLegal>) {
    setRespuestas((prev) => {
      const merged: BloqueSituacionLegal = {
        ...prev.situacionLegal,
        ...patch,
      };
      // Regla §4.1 Bloque C: si casados/unión libre → padresSeparados = null.
      // Si divorciados/madreSoltera → garantizar objeto persistido.
      const padres = normalizarPadresSeparadosSegunSituacion(
        prev.padresSeparados,
        merged,
      );
      return {
        ...prev,
        situacionLegal: merged,
        padresSeparados: padres,
      };
    });
  }

  function setPadresSeparados(patch: Partial<BloquePadresSeparados>) {
    setRespuestas((prev) => {
      const base: BloquePadresSeparados = prev.padresSeparados ?? {
        patriaPotestad: '',
        conviveOtraParte: false,
        explicacion: '',
      };
      return {
        ...prev,
        padresSeparados: { ...base, ...patch },
      };
    });
  }

  function setHabito(index: number, patch: Partial<BloqueHabito>) {
    setRespuestas((prev) => {
      const items = prev.habitosFamiliares.items.map((it, i) =>
        i === index ? { ...it, ...patch } : it,
      );
      return {
        ...prev,
        habitosFamiliares: { items },
      };
    });
  }

  function setFirma(patch: Partial<RespuestasFamiliarV1['firmas']>) {
    setRespuestas((prev) => ({
      ...prev,
      firmas: { ...prev.firmas, ...patch },
    }));
  }

  // ============ Submit / archivar ============

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!avisoAceptado) {
      onError?.('Se requiere aceptar el aviso de privacidad antes de registrar la entrevista');
      return;
    }
    const estadoPayload: 'borrador' | 'completa' =
      estado === 'archivada' ? 'completa' : estado;

    startTransition(async () => {
      const res = await upsertEntrevistaFamiliar({
        alumnoId: alumno.id,
        fechaAplicacion,
        estado: estadoPayload,
        respuestas,
      });
      if (!res.ok) {
        onError?.(res.error ?? 'Error al guardar');
        return;
      }
      clearLocalDraft();
      onSaved?.('Entrevista familiar guardada');
    });
  }

  function handleArchivar() {
    if (!avisoAceptado) {
      onError?.('Se requiere aceptar el aviso de privacidad antes de archivar');
      return;
    }
    startArchiving(async () => {
      const res = await archivarEntrevistaFamiliar(alumno.id);
      if (!res.ok) {
        onError?.(res.error ?? 'Error al archivar');
        return;
      }
      setEstado('archivada');
      clearLocalDraft();
      onSaved?.('Entrevista familiar archivada');
    });
  }

  const archivada = estado === 'archivada';
  const deshabilitado = !avisoAceptado || isPending || isArchiving;

  // Reglas de visibilidad del bloque D (padres separados).
  const bloqueDAplica =
    !respuestas.situacionLegal.casados && !respuestas.situacionLegal.unionLibre;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 pb-2"
      data-testid="entrevista-familiar-form"
    >
      <header className="space-y-1">
        <p
          className="text-center text-sm font-semibold"
          data-testid="entrevista-familiar-institucion"
        >
          {ENCABEZADO_INSTITUCION}
        </p>
        <p
          className="text-center text-sm font-medium uppercase"
          data-testid="entrevista-familiar-titulo"
        >
          {TITULO_CUESTIONARIO}
        </p>
        <p className="text-xs text-muted-foreground">
          Cuestionario literal del PDF. Captura editable en sitio; archivar al
          finalizar el ciclo.
        </p>
      </header>

      {!avisoAceptado && (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-900"
          data-testid="entrevista-familiar-gate-aviso"
          role="alert"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Acepta el aviso de privacidad para registrar la entrevista familiar.
          </span>
        </div>
      )}

      {archivada && (
        <div
          className="flex items-start gap-2 rounded-md border border-sky-400/40 bg-sky-50 p-3 text-xs text-sky-900"
          data-testid="entrevista-familiar-archivada-banner"
          role="status"
        >
          <Archive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Esta entrevista está <strong>archivada</strong>. Conservamos los
            datos del ciclo; no es posible borrar el registro.
          </span>
        </div>
      )}

      {/* ============ BLOQUE A — Encabezado e identificación ============ */}
      <fieldset
        disabled={deshabilitado}
        className="space-y-3"
        aria-label="Bloque A — Identificación"
        data-testid="entrevista-familiar-bloque-a"
      >
        <legend className="text-sm font-semibold">Bloque A — Identificación</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="familiar-nombre-alumno">NOMBRE DEL ALUMNO:</Label>
            <Input
              id="familiar-nombre-alumno"
              value={respuestas.identificacion.nombreAlumno || alumno.nombre}
              onChange={(e) => setIdentificacion({ nombreAlumno: e.target.value })}
              maxLength={200}
              disabled={deshabilitado}
              data-testid="familiar-nombre-alumno"
              aria-label="Nombre del alumno"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="familiar-fecha-nacimiento">FECHA DE NACIMIENTO:</Label>
            <Input
              id="familiar-fecha-nacimiento"
              type="date"
              value={respuestas.identificacion.fechaNacimiento}
              onChange={(e) =>
                setIdentificacion({ fechaNacimiento: e.target.value })
              }
              disabled={deshabilitado}
              data-testid="familiar-fecha-nacimiento"
              aria-label="Fecha de nacimiento"
            />
          </div>
        </div>
      </fieldset>

      {/* ============ BLOQUE B — Datos de MAMÁ y PAPÁ ============ */}
      <fieldset
        disabled={deshabilitado}
        className="space-y-3"
        aria-label="Bloque B — Datos de mamá y papá"
        data-testid="entrevista-familiar-bloque-b"
      >
        <legend className="text-sm font-semibold">Bloque B — Datos de mamá y papá</legend>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th
                  scope="col"
                  className="w-1/2 border px-2 py-1 text-center font-semibold uppercase"
                >
                  MAMÁ
                </th>
                <th
                  scope="col"
                  className="w-1/2 border px-2 py-1 text-center font-semibold uppercase"
                >
                  PAPÁ
                </th>
              </tr>
            </thead>
            <tbody>
              {PROGENITOR_ETIQUETAS.map((fila) => {
                const idMama = `familiar-mama-${fila.etiqueta}`;
                const idPapa = `familiar-papa-${fila.etiqueta}`;
                const propMama = campoPorEtiqueta(fila.etiqueta, 'mama');
                const propPapa = campoPorEtiqueta(fila.etiqueta, 'papa');
                return (
                  <tr key={fila.orden} data-testid={`familiar-fila-${fila.orden}`}>
                    <td className="w-1/2 border align-top p-2">
                      <Label
                        htmlFor={idMama}
                        className="mb-1 block text-xs font-medium"
                      >
                        {fila.etiqueta}
                      </Label>
                      <Input
                        id={idMama}
                        value={respuestas.mama[propMama] ?? ''}
                        onChange={(e) => setProgenitor('mama', { [propMama]: e.target.value } as Partial<BloqueProgenitor>)}
                        maxLength={maxPorCampo(fila.etiqueta)}
                        disabled={deshabilitado}
                        aria-label={`${fila.etiqueta} mamá`}
                        data-testid={`familiar-mama-${fila.etiqueta.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                    </td>
                    <td className="w-1/2 border align-top p-2">
                      <Label
                        htmlFor={idPapa}
                        className="mb-1 block text-xs font-medium"
                      >
                        {fila.etiqueta}
                      </Label>
                      <Input
                        id={idPapa}
                        value={respuestas.papa[propPapa] ?? ''}
                        onChange={(e) => setProgenitor('papa', { [propPapa]: e.target.value } as Partial<BloqueProgenitor>)}
                        maxLength={maxPorCampo(fila.etiqueta)}
                        disabled={deshabilitado}
                        aria-label={`${fila.etiqueta} papá`}
                        data-testid={`familiar-papa-${fila.etiqueta.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="sr-only" data-testid="familiar-progenitor-total">
          Total de filas: {PROGENITOR_TOTAL}
        </p>
      </fieldset>

      {/* ============ BLOQUE C — SITUACION LEGAL DE LA FAMILIA ============ */}
      <fieldset
        disabled={deshabilitado}
        className="space-y-3"
        aria-label="Bloque C — Situación legal de la familia"
        data-testid="entrevista-familiar-bloque-c"
      >
        <legend className="text-sm font-semibold">
          {SITUACION_LEGAL_ENCABEZADO}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxLine
            id="familiar-casados"
            label="casados"
            checked={respuestas.situacionLegal.casados}
            onChange={(v) =>
              setSituacionLegal({
                casados: v,
                // Exclusividad: los dos primeros no se combinan entre sí.
                unionLibre: v ? false : respuestas.situacionLegal.unionLibre,
              })
            }
            disabled={deshabilitado}
          />
          <CheckboxLine
            id="familiar-union-libre"
            label="unión libre"
            checked={respuestas.situacionLegal.unionLibre}
            onChange={(v) =>
              setSituacionLegal({
                unionLibre: v,
                casados: v ? false : respuestas.situacionLegal.casados,
              })
            }
            disabled={deshabilitado}
          />
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="familiar-con-quien-vive">
              {SITUACION_LEGAL_TEXTO_CONQUIENVIVE_PREGUNTA}
            </Label>
            <Input
              id="familiar-con-quien-vive"
              value={respuestas.situacionLegal.conQuienVive}
              onChange={(e) =>
                setSituacionLegal({ conQuienVive: e.target.value })
              }
              maxLength={500}
              disabled={deshabilitado}
              data-testid="familiar-con-quien-vive"
              aria-label={SITUACION_LEGAL_TEXTO_CONQUIENVIVE_PREGUNTA}
            />
          </div>
          <CheckboxLine
            id="familiar-divorciados"
            label="divorciados"
            checked={respuestas.situacionLegal.divorciados}
            onChange={(v) =>
              setSituacionLegal({
                divorciados: v,
                madreSoltera: v ? false : respuestas.situacionLegal.madreSoltera,
              })
            }
            disabled={deshabilitado}
          />
          <CheckboxLine
            id="familiar-madre-soltera"
            label="madre soltera"
            checked={respuestas.situacionLegal.madreSoltera}
            onChange={(v) =>
              setSituacionLegal({
                madreSoltera: v,
                divorciados: v ? false : respuestas.situacionLegal.divorciados,
              })
            }
            disabled={deshabilitado}
          />
        </div>
      </fieldset>

      {/* ============ BLOQUE D — Padres separados (condicional) ============ */}
      {bloqueDAplica && (
        <fieldset
          disabled={deshabilitado}
          className="space-y-3"
          aria-label="Bloque D — Padres separados"
          data-testid="entrevista-familiar-bloque-d"
        >
          <legend className="text-sm font-semibold">
            {PADRES_SEPARADOS_ENCABEZADO}
          </legend>
          <div className="space-y-1.5">
            <Label htmlFor="familiar-patria-potestad">
              1.- {PADRES_SEPARADOS_PREGUNTA_PATRIA}
            </Label>
            <Input
              id="familiar-patria-potestad"
              value={respuestas.padresSeparados?.patriaPotestad ?? ''}
              onChange={(e) =>
                setPadresSeparados({ patriaPotestad: e.target.value })
              }
              maxLength={500}
              disabled={deshabilitado}
              data-testid="familiar-patria-potestad"
              aria-label={PADRES_SEPARADOS_PREGUNTA_PATRIA}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="familiar-convive-otra-parte">
              2.- {PADRES_SEPARADOS_PREGUNTA_CONVIVE}
            </Label>
            <div className="flex items-center gap-3">
              <CheckboxLine
                id="familiar-convive-otra-parte"
                label="Sí"
                checked={respuestas.padresSeparados?.conviveOtraParte ?? false}
                onChange={(v) => setPadresSeparados({ conviveOtraParte: v })}
                disabled={deshabilitado}
              />
              <CheckboxLine
                id="familiar-convive-otra-parte-no"
                label="No"
                checked={
                  !(respuestas.padresSeparados?.conviveOtraParte ?? false)
                }
                onChange={(v) => setPadresSeparados({ conviveOtraParte: !v })}
                disabled={deshabilitado}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="familiar-explicacion-separacion">
              {PADRES_SEPARADOS_SUBCAMPO_EXPLICACION}
            </Label>
            <Textarea
              id="familiar-explicacion-separacion"
              rows={3}
              value={respuestas.padresSeparados?.explicacion ?? ''}
              onChange={(e) =>
                setPadresSeparados({ explicacion: e.target.value })
              }
              maxLength={1000}
              disabled={deshabilitado}
              data-testid="familiar-explicacion-separacion"
              aria-label={PADRES_SEPARADOS_SUBCAMPO_EXPLICACION}
            />
          </div>
        </fieldset>
      )}

      {/* ============ BLOQUE E — HABITOS FAMILIARES (15 ítems con salto 14→16) ============ */}
      <fieldset
        disabled={deshabilitado}
        className="space-y-4"
        aria-label="Bloque E — Hábitos familiares"
        data-testid="entrevista-familiar-bloque-e"
      >
        <legend className="text-sm font-semibold">HABITOS FAMILIARES</legend>
        <ol className="space-y-3" role="list">
          {HABITOS_FAMILIARES.map((h, idx) => {
            const item = respuestas.habitosFamiliares.items[idx];
            if (!item) return null;
            return (
              <HabitItemInput
                key={h.orden}
                index={idx}
                pregunta={h.pregunta}
                subcampo={h.subcampo}
                item={item}
                onRespuesta={(v) => setHabito(idx, { respuesta: v })}
                onRespuestaSubcampo={(v) =>
                  setHabito(idx, { respuestaSubcampo: v })
                }
                disabled={deshabilitado}
              />
            );
          })}
        </ol>
        <p className="sr-only" data-testid="familiar-habitos-total">
          Total de hábitos: {HABITOS_FAMILIARES_TOTAL} (sin ítem 15; salto 14→16)
        </p>
      </fieldset>

      {/* ============ BLOQUE F — Cierre y firmas ============ */}
      <fieldset
        disabled={deshabilitado}
        className="space-y-3"
        aria-label="Bloque F — Cierre y firmas"
        data-testid="entrevista-familiar-bloque-f"
      >
        <legend className="text-sm font-semibold">Cierre y firmas</legend>
        <p
          className="rounded-md border bg-muted/20 p-3 text-sm uppercase"
          data-testid="familiar-cierre-gracias"
        >
          {CIERRE_MENSAJE_GRACIAS}
        </p>
        <p
          className="rounded-md border bg-muted/20 p-3 text-xs uppercase"
          data-testid="familiar-cierre-recabada"
        >
          {CIERRE_MENSAJE_RECABADA}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="familiar-firma-mama">{FIRMA_ETIQUETA_MAMA}</Label>
            <Input
              id="familiar-firma-mama"
              value={respuestas.firmas.nombreMama}
              onChange={(e) => setFirma({ nombreMama: e.target.value })}
              maxLength={200}
              disabled={deshabilitado}
              data-testid="familiar-firma-mama"
              aria-label={FIRMA_ETIQUETA_MAMA}
              placeholder="Nombre de la mamá"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="familiar-firma-papa">{FIRMA_ETIQUETA_PAPA}</Label>
            <Input
              id="familiar-firma-papa"
              value={respuestas.firmas.nombrePapa}
              onChange={(e) => setFirma({ nombrePapa: e.target.value })}
              maxLength={200}
              disabled={deshabilitado}
              data-testid="familiar-firma-papa"
              aria-label={FIRMA_ETIQUETA_PAPA}
              placeholder="Nombre del papá"
              autoComplete="off"
            />
          </div>
        </div>
        <p
          className="text-[10px] text-muted-foreground"
          data-testid="familiar-firma-aviso"
        >
          La firma se registra como nombre tecleado (identificación del
          responsable). No se captura imagen ni tiene valor legal de firma
          manuscrita.
        </p>
      </fieldset>

      {/* ============ Fecha / Estado ============ */}
      <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="familiar-fecha-aplicacion">Fecha de aplicación</Label>
          <Input
            id="familiar-fecha-aplicacion"
            type="date"
            value={fechaAplicacion}
            onChange={(e) => setFechaAplicacion(e.target.value)}
            disabled={deshabilitado}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="familiar-estado">Estado</Label>
          {archivada ? (
            <Input
              id="familiar-estado"
              value="Archivada"
              disabled
              readOnly
              aria-readonly
            />
          ) : (
            <Select
              value={estado}
              onValueChange={(v) =>
                setEstado(v as EstadoEntrevistaFamiliar)
              }
              disabled={deshabilitado}
            >
              <SelectTrigger id="familiar-estado">
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

      {/* ============ Footer accesible: Archivar / Guardar ============ */}
      <div
        className="sticky bottom-0 -mx-6 mt-2 flex flex-col-reverse gap-2 border-t bg-background px-6 py-3 sm:flex-row sm:items-center sm:justify-end"
        role="group"
        aria-label="Acciones de la entrevista familiar"
        data-testid="entrevista-familiar-footer"
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleArchivar}
          disabled={deshabilitado || archivada}
          data-testid="entrevista-familiar-archivar"
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
          data-testid="entrevista-familiar-guardar"
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

// =========================================================================
// Sub-componentes
// =========================================================================

function useFirstSkipTrue() {
  // Pequeño helper para evitar reset por hidratación inicial de sessionStorage.
  // Conservado idéntico al patrón del form infantil (IMPL-20260821-01).
  const ref = useState(() => ({ current: true }))[0];
  return ref;
}

interface CheckboxLineProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}
function CheckboxLine({
  id,
  label,
  checked,
  onChange,
  disabled,
}: CheckboxLineProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        data-testid={id}
        aria-label={label}
      />
      <span>{label}</span>
    </label>
  );
}

interface HabitItemInputProps {
  index: number;
  pregunta: string;
  subcampo: string | null;
  item: BloqueHabito;
  onRespuesta: (value: string) => void;
  onRespuestaSubcampo: (value: string | null) => void;
  disabled: boolean;
}
function HabitItemInput({
  index: _index,
  pregunta,
  subcampo,
  item,
  onRespuesta,
  onRespuestaSubcampo,
  disabled,
}: HabitItemInputProps) {
  return (
    <li
      className="space-y-1.5 rounded-md border bg-background p-3"
      data-testid={`familiar-habito-${item.orden}`}
    >
      <p className="text-sm font-medium">
        <span className="mr-1 text-muted-foreground">{item.orden}.</span>
        <span>{pregunta}</span>
      </p>
      <Textarea
        rows={2}
        value={item.respuesta}
        onChange={(e) => onRespuesta(e.target.value)}
        maxLength={1500}
        disabled={disabled}
        aria-label={`Respuesta hábito ${item.orden}`}
        data-testid={`familiar-habito-${item.orden}-respuesta`}
      />
      {subcampo !== null && (
        <div className="space-y-1.5">
          <p className="text-xs italic text-muted-foreground">{subcampo}</p>
          <Textarea
            rows={2}
            value={item.respuestaSubcampo ?? ''}
            onChange={(e) =>
              onRespuestaSubcampo(e.target.value === '' ? null : e.target.value)
            }
            maxLength={1500}
            disabled={disabled}
            aria-label={`Subcampo hábito ${item.orden}`}
            data-testid={`familiar-habito-${item.orden}-subcampo`}
          />
        </div>
      )}
    </li>
  );
}

// =========================================================================
// Helpers de mapeo etiqueta literal → campo zod
// =========================================================================

function campoPorEtiqueta(
  etiqueta: string,
  side: 'mama' | 'papa',
): keyof BloqueProgenitor {
  switch (etiqueta) {
    case 'Nombre':
      return 'nombre';
    case 'Teléfono celular':
      return 'telefonoCelular';
    case 'Edad':
      return 'edad';
    case 'Nivel de estudios':
      return 'nivelEstudios';
    case 'ocupación':
      return 'ocupacion';
    case 'Horario de trabajo':
      return 'horarioTrabajo';
    default:
      // Defensivo: no llegamos aquí (etiquetas vienen del array literal).
      // Mantener el cast para no satisfacer a stricter lints sin tocar TS.
      void side;
      return 'nombre';
  }
}

function maxPorCampo(etiqueta: string): number {
  switch (etiqueta) {
    case 'Nombre':
      return 200;
    case 'Teléfono celular':
      return 50;
    case 'Edad':
      return 20;
    case 'Nivel de estudios':
      return 200;
    case 'ocupación':
      return 200;
    case 'Horario de trabajo':
      return 300;
    default:
      return 200;
  }
}
