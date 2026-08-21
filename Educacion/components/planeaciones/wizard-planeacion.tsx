/**
 * Wizard adaptativo de planeación (T9 + D-FIN-6).
 * SPEC_TEC_04 §3 / SPEC_TEC_02 §5.3.6.
 * SPEC_MODALIDADES_2026-08-17 — Soporta las 6 modalidades NEM.
 *
 * Estructura dinámica según modalidad:
 *  - proyecto_comunitario: 8 pasos (legacy MVP)
 *  - unidad_didactica:      Modalidad + Banco palabras + Problema + Calendario L M M J V
 *  - abj:                   Modalidad + Problema + Inicio/Desarrollo/Cierre (3 momentos)
 *  - rincones:              Modalidad + Problema + Lista rincones + Reglas
 *  - centros_interes:       Modalidad + Tema + Preguntas detonadoras
 *  - taller_critico:        Modalidad + Problema + Reflexión/Producción/Socialización
 */
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CampoFormativo, EjeArticulador, PDA, Contenido } from '@/services/catalogo/catalogo';
import { createPlaneacion } from '@/services/planeaciones/planeacion-actions';
import { IAContextoProblemaPanel } from '@/components/ia/ia-contexto-problema-panel';
import {
  WizardModalidadSelector,
} from '@/app/(app)/planeaciones/nueva/_components/wizard-modalidad-selector';
import { WizardBancoPalabras } from '@/app/(app)/planeaciones/nueva/_components/wizard-banco-palabras';
import {
  WizardCalendarioSemanal,
} from '@/app/(app)/planeaciones/nueva/_components/wizard-calendario-semanal';
import {
  buildModalidadData,
  buildSteps,
  tieneDatosEspecificos,
  limpiarDatosEspecificos,
  INITIAL_FORM,
  MODALIDADES_LABELS,
  type Modalidad,
  type FormState,
} from '@/components/planeaciones/wizard-modalidad-data';

interface Props {
  docenteId: string;
  grupoId: string;
  cct: string;
  nivel: string | null;
  campos: CampoFormativo[];
  ejes: EjeArticulador[];
  pdas: PDA[];
  contenidos: Contenido[];
}

/**
 * Sub-componente para la lista de preguntas detonadoras (Centros de Interés).
 * Mantenido fuera del Wizard para cumplir rules-of-hooks (no useState
 * dentro de funciones renderXxx).
 */
