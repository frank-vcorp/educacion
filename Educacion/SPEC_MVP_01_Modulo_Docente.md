# SPEC MVP — MÓDULO DOCENTE

**Versión:** 0.14 — Consolidación de decisiones confirmadas de `ENT-003`, `E20`, `E21` y `E22`: alumnos, onboarding, privacidad, multi-grupo, clonado, entrega por WhatsApp, CONALITEG híbrido y stack confirmado.
**Fecha:** 2026-08-18
**Estado:** BASELINE FUNCIONAL VIGENTE — Módulo Docente MVP
**Origen:** Discovery con fundador (3 rondas, 12 decisiones cerradas) + ronda de investigación profunda (NEM oficial, LFPDPPP 2025, mercado edtech MX, UX drag-and-drop) + investigación sobre contrato curricular oficial de la planeación NEM (elementos obligatorios SEP) + análisis de cadencia real de cambios normativos 2022-2026 + diseño del Monitor de Vigilancia + diseño del motor de catalogación de contenidos preescolar + iteración de diseño de la planeación (M1-M3) basada en diferenciación vs Kumu
**Alineado a:** `plataforma_nem_concepto_maestro.md` (visión de producto), `fuentes/ENT-003_DECISIONES_MVP.md`, `fuentes/E20_PRINCIPIOS_DISENNO_PRODUCTO.md`, `fuentes/E21_CATALOGO_RECURSOS_AULA.md` y `fuentes/E22_CIERRE_DISCOVERY.md` (decisiones posteriores confirmadas).
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
1. **Crear un proyecto/situación** en menos de 15 minutos usando bloques pre-armados derivados del catálogo NEM (Flujo A).
2. **Componer su planeación mensual** arrastrando esos proyectos a un calendario en menos de 5 minutos (Flujo B).
3. **Exportar la planeación en PDF** lista para entregar al director (incluido en los 5 min de Flujo B).
4. **Llenar la bitácora del día** en menos de 30 segundos desde el celular.

**Tiempo total objetivo por planeación mensual completa:** **< 20 minutos** desglosados: 15 min crear proyecto + 5 min calendarizar + exportar. Vs 4-6 horas actuales.

Sin login social complejo ni pagos. La IA, cuando se habilite, solo propone contenido editable y nunca decide por la docente. El MVP incluye nombres de alumnos, su rúbrica visual y una vista ligera para dirección; no incluye automatización de aprobación ni relación directa con padres.

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
- En MVP: vista ligera vía **URL firmada** (ver §3.6 M5) — abrir la URL y marcar/comentar sin registro; registro formal opcional con OTP WhatsApp.

> **Decisión de scope MVP:** la persona 3 se cubre con vista ligera de solo-lectura mediante URL firmada. Sin panel director formal en MVP. E2 (Módulo Director) es Fase 2 con validación de tía Lola ex-directora.

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
3. **Política de fotos (v0.9):** la foto solo puede mostrar **el trabajo del niño** (productos, dibujos, manipulables). **NO se permite foto del niño mismo.** La app muestra un mensaje explícito al subir: *"La foto es del trabajo del niño, no del niño."* Si la maestra sube algo distinto, queda bajo su responsabilidad ética, pero la app NO facilita el caso contrario. Esto cumple la reforma Senado 26-dic-2025 sin agregar fricción al flujo natural.
4. Guarda → alimenta analíticos básicos (futuro) **y queda asociada al proyecto**, no a "una clase".
5. Tiempo objetivo: **< 30 s**.

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

**Privacidad y datos sensibles (corregido en v0.9):**
- La CCT sola es identificador público SEP, **no es dato personal** aislada.
- **Pero combinada** con nombre del docente + celular de contacto + correo electrónico, **SÍ forma un conjunto de datos personales** bajo tratamiento (LFPDPPP 2025 art. 3 fr. XIV).
- Por tanto, **toda la información M2 + M5 requiere base legal explícita**: consentimiento del titular (LFPDPPP 2025 art. 8) o alguna de las excepciones del art. 10.
- **No almacenar GPS** ni ubicación del dispositivo bajo ninguna circunstancia.
- Aviso de privacidad del producto (E4 Compliance) cubrirá este tratamiento.

**Investigación cerrada (v0.12, E15 resultado positivo):** SÍ existe dataset público oficial **Catálogo Nacional de Centros de Trabajo SEP 2024** (414 MB, CC-BY-4.0) en `https://repodatos.atdt.gob.mx/api_update/sep/catalogo_centros_trabajo_sep/Catalogo_SIC_2024.csv`. Contiene CCT + cve_ent + cve_mun + cve_loc + nivel + turno + subnivel + latitud/longitud + sostenimiento. **NO trae "zona rural/urbana/indígena" pero se deriva** vía joins con INEGI AGEEML (rural/urbano por localidad), CONAPO Metrópolis 2020 (zona metropolitana por municipio), INPI Pueblos Indígenas (territorio indígena). Detalles en `fuentes/E15_INVESTIGACION_CCT_ZONA.md`.

**Implicaciones v0.12:**
- Plan B (50 CCTs founder-friendly) **descartado**.
- M2 opera sobre **catálogo nacional completo** (cientos de miles de CCTs) tras ETL.
- Coste del ETL estimado: **6-10 h-hombre** (descarga + joins + materialización + validación).
- INTEGRA recibe instrucción de integrar el ETL en el pipeline de build.
- T13 (las 2 variantes) sigue funcionando igual; el banco de situaciones por CCT-zona ahora SÍ se puede poblar de forma sistemática.

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
4. Botón "Planificar mes completo" — **propone un esqueleto de fechas tentativas** basadas en banco de zona + catálogo de bloques + calendario escolar + pendientes del mes anterior, **pero NO rellena contenido**. La maestra debe confirmar bloque por bloque, sesión por sesión. La app sigue el principio "pull, no push". Esto es distinto a "rellenar días automáticamente" (anti-feature explícita).

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

