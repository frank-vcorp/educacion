# Google Form — Encuesta para maestros de NEM

**Versión:** 0.6 — añadidas preguntas para docentes con experiencia como directora
**Fecha:** 2026-08-13
**Estado:** DOCUMENTO DEL FORM (legible, listo para crear manualmente o pasar a Gemini)
**Audiencia:** maestras y maestros de educación básica en México (pública o privada, preescolar a secundaria). Genérico para que Lola pueda compartir con colegas.
**Política de datos:** SIN datos personales. SIN CCT. SIN nombre del director. SIN celular. Esto baja fricción y mantiene LFPDPPP-friendly.
**Persistencia:** las respuestas NO se guardan en este repo. Solo el Google Sheet asociado al Form.

> **¿Quieres el prompt para Gemini?** Está en `E19b_PROMPT_GEMINI.md` (archivo separado deliberadamente). Este `.md` solo contiene las preguntas del form, sin código de prompts IA mezclado.

**Título definido:** `Cómo planificas en NEM — Encuesta para docentes de preescolar, primaria y secundaria`

**Descripción definida:** "Encuesta anónima para maestras y maestros de educación básica (pública o privada). Estamos construyendo una herramienta que te ayuda a hacer tus planeaciones NEM más rápido y mejor. Tus respuestas nos dicen qué necesita esa herramienta. Esta encuesta NO pide tu nombre, correo, CCT ni ningún dato personal. Te toma 10-15 minutos. Si quieres, compártela con otro(a) maestro(a)."

---

## Cómo se usa este archivo

**Hay 2 formas de crear el Form:**

### OPCIÓN 1 (recomendada) — Manual en Google Forms (5 minutos)
Tú lees las preguntas de este archivo y las pegas en Google Forms. Más control, sin dependencia de IA.

### OPCIÓN 2 — Gemini Workspace (1 minuto)
Abre `E19b_PROMPT_GEMINI.md`, pega el prompt en Gemini in Workspace. Gemini crea el form. **Después compara cada pregunta contra este `.md`** — si Gemini "comprime" o cambia algo, lo corriges manualmente.

---

## Configuración general del form

### Título del form (copia literal)

```
Cómo planificas en NEM — Encuesta para docentes de preescolar, primaria y secundaria
```

**Por qué este título:**
- "Cómo planificas" — habla en segunda persona, directo (no "sobre planeación").
- "en NEM" — especifica el marco normativo sin explicarlo (ellas ya saben).
- "Encuesta para docentes" — audiencia explícita, suena oficial pero accesible.
- Lista los 3 niveles — no se siente excluyente.
- Longitud ~75 caracteres — cabe bien en vista móvil de Google Forms.

### Descripción del form (copia literal)

```
Encuesta anónima para maestras y maestros de educación básica (pública o privada). 
Estamos construyendo una herramienta que te ayuda a hacer tus planeaciones NEM 
más rápido y mejor. Tus respuestas nos dicen qué necesita esa herramienta. 
Esta encuesta NO pide tu nombre, correo, CCT ni ningún dato personal. 
Te toma 10-15 minutos. Si quieres, compártela con otro(a) maestro(a).
```

**Por qué esta descripción:**
- "educación básica (pública o privada)" — incluye privadas que también usan NEM.
- "Estamos construyendo una herramienta" — transparencia sobre qué hacemos con los datos.
- "más rápido y mejor" — beneficio concreto (no promesa vacía).
- "NO pide tu nombre, correo, CCT ni ningún dato personal" — tranquilidad explícita.
- "Te toma 10-15 minutos" — gestión de expectativas.
- "Si quieres, compártela con otro(a) maestro(a)" — llamada a la acción de propagación.

### Mensaje de confirmación al enviar (copia literal)

```
¡Gracias por tu tiempo! Tu respuesta quedó registrada. 

Si quieres compartir tu experiencia con un(a) colega, el link del formulario 
está disponible para que se lo envíes por WhatsApp o donde prefieras.
```

**Por qué este mensaje:**
- Agradece en 2do persona (no "Se ha registrado su respuesta" impersonal).
- Refuerza la acción de compartir (WhatsApp específicamente, porque es donde viven las maestras).

### Configuración técnica (Settings ⚙)