function PreguntasDet({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [inputPregunta, setInputPregunta] = useState('');
  return (
    <div className="space-y-3">
      <div>
        <Label>Preguntas detonadoras</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Escribe una pregunta y presiona Enter. Mínimo 1.
        </p>
      </div>
      <Input
        value={inputPregunta}
        onChange={(e) => setInputPregunta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputPregunta.trim()) {
            e.preventDefault();
            onChange([...value, inputPregunta.trim()]);
            setInputPregunta('');
          }
        }}
        placeholder="¿Qué pasaría si los oficios desaparecieran?"
      />
      <ul className="space-y-2">
        {value.map((p, i) => (
          <li key={i} className="flex items-start gap-2 rounded-md border bg-card p-2">
            <span className="flex-1 text-sm">{p}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-xs text-destructive"
              aria-label={`Eliminar pregunta ${p}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Devuelve la lista de pasos dinámicos para la modalidad.
 * Implementación importada de wizard-modalidad-data (testable sin React).
 */

export function WizardPlaneacion({
  docenteId,
  grupoId,
  cct,
  nivel,
  campos,
  ejes,
  pdas,
  contenidos: _contenidos,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const steps = useMemo(() => buildSteps(form.modalidad), [form.modalidad]);
  const [paso, setPaso] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cambioModalidad, setCambioModalidad] = useState<{
    from: Modalidad;
    to: Modalidad;
  } | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCampo(codigo: string) {
    setForm((f) => ({
      ...f,
      camposFormativos: f.camposFormativos.includes(codigo)
        ? f.camposFormativos.filter((c) => c !== codigo)
        : [...f.camposFormativos, codigo],
    }));
  }

  function toggleEje(codigo: string) {
    setForm((f) => ({
      ...f,
      ejesArticuladores: f.ejesArticuladores.includes(codigo)
        ? f.ejesArticuladores.filter((c) => c !== codigo)
        : [...f.ejesArticuladores, codigo],
    }));
  }

  function togglePDA(codigo: string) {
    setForm((f) => ({
      ...f,
      pdas: f.pdas.includes(codigo)
        ? f.pdas.filter((c) => c !== codigo)
        : [...f.pdas, codigo],
    }));
  }

  /**
   * SPEC_MODALIDADES §P1.2 — cambio de modalidad a mitad del wizard.
   * Si hay datos específicos de la modalidad actual, mostramos un
   * Dialog de confirmación. Al confirmar, limpiamos `modalidad_data`
   * y los campos específicos (banco/sesiones/rincones/tema/fases).
   * Mantenemos los campos comunes (nombre, problema, campos, pdas,
   * ejes, periodo).
   */
  function cambiarModalidad(m: Modalidad) {
    if (m === form.modalidad) return;
    if (tieneDatosEspecificos(form, form.modalidad)) {
      setCambioModalidad({ from: form.modalidad, to: m });
    } else {
      setForm((f) => limpiarDatosEspecificos(f, m));
      setPaso(1);
      setError(null);
    }
  }

  function confirmarCambioModalidad() {
    if (!cambioModalidad) return;
    setForm((f) => limpiarDatosEspecificos(f, cambioModalidad.to));
    setPaso(1);
    setError(null);
    setCambioModalidad(null);
  }

  function cancelarCambioModalidad() {
    setCambioModalidad(null);
  }

  const progreso = ((paso - 1) / (steps.length - 1)) * 100;
  const stepName: string = steps[paso - 1] ?? steps[0] ?? 'Modalidad';
  const isProyectoComunitario = form.modalidad === 'proyecto_comunitario';

  function validarPasoActual(): string | null {
    const esCompartido = (msg: string) => {
      if (form.nombre.length < 3) return 'Nombre mínimo 3 caracteres';
      if (form.problemaContexto.length < 10) return 'Detalla el problema (≥10 caracteres)';
      if (form.ajustesRazonables.length < 20)
        return 'Describe ajustes razonables (≥20 caracteres)';
      if (!form.periodoInicio || !form.periodoFin)
        return 'Selecciona fecha de inicio y fin';
      if (form.periodoFin < form.periodoInicio)
        return 'La fecha fin debe ser posterior al inicio';
      return msg;
    };

    switch (stepName) {
      case 'Modalidad':
        return null;
      case 'Contexto':
      case 'Problema':
        return esCompartido('');
      case 'Banco de palabras':
        return form.bancoPalabras.length === 0
          ? 'Agrega al menos 1 palabra al banco'
          : null;
      case 'Calendario semanal':
        return Object.keys(form.sesionesSemana).length === 0
          ? 'Asigna al menos 1 sesión al calendario'
          : null;
      case 'Lista de rincones':
        return form.rincones.filter((r) => r.nombre.trim()).length < 2
          ? 'Define al menos 2 rincones con nombre'
          : null;
      case 'Materiales y reglas':
        return form.rincones.some((r) => !r.materiales.trim())
          ? 'Cada rincón debe listar materiales'
          : null;
      case 'Tema del centro':
        return form.temaCentro.trim().length < 3
          ? 'Define el tema del centro (≥3 caracteres)'
          : null;
      case 'Preguntas detonadoras':
        return form.preguntasDet.length === 0
          ? 'Agrega al menos 1 pregunta detonadora'
          : null;
      case 'Inicio del juego':
        return form.fases.inicioJuego.trim().length < 5
          ? 'Describe el inicio del juego (≥5 caracteres)'
          : null;
      case 'Desarrollo del juego':
        return form.fases.desarrolloJuego.trim().length < 5
          ? 'Describe el desarrollo del juego (≥5 caracteres)'
          : null;
      case 'Cierre/reflexión':
        return form.fases.cierreJuego.trim().length < 5
          ? 'Describe el cierre/reflexión (≥5 caracteres)'
          : null;
      case 'Reflexión inicial':
        return form.fases.reflexion.trim().length < 5
          ? 'Describe la reflexión inicial (≥5 caracteres)'
          : null;
      case 'Producción':
        return form.fases.produccion.trim().length < 5
          ? 'Describe la producción esperada (≥5 caracteres)'
          : null;
      case 'Socialización':
        return form.fases.socializacion.trim().length < 5
          ? 'Describe cómo se socializará (≥5 caracteres)'
          : null;
      case 'Campos':
        return form.camposFormativos.length === 0
          ? 'Selecciona al menos un campo formativo'
          : null;
      case 'PDA':
        return form.pdas.length === 0 ? 'Selecciona al menos un PDA' : null;
      case 'Ejes':
        return null; // ejes opcionales
      case 'Banco':
        return null; // banco palabras (legacy proyecto_comunitario)
      case 'Sesiones':
        return null; // sesiones placeholder legacy
      case 'Revisión':
      case 'Guardar':
        return null;
      default:
        return null;
    }
  }

  function siguiente() {
    const err = validarPasoActual();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPaso((p) => Math.min(steps.length, p + 1));
  }

  function anterior() {
    setError(null);
    setPaso((p) => Math.max(1, p - 1));
  }

  function guardar() {
    const err = validarPasoActual();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const modalidadData = buildModalidadData(form);
    startTransition(async () => {
      const res = await createPlaneacion({
        docenteId,
        grupoId,
        cct,
        nombre: form.nombre,
        modalidad: form.modalidad,
        problemaContexto: form.problemaContexto,
        proposito: form.proposito || undefined,
        camposFormativos: form.camposFormativos,
        ejesArticuladores: form.ejesArticuladores,
        pdas: form.pdas,
        contenidoRef: form.contenidoRef ?? undefined,
        ajustesRazonables: form.ajustesRazonables,
        bancoPalabras: form.bancoPalabras,
        metadata: { modalidad_data: modalidadData },
        periodoInicio: form.periodoInicio,
        periodoFin: form.periodoFin,
      });
      if (!res.ok) {
        setError(res.error ?? 'Error desconocido');
        return;
      }
      router.push(`/planeaciones/${res.id}`);
      router.refresh();
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Render de pasos
  // ─────────────────────────────────────────────────────────────────────

  function renderModalidad() {
    return (
      <WizardModalidadSelector value={form.modalidad} onChange={cambiarModalidad} />
    );
  }

  function renderContexto() {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="nombre">Nombre de la planeación</Label>
          <Input
            id="nombre"
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="Ej. Cuidamos el agua de nuestra escuela"
          />
        </div>
        <div>
          <Label htmlFor="problema">
            {form.modalidad === 'centros_interes'
              ? 'Contexto del centro de interés'
              : 'Problema del contexto (pregunta detonadora)'}
          </Label>
          <Textarea
            id="problema"
            value={form.problemaContexto}
            onChange={(e) => set('problemaContexto', e.target.value)}
            placeholder={
              form.modalidad === 'centros_interes'
                ? 'Contexto de la comunidad que da origen al centro'
                : '¿Por qué es importante cuidar el agua en nuestra escuela?'
            }
            rows={3}
          />
          <div className="mt-3">
            <IAContextoProblemaPanel
              modalidad={form.modalidad}
              problemaContexto={form.problemaContexto}
              proposito={form.proposito}
              ajustesRazonables={form.ajustesRazonables}
              nivel={nivel}
              onApplyProblema={(t) => set('problemaContexto', t)}
              onApplyProposito={(t) => set('proposito', t)}
              onApplyAjustes={(t) => set('ajustesRazonables', t)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="proposito">Propósito (opcional)</Label>
          <Textarea
            id="proposito"
            value={form.proposito}
            onChange={(e) => set('proposito', e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="ajustes">Ajustes razonables (inclusión)</Label>
          <Textarea
            id="ajustes"
            value={form.ajustesRazonables}
            onChange={(e) => set('ajustesRazonables', e.target.value)}
            placeholder="Estrategias para que todos los niños puedan participar."
            rows={3}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="inicio">Inicio del periodo</Label>
            <Input
              id="inicio"
              type="date"
              value={form.periodoInicio}
              onChange={(e) => set('periodoInicio', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fin">Fin del periodo</Label>
            <Input
              id="fin"
              type="date"
              value={form.periodoFin}
              onChange={(e) => set('periodoFin', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderBancoPalabras() {
    return (
      <WizardBancoPalabras
        value={form.bancoPalabras}
        onChange={(palabras) => set('bancoPalabras', palabras)}
      />
    );
  }

  function renderCalendario() {
    return (
      <WizardCalendarioSemanal
        value={form.sesionesSemana}
        onChange={(s) => set('sesionesSemana', s)}
      />
    );
  }

  function renderTemaCentro() {
    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor="tema">Tema del centro de interés</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Tema central que organiza el interés de los niños. Será el anclaje de las estaciones.
          </p>
          <Input
            id="tema"
            value={form.temaCentro}
            onChange={(e) => set('temaCentro', e.target.value)}
            placeholder="Ej. Los oficios de mi comunidad"
            className="mt-2"
          />
        </div>
      </div>
    );
  }

  function renderPreguntasDet() {
    return (
      <PreguntasDet
        value={form.preguntasDet}
        onChange={(p) => set('preguntasDet', p)}
      />
    );
  }

  function renderRinconesLista() {
    return (
      <div className="space-y-3">
        <Label>Rincones (mínimo 2)</Label>
        {form.rincones.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-md border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Rincón {i + 1}
              </span>
              {form.rincones.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'rincones',
                      form.rincones.filter((_, j) => j !== i),
                    )
                  }
                  className="text-xs text-destructive"
                >
                  Quitar
                </button>
              )}
            </div>
            <Input
              value={r.nombre}
              onChange={(e) => {
                const copia = [...form.rincones];
                const prev = copia[i] ?? { nombre: '', materiales: '', reglas: '' };
                copia[i] = { ...prev, nombre: e.target.value };
                set('rincones', copia);
              }}
              placeholder="Nombre (Ej. Rincón de lectura)"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set('rincones', [...form.rincones, { nombre: '', materiales: '', reglas: '' }])
          }
        >
          + Agregar rincón
        </Button>
      </div>
    );
  }

  function renderRinconesMateriales() {
    return (
      <div className="space-y-3">
        <Label>Materiales y reglas por rincón</Label>
        {form.rincones.map((r, i) => (
          <div key={i} className="space-y-2 rounded-md border bg-card p-3">
            <p className="text-sm font-medium">{r.nombre || `Rincón ${i + 1}`}</p>
            <div>
              <Label htmlFor={`mat-${i}`} className="text-xs">
                Materiales
              </Label>
              <Textarea
                id={`mat-${i}`}
                value={r.materiales}
                onChange={(e) => {
                  const copia = [...form.rincones];
                  const prev = copia[i] ?? { nombre: '', materiales: '', reglas: '' };
                  copia[i] = { ...prev, materiales: e.target.value };
                  set('rincones', copia);
                }}
                rows={2}
                placeholder="Lista de materiales necesarios"
              />
            </div>
            <div>
              <Label htmlFor={`reg-${i}`} className="text-xs">
                Reglas del rincón
              </Label>
              <Textarea
                id={`reg-${i}`}
                value={r.reglas}
                onChange={(e) => {
                  const copia = [...form.rincones];
                  const prev = copia[i] ?? { nombre: '', materiales: '', reglas: '' };
                  copia[i] = { ...prev, reglas: e.target.value };
                  set('rincones', copia);
                }}
                rows={2}
                placeholder="Acuerdos del rincón (cuidado, turnos, etc.)"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderFase(label: string, key: keyof FormState['fases'], placeholder: string) {
    return (
      <div className="space-y-2">
        <Label htmlFor={`fase-${key}`}>{label}</Label>
        <Textarea
          id={`fase-${key}`}
          value={form.fases[key]}
          onChange={(e) =>
            set('fases', { ...form.fases, [key]: e.target.value })
          }
          rows={4}
          placeholder={placeholder}
        />
      </div>
    );
  }

  function renderCampos() {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {campos.map((c) => {
          const selected = form.camposFormativos.includes(c.codigo);
          return (
            <button
              type="button"
              key={c.codigo}
              onClick={() => toggleCampo(c.codigo)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                selected ? 'border-nem-verde bg-nem-verde/5' : 'hover:bg-muted'
              }`}
            >
              <Checkbox checked={selected} aria-label={c.nombre} />
              <div>
                <p className="font-medium">{c.nombre}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.descripcion}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderPDAs() {
    return (
      <div className="space-y-3">
        {pdas.map((p) => {
          const selected = form.pdas.includes(p.codigo);
          return (
            <button
              type="button"
              key={p.codigo}
              onClick={() => togglePDA(p.codigo)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left ${
                selected ? 'border-nem-verde bg-nem-verde/5' : 'hover:bg-muted'
              }`}
            >
              <Checkbox checked={selected} aria-label={p.codigo} />
              <div>
                <p className="font-medium">{p.codigo}</p>
                <p className="text-sm">{p.texto}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  Grado {p.grado}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderEjes() {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {ejes.map((e) => {
          const selected = form.ejesArticuladores.includes(e.codigo);
          return (
            <button
              type="button"
              key={e.codigo}
              onClick={() => toggleEje(e.codigo)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left ${
                selected ? 'border-nem-verde bg-nem-verde/5' : 'hover:bg-muted'
              }`}
            >
              <Checkbox checked={selected} aria-label={e.nombre} />
              <div>
                <p className="font-medium">{e.nombre}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{e.descripcion}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderBancoLegacy() {
    return (
      <p className="text-sm text-muted-foreground">
        El banco de palabras aplica solo a la modalidad unidad didáctica (Fase 2). Lo
        omitimos en MVP para proyecto comunitario.
      </p>
    );
  }

  function renderSesionesLegacy() {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          En esta versión MVP la planeación se guarda sin sesiones/bloques. Después podrás
          arrastrar bloques del catálogo M1 en la vista de edición.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {['L', 'M', 'M', 'J', 'V'].map((d, i) => (
            <div
              key={i}
              className="rounded-lg border border-dashed bg-muted/30 p-3 text-center"
            >
              <p className="text-xs font-medium text-muted-foreground">{d}</p>
              <p className="mt-2 text-xs text-muted-foreground">—</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderRevision() {
    const sesionesCount = Object.values(form.sesionesSemana).filter(Boolean).length;
    return (
      <div className="space-y-3 text-sm">
        <Row label="Modalidad" value={form.modalidad} />
        <Row label="Nombre" value={form.nombre} />
        <Row
          label="Problema del contexto"
          value={form.problemaContexto}
        />
        {form.modalidad === 'centros_interes' && (
          <Row label="Tema del centro" value={form.temaCentro} />
        )}
        {form.modalidad === 'unidad_didactica' && (
          <Row
            label="Banco de palabras"
            value={
              form.bancoPalabras.length === 0 ? '—' : form.bancoPalabras.join(', ')
            }
          />
        )}
        {form.modalidad === 'unidad_didactica' && (
          <Row
            label="Sesiones L M M J V"
            value={
              sesionesCount === 0
                ? '—'
                : Object.entries(form.sesionesSemana)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ')
            }
          />
        )}
        {form.modalidad === 'rincones' && (
          <Row
            label="Rincones"
            value={form.rincones.map((r) => r.nombre).filter(Boolean).join(', ') || '—'}
          />
        )}
        {form.modalidad === 'centros_interes' && (
          <Row
            label="Preguntas detonadoras"
            value={
              form.preguntasDet.length === 0
                ? '—'
                : form.preguntasDet.join(' | ')
            }
          />
        )}
        {form.modalidad === 'abj' && (
          <>
            <Row
              label="Inicio del juego"
              value={form.fases.inicioJuego || '—'}
            />
            <Row
              label="Desarrollo del juego"
              value={form.fases.desarrolloJuego || '—'}
            />
            <Row
              label="Cierre / reflexión"
              value={form.fases.cierreJuego || '—'}
            />
          </>
        )}
        {form.modalidad === 'taller_critico' && (
          <>
            <Row
              label="Reflexión inicial"
              value={form.fases.reflexion || '—'}
            />
            <Row
              label="Producción esperada"
              value={form.fases.produccion || '—'}
            />
            <Row
              label="Socialización"
              value={form.fases.socializacion || '—'}
            />
          </>
        )}
        <Row
          label="Campos formativos"
          value={
            form.camposFormativos.length === 0
              ? '—'
              : form.camposFormativos.join(', ')
          }
        />
        <Row label="PDA" value={form.pdas.length === 0 ? '—' : form.pdas.join(', ')} />
        <Row
          label="Ejes articuladores"
          value={
            form.ejesArticuladores.length === 0
              ? '—'
              : form.ejesArticuladores.join(', ')
          }
        />
        <Row label="Periodo" value={`${form.periodoInicio} → ${form.periodoFin}`} />
        <Separator />
        <p className="text-xs text-muted-foreground">
          Al guardar, la planeación quedará en estado <strong>borrador</strong>. Podrás editarla,
          agregar bloques del catálogo y luego entregarla al director.
        </p>
      </div>
    );
  }

  function renderGuardarLegacy() {
    return renderRevision();
  }

  function renderPaso() {
    switch (stepName) {
      case 'Modalidad':
        return renderModalidad();
      case 'Contexto':
      case 'Problema':
        return renderContexto();
      case 'Banco de palabras':
        return renderBancoPalabras();
      case 'Calendario semanal':
        return renderCalendario();
      case 'Tema del centro':
        return renderTemaCentro();
      case 'Preguntas detonadoras':
        return renderPreguntasDet();
      case 'Lista de rincones':
        return renderRinconesLista();
      case 'Materiales y reglas':
        return renderRinconesMateriales();
      case 'Inicio del juego':
        return renderFase('Inicio del juego', 'inicioJuego', 'Presentar el juego, reglas, roles…');
      case 'Desarrollo del juego':
        return renderFase('Desarrollo del juego', 'desarrolloJuego', 'Cómo se juega, duración, variantes…');
      case 'Cierre/reflexión':
        return renderFase('Cierre / reflexión', 'cierreJuego', 'Cómo se recupera lo aprendido al cerrar el juego…');
      case 'Reflexión inicial':
        return renderFase('Reflexión inicial', 'reflexion', 'Pregunta o detonador que invita a pensar críticamente…');
      case 'Producción':
        return renderFase('Producción esperada', 'produccion', 'Qué producto crearán los niños…');
      case 'Socialización':
        return renderFase('Socialización', 'socializacion', 'Cómo compartirán lo producido con la comunidad…');
      case 'Campos':
        return renderCampos();
      case 'PDA':
        return renderPDAs();
      case 'Ejes':
        return renderEjes();
      case 'Banco':
        return renderBancoLegacy();
      case 'Sesiones':
        return renderSesionesLegacy();
      case 'Revisión':
        return renderRevision();
      case 'Guardar':
        return renderGuardarLegacy();
      default:
        return null;
    }
  }

  const descripcionPorPaso: Record<string, string> = {
    Modalidad: 'Elige la modalidad pedagógica NEM de tu planeación.',
    Contexto: 'Define el problema del contexto y propósito.',
    Problema: 'Define el problema del contexto que detonará el proyecto.',
    'Banco de palabras':
      'Lista las palabras clave que estructuran la unidad didáctica (D-FIN-7).',
    'Calendario semanal':
      'Asigna una sesión a cada día L M M J V. Arrastra para reordenar.',
    'Tema del centro':
      'Define el tema que organiza el centro de interés.',
    'Preguntas detonadoras':
      'Escribe las preguntas que guiarán la exploración de los niños.',
    'Lista de rincones':
      'Define al menos 2 rincones de aprendizaje.',
    'Materiales y reglas':
      'Para cada rincón, lista materiales y acuerdos.',
    'Inicio del juego':
      'Describe cómo arranca el juego (reglas, roles, escenario).',
    'Desarrollo del juego':
      'Describe cómo se desarrolla el juego.',
    'Cierre/reflexión':
      'Describe el cierre y la reflexión sobre lo aprendido.',
    'Reflexión inicial':
      'Detonador crítico para iniciar el taller.',
    Producción: 'Qué producto crearán los niños.',
    Socialización: 'Cómo compartirán lo producido con la comunidad.',
    Campos: 'Selecciona los campos formativos que articularás.',
    PDA: 'Elige los PDA oficiales (no puedes crear personalizados).',
    Ejes: 'Selecciona ejes articuladores transversales (opcional).',
    Banco: 'Banco de palabras (placeholder MVP).',
    Sesiones: 'Sesiones: agrega bloques en próxima iteración.',
    Revisión: 'Revisa y guarda tu planeación.',
    Guardar: 'Revisa y guarda tu planeación.',
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Paso {paso} de {steps.length} — {stepName}
          </span>
          <span>{Math.round(progreso)}%</span>
        </div>
        <Progress value={progreso} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{stepName}</CardTitle>
          <CardDescription>{descripcionPorPaso[stepName]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{renderPaso()}</CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={anterior} disabled={paso === 1 || pending}>
          Atrás
        </Button>
        {paso < steps.length ? (
          <Button onClick={siguiente} disabled={pending}>
            Siguiente
          </Button>
        ) : (
          <Button onClick={guardar} disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar planeación'}
          </Button>
        )}
      </div>
      {isProyectoComunitario && paso === 1 && (
        <p className="text-center text-[11px] text-muted-foreground">
          Modalidad MVP: proyecto_comunitario sigue siendo la recomendada para
          preescolar; las 5 modalidades NEM restantes ahora también persisten datos.
        </p>
      )}

      <Dialog
        open={cambioModalidad !== null}
        onOpenChange={(open) => {
          if (!open) cancelarCambioModalidad();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cambiar de modalidad?</DialogTitle>
            <DialogDescription>
              Al cambiar a{' '}
              <strong>
                {cambioModalidad ? MODALIDADES_LABELS[cambioModalidad.to] : ''}
              </strong>
              , se borrarán los datos específicos de{' '}
              <strong>
                {cambioModalidad ? MODALIDADES_LABELS[cambioModalidad.from] : ''}
              </strong>{' '}
              (banco de palabras, sesiones, rincones, tema, preguntas o fases).
              Los campos comunes (nombre, problema, campos formativos, PDA, ejes,
              periodo) se conservan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelarCambioModalidad}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmarCambioModalidad}>
              Sí, cambiar y limpiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value}</span>
    </div>
  );
}