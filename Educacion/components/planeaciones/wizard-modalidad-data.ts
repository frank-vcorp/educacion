/**
 * Helpers puros para construir `metadata.modalidad_data` a partir del
 * FormState del wizard de planeación.
 *
 * SPEC_MODALIDADES_2026-08-17 §Estructura canónica.
 * IMPL-20260818-07 — Fix P1-01: ABJ y Taller Crítico ahora persisten el
 * contenido de las fases capturadas en el wizard (no solo claves vacías).
 *
 * Estructura por modalidad:
 *  - proyecto_comunitario: {} (sin metadata específica)
 *  - unidad_didactica:     { sesiones_semana, actividades_recurrentes }
 *  - abj:                  { inicio_juego, desarrollo_juego, cierre_reflexion }
 *  - rincones:             { rincones: [{ nombre, materiales[], reglas }] }
 *  - centros_interes:      { tema, preguntas_det, estaciones }
 *  - taller_critico:       { reflexion_inicial, produccion, socializacion }
 *
 * Este módulo NO tiene 'use client' para poder testearse directamente
 * desde vitest (entorno jsdom) sin renderizar el wizard completo.
 */

export type Modalidad =
  | 'proyecto_comunitario'
  | 'unidad_didactica'
  | 'abj'
  | 'rincones'
  | 'centros_interes'
  | 'taller_critico';

export interface Rincon {
  nombre: string;
  materiales: string;
  reglas: string;
}

export interface SesionesSemana {
  lunes?: string;
  martes?: string;
  miercoles?: string;
  jueves?: string;
  viernes?: string;
}

export interface FormState {
  modalidad: Modalidad;
  nombre: string;
  problemaContexto: string;
  proposito: string;
  camposFormativos: string[];
  ejesArticuladores: string[];
  pdas: string[];
  contenidoRef: string | null;
  ajustesRazonables: string;
  bancoPalabras: string[];
  sesionesSemana: SesionesSemana;
  rincones: Rincon[];
  reglasRincones: string;
  temaCentro: string;
  preguntasDet: string[];
  fases: {
    reflexion: string;
    inicioJuego: string;
    desarrolloJuego: string;
    cierreJuego: string;
    produccion: string;
    socializacion: string;
  };
  periodoInicio: string;
  periodoFin: string;
}

export const INITIAL_FORM: FormState = {
  modalidad: 'proyecto_comunitario',
  nombre: '',
  problemaContexto: '',
  proposito: '',
  camposFormativos: [],
  ejesArticuladores: [],
  pdas: [],
  contenidoRef: null,
  ajustesRazonables: '',
  bancoPalabras: [],
  sesionesSemana: {},
  rincones: [{ nombre: '', materiales: '', reglas: '' }],
  reglasRincones: '',
  temaCentro: '',
  preguntasDet: [],
  fases: {
    reflexion: '',
    inicioJuego: '',
    desarrolloJuego: '',
    cierreJuego: '',
    produccion: '',
    socializacion: '',
  },
  periodoInicio: '',
  periodoFin: '',
};

export const MODALIDADES_LABELS: Record<Modalidad, string> = {
  proyecto_comunitario: 'Proyecto Comunitario',
  unidad_didactica: 'Unidad Didáctica',
  abj: 'Aprendizaje Basado en Juego (ABJ)',
  rincones: 'Rincones de Aprendizaje',
  centros_interes: 'Centros de Interés',
  taller_critico: 'Taller Crítico',
};

/**
 * Construye `metadata.modalidad_data` a partir del FormState.
 * Esta es la traducción del state del wizard al contrato JSONB que
 * persiste el server action. Ver SPEC_MODALIDADES §Estructura canónica.
 *
 * Fix P1-01 (IMPL-20260818-07): ABJ y Taller Crítico ahora incluyen el
 * contenido capturado de las 3 fases (antes se persistían vacías o solo
 * las claves sin contenido).
 */
export function buildModalidadData(form: FormState): Record<string, unknown> {
  switch (form.modalidad) {
    case 'unidad_didactica':
      return {
        sesiones_semana: form.sesionesSemana,
        actividades_recurrentes: [],
      };
    case 'rincones':
      return {
        rincones: form.rincones.map((r) => ({
          nombre: r.nombre,
          materiales: r.materiales
            ? r.materiales.split('\n').map((s) => s.trim()).filter(Boolean)
            : [],
          reglas: r.reglas,
        })),
      };
    case 'centros_interes':
      return {
        tema: form.temaCentro,
        preguntas_det: form.preguntasDet,
        estaciones: [],
      };
    case 'taller_critico':
      return {
        reflexion_inicial: form.fases.reflexion.trim(),
        produccion: form.fases.produccion.trim(),
        socializacion: form.fases.socializacion.trim(),
      };
    case 'abj':
      return {
        inicio_juego: form.fases.inicioJuego.trim(),
        desarrollo_juego: form.fases.desarrolloJuego.trim(),
        cierre_reflexion: form.fases.cierreJuego.trim(),
      };
    case 'proyecto_comunitario':
    default:
      return {};
  }
}

