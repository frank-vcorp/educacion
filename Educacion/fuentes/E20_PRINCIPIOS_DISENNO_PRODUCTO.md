# E20 — Principios de Diseño de Producto (derivados de sesión con founder)

**Versión:** 0.2
**Fecha:** 2026-08-16
**Estado:** ESPECIFICACIÓN TRANSVERSAL (referencia para INTEGRA + SOFIA)
**Origen:** Sesión de trabajo 2026-08-15/16 con Frank sobre walkthrough de Tía Lola
**Alineado a:** `SPEC_MVP_01_Modulo_Docente.md` §1-§6 + E17 UX como Diferenciador
**Cambios v0.2:** Agregado P-PD9 (regla dura IA solo sugiere, maestra decide).

---

## 1. PROPÓSITO

Documentar **principios de diseño de producto** derivados del walkthrough paso a paso de la planeación "Manifiesta tus emociones" con Tía Lola. Estos principios complementan los 10 principios UX (P-UX1 a P-UX10) de E17, pero se enfocan en **decisiones de producto/funcionalidad**, no de UI.

**Para INTEGRA:** al evaluar nuevas features o cambios al SPEC, verificar cumplimiento contra estos principios.

**Para SOFIA:** al implementar, respetar el balance esfuerzo/escritura definido.

---

## 2. LOS 8 PRINCIPIOS DE DISEÑO DE PRODUCTO

### P-PD1 — **85/15: Selección sobre escritura**

**Declaración:** El 85% del trabajo de la maestra debe ser **seleccionar, arrastrar o marcar**. El 15% debe ser **escribir texto libre**.

**Origen:** Walkthrough Tía Lola (22 pasos analizados).

**Implicaciones:**
- Todo campo con valores finitos debe venir **autocompletado o sugerido** desde un catálogo.
- Solo se escribe cuando el dato es **único del contexto** (problema del contexto, contenido específico de un bloque, observaciones de un alumno).
- **NO** se piden campos abiertos cuando hay una opción enumerable.
- **NO** se pide escribir algo que ya existe en otro lado del sistema.

**Validación antes de productivizar:**
- En un flujo nuevo, contar campos escribibles vs seleccionables. Si <80% seleccionable, rediseñar.

**Anti-patterns prohibidos:**
- ❌ "Escribe los nombres de los campos formativos" (debería ser checkbox)
- ❌ "Captura el CCT manualmente" (debería ser autocomplete)
- ❌ "Redacta el problema del contexto en 3 párrafos" (debería ser textarea corto con sugerencias)

---

### P-PD2 — **Catálogo curado como fuente de verdad**

**Declaración:** Todo elemento curricular (campo formativo, contenido, PDA, eje, bloque) viene del **catálogo NEM oficial**. La maestra no inventa la estructura pedagógica.

**Origen:** Diferenciador vs Kumu. E14 diseño de catalogación.

**Implicaciones:**
- PDA: nunca inventados por IA ni por la maestra. Atados al DOF.
- Bloques: estructura + PDA fijos, contenido editable.
- Ejes articuladores: solo los 7 oficiales.
- Si la maestra necesita algo nuevo, lo crea como **bloque personalizado en su banco personal** (no se mezcla con catálogo general).

**Validación:**
- En código, verificar que ningún PDA no listado en catálogo pueda ser guardado.
- Revisión mensual: cambios en DOF actualizan catálogo (E10/E11).

---

### P-PD3 — **Datos del mundo vienen del mundo**

**Declaración:** Todo dato "del mundo" (CCT, escuelas, planes, libros) **nunca** lo captura la maestra manualmente. Viene de catálogos oficiales precargados.

**Origen:** Sesión con Frank, sección "datos que se repiten".

**Implicaciones:**
- CCT → Catálogo Nacional SEP 2024 (E15)
- Escuela → autocompletada al elegir CCT
- Nivel/turno → autocompletados
- Director → autocompletado si existe en CCT
- PDA/contenidos/ejes → catálogo E14
- Libros CONALITEG → solo referencias URL

**Anti-patterns prohibidos:**
- ❌ Pedir CCT manualmente sin autocomplete
- ❌ Pedir nombre de escuela sin haber autocompletado por CCT
- ❌ Pedir contenidos que están en el DOF sin mostrar opciones precargadas

---

### P-PD4 — **Datos del docente se capturan una vez**

**Declaración:** Los datos personales del docente (nombre, email, escuela, grupo) se piden **una vez por ciclo escolar**, no cada planeación.

**Origen:** Onboarding definido en ENT-003.

**Implicaciones:**
- Onboarding captura nombre + CCT + grado/grupo + lista alumnos (opcional).
- Cada nueva planeación hereda automáticamente estos datos.
- Solo se vuelve a preguntar al cambiar de ciclo (julio-agosto).
- La lista de alumnos se edita durante el ciclo, no se recrea.

**Excepción:** maestra con varios grupos puede cambiar entre ellos (selector), pero no re-capturar.

---

### P-PD5 — **Wizard adaptativo por modalidad**

