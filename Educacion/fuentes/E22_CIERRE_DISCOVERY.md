# E22 — Cierre del Discovery: Decisiones Consolidadas para MVP

**Versión:** 1.1
**Fecha:** 2026-08-16
**Estado:** ESPECIFICACIÓN DE DECISIONES — fuente de verdad para MVP
**Origen:** Sesión de consolidación 2026-08-15/16 con Frank
**Alineado a:** `SPEC_MVP_01_Modulo_Docente.md` + `E20` + `E21` + `ENT-002` + `ENT-003`
**Cambios v1.1:** Agregadas D-FIN-11 a D-FIN-19 (stack técnico + compliance + UX). Total 19 decisiones formalizadas.

---

## 1. PROPÓSITO

Consolidar **todas las decisiones tomadas durante la sesión de discovery** que aún no están formalizadas en el SPEC principal. Este documento es **fuente de verdad** para que SOFIA implemente y para que el SPEC se actualice sin perder contexto.

---

## 2. DECISIONES FORMALIZADAS EN ESTE DOCUMENTO

### D-FIN-1 — Catálogo M1 de bloques arrastrables (CRÍTICO MVP)

**Decisión:** Implementar catálogo M1 con **bloques drag & drop** que se conectan a PDA oficiales del catálogo NEM.

**Origen:** `SPEC §3.6.M1` + sesión 2026-08-15

**Especificación:**

| Aspecto | Valor |
|---------|-------|
| Cantidad objetivo | ~150 bloques curados MVP |
| Estructura por bloque | { código, nombre, descripción, pda_ids[], campos_formativos[], ejes[], recursos_requeridos[], nivel_flexibilidad (cerrado/abierto/en_blanco) } |
| Tipos de bloque | Apertura, Desarrollo, Práctica, Cierre, Evaluación, Evaluación_Semanal |
| Modalidad de origen | Cada bloque es compatible con ≥1 de las 6 modalidades NEM |
| Source-of-truth | Catálogo NEM Fase 2 (`outputs/catalogo_fase2_v2024_crudo.json`) |

**Criterio MVP:** 30-50 bloques v1 (1 modalidad: Proyecto Comunitario completo).

---

### D-FIN-2 — Rúbrica por alumno con nombres individuales (CRÍTICO MVP)

**Decisión:** Capturar nombres de alumnos y rúbrica de evaluación visual por alumno.

**Origen:** `ENT-003 D1` + proyecto "Buenas Decisiones"

**Justificación:** Resuelve pain point #1 de Tía Lola ("no recuerdo qué tema di con X niño"). 6/8 docentes de la encuesta.

**Revierte:** `SPEC §4 línea 554` ("Sin datos de alumnos en MVP. Cero").

**Implementación:**

| Entidad | Propósito |
|---------|-----------|
| `alumno { id, docente_id, nombre, grado, grupo, ciclo_escolar, activo }` | Lista de alumnos del grupo |
| `evaluacion_alumno { id, planeacion_id, alumno_id, nivel (1-4), fecha, observaciones }` | Rúbrica con niveles |

**Captura inicial:** Onboarding Paso 4 (opcional, puede saltarse).
**Edición:** Permitir agregar/eliminar durante el ciclo.

---

### D-FIN-3 — Rúbrica visual de 4 niveles semáforo

**Decisión:** Evaluación con código de color universal **🟢 🟡 🟠 🔴**.

**Origen:** `ENT-002 H1+H4` + proyecto "Buenas Decisiones"

**Niveles:**

| Color | Nivel | Descripción |
|-------|-------|-------------|
| 🟢 | Logrado sin apoyo | Alcanza PDA sin requerir mediación |
| 🟡 | Logrado con apoyo | Alcanza PDA con mediación de la maestra |
| 🟠 | Requiere apoyo constante | Necesita mediación constante para avanzar |
| 🔴 | No logrado | No alcanza PDA observado |

**Paleta:** Verde `#1F8A4C`, Amarillo `#D4A017`, Naranja `#E07B00` (nuevo, agregar a E17), Rojo `#A02B2B`.

**Por qué 4 colores:** Cubre rango pedagógico sin parálisis de decisión. Universal (no jerga).

---

### D-FIN-4 — Onboarding de 5 pantallas (captura única)

**Decisión:** Onboarding captura datos del docente **una sola vez por ciclo escolar**.

**Origen:** `ENT-003 D2`

**Flujo (5 pantallas):**

