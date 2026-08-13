# SPEC MVP — MÓDULO DOCENTE

**Versión:** 0.8.1 — añadida nota sobre M5 parcial. M1-M4 cerradas, M5 cerrada de arquitectura, **detalles UX del portal director pendientes de validación con tía Lola (ex-directora) + 1-2 directores adicionales**. Encuesta ampliada con bloque 8 (director).
**Fecha:** 2026-08-13
**Estado:** ESPECIFICACIÓN PARTICULAR #1 (la primera a detallar)
**Origen:** Discovery con fundador (3 rondas, 12 decisiones cerradas) + ronda de investigación profunda (NEM oficial, LFPDPPP 2025, mercado edtech MX, UX drag-and-drop) + investigación sobre contrato curricular oficial de la planeación NEM (elementos obligatorios SEP) + análisis de cadencia real de cambios normativos 2022-2026 + diseño del Monitor de Vigilancia + diseño del motor de catalogación de contenidos preescolar + iteración de diseño de la planeación (M1-M3) basada en diferenciación vs Kumu
**Alineado a:** `plataforma_nem_concepto_maestro.md` (documento maestro, intacto)
**Protocolo de mantenimiento:** ver `fuentes/E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md`
**Diseño del monitor de vigilancia:** ver `fuentes/E11_MONITOR_VIGILANCIA_NORMATIVA.md`
**Diseño del motor de catalogación:** ver `fuentes/E14_CATALOGACION_AUTONOMA_FASE_2.md`

---

## DIFERENCIADOR CENTRAL (declarado)

> **"No solo hago la planeación — la entrego al ecosistema completo del docente: director, evidencia post-clase, reporte longitudinal. Por eso soy el sistema operativo del aula, no un generador."**

Esto se traduce operativamente en que **el MVP integra el flujo completo**: planeación → entrega al director → clase → bitácora → evidencia → reporte del grupo. No termina cuando el maestro exporta un PDF.

**Diferenciación concreta vs Kumu (kumu.la):**

| Kumu / otros generadores | Nuestra propuesta (M1-M5) |
|---|---|
| IA redacta bloques desde cero cada vez | **M1 — Bloques componibles** de catálogo curado (PDA oficial atado) |
| Problema del contexto: requisito burocrático al final | **M2 — Problema del contexto primero**, contextualizado a la zona del CCT |
| Calendario vacío hasta que arrastras uno a uno | **M3 — Vista mensual proactiva** que te dice qué falta sin obligarte |
| Maestro escribe todo desde cero (ejemplos urbanos para todos) | **M4 — Ensamblaje de características de la escuela** (configurativo, no identitario) que adapta el banco de bloques |
| "Generar PDF y enviar por WhatsApp" | **M5 (arquitectura cerrada) — Entrega real al director** vía URL firmada + OTP WhatsApp; **UX concreta del portal director pendiente** de validar con director real |

Kumu **no** integra el flujo post-exportación. Ese ciclo es el **moat**.

---

## 0. FUENTES DE DECISIÓN (trazabilidad)

| Decisión | Valor | Razón |
|---|---|---|
| Pivote de usuario | Docente individual | Confirmado por discovery; familiar directo es maestra |
| Niveles cubiertos | Los 3 (preescolar, primaria, secundaria) | Parametrizable, no 3 productos separados |
| Dispositivo | Responsive (móvil + laptop) | Tía Lola planeá en celular de noche |
| IA en MVP | **Pospuesto pero presente como variable** | Reforma 2025 LFPDPPP aplica si entra |
| Mirar competencia | NO (regla del founder) | Mantener visión propia |
| Modelo NEM | Catálogo oficial + bloques componibles | "Núcleo NEM → clase → calendario" |

---

## 1. OBJETIVO DEL MVP

Que un maestro (caso arquetipo: tía Lola, preescolar) pueda:
1. **Crear una clase** en menos de 5 minutos usando bloques pre-armados derivados del catálogo NEM.
2. **Componer su planeación mensual** arrastrando esas clases a un calendario.
3. **Exportar la planeación en PDF** lista para entregar al director.
4. **Llenar la bitácora del día** en menos de 30 segundos desde el celular.

Sin login social complejo. Sin pagos. Sin IA generativa. Sin alumnos ni padres ni dirección automatizando todavía.

**Lo que NO es (anti-objetivo):**
- No es una red social docente.
- No es un LMS.
- No es un marketplace.
- No reemplaza al maestro en decisiones pedagógicas.
- No aloja contenido de CONALITEG (solo referencia con ficha bibliográfica).

---

## 2. USUARIO ARQUETIPO

**Persona 1: "Lola" — maestra de preescolar pública**
- Trabaja en escuela pública, CCT federal.
- Planeación mensual entregada al director en PDF.
- Planea de noche, desde su celular, en casa.
- Tiene un grupo de 15-25 niños de 3-5 años.
- Conoce la NEM pero no la domina; usa el "núcleo" que la SEP publica.
- Necesita: ahorrar las 4-6 horas semanales que hoy invierte en planeaciones.

**Persona 2: "Carlos" — maestro de primaria**
- Mismo flujo básico, periodicidad semanal (no mensual).
- Grupo de 30-40 alumnos.
- Necesita también bitácora rápida y evidencias fotográficas.

**Persona 3: "Marta" — directora de preescolar/primaria**
- Recibe planeaciones en PDF de 3-8 maestros a cargo.
- Hoy las recibe por WhatsApp, email o impresas.
- En MVP: solo **visualiza y descarga** lo que el maestro exporta. Sin edición, sin comentarios (eso es Fase 2).