**Declaración:** El wizard del Flujo A **cambia su estructura** según la modalidad pedagógica elegida (Unidad Didáctica, Proyecto, ABJ, Rincones, Centros, Taller).

**Origen:** H5 de ENT-002 (análisis proyectos reales Buenas Decisiones vs Emociones).

**Implicaciones:**
- **Unidad Didáctica:** banco de palabras + sesiones numeradas + actividades recurrentes
- **Proyecto Comunitario:** 5 fases (Motivación → Diseño → Acción → Finalización → Evaluación) + producto
- **ABJ:** tipo de juego + reglas + extensión
- **Rincones:** lista de rincones + materiales por rincón
- **Centros de interés:** tema + preguntas detonadoras + estaciones
- **Taller crítico:** tema + reflexión + producción + socialización

**Validación:**
- El mismo campo (ej. "calendario") cambia de formato según modalidad.
- Las secciones que no aplican se ocultan.

---

### P-PD6 — **Rúbrica visual con 4 niveles semáforo**

**Declaración:** La evaluación formativa usa **4 niveles visuales** con código de color semántico universal: 🟢 🟡 🟠 🔴.

**Origen:** H1+H4 de ENT-002 (proyecto Buenas Decisiones).

**Implicaciones:**
- 🟢 Logrado sin apoyo
- 🟡 Logrado con apoyo
- 🟠 Requiere apoyo constante
- 🔴 No logrado
- Cada nivel lleva descripción vinculada al PDA trabajado.
- La maestra arrastra al alumno al nivel (drag & drop).

**Por qué 4 y no 5:** 4 colores cubren el rango pedagógico sin parálisis de decisión. 5+ es difícil de distinguir consistentemente. 3 es insuficiente para la práctica docente real.

**Color naranja faltante:** agregar `#E07B00` a paleta de E17 §3.2.

---

### P-PD7 — **PDF triple: visualizable + descargable + compartible**

**Declaración:** El PDF de la planeación tiene **tres usos simultáneos**, no uno.

**Origen:** D3 de ENT-003.

**Implicaciones:**

| Uso | Mecanismo | Audiencia |
|-----|-----------|-----------|
| Visualizable | URL firmada + iframe en panel del director | Director (sin registro) |
| Descargable | Botón "Descargar PDF" (versión limpia, sin marca de agua) | Maestra + director |
| Compartible | URL firmada + QR + mensaje WhatsApp pre-armado | Maestra → director |

**Validación:**
- Misma URL firmada sirve para los tres usos.
- Expiración configurable (default 30 días).
- Sin marca de agua en versión descargable oficial.

---

### P-PD8 — **MiniMax como adaptador, no como inventor**

**Declaración:** Cuando se usa IA (MiniMax), su rol es **adaptar texto del catálogo curado al contexto**, nunca inventar estructura pedagógica.

**Origen:** §3.7 del SPEC principal.

**Implicaciones:**
- F1: genera variantes locales del contenido sugerido, NO propone PDA/campos/ejes nuevos.
- F2: expande/simplifica lo que la maestra empezó, NO reescribe desde cero.
- F3: pule estilísticamente, NO cambia contenido pedagógico.
- F4: diferido a Fase 2.

**Regla dura:** PDA, campos formativos y ejes SIEMPRE del catálogo. La IA solo modifica texto libre validado.

---

### P-PD9 — **Regla dura: la IA solo sugiere, la maestra decide**

**Declaración:** La IA **NUNCA escribe directamente en un campo**. La IA siempre **sugiere** y la maestra decide si usar la sugerencia o no. La sugerencia se muestra de manera explícita y el campo siempre es editable.

**Origen:** Confirmación explícita del founder en sesión 2026-08-16.

**Por qué es regla dura:**
- La maestra es la autora. La IA es asistente.
- Mantener la autonomía pedagógica de la docente.
- Cumplir con la postura de la NEM: maestro al centro, no reemplazado por IA.
- Generar audit trail: siempre queda claro qué fue sugerido vs qué fue escrito.

**Manifestaciones concretas en el flujo:**

| Comportamiento esperado | Comportamiento prohibido |
|--------------------------|---------------------------|
| Mostrar "💡 Sugerencia" con texto alternativo | Autocompletar el campo sin que la maestra vea la sugerencia |
| La maestra hace clic para usar UNA sugerencia | Llenar el campo con la primera sugerencia disponible |
| El campo siempre es editable, sobrescribible | Dejar el campo bloqueado con la sugerencia |
| La maestra puede descartar todas las sugerencias | Forzar a usar al menos una sugerencia |
| Indicar visualmente si el campo fue sugerido o escrito | No mostrar provenance del texto |

