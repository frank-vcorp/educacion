# Google Form — Encuesta para maestros de NEM

**Versión:** 0.2
**Fecha:** 2026-08-13
**Estado:** ACTIVO — OPCIÓN C (prompt compacto 3501 chars)
**Audiencia:** maestra de educación básica en México (preescolar, primaria, secundaria). Genérico para que Lola pueda compartir con colegas.
**Política de datos:** SIN datos personales. SIN CCT. SIN nombre del director. SIN celular. Esto baja fricción y mantiene LFPDPPP-friendly.
**Persistencia:** las respuestas NO se guardan en este repo. Solo el Google Sheet asociado al Form.

**IMPORTANTE:** Gemini Workspace crea forms con UNA llamada por sesión. Si necesitas ampliar un form existente, exporta como JSON y úsalo con `@` en una nueva sesión (no se puede agregar preguntas en una segunda llamada directa).

---

## OPCIÓN C — RECOMENDADA — Un solo prompt ultra-compacto (3501 chars)

Pega **todo este bloque de una sola vez** en Gemini Workspace. Resultado: el form completo, listo para enviar.

```
Crea Google Form "Tu forma de planear" descripción "Encuesta anónima NEM. Cero datos personales". Sin email, con progress bar.

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
Q25 [Multiple, required] ¿Director revisa o archiva? Opciones: Revisa y retroalimenta|La pasa sin revisar|Solo archiva|Depende
Q26 [Multiple, required] ¿Pagas de tu bolsa? Opciones: Sí, bastante|Sí, lo mínimo|Poca cosa|No, cubre escuela
Q27 [Multiple, required] ¿Pagarías $300 MXN/mes si ahorra 3-4 h? Opciones: Sí, sin pensarlo|Tal vez|Probablemente no|No, yo no pago|Otra
Q28 [Paragraph, optional] ¿Otro(a) maestro(a) que pueda contestar?
Q29 [Paragraph, optional] ¿Algo más?

Confirmación al enviar: "¡Gracias! Tu respuesta quedó registrada. Pásale a otro(a) colega."

Devuelve SOLO el link.
```

**Tamaño:** 3501 caracteres (cabe holgadamente en 5000).
**Resultado:** 29 preguntas, todas las reglas aplicadas (sin email, sin CCT, sin datos personales).

---

## Cómo ampliar un form existente con Gemini (si necesitas agregar preguntas después)

1. Ve a Google Forms → abre el form → ⋮ menú → **"Download responses to CSV"** (o usa las opciones de descarga).
2. Opcional: descarga también el form como archivo `.zip` desde Drive (clic derecho → Download).
3. En una **nueva sesión de Gemini**, escribe:

```
Tengo este form exportado de Google Forms. Quiero agregar las siguientes preguntas al final, sin tocar las existentes. Usa el archivo adjunto como base.

@archivo_form.zip

Preguntas a agregar:
Q30 [Multiple, required] ...
```

4. Gemini **NO puede editar forms creados por Gemini directamente**, pero sí puede generar el JSON de configuración. Una alternativa es: Gemini te genera las preguntas en JSON y tú las pegas manualmente al form abierto en Google Forms (click en cada sección → agregar pregunta).

---

## OPCIÓN A — Crear el Form manualmente (5 minutos)

Pasos:

1. Ve a https://docs.google.com/forms/u/0/ (con tu cuenta Frank).
2. Click en **"+ Blank"** (formulario en blanco).
3. Arriba a la izquierda ponle título: **"Tu forma de planear — Encuesta para maestros"**.
4. Descripción: *"Encuesta anónima para entender cómo haces tus planeaciones NEM. Tus respuestas se usan solo para mejorar la herramienta que estoy construyendo. Cero datos personales."*
5. Click en **Settings** (engranaje arriba a la derecha):
   - ✅ "Limit to 1 response" → desactivado (queremos que varias maestras puedan responder).
   - ✅ "Show progress bar" → activado.
   - ✅ "Collect email addresses" → **DESACTIVADO**. Esto es clave: no recolectamos email.
