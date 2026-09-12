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

La IA (F1 y F2) solo sugiere textos: tú decides si aceptarlos. Nada se guarda solo.`,
};

export const GUIA_CATALOGO: GuiaPlaneacion = {
  id: 'planeacion-catalogo',
  ariaLabel: 'Ayuda: catálogo de actividades sugeridas',
  breve:
    'Son ideas listas del NEM. Mantén pulsado y arrastra hacia el día donde la harás.',
  detalle: `Qué es: un banco de actividades sugeridas por campo formativo (Lenguajes, Saberes, etc.), filtradas por el grado de tu grupo (1°, 2° o 3°), la modalidad y los campos de tu planeación.

Cómo usarlo:
• Toca el ícono ⋮⋮ y arrastra hacia la zona punteada del día.
• Si prefieres, pulsa “Agregar” en la tarjeta (útil en celular).

Niveles:
• Cerrado = texto casi listo.
• Abierto = puedes adaptarlo a tu grupo.
• En blanco = tú completas la idea.

No sustituye tu criterio: son apoyo, como las plantillas de Editorial.`,
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
    'La IA propone variantes; nada se aplica hasta que pulses “Aceptar”.',
  detalle: `F1 — Variante: otra forma de redactar la misma actividad (por ejemplo, para contexto rural).
F2 — Ayuda a redactar: expande o mejora el texto que escribiste.
F3 — Pulir PDF: revisa problema, propósito y ajustes antes de entregar.

Quién decide: siempre tú. Si no te convence, ignora la sugerencia o edita a mano.`,
};

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
