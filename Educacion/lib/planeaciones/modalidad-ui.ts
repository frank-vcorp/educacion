/**
 * Labels y estructura visible de planeación alineados al lenguaje de docentes
 * (p. ej. Tía Lola: actividades, fases, momentos — no "bloques").
 */
import {
  MODALIDADES_LABELS,
  type Modalidad,
} from '@/components/planeaciones/wizard-modalidad-data';

export { MODALIDADES_LABELS, type Modalidad };

export interface SeccionPlaneacion {
  key: string;
  label: string;
  contenido: string | null;
  vacio?: string;
}

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

export function getEtiquetaActividades(modalidad: Modalidad): string {
  switch (modalidad) {
    case 'taller_critico':
      return 'Actividades del taller';
    case 'centros_interes':
    case 'proyecto_comunitario':
      return 'Actividades del proyecto';
    case 'unidad_didactica':
      return 'Sesiones de la semana';
    default:
      return 'Actividades';
  }
}

export function getTituloSeccionActividades(modalidad: Modalidad): string {
  return getEtiquetaActividades(modalidad);
}

export function getSeccionesGuia(modalidad: Modalidad): Array<{ key: string; label: string }> {
  switch (modalidad) {
    case 'proyecto_comunitario':
      return [
        { key: 'motivacion', label: 'Motivación' },
        { key: 'diseno', label: 'Diseño' },
        { key: 'accion', label: 'Acción' },
        { key: 'finalizacion', label: 'Finalización' },
        { key: 'evaluacion', label: 'Evaluación' },
      ];
    case 'centros_interes':
      return [
        { key: 'contacto', label: 'Contacto con la realidad' },
        { key: 'identificacion', label: 'Identificación e integración' },
        { key: 'accion', label: 'Acción' },
        { key: 'finalizacion', label: 'Finalización' },
        { key: 'evaluacion', label: 'Evaluación' },
      ];
    case 'taller_critico':
      return [
        { key: 'momento_1', label: 'Momento 1 — Situación inicial' },
        { key: 'momento_2', label: 'Momento 2 — Organización' },
        { key: 'momento_3', label: 'Momento 3 — Puesta en marcha' },
        { key: 'momento_4', label: 'Momento 4 — Cierre' },
      ];
    case 'abj':
      return [
        { key: 'inicio_juego', label: 'Inicio del juego' },
        { key: 'desarrollo_juego', label: 'Desarrollo del juego' },
        { key: 'cierre_reflexion', label: 'Cierre / reflexión' },
      ];
    default:
      return [];
  }
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringList(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  return items.length > 0 ? items.join('\n') : null;
}

export function buildModalidadDisplay(
  modalidad: Modalidad,
  modalidadData: Record<string, unknown> = {},
): { secciones: SeccionPlaneacion[]; calendario: Array<{ dia: string; titulo: string }> } {
  const secciones: SeccionPlaneacion[] = [];
  const calendario: Array<{ dia: string; titulo: string }> = [];

  if (modalidad === 'centros_interes') {
    const tema = asText(modalidadData.tema);
    if (tema) {
      secciones.push({ key: 'tema', label: 'Tema del centro', contenido: tema });
    }
    const preguntas = asStringList(modalidadData.preguntas_det);
    if (preguntas) {
      secciones.push({
        key: 'preguntas_det',
        label: 'Preguntas detonadoras',
        contenido: preguntas,
      });
    }
  }

  if (modalidad === 'taller_critico') {
    const map: Array<[string, string]> = [
      ['reflexion_inicial', 'Momento 1 — Situación inicial'],
      ['produccion', 'Momento 3 — Puesta en marcha'],
      ['socializacion', 'Momento 4 — Cierre'],
    ];
    for (const [key, label] of map) {
      const contenido = asText(modalidadData[key]);
      secciones.push({
        key,
        label,
        contenido,
        vacio: contenido ? undefined : 'Sin contenido capturado en el wizard.',
      });
    }
  }

  if (modalidad === 'abj') {
    const map: Array<[string, string]> = [
      ['inicio_juego', 'Inicio del juego'],
      ['desarrollo_juego', 'Desarrollo del juego'],
      ['cierre_reflexion', 'Cierre / reflexión'],
    ];
    for (const [key, label] of map) {
      const contenido = asText(modalidadData[key]);
      secciones.push({ key, label, contenido });
    }
  }

  if (modalidad === 'rincones') {
    const rincones = modalidadData.rincones;
    if (Array.isArray(rincones)) {
      rincones.forEach((r, i) => {
        if (!r || typeof r !== 'object') return;
        const rec = r as Record<string, unknown>;
        const nombre = asText(rec.nombre) ?? `Rincón ${i + 1}`;
        const materiales = Array.isArray(rec.materiales)
          ? rec.materiales.filter((m): m is string => typeof m === 'string').join(', ')
          : asText(rec.materiales);
        const reglas = asText(rec.reglas);
        const partes = [materiales, reglas].filter(Boolean).join('\n');
        secciones.push({
          key: `rincon_${i}`,
          label: nombre,
          contenido: partes || null,
        });
      });
    }
  }

  const guia = getSeccionesGuia(modalidad);
  if (
    guia.length > 0 &&
    modalidad !== 'taller_critico' &&
    modalidad !== 'abj'
  ) {
    for (const { key, label } of guia) {
      secciones.push({
        key,
        label,
        contenido: null,
        vacio: 'Agrega aquí las actividades de esta fase (como en tu Word).',
      });
    }
  }

  const sesiones = modalidadData.sesiones_semana;
  if (sesiones && typeof sesiones === 'object' && !Array.isArray(sesiones)) {
    for (const [dia, titulo] of Object.entries(sesiones as Record<string, unknown>)) {
      const text = asText(titulo);
      if (text) {
        calendario.push({ dia: DIAS_LABEL[dia] ?? dia, titulo: text });
      }
    }
  }

  return { secciones, calendario };
}

export function getMensajePlaneacionNueva(_modalidad: Modalidad): string {
  return `Tu planeación ya está guardada. Arrastra actividades del catálogo (izquierda) hacia cada día, o escribe las tuyas — como en tu Word.`;
}

export function getMensajeSinActividades(modalidad: Modalidad): string {
  return `Aún no hay ${getEtiquetaActividades(modalidad).toLowerCase()}. Arrastra una del catálogo o escribe abajo (ej.: "Tintura con café", "Honores a la bandera").`;
}

export function getNotaDragDrop(): string {
  return 'Arrastra actividades del catálogo o materiales de “Mi aula” hacia cada día. También puedes escribir actividades propias abajo.';
}

export function etiquetaSesion(sesion: {
  numero: number;
  ajustes_sesion?: string | null;
}): string {
  if (sesion.ajustes_sesion?.trim()) return sesion.ajustes_sesion.trim();
  return `Sesión ${sesion.numero}`;
}
