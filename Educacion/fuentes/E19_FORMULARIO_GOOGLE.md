# Google Form — Encuesta para maestros de NEM

**Versión:** 0.3 — legible + prompt de referencia
**Fecha:** 2026-08-13
**Estado:** LISTO PARA CREAR — fuente legible humana
**Audiencia:** maestra de educación básica en México (preescolar, primaria, secundaria). Genérico para que Lola pueda compartir con colegas.
**Política de datos:** SIN datos personales. SIN CCT. SIN nombre del director. SIN celular. Esto baja fricción y mantiene LFPDPPP-friendly.
**Persistencia:** las respuestas NO se guardan en este repo. Solo el Google Sheet asociado al Form.

---

## Cómo se usa este archivo

**Hay 3 formas de crear el Form, ordenadas por facilidad:**

### OPCIÓN 1 (recomendada) — Manual en Google Forms (5 minutos)
Tú lees las preguntas de este archivo y las pegas en Google Forms. Más control, sin dependencia de IA.

### OPCIÓN 2 — Gemini Workspace con prompt compacto (1 minuto)
Tienes un prompt compacto al final del archivo que cabe en el límite de 5000 chars de Gemini. **Antes de pegar el prompt**, lee las preguntas bien redactadas de este archivo para que sepas qué esperar. Si Gemini "comprime" o cambia algo, lo detectas.

### OPCIÓN 3 — Híbrido
Usa el prompt compacto para crear el form inicial, luego abre el form en Google Forms y **compara** cada pregunta contra este .md. Si Gemini generó algo "raro", lo corriges manualmente.

---

## Configuración general del form (para todas las opciones)

**Título:** "Tu forma de planear — Encuesta para maestros"

**Descripción:**
> Encuesta anónima para entender cómo haces tus planeaciones NEM. Tus respuestas se usan solo para mejorar la herramienta que estoy construyendo. Cero datos personales.

**Configuración crítica** (Settings ⚙):
- ✅ **NO recolectar email** (clave — desactivado).
- ✅ **Show progress bar** activado.
- ✅ **Limit to 1 response** desactivado.
- ✅ Confirmación al enviar: *"¡Gracias! Tu respuesta quedó registrada. Si quieres, pasa este link a un(a) colega maestro(a)."*

---

## SECCIÓN 1 — Sobre ti (sin identificarte)

Esta primera sección no pide nombre ni email ni CCT. Solo características profesionales generales. Es como preguntar "¿de qué color es tu sombrero?" — no es invasivo.

### Pregunta 1
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿En qué nivel das clases?
**Opciones:**
- Preescolar
- Primaria
- Secundaria
- Otro

### Pregunta 2
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cuántos años llevas dando clases?
**Opciones:**
- Menos de 5
- Entre 5 y 15
- Más de 15

### Pregunta 3
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cuántos alumnos tienes por grupo (aproximado)?
**Opciones:**
- 1-15
- 16-25
- 26-35
- Más de 35

### Pregunta 4
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Dónde planeas la mayoría de las veces?
**Opciones:**
- En casa de noche con celular
- En casa con laptop
- En la escuela antes o después de clase
- En la escuela en recesos
- Otro

### Pregunta 5
**Tipo:** Texto corto · opcional
**Pregunta:** (Solo si respondiste "Otro" en la anterior) Específíca dónde planeas.
**Texto de ayuda:** Si elegiste Otro, cuéntanos brevemente. Si no, ignora esta pregunta.

---

## SECCIÓN 2 — Sobre las planeaciones NEM hoy

### Pregunta 6
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cada cuánto entregas una planeación al director?
**Opciones:**
- Cada semana
- Cada quince días
- Cada mes
- Cuando me la piden
- Otro

### Pregunta 7
**Tipo:** Texto corto · opcional
**Pregunta:** (Solo si elegiste "Otro" en la pregunta anterior) Específíca la periodicidad.

### Pregunta 8
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Más o menos cuánto tiempo te toma hacer UNA planeación completa?
**Opciones:**
- Menos de 1 hora
- Entre 1 y 3 horas
- Entre 3 y 6 horas
- Más de 6 horas
- No me quiero acordar

### Pregunta 9
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cómo la entregas al director?
**Opciones:**
- Impresa en papel
- Por correo electrónico (PDF, Word)
- Por WhatsApp (foto, archivo)
- Subida a alguna plataforma
- Otro

### Pregunta 10
**Tipo:** Texto corto · opcional
**Pregunta:** (Solo si elegiste "Otro" arriba) Específíca cómo entregas la planeación.

### Pregunta 11
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿El director te regresa la planeación con cambios?
**Opciones:**
- Sí, casi siempre me pide correcciones o cambios
- A veces, pero solo algunas veces
- Casi nunca, solo cuando hay errores
- Nunca, las acepta como se las entrego