6. Click en **"See all settings"** y revisa que **"Show link to submit another response"** esté activado.

Ahora agrega las preguntas.

---

## LISTA DE PREGUNTAS — Tipos recomendados

| # | Pregunta (texto EXACTO que pegues en el Form) | Tipo | Opciones / Notas |
|---|---|---|---|
| **Sección 1 — Quién eres (sin identificarte)** | | | |
| Q1 | ¿En qué nivel das clases? | Multiple choice · required | Preescolar · Primaria · Secundaria · Otro |
| Q2 | ¿Cuántos años llevas dando clases? | Multiple choice · required | Menos de 5 · Entre 5 y 15 · Más de 15 |
| Q3 | ¿Cuántos alumnos tienes por grupo (aproximado)? | Multiple choice · required | 1-15 · 16-25 · 26-35 · Más de 35 |
| Q4 | ¿Dónde planeas la mayoría de las veces? | Multiple choice · required | En casa de noche con celular · En casa con laptop · En la escuela antes/después de clase · En la escuela en recesos · Otro (campo libre) |
| Q4.1 | (Si eligió Otro) Específíca: | Short answer · optional | – |
| **Sección 2 — Sobre las planeaciones NEM hoy** | | | |
| Q5 | ¿Cada cuánto entregas una planeación al director? | Multiple choice · required | Cada semana · Cada quince días · Cada mes · Cuando me la piden · Otro (campo libre) |
| Q5.1 | (Si eligió Otro) Específíca: | Short answer · optional | – |
| Q6 | ¿Más o menos cuánto tiempo te toma hacer UNA planeación completa? | Multiple choice · required | Menos de 1 hora · Entre 1 y 3 horas · Entre 3 y 6 horas · Más de 6 horas · No me quiero acordar |
| Q7 | ¿Cómo la entregas al director? | Multiple choice · required | Impresa en papel · Por correo electrónico · Por WhatsApp · Subida a alguna plataforma · Otro (campo libre) |
| Q7.1 | (Si eligió Otro) Específíca: | Short answer · optional | – |
| Q8 | ¿El director te regresa la planeación con cambios? | Multiple choice · required | Sí, casi siempre · A veces · Casi nunca, solo cuando hay errores · Nunca, las acepta tal cual |
| Q9 | ¿Qué parte de hacer la planeación te quita más tiempo o te frustra más? | Paragraph · required | (espacio libre para que escriba lo que sienta, sin filtro) |
| **Sección 3 — Sobre los núcleos o actividades SEP** | | | |
| Q10 | ¿Usas el "núcleo" o las actividades que la SEP publica para cada tema? | Multiple choice · required | Sí, siempre · A veces las consulto · Las conozco pero no las sigo al pie · No las conozco bien / se me dificulta · Otro |
| Q11 | ¿Te sería útil que esos núcleos ya estuvieran cargados en una herramienta y tú solo armaras la clase con ellos (como "bloques" para arrastrar)? | Multiple choice · required | Sí, eso me ahorraría mucho tiempo · Tal vez, habría que verlo · No, prefiero escribir todo desde cero · No sé bien qué quieres decir |
| Q12 | ¿Cómo relacionas cada clase con los "campos formativos" (Lenguajes, Saberes, Ética, De lo Humano)? | Multiple choice · required | Lo tengo claro y no me cuesta · Lo tengo que pensar cada vez · Lo pongo más por cumplir · Se me complica |
| **Sección 4 — Después de la clase (bitácora / evidencias)** | | | |
| Q13 | Después de dar la clase, ¿tomas notas o haces algo para recordar cómo te fue? | Multiple choice · required | Sí, escribo en cuaderno/bitácora · Sí, pero solo a veces · En una hoja y la pierdo · No, lo dejo en mi cabeza · Otro |
| Q14 | Si tomas notas, ¿cuánto tiempo te toma hacerlo? | Multiple choice · required | Menos de 1 min · Entre 1 y 5 min · Entre 5 y 15 min · Más de 15 min · No tomo notas |
| Q15 | ¿Tienes que reportar evidencias a alguien (fotos, productos)? | Multiple choice · required | Sí, al director · Sí, a la supervisión · Sí, a los papás · No · Otro |
| Q16 | ¿Te ha pasado que después de varias semanas quieres recordar qué tema diste y no encuentras la info? | Multiple choice · required | Sí, muchas veces · Sí, algunas veces · Pocas veces · No |
| Q17 | ¿Qué te ayudaría más para no perder esa información después de la clase? | Paragraph · optional | (espacio libre) |
| **Sección 5 — Sobre la tecnología que usas** | | | |
| Q18 | ¿Qué tan cómoda te sientes con el celular para trabajar? | Multiple choice · required | Muy cómoda · Más o menos, solo lo básico · Me cuesta, prefiero papel · No me gusta, solo llamadas/WhatsApp |
| Q19 | ¿Tienes datos móviles (internet en el celular) en la escuela? | Multiple choice · required | Sí, siempre · A veces se cae · No, casi nunca |
| Q20 | ¿Hoy usas alguna app o plataforma para tus planeaciones? | Multiple choice · required | Sí, una app específica (cuál?: __) · Sí, guardar archivos (Drive, etc.) · No, todo Word/PDF · No, todo a mano |
| Q21 | Si existiera una app donde tú armas la planeación arrastrando bloques (sin escribir tanto), la usarías si: (marca las que apliquen) | Checkboxes · required | Me ahorra tiempo real (+1 h/semana) · Es bonita y profesional · El director la aceptara sin pedir cambios · No tengo que aprender algo complicado · Sirve aunque no tenga internet · Otro (campo libre) |
| Q21.1 | (Si eligió Otro) Específíca: | Short answer · optional | – |
| **Sección 6 — Sobre entrega al director y ecosistema** | | | |
| Q22 | Hoy, cuando entregas tu planeación al director, ¿él/ella la revisa o solo la archiva? | Multiple choice · required | La revisa y me da retroalimentación útil · La pasa a supervisión sin revisarla mucho · Solo la archiva · Depende |
| Q23 | ¿Pagas de tu bolsillo por algo para tus clases (materiales, apps, cursos)? | Multiple choice · required | Sí, bastante · Sí, lo mínimo · Poca cosa · No, todo lo cubre la escuela |
| Q24 | Si una herramienta te ahorrara 3-4 horas a la semana y costara $300 MXN/mes, ¿la pagarías? | Multiple choice · required | Sí, sin pensarlo · Tal vez, tendría que ver cuánto ahorra · Probablemente no · No, yo no pago nada · Otro |
| **Sección 7 — Bonus para formadores de primaria o secundaria** (opcional, saltar si preescolar) | | | |
| Q25 | Si te doy la oportunidad, ¿prefieres arrastrar bloques a un **calendario** o seguir con un **PDF estático** que llenas? | Multiple choice · optional | Calendario arrastrable · PDF estático · Me da igual |
| **Sección final — Sobre tus colegas** | | | |
| Q26 | ¿Conoces a otro(a) maestro(a) que pueda contestar también? Pásale este link. | Paragraph · optional | (texto libre) |
| Q27 | (Última) ¿Algo más que quieras decir sobre planeaciones? | Paragraph · optional | (texto libre) |