- **T13 — Curaduría multilingüe y pluricultural.** Resolución: el MVP arranca con **2 variantes mínimas por bloque** (no 1): una variante **urbana genérica** (lenguaje neutro aplicable a contextos citadinos) + una variante **rural genérica** (lenguaje aplicable a contextos rurales). Esta decisión cubre razonablemente el caso arquetipo de Lola (rural-preescolar) y al usuario urbano. Las variantes plurilingües y regionales crecen tras MVP. La elección entre variantes se hace por la configuración M4 de la maestra (ubicación urbana/rural); si no configuró, default urbano.
- **T14 — Configuración incorrecta.** Resolución: la app muestra el "por qué" de cada sugerencia y permite editar la configuración en cualquier momento.
- **T15 — Cero-configuración vs fricción.** Resolución: el default se pre-carga con base en M2 (CCT-zona), la maestra puede editar en 1 click, no es cero-configuración pero sí pre-inicializada.
- **T16 — Traducción a L1 indígena.** Resolución: NO incluida en MVP. Documentada como Fase 2 con red de traductoras nativas; no traducir automáticamente (riesgo de mala calidad).

**Configuración de la escuela en el Flujo A:**

La sección de "tu escuela en sus propias palabras" se coloca al inicio del Flujo A (después del CCT y antes del problema del contexto), permitiendo que cuando la maestra llegue al banco de bloques M1 ya esté filtrado por su realidad.

#### M5 — Entrega real al director (diseño ARQUITECTÓNICO cerrado; UX específica del portal director PENDIENTE de validación con director real)

> **Banner de bloqueador legal (v0.9):** M5 trata datos personales del director (celular, nombre, mensaje recibido, comentarios). Esto requiere aviso de privacidad + base legal formal bajo LFPDPPP 2025. **E4 Compliance es bloqueador** antes de habilitar M5 en producción para usuarios reales. Para pruebas internas con tía Lola y contactos de confianza, basta con consentimiento verbal informal documentado en bitácora. Ver E4 (pendiente).

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

**Mensaje pre-armado de WhatsApp (T24 + I4 — editable por la maestra, sugerido como default; promesa clarificada):**

> *"Hola director(a) [nombre]. Te paso mi planeación de [mes]. La abres con este link directo: [URL]. Si te registras en la plataforma (sin costo), verás aquí en un solo lugar todas las planeaciones que te manden tus maestros en el futuro, en lugar de recibirlas por WhatsApp. Es opcional."*

> **Cambio v0.11:** la promesa es **recepción centralizada** ("verás aquí todas las..."), no "alertas proactivas" (que son Fase 2). Reduce la expectativa de notificaciones automáticas.

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
- "Recibe avisos cuando un maestro sube una planeación nueva" — **canal v0.11:** email semanal consolidado, opt-in. NO push, NO WhatsApp en MVP. Detalles en §3.7.6 sobre canales.
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

### 3.7. IA MiniMax — Decisión estratégica de producto

**Decisión del fundador (v0.10):** la inteligencia artificial integrada en el producto es **MiniMax M3** (de la fundación MiniMax). Decisiones cerradas:

- **Proveedor único, sin fallback.** Si MiniMax cae, las features de IA fallan gracefully; el resto del producto sigue funcionando con catálogo, calendario, entrega y portal director.
- **Aplicación selectiva.** MiniMax se integra solo donde realmente aporta valor. No se mete por moda. Cada feature con IA debe justificar su existencia en términos de ahorro de tiempo o mejora de calidad pedagógica.
- **Política de datos hacia MiniMax:** puede recibir **contexto del docente anonimizado** (CCT-zona, grado, fase, características M4, texto pedagógico). NO nombres, NO celulares, NO CCT completa (se ofusca), NO datos de menores (ver regla dura más abajo).
- **Regla dura LFPDPPP:** CERO datos de menores cruzan a MiniMax en ninguna feature, sin excepciones, sin consentimiento. Esta regla es código de producto, no política editable.

#### 3.7.1. Features MVP que usan MiniMax

Estas son las cuatro features con IA, justificadas una por una.

**F1 — Variantes de bloques adaptadas al contexto (vinculado a M1 + M4):**
- Entrada: bloque del catálogo (estructura + contenido sugerido urbano) + CCT-zona + características M4.
- Acción: MiniMax genera **una variante local** del contenido del bloque adaptada al contexto. NO inventa la estructura, NO propone campos formativos nuevos, NO añade PDA. Solo adapta el texto.
- Ejemplo: bloque F2-SyPC-002 (Lluvia-suelo) urbano "plantas del balcón" → variante rural "plantas de la milpa familiar" / variante plurilingüe en tsotsil.
- Salida: 1 variante por bloque por sesión. La maestra puede editar o descartar.

**F2 — Help-in-line en redacción (vinculado a M1 paso 8-9):**
- Entrada: texto que la maestra está escribiendo en un bloque (apertura, cierre, producto integrador).
- Acción: botón "Ayúdame a redactar" → MiniMax ofrece 2 opciones:
  - Expandir a versión más formal (lenguaje NEM reconocible por la supervisión).
  - Simplificar para edad específica (3 años vs 5 años vs 8 años).
- NO reescribe todo ni propone nuevas ideas. Solo expande/simplifica lo que ella ya empezó.