| Opción | Valor |
|---|---|
| **Recolectar direcciones de correo electrónico** | ❌ Desactivado (CLAVE — esto no es opcional) |
| **Limitar a 1 respuesta** | ❌ Desactivado (queremos que múltiples maestras puedan responder) |
| **Mostrar barra de progreso** | ✅ Activado |
| **Mostrar enlace para enviar otra respuesta** | ✅ Activado |
| **Permitir editar respuestas después de enviar** | ❌ Desactivado (mantiene limpieza de datos) |
| **Mensaje de confirmación** | El de arriba |
| **Orden de preguntas** | Aleatorio desactivado (orden fijo) |

---

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
**Ayuda:** Incluye prácticas profesionales, servicio social, interinato y cualquier plaza, no solo base definitiva.
**Opciones:**
- Menos de 5
- Entre 5 y 15
- Más de 15

### Pregunta 3
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cuántos alumnos tienes por grupo (aproximado)?
**Ayuda:** Considera el tamaño promedio de tus grupos este ciclo escolar. Si tienes varios, usa el más común.
**Opciones:**
- 1-15
- 16-25
- 26-35
- Más de 35

### Pregunta 4
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Dónde planeas la mayoría de las veces?
**Ayuda:** Indica el espacio donde REALMENTE te sientas a planear, no el "ideal" o el que te gustaría.
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
**Ayuda:** Considera únicamente las planeaciones que entregas formalmente a la dirección, no las que haces para ti.
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
**Ayuda:** Una planeación completa = problemática + contenidos + actividades + evaluación + lo necesario para entregarla lista al director.
**Opciones:**
- Menos de 1 hora
- Entre 1 y 3 horas
- Entre 3 y 6 horas
- Más de 6 horas
- No me quiero acordar

### Pregunta 9
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cómo la entregas al director?
**Ayuda:** Elige el canal más habitual. Si usas varios, marca el que más uses.
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
**Ayuda:** "Con cambios" = te pide correcciones, ajustes, o te regresa para rehacer algo.
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
**Pregunta:** ¿Conoces los nuevos contenidos que la SEP publicó con el Plan 2022 ("Programas Sintéticos" o "PDA" — los cuadernillos que llegaron al inicio del ciclo 2023-2024)?
**Ayuda:** Si te suenan desconocidos los términos "Programa Sintético", "PDA" o "Plan 2022", probablemente no los has visto. La SEP los llama formalmente así; antes (en Planes 2011/2017) les decían "aprendizajes esperados" o "estándares". Si nunca los has hojeado, marca la opción que aplica — no es una pregunta con trampa, solo queremos saber hasta dónde los conoces.
**Opciones:**
- Sí, los conozco y los uso al planear
- Sí los conozco pero no los sigo al pie de la letra
- Me suenan vagamente pero no los he leído con calma
- No, no los conozco / nunca los he visto
- Otra

## Discovery Insight — basado en evidencia real de tía Lola

Esta pregunta fue afinada tras evidencia real capturada en WhatsApp: la tía Lola leyó "¿Usas el núcleo o las actividades de la SEP?" y preguntó siete veces qué era cada cosa. Sus mensajes literales:

> "A que te refieres con 'nucleo'" / "Lo que te de la sep" / "Osea???" / "El programa?" / "Los aprendizajes esperados?" / "Los campos Formativos?" / "No entiendo eso del núcleo 😂😅"

**Lo que confirma empíricamente:**

- **"Núcleo" NO es vocabulario cotidiano de maestra.** Es jerga interna curricular.
- **"Programa Sintético" TAMPOCO lo es** para muchas maestras que recibieron el cuadernillo sin leerlo con calma.
- **Una maestra promedio de preescolar/primaria NO maneja vocabulario del Plan 2022** aunque viva la reforma desde 2022.
- **Confunde términos de Planes históricos**: "aprendizajes esperados" (Plan 2011), "estándares" (Plan 2017), "PDA" (Plan 2022). Los mezcla sin saber a qué Plan pertenecen.

**Implicaciones de producto (siguen vigentes más allá de esta encuesta):**

1. El catálogo NEM es **opcional, no obligatorio.** La app debe funcionar aunque la maestra NUNCA haya leído el Programa Sintético.
2. **En la UI de la app**, evitar jerga curricular en botones y menús. Términos como "PDA", "campo formativo", "eje articulador" deben aparecer **dentro del producto** (donde son útiles), no en la superficie (donde asustan).
3. Cuando el producto le sugiera contenido del catálogo a la maestra, mostrarle un **"¿qué es esto?" con un tooltip** que explique en lenguaje cotidiano.
4. El banco contextual M2 (zona CCT) **no es suficiente** — necesita descubrir "qué es lo que tu comunidad vive", no "los PDA oficiales". Co-diseño con la maestra desde la realidad.