**Total:** 27 preguntas + 7 sub-preguntas condicionales.
**Tiempo estimado de respuesta:** 10-15 minutos.

---

## Después de crear el Form

1. Click en **Send** arriba a la derecha.
2. Click en el icono de **link** (no email).
3. ✅ Marca **"Allow responders to edit responses after submitting"** si quieres.
4. Copia el link.

El link será algo como: `https://docs.google.com/forms/d/e/<ID>/viewform`

---

## Cómo compartirlo

Mensaje sugerido para pasar a tía Lola (editable):

> "Hola tía Lola. Te paso una encuesta rápida (10-15 min) sobre cómo haces tus planeaciones NEM. Es para una herramienta que estoy armando. Es anónima — no te pide nombre ni CCT. Si quieres, pásale el link a otros(as) maestros(as) para tener más opiniones."
>
> [LINK]

---

## OPCIÓN B — Crear el Form automáticamente con Apps Script (avanzado)

Si te late la automatización, te genero el script de Google Apps Script (se ejecuta en tu Google Drive con un click y crea el Form con las 27 preguntas). Dime y lo escribo en este mismo repo.

---

## Política de evidencia (decidida: no guardar respuestas en el repo)

- Respuestas viven en Google Sheets (es gratis y automático).
- Este repo conserva SOLO el documento de diseño de la encuesta (este archivo).
- Si en el futuro quieres análisis cuantitativo, exportas el CSV desde Google Sheets en el momento.
- Respetas privacidad de las maestras y simplificas compliance LFPDPPP.