1. **Registro:** Nombre, email, contraseña, confirmar
2. **CCT:** Autocomplete desde catálogo SEP (E15) → autocompleta escuela, turno, zona
3. **Grupo:** Nivel (Preescolar), grado (1°/2°/3°), grupo (A/B/...), # alumnos aprox.
4. **Alumnos:** Lista de nombres (opcional, + CSV)
5. **Bienvenida:** 1 tip contextual + ir a mis planeaciones

**Anti-patterns evitados:**
- ❌ Tutorial 5-pasos
- ❌ Más de 1 pregunta por pantalla
- ❌ Re-capturar CCT cada planeación

---

### D-FIN-5 — PDF triple (visualizable + descargable + compartible)

**Decisión:** El PDF de planeación tiene **tres usos simultáneos**.

**Origen:** `ENT-003 D3`

**Especificación:**

| Uso | Mecanismo | Audiencia |
|-----|-----------|-----------|
| **Visualizable** | URL firmada + iframe en panel del director | Director (sin registro) |
| **Descargable** | Botón "Descargar PDF" (versión limpia, sin marca de agua) | Maestra + director |
| **Compartible** | URL firmada + QR + mensaje WhatsApp pre-armado | Maestra → director |

**Implementación:**
- URL firmada JWT, expiración configurable (default 30 días)
- Generación PDF server-side (Playwright o Puppeteer)
- Mensaje WhatsApp personalizable (F9)

---

### D-FIN-6 — Wizard adaptativo por modalidad pedagógica

**Decisión:** El wizard del Flujo A **adapta su estructura** según la modalidad pedagógica elegida.

**Origen:** `ENT-002 H5`

**Plantillas por modalidad:**

| Modalidad | Estructura | Secciones únicas |
|-----------|-----------|------------------|
| Proyecto Comunitario | 5 fases | Motivación → Diseño → Acción → Finalización → Evaluación |
| Unidad Didáctica | Sesiones numeradas | Banco de palabras + actividades recurrentes + L M M J V |
| ABJ | 3 momentos | Inicio juego → Desarrollo → Cierre/reflexión |
| Rincones | Estaciones | Lista de rincones + materiales por rincón + reglas |
| Centros de interés | Estaciones | Tema + preguntas detonadoras + estaciones |
| Taller crítico | 3 fases | Reflexión → Producción → Socialización |

**MVP:** 1 sola modalidad (Proyecto Comunitario). Otras en iteración.

---

### D-FIN-7 — Banco de palabras (Unidad Didáctica)

**Decisión:** Las unidades didácticas tienen un **banco de palabras** explícito de 2-5 términos vinculados a contenidos.

**Origen:** `ENT-002 H2` + proyecto "EMOCIONES"

**Implementación:**
- Campo `banco_palabras: [string]` en planeación
- Sugerencias automáticas del sistema según contenidos seleccionados
- Maestra puede editar/agregar

**MVP:** Diferido (solo si MVP soporta Unidad además de Proyecto).

---

### D-FIN-8 — Actividades recurrentes paralelas

**Decisión:** La maestra puede definir **actividades paralelas recurrentes** (ej. "escribir fecha cada lunes") con calendario semanal propio.

**Origen:** `ENT-002 H3` + proyecto "EMOCIONES"

**Implementación:**
- Sub-sección en Flujo A con su propio calendario L M M J V
- Aparece como capa adicional sobre secuencia principal

**MVP:** Diferido.

---

### D-FIN-9 — Ajustes documentados por sesión

**Decisión:** Cada sesión tiene campo opcional `ajustes_sesion` (texto libre, 200 chars) para documentar plan B.

**Origen:** `ENT-002 H6` + proyecto "EMOCIONES"

**MVP:** Incluido (costo bajo, valor alto).

---

### D-FIN-10 — Estrategia híbrida de PDFs CONALITEG

**Decisión:** Implementar visualización de PDFs CONALITEG con estrategia **online (iframe) + offline (PDF.js cacheado)**.

**Origen:** Sesión 2026-08-16 + 19 refs con URLs específicas actualizadas

**Especificación:**

| Estado de red | Mecanismo |
|---------------|-----------|
| Online | iframe directo al portal CONALITEG (`K{grado}{código}.htm`) |
| Offline | PDF.js con PDF cacheado localmente |

**Almacenamiento:**
- IndexedDB para PDFs cacheados
- Solo libros del grado actual (no 19 libros × 50 MB = 950 MB total)
- Sync cuando hay red

**Atribución obligatoria:**
- "Libro distribuido por CONALITEG, SEP. © Gobierno de México"
- Link visible al portal oficial

**URLs específicas validadas (19 refs):**

