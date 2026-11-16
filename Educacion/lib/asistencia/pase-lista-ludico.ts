/**
 * Banco de dinámicas lúdicas de pase de lista y utilidades de asistencia rápida para Preescolar (Fase 2 NEM).
 *
 * Campos Formativos:
 * 1. Lenguajes
 * 2. Saberes y Pensamiento Científico
 * 3. Ética, Naturaleza y Sociedades
 * 4. De lo Humano y lo Comunitario
 */

export type CampoFormativoId =
  | 'lenguajes'
  | 'saberes_pensamiento_cientifico'
  | 'etica_naturaleza_sociedades'
  | 'de_lo_humano_comunitario';

export interface DinamicaPaseLista {
  id: string;
  campo: CampoFormativoId;
  campoNombre: string;
  titulo: string;
  consigna: string;
  ejemplo: string;
  icono: string;
  duracionMinutos?: number;
}

export type EstadoAsistencia = 'presente' | 'ausente' | 'retardo';

export interface RegistroAsistenciaAlumno {
  alumnoId: string;
  alumnoNombre: string;
  estado: EstadoAsistencia;
  participacionNota?: string;
}

export interface ResumenAsistencia {
  total: number;
  presentes: number;
  ausentes: number;
  retardos: number;
  porcentajeAsistencia: number;
}

export const CATALOGO_DINAMICAS_PASE_LISTA: DinamicaPaseLista[] = [
  // Lenguajes
  {
    id: 'leng-01',
    campo: 'lenguajes',
    campoNombre: 'Lenguajes',
    titulo: 'Animal con mi inicial',
    consigna: 'Al escuchar su nombre, el alumno dice ¡Presente! y nombra un animal u objeto que comience con la misma letra de su nombre.',
    ejemplo: 'Ejemplo: "¡Presente! Soy Mateo y traje una Mariposa."',
    icono: '🔤',
    duracionMinutos: 3,
  },
  {
    id: 'leng-02',
    campo: 'lenguajes',
    campoNombre: 'Lenguajes',
    titulo: 'Rimas divertidas con mi nombre',
    consigna: 'Al escuchar su nombre, inventan una rima corta o divertida.',
    ejemplo: 'Ejemplo: "¡Presente! Sofía come sandía" o "Ramón juega con el león".',
    icono: '🎶',
    duracionMinutos: 4,
  },
  {
    id: 'leng-03',
    campo: 'lenguajes',
    campoNombre: 'Lenguajes',
    titulo: 'Voz misteriosa / De robot / De gigante',
    consigna: 'Hoy respondemos al pase de lista imitando la voz del personaje secreto del día (robot, gigante, ratoncito o susurro).',
    ejemplo: 'Ejemplo: "¿Camila?" → "¡P-R-E-S-E-N-T-E!" (voz de robot con movimientos de brazos).',
    icono: '🤖',
    duracionMinutos: 3,
  },

  // Saberes y Pensamiento Científico
  {
    id: 'sab-01',
    campo: 'saberes_pensamiento_cientifico',
    campoNombre: 'Saberes y Pensamiento Científico',
    titulo: 'Aplausos por sílabas',
    consigna: 'Al decir ¡Presente!, dan tantas palmadas o zapatazos como sílabas tiene su nombre.',
    ejemplo: 'Ejemplo: "Va-len-ti-na" (4 aplausos fuertes).',
    icono: '👏',
    duracionMinutos: 3,
  },
  {
    id: 'sab-02',
    campo: 'saberes_pensamiento_cientifico',
    campoNombre: 'Saberes y Pensamiento Científico',
    titulo: 'Fruta, verdura o color favorito',
    consigna: 'Responden mencionando su fruta o color preferido y señalando algo de ese color en el salón.',
    ejemplo: 'Ejemplo: "¡Presente! Verde como mi suéter y como las manzanas."',
    icono: '🍎',
    duracionMinutos: 3,
  },
  {
    id: 'sab-03',
    campo: 'saberes_pensamiento_cientifico',
    campoNombre: 'Saberes y Pensamiento Científico',
    titulo: 'Conteo en cadena',
    consigna: 'Cada alumno presente dice el número consecutivo en voz alta para descubrir juntos cuántos llegaron hoy.',
    ejemplo: 'Ejemplo: "¡Presente, soy el número 12!"',
    icono: '🔢',
    duracionMinutos: 2,
  },

  // Ética, Naturaleza y Sociedades
  {
    id: 'et-01',
    campo: 'etica_naturaleza_sociedades',
    campoNombre: 'Ética, Naturaleza y Sociedades',
    titulo: 'Cuidando a mis seres vivos',
    consigna: 'Al escuchar su nombre, comparten una acción breve sobre cómo cuidan o protegen a un animalito, planta o rincón de la naturaleza.',
    ejemplo: 'Ejemplo: "¡Presente! Hoy le puse agua limpia a las macetas de mi abuelita."',
    icono: '🌱',
    duracionMinutos: 4,
  },
  {
    id: 'et-02',
    campo: 'etica_naturaleza_sociedades',
    campoNombre: 'Ética, Naturaleza y Sociedades',
    titulo: 'El guardián de mi comunidad',
    consigna: 'Mencionan a una persona o profesión que ayuda en su colonia o comunidad escolar (bombero, barrendero, doctora, policía escolar).',
    ejemplo: 'Ejemplo: "¡Presente! La señora que cuida la entrada de la escuela."',
    icono: '🏡',
    duracionMinutos: 3,
  },

  // De lo Humano y lo Comunitario
  {
    id: 'hum-01',
    campo: 'de_lo_humano_comunitario',
    campoNombre: 'De lo Humano y lo Comunitario',
    titulo: 'Emocionómetro del día',
    consigna: 'Expresan cómo llegan hoy al salón mostrando una carita gestual (alegría, calma, sorpresa, sueño o tristeza) y diciendo la emoción.',
    ejemplo: 'Ejemplo: "¡Presente! Hoy me siento con calma y feliz porque desayuné con mi hermano."',
    icono: '😊',
    duracionMinutos: 3,
  },
  {
    id: 'hum-02',
    campo: 'de_lo_humano_comunitario',
    campoNombre: 'De lo Humano y lo Comunitario',
    titulo: 'El superpoder de hoy',
    consigna: 'Cada alumno comparte qué superpoder amable traerá hoy al aula (compartir, escuchar, abrazar, limpiar o prestar crayolas).',
    ejemplo: 'Ejemplo: "¡Presente! Mi superpoder de hoy es ayudar a recoger los juguetes."',
    icono: '⭐',
    duracionMinutos: 3,
  },
];

