/**
 * Formulario de la entrevista inicial del niño — v2 (SPEC_TEC_09 §7, ADR-20260820-05).
 *
 * Renderiza los tres bloques en orden literal del documento:
 *   (1) Entrevista inicial — 23 preguntas literales (orden 1..23, §4.1).
 *   (2) Ambiente Familiar / Escuela — encabezado literal + 16 celdas (8 filas × 2
 *       columnas) con 2 instrucciones de dibujo (carga de imagen, evidencia) y
 *       14 preguntas (§4.2 / §4.4, D9-10).
 *   (3) Directorio de emergencia — 4 contactos con etiqueta literal + nombre +
 *       teléfono (§4.3, D9-11).
 *
 * - UI cliente (`'use client'`) que llama a los server actions de
 *   `services/alumnos/entrevista-actions.ts`.
 * - Mobile-first (P-UX4): usable a 375×812 sin scroll horizontal.
 * - Anti-doble-submit (P-UX): botón deshabilitado durante `isPending`.
 * - El texto de la pregunta/instrucción/etiqueta NO es editable.
 * - Accesibilidad WCAG 2.1 AA: labels asociados, foco visible, navegación por teclado.
 *
 * Decisiones funcionales vigentes (privacidad, no-IA, retención):
 *   - Gate A1: `avisoAceptado` deshabilita el formulario y muestra banner.
 *   - El directorio NO se envía a IA (AC-21).
 *   - No `deleteEntrevista` (C1+C2).
 *   - Edición in-place (D1).
 */
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { Loader2, FileText, Archive, Upload, Image as ImageIcon } from 'lucide-react';
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
  ENTREVISTA_BLOQUE1,
  ENTREVISTA_BLOQUE1_TOTAL,
  ENTREVISTA_BLOQUE2_CELDAS,
  ENTREVISTA_BLOQUE2_ENCABEZADO,
  DIRECTORIO_ENCABEZADO,
  DIRECTORIO_TOTAL,
  buildRespuestasVaciasV2,
  buildDirectorioVacio,
  type Bloque2Celda,
  type Directorio,
  type DirectorioContacto,
  type RespuestasV2,
  type EstadoEntrevista,
} from '@/types/entrevista';

interface AlumnoLite {
  id: string;
  nombre: string;
  grado: string;
}

