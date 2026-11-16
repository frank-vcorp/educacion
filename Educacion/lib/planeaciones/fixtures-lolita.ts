/**
 * Fixture de verificación: las 3 planeaciones reales de Preescolar Fase 2
 * de la educadora Maestra Dolores Marín Pastrana (Jardín Celestino Freinet, CCT 22DJN0059R, 2° "A").
 * 
 * Contiene los datos exactos extraídos de los 3 documentos Word:
 * 1. centro de inter+s.docx -> "COLORÍN COLORANTE ¿QUÉ COLORES ENCONTRASTE?" (Centros de interés)
 * 2. derechos de NN.docx   -> "Carteles de los derechos de los niños" (Proyecto Comunitario)
 * 3. taller critico 2A.docx -> "NARRANDO HISTORIAS" (Taller Crítico)
 */

export interface PlaneacionRealPreescolar {
  id: string;
  nombre: string;
  modalidad: 'centros_interes' | 'proyecto_comunitario' | 'taller_critico';
  cct: string;
  docente: string;
  fase: string;
  gradoGrupo: string;
  periodoInicio: string;
  periodoFin: string;
  problematica: string;
  proposito: string;
  camposFormativos: string[];
  contenidos: string[];
  pdas: string[];
  ejesArticuladores: string[];
  ajustesRazonablesBAP?: string;
  productoCentral?: string;
  detallesModalidad: Record<string, unknown>;
}