### Pregunta 12
**Tipo:** Texto largo (paragraph) · **obligatoria**
**Pregunta:** ¿Qué parte de hacer la planeación te quita más tiempo o te frustra más?
**Texto de ayuda:** Escribe lo que te moleste, sin filtro. Cuanto más concreto mejor (ej: "rellenar el problema del contexto", "elegir los PDA del programa", "calcular las horas por semana").

---

## SECCIÓN 3 — Sobre los núcleos y campos formativos de la SEP

### Pregunta 13
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Usas el "núcleo" o las actividades que la SEP publica para cada tema?
**Opciones:**
- Sí, siempre me baso en eso
- A veces las consulto
- Las conozco pero no las sigo al pie de la letra
- No las conozco bien / se me dificulta encontrarlas
- Otra

### Pregunta 14
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Te sería útil que esos núcleos ya estuvieran cargados en una herramienta y tú solo armaras la clase con ellos (como "bloques" para arrastrar)?
**Opciones:**
- Sí, eso me ahorraría mucho tiempo
- Tal vez, habría que verlo
- No, yo prefiero escribir todo desde cero
- No sé bien qué quieres decir

### Pregunta 15
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cómo relacionas cada clase con los "campos formativos" (Lenguajes, Saberes y Pensamiento Científico, Ética, Naturaleza y Sociedades, De lo Humano y lo Comunitario)?
**Opciones:**
- Lo tengo claro y no me cuesta
- Lo tengo que pensar o buscar cada vez
- Lo pongo más por cumplir el formato que por convicción
- Se me complica

---

## SECCIÓN 4 — Después de la clase (bitácora y evidencias)

### Pregunta 16
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** Después de dar la clase, ¿tomas notas o haces algo para recordar cómo te fue?
**Opciones:**
- Sí, escribo en un cuaderno o bitácora
- Sí, pero solo a veces (cuando me acuerdo o cuando tengo tiempo)
- Lo hago en una hoja y luego la pierdo
- No, lo dejo en mi cabeza
- Otro

### Pregunta 17
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** Si tomas notas, ¿cuánto tiempo te toma hacerlo después de la clase?
**Opciones:**
- Menos de 1 minuto (rápido, casi nada)
- Entre 1 y 5 minutos
- Entre 5 y 15 minutos
- Más de 15 minutos
- No tomo notas
- Otro

### Pregunta 18
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Tienes que reportar evidencias a alguien (fotos de los niños trabajando, productos, reportes)?
**Opciones:**
- Sí, fotos al director
- Sí, reportes periódicos a la supervisión
- Sí, fotos o notas a los papás
- No, solo el director recibe la planeación, no las evidencias
- Otro

### Pregunta 19
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Te ha pasado que después de varias semanas o meses quieres recordar qué tema diste con X niño y no encuentras la info?
**Opciones:**
- Sí, muchas veces
- Sí, pero solo algunas veces
- Pocas veces
- No, tengo todo bien organizado

### Pregunta 20
**Tipo:** Texto largo (paragraph) · opcional
**Pregunta:** ¿Qué te ayudaría más para no perder esa información después de la clase?
**Texto de ayuda:** Si se te ocurre algo, dímelo aunque suene raro.

---

## SECCIÓN 5 — Sobre la tecnología que usas

### Pregunta 21
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Qué tan cómoda te sientes con el celular para trabajar (apps, formularios, etc.)?
**Opciones:**
- Muy cómoda, lo uso para casi todo
- Más o menos, solo lo básico
- Me cuesta, prefiero papel
- No me gusta, solo para llamadas/WhatsApp

### Pregunta 22
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Tienes datos móviles (internet en el celular) en la escuela?
**Opciones:**
- Sí, siempre
- A veces se cae o no llega bien
- No, casi nunca tengo señal

### Pregunta 23
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Hoy usas alguna app o plataforma para tus planeaciones?
**Opciones:**
- Sí, uso una app específica (¿cuál? — por favor agrégalo en Observaciones o escríbelo en el campo libre)
- Sí, pero solo para guardar archivos (Drive, OneDrive, etc.)
- No, todo lo hago en Word/PDF
- No, todo lo hago a mano

### Pregunta 24
**Tipo:** Casillas de verificación · obligatoria
**Pregunta:** Si existiera una app donde tú armas la planeación arrastrando bloques (sin escribir tanto), la usarías si:
**Opciones** (puede marcar varias):
- Me ahorra tiempo real (más de 1 hora a la semana)
- Es bonita y se ve profesional
- El director la aceptara sin pedirme cambios
- No tengo que aprender algo muy complicado
- Sirve aunque no tenga internet
- Otra (cuéntanos en el siguiente campo)

### Pregunta 25 (opcional, solo si marcó "Otra" arriba)
**Tipo:** Texto corto · opcional
**Pregunta:** Si elegiste "Otra" en la pregunta anterior, ¿qué otra cosa te motivaría?

---

## SECCIÓN 6 — Sobre la entrega al director y el ecosistema