export interface EntrevistaInicialFormProps {
  alumno: AlumnoLite;
  /** Fila de entrevista existente (si ya fue creada/archivada). */
  initial?: {
    fecha_aplicacion: string;
    estado: EstadoEntrevista;
    respuestas: RespuestasV2;
    directorio: Directorio;
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

/** MIME permitidos para evidencia de dibujo (imágenes). */
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * IMPL-20260821-01 — pasos del stepper 1/2/3 (bloque 1, bloque 2,
 * bloque 3). El cuestionario literal y los tipos NO cambian; sólo se
 * añade navegación para que el modal no muestre los 3 bloques completos
 * en un viewport pequeño.
 */
type Step = 1 | 2 | 3;
const STEPS: ReadonlyArray<{ id: Step; label: string; short: string }> = [
  { id: 1, label: 'Entrevista inicial', short: '1 de 3 · Entrevista inicial' },
  { id: 2, label: 'Ambiente familiar y escuela', short: '2 de 3 · Ambiente y escuela' },
  { id: 3, label: 'Directorio de emergencia', short: '3 de 3 · Directorio' },
];
const STORAGE_PREFIX = 'entrevista:nino:v1:';

export function EntrevistaInicialForm({
  alumno,
  initial,
  avisoAceptado,
  onSaved,
  onError,
}: EntrevistaInicialFormProps) {
  const fechaPorDefecto = useMemo(
    () => initial?.fecha_aplicacion ?? todayISODate(),
    [initial?.fecha_aplicacion],
  );

  const initialRespuestas: RespuestasV2 = useMemo(() => {
    if (initial?.respuestas?.entrevista_inicial?.items?.length === ENTREVISTA_BLOQUE1_TOTAL) {
      return initial.respuestas;
    }
    return buildRespuestasVaciasV2({
      nombreAlumno: alumno.nombre,
      fechaAplicacion: fechaPorDefecto,
    });
  }, [initial, alumno.nombre, fechaPorDefecto]);

  const initialDirectorio: Directorio = useMemo(() => {
    if (
      initial?.directorio?.contactos?.length === DIRECTORIO_TOTAL &&
      initial.directorio.contactos.every((c) => typeof c.etiqueta === 'string')
    ) {
      return initial.directorio;
    }
    return buildDirectorioVacio({ nombreAlumno: alumno.nombre });
  }, [initial, alumno.nombre]);

  /**
   * IMPL-20260821-01 — clave de persistencia local (borrador) por
   * alumno. Permite que al cerrar y reabrir el modal (mismo tab) la
   * docente recupere lo capturado sin haber pulsado Guardar. NO
   * sustituye el guardado real (`upsertEntrevista`) ni afecta RLS ni la
   * tabla `entrevista_inicial_alumno` — sólo es una memoria temporal
   * del navegador.
   */
  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}${alumno.id}`,
    [alumno.id],
  );

  /**
   * Hidratación inicial: si NO hay `initial` del servidor (entrevista aún
   * no persistida) intentamos cargar un borrador desde `sessionStorage`.
   * Se hace en el inicializador perezoso de `useState` (no en
   * `useEffect`) para evitar la condición de carrera con el efecto de
   * sincronización con `initial` que aparece más abajo.
   */
  function loadRespuestasInicial(): RespuestasV2 {
    if (initial?.respuestas) return initial.respuestas;
    if (typeof window === 'undefined') return initialRespuestas;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return initialRespuestas;
      const parsed = JSON.parse(raw) as { respuestas?: RespuestasV2 };
      if (parsed.respuestas?.entrevista_inicial?.items?.length === ENTREVISTA_BLOQUE1_TOTAL) {
        return parsed.respuestas;
      }
    } catch {
      // sessionStorage corrupto: caer al inicial vacío.
    }
    return initialRespuestas;
  }

  function loadDirectorioInicial(): Directorio {
    if (initial?.directorio) return initial.directorio;
    if (typeof window === 'undefined') return initialDirectorio;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return initialDirectorio;
      const parsed = JSON.parse(raw) as { directorio?: Directorio };
      if (
        parsed.directorio?.contactos?.length === DIRECTORIO_TOTAL &&
        parsed.directorio.contactos.every((c) => typeof c.etiqueta === 'string')
      ) {
        return parsed.directorio;
      }
    } catch {
      // ignore
    }
    return initialDirectorio;
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

  function loadEstadoInicial(): EstadoEntrevista {
    if (initial?.estado) return initial.estado;
    if (typeof window === 'undefined') return 'borrador';
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return 'borrador';
      const parsed = JSON.parse(raw) as { estado?: EstadoEntrevista };
      if (parsed.estado === 'borrador' || parsed.estado === 'completa') {
        return parsed.estado;
      }
    } catch {
      // ignore
    }
    return 'borrador';
  }

  const [respuestas, setRespuestas] = useState<RespuestasV2>(loadRespuestasInicial);
  const [directorio, setDirectorio] = useState<Directorio>(loadDirectorioInicial);
  const [fechaAplicacion, setFechaAplicacion] = useState<string>(loadFechaInicial);
  const [estado, setEstado] = useState<EstadoEntrevista>(loadEstadoInicial);
  const [isPending, startTransition] = useTransition();
  const [isArchiving, startArchiving] = useTransition();

  // === Stepper (IMPL-20260821-01) ===
  const [step, setStep] = useState<Step>(1);
  const stepperRef = useRef<HTMLOListElement>(null);

  // Persistencia tras cada cambio (best-effort; sin await).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({ respuestas, directorio, fechaAplicacion, estado }),
      );
    } catch {
      // ignore (cuota llena / storage deshabilitado)
    }
  }, [storageKey, respuestas, directorio, fechaAplicacion, estado]);

  // Limpia el borrador al guardar o archivar exitosamente (vía callbacks).
  const clearLocalDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  /**
   * Scroll al inicio del contenedor scrollable del modal al cambiar de
   * paso. El contenedor scrollable es el ancestro con `overflow-y-auto`
   * (`entrevista-dialog-body`); caemos al `dialog` content como fallback.
   * Se aplica tras el render (requestAnimationFrame) para que el
   * navegador ya haya repintado el nuevo bloque visible.
   */
  const scrollToStepTop = useCallback(() => {
    if (typeof document === 'undefined') return;
    requestAnimationFrame(() => {
      const body = document.querySelector(
        '[data-testid="entrevista-dialog-body"]',
      ) as HTMLElement | null;
      const target = body ?? document.querySelector('[role="dialog"]');
      if (target) target.scrollTop = 0;
    });
  }, []);

  const goToStep = useCallback(
    (next: Step) => {
      setStep(next);
      scrollToStepTop();
    },
    [scrollToStepTop],
  );

  /**
   * Sincroniza el estado cuando `initial` cambia (típicamente cuando la
   * server action `getEntrevista` resuelve). Usa un ref para NO
   * ejecutarse en el primer render — el estado ya quedó inicializado
   * con la hidratación de sessionStorage (si aplica) en los inicializadores
   * perezosos de useState; sobrescribirlo aquí rompería la persistencia
   * del borrador en el ciclo de apertura del modal.
   */
  const skipFirstSyncRef = useRef(true);
  useEffect(() => {
    if (skipFirstSyncRef.current) {
      skipFirstSyncRef.current = false;
      return;
    }
    setRespuestas(initialRespuestas);
    setDirectorio(initialDirectorio);
    setFechaAplicacion(fechaPorDefecto);
    setEstado(initial?.estado ?? 'borrador');
  }, [initialRespuestas, initialDirectorio, fechaPorDefecto, initial?.estado]);

  // === Mutadores bloque 1 ===
  function setBloque1Respuesta(orden: number, value: string) {
    setRespuestas((prev) => ({
      ...prev,
      entrevista_inicial: {
        items: prev.entrevista_inicial.items.map((it) =>
          it.orden === orden ? { ...it, respuesta: value } : it,
        ),
      },
    }));
  }

  // === Mutadores bloque 2 ===
  function setBloque2CeldaRespuesta(orden: number, value: string) {
    setRespuestas((prev) => ({
      ...prev,
      ambiente_familiar_escuela: {
        encabezado: prev.ambiente_familiar_escuela.encabezado,
        celdas: prev.ambiente_familiar_escuela.celdas.map((c) =>
          c.orden === orden && c.tipo === 'pregunta'
            ? { ...c, respuesta: value }
            : c,
        ),
      },
    }));
  }

  function setBloque2Evidencia(
    orden: number,
    file: File | null,
    previewUrl: string | null,
  ) {
    setRespuestas((prev) => ({
      ...prev,
      ambiente_familiar_escuela: {
        encabezado: prev.ambiente_familiar_escuela.encabezado,
        celdas: prev.ambiente_familiar_escuela.celdas.map((c) => {
          if (c.orden !== orden || c.tipo !== 'dibujo') return c;
          if (!file || !previewUrl) {
            return { ...c, evidencia: null };
          }
          return {
            ...c,
            evidencia: {
              url: previewUrl,
              mime: MIMES_PERMITIDOS.includes(file.type as (typeof MIMES_PERMITIDOS)[number])
                ? (file.type as (typeof MIMES_PERMITIDOS)[number])
                : 'image/jpeg',
            },
          };
        }),
      },
    }));
  }

  // === Mutadores bloque 3 (directorio) ===
  function setDirectorioCampo(
    orden: number,
    campo: 'nombre' | 'telefono',
    value: string,
  ) {
    setDirectorio((prev) => ({
      ...prev,
      contactos: prev.contactos.map((c) =>
        c.orden === orden ? { ...c, [campo]: value } : c,
      ),
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!avisoAceptado) {
      onError?.('Se requiere aceptar el aviso de privacidad antes de registrar la entrevista');
      return;
    }

    // archivada NO se envía a upsert: se cambia vía archivarEntrevista.
    const estadoPayload: 'borrador' | 'completa' =
      estado === 'archivada' ? 'completa' : estado;

    startTransition(async () => {
      const res = await upsertEntrevista({
        alumnoId: alumno.id,
        fechaAplicacion,
        estado: estadoPayload,
        respuestas,
        directorio,
      });
      if (!res.ok) {
        onError?.(res.error ?? 'Error al guardar');
        return;
      }
      clearLocalDraft();
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
      clearLocalDraft();
      onSaved?.('Entrevista archivada');
    });
  }

  const archivada = estado === 'archivada';
  const deshabilitado = !avisoAceptado || isPending || isArchiving;
  const stepActual = STEPS.find((s) => s.id === step)!;
  const canPrev = step > 1 && !deshabilitado;
  const canNext = step < 3 && !deshabilitado;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2" data-testid="entrevista-form">
      <header className="space-y-1">
        <h3 className="text-base font-semibold leading-none">Entrevista inicial</h3>
        <p className="text-xs text-muted-foreground">
          {stepActual.short}. Cuestionario literal del documento. Captura
          editable en sitio; archivar al finalizar el ciclo.
        </p>
      </header>

      {/* ============ Stepper 1/2/3 (IMPL-20260821-01) ============ */}
      <nav aria-label="Pasos de la entrevista" data-testid="entrevista-stepper">
        <ol
          ref={stepperRef}
          className="flex items-center gap-2 text-xs"
          role="list"
        >
          {STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isReachable = s.id <= step || !deshabilitado;
            return (
              <li
                key={s.id}
                role="listitem"
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => goToStep(s.id)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Paso ${s.id} de 3: ${s.label}${isActive ? ' (activo)' : ''}`}
                  disabled={!isReachable || deshabilitado}
                  data-testid={`entrevista-stepper-step-${s.id}`}
                  data-active={isActive ? 'true' : 'false'}
                  className={
                    'inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full border px-3 font-medium transition-colors ' +
                    (isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:bg-accent')
                  }
                >
                  {s.id}
                </button>
                {i < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="h-px w-6 bg-border"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
        <p
          aria-live="polite"
          className="sr-only"
          data-testid="entrevista-stepper-status"
        >
          Paso {step} de 3: {stepActual.label}
        </p>
      </nav>

      {!avisoAceptado && (
        <div
          className="rounded-md border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-900"
          data-testid="entrevista-gate-aviso"
        >
          Acepta el aviso de privacidad para registrar la entrevista.
        </div>
      )}

      {/* ============ BLOQUE 1 — Entrevista inicial (23 preguntas) ============ */}
      <fieldset
        hidden={step !== 1}
        disabled={deshabilitado}
        className="space-y-4"
        aria-label="Bloque 1 — Entrevista inicial"
        data-testid="entrevista-bloque-1"
        data-step="1"
      >
        <legend className="text-sm font-semibold">Bloque 1 — Entrevista inicial</legend>
        {ENTREVISTA_BLOQUE1.map((q) => {
          const item = respuestas.entrevista_inicial.items.find(
            (it) => it.orden === q.orden,
          );
          const id = `entrevista-item-${q.orden}`;
          return (
            <div
              key={q.orden}
              className="space-y-1.5"
              data-testid={`entrevista-item-${q.orden}`}
            >
              <Label htmlFor={id} className="text-sm font-medium">
                <span className="text-muted-foreground">{q.orden}.</span>{' '}
                <span>{q.pregunta}</span>
              </Label>
              <Input
                id={id}
                value={item?.respuesta ?? ''}
                onChange={(e) => setBloque1Respuesta(q.orden, e.target.value)}
                maxLength={1000}
                aria-label={`Respuesta ${q.orden}`}
              />
            </div>
          );
        })}
      </fieldset>

      {/* ============ BLOQUE 2 — Ambiente Familiar / Escuela (16 celdas) ============ */}
      <fieldset
        hidden={step !== 2}
        disabled={deshabilitado}
        className="space-y-4"
        aria-label="Bloque 2 — Ambiente familiar y escuela"
        data-testid="entrevista-bloque-2"
        data-step="2"
      >
        <legend className="text-sm font-semibold">Bloque 2 — Ambiente familiar / escuela</legend>
        <div className="rounded-md border bg-muted/20 p-3 text-xs">
          <p className="font-medium">
            {ENTREVISTA_BLOQUE2_ENCABEZADO.lineaInstitucion}
          </p>
          <p className="text-muted-foreground">
            {ENTREVISTA_BLOQUE2_ENCABEZADO.titulo}
          </p>
          <p className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <span>
              <span className="font-medium">FECHA:</span>{' '}
              <span className="text-muted-foreground">{fechaAplicacion}</span>
            </span>
            <span>
              <span className="font-medium">NOMBRE DEL ALUMNO:</span>{' '}
              <span className="text-muted-foreground">{alumno.nombre}</span>
            </span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-full grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
            {/* Encabezados de columna */}
            <div className="hidden border-b pb-1 text-xs font-semibold uppercase sm:block">
              AMBIENTE FAMILIAR
            </div>
            <div className="hidden border-b pb-1 text-xs font-semibold uppercase sm:block">
              ESCUELA
            </div>
            {/* Filas (zigzag: AF | ESC) */}
            {ENTREVISTA_BLOQUE2_CELDAS.map((c) => {
              const celdaActual = respuestas.ambiente_familiar_escuela.celdas.find(
                (x) => x.orden === c.orden,
              ) as Bloque2Celda | undefined;
              return (
                <Bloque2CeldaInput
                  key={c.orden}
                  celda={c}
                  actual={celdaActual}
                  deshabilitado={deshabilitado}
                  onRespuesta={setBloque2CeldaRespuesta}
                  onEvidencia={setBloque2Evidencia}
                />
              );
            })}
          </div>
        </div>
      </fieldset>

      {/* ============ BLOQUE 3 — Directorio de emergencia (4 contactos) + Fecha/Estado ============ */}
      <fieldset
        hidden={step !== 3}
        disabled={deshabilitado}
        className="space-y-3"
        aria-label="Bloque 3 — Directorio de emergencia"
        data-testid="entrevista-bloque-3"
        data-step="3"
      >
        <legend className="text-sm font-semibold">Bloque 3 — Directorio de emergencia</legend>
        <div className="rounded-md border bg-muted/20 p-3 text-xs">
          <p className="font-medium">{directorio.titulo}</p>
          <p className="text-muted-foreground">{directorio.subtitulo}</p>
          <p className="mt-2">
            <span className="font-medium">NOMBRE DEL ALUMNO:</span>{' '}
            <span className="text-muted-foreground">{alumno.nombre}</span>
          </p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {directorio.encabezadoTelefonos}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {directorio.contactos.map((c) => (
            <DirectorioContactoInput
              key={c.orden}
              contacto={c}
              deshabilitado={deshabilitado}
              onChange={setDirectorioCampo}
            />
          ))}
        </div>

        <div className="mt-2 grid gap-3 border-t pt-3 sm:grid-cols-2">
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
      </fieldset>

      {/* ============ Footer accesible: Anterior/Siguiente + Archivar/Guardar ============ */}
      <div
        className="sticky bottom-0 -mx-6 mt-2 flex flex-col-reverse gap-2 border-t bg-background px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="entrevista-footer"
        role="group"
        aria-label="Navegación y acciones de la entrevista"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep((step - 1) as Step)}
            disabled={!canPrev}
            aria-label="Paso anterior"
            data-testid="entrevista-stepper-prev"
          >
            ← Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep((step + 1) as Step)}
            disabled={!canNext}
            aria-label="Paso siguiente"
            data-testid="entrevista-stepper-next"
          >
            Siguiente →
          </Button>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
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
      </div>
    </form>
  );
}