/**
 * Obtiene una sugerencia aleatoria o la siguiente en rotación a partir del catálogo.
 */
export function obtenerSugerenciaDinamica(
  campoFiltro?: CampoFormativoId,
  indiceActual?: number,
): DinamicaPaseLista {
  const lista = campoFiltro
    ? CATALOGO_DINAMICAS_PASE_LISTA.filter((d) => d.campo === campoFiltro)
    : CATALOGO_DINAMICAS_PASE_LISTA;

  if (lista.length === 0) {
    return CATALOGO_DINAMICAS_PASE_LISTA[0]!;
  }

  if (typeof indiceActual === 'number') {
    const siguienteIndice = (indiceActual + 1) % lista.length;
    return lista[siguienteIndice]!;
  }

  const idxAleatorio = Math.floor(Math.random() * lista.length);
  return lista[idxAleatorio]!;
}

/**
 * Inicializa la lista de asistencia en estado 'presente' por defecto (agilidad para toma en < 30 seg).
 */
export function inicializarAsistencia(
  alumnos: Array<{ id: string; nombre: string }>,
  estadoPorDefecto: EstadoAsistencia = 'presente',
): RegistroAsistenciaAlumno[] {
  return (alumnos || []).map((al) => ({
    alumnoId: al.id,
    alumnoNombre: al.nombre,
    estado: estadoPorDefecto,
  }));
}

/**
 * Calcula las métricas resumidas de asistencia.
 */
export function calcularResumenAsistencia(
  registros: RegistroAsistenciaAlumno[],
): ResumenAsistencia {
  const total = registros.length;
  if (total === 0) {
    return {
      total: 0,
      presentes: 0,
      ausentes: 0,
      retardos: 0,
      porcentajeAsistencia: 0,
    };
  }

  let presentes = 0;
  let ausentes = 0;
  let retardos = 0;

  for (const r of registros) {
    if (r.estado === 'presente') presentes++;
    else if (r.estado === 'ausente') ausentes++;
    else if (r.estado === 'retardo') retardos++;
  }

  const porcentajeAsistencia = Math.round(((presentes + retardos) / total) * 100);

  return {
    total,
    presentes,
    ausentes,
    retardos,
    porcentajeAsistencia,
  };
}

/**
 * Genera un texto amigable para copiar o agregar a la bitácora docente diaria.
 */
export function generarTextoBitacoraAsistencia({
  fecha,
  dinamica,
  resumen,
  ausentesNombres,
}: {
  fecha: string;
  dinamica?: DinamicaPaseLista;
  resumen: ResumenAsistencia;
  ausentesNombres?: string[];
}): string {
  const lineas: string[] = [];
  lineas.push(`📋 *Pase de Lista — ${fecha}*`);
  if (dinamica) {
    lineas.push(`🎯 Dinámica (${dinamica.campoNombre}): ${dinamica.titulo}`);
    lineas.push(`   Consigna: "${dinamica.consigna}"`);
  }
  lineas.push(`👥 Asistencia: ${resumen.presentes} presentes / ${resumen.ausentes} ausentes / ${resumen.retardos} retardos (${resumen.porcentajeAsistencia}%)`);

  if (ausentesNombres && ausentesNombres.length > 0) {
    lineas.push(`❌ Alumnos ausentes: ${ausentesNombres.join(', ')}`);
  }

  return lineas.join('\n');
}