> **Decisión de scope MVP:** la persona 3 se cubre con una vista de **solo-lectura** mínima (panel de dirección).

---

## 3. FLUJOS FELICES (los únicos que importan en MVP)

> **Importante v0.7:** los flujos integran las mejoras M1-M3. M2 redefine el orden: el Flujo A empieza por la realidad del CCT-zona, no por la materia.

### Flujo A: Crear un proyecto o situación (NEM) — con M2 y M1
1. Docente abre app → vista de proyectos (lista de proyectos/situaciones propios).
2. Click en "Nuevo proyecto/situación" → primero debe elegir **unidad didáctica**: `situación de aprendizaje` (preescolar) | `proyecto` (primaria/sec) | `unidad didáctica` | `sesión`.
3. **(M2) Pantalla "Empezar por tu realidad":** pregunta inicial *"¿Qué está pasando en tu comunidad este mes que te gustaría convertir en aprendizaje para tus niños?"*. Apoyan 2 affordances:
   - Banco de **situaciones típicas** contextualizado por **CCT-zona** (5-10 por zona, curadas; cambiar la maestra puede).
   - Caja blanca editable "o escribe la tuya" — **siempre protagonista**, sea o no zona conocida.
   - Opción "Subir foto del patio" — placeholder para IA multimodal futura.
4. Una vez elegida la situación, **cascada en cascada**:
   - App sugiere 2-3 **campos formativos** naturalmente conectados a esa situación.
   - Sugiere 2-3 **PDA** probables.
   - Sugiere un **producto integrador** posible.
   - **TODO EDITABLE** — esto es punto de partida, no camisa de fuerza.
5. La maestra confirma nombre del proyecto, problema del contexto (validado no-vacío), propósito, campos formativos (≥1 preescolar; ≥2 primaria/sec), ejes (≥1), PDA (≥1), contenido, producto integrador (obligatorio).
6. App genera **plantilla de bloques** vacía: `inicio | desarrollo | cierre`, con número de sesiones configurable.
7. **(M1)** Docente arrastra bloques pre-armados del **catálogo curado** al inicio, desarrollo y cierre. Cada bloque lleva atado su PDA y ejes del catálogo oficial NEM.
8. **(M1 — 3 niveles de flexibilidad por bloque):**
   - **Cerrado** (estructura + contenido sugerido): arrastra y listo.
   - **Abierto** (estructura + tema sugerido): arrastra y reescribe.
   - **En blanco** (solo estructura vacía con PDA pre-asignado): arrastra y escribe todo.
9. La maestra **puede crear bloques personalizados** "+ Bloque nuevo" → elige tipo y PDA → escribe lo suyo → guarda en su banco personal.
10. Guarda → el proyecto queda en su banco personal.
11. Tiempo objetivo: **< 15 min** para un proyecto completo (vs. 4-6 horas actuales en una planeación completa).

### Flujo B: Componer planeación (drag-and-drop) — con M3
1. Docente abre vista calendario del mes (preescolar) o semana (primaria/sec).
2. **(M3) El calendario muestra código de colores por estado:**
   - █ Verde: día con proyecto completo (>80% bloques cubiertos).
   - ▓ Amarillo: día con proyecto pero pocos bloques.
   - ★ Rojo: día con actividad sin proyecto definido.
   - ░ Gris: día vacío (con sugerencia discreta del banco CCT-zona).
3. **(M3) Resumen "qué te falta":**
   - "Te faltan X sesiones para llegar al mínimo NEM (185 días)."
   - "Tienes Y días sin proyecto definido."
4. **(M3) Sugerencias contextuales** — máximo 1 activa por sesión, tono discreto, sin contar regresivamente.
5. **(M3) Comparación con meses anteriores** — **interruptor on/off en Ajustes** (default OFF). La frase: *"Mostrar comparación con meses anteriores"*.
6. Arrastra proyectos a celdas (o usa el botón "Agregar" en móvil).
7. Duplica, mueve entre días, elimina.
8. Click "Exportar PDF" → genera documento con **formato NEM completo** (ver §3.5): datos generales, elementos curriculares, secuencia por sesiones, evaluación formativa, ajustes razonables, firma y visto bueno.
9. Click "Entregar al director" → el PDF se publica en su panel (en MVP: solo visibilidad).
10. Tiempo objetivo: **< 5 min** para calendarizar + exportar (sumado al Flujo A: ~20 min para una planeación mensual completa vs. 4-6 horas actuales).

### Flujo C: Bitácora rápida (celular)
1. Docente abre app → click "Bitácora de hoy".
2. Llena 4 campos:
   - Participación del grupo (slider 1-5).
   - Actividad que funcionó mejor (selector de bloque dentro del proyecto del día).
   - Dificultades (texto libre, opcional).
   - Evidencia (foto opcional desde cámara).
3. Guarda → alimenta analíticos básicos (futuro) **y queda asociada al proyecto**, no a "una clase".
4. Tiempo objetivo: **< 30 s**.

### Flujo D: Director revisa (solo MVP de validación)
1. Director abre su panel → ve lista de planeaciones recibidas **con su entrega curricular completa** (no solo PDF aislado).
2. Click → visualiza el PDF generado por el maestro + resumen de elementos curriculares: campos formativos, PDA cubiertos, producto integrador, ajustes razonables.
3. Marca como "recibido" / "comentario simple".
4. **NO hay edición ni flujo de aprobación formal.** Esto es producto de transición al siguiente entregable.

### 3.6. MEJORAS M1-M5 (detalle de diseño)

#### M1 — Bloques pre-armados componibles

