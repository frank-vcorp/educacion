/**
 * Sugerencias estáticas para el campo "problema del contexto" del wizard.
 * SPEC-CORRECCIONES-2026-08-17 C-5.
 *
 * IMPORTANTE: NO se hacen llamadas a IA externa. Son sugerencias hardcodeadas
 * por nivel educativo, alineadas con los Campos Formativos NEM.
 */
export type NivelEducativo = 'preescolar' | 'primaria' | 'secundaria';

export const SUGERENCIAS_POR_NIVEL: Record<NivelEducativo, string[]> = {
  preescolar: [
    'Los niños botan basura en el patio y no la clasifican para reciclar.',
    'Mis alumnos tienen conflictos al compartir juguetes durante el recreo.',
    'Algunos niños no reconocen las emociones básicas (alegría, tristeza, enojo).',
    'Las familias no conocen cómo apoyar el aprendizaje en casa.',
    'Los niños no identifican figuras geométricas básicas en su entorno.',
    'Les cuesta trabajo esperar su turno para hablar en las asambleas.',
  ],
  primaria: [
    'Los alumnos olvidan lo aprendido entre sesiones y no lo conectan con su vida diaria.',
    'Hay conflictos frecuentes en el patio y los niños no saben resolverlos sin violencia.',
    'La mayoría no lee con fluidez ni comprende lo que lee en textos cortos.',
    'No identifican patrones numéricos básicos ni resuelven problemas de suma y resta.',
    'Las familias no se involucran en las tareas escolares ni en las reuniones.',
    'Les cuesta trabajo expresar sus ideas por escrito con claridad.',
  ],
  secundaria: [
    'Los adolescentes no encuentran sentido a lo que aprenden en la escuela.',
    'Hay acoso escolar sutil (exclusión, burlas) que no se reporta a adultos.',
    'Consumen contenido en redes sociales sin cuestionar su veracidad.',
    'No identifican cómo los contenidos escolares se conectan con proyectos comunitarios.',
    'Les cuesta trabajo argumentar sus opiniones con base en evidencia.',
    'Existe presión de grupo para consumir sustancias o realizar actividades de riesgo.',
  ],
};

export function getSugerencias(nivel: string | null | undefined): string[] {
  if (nivel === 'preescolar' || nivel === 'primaria' || nivel === 'secundaria') {
    return SUGERENCIAS_POR_NIVEL[nivel];
  }
  return SUGERENCIAS_POR_NIVEL.primaria;
}
