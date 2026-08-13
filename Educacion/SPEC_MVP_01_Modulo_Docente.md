# SPEC MVP — MÓDULO DOCENTE

**Versión:** 0.6 — añadido E14 (Catalogación Autónoma Fase 2 — Preescolar)
**Fecha:** 2026-08-13
**Estado:** ESPECIFICACIÓN PARTICULAR #1 (la primera a detallar)
**Origen:** Discovery con fundador (3 rondas, 12 decisiones cerradas) + ronda de investigación profunda (NEM oficial, LFPDPPP 2025, mercado edtech MX, UX drag-and-drop) + investigación sobre contrato curricular oficial de la planeación NEM (elementos obligatorios SEP) + análisis de cadencia real de cambios normativos 2022-2026 + diseño del Monitor de Vigilancia + diseño del motor de catalogación de contenidos preescolar
**Alineado a:** `plataforma_nem_concepto_maestro.md` (documento maestro, intacto)
**Protocolo de mantenimiento:** ver `fuentes/E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md`
**Diseño del monitor de vigilancia:** ver `fuentes/E11_MONITOR_VIGILANCIA_NORMATIVA.md`
**Diseño del motor de catalogación:** ver `fuentes/E14_CATALOGACION_AUTONOMA_FASE_2.md`

---

## DIFERENCIADOR CENTRAL (declarado)

> **"No solo hago la planeación — la entrego al ecosistema completo del docente: director, evidencia post-clase, reporte longitudinal. Por eso soy el sistema operativo del aula, no un generador."**

Esto se traduce operativamente en que **el MVP integra el flujo completo**: planeación → entrega al director → clase → bitácora → evidencia → reporte del grupo. No termina cuando el maestro exporta un PDF.

**Por qué importa:** Kumu (kumu.la) — competidor directo en México — ya hace planeación NEM con IA + biblioteca + Kumu Familiar + calendario. Kumu **no** integra el flujo post-exportación. Ese ciclo es el **moat**.

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

### Flujo A: Crear un proyecto o situación (NEM)
1. Docente abre app → vista de proyectos (lista de proyectos/situaciones propios).
2. Click en "Nuevo proyecto/situación" → primero debe elegir **unidad didáctica**: `situación de aprendizaje` (preescolar) | `proyecto` (primaria/sec) | `unidad didáctica` | `sesión`.
3. Captura los **elementos curriculares obligatorios** (validados por la app):
   - Nombre del proyecto
   - Problema del contexto (campo obligatorio, no acepta vacío)
   - Propósito
   - 1-4 campos formativos (selector; advertencia si solo 1 en primaria/sec)
   - 1+ ejes articuladores (selector)
   - 1+ PDA (selector del catálogo)
   - Contenido (del catálogo o texto libre)
   - **Producto integrador** (obligatorio: texto breve de qué entregarán los alumnos al final)
4. App genera **plantilla de bloques** vacía: `inicio | desarrollo | cierre`, con número de sesiones configurable.
5. Docente arrastra **bloques pre-armados** del catálogo NEM al inicio, desarrollo y cierre.
6. Cada bloque se enlaza a un campo formativo y un PDA del proyecto.
7. Guarda → el proyecto queda en su banco personal.
8. Tiempo objetivo: **< 10 min** para un proyecto completo (vs. 4-6 horas actuales en una planeación completa).

### Flujo B: Componer planeación (drag-and-drop)
1. Docente abre vista calendario del mes (preescolar) o semana (primaria/sec).
2. Las celdas muestran **los proyectos/situaciones programados**, no "clases sueltas" como en versiones iniciales de este SPEC.
3. Arrastra proyectos a celdas (o usa el botón "Agregar" en móvil).
4. Duplica, mueve entre días, elimina.
5. Click "Exportar PDF" → genera documento con **formato NEM completo** (ver §3.5): datos generales, elementos curriculares, secuencia por sesiones, evaluación formativa, ajustes razonables, firma y visto bueno.
6. Click "Entregar al director" → el PDF se publica en su panel (en MVP: solo visibilidad).
7. Tiempo objetivo: **< 5 min** para calendarizar + exportar (sumado al Flujo A: ~15 min para una planeación mensual completa vs. 4-6 horas actuales).

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

Validar la **sección 3 (flujos)** y el **diferenciador central** con tía Lola antes de escribir código. Si los flujos no resuenan con ella, o si "entregar al director / bitácora continua" no es dolor para ella, todo lo demás es cosmético.

**Acción inmediata:** Hacer una sesión de usability mental (15-30 min) donde le cuentas:
1. Los flujos A-D tal como están escritos (sección 3), incluyendo el nuevo modelo **Proyecto / Sesión** (no "Clase").
2. El diferenciador: "no solo hago la planeación, la entrego al director y luego bitácora/evidencia/reporte continúan automáticamente".
3. El contrato curricular NEM (§3.5): pedirle que valide si los elementos obligatorios corresponden a lo que ella ya llena en sus formatos actuales.

Y le preguntas:
- ¿Esto coincide con cómo trabaja?
- ¿Qué le sobra?
- ¿Qué le falta?
- ¿Siente el dolor de "entregar la planeación" al director (vs. solo tenerla guardada)?
- ¿Siente el dolor de "después de la clase la evidencia se pierde"?
- **Extra:** ¿los elementos obligatorios del PDF coinciden con lo que ella ya tiene que llenar hoy, o le exigimos cosas que no le piden?

**Hipótesis a validar:** si Lola confirma al menos 2 de estos 3 dolores, el diferenciador es real.
   1. Dolor 1: planeación se queda en su laptop, el director la recibe tarde o en formato inconsistente.
   2. Dolor 2: después de la clase, las evidencias y notas se pierden.
   3. Dolor 3: al final del mes/trimestre, reconstruir el avance del grupo es trabajo extra.

---

**Fin del Entregable #1.**
Listo para discovery del Entregable #2 (módulo Director) cuando tú digas.
