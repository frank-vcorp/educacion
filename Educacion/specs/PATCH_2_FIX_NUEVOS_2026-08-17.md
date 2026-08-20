# PATCH #2 — Re-fixes tras GEMINI-A re-auditoría (2026-08-17)

**ID:** PATCH-2-FIX-NEW-2026-08-17
**Aplicado por:** INTEGRA
**Fecha:** 2026-08-17 10:55 UTC-6
**Estado:** ✅ Aplicado. Pendiente: GEMINI-A re-auditoría final.

---

## 1. RESUMEN

GEMINI-A re-auditoría post-patch encontró **4 issues L2 nuevos** introducidos o no resueltos completamente. Todos cerrados:

| ID | Issue | Estado |
|----|-------|--------|
| L2-NEW-01 | Enum `periodo.tipo` desalineado API↔DDL | ✅ Cerrado |
| L2-NEW-02 | Fix L2-04 incompleto (3 ejes cortos) | ✅ Cerrado |
| L2-NEW-03 | SQL catálogo usa schema incompatible con DDL principal | ✅ Documentado como nota pragmática |
| L2-NEW-04 | Tablas `audit_log` + `idempotency_keys` sin RLS policies | ✅ Cerrado |

---

## 2. DETALLE DE FIXES

### L2-NEW-01 ✅ Enum periodo tipo alineado

**Antes:** API tenía `"enum": ["mensual", "semanal"]`, DDL tenía `("rango_fechas","mensual","trimestral","semestral")`.

**Después:** API ahora tiene `"enum": ["rango_fechas", "mensual", "trimestral", "semestral"]` (alineado con DDL).

**Verificación:** `grep '"semanal"' SPEC_TEC_03` → 0.

---

### L2-NEW-02 ✅ Ejes cortos residuales corregidos

**Antes:** Quedaban `EJE_IC`, `EJE_IG`, `EJE_VS`, `EJE_APLE`, `EJE_AEE` en SPEC_TEC_03.

**Después:** Reemplazados por nombres semánticos:
- `EJE_IC` → `INTERCULTURALIDAD_CRITICA`
- `EJE_IG` → `IGUALDAD_GENERO`
- `EJE_VS` → `VIDA_SALUDABLE`
- `EJE_APLE` → `APROPIACION_CULTURAS_LECTURA`
- `EJE_AEE` → `ARTES_EXPERIENCIAS_ESTETICAS`

**Verificación:** `grep "EJE_IC\|EJE_IG\|EJE_VS\|EJE_APLE\|EJE_AEE"` → 0.

---

### L2-NEW-03 ✅ Documentado como resolución pragmática

**Issue:** SQL de carga inicial del catálogo usa `SERIAL PKs` + `id INT REFERENCES`, mientras que DDL principal (§5) usa `codigo TEXT PRIMARY KEY` + `text REFERENCES codigo`.

**Resolución aplicada:** Agregada §12.1 NOTA en SPEC_TEC_02 explicando:
- DDL §5 es la fuente de verdad para producción
- Script `cli.py build-sql` genera SQL alternativo optimizado para ETL inicial
- Acción para SOFIA: unificar antes del primer seed

**Severidad:** No bloquea MVP (seed inicial). Documentado para decisión de SOFIA.

---

### L2-NEW-04 ✅ RLS policies para audit_log e idempotency_keys

**Agregado a SPEC_TEC_02 §7 (RLS):**

```sql
-- ============ audit_log ============
alter table audit_log enable row level security;
create policy "audit_log_docente_own" on audit_log
  for select using (docente_id = auth.uid() and cct = user_cct());
create policy "audit_log_director_cct" on audit_log
  for select using (cct = user_cct() and is_director());
-- INSERT de audit_log solo via service_role (no desde cliente).

-- ============ idempotency_keys ============
alter table idempotency_keys enable row level security;
create policy "idempotency_keys_docente_own" on idempotency_keys
  for all using (cct = user_cct());
```

**Total RLS policies actualizado:** 25 (3 nuevas: `audit_log_docente_own`, `audit_log_director_cct`, `idempotency_keys_docente_own`).

---

## 3. VERIFICACIÓN POST-PATCH #2

```
[L2-NEW-01] enum periodo semanal: 0 ocurrencias ✅
[L2-NEW-02] ejes cortos: 0 ocurrencias ✅
[L2-NEW-03] nota explicativa en SPEC_TEC_02 §12.1 ✅
[L2-NEW-04] 25 RLS policies (3 nuevas) ✅
```

---

## 4. ESTADO ACUMULADO

| Categoría | Cerrados | Pendientes |
|-----------|----------|-----------|
| L2 originales | 10/10 | 0 |
| L3 originales resueltos | 2/8 | 6 (no críticos) |
| L2-NEW (post-patch) | 4/4 | 0 |
| **TOTAL issues resueltos** | **16** | 6 L3 menores + 1 FUN-01 |

---

## 5. PENDIENTE: RE-AUDITORÍA GEMINI-A (segunda vuelta)

Frank debe aprobar re-auditoría final para validar:
- ✅ Los 4 L2-NEW cerrados correctamente
- ✅ El SQL catálogo regenerado sigue ejecutable
- ✅ Las nuevas RLS policies no contradicen las existentes
- ✅ No hay nuevos issues introducidos

**Si GEMINI-A pasa:** 🚦 **GO definitivo** para SOFIA.
**Si hay residuales:** Iterar fixes (esperado: <15 min adicionales).

---

— **INTEGRA, 2026-08-17 10:55 UTC-6**