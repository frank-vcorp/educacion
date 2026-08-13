# E19b — Prompt Gemini para crear el form

**Versión:** 0.1
**Fecha:** 2026-08-13
**Estado:** OPERATIVO
**Origen:** Separado de `E19_FORMULARIO_GOOGLE.md` para que ese archivo quede LIMPIO como documento del form (legible, listo para pasar a Google Forms manualmente).
**Alineado a:** `E19_FORMULARIO_GOOGLE.md` (versión legible del form).

---

## Instrucciones de uso

### Pasos:

1. Abre `E19_FORMULARIO_GOOGLE.md` y léelo (es tu referencia maestra de las preguntas).
2. Pega el prompt de abajo en Gemini in Workspace.
3. Gemini crea el form en tu Google Drive.
4. Abre el form generado y compara cada pregunta contra `E19_FORMULARIO_GOOGLE.md` (sección "Validación cruzada" más abajo te recuerda los 4 puntos donde Gemini más probable mete la pata).
5. Corrige manualmente lo que haga falta.
6. Comparte con tía Lola usando el mensaje final.

### Por qué este archivo está separado

El `.md` principal (`E19_FORMULARIO_GOOGLE.md`) define **qué preguntas va el form**. Este archivo es el **Cómo se crea con Gemini**.

Mezclar ambos en un solo archivo hace que cuando lo abras como humano tengas que saltar entre dos modos mentales. Mejor tener dos: uno limpio de preguntas, uno operativo de prompt IA.

---

## El prompt (pegar tal cual, 3501 chars)

```
Crea Google Form con título "Cómo planificas en NEM — Encuesta para docentes de preescolar, primaria y secundaria" y esta descripción: "Encuesta anónima para maestras y maestros de educación básica (pública o privada). Estamos construyendo una herramienta que te ayuda a hacer tus planeaciones NEM más rápido y mejor. Tus respuestas nos dicen qué necesita esa herramienta. Esta encuesta NO pide tu nombre, correo, CCT ni ningún dato personal. Te toma 10-15 minutos. Si quieres, compártela con otro(a) maestro(a)."

Configuración: NO recolectar email, "Show progress bar" activado, sin límite de respuestas por usuario, mensaje de confirmación exacto: "¡Gracias por tu tiempo! Tu respuesta quedó registrada. Si quieres compartir tu experiencia con un(a) colega, el link del formulario está disponible para que se lo envíes por WhatsApp o donde prefieras."

Q1 [Multiple, required] ¿En qué nivel das clases? Opciones: Preescolar|Primaria|Secundaria|Otro
Q2 [Multiple, required] ¿Años dando clases? Opciones: Menos de 5|Entre 5 y 15|Más de 15
Q3 [Multiple, required] ¿Cuántos alumnos por grupo? Opciones: 1-15|16-25|26-35|Más de 35
Q4 [Multiple, required] ¿Dónde planeas? Opciones: En casa de noche con celular|En casa con laptop|En la escuela antes/después de clase|En la escuela en recesos|Otro
Q5 [Text, optional] (Si Q4=Otro) Especifíca:
Q6 [Multiple, required] ¿Cada cuánto entregas planeación? Opciones: Cada semana|Cada quince días|Cada mes|Cuando me la piden|Otro
Q7 [Text, optional] (Si Q6=Otro) Especifíca:
Q8 [Multiple, required] ¿Cuánto te toma UNA planeación? Opciones: Menos de 1 hora|Entre 1 y 3 horas|Entre 3 y 6 horas|Más de 6 horas|No me quiero acordar
Q9 [Multiple, required] ¿Cómo la entregas? Opciones: Impresa en papel|Por correo electrónico|Por WhatsApp|Subida a alguna plataforma|Otro
Q10 [Text, optional] (Si Q9=Otro) Especifíca:
Q11 [Multiple, required] ¿El director te regresa con cambios? Opciones: Sí, casi siempre|A veces, pero no muchas|Casi nunca|Nunca, tal cual
Q12 [Paragraph, required] ¿Qué parte te quita más tiempo o frustra?
Q13 [Multiple, required] ¿Usas el "núcleo" SEP? Opciones: Sí, siempre|A veces las consulto|Conozco pero no las sigo|No las conozco bien|Otra
Q14 [Multiple, required] ¿Útil que esos núcleos ya estuvieran cargados como bloques arrastrables? Opciones: Sí, ahorraría mucho tiempo|Tal vez, habría que verlo|No, prefiero escribir todo|No sé qué quieres decir
Q15 [Multiple, required] ¿Relación con campos formativos? Opciones: Lo tengo claro y no me cuesta|Lo pienso cada vez|Por cumplir formato|Se me complica
Q16 [Multiple, required] ¿Tomas notas post-clase? Opciones: Sí, en cuaderno|Sí, a veces|En una hoja y la pierdo|No, en mi cabeza|Otro
Q17 [Multiple, required] ¿Cuánto te toma? Opciones: Menos de 1 minuto|1-5 minutos|5-15 minutos|Más de 15|No tomo notas|Otro
Q18 [Multiple, required] ¿Reportas evidencias a alguien? Opciones: Sí, al director|Sí, a supervisión|Sí, a papás|No|Otro
Q19 [Multiple, required] ¿Olvidas temas después de semanas? Opciones: Sí, muchas veces|Sí, a veces|Pocas veces|No
Q20 [Paragraph, optional] ¿Qué te ayudaría a no perder esa info?
Q21 [Multiple, required] Comodidad con celular Opciones: Muy cómoda|Solo lo básico|Me cuesta, prefiero papel|Solo llamadas/WhatsApp
Q22 [Multiple, required] Datos móviles en escuela Opciones: Sí, siempre|A veces se cae|No, casi nunca
Q23 [Multiple, required] ¿App actual? Opciones: Sí, específica|Solo guardar archivos|No, Word/PDF|No, a mano
Q24 [Checkbox, required] Usarías app de bloques si Opciones: Me ahorra tiempo real|Es bonita|El director la aceptara|No tengo que aprender mucho|Sirve sin internet|Otra
Q25 [Paragraph, optional] ¿Otro motivo no listado?
Q26 [Multiple, required] ¿Director revisa o archiva? Opciones: Revisa y retroalimenta|La pasa sin revisar|Solo archiva|Depende
Q27 [Multiple, required] ¿Pagas de tu bolsa? Opciones: Sí, bastante|Sí, lo mínimo|Poca cosa|No, cubre escuela
Q28 [Multiple, required] ¿Pagarías $300 MXN/mes si ahorra 3-4 h? Opciones: Sí, sin pensarlo|Tal vez|Probablemente no|No, yo no pago|Otra
Q29 [Paragraph, optional] ¿Otro(a) maestro(a) que pueda contestar?
Q30 [Paragraph, optional] ¿Algo más?

Confirmación al enviar: "¡Gracias! Tu respuesta quedó registrada. Pásale a otro(a) colega."

Devuelve SOLO el link.
```