**Concepto:** "Lego pedagógico" — piezas conTAXONOMÍA FIJA (PDA, ejes, tipo, fase) pero CONTENIDO FLEXIBLE (la maestra edita o reescribe).

| Atributo del bloque | Quién decide |
|---|---|
| Forma del bloque (tipo, estructura, duración estimada) | El sistema (catálogo fijo) |
| PDA, ejes, campo formativo, fase | El sistema (PDA atado al catálogo oficial DOF) |
| Contenido textual sugerido | El sistema (lenguaje pedagógico validado) |
| Reescritura de contenido | La maestra |
| Creación de bloques personalizados en blanco | La maestra |

**Tamaño del catálogo estimado (Fase 2 MVP):**
- ~150 bloques: 4 campos × 5 tipos × ~7 variantes + transversales.
- Tamaño real se define tras el OCR del PDF (ver E14 + agente `catalogo-ocr-fase2`).

**3 niveles de flexibilidad por bloque (visualizado con icono):**

| Icono | Nivel | Comportamiento |
|---|---|---|
| 🔒 | Cerrado | Estructura + contenido sugerido, editable pero "listo" |
| 🔓 | Abierto | Estructura + tema sugerido, contenido editable |
| ✏️ | En blanco | Solo estructura + PDA atado, contenido 100% de la maestra |

**Por qué NO se usa IA generativa para redactar bloques:**
- Alineación NEM verificable (PDA atado a fuente oficial).
- Tiempo predecible (arrastrar 12 bloques < leer/editar 12 bloques IA).
- Autoría de la maestra permanece.
- IA entra SOLO como variante futura ("genera variante corta de [bloque X] para zona rural de Oaxaca").

#### M2 — Problema del contexto primero, contextualizado por CCT-zona

**Concepto:** la maestra empieza mirando su realidad, no la materia.

**Decisión clave:** entrada por **CCT (Clave de Centro de Trabajo, 10 dígitos SEP)**, NO por GPS. Razón:
- CCT es dato público SEP (no es dato personal LFPDPPP).
- CCT dice la verdad: la maestra puede vivir lejos y dar clases en zona distinta.
- CCT identifica estado + municipio + nivel + turno automáticamente.

**Pipeline CCT → banco contextual:**
1. La maestra escribe su CCT al registrarse (lo carga en su credencial, lo conoce de memoria).
2. Catálogo local `cct_zona.json` mapea CCT → {estado, municipio, zona_tipo, nivel, turno}.
3. Si la CCT está en el catálogo: mostrar banco de 5-10 situaciones típicas curadas para ESA zona.
4. Si la CCT no está: fallback a banco genérico + énfasis en "escribe la tuya".

**Estructura del banco de situaciones (inicial):**

| Temporada | Situaciones típicas (rural Hidalgo) | Situaciones típicas (urbana CDMX) |
|---|---|---|
| Ago-Sep | Inicio de ciclo, migración, lengua | Nuevo grupo, calor urbano, multiculturalidad |
| Oct-Nov | Día de muertos, milpa, frío | Contaminación, estiaje, festividades |
| Dic | Posadas, frío extremo | Frío urbano, vacaciones, desigualdad visible |
| Ene-Feb | Sequía, heladas, tequio | Regreso a clases, gripe estacional |
| Mar-Abr | Calor extremo, agua escasa | Calor urbano, polen, alergias |
| May-Jun | Lluvias torrenciales, calor | Lluvias + encharcamientos, fin de ciclo |

**Privacidad y datos sensibles:**
- La CCT no es dato personal (es identificador público SEP).
- La zona del CCT tampoco es dato personal.
- **No almacenar GPS** ni ubicación del dispositivo.
- Cumplimiento LFPDPPP 2025 mantenido.

**Investigación pendiente** (worktree `ct-research-cct-zona`): buscar dataset público SEP/datos.gob.mx que mapee CCT → zona rural/urbana/indígena. Si existe, el catálogo `cct_zona.json` se llena en 1h; si no, se cura manualmente con 50 CCTs founder-friendly.

#### M3 — Vista mensual proactiva con interruptor y reglas duras

**Concepto:** el calendario te dice qué tienes y qué te falta, **sin culparte ni obligarte**.

**Vista principal del calendario (código de colores):**

| Estado | Color | Significado |
|---|---|---|
| Día con proyecto completo (>80% bloques cubiertos) | Verde | Estado OK |
| Día con proyecto pero pocos bloques | Amarillo | Atención moderada |
| Día con actividad sin proyecto definido | Rojo | Malestar típico del modelo viejo |
| Día vacío | Gris | Hueco honesto + sugerencia discreta |

**Funcionalidades pull (la app sugiere, la maestra confirma):**
1. Resumen "qué te falta" automático (sesiones vs. mínimo NEM 185 días).
2. Sugerencias contextuales del banco CCT-zona para días vacíos (link a M2).
3. Comparación con meses anteriores — **con interruptor on/off en Ajustes, default OFF** (decisión T6 del founder).
4. Botón "Planificar mes completo" — genera esqueleto basado en banco de zona + catálogo de bloques + calendario escolar + pendientes del mes anterior.

**Reglas duras para evitar saturación y ansiedad (decisión T7 del founder):**
- **Máximo 1 sugerencia activa por sesión.** Si la maestra aceptó/rechazó, no aparece otra hasta dentro de 3 días.
- **Tono discreto.** Frases tipo *"Si quieres explorar más opciones, está este banco contextual"* — sin contador rojo, sin "te faltan X días" en formato tarea-pendiente.

**Anti-features explícitas:**
- ❌ NO llena días automáticamente sin OK de la maestra.
- ❌ NO rellena con "actividad complementaria" genérica.
- ❌ NO exige cubrir N sesiones por mes (lo decide la CCT/escuela).