**F3 — Pulido final del PDF (vinculado a §3.5 contrato curricular):**
- Antes de generar el PDF, MiniMax hace una pasada final sobre campos abiertos (objetivo, propósito, producto integrador). Solo estilístico: sin cambiar contenido pedagógico, sin alterar PDA referenciados.
- Salida: texto ligeramente pulido en los campos que la app marca como "pulibles".
- NO aplica a: bloques del catálogo, nombres de proyectos, PDA oficiales.

**F4 — Resumen narrativo para la maestra (Fase 2, no MVP):**
- Cuando la maestra termina una planeación, MiniMax genera una "vista narrativa" tipo "¿esto es lo que vas a hacer en tus próximas semanas". Solo si la maestra lo pide explícitamente.
- Diferido a Fase 2 porque la app de catálogo/bloques/calendario ya da valor sin IA, y esta feature requiere más iteración.

#### 3.7.2. Política de datos concreta (lo que SÍ y NO se manda a MiniMax)

| Tipo de dato | Permitido a MiniMax | Bloqueado |
|---|---|---|
| Texto pedagógico (contenido de bloque, abertura, cierre) | ✅ Sí | |
| CCT completa (10 dígitos) | NO ❌ | Se ofusca a `CCT-**[REDACTED]**-zona-{state}/{municipio}` |
| CCT-zona categorizada (urbana/rural/indígena) | ✅ Sí (ya es categórica, no identifica persona) | |
| Grado que imparte la maestra (preescolar, 1°, 2°...) | ✅ Sí | |
| Fase NEM | ✅ Sí | |
| Características M4 (la configuración configurativa de la escuela) | ✅ Sí | |
| Nombre del docente | NO ❌ | Sustituir por token aleatorio de sesión |
| Email / celular del docente | NO ❌ | Nunca sale del backend |
| Email / celular del director | NO ❌ | Nunca sale del backend |
| Datos de alumnos (nombres, notas, observaciones) | **REGLA DURA: NO bajo ninguna circunstancia** | Filter a nivel de código antes de cualquier llamada a MiniMax |
| Fotos de bitácora (del trabajo del niño, NO del niño mismo) | NO ❌ | No se envía como contexto |
| Comentarios del director sobre la planeación | NO ❌ | Privacidad del director |

**Implementación:** un módulo `ia_anonymizer.py` que aplica estas reglas a TODO prompt antes de salir del backend. Tests unitarios que verifican que ningún dato personal cruza.

#### 3.7.3. Arquitectura técnica propuesta

**Proveedor por defecto:** MiniMax M3 mediante un conector compatible con la API de OpenAI. La integración conserva configuración externa de proveedor, modelo y URL para permitir sustitución futura sin reescritura.

**Endpoint y autenticación:** URL, modelo y API key se configuran como variables de entorno del backend (NUNCA en frontend). Sin endpoint público expuesto. Llamadas server-side. Puede configurarse otro proveedor compatible, pero **no existe fallback automático en el MVP**: ante indisponibilidad, la experiencia degrada sin IA.

**Latencia objetivo:** < 3 segundos por respuesta de feature. Si MiniMax tarda más de 8s, timeout y degradar sin IA.

**Costo estimado (a confirmar en E5):** variable por feature. Features con prompts pequeños (<500 tokens) y respuestas cortas (<500 tokens) tienen costo despreciable. Estimación inicial: con 1000 planeaciones/mes, costo MiniMax < USD 30/mes, asumiendo precios comparables a OpenAI. **Verificar precios reales en E5 antes de productivizar.**

**Cache:** prompts idénticos (mismo bloque, misma CCT-ofuscada) cachean respuesta por 30 días. Reduce costo y latencia.

**Rate limiting:** 5 llamadas/minuto por usuario. Si excede, queue con respuesta "IA no disponible ahora". Sin saturación del backend.

#### 3.7.4. Compliance LFPDPPP 2025 — implicaciones específicas para MiniMax

1. **Transferencia internacional.** MiniMax es servidor en China (jurisdicción diferente). LFPDPPP 2025 art. 36-38 regulan transferencias internacionales. Requiere **consentimiento expreso del titular** (docente) o alguna excepción (art. 37).
2. **Decisiones automatizadas.** LFPDPPP 2025 art. 76-78 obligan a:
   - Informar al titular que está interactuando con IA.
   - Permitir revisión humana de cualquier decisión automatizada.
   - Explicabilidad cuando el sistema toma una decisión con impacto (ej: "el bloque X se sugirió porque...").
3. **Decisión automatizada de la app:** las features F1, F2, F3 son **de sugerencia, no de decisión**. La maestra edita, descarta o acepta. NO se ejecuta nada automáticamente por IA. **Esto reduce el riesgo regulatorio** vs. una plataforma que automatiza decisiones de evaluación del alumno.
4. **Aviso de privacidad (E4 Compliance):** debe mencionar explícitamente: "Las funciones de asistencia pedagógica del producto utilizan el modelo MiniMax para generar sugerencias textuales. Los prompts NO contienen datos personales directos. Más información: [link]."

#### 3.7.5. Anti-features explícitas (lo que MiniMax NO hará en MVP)

- ❌ **NO hace evaluación del alumno** (no tiene datos y no le llegan, por regla dura).
- ❌ **NO genera reportes a la supervisión** (es contenido agregado del docente, requiere decisión automatizada de orden superior).
- ❌ **NO redacta el proyecto entero desde cero** (la maestra es autora; la IA solo adapta/edita lo que ella empezó).
- ❌ **NO propone campos formativos ni PDA nuevos** (el catálogo oficial NEM es la fuente; la IA no lo modifica).
- ❌ **NO tiene memoria entre sesiones** (cada llamada es stateless, sin acumulación de datos de usuario).
- ❌ **NO se entrena con datos del producto.** MiniMax es un modelo congelado; no hay fine-tuning ni RLHF con datos de los usuarios de la plataforma.

