# PATCH DE ALINEACIÓN — Specs Técnicas (2026-08-17)

**ID:** PATCH-ALIGN-2026-08-17-INTEGRA
**Aplicado por:** INTEGRA (Frank aprobó Opción A 2026-08-17 10:34)
**Fecha:** 2026-08-17
**Estado:** ✅ **Aplicado. Pendiente: re-auditoría GEMINI-A.**

---

## 1. RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Issues L2 resueltos** | **10/10 (100%)** |
| **Issues L3 resueltos** | **2/8 críticos** (L3-04 INSERT policy, L3-06 índice trigram) |
| Issues L3 diferidos (no críticos) | 6 (L3-01, L3-02, L3-03, L3-05, L3-07, FUN-01) |
| **Tiempo estimado** | ~3h (vs 4-5h estimado) |

---

## 2. FIXES APLICADOS

### L2-01 ✅ Columna tenant: `cct_id` → `cct`

**Acción:** Renombrado en SPEC_TEC_03, SPEC_TEC_01, SPEC_TEC_04, SPEC_TEC_06.

**Comando:**
```bash
sed -i 's/cct_id/cct/g' specs/SPEC_TEC_*.md
```

**Verificación:** `grep "cct_id" specs/SPEC_TEC_*.md` → 0 ocurrencias.

---

### L2-02 ✅ Nombres catálogo con prefijo `catalogo_`

**Acción:** Renombrado en SPEC_TEC_03 (`catalogo_pda` → `pda`, `catalogo_campo_formativo` → `campo_formativo`, `catalogo_eje` → `eje_articulador`, `catalogo_bloque` → `bloque_catalogo`).

**Tabla `bloque_catalogo` creada** en SPEC_TEC_02 §5.3.15 (ver L2-09).

---

### L2-03 ✅ Códigos campo formativo semánticos

**Acción:** SPEC_TEC_03 usaba `CF_LEN`, `CF_SYPC`, etc. Reemplazados por nombres semánticos: `LENGUAJES`, `SABERES_PENSAMIENTO_CIENTIFICO`, `ETICA_NATURALEZA_SOCIEDADES`, `LO_HUMANO_LO_COMUNITARIO`.

**Verificación:** `grep "CF_LEN" SPEC_TEC_03` → 0.

---

### L2-04 ✅ Códigos eje articulador semánticos

**Acción:** SPEC_TEC_03 usaba `EJE_INC`, `EJE_PC`, etc. Reemplazados por: `INCLUSION`, `PENSAMIENTO_CRITICO`, `INTERCULTURALIDAD_CRITICA`, `IGUALDAD_GENERO`, `VIDA_SALUDABLE`, `APROPIACION_CULTURAS_LECTURA`, `ARTES_EXPERIENCIAS_ESTETICAS`.

**Verificación:** `grep "EJE_INC" SPEC_TEC_03` → 0.

---

### L2-05 ✅ Campo `periodo` en DDL

**Acción:** Agregadas columnas a tabla `planeacion`:
```sql
periodo_tipo    text not null default 'rango_fechas'
                check (periodo_tipo in ('rango_fechas','mensual','trimestral','semestral')),
periodo_inicio  date not null,
periodo_fin     date not null,
check (periodo_fin >= periodo_inicio)
```

---

### L2-06 ✅ Estado de planeación unificado

**Acción:** API contract usaba `"activa"`, DDL usaba `"lista"`. Unificado a `"lista"` en ambos.

---

### L2-07 ✅ Variable JWT unificada

**Acción:** SPEC_TEC_04 usaba `JWT_DIRECTOR_SECRET`, SPEC_TEC_05 usaba `JWT_SECRET`. Unificado a `JWT_SECRET` (un solo secret para todos los JWT).

---

### L2-08 ✅ Tablas `audit_log` + `idempotency_keys` agregadas

**Acción:** DDL completo agregado a SPEC_TEC_02 §5.3.16 (audit_log) y §5.3.17 (idempotency_keys). Con índices y comments.

---

### L2-09 ✅ Tabla `bloque_catalogo` agregada

