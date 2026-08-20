/**
 * Selector de modalidad pedagógica NEM (6 modalidades).
 * SPEC_MODALIDADES_2026-08-17.
 *
 * Muestra los 6 radio buttons con label, descripción y duración estimada.
 * Diseño consistente con la app (verde NEM como acento).
 * La selección se propaga al wizard padre vía callback `onChange`.
 *
 * Modalidades soportadas:
 *  - proyecto_comunitario (existente)
 *  - unidad_didactica (nueva)
 *  - abj (Aprendizaje Basado en Juego)
 *  - rincones
 *  - centros_interes
 *  - taller_critico
 */
'use client';

import { CheckCircle2 } from 'lucide-react';

export type Modalidad =
  | 'proyecto_comunitario'
  | 'unidad_didactica'
  | 'abj'
  | 'rincones'
  | 'centros_interes'
  | 'taller_critico';

interface ModalidadDef {
  value: Modalidad;
  label: string;
  desc: string;
  duracion: string;
  estructura: string;
}

export const MODALIDADES: ModalidadDef[] = [
  {
    value: 'proyecto_comunitario',
    label: 'Proyecto Comunitario',
    desc: 'Responde a un problema real de la comunidad con 5 fases.',
    duracion: '2-6 semanas',
    estructura: 'Motivación → Diseño → Acción → Finalización → Evaluación',
  },
  {
    value: 'unidad_didactica',
    label: 'Unidad Didáctica',
    desc: 'Tema estructurado con banco de palabras y sesiones L M M J V.',
    duracion: '1-4 semanas',
    estructura: 'Banco de palabras + 5 sesiones + actividades recurrentes',
  },
  {
    value: 'abj',
    label: 'Aprendizaje Basado en Juego (ABJ)',
    desc: 'Aprendizaje a través del juego con 3 momentos definidos.',
    duracion: '1-2 semanas',
    estructura: 'Inicio juego → Desarrollo → Cierre/reflexión',
  },
  {
    value: 'rincones',
    label: 'Rincones de Aprendizaje',
    desc: 'Estaciones paralelas con materiales y reglas específicas.',
    duracion: '1 semana',
    estructura: 'Lista de rincones + materiales por rincón + reglas',
  },
  {
    value: 'centros_interes',
    label: 'Centros de Interés',
    desc: 'Tema detonador + preguntas guía + estaciones de exploración.',
    duracion: '1 semana',
    estructura: 'Tema + preguntas detonadoras + estaciones',
  },
  {
    value: 'taller_critico',
    label: 'Taller Crítico',
    desc: 'Espacio de reflexión, producción y socialización.',
    duracion: '1 semana',
    estructura: 'Reflexión → Producción → Socialización',
  },
];

interface Props {
  value: Modalidad;
  onChange: (m: Modalidad) => void;
}

export function WizardModalidadSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Modalidad pedagógica">
      {MODALIDADES.map((m) => {
        const selected = value === m.value;
        return (
          <label
            key={m.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              selected
                ? 'border-nem-verde bg-nem-verde/5'
                : 'hover:bg-muted/40'
            }`}
          >
            <input
              type="radio"
              name="modalidad"
              value={m.value}
              checked={selected}
              onChange={() => onChange(m.value)}
              className="mt-1 h-4 w-4 cursor-pointer accent-nem-verde"
              aria-label={m.label}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{m.label}</p>
                {selected && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-nem-verde" aria-hidden="true" />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-medium">Estructura:</span> {m.estructura}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <span className="font-medium">Duración estimada:</span> {m.duracion}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}