---

## Relación con Encuesta_Tia_Lola.md

`Educacion/Encuesta_Tia_Lola.md` sigue siendo el documento "maestro" de la encuesta — tiene las preguntas originales con contexto, ideal para iterar. Este archivo (`E19_FORMULARIO_GOOGLE.md` en `fuentes/`) es la versión "deployable" optimizada para el Form.

NO toco `Encuesta_Tia_Lola.md`. Es tu archivo de referencia con la v2 que ya hicimos.

---

**Fin del archivo.**

---

## OPCIÓN B (ACTIVA) — Prompt para Gemini in Workspace

Copia y pega este prompt EXACTO en la caja de Gemini que tienes en pantalla. **No modifiques el prompt**, solo dale a "Crear".

```
Crea un Google Form con el título "Tu forma de planear — Encuesta para maestros" y la siguiente descripción: "Encuesta anónima para entender cómo haces tus planeaciones NEM. Tus respuestas se usan solo para mejorar la herramienta que estoy construyendo. Cero datos personales."

Configuración obligatoria del form:
- NO recolectar direcciones de email (desactivar "Collect email addresses").
- "Show progress bar" activado.
- "Limit to 1 response" desactivado (varias maestras deben poder responder).
- Confirmación al enviar: "¡Gracias! Tu respuesta quedó registrada. Si quieres, pasa este link a un(a) colega maestro(a)."

Las preguntas son las siguientes, en este ORDEN EXACTO. Cada pregunta indica su tipo entre corchetes []. Crea cada pregunta con el tipo indicado y las opciones exactas.

PREGUNTAS:

[Sección — "Sobre ti (sin identificarte)"]

1. [Múltiple choice, obligatoria] "¿En qué nivel das clases?"
   Opciones: Preescolar | Primaria | Secundaria | Otro

2. [Múltiple choice, obligatoria] "¿Cuántos años llevas dando clases?"
   Opciones: Menos de 5 | Entre 5 y 15 | Más de 15

3. [Múltiple choice, obligatoria] "¿Cuántos alumnos tienes por grupo (aproximado)?"
   Opciones: 1-15 | 16-25 | 26-35 | Más de 35

4. [Múltiple choice, obligatoria] "¿Dónde planeas la mayoría de las veces?"
   Opciones: En casa de noche con celular | En casa con laptop | En la escuela antes o después de clase | En la escuela en recesos | Otro

   4.1 [Texto corto, opcional] Si elegiste "Otro", especifica: ____

[Sección — "Sobre las planeaciones NEM hoy"]

5. [Múltiple choice, obligatoria] "¿Cada cuánto entregas una planeación al director?"
   Opciones: Cada semana | Cada quince días | Cada mes | Cuando me la piden | Otro

   5.1 [Texto corto, opcional] Si elegiste "Otro", especifica: ____

6. [Múltiple choice, obligatoria] "¿Más o menos cuánto tiempo te toma hacer UNA planeación completa?"
   Opciones: Menos de 1 hora | Entre 1 y 3 horas | Entre 3 y 6 horas | Más de 6 horas | No me quiero acordar

7. [Múltiple choice, obligatoria] "¿Cómo la entregas al director?"
   Opciones: Impresa en papel | Por correo electrónico | Por WhatsApp | Subida a alguna plataforma | Otro

   7.1 [Texto corto, opcional] Si elegiste "Otro", especifica: ____

8. [Múltiple choice, obligatoria] "¿El director te regresa la planeación con cambios?"
   Opciones: Sí, casi siempre me pide correcciones | A veces, pero no muchas | Casi nunca, solo cuando hay errores | Nunca, las acepta tal cual

9. [Texto largo, obligatoria] "¿Qué parte de hacer la planeación te quita más tiempo o te frustra más?"
   Texto de ayuda: "Escribe lo que te moleste, sin filtro. Cuanto más concreto mejor."

[Sección — "Sobre los núcleos o actividades SEP"]

10. [Múltiple choice, obligatoria] "¿Usas el 'núcleo' o las actividades que la SEP publica para cada tema?"
    Opciones: Sí, siempre me baso en eso | A veces las consulto | Las conozco pero no las sigo al pie de la letra | No las conozco bien / se me dificulta encontrarlas | Otra

11. [Múltiple choice, obligatoria] "¿Te sería útil que esos núcleos ya estuvieran cargados en una herramienta y tú solo armaras la clase con ellos (como 'bloques' para arrastrar)?"
    Opciones: Sí, eso me ahorraría mucho tiempo | Tal vez, habría que verlo | No, yo prefiero escribir todo desde cero | No sé bien qué quieres decir

12. [Múltiple choice, obligatoria] "¿Cómo relacionas cada clase con los 'campos formativos' (Lenguajes, Saberes y Pensamiento Científico, Ética, De lo Humano y lo Comunitario)?"
    Opciones: Lo tengo claro y no me cuesta | Lo tengo que pensar/buscar cada vez | Lo pongo más por cumplir el formato que por convicción | Se me complica

[Sección — "Después de la clase"]

13. [Múltiple choice, obligatoria] "Después de dar la clase, ¿tomas notas o haces algo para recordar cómo te fue?"
    Opciones: Sí, escribo en un cuaderno o bitácora | Sí, pero solo a veces (cuando me acuerdo o tengo tiempo) | Lo hago en una hoja y luego la pierdo | No, lo dejo en mi cabeza | Otro

14. [Múltiple choice, obligatoria] "Si tomas notas, ¿cuánto tiempo te toma hacerlo después de la clase?"
    Opciones: Menos de 1 minuto | Entre 1 y 5 minutos | Entre 5 y 15 minutos | Más de 15 minutos | No tomo notas | Otro

15. [Múltiple choice, obligatoria] "¿Tienes que reportar evidencias a alguien (fotos, productos)?"
    Opciones: Sí, fotos al director | Sí, reportes a la supervisión | Sí, fotos o notas a los papás | No, solo el director recibe la planeación | Otro

16. [Múltiple choice, obligatoria] "¿Te ha pasado que después de varias semanas o meses quieres recordar qué tema diste con X niño y no encuentras la info?"
    Opciones: Sí, muchas veces | Sí, pero solo algunas veces | Pocas veces | No, tengo todo bien organizado

17. [Texto largo, opcional] "¿Qué te ayudaría más para no perder esa información después de la clase?"

[Sección — "Sobre la tecnología que usas"]

18. [Múltiple choice, obligatoria] "¿Qué tan cómoda te sientes con el celular para trabajar (apps, formularios)?"
    Opciones: Muy cómoda, lo uso para casi todo | Más o menos, solo lo básico | Me cuesta, prefiero papel | No me gusta, solo llamadas/WhatsApp

19. [Múltiple choice, obligatoria] "¿Tienes datos móviles (internet en el celular) en la escuela?"
    Opciones: Sí, siempre | A veces se cae o no llega bien | No, casi nunca tengo señal

20. [Múltiple choice, obligatoria] "¿Hoy usas alguna app o plataforma para tus planeaciones?"
    Opciones: Sí, uso una app específica (cuál) | Sí, pero solo para guardar archivos (Drive, OneDrive, etc.) | No, todo lo hago en Word/PDF | No, todo lo hago a mano

21. [Casillas de verificación, obligatoria] "Si existiera una app donde tú armas la planeación arrastrando bloques (sin escribir tanto), la usarías si:"
    Opciones:
    - Me ahorra tiempo real (más de 1 hora a la semana)
    - Es bonita y se ve profesional
    - El director la aceptara sin pedirme cambios
    - No tengo que aprender algo muy complicado
    - Sirve aunque no tenga internet
    - Otra (campo libre)

    21.1 [Texto corto, opcional] Si elegiste "Otra", especifica: ____

[Sección — "Sobre entrega al director y ecosistema"]

22. [Múltiple choice, obligatoria] "Hoy, cuando entregas tu planeación al director, ¿él o ella la revisa realmente o solo la archiva?"
    Opciones: La revisa de verdad y me da retroalimentación útil | La pasa a otra instancia (supervisión) sin revisarla mucho | Solo la archiva, casi nunca me dice nada | Depende del director, pero en general la archiva

23. [Múltiple choice, obligatoria] "¿Pagas de tu bolsillo por algo para tus clases (materiales, apps, cursos)?"
    Opciones: Sí, bastante | Sí, pero solo lo mínimo | Poca cosa | No, todo lo cubre la escuela/SEP

24. [Múltiple choice, obligatoria] "Si una herramienta te ahorrara por lo menos 3-4 horas a la semana y costara $300 MXN al mes, ¿la pagarías tú de tu bolsa?"
    Opciones: Sí, sin pensarlo | Tal vez, tendría que ver cuánto ahorra | Probablemente no, está fuera de mi presupuesto | No, yo no pago nada para trabajar | Otra

[Sección — "Bonus para formadores de primaria o secundaria"]

25. [Múltiple choice, opcional] "Si te doy la oportunidad, ¿prefieres arrastrar bloques a un calendario interactivo, o seguir con un PDF estático que llenas?"
    Opciones: Calendario arrastrable | PDF estático | Me da igual

[Sección — "Final — Sobre tus colegas y comentarios libres"]

26. [Texto largo, opcional] "¿Conoces a otro(a) maestro(a) que pueda contestar también? Pásale este link."
    Texto de ayuda: "Si quieres, escribe nombre y cómo contactarlo para invitarla."

27. [Texto largo, opcional] "(Última) ¿Algo más que quieras decir sobre planeaciones, dirección o esta encuesta?"
```