**Acción:** DDL completo agregado a SPEC_TEC_02 §5.3.15. Incluye:
- Columnas: id, codigo, nombre, descripcion, tipo, nivel_flexibilidad, contenido_default
- Arrays: campos_formativos, ejes_articuladores, pda_ids, recursos_requeridos, modalidades_compatibles
- Constraints: CHECK en enum tipos, duracion_estimada_min
- Índices: por codigo, tipo (parcial), modalidades (GIN)

---

### L2-10 ✅ Bucket `conaliteg-cache` eliminado

**Acción:** Bucket removido de SPEC_TEC_05 §3.2. Regla dura cumplida: NO alojamos contenido CONALITEG. PDFs se cachean en IndexedDB local (ADR-010). Documentado el cambio explícitamente.

---

## 3. L3 MENORES RESUELTOS

### L3-04 ✅ Policy INSERT explícita en `docente`

```sql
create policy "docente_self_insert" on docente
  for insert with check (id = auth.uid());
```

### L3-06 ✅ Índice trigram para autocomplete CCT

```sql
create extension if not exists pg_trgm;
create index if not exists idx_cct_nombre_trgm on cct using gin(nombre gin_trgm_ops);
create index if not exists idx_cct_municipio_trgm on cct using gin(municipio_nombre gin_trgm_ops);
create index if not exists idx_cct_clave_prefix on cct(clave text_pattern_ops);
```

---

## 4. L3 MENORES DIFERIDOS (no críticos, no bloquean)

| ID | Issue | Por qué diferido |
|----|-------|------------------|
| L3-01 | Convención plural vs singular tablas | Solo afecta naming, no runtime |
| L3-02 | Numeración migraciones 13 vs 7 | Confusión administrativa, no bloquea |
| L3-03 | 5 nombres campo API vs DDL | Cosmético |
| L3-05 | Director anónimo RLS | Resuelto con bypass service_role documentado |
| L3-07 | Test paginación cursor | Se agrega en implementación |
| FUN-01 | D-FIN-9 sin endpoint API explícito | Se cubre vía PATCH /planeaciones/:id |

---

## 5. VERIFICACIÓN POST-PATCH

```bash
# Verificar que no quedan inconsistencias conocidas
for term in "cct_id" "catalogo_pda" "CF_LEN" "EJE_INC" "JWT_DIRECTOR_SECRET" "conaliteg-cache" '"activa"'; do
  count=$(grep -r "$term" specs/SPEC_TEC_*.md 2>/dev/null | wc -l)
  echo "$term: $count"
done
```

**Esperado:** todos en 0.

---

## 6. ESTADO DEL DDL POST-PATCH

El schema ahora tiene:
- **26 tablas tenant + 3 nuevas = 29 tablas totales** (incluye `bloque_catalogo`, `audit_log`, `idempotency_keys`)
- **26+ RLS policies** (incluye nueva `docente_self_insert`)
- **3 índices nuevos** (trigram en cct)
- **1 bucket Storage eliminado** (`conaliteg-cache`)
- **3 columnas nuevas** en `planeacion` (`periodo_tipo`, `periodo_inicio`, `periodo_fin`)

---

## 7. PENDIENTE: RE-AUDITORÍA GEMINI-A

Frank debe aprobar el re-lanzamiento de GEMINI-A para verificar:
1. Las 10 inconsistencias L2 están realmente cerradas
2. El SQL regenerado es ejecutable
3. No hay nuevos issues L2 introducidos por los fixes

**Si GEMINI-A pasa:** GO definitivo para SOFIA.
**Si hay issues residuales:** Iterar.

---

## 8. PRÓXIMOS PASOS

1. **INTEGRA regenera SQL** del catálogo (`cli.py build-sql`)
2. **Frank aprueba** re-auditoría GEMINI-A
3. **GEMINI-A re-audita** (~30 min)
4. **Si pasa:** SOFIA implementa MVP (~30h)
5. **Si no:** Iterar fixes

---

**Cierre:** Patch aplicado. Espera re-auditoría.

— **INTEGRA, 2026-08-17**