#### M4 — Ensamblaje de características de la escuela (configurativo, no identitario)

**Concepto:** la realidad de cada escuela no es un "perfil cerrado" sino una **combinación de características ensamblables**. La maestra configura SU realidad con checkboxes/sliders; la app filtra y adapta el banco de bloques y los ejemplos.

**Decisión clave (refutación del founder):** NO usar perfiles cerrados tipo "rural / urbana / indígena / multigrado". Esos perfiles imponen etiquetas inexactas y congelan la identidad. La realidad es **ensamblable** y modificable en cualquier momento.

**Catálogo inicial de características configurables:**

| Eje | Características (ejemplos) |
|---|---|
| **Contexto geográfico** | Ubicación (ciudad/pueblo/ejido/comunidad/otro) · Servicios (agua estable/por pipa, luz estable/intermitente/sin luz, internet sí/no) · Idiomas en el aula (solo español / español + L1 indígena / multilingüe) |
| **Perfil del grupo** | Tamaño (5-10 / 11-20 / 21-30 / 31-40 / 40+) · Niveles (unigrado / multigrado 2 / multigrado 3) · Edades · Inclusión (NEE transitoria / NEE permanente / L1 indígena / sin NEE) |
| **Recursos disponibles** | Materiales (reciclados / comprados / donados / limitados / abundantes) · Tecnología (sin dispositivos / solo docente / alumnos / aula digital) · Espacio exterior (patio grande / pequeño / sin patio / campo abierto) |
| **Contexto familiar-comunitario** | Familias (presentes / ausentes por trabajo / extensas / trabajo informal / asalariado) · Realidades a integrar (festividades / L1 indígena / migración / agrícola / servicios) |

**Comportamiento de la app:**

- Los **bloques del catálogo M1 (~150)** llevan metadatos `caracteristicas_requeridas: []` y `caracteristicas_incompatibles: []`.
- Si la maestra tiene todas las características requeridas: bloque en banco principal.
- Si le falta 1: bloque en "alternativos con adaptador" (texto adaptado).
- Si le faltan 2+: bloque en "no aplica — ¿forzar?" (con warning).
- **Siempre editable**: la maestra puede cambiar su configuración en cualquier momento.

**Variantes del mismo bloque por contexto (no es etiqueta, es adaptación local):**

| Contexto | Apertura "El agua que cae del cielo" — ejemplo |
|---|---|
| **Urbana CDMX** | "¿Por qué en temporada de lluvias el agua de la calle baja sucia al drenaje?" · Saberes desde balcón · Conexión con plantas del balcón · Cuaderno y colores |
| **Rural Hidalgo** | "¿Por qué cuando llueve en tu pueblo se lleva la tierra del cerro?" · Saberes desde el patio · Conexión con plantas de la escuela · Piedras, tierra, cubeta |
| **Plurilingüe Chiapas tsotsil** | K'usi k'alal chalel chuva ta sjabil 'oxib (¿qué pasa cuando llueve en la milpa?) · Saberes del trabajo en milpa con papás · Conexión con maíz-frijol-calabaza · Hojas de milpa, semillas |

**Misma estructura pedagógica NEM, distinta manifestación local.**

**Anti-features explícitas:**

- ❌ **NO usamos perfiles cerrados como categorías identitarias.**
- ❌ **NO asumimos nada desde CCT.** Las características son DECLARATIVAS, no inferidas (la CCT sólo sugiere zona en M2).
- ❌ **NO usamos lenguaje jerárquico.** No "escuela pobre" → "con menos recursos materiales". No "escuela indígena" → "contexto cultural propio, posiblemente plurilingüe".
- ❌ **NO etiquetamos permanentemente** a la maestra con su configuración. Es solo filtro, no identidad.

**Tensiones abiertas (T13-T16) y cómo se manejan en MVP:**

- **T13 — Curaduría multilingüe y pluricultural.** Resolución: el MVP arranca con 1 variante por bloque (la versión urbana CDMX estándar). Las variantes rurales y plurilingües crecen con la red de maestras fundadoras. MVP no pretende cubrir 4 realidades completas desde día 1.
- **T14 — Configuración incorrecta.** Resolución: la app muestra el "por qué" de cada sugerencia y permite editar la configuración en cualquier momento.
- **T15 — Cero-configuración vs fricción.** Resolución: el default se pre-carga con base en M2 (CCT-zona), la maestra puede editar en 1 click, no es cero-configuración pero sí pre-inicializada.
- **T16 — Traducción a L1 indígena.** Resolución: NO incluida en MVP. Documentada como Fase 2 con red de traductoras nativas; no traducir automáticamente (riesgo de mala calidad).

**Configuración de la escuela en el Flujo A:**

La sección de "tu escuela en sus propias palabras" se coloca al inicio del Flujo A (después del CCT y antes del problema del contexto), permitiendo que cuando la maestra llegue al banco de bloques M1 ya esté filtrado por su realidad.

#### M5 — Entrega real al director (diseño ARQUITECTÓNICO cerrado; UX específica del portal director PENDIENTE de validación con director real)

**Concepto:** la entrega de la planeación no se pierde en un WhatsApp. Queda como un objeto verificable, con URL firmada que el director abre sin registro y puede marcar/comentar; si decide registrarse, lo hace con OTP por WhatsApp al celular que la maestra usó para llegar a él (prueba cruzada de identidad).