#### 3.7.6. Riesgos conocidos y mitigación

| # | Riesgo | Mitigación |
|---|---|---|
| **R-IA1** | MiniMax cae o se vuelve inaccesible geográficamente | Degradación sin IA. Features que dependían de IA muestran "IA no disponible ahora, hazlo manual". |
| **R-IA2** | Cambio regulatorio de México sobre IAs extranjeras | E10/E11 ya cubren el monitoreo. Plan de migración a modelo local open-source cuantizado (LLaMA/Mistral) es Fase 2 si necesario. |
| **R-IA3** | Sesgo del modelo hacia ejemplos urbanos (MiniMax entrenado mayormente con datos generales) | Curar las 2 variantes base (urbana + rural) desde la app, no desde IA. La IA solo adapta, no inventa. |
| **R-IA4** | Costo se dispara por uso inesperado | Rate limiting + cache + monitoring de costos en tiempo real (CloudWatch o equivalente). |
| **R-IA5** | Fuga de datos por error de prompt engineering | Módulo `ia_anonymizer.py` único camino. Tests que verifican que ningún PII sale. Auditoría mensual de logs. |
| **R-IA6** | Sesgos del modelo en contenido pedagógico (inventa PDA no oficiales) | Regla explícita en el prompt: "Solo adapta texto, NO inventes campos formativos ni PDA. PDA referenciados en el catálogo oficial." |

#### 3.7.7. Validación antes de productivizar (criterio de cierre IA)

Una feature con IA se considera **lista para MVP** solo cuando cumple estas cinco condiciones:

1. **Output revisable.** La maestra puede editar o descartar.
2. **No inventa.** La estructura (PDA, campos, ejes) viene del catálogo; la IA solo adapta texto.
3. **Anónimo verificado.** El módulo `ia_anonymizer.py` testea que el log de la llamada NO contiene PII prohibido.
4. **Costo unitario medible.** Con 1000 planeaciones/mes, el costo MiniMax por planeación < USD 0.05.
5. **Latencia < 3s p95.** El 95% de las llamadas responde en menos de 3 segundos.

#### 3.7.8. Relación con E5

E5 (Análisis IA) reabre como **"Configuración MiniMax en producción"**. El entregable ahora es operacional, no de investigación: lista de configuración de API keys, rate limits configurados, monitor de costos, plan de fallback documentado.

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
- **Grupo**: docente, ciclo escolar, nivel, grado, grupo, total aproximado de alumnos y estado activo. Una docente puede administrar hasta tres grupos simples en el MVP y selecciona el grupo activo al trabajar.
- **Alumno**: grupo, nombre, grado, grupo, ciclo escolar y estado activo. Se captura una sola vez por ciclo, puede importarse desde CSV y permanece editable por la docente.
- **Evaluación de alumno**: planeación, alumno, nivel visual de logro (🟢 logrado sin apoyo, 🟡 logrado con apoyo, 🟠 requiere apoyo constante, 🔴 no logrado), fecha y observaciones breves.
- **Bitácora**: sesion, fecha, participación (1-5), actividad mejor (referencia a bloque), dificultades (texto), evidencia (URL imagen), docente.
- **Entrega** (al director): programacion_id, version (1, 2, 3...; cada edición post-entrega genera v+1), estado (`entregada` | `recibida` | `con_comentarios` | `archivada`), doc_pdf_url, pdf_sha256, fecha_creacion (timestamp de generación), fecha_entrega (timestamp del click "Entregar al director"), fecha_recibida (timestamp del director), comentario_director (texto libre opcional, persistente ligado al token hasta registro), url_firmada_token (JWT), url_firmada_expira_at (timestamp, default 30 días), director_celular (declarado por maestra, validado por OTP), director_id (FK cuando se registra).
- **CatalogoNEM**: versionado (Fase X / Edición 2025), campos[], ejes[], pdas[] (texto oficial del DOF).

**Datos de alumnos y límites de privacidad — decisión confirmada (ENT-003 D1 / E22 D-FIN-2 y D-FIN-15):**
- El MVP sí trata nombres de alumnos, nivel de logro y observaciones breves para permitir rúbrica e historial cronológico individual.
- Antes de capturar nombres, la docente debe aceptar el aviso de privacidad y confirmar que cuenta con consentimiento institucional para dichos datos.
- Siguen fuera del MVP los datos de salud, neurotipo, fotografías o voz de alumnos y cualquier uso de IA con información identificable de menores.
- La evidencia fotográfica solo puede mostrar el trabajo del niño, nunca al niño mismo.

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
  - 6 tipos de bloque canónicos, cada uno con variantes por **campo formativo × fase**:
    - **Apertura** — activar saberes previos, pregunta detonadora, conexión cotidiana.
    - **Desarrollo guiado** — andamiaje conceptual, modelaje por la maestra.
    - **Actividad práctica** — exploración, juego, producción del niño (variantes por edad).
    - **Microlección** — exposición corta con apoyo visual.
    - **Evaluación formativa** — observación, rúbrica, lista de cotejo, diario.
    - **Cierre reflexivo** — metacognición, socialización, sentido del aprendizaje.

**Total inicial (Fase 2 MVP preescolar):** **~150 bloques curados** = 4 campos formativos × 6 tipos × ~5-7 variantes + transversales. Editables, duplicables, sin IA.

> Nota de coherencia (v0.9): §1 menciona "bloques pre-armados". §3.6.M1 fija el catálogo en ~150 bloques. §5 describía antes ~30 plantillas — se alinea en v0.9 a 150 para que sea consistente.

**Origen de datos:** digitalización **manual** del Plan 2022 + Programas Sintéticos FASES 2-6 (DOF 2023). NO scraping automático de CONALITEG.

