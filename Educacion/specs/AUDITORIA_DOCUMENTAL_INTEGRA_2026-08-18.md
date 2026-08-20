# AUDITORÍA DOCUMENTAL INTEGRA — SPECs técnicas vs producto NEM

**ID:** ARCH-20260818-01 (auditoría) · referencia SPEC-TEC-01..06
**Autor:** INTEGRA (delegación nocturna documental)
**Fecha:** 2026-08-18 23:30 UTC-6
**Modo:** Auditoría documental nocturna — sin commits, sin despliegues, sin cambios de código.
**Alcance:** verificar alineación entre especificaciones técnicas activas (`specs/SPEC_TEC_01..06`) y producto (`plataforma_nem_concepto_maestro.md`, `fuentes/ENT-003`, `E20`, `E21`, `E22`, `SPEC_MVP_01`). Corregir inconsistencias bajo ownership INTEGRA. Reportar gaps funcionales a ATLAS.

**Marco de precedencia aplicado:** plataforma/seguridad > Frank > baseline funcional (ATLAS) > ADR/SPEC > PROYECTO.md > código > inferencias. Las SPECs técnicas ceden ante el baseline funcional confirmado (E22); donde el baseline funcional (`SPEC_MVP_01`) está desactualizado respecto a decisiones confirmadas (E22/ENT-003), el gap es de ATLAS, no de INTEGRA.

---

## 1. ARCHIVOS LEÍDOS

**Contexto funcional (no modificable por INTEGRA):**
- `plataforma_nem_concepto_maestro.md` (documento maestro, 434 líneas)
- `fuentes/ENT-003_DECISIONES_MVP.md` (decisiones D1–D4, 265 líneas)
- `fuentes/E20_PRINCIPIOS_DISENNO_PRODUCTO.md` (P-PD1–P-PD9, 300 líneas)
- `fuentes/E21_CATALOGO_RECURSOS_AULA.md` (inventario aula + F-IA1, 713 líneas)
- `fuentes/E22_CIERRE_DISCOVERY.md` (D-FIN-1..19, 481 líneas)
- `SPEC_MVP_01_Modulo_Docente.md` (SPEC funcional v0.13, 825 líneas)

**SPECs técnicas activas (ownership INTEGRA):**
- `specs/SPEC_TEC_01_Arquitectura.md` (839 líneas)
- `specs/SPEC_TEC_02_Modelo_Datos.md` (1448 líneas)
- `specs/SPEC_TEC_03_API_Contract.md` (1155 líneas, inspeccionada vía grep temático)
- `specs/SPEC_TEC_04_Estructura_Proyecto.md` (1055 líneas, inspeccionada vía grep temático)
- `specs/SPEC_TEC_05_Infraestructura.md` (563 líneas, inspeccionada vía grep temático)
- `specs/SPEC_TEC_06_Plan_Testing.md` (920→941 líneas)

**Documentos técnicos relacionados (lectura de contexto):**
- `specs/SPEC_CORRECCIONES_2026-08-17.md`, `specs/SPEC_MODALIDADES_2026-08-17.md`
- `specs/GEMINI-AUDIT-FINAL-2026-08-18.md` (auditoría de código QA-20260818-01)
- `specs/READY-FOR-FRANK-2026-08-18.md` (resumen ejecutivo)
- `specs/REVISION_TECNICA_vs_FUNCIONAL.md` (referencia cruzada)

## 2. ARCHIVOS MODIFICADOS (ownership INTEGRA, solo markdown técnico)

