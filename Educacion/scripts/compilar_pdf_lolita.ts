import { buildPlaneacionHtml } from '../lib/pdf/generate';
import { chromium } from 'playwright';
import fs from 'fs';

const plan1 = {
  id: 'plan-colorin',
  nombre: 'COLORÍN COLORANTE ¿QUÉ COLORES ENCONTRASTE?',
  periodo_inicio: '2025-02-10',
  periodo_fin: '2025-02-28',
  cct: '22DJN0059R',
  grupo_etiqueta: '2° "A"',
  modalidad_label: 'Centros de Interés y Proyecto Comunitario',
  problema_contexto: 'Los NN no conocen las diferentes maneras de utilizar los elementos de la naturaleza',
  proposito: 'Que los NN reflexionen, experimenten con diversos elementos de la naturaleza para obtener pinturas',
  producto_integrador: 'Playera con sellos de hoja y flores, bálsamo para labios y pinturas vegetales',
  campos_formativos: ['SABERES_PENSAMIENTO_CIENTIFICO'],
  pdas: [
    'Observa y experimento con elementos de la naturaleza, comunica y registra sus hallazgos',
    'Mezcla o combina elementos de su entorno e identifica reacciones diversas, siguiendo normas de seguridad'
  ],
  pda_campo_codigo: {
    'Observa y experimento con elementos de la naturaleza, comunica y registra sus hallazgos': 'SABERES_PENSAMIENTO_CIENTIFICO',
    'Mezcla o combina elementos de su entorno e identifica reacciones diversas, siguiendo normas de seguridad': 'SABERES_PENSAMIENTO_CIENTIFICO'
  },
  campos_nombres: {
    'SABERES_PENSAMIENTO_CIENTIFICO': 'Saberes y Pensamiento Científico'
  },
  ejes_articuladores: ['ARTES_Y_EXPERIENCIAS_ESTETICAS', 'PENSAMIENTO_CRITICO'],
  ejes_nombres: {
    'ARTES_Y_EXPERIENCIAS_ESTETICAS': 'Artes y experiencias estéticas',
    'PENSAMIENTO_CRITICO': 'Pensamiento crítico'
  },
  ajustes_razonables: 'Sentar a Kassandra Yamileth con alumnos que tengan un lenguaje fluido, pedirle que trate de decir la palabra para lograr que se comunique con la docente y pares. Con Kenneth Saúl apoyarlo en el control de sus emociones (frustración, enojo, ansiedad) mediante técnicas de respiración.',
  rutinarias: [
    'Honores a la bandera (lunes 9:00 a 9:10 am)',
    'Aseo del área de trabajo y lavado de manos',
    'Escribir fecha y conteo de alumnos',
    'Colocación de la jornada diaria en el franelógrafo'
  ],
  recurrentes: [
    'Reconocimiento de Vocales y escritura de su nombre',
    'Conteo de elementos del 1 al 10 en educación física',
    'Actividades independientes: Día del amor y la amistad, Día de la Bandera'
  ],
  sesiones: [
    {
      numero: 1,
      etiqueta: 'Lunes 10 de Febrero — Contacto con la realidad',
      bloques: [
        { momento: 'inicio', resumen: 'Honores', contenido: 'Honores a la bandera y clase de música.', recursos: 'Patio cívico' },
        { momento: 'desarrollo', resumen: 'Contacto con alimentos', contenido: 'Se le presenta a los NN diferentes alimentos (frutas, verduras) y elementos de la naturaleza para explorar colores.', recursos: 'Frutas, flores, hojas verdes' }
      ]
    },
    {
      numero: 2,
      etiqueta: 'Martes 11 de Febrero — Actividades recurrentes',
      bloques: [
        { momento: 'desarrollo', resumen: 'Conteo, E.F. y clasificación por color', contenido: 'Actividades de conteo y clasificación por color. Clase de educación física.', recursos: 'Material de ensamble, aros' }
      ]
    },
    {
      numero: 3,
      etiqueta: 'Miércoles 12 de Febrero — Contacto con la naturaleza',
      bloques: [
        { momento: 'desarrollo', resumen: 'Elementos de la naturaleza y observación', contenido: 'Traen de casa elementos de la naturaleza; exploramos, olemos, clasificamos y observamos sus características.', recursos: 'Hojas secas, flores, ramas recolectadas' }
      ]
    },
    {
      numero: 4,
      etiqueta: 'Jueves 13 de Febrero — Identificación e integración',
      bloques: [
        { momento: 'desarrollo', resumen: 'Mezcla tierra y agua sobre cartulina', contenido: 'Realizamos mezcla de tierra con agua para pintar sobre una cartulina.', recursos: 'Tierra, agua, recipientes plásticos, cartulinas' }
      ]
    },
    {
      numero: 5,
      etiqueta: 'Viernes 14 de Febrero — Actividad social y del amor y la amistad',
      bloques: [
        { momento: 'cierre', resumen: 'Amistad y muestra de pinturas', contenido: 'Actividad del día del amor y la amistad. Compartir las primeras pinturas elaboradas.', recursos: 'Tarjetas de papel, pinturas naturales' }
      ]
    },
    {
      numero: 6,
      etiqueta: 'Lunes 17 de Febrero — Fase 3: Poner en práctica',
      bloques: [
        { momento: 'desarrollo', resumen: 'Tintura de café · traer betabel', contenido: 'Honores. Obtención de tintura con café soluble. Tarea: traer betabel rallado de casa.', recursos: 'Café soluble, agua tibia, pinceles' }
      ]
    },
    {
      numero: 7,
      etiqueta: 'Martes 18 de Febrero — Extracción de pigmentos',
      bloques: [
        { momento: 'desarrollo', resumen: 'Betabel hervido · guardar en frasco', contenido: 'Poner a secar el betabel. Obtener la tintura del betabel hervido y guardarla en frascos. Tarea: sello con papa y tallos verdes.', recursos: 'Betabel hervido, frascos con tapa' }
      ]
    },
    {
      numero: 8,
      etiqueta: 'Miércoles 19 de Febrero — Sellos de papa y tintura verde',
      bloques: [
        { momento: 'desarrollo', resumen: 'Sellos de papa · tela verde', contenido: 'Realizar dibujo libre con sellos de papa. Pintar tela con alimentos verdes (espinaca, acelga). Tarea: traer hojas de eucalipto, boldo y col morada.', recursos: 'Papas cortadas, hojas verdes, tela blanca' }
      ]
    },
    {
      numero: 9,
      etiqueta: 'Jueves 20 de Febrero — Tintura con col morada y eucalipto',
      bloques: [
        { momento: 'desarrollo', resumen: 'Col morada · goteros', contenido: 'Realizar tintura vegetal con col morada, boldo y eucalipto. Observar el cambio de tonalidades. Tarea: llevar hojas de lechuga.', recursos: 'Col morada, hojas de lechuga, goteros' }
      ]
    },
    {
      numero: 10,
      etiqueta: 'Viernes 21 de Febrero — Molienda en molcajete y cierre de fase',
      bloques: [
        { momento: 'cierre', resumen: 'Molcajete y dibujo final', contenido: 'En un molcajete los NN van a moler hojas de lechuga y betabel. Con los pétalos de buganvilia pintamos el dibujo final de la bandera.', recursos: 'Molcajete, flores de buganvilia, cartulinas' }
      ]
    }
  ],
  bitacoras: [
    {
      fecha: '2025-02-10',
      sesion_numero: 1,
      participacion_grupo: 5,
      dificultades: 'Excelente respuesta del grupo 2° A. Mostraron asombro al descubrir que las plantas manchan el papel.'
    }
  ],
  alumnos_evaluaciones: [
    { alumno_nombre: 'Kenneth Saúl Benítez (BAP)', nivel: 2, observaciones: 'Requirió apoyo de anticipación visual; logró mezclar sin frustración.' },
    { alumno_nombre: 'Romina Castro', nivel: 1, observaciones: 'Logró identificar y comunicar los colores que descubrió en las hojas.' },
    { alumno_nombre: 'Mateo García', nivel: 1, observaciones: 'Sigue normas de seguridad al utilizar el agua y los pigmentos.' }
  ]
};