**Estimación de esfuerzo de catalogación:** 40-80 horas-hombre solo de transcripción y carga del árbol (4 campos × 6 fases × ~24 PDA = ~96 entradas con texto oficial). **Tesis de fundador, no de programador.** Tomar como riesgo de cronograma.

---

## 6. PLATAFORMA Y STACK (DECISIONES CONFIRMADAS)

| Capa | Propuesta | Razón |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind + `@dnd-kit/core` + `@dnd-kit/sortable` | Web responsive PWA, drag-and-drop maduro en React |
| Backend | Supabase (Postgres + Auth + Storage) | Velocidad de MVP, RLS para multi-tenant escuela |
| Auth | Email + contraseña (OTP por email opcional) | Sin OAuth social para MVP, evita fricción |
| Storage de evidencias | Supabase Storage (bucket privado) | Para bitácora, fotos |
| Generación PDF | Server-side (Playwright o Puppeteer) | Formato NEM reconocible, adjunto a planeación |
| PWA / offline | Service Worker + IndexedDB local | Bitácora offline (escuela sin señal) |
| **IA integrada** | **MiniMax M3 por defecto** mediante conector OpenAI-compatible. Ver §3.7 para features concretas y política de datos | Proveedor, modelo y URL configurables. Sin fallback automático; datos de menores siempre excluidos. |
| **Módulo de anonimización** | `ia_anonymizer.py` server-side antes de cada llamada. Tests unitarios que verifican que ningún PII cruza | Compliance LFPDPPP 2025 |
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

### 6.2. Multi-tenant (H2 de ENT-001, v0.11)

**Regla:** cada escuela es un tenant lógico. Datos aislados por CCT.

- **Row-Level Security (RLS) en Supabase:** cada tabla lleva `cct_id` o `escuela_id`. Policies de Supabase Auth.uid() + JOIN a `usuarios.cct_id` para validar acceso.
- **Aislamiento de subida:** fotos de bitácora se guardan en Supabase Storage con path `ccts/{cct}/bitacoras/{fecha}/{uuid}.jpg`. RLS del bucket valida acceso por CCT.
- **Casos borde:**
  - Maestra con CCT pero sin director asignado: la app funciona; sus entregas se guardan sin destino específico hasta que el director se registre.
  - Director de CCT con varios maestros: panel director muestra TODOS los maestros vinculados a su CCT.
  - Cambio de CCT de un maestro (traslado de escuela): requiere acción explícita de desvinculación; no automático.
- **Para verificar:** un test E2E donde una maestra de CCT-A intenta ver entregas de CCT-B y la app lo bloquea.

### 6.2.1. Decisiones funcionales consolidadas del cierre de discovery

Las siguientes decisiones confirmadas complementan este baseline y son obligatorias para el alcance MVP. Sus detalles técnicos viven en las SPEC técnicas activas, sin sustituir el comportamiento funcional aquí descrito.

**Onboarding y privacidad (E22 D-FIN-4, D-FIN-15):** el alta ocurre en un máximo de cinco pantallas: registro; selección y confirmación del CCT; configuración del grupo del ciclo; captura opcional o importación CSV de alumnos; bienvenida con un único tip contextual. En el primer acceso se presenta el aviso de privacidad completo. Si la docente no lo acepta, puede usar la app pero no registrar nombres de alumnos.

**Modalidad y planeación (E22 D-FIN-6, D-FIN-9):** el wizard adapta su estructura a la modalidad escogida. El MVP entrega completo Proyecto Comunitario; las demás modalidades quedan preparadas para iteraciones posteriores. Cada sesión admite un ajuste opcional de texto libre para el plan B.

**CONALITEG (E22 D-FIN-10):** los libros oficiales se visualizan en línea desde el portal oficial y, cuando la docente los haya consultado con red, pueden estar disponibles sin conexión mediante caché para su grado. La plataforma mantiene atribución visible a CONALITEG/SEP y enlace al portal oficial; no reemplaza la propiedad ni el origen oficial de los contenidos.

**Multi-grupo y clonado (E22 D-FIN-16, D-FIN-17):** una docente puede gestionar hasta tres grupos simples. Puede duplicar una planeación hacia otro grupo o ciclo: se copia la estructura, sesiones, bloques y recursos; quedan vacíos alumnos y evaluaciones para el grupo destino. El alcance no incluye sincronización multi-grupo avanzada ni compartir alumnos entre grupos.

**Entrega al director (E22 D-FIN-5, D-FIN-19):** al entregar una planeación, la docente obtiene una vista firmada para el director sin registro y puede abrir WhatsApp con un mensaje prearmado y editable que incluye el enlace. La entrega permite visualizar, compartir e imprimir/guardar el documento; la generación de un archivo PDF binario descargable se mantiene como una capacidad pendiente de materialización técnica y no se debe representar como ya implementada.

### 6.3. UX como diferenciador (v0.13)

**Decisión de fundador (v0.13):** la experiencia de uso debe ser **superior al menos a Kumu y servicios similares**, y esto se valida de manera observable, no por opinión.

**Por qué UX es diferenciador explícito:**
- Kumu, Teachy, Planea IA son productos con catálogo + IA. Sus argumentos de venta son "rápido" y "completo". Pero los docentes mexicanos suelen reportar fricción, no features.
- Nuestra ventaja debe ser la **experiencia**: simple, funcional, sin estridencias, sin ruido, sin ansiedad, terminamos rápido y la maestra SIENTE que terminó.
- Kumu y similares NO invierten tanto en esto porque su modelo de negocio no depende de retención diaria. Nuestras maestras no renuevan si no la usan — necesitamos retención por experiencia.

**Principios UX innegociables (no se negocian en MVP):**