| Libro | URL pattern |
|-------|-------------|
| Mi Álbum 1°/2°/3° | `https://libros.conaliteg.gob.mx/2024/K{1,2,3}MAA.htm` |
| Múltiples Lenguajes 1°/2°/3° | `https://libros.conaliteg.gob.mx/2024/K{1,2,3}MLL.htm` |
| Láminas de diálogo 1°/2°/3° | `https://libros.conaliteg.gob.mx/2024/K{1,2,3}LMC.htm` |
| Material manipulable 1°/2°/3° | `https://libros.conaliteg.gob.mx/2024/K{1,2,3}JMM.htm` |
| Explorar e imaginar 1°/2°/3° | `https://libros.conaliteg.gob.mx/2024/K{1,2,3}ELI.htm` |
| Crianza para la libertad | `https://libros.conaliteg.gob.mx/2024/KCLF.htm` |
| Un libro sin recetas | `https://libros.conaliteg.gob.mx/2024/KLRS.htm` |
| Modalidades de trabajo | `https://libros.conaliteg.gob.mx/2024/KMTR.htm` |
| Posibilidades de trabajo | `https://libros.conaliteg.gob.mx/2024/KPTR.htm` |

**Formato:** PDF descargable + HTML viewer embebido.

**Compliance:** Distribución gratuita oficial, atribución a CONALITEG/SEP obligatoria.

---

## 3. DECISIONES DIFERIDAS (NO en MVP)

Las siguientes fueron discutidas pero **explícitamente diferidas** a Fase 2 o posterior:

| ID | Concepto | Aplazado a | Justificación |
|----|----------|-----------|---------------|
| D-DIF-1 | Features IA F6-F10 (objetivo/propósito, ajustes razonables, cobertura, WhatsApp, bitácora) | Fase 2 | MVP arranca con F1, F2, F3 |
| D-DIF-2 | Consentimiento padres formal | Fase 2 | Diferido post-MVP |
| D-DIF-3 | Multi-grupo avanzado (sincronización) | Fase 2 | MVP solo soporta 2-3 grupos simples |
| D-DIF-4 | Variantes plurilingües L1 indígena | Fase 2 | MVP arranca con 2 variantes (urbana + rural genérica) |
| D-DIF-5 | Marketplace de bloques | Fase 3 | Diferido por completo |
| D-DIF-6 | Pricing / modelo de negocio | Post-piloto | Validar con Tía Lola primero |
| D-DIF-7 | Backup automático Supabase | Fase 2 | Diferido — exportar JSON manual en MVP |

---

## 4. DECISIONES DE STACK TÉCNICO (D-FIN-11 a D-FIN-14)

### D-FIN-11 — Frontend: Next.js + Vercel

**Decisión:** Aplicación web con Next.js 14+ (App Router), TypeScript, React 18+.

**Origen:** Sesión 2026-08-16 con Frank

**Especificación:**
- Framework: Next.js con App Router
- Lenguaje: TypeScript strict
- Estilos: Tailwind CSS + shadcn/ui (componentes accesibles)
- Deploy: Vercel (preview deployments por PR)
- Hosting: edge functions donde aplique

---

### D-FIN-12 — BD/Auth/Storage: Supabase con RLS por CCT

**Decisión:** Supabase como servicio único de BD + Auth + Storage + Realtime.

**Origen:** Sesión 2026-08-16 con Frank (confirmado Supabase vs Railway)

**Especificación:**
- PostgreSQL gestionado
- Auth: Email + password + magic link
- Storage: PDFs CONALITEG cacheados
- Realtime: suscripción a planeaciones del director
- **RLS nativa por CCT** (políticas SQL en cada tabla)
- Multi-tenant: 1 CCT = 1 escuela = N docentes
- Sin GPS, sin tracking de ubicación

**Por qué Supabase (no Railway):** RLS nativo, menos servicios, menos superficie operacional. Trade-off: lock-in parcial, pero datos salen como SQL estándar.

---

### D-FIN-13 — IA: MiniMax M3 vía conector OpenAI-compatible

**Decisión:** Usar MiniMax M3 como proveedor **a través de un conector compatible con OpenAI API**, para permitir cambio de proveedor en el futuro sin reescribir código.

**Origen:** Sesión 2026-08-16 con Frank (preferencia por flexibilidad)

