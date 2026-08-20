# Issue: Hallazgos de Proyectos Reales para enriquecer M1-M5

**ID:** ENT-002-HALLAZGOS-PROY-REAL
**Fecha:** 2026-08-15
**Origen:** Análisis de 2 proyectos NEM reales de maestra en activo (María Dolores Marín Pastrana, Jardín Celestino Freinet CCT 22DJN0059R)
**Estado:** Propuesta para integración al `SPEC_MVP_01_Modulo_Docente.md`

---

## Contexto

El 2026-08-15 el founder compartió 2 proyectos DOCX de una maestra en activo (Jardín Celestino Freinet, Fase 1, ciclo 2025-2026):

1. **Proyecto "Buenas Decisiones"** — Modalidad Proyecto Comunitario, 5 fases
2. **Unidad Didáctica "EMOCIONES"** — Sesión 3, banco de palabras, actividades recurrentes

Ambos proyectos cumplen con la norma SEP pero revelan **6 elementos que el SPEC actual no contempla explícitamente**. Se propone integrar como issues al backlog.

---

## H1 — Rúbrica por alumno con nombres individuales [ALTA]

**Origen:** Proyecto Buenas Decisiones, sección Fase 5 Evaluación.

**Hallazgo:** La maestra registra la evaluación **por alumno específico** (Cailin, Dylan, Kevin Francisco...) con 4 niveles visuales (🟢 Verde / 🟡 Amarillo / 🟠 Naranja / 🔴 Rojo). Cada nivel tiene descripción vinculada al PDA trabajado.

**Estado en SPEC actual:**
- §3.5 Contrato Curricular NEM menciona evaluación formativa e instrumento (rúbrica).
- §3 Flujo C (Bitácora) NO incluye seguimiento individual.
- §4 Entidades: sin entidad `BitácoraAvanceAlumno`.

**Propuesta:**
- Agregar entidad `BitácoraAvanceAlumno` con `alumno_nombre`, `nivel`, `pda_id`, `fecha`, `observaciones`.
- Agregar UI para captura rápida desde celular (drag-and-drop alumno → nivel).
- Esto resolvería el pain point #1 de Tía Lola ("no recuerdo qué tema di con X niño").

**Decisión necesaria:** ¿Incluir nombres de alumnos en MVP? El SPEC §4 actual dice "sin datos de alumnos en MVP. Cero." (Línea 554). Esto requiere revisar la decisión política.

---

## H2 — Banco de palabras de la unidad [MEDIA]

**Origen:** Proyecto EMOCIONES, sección "Banco de palabras: celos, envidia".

**Hallazgo:** En unidades didácticas con vocabulario específico, la maestra trabaja explícitamente un **banco de palabras** (2-5 términos) vinculados a los contenidos de la unidad. Esto estructura el aprendizaje lexical.

**Estado en SPEC actual:**
- §3.6.M1 catálogo menciona ~150 bloques pero no contempla "banco de palabras" como tipo.
- §5 menciona contenidos pero no vocabulario explícito.

**Propuesta:**
- Agregar tipo de bloque "Banco de palabras" al catálogo M1 (~5 variantes × 4 campos = 20 bloques).
- Vincularlo automáticamente al seleccionar contenidos que requieran vocabulario nuevo.

---

## H3 — Actividades recurrentes paralelas con calendario semanal [MEDIA]

**Origen:** Proyecto EMOCIONES, sección "Actividades Recurrentes" con calendario L M J V.

**Hallazgo:** Además de la secuencia principal, la maestra trabaja **actividades paralelas recurrentes** (ej. escribir fecha cada lunes, carta de agradecimiento cada martes) que se repiten durante toda la unidad. Tiene su propio calendario semanal independiente.

**Estado en SPEC actual:**
- §3 Flujo A paso 6: "App genera plantilla de bloques vacía: inicio | desarrollo | cierre".
- No contempla actividades recurrentes paralelas.

**Propuesta:**
- Agregar sub-sección "Actividades recurrentes" en Flujo A.
- Permitir definir N actividades con días de la semana (L M M J V).
- Aparece como capa adicional sobre la secuencia principal.

---

## H4 — 4 niveles visuales de logro (semáforo) [MEDIA]

