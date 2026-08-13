# E17 — UX como Diferenciador (Documento de Diseño UX)

**Versión:** 0.1
**Fecha:** 2026-08-13
**Estado:** ESPECIFICACIÓN TRANSVERSAL (módulo de diseño UX, referencia para INTEGRA + SOFIA)
**Origen:** Decisión del fundador (v0.13): "UX debe ser superior a Kumu, debe ser muy simple y funcional".
**Alineado a:** `SPEC_MVP_01_Modulo_Docente.md` v0.13 §6.3 (resumen); este documento expande.

---

## 1. PROPÓSITO

Establecer las reglas de UX del producto de manera que:
1. INTEGRA las pueda implementar en el SpecT (paleta, tipografía, layout).
2. SOFIA las pueda codificar sin reinterpretación.
3. El equipo de validación las pueda medir (T-UX1 a T-UX6).
4. Cualquier feature nueva se evalúe contra estos principios antes de construirse.

---

## 2. LOS 10 PRINCIPIOS INEGOCIABLES

(Resumen; implementación detallada en SPEC §6.3.)

| # | Principio | Resumen ejecutivo |
|---|---|---|
| **P-UX1** | Una pregunta por pantalla | Cero formularios de 5+ campos visibles al tiempo |
| **P-UX2** | Pull, no push | Cero banners rojos de tareas pendientes |
| **P-UX3** | Texto claro antes que iconos | Botones con texto, no iconos opacos |
| **P-UX4** | Mobile first honest | 360×640px usable al 100%, no versión reducida |
| **P-UX5** | < 1.5s p75 de carga | Latencia Core Web Vitals Vercel Analytics |
| **P-UX6** | Recuperación fácil de errores | Undo siempre visible las primeras 2 semanas |
| **P-UX7** | Estados vacíos con llamada a la acción | "Crea tu primer proyecto en 15 min", no "no tienes proyectos" |
| **P-UX8** | Lenguaje del mundo real | Sin jerga pedagógica en UI |
| **P-UX9** | Cero entrenamiento requerido | Sin tutorial 5-pasos, máximo 1 hint contextual |
| **P-UX10** | Accesibilidad WCAG 2.1 AA | Contraste, teclado, lector de pantalla, tamaños |

---

## 3. DECISIONES CONCRETAS

### 3.1. Tipografía

| Decisión | Valor | Razón |
|---|---|---|
| Fuente | **Sans-serif del sistema** | Velocidad > marca |
| Stack CSS | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Soporte universal |
| Font-size base | **16px** en body | WCAG + comodidad maestra cansada |
| Font-size mínimo | 14px en UI secundaria | No menor |
| Line-height | 1.5 en body, 1.2 en headings | Legibilidad |
| Font-weight | Regular 400, Medium 500, Bold 700 solo en CTAs | Sin confusión tipográfica |

### 3.2. Paleta (4 colores funcionales + neutro)

| Color | Hex | Uso | NO se usa para |
|---|---|---|---|
| Verde primario | `#1F8A4C` | Acción primaria, "guardado", "OK", "entregado" | Listas decorativas |
| Amarillo | `#D4A017` | Atención moderada | Tareas pendientes |
| Rojo | `#A02B2B` | Error real, datos críticos faltantes | Castigo, "racha rota", notificaciones |
| Gris secundario | `#5C6770` | Texto secundario, placeholders | Acciones primarias |
| Fondo | `#FAFAF8` casi blanco | Fondo general | — |
| Texto principal | `#1A1A1A` casi negro | Texto | — |

**Tono visual:** paleta sobria, "herramienta seria". Sin gradientes, sin colores neon, sin "infantilismo pedagógico".

### 3.3. Iconografía

| Decisión | Valor |
|---|---|
| Sistema | **Lucide** (open-source, sin royalties, ~1500 iconos) |
| Tamaño sidebar | 20px |
| Tamaño headers | 24px |
| Tamaño inline | 16px |
| Stroke | 2px (consistente) |
| **Sin emoji en UI de producto** | Solo en mensajes pre-armados de WhatsApp (son personales) |
| Botones con icono | SIEMPRE con texto adyacente (P-UX3) |

### 3.4. Idioma

- **Español neutro (México).** Sin regionalismos de un solo estado.
- **Tono respetuoso pero directo.** Sin diminutivos condescendientes ("te ayudamos a hacer tu planeación" es condescendiente; "Crea tu planeación" es directo).
- **Evitar jerga pedagógica en UI.** "PDA" aparece en la app solo cuando la maestra lo necesita ver; si no, escondido en la metadata.
- **Evitar anglicismos innecesarios.** "Tu calendario" en vez de "tu schedule".

### 3.5. Densidad y ritmo

| Métrica | Valor |
|---|---|
| Padding base | 16px |
| Padding generoso | 24px |
| Padding en formularios | 16px entre campos |
| Margen entre secciones | 32px |
| Border radius | 6px en inputs, 12px en cards (suave, no agresivo) |
| Ancho máximo de párrafo | 72ch (~660px en 16px) |

### 3.6. Estados (no solo "vacío")

Cada vista debe estar diseñada para estos estados (P-UX7):

| Estado | Cómo se ve |
|---|---|
| Vacío | Imagen + texto específico + CTA principal |
| Cargando | Skeleton (no spinner) |
| Con datos | Datos |
| Error | Banner contextual arriba, no modal |
| Confirmación | Toast 3s en esquina inferior derecha |

---

## 4. PATRONES ESPECÍFICOS POR MÓDULO

