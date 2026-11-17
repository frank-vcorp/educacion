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
  origen?: 'catalogo' | 'ia';
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
  {
    id: 'leng-04',
    campo: 'lenguajes',
    campoNombre: 'Lenguajes',
    titulo: 'Palabra mágica del cuento',
    consigna: 'Responden ¡Presente! diciendo una palabra bonita o mágica que les gustaría escuchar en un cuento (estrella, nube, dragón, abrazo).',
    ejemplo: 'Ejemplo: "¡Presente! Mi palabra mágica es arcoíris."',
    icono: '📖',
    duracionMinutos: 3,
  },
  {
    id: 'leng-05',
    campo: 'lenguajes',
    campoNombre: 'Lenguajes',
    titulo: 'Saludo en otra lengua o señas',
    consigna: 'Al escuchar su nombre, saludan usando la seña de "hola" en LSM o una palabra en lengua indígena/extranjera acordada en grupo.',
    ejemplo: 'Ejemplo: "¡Presente! Ximena dice hola con su mano y sonríe."',
    icono: '🤟',
    duracionMinutos: 3,
  },
  {
    id: 'leng-06',
    campo: 'lenguajes',
    campoNombre: 'Lenguajes',
    titulo: 'Sonido de mi transporte favorito',
    consigna: 'Dicen ¡Presente! e imitan el sonido de un transporte (tren, avión, bicicleta, barco) al moverse en su lugar.',
    ejemplo: 'Ejemplo: "¡Presente! ¡Chucu-chucu-chú como un tren!"',
    icono: '🚂',
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
  {
    id: 'sab-04',
    campo: 'saberes_pensamiento_cientifico',
    campoNombre: 'Saberes y Pensamiento Científico',
    titulo: 'Figura geométrica escondida',
    consigna: 'Al responder ¡Presente!, señalan un objeto del salón que tenga forma de círculo, cuadrado o triángulo.',
    ejemplo: 'Ejemplo: "¡Presente! El reloj tiene forma de círculo."',
    icono: '🔺',
    duracionMinutos: 3,
  },
  {
    id: 'sab-05',
    campo: 'saberes_pensamiento_cientifico',
    campoNombre: 'Saberes y Pensamiento Científico',
    titulo: '¿Cómo está el clima hoy?',
    consigna: 'Observan por la ventana y responden ¡Presente! diciendo una pista del clima (soleado, fresco, con nubes, viento).',
    ejemplo: 'Ejemplo: "¡Presente! Hoy siento viento fresco y veo nubes blancas."',
    icono: '🌤️',
    duracionMinutos: 3,
  },
  {
    id: 'sab-06',
    campo: 'saberes_pensamiento_cientifico',
    campoNombre: 'Saberes y Pensamiento Científico',
    titulo: 'Saltos contados',
    consigna: 'Dicen ¡Presente! dando el número de saltitos cortos que indique el dado o la tarjeta del día (1 al 5).',
    ejemplo: 'Ejemplo: "¡Presente! 1, 2, 3 saltos de ranita."',
    icono: '🐸',
    duracionMinutos: 3,
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
  {
    id: 'et-03',
    campo: 'etica_naturaleza_sociedades',
    campoNombre: 'Ética, Naturaleza y Sociedades',
    titulo: 'Cuidadores del agua',
    consigna: 'Comparten una idea sencilla para cuidar el agua en casa o en el jardín de niños al decir ¡Presente!.',
    ejemplo: 'Ejemplo: "¡Presente! Cierro la llave mientras me enjabono las manos."',
    icono: '💧',
    duracionMinutos: 3,
  },
  {
    id: 'et-04',
    campo: 'etica_naturaleza_sociedades',
    campoNombre: 'Ética, Naturaleza y Sociedades',
    titulo: 'Acuerdo de convivencia',
    consigna: 'Mencionan un acuerdo del salón que quieren practicar hoy (escuchar con atención, pedir por favor, esperar turno).',
    ejemplo: 'Ejemplo: "¡Presente! Hoy voy a esperar mi turno para hablar."',
    icono: '🤝',
    duracionMinutos: 3,
  },
  {
    id: 'et-05',
    campo: 'etica_naturaleza_sociedades',
    campoNombre: 'Ética, Naturaleza y Sociedades',
    titulo: 'Mi lugar favorito de la comunidad',
    consigna: 'Nombran un lugar que disfrutan visitar con su familia (el parque, el mercado, la plaza, la biblioteca).',
    ejemplo: 'Ejemplo: "¡Presente! Me gusta ir al parque de los árboles grandes."',
    icono: '🌳',
    duracionMinutos: 3,
  },
  {
    id: 'et-06',
    campo: 'etica_naturaleza_sociedades',
    campoNombre: 'Ética, Naturaleza y Sociedades',
    titulo: '¿Qué traje para reciclar o reusar?',
    consigna: 'Mencionan un objeto que en casa separan o reúsan para cuidar el planeta (botellas, cartón, cáscaras para composta).',
    ejemplo: 'Ejemplo: "¡Presente! En mi casa juntamos las tapas de plástico."',
    icono: '♻️',
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
  {
    id: 'hum-03',
    campo: 'de_lo_humano_comunitario',
    campoNombre: 'De lo Humano y lo Comunitario',
    titulo: 'Desayuno con energía',
    consigna: 'Dicen ¡Presente! mencionando algo saludable que desayunaron o tomaron antes de llegar al preescolar.',
    ejemplo: 'Ejemplo: "¡Presente! Hoy desayuné huevo con tortilla y agua."',
    icono: '🥣',
    duracionMinutos: 3,
  },
  {
    id: 'hum-04',
    campo: 'de_lo_humano_comunitario',
    campoNombre: 'De lo Humano y lo Comunitario',
    titulo: 'Estiramiento de animalito',
    consigna: 'Al escuchar su nombre, dicen ¡Presente! haciendo un estiramiento suave (como gato, jirafa o mariposa).',
    ejemplo: 'Ejemplo: "¡Presente! Me estiro alto como una jirafa."',
    icono: '🦒',
    duracionMinutos: 3,
  },
  {
    id: 'hum-05',
    campo: 'de_lo_humano_comunitario',
    campoNombre: 'De lo Humano y lo Comunitario',
    titulo: 'Agradecimiento de la mañana',
    consigna: 'Comparten algo pequeño por lo que dan gracias hoy (su familia, sus amigos, el sol, venir a jugar).',
    ejemplo: 'Ejemplo: "¡Presente! Doy gracias porque mi mamá me trajo de la mano."',
    icono: '💛',
    duracionMinutos: 3,
  },
  {
    id: 'hum-06',
    campo: 'de_lo_humano_comunitario',
    campoNombre: 'De lo Humano y lo Comunitario',
    titulo: 'Saludo de choque creativo',
    consigna: 'Al responder ¡Presente!, eligen un saludo sin contacto o suave para su compañero de al lado (chocar codos, saludo de puño suave o reverencia).',
    ejemplo: 'Ejemplo: "¡Presente!" (choca suavemente los codos con su vecino).',
    icono: '🤜',
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