export const PLANEACIONES_REALES_LOLITA: PlaneacionRealPreescolar[] = [
  {
    id: 'plan-real-01-centros-interes',
    nombre: 'COLORÍN COLORANTE ¿QUÉ COLORES ENCONTRASTE?',
    modalidad: 'centros_interes',
    cct: '22DJN0059R',
    docente: 'María Dolores Marín Pastrana',
    fase: 'FASE_2',
    gradoGrupo: '2° "A"',
    periodoInicio: '2025-02-10',
    periodoFin: '2025-02-21',
    problematica: 'Los NN no conocen las diferentes maneras de utilizar los elementos de la naturaleza',
    proposito: 'Que los NN reflexionen, experimenten con diversos elementos de la naturaleza para obtener pinturas',
    camposFormativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
    contenidos: [
      'Exploración de la diversidad natural que existe en la comunidad y en otros lugares.',
      'Clasificación y experimentación con objetos y elementos del entorno que reflejan la diversidad de la comunidad o región.'
    ],
    pdas: [
      'Observa y experimenta con elementos de la naturaleza, comunica y registra sus hallazgos',
      'Mezcla o combina elementos de su entorno e identifica reacciones diversas, siguiendo normas de seguridad'
    ],
    ejesArticuladores: ['ARTES_EXPERIENCIAS_ESTETICAS', 'PENSAMIENTO_CRITICO'],
    ajustesRazonablesBAP: 'Acompañamiento cercano en el manejo de texturas y pigmentos naturales; adaptación de materiales sensoriales.',
    detallesModalidad: {
      temaCentro: 'Elementos de la naturaleza y obtención de pinturas',
      preguntasDetonadoras: [
        '¿De dónde vienen los colores que vemos en las plantas?',
        '¿Cómo podemos pintar con hojas, tierra y flores sin usar acuarelas de la tienda?'
      ],
      actividadesRutinarias: [
        'Honores a la bandera',
        'Aseo del área de trabajo',
        'Escribir fecha',
        'Colocar jornada diaria'
      ],
      actividadesRecurrentes: [
        'Reconocimiento de Vocales',
        'Conteo de elementos, aumentar rango de conteo',
        'Reconocimiento de nombre a los alumnos de nuevo ingreso'
      ],
      actividadesIndependientes: [
        'Dia del amor y la amistad',
        'Dia de la Bandera Mexicana'
      ],
      interdisciplinariedad: [
        'Canciones sobre los números'
      ]
    }
  },
  {
    id: 'plan-real-02-derechos-nn',
    nombre: 'Conociendo y Difundiendo Nuestros Derechos',
    modalidad: 'proyecto_comunitario',
    cct: '22DJN0059R',
    docente: 'María Dolores Marín Pastrana',
    fase: 'FASE_2',
    gradoGrupo: '2° "A"',
    periodoInicio: '2025-04-01',
    periodoFin: '2025-04-11',
    problematica: 'Actualmente vivimos tiempos difíciles, de violencia y desigualdad social, y los niños constituyen uno de los grupos más vulnerables, es por eso esencial enseñar a los alumnos a conocer sus derechos de forma sencilla y divertida, a través de juegos y actividades que promuevan el aprendizaje situado, partiendo de su entorno y contexto social.',
    proposito: 'Que los niños comprendan los derechos fundamentales de todos los niños, desarrollando empatía, respeto y conciencia sobre su bienestar y el de los demás',
    productoCentral: 'Carteles de los derechos de los niños elaborados por los alumnos y expuestos a la comunidad escolar',
    camposFormativos: ['ETICA_NATURALEZA_SOCIEDADES'],
    contenidos: [
      'Los derechos de niñas y niños como base para el bienestar integral y el establecimiento de acuerdos que favorecen la convivencia pacífica.'
    ],
    pdas: [
      'Identifica algunas situaciones en las que sus derechos y los de otras niñas y otros niños, no son respetados.',
      'Difunde los derechos de las niñas y los niños en su escuela y entorno cercano, para favorecer que todas las personas los respeten y contribuyan a su ejercicio.'
    ],
    ejesArticuladores: [
      'INCLUSION',
      'PENSAMIENTO_CRITICO',
      'INTERCULTURALIDAD_CRITICA',
      'IGUALDAD_GENERO',
      'VIDA_SALUDABLE',
      'APROPIACION_CULTURAS_LECTURA',
      'ARTES_EXPERIENCIAS_ESTETICAS'
    ],
    ajustesRazonablesBAP: 'Sentar a Kassandra Yamileth con alumnos que tengan un lenguaje fluido, pedirle que trate de decir la palabra para lograr que se comunique conmigo y con sus compañeros; no adivinarle las cosas. Con Kenneth Saúl apoyarlo en el control de sus emociones (frustración, enojo, ansiedad) que aprenda a respirar e identificar su emoción para que no lastime a sus compañeros y pueda lograr sus actividades.',
    detallesModalidad: {}
  },
  {
    id: 'plan-real-03-taller-critico',
    nombre: 'NARRANDO HISTORIAS',
    modalidad: 'taller_critico',
    cct: '22DJN0059R',
    docente: 'María Dolores Marín Pastrana',
    fase: 'FASE_2',
    gradoGrupo: '2° "A"',
    periodoInicio: '2025-05-06',
    periodoFin: '2025-05-23',
    problematica: 'Los alumnos han mostrado falta de interés al seguir reglas y establecer relaciones positivas con sus pares debido a su estilo de crianza y el exceso en el uso de las tecnologías, pantallas, celulares, computadora y televisión.',
    proposito: 'Los alumnos narren historias usando diversos lenguajes artísticos, reconozcan la secuencia lógica de las historias que conoce e invente las propias. Favorecer el lenguaje oral de los niños, la escucha, la atención, promover el gusto por la lectura. Desarrollar seguridad en sí mismos, integrar a padres de familia, docentes y alumnos.',
    camposFormativos: ['LENGUAJES', 'SABERES_PENSAMIENTO_CIENTIFICO'],
    contenidos: [
      'Narración de historias mediante diversos lenguajes, en un ambiente donde niñas y niños participen y se apropien de la cultura, a través de diferentes textos.',
      'Los saberes numéricos como herramienta para resolver situaciones del entorno, en diversos contextos socioculturales.'
    ],
    pdas: [
      'Narra con secuencia lógica, historias que conoce o inventa, y las acompaña con recursos de los lenguajes artísticos.',
      'Usa números con distintos propósitos y en distintas situaciones.',
      'Distingue semejanzas y diferencias con los nombres de sus pares, por los sonidos, marcas gráficas o letras.'
    ],
    ejesArticuladores: [
      'INCLUSION',
      'PENSAMIENTO_CRITICO',
      'INTERCULTURALIDAD_CRITICA',
      'IGUALDAD_GENERO',
      'VIDA_SALUDABLE',
      'APROPIACION_CULTURAS_LECTURA',
      'ARTES_EXPERIENCIAS_ESTETICAS'
    ],
    ajustesRazonablesBAP: 'Sentar a Kassandra Yamileth con alumnos que tengan lenguaje fluido y no adivinarle palabras. Con Kenneth Saúl apoyo en control de emociones e identificación de frustración mediante respiración.',
    detallesModalidad: {
      momentosTaller: [
        { momento: 1, nombre: 'Preguntas detonadoras', descripcion: '¿Has narrado una historia? ¿Te gustaría narrar una historia? ¿Cómo se puede narrar una historia? ¿Qué necesitamos para narrar?' },
        { momento: 2, nombre: 'Acciones y Espacio', descripcion: 'Escuchar narraciones por educadora y audios, ilustrar historias, cambiar de salón con Mtra. Amanda y Mtra. Norma.' },
        { momento: 3, nombre: 'Organización de acciones', descripcion: 'Talleres en colegiado: pictogramas, narración oral, expresión corporal (conejitos), dramatización.' },
        { momento: 4, nombre: 'Puesta en marcha y valoración', descripcion: 'Asamblea escolar, dibujo de taller preferido para comunidad, evaluación en diario de educadora.' }
      ]
    }
  }
];