**Origen:** Proyecto Buenas Decisiones, rúbrica de evaluación.

**Hallazgo:** La rúbrica usa un **código de 4 colores** semántico: 🟢 Logrado, 🟡 Logrado con apoyo, 🟠 Requiere apoyo, 🔴 No logrado. Es un lenguaje visual universal para la evaluación.

**Estado en SPEC actual:**
- §3.5 Contrato Curricular: menciona instrumentos pero no niveles visuales.
- E17 §3.2 Paleta: define Verde `#1F8A4C`, Amarillo `#D4A017`, Rojo `#A02B2B`. Pero el naranja no está definido.

**Propuesta:**
- Adoptar el código de 4 colores como estándar en rúbricas.
- Agregar Naranja `#E07B00` (o similar) a paleta de E17.
- Documentar en §3.5 que el instrumento por defecto es rúbrica de 4 niveles.

---

## H5 — Wizard adaptativo por modalidad pedagógica [ALTA]

**Origen:** Ambos proyectos usan modalidades distintas (Proyecto Comunitario vs Unidad Didáctica) con estructuras diferentes.

**Hallazgo:** El Flujo A actual (§3) asume una estructura única pero **cada modalidad NEM tiene estructura propia**:

| Modalidad | Estructura | Ejemplo |
|-----------|-----------|---------|
| Proyecto Comunitario | 5 fases: Motivación → Diseño → Acción → Finalización → Evaluación | Buenas Decisiones |
| Unidad Didáctica | Sesiones numeradas con banco de palabras + actividades recurrentes | EMOCIONES |
| ABJ | Inicio juego → Desarrollo → Cierre/reflexión | (no visto) |
| Rincones | Estaciones paralelas con materiales | (no visto) |
| Centros de interés | Tema + preguntas detonadoras + estaciones | (no visto) |
| Taller crítico | Reflexión → Producción → Socialización | (no visto) |

**Estado en SPEC actual:**
- §3 Flujo A paso 2 menciona elegir `unidad didáctica | situación | proyecto | sesión` pero no diferencia la estructura interna según la elección.

**Propuesta:**
- Hacer que el wizard (paso 6 del Flujo A) adapte su plantilla de bloques según la modalidad elegida.
- Cada modalidad tiene su propio template de estructura.

---

## H6 — Ajustes documentados por sesión [BAJA]

**Origen:** Proyecto EMOCIONES, columna "Ajustes" en la tabla de sesiones.

**Hallazgo:** Cada sesión tiene un campo "Ajustes" donde la maestra documenta variaciones (ej. "Platicar sobre el cuento visto en casa"). Esto es un mini plan B por sesión.

**Estado en SPEC actual:**
- §3.6.M1 nivel "Abierto" permite reescritura pero no hay campo "ajustes" explícito.

**Propuesta:**
- Agregar campo opcional `ajustes_sesion` (texto libre, 200 chars) por sesión.
- Aparece como tooltip/accordion en la vista del proyecto.

---

## Resumen de impacto

| # | Severidad | Acción propuesta | Esfuerzo estimado |
|---|-----------|------------------|-------------------|
| H1 | ALTA | Decisión política sobre datos de alumnos + nueva entidad | 4h |
| H2 | MEDIA | 20 nuevos bloques al catálogo | 2h |
| H3 | MEDIA | Sub-sección en Flujo A | 3h |
| H4 | MEDIA | Color naranja en paleta + rúbrica 4 niveles | 1h |
| H5 | ALTA | Wizard adaptativo por modalidad | 8h |
| H6 | BAJA | Campo `ajustes_sesion` | 1h |

**Total esfuerzo:** ~19 horas para integrar todo.

**Bloqueador identificado:** H1 depende de la decisión política de incluir nombres de alumnos en MVP. Esto invierte la decisión actual "sin datos de alumnos en MVP. Cero." (línea 554 SPEC principal).

**Recomendación:** abrir issue de debate antes de implementar. La decisión correcta depende de validarse con tía Lola + 1-2 maestras adicionales en sesión de discovery.

---

## Archivos de referencia

- `formatos/proyecto_buenas_decisiones_analisis.md`
- `formatos/proyecto_emociones_analisis.md`

---

**Fin del issue ENT-002.**