| # | Principio | Cómo se mide |
|---|---|---|
| **P-UX1** | **"Una pregunta por pantalla"**. Nunca mostrar 5 campos a la vez. Mostrar 1 (o un grupo pequeño relacionado) con CTA claro. | Auditoría de cada pantalla. |
| **P-UX2** | **"Pull, no push"**. La app sugiere; la maestra decide. Cero banners rojos de "tareas pendientes". Cero timeouts agresivos. | Test con 5 maestras: ninguna debe sentir "la app me apura". |
| **P-UX3** | **"Texto claro antes que iconos opacos"**. Botones dicen "Guardar proyecto", no solo un floppy disk. | Cualquier icono sin texto adyacente es auditable. |
| **P-UX4** | **"Mobile first honest"**. La pantalla de 360px de ancho debe ser **completa y completa**, no "versión reducida". Lo que hace la maestra en su cama cuenta. | Test obligatorio a 360×640 viewport. |
| **P-UX5** | **"Tiempo de carga < 1.5s p75"**. La maestra está cansada. Espera < 1.5s y no perdona > 3s. | Métrica Core Web Vitals Vercel Analytics. |
| **P-UX6** | **"Recuperación fácil de errores"**. Si la maestra borra algo accidentalmente, debe poder deshacer. Undo siempre visible las primeras 2 semanas. | Test E2E con flujo "undo". |
| **P-UX7** | **"Estados vacíos con llamada a la acción, no tristeza"**. Una pantalla vacía de proyectos no dice "no tienes proyectos". Dice "Crea tu primer proyecto en 15 min" con CTA. | Auditoría de cada estado vacío. |
| **P-UX8** | **"Compatibilidad con datos del mundo real"**. La maestra escribe "no se entregó tarea por falta de cuaderno", no "el alumno no presentó la evidencia pedagógica trazada". Aceptamos su lenguaje. | Cero jerga pedagógica en UI. |
| **P-UX9** | **"Cero entrenamiento requerido"**. La maestra que abre la app por primera vez debe poder armar una planeación SIN video tutorial. Máximo: 1 hint contextual la primera vez, después desaparece. | Test con maestra sin instrucción previa. |
| **P-UX10** | **"Accesibilidad WCAG 2.1 AA mínimo"**. Contraste, navegación por teclado, lector de pantalla, textos escalables. No es nice-to-have, es ley (LFPDPPP-incluye derechos digitales). | Auditoría con axe-core o equivalente. |

**Decisiones concretas UX MVP (sin negociación):**

- **Tipografía:** una sola fuente, **sans-serif del sistema** (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). Sin fuentes custom en MVP. Velocidad > marca.
- **Paleta:** máximo 4 colores funcionales:
  - Verde (`#1F8A4C` estilo SEP verde) — acción primaria, "OK", "guardado".
  - Amarillo (`#D4A017`) — atención moderada, "revisar".
  - Rojo (`#A02B2B`) — error real, "faltan datos críticos". **NO se usa para tareas pendientes** (véase P-UX2).
  - Gris (`#5C6770`) — secundario, texto secundario.
  - **Y blanco/negro para el resto.** Sin paleta "educativa infantil" con muchos colores.
- **Iconografía:** sistema **Lucide** (open-source, sin royalties, ~1500 iconos). Sin emoji en UI de producto. Tamaño consistente 20px en sidebar, 24px en headers, 16px en inline.
- **Idioma:** español neutro (México). Sin regionalismos de un solo estado. Sin diminutivos condescendientes.
- **Densidad:** holgada. 16px base font, 24px padding estándar. Maestra cansada, no quiere apretura visual.
- **Botones primarios:** color sólido, texto blanco, alto contraste. **Un solo botón primario por pantalla** (P-UX1).
- **Loading:** skeletons, no spinners. Skeletons muestran la forma del contenido que viene.
- **Errores:** inline, junto al campo. No modales. P-UX6.

**Decisiones explícitas que NO hacemos en MVP (anti-diferenciador):**

- ❌ **NO gamificación.** Sin badges, sin puntos, sin "niveles". Kumu lo hace y muchos docentes lo encuentran condescendiente.
- ❌ **NO streaks ni rachas.** La maestra planeó ayer o no lo hizo. El sistema no la castiga con "racha rota".
- ❌ **NO emojis en UI de producto.** Solo en mensajes pre-armados de WhatsApp (porque son personales).
- ❌ **NO animaciones innecesarias.** Una transición al cambiar de paso está bien; 6 efectos en cascada al abrir un menú están mal.
- ❌ **NO onboarding largo.** Sin tutorial 5-pasos al registrarse. Una pregunta + 1 hint contextual.

**Validación UX antes de MVP (lo que cambia todo):**

| Test | Cuándo | Quién | Criterio de éxito |
|---|---|---|---|
| **T-UX1: Test de los 5 minutos.** | Cada release candidate. | 5 maestras reales nuevas. | Cada una abre la app cold-start (sin instrucciones), arma al menos un proyecto, calendariza 1 sesión, llena 1 bitácora. Lo logra en < 20 min sin pedir ayuda. |
| **T-UX2: Mobile-first honesto.** | Cada release candidate. | Tester (cualquiera). | 360×640 viewport: TODAS las pantallas principales (crear proyecto, ver calendario, abrir bitácora, configurar escuela) usables al 100%. |
| **T-UX3: Comparativa con referencia del mercado.** | Beta cerrada pre-lanzamiento. | 5 maestras. | Misma tarea en nuestro producto vs. Kumu (o alternativa que usen). 4 de 5 prefieren el nuestro por UX explícita. |
| **T-UX4: Accesibilidad básica.** | Cada release. | Automático (axe-core CI). | 0 issues "serious" o "critical" en flujos principales. |
| **T-UX5: Tiempo de carga.** | Cada release. | Vercel Analytics. | p75 LCP < 1.5s en 4G. p95 < 3s. |
| **T-UX6: Lenguaje de maestra.** | Cada release candidate. | 2 maestras que lean textos UI. | "Esto suena a algo que yo diría, no a un libro de texto." |

