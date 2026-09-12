/**
 * Guías contextuales para docentes (lenguaje de aula, no jerga técnica).
 * Usadas con `<SectionHelp />` en la vista de planeación.
 */

export interface GuiaPlaneacion {
  id: string;
  ariaLabel: string;
  breve: string;
  detalle: string;
}

export const GUIA_ACTIVIDADES: GuiaPlaneacion = {
  id: 'planeacion-actividades',
  ariaLabel: 'Ayuda: qué son las actividades en tu planeación',
  breve:
    'Cada recuadro es una actividad de tu clase (como en tu Word: “Tintura con café”, “Honores a la bandera”).',
  detalle: `Qué es: las actividades concretas que harás con tus niños y niñas cada día.

Cómo agregarlas:
1. Arrastra una actividad del catálogo (panel izquierdo) hacia el día o sección de la derecha.
2. O escribe la tuya en el cuadro “Añadir actividad”.

Para qué sirve: aquí queda el detalle de tu planeación; arriba ya guardaste el problema, los PDA y el propósito.

La IA solo sugiere textos: tú decides si aceptarlos. Nada se guarda solo.`,
};

export const GUIA_CATALOGO: GuiaPlaneacion = {
  id: 'planeacion-catalogo',
  ariaLabel: 'Ayuda: catálogo de actividades sugeridas',
  breve:
    'Ideas del NEM filtradas por tu campo, grado y PDA. Las más relevantes a tu centro aparecen arriba.',
  detalle: `Qué es: actividades sugeridas según tu planeación (campo formativo, PDA, grado y tema del centro).

Cómo empezar:
1. Elige el día arriba (Lunes 10 feb, etc.).
2. Arrastra una sugerida del catálogo (izquierda) o escribe la tuya abajo en «Escribir actividad propia».
3. Si vienes de tu Word, copia el texto del día tal cual — no necesitas buscar nada.

Las sugeridas arriba coinciden con tus PDA y el tema del centro. El buscador sirve para afinar (ej. “observación”, “experimento”).

Niveles: cerrado (casi listo), abierto (adaptas), en blanco (tú completas).`,
};

export const GUIA_ARRASTRAR: GuiaPlaneacion = {
  id: 'planeacion-arrastrar',
  ariaLabel: 'Ayuda: cómo arrastrar actividades',
  breve:
    'En computadora: arrastra con el mouse. En celular: mantén pulsado y suelta sobre la zona verde.',
  detalle: `Paso a paso:
1. Busca la actividad en el catálogo (izquierda).
2. Arrástrala a la zona que dice “Suelta aquí tu actividad”.
3. Aparecerá en la lista; puedes editarla o pedir ayuda de la IA.

También puedes mover una actividad ya agregada entre días arrastrándola de nuevo.

Si no funciona el arrastre, usa el botón “Agregar” o escribe manualmente abajo.`,
};

export const GUIA_ESTRUCTURA: GuiaPlaneacion = {
  id: 'planeacion-estructura',
  ariaLabel: 'Ayuda: fases y momentos de tu planeación',
  breve:
    'Las fases (Motivación, Acción, Evaluación…) son la estructura de tu proyecto; las actividades van dentro de cada día.',
  detalle: `En tu Word separas el proyecto en fases o momentos. Aquí lo ves como guía.

Proyecto / Centro de interés: Motivación → Diseño → Acción → Finalización → Evaluación.
Taller crítico: Momento 1 a 4.
Unidad didáctica: Lunes a Viernes.

Las actividades que arrastres o escribas se organizan por día (o por la sección única si es un proyecto corto).`,
};

export const GUIA_IA: GuiaPlaneacion = {
  id: 'planeacion-ia',
  ariaLabel: 'Ayuda: sugerencias de la IA',
  breve:
    'En cada actividad puedes pedir adaptar el texto a tu contexto o mejorar la redacción. Nada se guarda hasta que pulses “Aceptar”.',
  detalle: `Adaptar a mi contexto: la IA propone otra redacción de la actividad (por ejemplo, para escuela rural o urbana).

Mejorar redacción: amplía o aclara el texto que tú escribiste.

Revisar campos del PDF: pulir problema, propósito y ajustes antes de entregar al director.

Siempre tú decides: puedes editar la sugerencia o ignorarla.`,
};

/** Textos visibles de las herramientas IA (sin códigos F1/F2 en la UI). */
export const IA_COPY = {
  F1: {
    label: 'Adaptar a mi contexto',
    descripcion:
      'Propone otra redacción de esta actividad para tu realidad (rural, urbana, materiales de tu comunidad). Revisa y pulsa Aceptar para usarla.',
    boton: 'Pedir adaptación',
  },
  F2: {
    label: 'Mejorar redacción',
    descripcion:
      'Amplía o aclara el texto que escribiste. Puedes editarlo antes de aplicarlo a la actividad.',
    boton: 'Pedir mejora',
  },
  F3: {
    label: 'Revisar campos del PDF',
    descripcion:
      'Sugiere mejoras al problema, propósito, producto integrador y ajustes razonables antes de entregar.',
    boton: 'Pedir revisión',
  },
} as const;

export const GUIA_RECURSOS: GuiaPlaneacion = {
  id: 'planeacion-recursos',
  ariaLabel: 'Ayuda: materiales de tu aula',
  breve:
    'Arrastra los materiales que usarás ese día (cartulina, colores, cuentos…) hacia la misma zona del día.',
  detalle: `Qué es: tu inventario personal — lo que tienes en el salón.

Cómo usarlo:
1. Pestaña “Mi aula” (izquierda).
2. Arrastra un material hacia el día donde lo necesitas.
3. Aparecerá abajo del día, en “Materiales de este día”.

Si una actividad del catálogo pide materiales, la app te sugerirá cuáles de tu inventario podrían servir (pulsa “Usar”).

Si aún no registraste materiales, ve a Recursos del aula en el menú y agrégalos una vez; después los reutilizas en todas tus planeaciones.`,
};
