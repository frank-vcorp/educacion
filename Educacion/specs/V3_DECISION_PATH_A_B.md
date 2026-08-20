# V3 — Decisión Path A vs B para SQL de carga (R1)

**ID:** V3-DECISION-PATH-2026-08-17
**Autor:** INTEGRA
**Fecha:** 2026-08-17 14:18 UTC-6
**Estado:** ✅ Decidido (Path A)

---

## Inconsistencia detectada (R1)

**SQL de carga actual** (`2026-08-17_catalogo_fase2.sql`):
- Crea tablas con `id SERIAL PRIMARY KEY` + `codigo TEXT UNIQUE`
- 10 CREATE + 13 INDEX + 10 INSERT

**DDL principal** (`SPEC_TEC_02 §5`):
- Crea tablas con `codigo TEXT PRIMARY KEY` (sin `id`)
- 33 bloques DDL verificados sintácticamente

**Conflicto:** Si SOFIA ejecuta primero el SQL de carga (serial) y luego el DDL principal (text), habrá `CREATE TABLE` con PKs conflictivas.

---

## Decisión: Path A (recomendado para MVP)

**Path A:** Modificar el script de carga para usar **PKs text directamente** (alineado con DDL principal).

**Por qué Path A:**
1. **Migración futura evitada** — el SQL de seed y DDL principal son coherentes desde el día 1
2. **Más legible** — `LENGUAJES` es más explícito que `1` (integer)
3. **Alineado con código de aplicación** — la app referencia campos por código text
4. **Documentación oficial** — SPEC_TEC_02 §5 es la fuente de verdad

**Por qué NO Path B (serial → text en Fase 2):**
- Doble trabajo: usar serial hoy, migrar a text mañana
- Riesgo de regresión: si la migración falla, perdemos integridad referencial
- Documentación dual: hay que mantener dos versiones del schema

---

## Acción para SOFIA

**Tarea para SOFIA:** Modificar `cli.py build-sql` para generar SQL con PKs text (alineado con SPEC_TEC_02 §5).

**Cambio específico en el script:**
- Eliminar columna `id SERIAL PRIMARY KEY`
- Cambiar `id INT REFERENCES` por `codigo TEXT REFERENCES`
- Mantener `codigo TEXT UNIQUE NOT NULL` como PK

**Resultado esperado:**
- 1 solo path de SQL (sin inconsistencia)
- Seed inicial carga con códigos text directamente
- Aplicación referencia campos por código (sin JOIN extra)

---

## Verificación adicional

Una vez SOFIA modifique el script:
1. Regenerar SQL con `cli.py build-sql`
2. Validar sintaxis con pglast (script de verificación)
3. Re-auditar GEMINI-A post-cambio

---

## Si Frank prefiere Path B

- Documentar como "decisión consciente" en SPEC_TEC_02
- Migración a text en Fase 2 (~1 semana extra)
- SQL actual ejecutable sin cambios
- Aplicación actual con serial PKs funciona MVP, migración después

---

**Frank, recomiendo Path A.** ¿Procedo con la decisión o prefieres que SOFIA evalúe?