**Estado del diseño (v0.8.1):**
- **Arquitectura cerrada:** flujo de URL firmada + OTP WhatsApp + acciones pre-registro + registro formal + portal director.
- **UX específica del portal director PENDIENTE:** las features concretas del panel ("vista agregada de los 5 maestros", "generador de minuta", "consolidación para supervisor", etc.) se diseñan DESPUÉS de validar con tía Lola (ex-directora) y 1-2 directores adicionales — sus respuestas a las preguntas D1-D20 de la `Encuesta_Tia_Lola.md` v2 §8.

**Por qué se pausó la UX del portal:** el founder (en esta sesión) identificó que el panel director tiene que hacer tareas que NO conozco con certeza (consolidación, reporte a supervisión, gestión de CTE, etc.). Diseñar sin validar sería clonar prácticas que el fundador no comprende — riesgo de construir features que ningún director mexicano quiere.

**Próximo paso:** bloquear la arquitectura en el SPEC MVP; abrir un nuevo entregable E2 (Módulo Director) cuyo UX se construye sobre las respuestas reales a la encuesta.

##### Arquitectura cerrada (v0.8.1):

**Acción primaria:** botón "Entregar al director" en el flujo de la maestra. Genera:
1. PDF final guardado en estado `entregada` con timestamp + hash.
2. **URL firmada única** para esta entrega: `https://app.dominio.com/v/<entrega_id>?token=<jwt>` con expiración a 30 días (configurable).
3. Botones de compartir: [Copiar] + [WhatsApp pre-armado] + [QR].

**Mensaje pre-armado de WhatsApp (T24 — editable por la maestra, sugerido como default):**

> *"Hola director(a) [nombre]. Te paso mi planeación de [mes]. La abres con este link directo: [URL]. Si quieres registrarte en la plataforma para recibir las próximas planeaciones de tus maestros sin que te las manden por aquí, este es el portal: [URL pública plataforma]. Sin costo."*

**Pantalla del director SIN registrarse** (al abrir la URL firmada):

- Header: logo + nombre del maestro + escuela + CCT + timestamp de la entrega.
- PDF embebido.
- Resumen curricular (campos formativos, PDA cubiertos, producto integrador, ajustes razonables, problemas del contexto) — sin datos sensibles de los niños.
- **Acciones inmediatas (sin registro, sin password):**
  - Botón "Marcar como recibida" (timestamp).
  - Caja de "Comentario libre" opcional (persiste ligado al token).
  - Panel lateral con beneficios concretos de registrarse formalmente.
- Estado guardado en BD: `recibida` con timestamp + comentario.

**Registro formal del director (voluntario):**

- Si el director decide registrarse → modal pide **número de celular**.
- App envía **OTP por WhatsApp** al número declarado (no password, no email).
- Esto **prueba identidad cruzada:** la OTP llega al celular al que la maestra envió por WhatsApp; si es otro celular diferente, la OTP no le llega y no puede pasar.
- Tras confirmar OTP → crea cuenta → vincula a su CCT → vincula TODAS las entregas previas de su escuela (con las marcas/comentarios pre-registro preservadas).

**Beneficios concretos que ve el director al registrarse** (lista preliminar, a refinar post-validación):

- "Recibe todas las planeaciones de sus maestros aquí, no por WhatsApp."
- "Recibe avisos cuando un maestro sube una planeación nueva" (opt-in).
- "Ve el historial completo de entregas del mes/trimestre/ciclo."
- "Puede pedir cambios sin reescribir la planeación."
- "Una sola vista para ATP y supervisión cuando la pidan."
- "Sabe qué maestros de su CCT ya usan la plataforma."

**Anti-features explícitas:**

- ❌ **NO enviamos WhatsApp ni email** automáticos al director en MVP (la maestra envía manualmente el link).
- ❌ **NO bloqueamos ediciones** del maestro tras entregar (cada edición genera nueva entrega v2, v3...).
- ❌ **NO tenemos flujo de aprobación formal** en MVP (es Fase 2 / E2 completo).
- ❌ **NO hacemos scraping de números de WhatsApp** del director — la maestra los declara al entregar.
- ❌ **NO usamos password/email** para registro del director — solo OTP WhatsApp.

**Tensiones T23-T32 resultado de esta ronda:**
- T23 (expiración 30 días): default, configurable.
- T24 (mensaje pre-armado): editable por la maestra, default sugerido.
- T25 (CCT no en catálogo E15): maestra agrega CCT manualmente; "pre-registro" individual funciona.
- T26 (CCT no actualizado en SEP): tolerancia de MVP, maestra avisa "no pudimos pre-vincular".
- T27 (costo OTP WhatsApp): cubierto por margen MVP hasta 1000 envíos/mes.
- T28 (OTP no llega): botón "reenviar" + fallback voz.
- T29 (celular lo pone la maestra): sí, paso obligatorio al generar la entrega.
- T30 (número mal escrito): verificación cruzada — si OTP no llega, no entra.
- T31 (director sin WhatsApp): MVP solo WhatsApp; SMS OTP es Fase 2.
- T32 (comentarios pre-registro): sí se guardan, ligados al token; al registrarse se vinculan; expiran a 30 días si nunca se registra.

**Dependencias que quedan:**
- E2 (Módulo Director): diseño de UX concreta del portal, PENDIENTE de validación.
- E6 (Modelo de datos formal): nueva tabla `entregas` con `url_firmada_token`, `url_firmada_expira_at`, `estado`, `version`, `director_celular`.
- E15 (CCT→zona): confirma que la CCT de la maestra tiene escuelas + director precargados.

**Por qué esta pausa importa:** diseñé la arquitectura de M5 con la información que tenía, pero las features concretas del portal director (qué hacer con las 5 planeaciones, cómo consolidar, qué mostrar al supervisor) requieren datos reales del usuario. Sin esa validación, M5 seguiría siendo "Kumu + URL firmada", no un sistema diferenciado.

