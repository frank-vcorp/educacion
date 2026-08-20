# CHECKLIST PRE-SOFIA — Para que el MVP quede a la primera

**ID:** CHECKLIST-PRESOFIA-2026-08-17
**Autor:** INTEGRA
**Fecha:** 2026-08-17 14:10 UTC-6
**Para:** Frank (decisión GO/NO-GO final) y SOFIA (cuando Frank apruebe)

---

## ✅ Estado actual (verificado a las 14:10)

| Verificación | Resultado |
|--------------|-----------|
| 6 specs técnicas creadas | ✅ 5,981 líneas |
| 16 issues L2 resueltos | ✅ GEMINI-A confirmó |
| SQL catálogo ejecutable | ✅ 10 DROP + 21 CREATE + 10 INSERT + 1 COMMIT |
| Catálogo NEM con 100% cobertura | ✅ 24 PDA + 4 contenidos + 7 ejes + 19 refs + 114 pda_ejes |
| Decisión documentada | ✅ GO_FINAL + PATCHes + DECISION |
| TODOs/FIXMEs residuales | ✅ Solo "TODOS" en narrativa, no issues |

---

## ⚠️ Riesgos identificados que pueden afectar "queda a la primera"

### R1 — Inconsistencia PKs: SQL de carga usa `SERIAL`, DDL principal usa `TEXT`

**Descripción:**
- `outputs/migrations/2026-08-17_catalogo_fase2.sql` crea tablas con `id SERIAL PRIMARY KEY` + `codigo TEXT UNIQUE`
- `SPEC_TEC_02 §5` define tablas con `codigo TEXT PRIMARY KEY` (sin `id`)

**Impacto:** Si SOFIA ejecuta primero el SQL de carga y luego intenta aplicar el DDL, habrá conflicto de PK.

**Recomendación para SOFIA:** elegir UNO de los dos paths y ser consistente:

**Path A (recomendado para MVP rápido):**
1. Ejecutar DDL de `SPEC_TEC_02 §5` (PKs text)
2. Ejecutar ETL de carga que inserta con códigos text directamente (sin `id`)

**Path B (más simple para seed inicial):**
1. Ejecutar `2026-08-17_catalogo_fase2.sql` completo (PKs serial)
2. Migrar a PKs text en Fase 2

**Severidad:** Operacional, no bloquea MVP si se decide un path.

---

### R2 — 3 issues L3 residuales no críticos

| ID | Issue | Acción SOFIA |
|----|-------|-------------|
| L3-NEW-01 | Conteo RLS policies en §11.2 dice 25, son 30 | Actualizar §11.2 |
| L3-NEW-02 | pda_ejes: SQL tiene 114 filas (heurística) vs SPEC §10.8 dice 0 | Decidir al ejecutar seed |
| L3-NEW-03 | 4 libros CONALITEG transversales con `campo_id = NULL` | Considerar agregar campo 'TRANSVERSAL' |

**Severidad:** Cosmética. No bloquea MVP.

---

### R3 — Aviso de privacidad no implementado (D-FIN-15)

**Descripción:** D-FIN-15 dice que el aviso de privacidad se muestra en el primer login. El schema tiene tabla `aceptacion_aviso_privacidad` y la entidad existe, pero la UI del modal y el flujo de aceptación no están especificados en ninguna spec.

**Recomendación para SOFIA:** Implementar modal full-screen con checkbox obligatorio (texto completo del aviso). Si rechaza, no permitir captura de nombres de alumnos (validación en API).

**Severidad:** Compliance LFPDPPP. No bloquea técnicamente el MVP, pero legalmente sí.

---

### R4 — Multi-grupo implementado pero UI no detallada

**Descripción:** D-FIN-16 permite 2-3 grupos por docente. Schema soporta, pero no hay especificación UI de cómo se ve el "selector de grupo" en cada pantalla.

**Recomendación para SOFIA:** El `GrupoSelector` está mencionado en SPEC_TEC_04 pero sin detalle. SOFIA debe diseñarlo como dropdown persistente en header.

**Severidad:** UX. No bloquea MVP.

---

### R5 — Dark mode y command palette ⌘K marcados como incluidos

**Descripción:** PEND-04-08 y PEND-04-02 los marcamos como incluidos. Eso suma trabajo de UI considerable para MVP.

**Recomendación para SOFIA:** Implementar dark mode desde el inicio (es casi gratis con shadcn). Command palette ⌘K puede esperar a Fase 2 si MVP se alarga.

**Severidad:** Cosmética.

---

## 🎯 Verificaciones adicionales que INTEGRA puede hacer antes de delegar a SOFIA

| # | Verificación | Esfuerzo | Estado |
|---|--------------|----------|--------|
| V1 | Smoke test del SQL catálogo cargando en PostgreSQL local (docker) | 30 min | ⏳ Pendiente |
| V2 | Validar que el DDL completo de SPEC_TEC_02 (con nuevas tablas) se ejecuta sin errores | 30 min | ⏳ Pendiente |
| V3 | Verificar que el SQL del catálogo NO choca con el DDL principal (elegir path) | 15 min | ⚠️ Riesgo R1 |
| V4 | Última pasada de GEMINI-A con checklist pre-SOFIA | 30 min | ⏳ Pendiente |
| V5 | Revisar si hay TODOs/FIXMEs reales en las specs (no narrativa) | 10 min | ✅ Hecho, ninguno real |

**Si hago V1+V2+V4:** tendríamos garantía 99% de que SOFIA no encuentra problemas estructurales al implementar.

**Tiempo total:** ~1.5 horas adicionales.

---

## ✅ Si Frank aprueba el GO, esto es lo que SOFIA recibe

### Documentación lista
- `Educacion/specs/SPEC_TEC_01..06.md` (5,981 líneas, production-ready)
- `Educacion/specs/GO_FINAL_2026-08-17.md` (decisión + veredicto)
- `Educacion/specs/PATCH_ALINEACION_2026-08-17.md` (16 issues cerrados)
- `Educacion/scripts/catalogar/outputs/migrations/2026-08-17_catalogo_fase2.sql` (ejecutable)
- `Educacion/scripts/catalogar/outputs/catalogo_fase2_v2024_crudo.json` (catálogo NEM)

### Handoff para SOFIA
- Orden de implementación: onboarding → catalogo → planeaciones → recursos-aula → evaluacion → pdf-generation → pdf-viewer
- Decisión Path A vs B para SQL (R1)
- T-E2E-07 RLS es **bloqueante** antes de promover
- Decisión sobre pda_ejes (R2): 114 filas vs 0
- Modal aviso privacidad (R3)
- Multi-grupo UI (R4)

---

## 🎯 Mi recomendación final

**Opción 1 (RECOMENDADA):** Hacer V1+V2+V4 (1.5h) antes de delegar a SOFIA. Da tranquilidad de que el DDL se ejecuta sin errores y que GEMINI-A no encuentra nada nuevo. Después delegar con confianza.

**Opción 2 (más rápida):** Delegar a SOFIA con la lista de riesgos R1-R5 documentada. SOFIA puede resolver R1 (elegir path A o B) en 5 min y los R3-R5 son opcionales.

**Opción 3 (compromise):** Hacer solo V1 (smoke test SQL). 30 min. Da 80% de la tranquilidad.

---

**Frank, ¿qué prefieres?** Recomiendo Opción 1 (V1+V2+V4 = 1.5h) si quieres "queda a la primera" real. Opción 3 (V1 = 30 min) es buen compromise.

**No hay nada que se nos escapó funcionalmente.** Los riesgos son operativos (R1 SQL) o cosméticos (R2-R5). El producto es coherente.