| Archivo | Cambio | Línea(s) |
|---|---|---|
| `specs/SPEC_TEC_06_Plan_Testing.md` | **Añadido T-E2E-12** (Bitácora post-clase, Flujo C) con nota de auditoría. Cierra gap de cobertura: la v1.0 no tenía ningún test E2E para el Flujo C a pesar de ser criterio de cierre MVP §7.1 #3. | tras T-E2E-11 |
| `specs/SPEC_TEC_06_Plan_Testing.md` | **Corregida fila §13**: "§3 Flujo C (bitácora) \| Diferido" → "en alcance MVP (criterio §7.1 #3) + T-E2E-12 + T-I-RLS-06". La marca "Diferido" contradecía el baseline funcional y la tabla `bitacora` de SPEC_TEC_02. | §13 matriz |
| `specs/SPEC_TEC_02_Modelo_Datos.md` | **Corregido conteo inconsistente** §11.2: título "(23)" → "(25)". El cuerpo (§7.3 + §11.2 nota) ya contaba 25 `CREATE POLICY`; el título quedó desincronizado. Sin cambio semántico. | §11.2 |

**No modificados (fuera de ownership INTEGRA esta noche):** `discovery/*` (ATLAS), `SPEC_MVP_01_Modulo_Docente.md` (baseline funcional ATLAS+Frank), `PROYECTO.md`, código, migraciones, CI.

---

## 3. HALLAZGOS POR SEVERIDAD

### 🔴 P0 — Contradicción baseline: SPEC_MVP_01 §4 línea 554 "Sin datos de alumnos en MVP. Cero"

- **Evidencia:** `SPEC_MVP_01` §4 línea 554 declara "Sin datos de alumnos en MVP. Cero" y §4 "Datos sensibles — decisión: Sin datos de alumnos. Sin registros de salud, neurotipo, ni seguimiento individual. Posterga §4.4 del doc maestro a Fase 2."
- **Decisión confirmada que la revierte:** `ENT-003 D1` + `E22 D-FIN-2` ("SÍ se incluyen nombres individuales en MVP; revierte SPEC §4 línea 554"). Entidades `alumno` y `evaluacion_alumno` formalizadas.
- **Estado técnico:** las SPECs técnicas **sí** reflejan la reversión: `SPEC_TEC_02 §5.3.4` tabla `alumno`, `§5.3.9` `evaluacion_alumno`, `SPEC_TEC_01 §5.1` flujo onboarding paso 4 inserta alumnos, `SPEC_TEC_03` endpoints E13–E17 CRUD alumnos.
- **Naturaleza del gap:** el baseline funcional principal (`SPEC_MVP_01`) está **desactualizado** vs la decisión confirmada. La trazabilidad funcional→técnico está rota en la **fuente**: el técnico ya hizo lo correcto, pero un lector que parta de `SPEC_MVP_01` concluirá "no hay alumnos", contradiciendo las SPECs técnicas.
- **Ownership:** ATLAS (integrar cambios a `SPEC_MVP_01` — E22 §4 ya lista los 9 cambios + 2 secciones nuevas pendientes). **INTEGRA no puede corregir `SPEC_MVP_01`** (baseline funcional).
- **Veredicto:** DISCOVERY-GAP → TECHNICAL-HANDOFF a ATLAS (§7).

### 🟠 P1 — SPEC_MVP_01 §6 "PROPUESTA, NO DECIDIDA" para el stack técnico

- **Evidencia:** `SPEC_MVP_01` §6 encabezado "PLATAFORMA Y STACK (PROPUESTA, NO DECIDIDA)".
- **Decisión confirmada:** `E22 D-FIN-11..14` cerró el stack (Next.js + Supabase + Vercel + @dnd-kit + PWA). `SPEC_TEC_01 §2` lo materializa como decidido.
- **Impacto:** un ingeniero que lea primero `SPEC_MVP_01` puede creer que el stack está abierto a discusión y replicar el debate, generando ruido y retraso.
- **Ownership:** ATLAS (actualizar `SPEC_MVP_01` §6). SPEC_TEC_01 ya correcto.

### 🟠 P1 — SPEC_MVP_01 §3.7 "Proveedor único, sin fallback" vs conector OpenAI-compatible