### 3.5. CONTRATO CURRICULAR NEM — Lo que el PDF debe contener para ser válido

El PDF exportado debe incluir **obligatoriamente** estas secciones (consenso SEP + guías manuales CTE + editoriales validadas):

1. **Datos generales:** escuela + CCT, docente, grado y grupo, fase, ciclo escolar, periodo.
2. **Elementos curriculares:**
   - Nombre del proyecto
   - Problema del contexto (texto del maestro, validado por app como no-vacío)
   - Propósito
   - Campos formativos involucrados (≥1 preescolar, ≥2 primaria/sec, advertencia si < 2)
   - Ejes articuladores seleccionados (≥1)
   - PDA (≥1, del catálogo oficial)
   - Contenido (referencia al programa sintético)
   - Producto integrador (texto del entregable final)
3. **Secuencia didáctica por sesiones:**
   - Inicio (≥1 sesión): actividades, bloque usado, PDA que trabaja
   - Desarrollo (≥2 sesiones)
   - Cierre (≥1 sesión)
4. **Evaluación formativa:**
   - Tipo (al menos: formativa)
   - Instrumento (selector: rúbrica / lista de cotejo / portafolio / diario / autoevaluación)
   - Criterios basados en PDA
5. **Inclusión:** ajustes razonables (texto libre, ≥1 frase validada por app como no-vacía).
6. **Firma del docente** y campo para **visto bueno del director** (en el MVP se imprime vacío; en panel del director se llena digitalmente).

**Errores que la app previene** (validados al exportar):
- Problema del contexto vacío o que parezca contenido (≤10 palabras, sin verbo de acción).
- Solo 1 campo formativo en primaria/secundaria → advertencia visual antes de exportar.
- 0 PDA seleccionados → bloqueo.
- 0 producto integrador → bloqueo.
- 0 ajustes razonables en texto → advertencia.

Esto convierte tu app en **guardiana de cumplimiento NEM**, no solo un editor de PDFs.

---

## 4. ENTIDADES MÍNIMAS DE DATOS

(Esqueleto; el modelo relacional formal se desarrolla en entregable aparte)

> **⚠️ Cambio de nomenclatura v0.3:** se elimina "Clase" como entidad aislada. La unidad mínima ahora es **Proyecto** (o situación, en preescolar). Una clase individual es una **sesión** dentro de un proyecto.

- **Docente**: nombre, email, CCT escuela, nivel (prees/prim/sec), grado(s) que imparte, fase(s).
- **Escuela**: nombre, CCT, nivel, director.
- **Director**: nombre, email, escuela.
- **Proyecto** (NEM): nombre, tipo_unidad (`situacion | proyecto | unidad | sesion`), problema_contexto, proposito, campos_formativos[], ejes_articuladores[], pdas[], contenido_ref, producto_integrador, ajustes_razonables, docente, sesiones[].
- **Sesión** (antes "clase"): proyecto_padre, numero, fecha, bloques[], campo_formativo (heredado del proyecto), pda (heredado o específico), inicio | desarrollo | cierre (marcador de fase interna).
- **Bloque**: tipo (`microleccion | actividad_practica | video | referencia_oficial | evaluacion_formativa | cierre_reflexivo | lectura`), descripción, recursos_embebidos opcional (URL, NO contenido CONALITEG), pda_trabajado.
- **Programación** (antes "Planeación"): docente, periodo (mes o semana), proyectos[] con posición en calendario, PDF generado (URL), fecha de creación, fecha_entrega (al director).
- **Bitácora**: sesion, fecha, participación (1-5), actividad mejor (referencia a bloque), dificultades (texto), evidencia (URL imagen), docente.
- **Entrega** (al director): programacion_id, doc_pdf_url, fecha_entrega, recibido_por (director), comentario_director (opcional), timestamp.
- **CatalogoNEM**: versionado (Fase X / Edición 2025), campos[], ejes[], pdas[] (texto oficial del DOF).

**Datos sensibles — decisión:**
- Sin datos de alumnos en MVP. Cero.
- Sin registros de salud, neurotipo, ni seguimiento individual.
- Esto **posterga deliberadamente** la sección 4.4 del doc maestro (Seguimiento e inclusión). No se elimina del roadmap, se difiere a Fase 2.

---

## 5. CATÁLOGO NEM: REQUISITOS DEL MVP

La app necesita un **catálogo local** con:

- **6 fases** de aprendizaje (Fase 1 a Fase 6).
  - **Advertencia Fase 1:** la Fase 1 (educación inicial, 0-3 años) **no está cubierta normativamente** en el Acuerdo 14/08/22 ni en los Programas Sintéticos publicados (que cubren Fase 2 a Fase 6). Si la app incluye Fase 1, debe etiquetarse como "extensión no oficial" y no puede exhibirse como "alineado a NEM".
- **4 campos formativos**: Lenguajes, Saberes y Pensamiento Científico, Ética/Naturaleza/Sociedades, De lo Humano y lo Comunitario.
- **7 ejes articuladores** (lista oficial confirmada en el Plan 2022 §8.1):
  1. Inclusión
  2. Pensamiento Crítico
  3. Interculturalidad Crítica
  4. Igualdad de Género
  5. Vida Saludable
  6. Apropiación de las Culturas a través de la Lectura y la Escritura
  7. Artes y Experiencias Estéticas

  **Modelar como entidad de primer nivel**, no como string libre. El maestro selecciona 1+ ejes por bloque de clase.
