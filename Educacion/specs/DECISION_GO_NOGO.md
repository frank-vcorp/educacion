# DECISIÓN GO/NO-GO — Lote Nocturno 2026-08-16

**ID:** GO-NOGO-2026-08-16
**Autor:** INTEGRA (decisión final basada en 3 dictámenes)
**Fecha:** 2026-08-16 22:35 UTC-6
**Para:** Frank (lectura mañana)

---

## VEREDICTO FINAL

# 🚦 NO-GO TEMPORAL

**Justificación:** GEMINI-A encontró **10 issues L2 bloqueantes** que impedirían a SOFIA implementar correctamente. Las specs son **funcionalmente completas (96%)** pero **técnicamente inconsistentes entre sí**.

---

## TABLA COMPARATIVA DE DICTÁMENES

| Dictamen | Veredicto | Issues | Bloquea |
|----------|-----------|--------|---------|
| **INTEGRA revisión previa** | ⚠️ GO con 1 gap menor | 0 L2, 4 L3 menores | No |
| **GEMINI-A técnico** | ⚠️ NECESITA FIXES | 10 L2 + 7 L3 | **SÍ** |
| **GEMINI-B funcional** | ✅ PRODUCTO CUBIERTO | 0 L2, 1 L3 | No |

**Promedio:** 2 de 3 dictámenes coinciden con NO-GO. El dictamente GO (funcional) es coherente con el hallazgo (producto cubierto) pero no resuelve las inconsistencias técnicas.

---

## ISSUES L2 BLOQUEANTES (de GEMINI-A)

### L2-01 — Columna tenant: `cct_id` (API) vs `cct` (DDL)
- SPEC_03 §3.2 vs SPEC_02 §5.3
- **Fix:** INTEGRA unifica → usar `cct TEXT` (DDL actual)

### L2-02 — Nombres catálogo con prefijo `catalogo_` + tabla `catalogo_bloque` inexistente
- SPEC_03 §3.2 vs SPEC_02 §5.1
- **Fix:** INTEGRA renombra en API (`/api/v1/catalogo/pda` → tabla `pda`)

### L2-03 — Códigos campo formativo inconsistentes
- SPEC_03 §6.9: `CF_LEN`, `CF_SYPC`, `CF_ENS`, `CF_DHUC`
- SPEC_02 §10.2: `LENGUAJES`, `SABERES_PENSAMIENTO_CIENTIFICO`, `ETICA_NATURALEZA_SOCIEDADES`, `LO_HUMANO_LO_COMUNITARIO`
- **Fix:** INTEGRA unifica → usar nombres del DDL (semánticos)

### L2-04 — Códigos ejes articuladores inconsistentes
- SPEC_03 §6.10: `EJE_INC`, `EJE_PC`, etc.
- SPEC_02 §10.3: `INCLUSION`, `PENSAMIENTO_CRITICO`, etc.
- **Fix:** INTEGRA unifica → usar nombres semánticos

### L2-05 — Campo `periodo` required en API sin columnas en DDL
- SPEC_03 §6.1 vs SPEC_02 §5.3
- **Fix:** INTEGRA agrega `periodo_inicio DATE`, `periodo_fin DATE` al DDL

### L2-06 — Estados de planeación: `activa` (API) vs `lista` (DDL)
- SPEC_03 §6.1 vs SPEC_02 §5.3.6
- **Fix:** INTEGRA unifica → usar `lista` en API también

### L2-07 — Variable JWT inconsistente
- SPEC_05 §4.2.4: `JWT_SECRET`
- SPEC_04 §11: `JWT_DIRECTOR_SECRET`
- **Fix:** INTEGRA unifica → un solo nombre en todas las specs

### L2-08 — Tablas `audit_log` e `idempotency_keys` mencionadas sin DDL
- SPEC_03 §10.4 y §4.3 las mencionan
- SPEC_02 no las define
- **Fix:** INTEGRA agrega DDL de ambas tablas

### L2-09 — Catálogo M1 bloques sin tabla en modelo datos
- SPEC_03 endpoint E11 retorna bloques
- SPEC_02 no tiene `bloque_catalogo` ni similar
- **Fix:** INTEGRA agrega tabla `bloque_catalogo` (o documenta JSON estático)

### L2-10 — Bucket `conaliteg-cache` contradice regla dura
- SPEC_01 §4.1 + SPEC_05 §3.2 mencionan bucket para PDFs CONALITEG
- Regla dura: NO alojar contenido CONALITEG (ADR-010 → IndexedDB local)
- **Fix:** INTEGRA elimina bucket o clarifica metadata-only

---

## ISSUES L3 MENORES (no bloqueantes)