REGLAS ADICIONALES PARA EL FORM:
- Cada "Sección —" debe ser un salto de sección (page break) en Google Forms.
- El orden EXACTO de las preguntas es el indicado arriba.
- NO agregues preguntas extras.
- NO omitas ninguna pregunta.
- Las preguntas opcionales NO deben ser obligatorias.
- NO pidas email, CCT, nombre, celular, ni ningún dato personal en ninguna pregunta.

Cuando termines de crear el form, devuelve SOLO el link del formulario generado en una sola línea.
```

## Después de darle "Crear" en Gemini

Gemini genera el Form en tu Google Drive y te da un link. Pásalo a tía Lola con este mensaje:

> "Hola tía Lola. Te paso una encuesta rápida (10-15 min) sobre cómo haces tus planeaciones NEM. Es para una herramienta que estoy construyendo. **Es anónima** — no te pide nombre ni CCT ni email. Si te late, pásale el link a otro(a) maestro(a). ¡Gracias!" — Link: [PEGAR LINK]

---

## OPCIÓN B-CORTA — Prompt Gemini en 2 pasos (límite 5000 chars)

Como Gemini tiene límite de 5000 caracteres por prompt, divido la creación en **2 prompts consecutivos**.

### PASO 1 (pega esto primero; < 4500 chars):

```
Crea un Google Form llamado "Tu forma de planear — Encuesta para maestros" con descripción "Encuesta anónima sobre cómo haces tus planeaciones NEM. Cero datos personales."