- **PDA por campo y fase** (texto oficial del DOF; editable por el maestro como texto libre, pero versionada).
- **Biblioteca de bloques** con plantillas iniciales:
  - Apertura (3-5 plantillas).
  - Desarrollo guiado (3-5).
  - Actividad práctica (3-5).
  - Microlección (3-5).
  - Evaluación formativa (3-5).
  - Cierre reflexivo (3-5).

**Total inicial:** ~30 plantillas. Editables y duplicables. Sin IA.

**Origen de datos:** digitalización **manual** del Plan 2022 + Programas Sintéticos FASES 2-6 (DOF 2023). NO scraping automático de CONALITEG.

**Estimación de esfuerzo de catalogación:** 40-80 horas-hombre solo de transcripción y carga del árbol (4 campos × 6 fases × ~24 PDA = ~96 entradas con texto oficial). **Tesis de fundador, no de programador.** Tomar como riesgo de cronograma.

---

## 6. PLATAFORMA Y STACK (PROPUESTA, NO DECIDIDA)

| Capa | Propuesta | Razón |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind + `@dnd-kit/core` + `@dnd-kit/sortable` | Web responsive PWA, drag-and-drop maduro en React |
| Backend | Supabase (Postgres + Auth + Storage) | Velocidad de MVP, RLS para multi-tenant escuela |
| Auth | Email + contraseña (OTP por email opcional) | Sin OAuth social para MVP, evita fricción |
| Storage de evidencias | Supabase Storage (bucket privado) | Para bitácora, fotos |
| Generación PDF | Server-side (Playwright o Puppeteer) | Formato NEM reconocible, adjunto a planeación |
| PWA / offline | Service Worker + IndexedDB local | Bitácora offline (escuela sin señal) |
| Deploy | Vercel (frontend) + Supabase Cloud | Costo MVP mínimo |

### 6.1. Decisiones UX drag-and-drop (móvil primero)

Confirmado por research: drag-and-drop con `dnd-kit` requiere decisiones explícitas para funcionar bien en touch:

- **`touch-action: none`** en cada elemento draggable (y en el drag handle). Con Tailwind, **debe ir en `style` inline**, no en clase CSS — issue documentado Feb 2025.
- **Botón "Agregar al día X"** en cada bloque del catálogo como **alternativa al drag** para usuarios móviles (drag con el dedo es impreciso en pantallas pequeñas; patrón usado por Gmail en móvil).
- **Haptic feedback** (`navigator.vibrate(20)`) al agarrar un bloque — sutil "bump" táctil.
- **Soporte teclado** desde día 1: Space agarra, flechas mueven, Space suelta. Accesibilidad WCAG.
- **Undo button** siempre visible las primeras 2 semanas post-acción (patrón de recuperación de errores en drag-and-drop).
- **Drag handles (⠿)** en cada bloque para que el scroll no rompa la interacción en listas largas.

**Decisión pendiente (no bloqueante):** hosting propio vs. cloud. Cloud para MVP.

---

## 7. CRITERIOS DE CIERRE DEL MVP

El MVP está "listo" cuando **todas** estas condiciones se cumplen:

1. Una maestra real (no fundadora) logra crear una clase en <3 min sin ayuda.
2. La misma maestra logra armar una planeación mensual en <5 min.
3. La misma maestra llena una bitácora en <30 s.
4. La planeación exportada en PDF es aceptada por su director sin reformateo.
5. La app funciona offline para flujos B (bitácora) y se sincroniza al recuperar señal.
6. **No hay crashes** en 5 sesiones consecutivas de uso real.
7. Costo de infraestructura < USD 50/mes con 100 docentes activos.

**No es MVP** si solo se cumplen 1-6 sin 4. El director aceptando el PDF es la prueba de fuego.

---

## 8. ENTREGABLES DERIVADOS (SIGUIENTE SPRINT)

Estos NO son parte del MVP, pero el MVP los **desbloquea**:

| # | Entregable | Descripción breve |
|---|---|---|
| E2 | SPEC del módulo Director completo | Panel con revisión, comentarios, calendario agregado, alertas |
| E3 | Catálogo NEM digitalizado | JSON estructurado de fases, campos, ejes, PDA — trabajo manual, 40-80h estimadas |
| E4 | Compliance LFPDPPP 2025 | Análisis formal de qué datos se pueden tratar, bases legales, aviso de privacidad para IA futuro, exclusiones voluntarias documentadas |
| E5 | Análisis IA | Qué casos de uso, qué límites, qué proveedor, costo por uso |
| E6 | Modelo de datos formal | Diagrama ER + RLS policies + ciclo de vida |
| E7 | Roadmap Fase 2 | Biblioteca comunitaria, analíticos, marketplace |
| E8 | Plan de adopción | Cómo se consigue el primer usuario no-fundador |
| E9 | **Documento de Exclusiones Voluntarias** | Lista explícita de lo que el MVP **NO** hace (datos de alumnos, IA generativa, marketplace, etc.) y por qué. Sirve como defensa si auditoría regulatoria o de inversión pregunta por compliance/scope creep |
| E10 | **Protocolo de Sincronización Normativa** | Cadencia y checklist para mantener actualizado el catálogo NEM, calendario escolar y compliance. Reside en `fuentes/E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md` |
| E11 | **Monitor de Vigilancia Normativa** | Diseño del monitor automatizado que detecta cambios en NEM/LFPDPPP/calendario/CONALITEG. Reside en `fuentes/E11_MONITOR_VIGILANCIA_NORMATIVA.md` |
| E14 | **Catalogación Autónoma Fase 2 (Preescolar)** | Diseño del motor de catalogación autónoma del catálogo NEM Fase 2. Pipeline de extracción PDF + validación humana + modelo relacional + carga. Reside en `fuentes/E14_CATALOGACION_AUTONOMA_FASE_2.md` |
| E15 | **Investigación CCT→zona (dataset público)** | Búsqueda de dataset oficial SEP/INEGI/CONAPO que mapee CCT a zona rural/urbana/indígena. Acelera el catálogo M2. Output reside en worktree `ct-research-cct-zona`. |
| E16 | **Mejoras M1-M5 (Diseño de la planeación diferenciada)** | Diseño completo de las 5 mejoras que cierran el diferenciador vs Kumu. M1 (bloques) cerrada; M2 (problema del contexto primero) cerrada con CCT-zona; M3 (vista proactiva) cerrada con interruptor y reglas duras; M4 (características ensamblables) cerrada; M5 (entrega real) arquitectura cerrada, UX concreta del portal director PENDIENTE de validación con director real. |