**Especificación:**
- Capa de abstracción: OpenAI-compatible connector
- Default: MiniMax M3 (`api.minimax.chat/v1` o equivalente)
- Fallback configurable: cualquier proveedor OpenAI-compatible (OpenAI, Anthropic, Together, etc.)
- Variables de entorno:
  ```
  AI_PROVIDER=minimax  # minimax | openai | anthropic | together
  AI_API_KEY=...
  AI_MODEL=minimax-m3
  AI_BASE_URL=https://api.minimax.chat/v1
  ```
- Sin hardcodear URLs ni modelos en código
- Degradación graceful si IA no disponible

---

### D-FIN-14 — Drag & drop + PWA offline-first

**Decisión:** Componentes con `@dnd-kit` (biblioteca accesible) + PWA con service worker.

**Origen:** Sesión 2026-08-16

**Especificación:**
- `@dnd-kit/core` + `@dnd-kit/sortable` (no usar `react-dnd` legacy)
- Accesibilidad WCAG 2.1 nivel AA
- PWA con `vite-plugin-pwa` (o equivalente Next.js)
- Service Worker para cache de assets críticos
- IndexedDB para datos locales del docente
- Sincronización cuando haya red (Supabase Realtime o polling)

---

## 5. DECISIONES DE COMPLIANCE + UX (D-FIN-15 a D-FIN-19)

### D-FIN-15 — Aviso de privacidad LFPDPPP en primer login

**Decisión:** Mostrar aviso de privacidad completo en el primer login del docente, con checkbox obligatorio de aceptación.

**Origen:** Sesión 2026-08-16 con Frank

**Especificación:**
- Modal full-screen en primer login
- Texto: aviso de privacidad completo (LFPDPPP art. 27)
- Checkbox: "Confirmo que tengo consentimiento institucional para registrar datos de los alumnos a mi cargo"
- Persistir aceptación con timestamp en `aceptacion_aviso_privacidad`
- Si rechaza: la app no permite capturar nombres de alumnos
- Aceptación obligatoria ANTES de capturar nombres

**Implementación:** Tabla nueva `aceptacion_aviso_privacidad { docente_id, fecha_aceptacion, version_aviso, ip (opcional), user_agent }`.

---

### D-FIN-16 — Multi-grupo soportado en MVP

**Decisión:** Tía Lola puede tener hasta 3 grupos en la misma escuela.

**Origen:** Sesión 2026-08-16 con Frank (decisión de incluir en MVP)

**Especificación:**
- Modelo: `grupo { id, docente_id, ciclo_escolar, grado, grupo, total_alumnos, activo }`
- Cada planeación pertenece a 1 grupo
- Cada alumno pertenece a 1 grupo
- Tía Lola selecciona grupo activo al crear planeación
- Selector visible siempre para cambiar de grupo

**Diferido a Fase 2:** multi-grupo avanzado (>3 grupos, sincronización, compartir alumnos entre grupos).

---

### D-FIN-17 — Botón "Duplicar/Clonar" planeación

**Decisión:** Tía Lola puede clonar una planeación ya creada para adaptarla a otro grupo o repetir el ciclo siguiente.

**Origen:** Sesión 2026-08-16 con Frank

**Especificación:**
- Acción disponible en planeación existente
- Crea copia con:
  - Mismo nombre + "(copia)"
  - Misma estructura (sesiones, bloques, recursos)
  - Alumnos vacíos (se re-asignan al grupo destino)
  - Evaluaciones vacías
  - Fecha de creación nueva
- Modal: "¿Clonar para qué grupo?" → selector de grupos del docente

---

### D-FIN-18 — Backup automático

**Decisión:** Diferido a Fase 2.

**Origen:** Sesión 2026-08-16 con Frank

**MVP:** Tía Lola puede exportar JSON completo de sus planeaciones manualmente (botón "Exportar mis datos").

---

### D-FIN-19 — Notificación al director vía WhatsApp

**Decisión:** Cuando Tía Lola entrega una planeación, se abre WhatsApp con mensaje pre-armado al director.

**Origen:** Sesión 2026-08-16 con Frank (confirmado)

**Especificación:**
- Botón "Entregar al director" en vista de planeación
- Modal: captura celular del director (si no existe en BD)
- Genera URL firmada (D-FIN-5)
- Abre WhatsApp Web/App con mensaje pre-armado:
  ```
  Hola director(a). Tía Lola le comparte la planeación de esta semana:
  "[Nombre]" ([Grupo], [Fechas]). Link: [URL]
  Si necesita algo, me dice.
  ```
- Personalización opcional (F9)
- Director recibe y abre el link sin registro

**Diferido:** email + push notification (Fase 2).

---

---

## 4. CAMBIOS REQUERIDOS AL SPEC PRINCIPAL