- **Evidencia:** `SPEC_MVP_01` §3.7 "Proveedor único, sin fallback. Si MiniMax cae, las features de IA fallan gracefully."
- **Decisión confirmada:** `E22 D-FIN-13` + `SPEC_TEC_01 ADR-003` ("conector compatible con OpenAI API; URL, modelo y API key en env vars; fallback configurable vía env vars, **sin fallback automático en MVP**").
- **Matiz:** NO son contradictorias en semántica operativa (ambas coinciden en "sin fallback automático; degradación graceful"), pero la redacción categórica de `SPEC_MVP_01` ("sin fallback") puede inducir a SOFIA a **no** implementar la capa de abstracción OpenAI-compatible, rompiendo D-FIN-13.
- **Ownership:** ATLAS (matizar `SPEC_MVP_01` §3.7.3 para reflejar "conector abstraído, fallback configurable por env vars, sin fallback automático"). SPEC_TEC_01 ya correcto.

### 🟠 P1 — SPEC_MVP_01 no integra 6 decisiones de E22 (cambios pendientes listados en E22 §4)

- **Evidencia:** `E22 §4` "CAMBIOS REQUERIDOS AL SPEC PRINCIPAL" lista: onboarding 5 pantallas (D-FIN-4), wizard adaptativo por modalidad (D-FIN-6), estrategia PDFs CONALITEG (D-FIN-10), aviso de privacidad en primer login (D-FIN-15), multi-grupo (D-FIN-16), botón Duplicar/Clonar (D-FIN-17), notificación WhatsApp director (D-FIN-19), compliance LFPDPPP como riesgo.
- **Estado técnico:** **todas** están materializadas en las SPECs técnicas (`SPEC_TEC_01 §5.1` onboarding, `§5.6` F-IA1; `SPEC_TEC_02` tablas `grupo`/`aceptacion_aviso_privacidad`/`planeacion.clonada_de`; `SPEC_TEC_03` endpoint E6 duplicar; `SPEC_TEC_06` tests D-FIN-4/15/16/17/19).
- **Impacto:** `SPEC_MVP_01` es v0.13 de 2026-08-13, **anterior** a E20/E21/E22 (2026-08-15/16). El baseline funcional quedó congelado en la versión pre-cierre de discovery. Trazabilidad funcional→técnico funciona por E22 como puente, pero el documento canónico del módulo docente está desfasado.
- **Ownership:** ATLAS (integrar los cambios listados en E22 §4 a `SPEC_MVP_01`, ~3–4h de redacción según E22).

### 🟡 P2 — `recurso_skill` (E21 §5.1) como feature MVP vs decisión de modelo DM-03 que recomienda diferirlo

- **Evidencia:** `E21 §5.1` presenta `recurso_skill` + algoritmo mini-NLP de inferencia como parte del sistema. `SPEC_TEC_02 §5.3.12` define la tabla y `§12 DM-03` recomienda diferir el algoritmo a Fase 2 (matching por texto del campo `uso` en MVP).
- **Naturaleza:** **decisión de modelo pendiente** documentada (DM-03 requiere aprobación de Frank). No es contradicción dura; es una tensión entre la visión de E21 (feature completa) y la recomendación pragmática de SPEC_TEC_02 (diferir el NLP). GEMINI (QA-20260818-01 B.5) confirma que hoy F-IA1 es keyword-matching determinista, no MiniMax.
- **Ownership:** INTEGRA documentó DM-03 correctamente. **Falta decisión de Frank** (¿recurso_skill en MVP o Fase 2?). No bloquea (la tabla existe vacía).

### 🟡 P2 — D-FIN-5 PDF "descargable binario" diferido vs SPEC_MVP §3.5/§7