Configuración: NO recolectar email, "Show progress bar" activado, sin límite de respuestas por usuario.

Crea estas preguntas EN ESTRICTO ORDEN con salto de sección entre cada bloque marcado con "===":

=== Sobre ti (sin identificarte) ===

1. ¿En qué nivel das clases? [Múltiple, obligatoria]
   Opciones: Preescolar | Primaria | Secundaria | Otro

2. ¿Cuántos años llevas dando clases? [Múltiple, obligatoria]
   Opciones: Menos de 5 | Entre 5 y 15 | Más de 15

3. ¿Cuántos alumnos tienes por grupo? [Múltiple, obligatoria]
   Opciones: 1-15 | 16-25 | 26-35 | Más de 35

4. ¿Dónde planeas la mayoría de las veces? [Múltiple, obligatoria]
   Opciones: En casa de noche con celular | En casa con laptop | En la escuela antes/después de clase | En la escuela en recesos | Otro

5. (Solo si Q4=Otro) Específíca: [Texto corto, opcional]

=== Sobre las planeaciones NEM hoy ===

6. ¿Cada cuánto entregas una planeación al director? [Múltiple, obligatoria]
   Opciones: Cada semana | Cada quince días | Cada mes | Cuando me la piden | Otro

7. (Solo si Q6=Otro) Específíca: [Texto corto, opcional]