### 4.1. Calendario (M3)

- Código de colores accesibles (4 estados) que NO compitan visualmente entre sí.
- Día "HOY" con borde distintivo, no color de fondo.
- Click en día vacío → modal contextual con banco CCT-zona (M2).
- Drag con dedo: alternativa con tap-and-hold + lista de destinos (P-UX4).
- Botón "Planificar mes completo": wizard de 4 pasos, no de 1 paso mágico.
- Undo de últimas 5 acciones de drag, persistent.

### 4.2. Bloques componibles (M1)

- Modal lateral (sheet) al abrir detalle de bloque, no modal central.
- Vista: bloque en preview con contenido editable inline.
- Drag handle explícito (icono⠿), no cualquier parte del bloque.
- Indicador visual de "nivel de flexibilidad" (🔒/🔓/✏️) discreto pero claro.
- Eliminar bloque: undo automático, no confirmación modal.

### 4.3. Entrega M5 (URL firmada)

- Pantalla del director SIN registrarse:
  - PDF en embed iframe (no descargar).
  - Botón "Marcar como recibida" sticky en bottom.
  - Caja de comentario expandible, no visible siempre.
  - CTA "Registrarme" en costado, no modal agresivo.
- Mensaje WhatsApp editable con preview live.

### 4.4. Configuración M4 (características)

- Reutilizar patrón de encuesta (cards visuales, no formularios largos).
- Resumen permanente en sidebar "Tu escuela en sus propias palabras" para ver la configuración.
- Edición inline, no ir a página aparte.

---

## 5. ACCESIBILIDAD (P-UX10)

| Verificación | Cómo se hace |
|---|---|
| Contraste | axe-core en CI; mínimo 4.5:1 para texto normal, 3:1 para texto grande. |
| Navegación por teclado | Tabs, Enter, Space, Escape, flechas. Tabla de shortcuts visible. |
| Lector de pantalla | aria-labels consistentes. Roles semánticos. |
| Tamaños escalables | body font 100% permite escalado del navegador. |
| Color no como único indicador | Iconos + texto + color para transmitir estado. |
| Foco visible | Outline claro, no solo :hover. |

---

## 6. ANTI-FEATURES UX (lo que NO hacemos)

❌ **Sin gamificación.** Sin badges, sin puntos, sin "niveles".
❌ **Sin streaks/rachas.** No se penaliza uso inconsistente.
❌ **Sin emojis en UI.** Solo en WhatsApp pre-armado.
❌ **Sin animaciones decorativas.** Funcionales sí, decorativas no.
❌ **Sin onboarding largo.** Sin tutorial 5 pasos. Máximo 1 hint contextual primero.
❌ **Sin tono condescendiente.** Sin "te ayudamos a...". Directo: "Crea X".
❌ **Sin inflar con features no pedidas.** Cada feature se justifica con dolor validado.

---

## 7. TESTS DE VALIDACIÓN PRE-RELEASE

| Test | Cuándo | Quién | Criterio de éxito |
|---|---|---|---|
| **T-UX1** Cold-start 5 min | Cada release candidate | 5 maestras reales nuevas | Cada una arma 1 proyecto + 1 sesión calendarizada + 1 bitácora en < 20 min sin ayuda |
| **T-UX2** Mobile-first honesto | Cada release candidate | Tester | 360×640px: todas las pantallas usables |
| **T-UX3** Comparativa mercado | Pre-lanzamiento | 5 maestras | 4 de 5 prefieren nuestro UX vs. Kumu |
| **T-UX4** Accesibilidad | Cada release | Automático (axe-core CI) | 0 issues serious/critical en flujos |
| **T-UX5** Performance | Cada release | Vercel Analytics | p75 LCP < 1.5s, p95 < 3s en 4G |
| **T-UX6** Lenguaje | Cada release | 2 maestras leen textos UI | "Esto suena a algo que yo diría, no a libro de texto" |

---

## 8. PROCESO DE DECISIÓN UX

Cuando se proponga una feature nueva:
1. ¿Resuelve dolor validado por maestra real? Si NO → no se hace.
2. ¿Cumple los 10 principios P-UX? Si NO → se rediseña o no se hace.
3. ¿Cómo se ve en mobile-first honesto? Si requiere pantalla completa en laptop solamente → se reconsidera.
4. ¿Texto de la UI pasa T-UX6? Si suena a libro de texto → se reescribe.

---

## 9. ENTREGABLES UX

| # | Entregable | Quién | Cuándo |
|---|---|---|---|
| Wireframes flujo A (crear proyecto) | Founder / designer | Pre-INTEGRA |
| Wireframes flujo B (calendario) | Founder / designer | Pre-INTEGRA |
| Wireframes flujo C (bitácora) | Founder / designer | Pre-INTEGRA |
| Wireframes M5 director pre-registro | Founder / designer | Pre-INTEGRA |
| Sistema de diseño en código (Tailwind config + componentes base) | INTEGRA + SOFIA | Post-INTEGRA |
| Auditoría accesibilidad primer release | SOFIA + tester | Pre-T-UX4 |
| T-UX1 con maestras reales | Founder | Pre-lanzamiento |

---

## 10. RELACIÓN CON OTROS ENTREGABLES

- **SPEC §6.3:** resumen de este documento.
- **INTEGRA_SPEC_TECNICO.md:** debe referenciar paleta, tipografía, accesibilidad.
- **SPEC §7:** T-UX1 y T-UX2 son criterios de cierre.

---

**Fin de E17.**