**Tamaño:** 3501 caracteres (cabe holgadamente en 5000 chars de Gemini).

---

## Validación cruzada — qué se rompe más con Gemini

Después de que Gemini cree el form, ábrelo en Google Forms y compara contra `E19_FORMULARIO_GOOGLE.md`. Las cosas que **más probable** se rompen:

1. **Q5, Q7, Q10, Q25** — preguntas condicionales "Si elegiste Otro". Gemini a veces las crea como preguntas normales, no condicionales. Corregir manualmente.
2. **Q12** — texto largo con el texto de ayuda. Verificar que aparezca el "Escribe lo que te moleste, sin filtro."
3. **Q24** — debe ser **casillas de verificación** (no múltiple choice). Verificar que permita seleccionar varias opciones.
4. **Q29, Q30** — preguntas opcionales. Verificar que NO sean obligatorias.
5. **Mensaje de confirmación** — debe decir exactamente "¡Gracias por tu tiempo! Tu respuesta quedó registrada. Si quieres compartir tu experiencia con un(a) colega, el link del formulario está disponible para que se lo envíes por WhatsApp o donde prefieras."

Si encuentras discrepancias, corrige manualmente en el editor de Google Forms.

---

## Mensaje para enviar a tía Lola

> "Hola tía Lola. Te paso una encuesta que estoy usando para construir una herramienta que ayude a los maestros a hacer planeaciones NEM más rápido. Es **anónima** — no pide nombre, correo, CCT ni ningún dato personal. Te toma unos 10-15 minutos. Si te late y conoces a otros maestros que quieran opinar, pásales el mismo link. ¡Gracias!" — Link: [PEGAR LINK DEL FORM]

---

## Política de evidencia

- Respuestas del form van a Google Sheets (gratis, automático).
- Este repo NO guarda las respuestas, solo el diseño del form.
- Para análisis futuro, exportas CSV desde Sheets en el momento.
- Respetas privacidad y LFPDPPP sin esfuerzo.

---

## Archivos relacionados

- **`E19_FORMULARIO_GOOGLE.md`** — el documento LEGIBLE y LIMPIO del form (las 30 preguntas con sus tipos, opciones, ayudas). Este archivo NO debe contener prompts Gemini.
- **`Encuesta_Tia_Lola.md`** — encuesta original en formato markdown (sin tipos de Google Forms). Documento histórico.
- **Este archivo (`E19b_PROMPT_GEMINI.md`)** — operativo. Solo prompts de Gemini y notas de uso.