**Anti-feature UX permanente:**

- ❌ No meteremos features que el maestro no pidió. Si una feature no resuelve un dolor validado, no se hace.

## 7. CRITERIOS DE CIERRE DEL MVP (v0.11 con M2-M5)

El MVP está "listo" cuando **todas** estas condiciones se cumplen:

### 7.1. Núcleo MVP (no negociables)

1. Una maestra real (no fundadora) logra **crear un proyecto** (Flujo A) en <15 min sin ayuda.
2. La misma maestra logra **armar la planeación mensual** (Flujo B) en <5 min sobre los 15 min anteriores, total <20 min.
3. La misma maestra llena una **bitácora** en <30 s.
4. La planeación exportada en **PDF** es aceptada por su director sin reformateo.
5. La app funciona offline para **bitácora** y se sincroniza al recuperar señal.
6. **No hay crashes** en 5 sesiones consecutivas de uso real.
7. Costo de infraestructura < USD 50/mes con 100 docentes activos.
8. Probada con **al menos 1 maestra real no-fundadora** (tía Lola o equivalente).
9. **T-UX1:** probada con 5 maestras reales cold-start que arman proyecto + calendariza 1 sesión + llena 1 bitácora en < 20 min sin pedir ayuda.
10. **T-UX2:** TODAS las pantallas principales usables en viewport 360×640px (mobile-first honesto, P-UX4).

### 7.2. Criterios por mejora M2-M5 (v0.11, cierre de ENT-001 H1)

**M2 — Problema del contexto primero, contextualizado por CCT-zona:**
- 9. Una maestra con CCT en el catálogo CCT-zona MEX ve **al menos 1 sugerencia contextual** de su zona al crear un proyecto.
- 10. Una maestra que NO tiene CCT en el catálogo puede usar el banco genérico + caja blanca sin truncamiento del flujo.
- 11. La maestra puede **cambiar la situación** (problema del contexto) hasta el día 5 del mes sin perder lo que ya hizo.

**M3 — Vista mensual proactiva:**
- 12. El calendario de una maestra con 5 planeaciones muestra **los 4 estados de color** correctamente (verde/amarillo/rojo/gris).
- 13. "Planificar mes completo" propone **esqueleto de fechas tentativas**, no rellena contenido. La maestra debe confirmar bloque por bloque.
- 14. Interruptor "Mostrar comparación con meses anteriores" funciona: **default OFF, no satura**.

**M4 — Ensamblaje de características de la escuela:**
- 15. Una maestra con "**Luz intermitente**" configurada NO ve bloques que requieren proyector en el banco principal.
- 16. Una maestra con "**Multigrado 3 niveles**" ve bloques adaptados a multigrado (no los mismos de unigrado).
- 17. La maestra puede **editar la configuración** en cualquier momento desde Ajustes; los cambios surten efecto en próximas sugerencias sin alterar proyectos ya creados.

**M5 — Entrega real al director (URL firmada + OTP WhatsApp):**
- 18. La maestra **entrega una planeación** con un click; recibe confirmación visual con timestamp.
- 19. La **URL firmada** abre el PDF sin necesidad de login del director.
- 20. El director **marca como recibida** sin registrarse (timestamp guardado).
- 21. El director **opta por registrarse** vía OTP WhatsApp al celular que la maestra usó para llegar; tras confirmar, **se preservan** sus comentarios previos.
- 22. Si el director **no abre la URL en 7 días**, la maestra recibe un **recordatorio suave** en la app (no push, no email).

### 7.3. Criterion de IA (Sección §3.7)

- 23. Las 4 features IA (F1 variantes, F2 help-in-line, F3 pulido PDF) pasan los **5 criterios de §3.7.7** cada una.
- 24. **Costo MiniMax < USD 30/mes con 1000 planeaciones/mes.** Validado en E5.

### 7.4. Criterion de fuego (igual a v0.1)

**No es MVP** si solo se cumplen 7.1 sin su criterio 4. El director aceptando el PDF es la prueba de fuego.

**No es MVP** si solo se cumplen 7.1 + 7.2 + 7.3 sin validar con al menos 1 maestra real no-fundadora (criterio 8).

---

## 8. ENTREGABLES DERIVADOS (SIGUIENTE SPRINT)

## 8. ENTREGABLES DERIVADOS (SIGUIENTE SPRINT)

Estos NO son parte del MVP, pero el MVP los **desbloquea**:

| # | Entregable | Descripción breve |
|---|---|---|
| E2 | SPEC del módulo Director completo | Panel con revisión, comentarios, calendario agregado, alertas |
| ~~E3~~ | (fusionado con E14, v0.11) | Catálogo NEM digitalizado = mismo entregable que E14 (catalogación autónoma Fase 2). Se conserva E14; se quita E3. |
| E4 | Compliance LFPDPPP 2025 | Análisis formal de qué datos se pueden tratar, bases legales, aviso de privacidad para IA futuro, exclusiones voluntarias documentadas. **Bloqueador para M5 en producción** (ver §3.6.M5 banner). |
| E5 | **Configuración MiniMax en producción** | Decisión v0.10: MiniMax M3 como IA única. Este entregable es operacional: API keys, rate limits, monitor de costos, plan de fallback documentado. Ver §3.7 para features concretas, política de datos y criterios de cierre. |
| E6 | Modelo de datos formal | Diagrama ER + RLS policies + ciclo de vida |
| E7 | Roadmap Fase 2 | Biblioteca comunitaria, analíticos, marketplace |
| E8 | Plan de adopción | Cómo se consigue el primer usuario no-fundador |
| E9 | **Documento de Exclusiones Voluntarias** | Lista explícita de lo que el MVP **NO** hace (datos de alumnos, IA generativa, marketplace, etc.) y por qué. Sirve como defensa si auditoría regulatoria o de inversión pregunta por compliance/scope creep |
| E10 | **Protocolo de Sincronización Normativa** | Cadencia y checklist para mantener actualizado el catálogo NEM, calendario escolar y compliance. Reside en `fuentes/E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md` |
| E11 | **Monitor de Vigilancia Normativa** | Diseño del monitor automatizado que detecta cambios en NEM/LFPDPPP/calendario/CONALITEG. Reside en `fuentes/E11_MONITOR_VIGILANCIA_NORMATIVA.md` |
| E14 | **Catalogación Autónoma Fase 2 (Preescolar)** | Diseño del motor de catalogación autónoma del catálogo NEM Fase 2. Pipeline de extracción PDF + validación humana + modelo relacional + carga. Reside en `fuentes/E14_CATALOGACION_AUTONOMA_FASE_2.md` |
| E15 | **Investigación CCT→zona (dataset público)** | Búsqueda de dataset oficial SEP/INEGI/CONAPO que mapee CCT a zona rural/urbana/indígena. Acelera el catálogo M2. Output reside en worktree `ct-research-cct-zona`. |
| E16 | **Mejoras M1-M5 (Diseño de la planeación diferenciada)** | Diseño completo de las 5 mejoras que cierran el diferenciador vs Kumu. M1 (bloques) cerrada; M2 (problema del contexto primero) cerrada con CCT-zona; M3 (vista proactiva) cerrada con interruptor y reglas duras; M4 (características ensamblables) cerrada; M5 (entrega real) arquitectura cerrada, UX concreta del portal director PENDIENTE de validación con director real. |
| E17 | **UX como Diferenciador** | Diseño UX completo: 10 principios P-UX1 a P-UX10, decisiones concretas (tipografía sistema, paleta 4 colores, iconos Lucide, sin gamificación, sin emojis en UI), decisiones por módulo (calendario, bloques, entrega, configuración), 6 tests pre-release T-UX1 a T-UX6. Reside en `fuentes/E17_UX_COMO_DIFERENCIADOR.md` y resumido en §6.3. |

---

## 9. RIESGOS CONOCIDOS (sin mitigar todavía)

1. **Preescolar ≠ primaria/secundaria.** Ya vimos que cambia periodicidad y unidad. Mitigación: parametrización desde día 1, no hardcode.
2. **Reforma LFPDPPP 2025 (vigente desde 21-mar-2025).** Incluye obligaciones específicas para IA y decisiones automatizadas. INAI desapareció → autoridad es **Secretaría Anticorrupción y Buen Gobierno**. El MVP trata nombres, niveles de logro y observaciones breves de alumnos, por lo que exige aviso de privacidad y aceptación antes de su captura; salud, neurotipo, imagen/voz e IA con datos de menores siguen excluidos. El consentimiento formal de padres/tutores se programa para la fase legal posterior al MVP.
3. **PDF NEM reconocible.** Si los directores no aceptan el PDF tal cual, MVP falla criterio 4. Mitigación: validar formato con 3-5 directores reales ANTES de cerrar diseño de exportador.
4. **Offline sync.** Complejidad no trivial. Mitigación: empezar con online-first, offline solo para bitácora (alcance pequeño).
5. **Catálogo NEM desactualizado.** Si SEP emite nueva versión o nueva fase, hay que actualizar. Mitigación: tabla versionada, alerta de "versión NEM cargada".
6. **Catálogo NEM — esfuerzo de catalogación.** Trabajo manual de 40-80h para transcribir ~96 PDA oficiales. **No delegable a programador.** Tesis de fundador. Riesgo de cronograma si se subestima.
7. **Competencia directa: Kumu (kumu.la).** Ya tiene planeación NEM con IA + biblioteca + Kumu Familiar + calendario. **Diferenciador documentado:** flujo completo docente (incluye director + bitácora + analíticos longitudinales del grupo). Si el MVP imita a Kumu en planeación+IA, **no hay diferenciación**. Mitigación: foco obsesivo en el flujo post-exportación (entrega al director → bitácora → evidencia → reporte).
8. **Fase 1 (educación inicial) sin programa sintético oficial.** Si se incluye en el MVP, debe etiquetarse como "extensión no oficial". Riesgo de credibilidad pedagógica si se exhibe como NEM-alineado.
9. **Reforma Senado 26-dic-2025 sobre imagen/voz/datos de menores.** Prohíbe uso comercial sin consentimiento expreso escrito. El MVP no captura imagen o voz de alumnos; la evidencia se limita al trabajo producido por ellos. Esta restricción es permanente para cualquier evolución de seguimiento individual.
10. **UX móvil — drag-and-drop impreciso.** Patrón documentado: drag con el dedo falla el 30-40% de las veces en pantallas pequeñas. Mitigación: botón "Agregar al día" como acción primaria en móvil, drag como secundario; haptic feedback y undo button.
11. **IA MiniMax — transferencia internacional de datos.** Decisión de proveedor único (M3, servidor en China). LFPDPPP 2025 art. 36-38 requiere consentimiento expreso o excepción documentada. Mitigación: aviso de privacidad específico para IA + módulo `ia_anonymizer.py` que aplica reglas de ofuscación antes de cada llamada + tests automatizados. Ver §3.7.

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
