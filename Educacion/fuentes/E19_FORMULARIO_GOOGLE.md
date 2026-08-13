# Google Form — Encuesta para maestros de NEM

**Versión:** 0.1
**Fecha:** 2026-08-13
**Estado:** LISTO PARA CREAR
**Audiencia:** maestra de educación básica en México (preescolar, primaria, secundaria). Genérico para que Lola pueda compartir con colegas.
**Política de datos:** SIN datos personales. SIN CCT. SIN nombre del director. SIN celular. Esto baja fricción y mantiene LFPDPPP-friendly.
**Persistencia:** las respuestas NO se guardan en este repo. Solo el Google Sheet asociado al Form.

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