const plan2 = {
  id: 'plan-historias',
  nombre: 'NARRANDO HISTORIAS',
  periodo_inicio: '2024-05-06',
  periodo_fin: '2024-05-24',
  cct: '22DJN0059R',
  grupo_etiqueta: '2° "A"',
  modalidad_label: 'Taller Crítico',
  problema_contexto: 'Los alumnos han mostrado falta de interés al seguir reglas y establecer relaciones positivas con sus pares debido a su estilo de crianza y el exceso en el uso de las tecnologías, pantallas, celulares, computadora y televisión.',
  proposito: 'Los alumnos narren historias usando diversos lenguajes artísticos, reconozcan la secuencia lógica de las historias que conocen e inventen las propias. Favorecer el lenguaje oral, la escucha, la atención y el gusto por la lectura.',
  producto_integrador: 'Títeres guiñol, teatrino y representación teatral de historias para la comunidad escolar',
  campos_formativos: ['LENGUAJES', 'SABERES_PENSAMIENTO_CIENTIFICO'],
  pdas: [
    'Narra con secuencia lógica historias que escucha y utiliza los lenguajes artísticos para realizarla',
    'Utiliza los números para distintos propósitos. Forma serie numérica de forma correcta',
    'Distingue semejanzas y diferencias con los nombres de sus pares, por los sonidos, marcas gráficas o letras'
  ],
  pda_campo_codigo: {
    'Narra con secuencia lógica historias que escucha y utiliza los lenguajes artísticos para realizarla': 'LENGUAJES',
    'Utiliza los números para distintos propósitos. Forma serie numérica de forma correcta': 'SABERES_PENSAMIENTO_CIENTIFICO',
    'Distingue semejanzas y diferencias con los nombres de sus pares, por los sonidos, marcas gráficas o letras': 'LENGUAJES'
  },
  campos_nombres: {
    'LENGUAJES': 'Lenguajes',
    'SABERES_PENSAMIENTO_CIENTIFICO': 'Saberes y Pensamiento Científico'
  },
  ejes_articuladores: ['ARTES_Y_EXPERIENCIAS_ESTETICAS', 'PENSAMIENTO_CRITICO', 'INCLUSION'],
  ejes_nombres: {
    'ARTES_Y_EXPERIENCIAS_ESTETICAS': 'Artes y experiencias estéticas',
    'PENSAMIENTO_CRITICO': 'Pensamiento crítico',
    'INCLUSION': 'Inclusión'
  },
  ajustes_razonables: 'Para alumnos con BAP en lenguaje oral, utilizar tarjetas con pictogramas secuenciados y títeres para facilitar la expresión sin presión directa.',
  taller_critico: {
    reflexion_inicial: 'Momento 1: ¿Has narrado una historia? ¿Cómo se puede narrar? ¿Qué ocupamos para narrar? Lectura de imágenes en el acervo de la biblioteca.',
    produccion: 'Momento 2 y 3: Narración de historias a través de la expresión corporal. Elaboración de títeres de conejito con palito de madera.',
    socializacion: 'Momento 4: Valoramos lo aprendido en asamblea escolar. Exposición de dibujos y dramatización ante la comunidad escolar.'
  },
  rutinarias: [
    '9:00 a 9:10 am: Honores a la bandera (lunes) / Colocación de jornada diaria',
    '9:10 a 9:35 am: Fecha, saludo, pase de lista e hidratación',
    '10:45 a 11:00 am: Refrigerio higiénico',
    '11:00 a 11:30 am: Recreo guiado y sana convivencia',
    '11:50 a 12:00 pm: Retroalimentación del día y despedida'
  ],
  recurrentes: [
    'Actividad del día de la madre: jarrón de girasoles estilo Van Gogh y corona',
    'Lenguajes: Reconocimiento de nombre con alfabeto móvil y amigos con la misma letra',
    'Saberes: Pase de lista con la oruga numérica y baile de los números (1 al 10)'
  ],
  sesiones: [
    {
      numero: 1,
      etiqueta: 'Lunes 06 de Mayo — Momento 1: Situación inicial y preguntas detonadoras',
      bloques: [
        { momento: 'inicio', contenido: 'Honores a la bandera y colocación de la jornada diaria.', recursos: 'Franelógrafo' },
        { momento: 'desarrollo', contenido: 'Asamblea: ¿Qué es una historia? ¿Quién puede narrar? Exploración de libros literarios de la biblioteca de aula.', recursos: 'Acervo de biblioteca' }
      ]
    },
    {
      numero: 2,
      etiqueta: 'Martes 07 de Mayo — Momento 2: Conexión con los libros',
      bloques: [
        { momento: 'desarrollo', contenido: 'Ordenar imágenes de una historia de forma secuenciada (inicio, desarrollo, final).', recursos: 'Tarjetas secuenciales' }
      ]
    },
    {
      numero: 3,
      etiqueta: 'Miércoles 08 de Mayo — Momento 3: Taller y expresión corporal',
      bloques: [
        { momento: 'desarrollo', contenido: 'Narración de la historia en el patio con cojines. Preguntas de comprensión lectora.', recursos: 'Cojines, tapetes' }
      ]
    },
    {
      numero: 4,
      etiqueta: 'Jueves 09 de Mayo — Confección del títere',
      bloques: [
        { momento: 'desarrollo', contenido: 'Elaboración del títere de conejitos con cartulina y palito de madera. Dramatización por parejas.', recursos: 'Cartulina, palitos, pegamento' }
      ]
    },
    {
      numero: 5,
      etiqueta: 'Viernes 10 de Mayo — Convivencia del día de la madre',
      bloques: [
        { momento: 'cierre', contenido: 'Dramatización y canto de la melodía ensayada en música con mamá.', recursos: 'Regalos elaborados, música' }
      ]
    }
  ],
  bitacoras: [
    {
      fecha: '2024-05-06',
      sesion_numero: 1,
      participacion_grupo: 5,
      dificultades: 'Los niños se entusiasmaron al ojear los libros de la biblioteca; varios identificaron personajes conocidos.'
    }
  ],
  alumnos_evaluaciones: [
    { alumno_nombre: 'Luciana', nivel: 1, observaciones: 'Narra con secuencia lógica utilizando su títere.' },
    { alumno_nombre: 'Mateo', nivel: 1, observaciones: 'Expresa con emoción las partes de la historia que más le gustaron.' },
    { alumno_nombre: 'Kenneth Saúl', nivel: 2, observaciones: 'Mantuvo la atención en la narración sentado con apoyo de su cojín.' }
  ]
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  const planes = [
    { data: plan1, filename: 'plan_1_colorin_colorante_oficial.pdf' },
    { data: plan2, filename: 'plan_2_narrando_historias_oficial.pdf' }
  ];

  for (const item of planes) {
    console.log(`Renderizando ${item.filename}...`);
    const html = buildPlaneacionHtml(item.data);
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    const outPath = `/home/antigravity/pdfs_generados/${item.filename}`;
    await page.pdf({
      path: outPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '10mm', bottom: '12mm', left: '10mm', right: '10mm' }
    });
    
    fs.copyFileSync(outPath, `/home/antigravity/frank-vcorp/educacion/Educacion/public/descargas/${item.filename}`);
    
    await page.close();
    console.log(`✓ Generado exitosamente: ${outPath}`);
  }

  await browser.close();
}

run().catch(console.error);