/**
 * Determina si el state actual tiene datos específicos de la modalidad
 * (no solo los campos comunes como nombre, problema, campos, pdas).
 * Usado por `cambiarModalidad` para decidir si mostrar confirmación.
 */
export function tieneDatosEspecificos(form: FormState, modalidad: Modalidad): boolean {
  switch (modalidad) {
    case 'unidad_didactica':
      return (
        form.bancoPalabras.length > 0 ||
        Object.keys(form.sesionesSemana).length > 0
      );
    case 'abj':
      return (
        form.fases.inicioJuego.trim().length > 0 ||
        form.fases.desarrolloJuego.trim().length > 0 ||
        form.fases.cierreJuego.trim().length > 0
      );
    case 'rincones':
      return (
        form.rincones.some(
          (r) =>
            r.nombre.trim().length > 0 ||
            r.materiales.trim().length > 0 ||
            r.reglas.trim().length > 0,
        ) || form.reglasRincones.trim().length > 0
      );
    case 'centros_interes':
      return form.temaCentro.trim().length > 0 || form.preguntasDet.length > 0;
    case 'taller_critico':
      return (
        form.fases.reflexion.trim().length > 0 ||
        form.fases.produccion.trim().length > 0 ||
        form.fases.socializacion.trim().length > 0
      );
    case 'proyecto_comunitario':
    default:
      return false;
  }
}

/**
 * Limpia los campos específicos de la modalidad, dejando los comunes.
 * Implementa el contrato de P-PD9/SPEC_MODALIDADES §P1.2:
 * "Limpiar metadata.modalidad_data al cambiar. Mantener problema,
 * campos, pdas, ejes, periodo".
 */
export function limpiarDatosEspecificos(prev: FormState, nueva: Modalidad): FormState {
  return {
    ...prev,
    modalidad: nueva,
    bancoPalabras: nueva === 'unidad_didactica' ? prev.bancoPalabras : [],
    sesionesSemana: nueva === 'unidad_didactica' ? prev.sesionesSemana : {},
    rincones:
      nueva === 'rincones' ? prev.rincones : [{ nombre: '', materiales: '', reglas: '' }],
    reglasRincones: nueva === 'rincones' ? prev.reglasRincones : '',
    temaCentro: nueva === 'centros_interes' ? prev.temaCentro : '',
    preguntasDet: nueva === 'centros_interes' ? prev.preguntasDet : [],
    fases:
      nueva === 'abj'
        ? {
            reflexion: '',
            inicioJuego: prev.fases.inicioJuego,
            desarrolloJuego: prev.fases.desarrolloJuego,
            cierreJuego: prev.fases.cierreJuego,
            produccion: '',
            socializacion: '',
          }
        : nueva === 'taller_critico'
        ? {
            reflexion: prev.fases.reflexion,
            inicioJuego: '',
            desarrolloJuego: '',
            cierreJuego: '',
            produccion: prev.fases.produccion,
            socializacion: prev.fases.socializacion,
          }
        : {
            reflexion: '',
            inicioJuego: '',
            desarrolloJuego: '',
            cierreJuego: '',
            produccion: '',
            socializacion: '',
          },
  };
}

/**
 * Devuelve la lista de pasos dinámicos para la modalidad.
 * Mantener el orden: el primer paso siempre es Modalidad.
 */
export function buildSteps(modalidad: Modalidad): string[] {
  switch (modalidad) {
    case 'unidad_didactica':
      return [
        'Modalidad',
        'Contexto',
        'Banco de palabras',
        'Calendario semanal',
        'Campos',
        'PDA',
        'Ejes',
        'Revisión',
      ];
    case 'abj':
      return [
        'Modalidad',
        'Contexto',
        'Inicio del juego',
        'Desarrollo del juego',
        'Cierre/reflexión',
        'Campos',
        'PDA',
        'Revisión',
      ];
    case 'rincones':
      return [
        'Modalidad',
        'Contexto',
        'Lista de rincones',
        'Materiales y reglas',
        'Campos',
        'PDA',
        'Revisión',
      ];
    case 'centros_interes':
      return [
        'Modalidad',
        'Contexto',
        'Tema del centro',
        'Preguntas detonadoras',
        'Campos',
        'PDA',
        'Revisión',
      ];
    case 'taller_critico':
      return [
        'Modalidad',
        'Contexto',
        'Reflexión inicial',
        'Producción',
        'Socialización',
        'Campos',
        'PDA',
        'Revisión',
      ];
    case 'proyecto_comunitario':
    default:
      return [
        'Modalidad',
        'Problema',
        'Campos',
        'PDA',
        'Ejes',
        'Banco',
        'Sesiones',
        'Guardar',
      ];
  }
}