// =========================================================================
// Sub-componentes
// =========================================================================

interface Bloque2CeldaInputProps {
  celda: (typeof ENTREVISTA_BLOQUE2_CELDAS)[number];
  actual: Bloque2Celda | undefined;
  deshabilitado: boolean;
  onRespuesta: (orden: number, value: string) => void;
  onEvidencia: (orden: number, file: File | null, previewUrl: string | null) => void;
}

function Bloque2CeldaInput({
  celda,
  actual,
  deshabilitado,
  onRespuesta,
  onEvidencia,
}: Bloque2CeldaInputProps) {
  const id = `entrevista-celda-${celda.orden}`;
  const [preview, setPreview] = useState<string | null>(
    actual?.tipo === 'dibujo' ? actual.evidencia?.url ?? null : null,
  );

  useEffect(() => {
    setPreview(actual?.tipo === 'dibujo' ? actual.evidencia?.url ?? null : null);
  }, [actual]);

  if (celda.tipo === 'dibujo') {
    const instruccion =
      celda.tipo === 'dibujo' ? (celda as { instruccion: string }).instruccion : '';
    const evidencia = actual?.tipo === 'dibujo' ? actual.evidencia : null;
    return (
      <div
        className="space-y-1.5 rounded-md border bg-background p-2"
        data-testid={`entrevista-celda-${celda.orden}`}
      >
        <Label htmlFor={id} className="text-xs font-medium">
          <span className="text-muted-foreground">{celda.orden}.</span>{' '}
          {instruccion}
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deshabilitado}
            onClick={() => document.getElementById(`${id}-file`)?.click()}
            data-testid={`entrevista-celda-${celda.orden}-upload`}
          >
            <Upload className="mr-2 h-4 w-4" />
            {evidencia ? 'Cambiar' : 'Subir'}
          </Button>
          <input
            id={`${id}-file`}
            type="file"
            accept={MIMES_PERMITIDOS.join(',')}
            className="hidden"
            disabled={deshabilitado}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) {
                onEvidencia(celda.orden, null, null);
                setPreview(null);
                return;
              }
              // Previsualización local (la subida real al bucket es opcional/MVP):
              // mantenemos el contrato `evidencia: { url, mime }` con un object URL.
              const url = URL.createObjectURL(file);
              onEvidencia(celda.orden, file, url);
              setPreview(url);
            }}
          />
          {preview ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>{evidencia?.mime ?? 'imagen'}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin evidencia</span>
          )}
        </div>
      </div>
    );
  }

  // tipo 'pregunta'
  const pregunta =
    celda.tipo === 'pregunta' ? (celda as { pregunta: string }).pregunta : '';
  const respuesta = actual?.tipo === 'pregunta' ? actual.respuesta : '';
  return (
    <div
      className="space-y-1.5"
      data-testid={`entrevista-celda-${celda.orden}`}
    >
      <Label htmlFor={id} className="text-xs font-medium">
        <span className="text-muted-foreground">{celda.orden}.</span> {pregunta}
      </Label>
      <Textarea
        id={id}
        value={respuesta}
        onChange={(e) => onRespuesta(celda.orden, e.target.value)}
        maxLength={1000}
        rows={2}
        aria-label={`Respuesta celda ${celda.orden}`}
      />
    </div>
  );
}