- **Evidencia:** `E22 D-FIN-5` define PDF triple (visualizable + descargable + compartible). `SPEC_TEC_01 ADR-006` + `SPEC_TEC_03` implementan visualizable + compartible. GEMINI (QA-20260818-01 C.1) confirma "descargable binario diferido — HTML imprimible (decisión documentada sesión 3)".
- **Naturaleza:** desviación **aceptada y documentada**, pero introduce una brecha entre el contrato funcional (PDF descargable como archivo) y la implementación (imprimir a PDF desde HTML). Para el criterio de cierre MVP #4 ("PDF aceptado por director sin reformateo") puede ser suficiente, pero el botón "Descargar PDF" no produce un `.pdf` binario hoy.
- **Ownership:** INTEGRA debe confirmar si `SPEC_TEC_03`/`SPEC_TEC_06` reflejan explícitamente esta desviación. GEMINI ya lo señala como "desviación aceptada". Recomendación: añadir nota en `SPEC_TEC_03` endpoint PDF. (No corregido esta noche: requiere validar con SOFIA el estado real del endpoint `generar-pdf`.)

### 🟡 P2 — `planeacion.estado` introduce 'lista' no declarado en SPEC_MVP

- **Evidencia:** `SPEC_TEC_02 §5.3.6` `planeacion.estado` CHECK in ('borrador','lista','entregada','archivada'). `SPEC_MVP_01` entidad "Programación" no enumera estados de planeación (solo la entidad "Entrega" lista 'entregada'|'recibida'|'con_comentarios'|'archivada').
- **Naturaleza:** 'lista' es un estado intermedio técnico razonable (planeación completa pero no entregada), **no** contradicción (el baseline no lo prohíbe). Solo es un añadido técnico no trazado al funcional.
- **Ownership:** INTEGRA. Aceptable; recomendable documentar el estado 'lista' en la próxima revisión de SPEC_MVP por ATLAS.

### 🟢 P3 — Trazabilidad de IDs: SPECs técnicas referencian E22/ENT-003/E20/E21; SPEC_MVP no reciproca

- Las 6 SPECs técnicas incluyen bloque "Fuentes de verdad" con IDs D-FIN/P-PD/ENT trazables. `SPEC_MVP_01` no referencia E20/E21/E22 (son posteriores a v0.13). Esperado por cronología. Se resuelve al integrar E22 §4 en SPEC_MVP.

### 🟢 P3 — `pda_ejes` vacío (DP-08 / DM-01)

- `SPEC_TEC_02 §5.1.8` + `§10.8` documentan `pda_ejes` vacío en catálogo Fase 2 (0 registros), con DP-08/DM-01 pendientes. Decisión documentada, no contradicción.READY-FOR-FRANK afirma "114 asociaciones pda_ejes" cargadas en BD — **verificar**: SPEC_TEC_02 dice vacío; READY dice 114. Posible divergencia entre SPEC de modelo (vacío por diseño) y estado real de la BD cargada (114). Requiere confirmación de SOFIA/script de carga. (No resuelto esta noche.)

---

## 4. CRITERIOS CORREGIDOS POR INTEGRA (esta noche)