**Implicaciones de discovery:**

- Las preguntas de discovery sobre maestras NO deben asumir vocabulario técnico. Pregunta primero por su día a día ("¿qué haces los domingos?") antes de preguntar por la NEM.
- Los términos del Plan 2022 son **palabras de política pública, no de salón de clases.** Documentar esto en `founder/learning.md` o similar para no repetirlo en futuros entregables.

### Pregunta 14
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Te sería útil que los PDA de los Programas Sintéticos ya estuvieran cargados en una herramienta, y tú solo armaras la clase con ellos (como "bloques" para arrastrar)?
**Ayuda:** Imagina que abres una herramienta y los PDA ya están ahí, solo arrastras los que aplican a tu clase.
**Opciones:**
- Sí, eso me ahorraría mucho tiempo
- Tal vez, habría que verlo
- No, yo prefiero escribir todo desde cero
- No sé bien qué quieres decir

### Pregunta 15
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cómo relacionas cada clase con los "campos formativos" del Plan 2022? (Lenguajes / Saberes y Pensamiento Científico / Ética, Naturaleza y Sociedades / De lo Humano y lo Comunitario).
**Ayuda:** Los campos formativos son las 4 grandes áreas del Plan 2022: Lenguajes, Saberes y Pensamiento Científico, Ética/Naturaleza/Sociedades, y De lo Humano y lo Comunitario. Si nunca los has visto, marca la última opción — son los 4 "cascos" del Plan 2022 que agrupan los PDA.
**Opciones:**
- Lo tengo claro y no me cuesta
- Lo tengo que pensar o buscar cada vez
- Lo pongo más por cumplir el formato que por convicción
- Se me complica
- No conozco los campos formativos / no sabía que el Plan 2022 los tenía

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
- Sí, uso una app específica
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

- **Total preguntas:** 40 (más 9 preguntas condicionales opcionales en SECCIÓN 8 para directores).
- **Tiempo estimado de respuesta:**
  - Maestra que NO ha sido directora: 10-15 min (30 preguntas).
  - Maestra que SÍ ha sido directora: 15-22 min (40 preguntas).
- **Datos personales pedidos:** CERO. Ni email, ni nombre, ni CCT, ni celular.
- **LFPDPPP-friendly:** ✅ diseñado para no requerir base legal.
- **Inteligencia de negocio:** las preguntas de SECCIÓN 8 (director) descubren qué automatizar del panel multi-maestro. Sin esas respuestas, el "diferenciador de entrega al director" (M5) queda conjetura.

---

## Cómo se ven las preguntas condicionales en Google Forms

La SECCIÓN 8 tiene una "puerta" en la pregunta 8.1 ("¿Has sido director(a)?"). Si la maestra responde "No, nunca he sido directora", el form salta al mensaje de "fin" (ya está en la última sección). Si responde "Sí...", hace las 9 preguntas adicionales (8.2 a 8.10).

En Google Forms esto se logra dividiendo la SECCIÓN 8 en dos sub-secciones y usando **"Ir a la siguiente sección según la respuesta"** en la opción "No" de la pregunta 8.1.

**Si Gemini no maneja bien la ramificación al crear el form**, se corrige manualmente en Google Forms después (no es difícil, pero Gemini no siempre lo implementa solo).

---

## SECCIÓN 8 — Tu experiencia como director(a) (solo si aplica)

> Esta sección es para docentes que han sido **directores o directoras** de una escuela. Si nunca has ocupado ese cargo, **puedes saltarla completamente** y terminar el form. Si la llenas, nos das una visión del "otro lado del escritorio" que es valiosísima para construir la herramienta.

> **Por qué la pusimos al FINAL, no al inicio:** si la pusiéramos al principio, las maestras que nunca han sido directoras verían una sección que no les aplica y abandonarían el form. Al estar al final, si llegan hasta aquí ya se comprometieron con su propia experiencia, yerran el form, y solo entonces se les pregunta por la experiencia como directora. Las que SÍ han sido directoras la llenan; las que no, la saltan.

> **Para quién vale la pena:** la herramienta está diseñada para maestros Y directores (M5 entrega al director). Si una maestra fue directora, su testimonio del otro lado vale más que cualquier suposición nuestra.