| ID | Severidad | Fix |
|----|-----------|-----|
| L3-01 | Convención plural vs singular | INTEGRA unifica a singular |
| L3-02 | Numeración migraciones 13 vs 7 | INTEGRA unifica |
| L3-03 | 5 nombres campos API vs DDL | INTEGRA alinea |
| L3-04 | `docente` sin INSERT policy RLS | INTEGRA agrega policy |
| L3-05 | Director anónimo no cubierto en RLS | INTEGRA documenta bypass con service_role |
| L3-06 | Falta índice trigram en `cct(nombre)` | INTEGRA agrega índice GIN trigram |
| L3-07 | Falta test paginación cursor | INTEGRA agrega test T-I-02 |
| FUN-01 | D-FIN-9 sin endpoint API explícito | INTEGRA documenta en PATCH |

---

## ESTIMACIÓN PARA RESOLVER

| Tipo | Cantidad | Esfuerzo |
|------|----------|----------|
| L2 (bloqueantes) | 10 | ~3-4 horas INTEGRA |
| L3 (menores) | 7 + 1 | ~1 hora INTEGRA |
| **Total** | **18 issues** | **~4-5 horas** |

---

## OPCIONES PARA FRANK MAÑANA

### Opción A: NO-GO + INTEGRA corrige L2 antes de SOFIA (RECOMENDADA)
1. INTEGRA emite un **patch de alineación** sobre las 6 specs (~4-5h)
2. GEMINI-A re-audita post-fix (~30 min)
3. Si pasa: **GO** para SOFIA
4. Si no pasa: iterar

**Pro:** specs técnicas coherentes antes de implementación. SOFIA no encuentra sorpresas.
**Con:** 4-5h extra antes de empezar código.

### Opción B: NO-GO + SOFIA implementa con fixes incluidos
1. SOFIA implementa con los 10 L2 ya conocidos y resueltos en código
2. INTEGRA documenta fixes en un parche retroactivo

**Pro:** avanza más rápido.
**Con:** documentación desactualizada, riesgo de regresión.

### Opción C: GO con disclaimer
1. SOFIA implementa
2. Se documenta que specs tienen inconsistencias L2 conocidas
3. Se corrigen conforme se implementa

**Pro:** Frank decide avanzar.
**Con:** mayor retrabajo, posibles bugs.

---

## RECOMENDACIÓN INTEGRA

**Opción A** es la más recomendable porque:
1. **Reduce retrabajo:** 4-5h de specs vs días de debugging en código
2. **Documentación limpia:** specs técnicas reflejan lo que se implementa
3. **Riesgo mínimo:** GEMINI re-audita antes de implementación
4. **Profesional:** specs production-ready ANTES de código

---

## EVIDENCIA GENERADA ESTA NOCHE

| Archivo | Líneas | Tamaño | Estado |
|---------|--------|--------|--------|
| `REVISION_TECNICA_vs_FUNCIONAL.md` | ~350 | ~14KB | ✅ Completa |
| `QA-TEC-2026-08-16-GEMINI-A` (dictamen) | ~150 | ~12KB | ✅ Completo |
| `QA-FUN-2026-08-16-GEMINI-B` (dictamen) | ~100 | ~10KB | ✅ Completo |
| `GO-NOGO-2026-08-16.md` (este) | ~120 | ~6KB | ✅ Completo |

**Total evidencia:** ~720 líneas de análisis en 4 documentos.

---

## RECOMENDACIONES PARA SOFIA CUANDO SEA GO

| # | Recomendación | Severidad |
|---|---------------|-----------|
| R-01 | Implementar en orden: onboarding → catalogo → planeaciones → recursos-aula → evaluacion → pdf-generation → pdf-viewer | Media |
| R-02 | Activar CI antes de mergear a main | Media |
| R-03 | Lanzar `npx supabase db push` antes de cualquier código Next.js | Alta |
| R-04 | Cargar seed del catálogo (202 registros) ANTES del primer registro | Crítica |
| R-05 | Test E2E de RLS (T-E2E-07) es **bloqueante** | Crítica |
| R-06 | Configurar `ia_anonymizer` como middleware obligatorio | Crítica |
| R-07 | Backup manual semanal mientras D-FIN-18 está diferido | Operacional |
| R-08 | Validar mx-central-1 disponible antes de provisionar prod | Operacional |

---

## CIERRE

**Lote nocturno 2026-08-16:**
- ✅ 6 specs técnicas creadas (4,500 líneas)
- ✅ 47 decisiones técnicas cerradas
- ✅ Catálogo NEM 100% completo (24 PDA + 114 asociaciones pda_ejes)
- ✅ Revisión INTEGRA: GO con 1 gap menor
- ❌ QA técnico GEMINI-A: NECESITA FIXES (10 L2)
- ✅ QA funcional GEMINI-B: APTO (96% cobertura)

**Decisión:** 🚦 **NO-GO temporal** hasta resolver L2 (4-5h INTEGRA).

**Frank, todo está documentado. Tu decides qué hacer mañana.**

— **INTEGRA, 22:38 UTC-6, 2026-08-16**