### Pregunta 26
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** Hoy, cuando entregas tu planeación al director, ¿él o ella la revisa realmente o solo la archiva?
**Opciones:**
- La revisa de verdad y me da retroalimentación útil
- La pasa a otra instancia (supervisión) sin revisarla mucho
- Solo la archiva, casi nunca me dice nada
- Depende del director, pero en general la archiva

### Pregunta 27
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Pagas de tu bolsillo por algo para tus clases (materiales, apps, cursos, etc.)?
**Opciones:**
- Sí, bastante
- Sí, pero solo lo mínimo
- Poca cosa
- No, todo lo cubre la escuela/SEP

### Pregunta 28
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** Si una herramienta te ahorrara por lo menos 3-4 horas a la semana y costara $300 MXN al mes, ¿la pagarías tú de tu bolsa?
**Opciones:**
- Sí, sin pensarlo
- Tal vez, tendría que ver cuánto realmente me ahorra
- Probablemente no, está fuera de mi presupuesto
- No, yo no pago nada para trabajar
- Otra

---

## SECCIÓN 7 — Cierre

### Pregunta 29
**Tipo:** Texto largo (paragraph) · opcional
**Pregunta:** Si conoces a otro(a) maestro(a) que pueda contestar también, pásale este link.
**Texto de ayuda:** Si quieres, dime cómo contactarlo (no obligatorio). Si no, ignora.

### Pregunta 30
**Tipo:** Texto largo (paragraph) · opcional
**Pregunta:** (Última) ¿Algo más que quieras decir sobre planeaciones, sobre la dirección, o sobre esta encuesta?
**Texto de ayuda:** Espacio libre. Si no, ignora.

---

## Resumen del Form

- **Total preguntas:** 30 (más 5 preguntas condicionales opcionales).
- **Tiempo estimado de respuesta:** 10-15 minutos.
- **Datos personales pedidos:** CERO. Ni email, ni nombre, ni CCT, ni celular.
- **LFPDPPP-friendly:** ✅ diseñado para no requerir base legal.

---

## OPCIÓN 2 — Prompt compacto para Gemini Workspace (3501 caracteres)

> **IMPORTANTE:** Gemini Workspace NO puede leer archivos de tu repo local. Solo lee archivos de **Google Drive** si los subes y los menciones con `@`. Por lo tanto, este prompt **se pega completo** a Gemini y se crea el form en una sola llamada.

Antes de pegarlo, abre mentalmente las **preguntas de las SECCIONES 1-7 de este archivo** como referencia. Si Gemini se equivoca o simplifica algo, lo notarás.

```
Crea Google Form "Tu forma de planear" descripción "Encuesta anónima NEM. Cero datos personales". Sin email, con progress bar, sin límite de respuestas.

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

**Tamaño:** 3501 caracteres (cabe holgadamente en 5000 chars).

---

## Después de que Gemini cree el Form (Opción 2) — Validación cruzada

Abre el form generado en Google Forms y compara contra las secciones de este `.md`. **Cosas que más probable se rompen con Gemini**:

1. **Q5, Q7, Q10, Q25** — las preguntas "Si elegiste Otro" condicionales. Gemini a veces las crea como preguntas normales, no como condicionales. Corregir manualmente.
2. **Q12** — texto largo con ayuda "Escribe lo que te moleste". Verificar que aparezca.
3. **Q24** — casillas de verificación (no múltiple). Verificar que permita seleccionar varias, no una sola.
4. **Confirmación** — el mensaje al enviar debe decir "¡Gracias! Tu respuesta quedó registrada."

Si encuentras discrepancias, corrige manualmente en el editor de Google Forms.

---

## Mensaje sugerido para compartir con tía Lola

> "Hola tía Lola. Te paso una encuesta rápida (10-15 min) sobre cómo haces tus planeaciones NEM. Es para una herramienta que estoy construyendo. **Es anónima** — no te pide nombre ni CCT ni email. Si te late, pásale el link a otro(a) maestro(a). ¡Gracias!" — Link: [PEGAR LINK AQUÍ]

---

## Política de evidencia (decidida)

- Respuestas viven en Google Sheets (gratis, automático).
- Este repo conserva SOLO el documento de diseño de la encuesta (este archivo).
- Si en el futuro quieres análisis cuantitativo, exportas el CSV desde Google Sheets en el momento.
- Respetas privacidad y simplificas LFPDPPP.

---

## Relación con Encuesta_Tia_Lola.md

`Educacion/Encuesta_Tia_Lola.md` es el documento "maestro" original con preguntas y contexto pedagógico completo. Este archivo `E19_FORMULARIO_GOOGLE.md` es la **versión desplegable** optimizada para Google Forms con tipos de pregunta y validaciones.

**NO eliminamos** `Encuesta_Tia_Lola.md` — sigue siendo útil como referencia y para futuras iteraciones.

---

**Fin del archivo v0.3.**