8. ¿Cuánto tiempo te toma hacer UNA planeación completa? [Múltiple, obligatoria]
   Opciones: Menos de 1 hora | Entre 1 y 3 horas | Entre 3 y 6 horas | Más de 6 horas | No me quiero acordar

9. ¿Cómo la entregas al director? [Múltiple, obligatoria]
   Opciones: Impresa en papel | Por correo electrónico | Por WhatsApp | Subida a alguna plataforma | Otro

10. (Solo si Q9=Otro) Específíca: [Texto corto, opcional]

11. ¿El director te regresa la planeación con cambios? [Múltiple, obligatoria]
    Opciones: Sí, casi siempre | A veces, pero no muchas | Casi nunca, solo cuando hay errores | Nunca, las acepta tal cual

12. ¿Qué parte de hacer la planeación te quita más tiempo o te frustra más?
    [Texto largo, obligatoria]
    Ayuda: "Escribe lo que te moleste, sin filtro. Cuanto más concreto mejor."

13. ¿Usas el "núcleo" o actividades que la SEP publica para cada tema? [Múltiple, obligatoria]
    Opciones: Sí, siempre me baso en eso | A veces las consulto | Las conozco pero no las sigo al pie | No las conozco bien / se me dificulta encontrarlas | Otra

14. ¿Te sería útil que esos núcleos ya estuvieran cargados en una herramienta y tú solo armaras la clase con ellos (como bloques para arrastrar)? [Múltiple, obligatoria]
    Opciones: Sí, eso me ahorraría mucho tiempo | Tal vez, habría que verlo | No, prefiero escribir todo desde cero | No sé qué quieres decir

15. ¿Cómo relacionas cada clase con los "campos formativos" (Lenguajes, Saberes, Ética, De lo Humano)? [Múltiple, obligatoria]
    Opciones: Lo tengo claro y no me cuesta | Lo tengo que pensar cada vez | Lo pongo por cumplir el formato | Se me complica

NO termines el form aquí. Devuélveme solo "Listo para el siguiente paso" cuando termines este bloque, con el link del form hasta ahora.
```

### PASO 2 (pega esto DESPUÉS; < 4500 chars):

```
Continúa el Form "Tu forma de planear — Encuesta para maestros" agregando estas preguntas al final, MANTENIENDO el orden. NO modifiques las anteriores:

=== Después de la clase ===

16. Después de dar la clase, ¿tomas notas para recordar cómo te fue? [Múltiple, obligatoria]
    Opciones: Sí, escribo en cuaderno/bitácora | Sí, pero solo a veces | En una hoja y luego la pierdo | No, lo dejo en mi cabeza | Otro

17. Si tomas notas, ¿cuánto tiempo te toma hacerlo? [Múltiple, obligatoria]
    Opciones: Menos de 1 minuto | Entre 1 y 5 minutos | Entre 5 y 15 minutos | Más de 15 minutos | No tomo notas | Otro