### Pregunta 8.1
**Tipo:** Múltiple choice · **obligatoria** (dentro de la sección; si entras a ella, respondes)
**Pregunta:** ¿Has sido directora o director de una escuela?
**Ayuda:** Incluye si ocupaste el cargo por interinato, encargo, comisión o base.
**Opciones:**
- Sí, una vez por un periodo corto (menos de 2 años)
- Sí, por varios años (más de 2 años)
- Sí, actualmente lo soy
- No, nunca he sido directora

> **Si respondió "No, nunca he sido directora":** marcar fin de sección, pasa a SECCIÓN 1.

---

### Pregunta 8.2 (solo si la 8.1 es "Sí..." — directors)
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿De qué niveles era la escuela a tu cargo?
**Opciones:**
- Solo preescolar
- Solo primaria
- Solo secundaria
- Preescolar y primaria (multinivel)
- Multigrado (varios grados juntos)

### Pregunta 8.3 (solo si la 8.1 es "Sí...")
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cuántos maestros tenías aproximadamente a cargo?
**Opciones:**
- 1 a 3
- 4 a 6
- 7 a 12
- Más de 12

### Pregunta 8.4 (solo si la 8.1 es "Sí...")
**Tipo:** Texto largo (paragraph) · **obligatoria**
**Pregunta:** Cuando recibías una planeación de un maestro, ¿qué hacías con ella? Cuéntanos el flujo completo, aunque sea informal.
**Texto de ayuda:** Ej: "Las juntaba en una carpeta, le pasaba una copia a supervisión, me llevaba 3 horas al mes consolidarlas..."

### Pregunta 8.5 (solo si la 8.1 es "Sí...")
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Tenías un tiempo límite para responder a las planeaciones de tus maestros?
**Opciones:**
- Sí, había un plazo formal (cuál era)
- Había acuerdo verbal pero no era estricto
- No, las revisaba cuando podía
- No las revisaba una por una, solo en bloque

### Pregunta 8.6 (solo si la 8.1 es "Sí...")
**Tipo:** Texto largo (paragraph) · **obligatoria**
**Pregunta:** Piensa en tu época como director(a). ¿Cuáles eran LAS PARTES MÁS TEDIOSAS O REPETITIVAS del trabajo con las planeaciones? Enuméralas con la mayor honestidad posible, aunque sean cosas "obvias".
**Texto de ayuda:** Si quieres, dime también cuánto tiempo te tomaba cada cosa.

### Pregunta 8.7 (solo si la 8.1 es "Sí...")
**Tipo:** Texto largo (paragraph) · **obligatoria**
**Pregunta:** Si pudieras automatizar 3 cosas del trabajo del director con planeaciones, ¿cuáles serían las tres más valiosas?
**Texto de ayuda:** Enuméralas en orden de importancia.

### Pregunta 8.8 (solo si la 8.1 es "Sí...")
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Tenías Consejo Técnico Escolar (CTE) donde se revisaban las planeaciones en conjunto?
**Opciones:**
- Sí, cada mes
- Sí, cada quince días
- Sí, pero esporádico
- No
- Otro

### Pregunta 8.9 (solo si la 8.1 es "Sí...")
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Cuál era el momento del año más difícil/molesto para ti como director en cuanto a planeaciones?
**Opciones:**
- Inicio del ciclo escolar (agosto)
- Cierre del ciclo (junio-julio)
- Periodo de visitas de supervisión
- Cuando los maestros entregaban todas juntas los últimos días
- Nunca fue problema
- Otro

### Pregunta 8.10 (solo si la 8.1 es "Sí...")
**Tipo:** Múltiple choice · obligatoria
**Pregunta:** ¿Viste a otros directores usar alguna herramienta digital para gestionar las planeaciones?
**Opciones:**
- Sí (cuál)
- No, todo era manual/papel/WhatsApp
- Lo intentamos pero no funcionó (cuéntanos por qué)

---

---

## Archivos relacionados

- **`E19_FORMULARIO_GOOGLE.md`** — este archivo. Documento del form, legible y limpio.
- **`E19b_PROMPT_GEMINI.md`** — prompt para Gemini Workspace separado, con pasos y validación.
- **`Encuesta_Tia_Lola.md`** — encuesta original en formato markdown (sin tipos de Google Forms). Documento histórico.

---

**Fin del archivo v0.5.**