**Patrón de UI estándar para TODA sugerencia de IA:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Campo de texto editable: ____________]                    │
│                                                             │
│ 💡 Sugerencias de IA (clic para usar):                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▸ [Sugerencia 1]                                       │ │
│ │ ▸ [Sugerencia 2]                                       │ │
│ │ ▸ [Sugerencia 3]                                       │ │
│ │ ▸ [Otra sugerencia...]                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                             │
│ [✓ Usar esta] [✏️ Editar] [Ignorar]                        │
└─────────────────────────────────────────────────────────────┘
```

**Audit trail (metadata):**

Cada campo de texto lleva metadata de provenance:
- `origen: 'maestra'` — escrito por la maestra desde cero
- `origen: 'ia_sugerencia'` — aceptado de sugerencia IA
- `origen: 'maestra_editado_de_ia'` — empezó con sugerencia IA, maestra editó
- `origen: 'kit_template'` — del kit preescolar genérico

Esto permite en el futuro:
- Medir adopción real de sugerencias IA.
- Detectar cuando la IA sugiere mal y se ignora.
- Mejorar el prompt con datos reales de uso.

**Aplicación a TODAS las features IA (F1, F2, F3, F-IA1, F6, F7, F8, F9, F10):**

| Feature | ¿Cumple P-PD9? |
|---------|----------------|
| F1 (variantes bloques) | ✅ Muestra variantes, maestra selecciona una |
| F2 (help-in-line) | ✅ Maestra hace clic en "expandir" / "simplificar" |
| F3 (pulido PDF) | ✅ Solo aplica si maestra acepta "Pulir antes de exportar" |
| F-IA1 (auto-sugerido de uso) | ✅ Chips clicables, maestra selecciona o sobrescribe |
| F6 (objetivo/propósito) | ✅ Sugerencias como chips, no autocompletar |
| F7 (ajustes razonables) | ✅ Plantillas como chips, maestra selecciona |
| F8 (cobertura curricular) | ✅ Muestra "no trabajado", maestra decide si trabajar |
| F9 (mensaje WhatsApp) | ✅ Versión personalizada vs original, maestra elige |
| F10 (análisis bitácora) | ✅ Detecta patrones, maestra decide si aplicar |

**Anti-patterns prohibidos:**

- ❌ **Autocompletar** un campo con IA sin mostrar la sugerencia.
- ❌ **Mantener visible** una sugerencia después de que la maestra la descartó.
- ❌ **Cambiar** un valor que la maestra escribió (solo expandir/adaptar si ella lo pide).
- ❌ **Sobreescribir** un campo vacío con IA automáticamente.
- ❌ **Ocultar** que un texto viene de IA (transparencia obligatoria).
- ❌ **Forzar** revisar/aceptar sugerencia antes de avanzar.
- ❌ **Mostrar siempre** sugerencias (debe haber un disparador explícito).

**Relación con P-PD8:** P-PD8 controla QUÉ puede hacer la IA (no inventar estructura). P-PD9 controla CÓMO la IA interactúa con la maestra (siempre sugiere, no escribe directamente).

---

## 3. CHECKLIST PARA NUEVAS FEATURES

Antes de aprobar cualquier feature nueva en el SPEC, validar contra estos 9 principios:

| # | Pregunta de validación | Si NO, acción |
|---|------------------------|---------------|
| P-PD1 | ¿Esta feature mantiene el balance 85/15? | Reducir campos escribibles |
| P-PD2 | ¿Los datos pedagógicos vienen del catálogo? | Agregar al catálogo, no inventar |
| P-PD3 | ¿Los datos del mundo vienen precargados? | Agregar fuente externa, no pedir captura |
| P-PD4 | ¿Se evita re-capturar datos del docente? | Reusar del perfil |
| P-PD5 | ¿El wizard se adapta si cambia la modalidad? | Hacer adaptativo |
| P-PD6 | ¿La evaluación usa semáforo de 4 niveles? | Implementar rúbrica visual |
| P-PD7 | ¿El output es visualizable + descargable + compartible? | Implementar triple |
| P-PD8 | ¿Si usa IA, solo adapta texto del catálogo? | Limitar scope de IA |
| **P-PD9** | **¿La IA solo sugiere, no escribe directamente?** | **Mostrar sugerencia explícita, campo editable** |

---

## 4. RELACIÓN CON OTROS DOCUMENTOS

| Documento | Vinculación |
|-----------|-------------|
| E17 UX Diferenciador | E20 complementa con principios de PRODUCTO (E17 son de UI) |
| SPEC §1-§6 | E20 refleja decisiones validadas en walkthrough |
| E14 Catalogación | P-PD2 depende de que E14 esté completo |
| ENT-002 Hallazgos | H1, H4, H5 son la base de P-PD5, P-PD6 |
| ENT-003 Decisiones | D1-D4 son la base de P-PD1, P-PD4, P-PD7 |
| ENT-001 Revisión | Compatible, no contradice |

---

## 5. PRÓXIMOS PASOS

1. ✅ Documento E20 creado.
2. ⏳ INTEGRA revisar al evaluar próximos issues o cambios al SPEC.
3. ⏳ SOFIA usar como guía al implementar cada feature nueva.
4. ⏳ Cuando se implemente el wizard adaptativo (P-PD5), documentar las 6 plantillas de wizard específicas.
5. ⏳ Validar con Tía Lola en sesión de discovery que el balance 85/15 se cumple en uso real.

---

**Fin del documento E20.**