18. ¿Tienes que reportar evidencias a alguien (fotos, productos)? [Múltiple, obligatoria]
    Opciones: Sí, fotos al director | Sí, reportes a la supervisión | Sí, fotos o notas a los papás | No, solo el director recibe la planeación | Otro

19. ¿Te ha pasado que después de varias semanas quieres recordar qué tema diste y no encuentras la info? [Múltiple, obligatoria]
    Opciones: Sí, muchas veces | Sí, pero algunas veces | Pocas veces | No, tengo todo bien organizado

20. ¿Qué te ayudaría más para no perder esa información después de la clase? [Texto largo, opcional]

=== Sobre la tecnología que usas ===

21. ¿Qué tan cómoda te sientes con el celular para trabajar (apps, formularios)? [Múltiple, obligatoria]
    Opciones: Muy cómoda, lo uso para casi todo | Más o menos, solo lo básico | Me cuesta, prefiero papel | No me gusta, solo llamadas/WhatsApp

22. ¿Tienes datos móviles (internet en el celular) en la escuela? [Múltiple, obligatoria]
    Opciones: Sí, siempre | A veces se cae | No, casi nunca tengo señal

23. ¿Hoy usas alguna app o plataforma para tus planeaciones? [Múltiple, obligatoria]
    Opciones: Sí, una app específica (cuál) | Sí, solo para guardar archivos (Drive, OneDrive) | No, todo en Word/PDF | No, todo a mano

24. Si existiera una app donde tú armas la planeación arrastrando bloques (sin escribir tanto), la usarías si: [Casillas, obligatoria]
    Opciones:
    - Me ahorra tiempo real (+1 hora a la semana)
    - Es bonita y profesional
    - El director la aceptara sin pedirme cambios
    - No tengo que aprender algo complicado
    - Sirve aunque no tenga internet
    - Otra (campo libre)

=== Sobre entrega al director ===

25. Hoy, cuando entregas tu planeación al director, ¿la revisa o solo la archiva? [Múltiple, obligatoria]
    Opciones: La revisa y me da retroalimentación útil | La pasa a supervisión sin revisarla | Solo la archiva | Depende del director

26. ¿Pagas de tu bolsillo por algo para tus clases (materiales, apps, cursos)? [Múltiple, obligatoria]
    Opciones: Sí, bastante | Sí, lo mínimo | Poca cosa | No, todo lo cubre la escuela

27. Si una herramienta te ahorrara 3-4 horas a la semana y costara $300 MXN/mes, ¿la pagarías tú de tu bolsa? [Múltiple, obligatoria]
    Opciones: Sí, sin pensarlo | Tal vez, tendría que ver cuánto ahorra | Probablemente no | No, yo no pago nada | Otra

=== Cierre ===

28. (Opcional) ¿Conoces a otro(a) maestro(a) que pueda contestar también? Pásale este link. [Texto largo, opcional]

29. (Opcional, última) ¿Algo más que quieras decir sobre planeaciones o esta encuesta? [Texto largo, opcional]

Configuración final del form:
- Confirmación al enviar: "¡Gracias! Tu respuesta quedó registrada. Si quieres, pasa este link a un(a) colega maestro(a)."
- Devuelve SOLO el link del form terminado en una sola línea.
```

## Por qué este prompt cabe en 5000 caracteres

- Cada prompt individual está **muy por debajo de 4500 chars** (verificado: 3492 y 2891).
- Dividir en 2 pasos es robusto: si la primera ejecución se interrumpe, el form queda a la mitad con un link parcial que puedes seguir editando.
- NO omitimos ninguna pregunta — el Paso 1 lleva Q1-Q15 y el Paso 2 lleva Q16-Q29 con los mismos textos literales.

## Instrucciones operativas

1. **Pega el Paso 1** en Gemini in Workspace → dale Crear → te devuelve "Listo para el siguiente paso" + link parcial.
2. **Pega el Paso 2** con el form abierto desde el paso 1 → dale Crear → te devuelve el link final.
3. **Comparte el link final** a tía Lola con el mensaje del archivo.