---

## 9. RIESGOS CONOCIDOS (sin mitigar todavía)

1. **Preescolar ≠ primaria/secundaria.** Ya vimos que cambia periodicidad y unidad. Mitigación: parametrización desde día 1, no hardcode.
2. **Reforma LFPDPPP 2025 (vigente desde 21-mar-2025).** Incluye obligaciones específicas para IA y decisiones automatizadas. INAI desapareció → autoridad es **Secretaría Anticorrupción y Buen Gobierno**. Si entra IA o datos de menores, requiere compliance formal. Mitigación MVP: cero IA generativa, cero datos de alumnos; documentar exclusiones (E9).
3. **PDF NEM reconocible.** Si los directores no aceptan el PDF tal cual, MVP falla criterio 4. Mitigación: validar formato con 3-5 directores reales ANTES de cerrar diseño de exportador.
4. **Offline sync.** Complejidad no trivial. Mitigación: empezar con online-first, offline solo para bitácora (alcance pequeño).
5. **Catálogo NEM desactualizado.** Si SEP emite nueva versión o nueva fase, hay que actualizar. Mitigación: tabla versionada, alerta de "versión NEM cargada".
6. **Catálogo NEM — esfuerzo de catalogación.** Trabajo manual de 40-80h para transcribir ~96 PDA oficiales. **No delegable a programador.** Tesis de fundador. Riesgo de cronograma si se subestima.
7. **Competencia directa: Kumu (kumu.la).** Ya tiene planeación NEM con IA + biblioteca + Kumu Familiar + calendario. **Diferenciador documentado:** flujo completo docente (incluye director + bitácora + analíticos longitudinales del grupo). Si el MVP imita a Kumu en planeación+IA, **no hay diferenciación**. Mitigación: foco obsesivo en el flujo post-exportación (entrega al director → bitácora → evidencia → reporte).
8. **Fase 1 (educación inicial) sin programa sintético oficial.** Si se incluye en el MVP, debe etiquetarse como "extensión no oficial". Riesgo de credibilidad pedagógica si se exhibe como NEM-alineado.
9. **Reforma Senado 26-dic-2025 sobre imagen/voz/datos de menores.** Prohíbe uso comercial sin consentimiento expreso escrito. No impacta MVP directamente (no hay datos de alumnos), pero documenta una restricción permanente para cualquier feature futura de seguimiento individual.
10. **UX móvil — drag-and-drop impreciso.** Patrón documentado: drag con el dedo falla el 30-40% de las veces en pantallas pequeñas. Mitigación: botón "Agregar al día" como acción primaria en móvil, drag como secundario; haptic feedback y undo button.

---

## 10. PRÓXIMO PASO SUGERIDO

**Doble vía crítica** (no una sola):

### Vía A — Validación con tía Lola (bloqueante)

Validar la **sección 3 (flujos)** y el **diferenciador central** con tía Lola antes de escribir código. Si los flujos no resuenan con ella, todo lo demás es cosmético.

**Acción inmediata:** Llamada de 20-30 min con los dos bloques de la encuesta:
1. **Bloque 1 (ya existente, preguntas 1-7):** sobre su trabajo como maestra. Hipótesis: confirmar al menos 2 de 3 dolores (entrega, evidencia perdida, reconstrucción del avance).
2. **Bloque 2 (NUEVO en v2, preguntas D1-D20):** sobre su trabajo como EX-DIRECTORA. Hipótesis: descubrir qué tareas tediosas del director podemos automatizar y qué features concretas gancho engancharían al director a registrarse formalmente.

Y le preguntas (al final):
- "Tía, ¿conoces a otro(a) director(a) que pueda platicarme 15 minutos? Quiero validar fuera de ti." (Pregunta D20 — si dice que sí, multiplicamos el discovery director).

### Vía B — Pantalla M5 cuando llegue la validación

Con las respuestas de tía Lola (y 1-2 directores adicionales) → diseñar **E2 Módulo Director** (UX concreta del portal, vista agregada de maestros, consolidación para supervisión, etc.). Este E2 es la materialización del lado "director" de M5 que hoy está pendiente.

### Vía C — Mientras tanto

Los **3 agentes Atlas en background** siguen trabajando en infraestructura sin bloqueos:
- `catalogo-ocr-fase2`: resolver el OCR del PDF escaneado para tener los 150 bloques reales.
- `ct-research-cct-zona`: validar existencia de dataset público CCT→zona para M2 (paralelo).
- `monitor-afinado`: terminado, en revisión.

Si tienes tiempo esta semana, ejecutar Vía A es la prioridad #1 antes de seguir construyendo.

---

**Fin del Entregable #1.**
Listo para discovery del Entregable #2 (módulo Director) cuando tú digas.