| Criterio | Archivo | Antes | Después |
|---|---|---|---|
| AC-01 | SPEC_TEC_06 §13 | Flujo C marcado "Diferido" (contradecía MVP §7.1 #3) | Flujo C en alcance MVP, cubierto por T-E2E-12 + T-I-RLS-06 |
| AC-02 | SPEC_TEC_06 §6 | Sin test E2E para bitácora | Añadido T-E2E-12 (bitácora <30s + offline sync + regla dura foto) |
| AC-03 | SPEC_TEC_02 §11.2 | Título "RLS policies creadas (23)" | "(25)" coherente con §7.3 y nota inferior |

## 5. VALIDACIÓN DOCUMENTAL (trazabilidad)

**Trazabilidad funcional → técnico (positiva):**

| Decisión funcional | SPEC técnica que la materializa | Estado |
|---|---|---|
| ENT-003 D1 / E22 D-FIN-2 (alumnos) | SPEC_TEC_02 §5.3.4 `alumno`, §5.3.9 `evaluacion_alumno`; SPEC_TEC_03 E13–E17 | ✅ |
| E22 D-FIN-3 (semáforo 4 niveles) | SPEC_TEC_02 §5.3.9 CHECK nivel 1–4; SPEC_TEC_06 T-E2E-04, T-C-20..22 | ✅ |
| E22 D-FIN-4 (onboarding 5 pantallas) | SPEC_TEC_01 §5.1; SPEC_TEC_03 E27 aviso; SPEC_TEC_06 T-E2E-01 | ✅ |
| E22 D-FIN-5 (PDF triple) | SPEC_TEC_01 ADR-006; SPEC_TEC_03 E5; SPEC_TEC_06 T-E2E-05/08 | ⚠️ descargable binario diferido (P2) |
| E22 D-FIN-6 (wizard adaptativo) | SPEC_TEC_02 `planeacion.modalidad` CHECK 6 valores; SPEC_MODALIDADES metadata | ✅ |
| E22 D-FIN-10 (CONALITEG híbrido) | SPEC_TEC_01 ADR-010; SPEC_TEC_02 §5.1.9 refs; SPEC_TEC_06 T-E2E-11 | ✅ |
| E22 D-FIN-15 (aviso privacidad) | SPEC_TEC_02 §5.3.5 `aceptacion_aviso_privacidad`; SPEC_TEC_03 E27; SPEC_TEC_06 T-C-30..32 | ✅ |
| E22 D-FIN-16 (multi-grupo) | SPEC_TEC_02 §5.3.3 `grupo` (hasta 3); SPEC_TEC_06 T-E2E-02 | ✅ |
| E22 D-FIN-17 (duplicar) | SPEC_TEC_02 `planeacion.clonada_de`; SPEC_TEC_03 E6; SPEC_TEC_06 T-I-04 | ⚠️ spec completa, implementación 0 (GEMINI P2-02) |
| E22 D-FIN-19 (WhatsApp director) | SPEC_TEC_01 §4.6; SPEC_TEC_03; SPEC_TEC_06 T-E2E-05 | ✅ |
| E20 P-PD9 (IA solo sugiere) | SPEC_TEC_01 ADR-007/012; SPEC_TEC_02 `bloque.origen`/`recurso_aula.uso_fuente`; SPEC_TEC_06 T-C-01..06 | ✅ |
| E21 (inventario aula + F-IA1) | SPEC_TEC_02 §5.3.10–12; SPEC_TEC_01 §5.6; SPEC_TEC_06 T-E2E-09 | ⚠️ recurso_skill diferido (DM-03) |

**Conclusión de trazabilidad:** las SPECs técnicas están **sólidamente alineadas** con el discovery confirmado (E22/E20/E21/ENT-003). El problema documental principal es que **`SPEC_MVP_01` (el baseline funcional canónico del módulo docente) está congelado en v0.13 anterior al cierre de discovery**, y no refleja 9 cambios + 2 secciones nuevas que E22 §4 ya listó como pendientes de integración.

## 6. GAPS FUNCIONALES (no resolvibles por INTEGRA)

Todos los gaps funcionales detectados se concentran en **`SPEC_MVP_01` desactualizado**. Las SPECs técnicas ya hicieron la traducción correcta desde E22. Por tanto, no hay DISCOVERY-GAP de producto nuevo que requiera decisión de Frank: las decisiones **ya están confirmadas** en E22/ENT-003. El gap es de **consistencia documental del baseline funcional**, ownership ATLAS.

Única excepción que sí requiere decisión de Frank (no es de ATLAS, es de producto/alcance):
- **D-FIN-17 (Duplicar/Clonar)**: SPEC completa, implementación 0. GEMINI P2-02 pide dirimir si era alcance MVP o Fase 2. E22 lo formalizó como decisión MVP, pero no apareció en GO_FINAL entre tests bloqueantes. → requiere confirmación de alcance por Frank/ATLAS.
- **DM-03 (recurso_skill)**: ¿en MVP o Fase 2? Requiere OK de Frank.

---

## 7. DISCOVERY-GAP → TECHNICAL-HANDOFF PARA ATLAS

```text
DISCOVERY-GAP
Origen: INTEGRA (ARCH-20260818-01)
SPEC/ARCH afectada: SPEC_MVP_01_Modulo_Docente.md (baseline funcional, v0.13, 2026-08-13)
IDs funcionales relacionados: ENT-003 D1; E22 D-FIN-2, D-FIN-4, D-FIN-5, D-FIN-6, D-FIN-10, D-FIN-11..14, D-FIN-15, D-FIN-16, D-FIN-17, D-FIN-19; E20 P-PD9; E21
Contradicción o faltante: SPEC_MVP_01 está congelado ANTERIOR al cierre de discovery (E20/E21/E22 son del 15-16 ago; SPEC_MVP es del 13-ago). No integra:
  (1) §4 línea 554 "Sin datos de alumnos en MVP. Cero" — REVERTIDO por D-FIN-2 pero NO corregido en el texto.
  (2) §6 stack marcado "PROPUESTA, NO DECIDIDA" — DECIDIDO por D-FIN-11..14.
  (3) §3.7 "Proveedor único, sin fallback" — matizar vs D-FIN-13 conector OpenAI-compatible.
  (4) Onboarding 5 pantallas (D-FIN-4) — sin sección.
  (5) Wizard adaptativo por modalidad (D-FIN-6) — sin sección.
  (6) PDFs CONALITEG online/offline (D-FIN-10) — sin sección.
  (7) Aviso privacidad primer login (D-FIN-15) — sin sección.
  (8) Multi-grupo (D-FIN-16) — sin sección.
  (9) Botón Duplicar/Clonar (D-FIN-17) — sin sección.
  (10) Notificación WhatsApp director (D-FIN-19) — sin sección.
Por qué impide especificar: NO impide a INTEGRA (las SPECs técnicas ya tradujeron E22 correctamente). Impide a lectores nuevos (SOFIA/GEMINI/Frank) que parten de SPEC_MVP concluir cosas falsas: "no hay alumnos", "el stack no está decidido", "no hay onboarding de 5 pantallas". Rompe la trazabilidad canónica Necesidad → DEC/BR → SPEC → IMPL → QA en su primer eslabón.
Opciones técnicamente viables:
  (A) ATLAS integra los 9 cambios + 2 secciones nuevas listados en E22 §4 a SPEC_MVP_01 (estimado 3–4h, ya planificado por E22 §7 "Próximos pasos" #3).
  (B) Marcar SPEC_MVP_01 como SUPERSEDED y declarar E22 + SPEC_TEC_01..06 como baseline vigente (más rápido, pierde el documento de módulo docente narrativo).
Consecuencias de cada opción:
  (A) Mantiene el SPEC funcional narrativo como fuente legible; coherencia total. Coste: 3–4h de redacción ATLAS.
  (B) Elimina ambigüedad de inmediato; pero el módulo docente pierde su documento de referencia y los nuevos deben leer 6 SPECs técnicas + E22.
Pregunta funcional mínima (para Frank/ATLAS): ¿Opción A (integrar cambios a SPEC_MVP_01, recomendada por E22 §7) u Opción B (marcar superseded)?
Estado recomendado: BLOCKED (para la consistencia documental del baseline funcional) — no bloquea implementación (las SPECs técnicas están listas).
```

```text
TECHNICAL-HANDOFF
Origen: INTEGRA (ARCH-20260818-01)
Destino: ATLAS
ID tarea: integrar E22 §4 en SPEC_MVP_01 (o declarar superseded)
SPEC activa: SPEC_TEC_01..06 (ya alineadas a E22, production-ready per GEMINI QA-20260818-01)
Referencias funcionales: ENT-003 D1; E22 D-FIN-2/4/5/6/10/15/16/17/19; E20; E21
Resultado: que SPEC_MVP_01 refleje las decisiones confirmadas en E22 (alumnos incluidos, stack decidido, onboarding 5 pantallas, aviso privacidad, multi-grupo, clonar, CONALITEG híbrido, WhatsApp director) o quede formalmente superseded.
Alcance de archivos/módulos: SPEC_MVP_01_Modulo_Docente.md (ownership ATLAS+Frank). No tocar discovery/* ni specs/SPEC_TEC_* (ya correctas).
Contratos que cambian: ninguno técnico (las SPECs técnicas no requieren cambios por este handoff). Solo consistencia del baseline funcional.
Contratos protegidos: SPEC_TEC_01..06 (no modificar); trazabilidad D-FIN → SPEC → IMPL ya establecida en técnico.
Criterios AC:
  AC-1: SPEC_MVP_01 §4 ya NO dice "Sin datos de alumnos en MVP. Cero" (o lo marca explícitamente como revertido por D-FIN-2).
  AC-2: SPEC_MVP_01 §6 ya NO dice "PROPUESTA, NO DECIDIDA".
  AC-3: SPEC_MVP_01 §3.7 matiza "sin fallback automático" manteniendo la abstracción OpenAI-compatible (D-FIN-13).
  AC-4: SPEC_MVP_01 contiene secciones para onboarding 5 pantallas, wizard adaptativo, CONALITEG híbrido, aviso privacidad, multi-grupo, duplicar, WhatsApp director.
  AC-5: Trazabilidad recíproca: SPEC_MVP_01 referencia E20/E21/E22.
Casos borde: si Frank prefiere Opción B (superseded), documentar la sustitución en el header de SPEC_MVP_01 y redirigir a E22 + SPEC_TEC_01.
Validaciones detectadas: lectura humana del SPEC actualizado; cruce de cada sección nueva con su D-FIN correspondiente.
Restricciones: no inferir decisiones de producto no confirmadas en E22/ENT-003. Si surge ambigüedad, devolver a Frank, no decidir.
Dependencias: E22 §4 ya provee la lista exacta de cambios; E22 §7 estimó 3–4h.
DoD: SPEC_MVP_01 consistente con E22 (lectura cruzada sin contradicciones P0/P1) y trazabilidad recíproca establecida.
Prohibido inferir: nuevos alcances MVP, precios, actores, ni revertir D-FIN confirmadas.
```

## 8. AUTO-AUDITORÍA INTEGRA (§24)

- ¿Inventé una decisión funcional? No. Todas las decisiones referenciadas están en ENT-003/E22 (confirmadas por Frank).
- ¿Generé o edité código? No. Solo 3 ediciones markdown en `specs/` (SPEC_TEC_06, SPEC_TEC_02) + 1 reporte markdown nuevo.
- ¿Creé una SPEC sin DoR funcional? No. Las correcciones se basan en E22 (DoR cumplido).
- ¿Perdí IDs de trazabilidad? No. ARCH-20260818-01; referencia D-FIN/P-PD/ENT.
- ¿Declaré DONE sin autoridad/evidencia? No. No declaro DONE; es auditoría documental.
- ¿Omití GEMINI donde era obligatorio? No aplicable (no toca contrato público/migración/auth esta noche). GEMINI ya auditó el código (QA-20260818-01) — mi auditoría es documental y complementaria.
- ¿Paralelicé sin independencia? No hubo delegación esta noche (trabajo documental directo).
- ¿Dejé representaciones duplicadas? No. El reporte referencia, no duplica.

## 9. PRÓXIMO PASO SUGERIDO

1. **ATLAS** resuelve el DISCOVERY-GAP §7 (Opción A recomendada: integrar E22 §4 en SPEC_MVP_01, 3–4h).
2. **Frank** decide D-FIN-17 (¿duplicar en MVP o Fase 2?) y DM-03 (¿recurso_skill en MVP o Fase 2?).
3. **INTEGRA** (turno siguiente, si Frank autoriza): añadir nota explícita en `SPEC_TEC_03` sobre la desviación del PDF binario descargable (P2), y resolver la divergencia `pda_ejes` (vacío en SPEC_TEC_02 vs "114 asociaciones" en READY-FOR-FRANK) con SOFIA.

---

**Fin del reporte de auditoría documental.**