Para que el SPEC refleje este documento, se requieren los siguientes cambios:

| § | Cambio | Tipo |
|---|--------|------|
| §3.6.M1 | Reforzar con detalle M1 (D-FIN-1) | Texto |
| §3.6.M3 | Confirmar 4 niveles semáforo (D-FIN-3) + agregar naranja `#E07B00` a paleta E17 | Texto + color |
| §3.6.M5 | PDF triple formalizado (D-FIN-5) | Refuerzo |
| §3.6.M? (nuevo) | Onboarding 5 pantallas (D-FIN-4) | Sección nueva |
| §3.6.M? (nuevo) | Wizard adaptativo por modalidad (D-FIN-6) | Sección nueva |
| §3.6.M? (nuevo) | Estrategia PDFs CONALITEG (D-FIN-10) | Sección nueva |
| §4 línea 554 | **REVERTIR** "Sin datos de alumnos en MVP. Cero" | Cambio crítico |
| §4 entidades | Agregar `Alumno` y `EvaluacionAlumno` (D-FIN-2) | Nuevas entidades |
| §6 stack | **Consolidar Next.js + Supabase + Vercel + @dnd-kit + PWA** (D-FIN-11/12/14) | Refuerzo |
| §6 miniMax | **Migrar a conector OpenAI-compatible** (D-FIN-13) | Cambio crítico |
| §6.2 multi-tenant | Confirmar RLS por CCT (D-FIN-12) | Refuerzo |
| §NUEVO | Aviso de privacidad en primer login (D-FIN-15) | Sección nueva |
| §NUEVO | Multi-grupo soportado MVP (D-FIN-16) | Sección nueva |
| §NUEVO | Botón Duplicar/Clonar (D-FIN-17) | Sección nueva |
| §NUEVO | Notificación WhatsApp al director (D-FIN-19) | Sección nueva |
| §10 riesgos | Agregar: "Compliance LFPDPPP — fase legal post-MVP" | Nuevo riesgo |

**Estimado:** ~3-4h redacción e integración al SPEC.

---

## 5. CRITERIOS DE CIERRE MVP

Cuando estos 11 puntos (D-FIN-1 a D-FIN-10 + actualización SPEC) estén implementados:

- [ ] Catálogo M1 con 30-50 bloques MVP funcionales
- [ ] Rúbrica visual con 4 niveles semáforo
- [ ] Onboarding 5 pantallas probado con Tía Lola
- [ ] PDF triple funcional (visualizable + descargable + compartible)
- [ ] Wizard con 1 modalidad (Proyecto Comunitario) completa
- [ ] Catálogo NEM Fase 2 cargado en Supabase (24 PDA + 4 contenidos + 7 ejes + 4 campos + 19 refs)
- [ ] Inventario del aula con 6 categorías pedagógicas (E21)
- [ ] PDFs CONALITEG visualizables (online + offline)
- [ ] Atribución CONALITEG/SEP visible
- [ ] Datos de alumnos capturables (con aviso de privacidad en onboarding)
- [ ] Multi-grupo soportado (2-3 grupos por docente)
- [ ] Botón Duplicar/Clonar funcional
- [ ] Notificación WhatsApp al director funcional
- [ ] Auditoría final GEMINI antes de producción

**MVP funcional = Tía Lola puede planear una unidad completa end-to-end.**

---

## 6. RELACIÓN CON OTROS DOCUMENTOS

| Documento | Cómo se relaciona |
|-----------|-------------------|
| `SPEC_MVP_01_Modulo_Docente.md` | Este E22 es **anexo** que el SPEC debe integrar |
| `E20` P-PD1 a P-PD9 | Principios que estas decisiones respetan |
| `E21` Catálogo recursos aula | Complementa D-FIN-1 (M1 bloques) con recursos del aula |
| `ENT-002` Hallazgos proyectos reales | Origen de D-FIN-2, 3, 6, 7, 8, 9 |
| `ENT-003` Decisiones MVP | Origen de D-FIN-4, 5 |
| `outputs/catalogo_fase2_v2024_crudo.json` | Source-of-truth para D-FIN-1, 10 |

---

## 7. PRÓXIMOS PASOS

1. ✅ Documento E22 creado
2. ⏳ Frank valida que las 10 decisiones reflejen su intención
3. ⏳ Integrar cambios al SPEC principal (~3-4h)
4. ⏳ Implementar MVP con SOFIA (~30h)
5. ⏳ Auditoría final GEMINI antes de producción
6. ⏳ Piloto con Tía Lola

---

**Fin del documento E22.**