interface DirectorioContactoInputProps {
  contacto: DirectorioContacto;
  deshabilitado: boolean;
  onChange: (orden: number, campo: 'nombre' | 'telefono', value: string) => void;
}

function DirectorioContactoInput({
  contacto,
  deshabilitado,
  onChange,
}: DirectorioContactoInputProps) {
  const idNombre = `directorio-${contacto.orden}-nombre`;
  const idTel = `directorio-${contacto.orden}-telefono`;
  return (
    <div
      className="space-y-1.5 rounded-md border p-2"
      data-testid={`directorio-contacto-${contacto.orden}`}
    >
      <p className="text-xs font-semibold">{contacto.etiqueta}</p>
      <div className="space-y-1.5">
        <Label htmlFor={idNombre} className="text-xs">
          Nombre
        </Label>
        <Input
          id={idNombre}
          value={contacto.nombre}
          onChange={(e) => onChange(contacto.orden, 'nombre', e.target.value)}
          maxLength={200}
          disabled={deshabilitado}
          aria-label={`Nombre ${contacto.etiqueta}`}
        />
        <Label htmlFor={idTel} className="text-xs">
          {DIRECTORIO_ENCABEZADO.encabezadoTelefonos}
        </Label>
        <Input
          id={idTel}
          value={contacto.telefono}
          onChange={(e) => onChange(contacto.orden, 'telefono', e.target.value)}
          maxLength={50}
          disabled={deshabilitado}
          aria-label={`Teléfono ${contacto.etiqueta}`}
          inputMode="tel"
        />
      </div>
    </div>
  );
}

// Suprimir warning de import no usado en builds estrictos (mantiene paridad v1).
void ENTREVISTA_BLOQUE2_ENCABEZADO;