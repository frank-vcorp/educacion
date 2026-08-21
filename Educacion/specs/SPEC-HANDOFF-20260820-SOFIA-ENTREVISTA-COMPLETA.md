# SPEC-HANDOFF — SOFIA: Entrevista inicial completa (3 bloques) — READY_FOR_SOFIA (migración aditiva `0023`)

- **Origen:** INTEGRA
- **ID tarea:** IMPL-20260820-08
- **Fecha:** 2026-08-20 (corregido: migración aditiva `0023`; `0022` inmutable)
- **SPECs activas:**
  - `specs/SPEC_TEC_09_Entrevista_Inicial.md` (SPEC-20260820-09 **v2.1**) — contrato del cuestionario v2 (3 bloques). **Revisada por hallazgo operativo:** `0022` ya aplicada remotamente y **0 filas** (Q1=0).
  - `specs/ADR-20260820-05.md` (ARCH-20260820-05, **revisado**) — cuestionario v2, dibujos como evidencia, directorio separado; **D9-12 revisada** (migración aditiva `0023`) y **D9-13 resuelta** (0 filas v1 ⇒ sin reconciliación).
  - `specs/ADR-20260820-02.md` (ARCH-20260820-02) — estructura/privacidad vigente (D9-01, D9-03..D9-08; A1/B1/C1+C2/D1).
  - `specs/DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1.md` — **RESUELTO (Q1=0)**: 0 filas remotas ⇒ no hay reconciliación ni transformación de `respuestas`; no condiciona nada de este handoff.
- **Referencias funcionales:** DEC-20260820-05 (cuestionario completo, literal, 3 bloques; supersede DEC-20260820-01), DEC-20260820-02 (privacidad), DEC-20260820-04 (separación familiar), FND-20260820-09 (entrevista v1 incompleta), OQ-20260820-04 (familia fuera), SCN-20260820-04/05/08.
- **Supersede:** `SPEC-HANDOFF-20260820-SOFIA-ENTREVISTA.md` (IMPL-20260820-03, entrevista v1 de 21 ítems).
- **Estado anterior → recomendado:** `READY_FOR_VERIFYING (v1, obsoleto)` → **`READY` → `IN_PROGRESS` → `READY_FOR_VERIFYING`** para la reimplementación v2 + migración aditiva `directorio`. **Sin sub-paso BLOCKED**: `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` RESUELTO (Q1=0, 0 filas) ⇒ no hay transformación de `respuestas`.

---

## Resultado

Reimplementar la **entrevista inicial del niño** para reproducir **literalmente** el documento completo `docx_extract/ENTREVISTA INICIAL.docx.pdf` (tres páginas) en **tres bloques**: (1) Entrevista inicial (23 preguntas), (2) Ambiente Familiar/Escuela (encabezado + 16 celdas = 2 instrucciones de dibujo como evidencia + 14 preguntas) y (3) Directorio de emergencia (4 contactos con nombre + teléfono).

**Corrección de migración (hallazgo operativo 2026-08-20):** `supabase migration list` confirma que `0022_entrevista_inicial_alumno.sql` **ya está aplicada remotamente** y que la tabla tiene **0 filas** (`select count(*)` remoto → 0). Por tanto **NO se reescribe `0022` ni se asume base vacía**. La evolución v1→v2 se materializa como **migración aditiva** `supabase/migrations/0023_entrevista_inicial_completa.sql` con un **único cambio**: añadir la columna `directorio jsonb` (`not null` + default del esqueleto literal vacío). **Sin transformación ni backfill de `respuestas`** (0 filas ⇒ no hay filas que migrar); la estructura v2 de `respuestas` se implementa en código.

Se reescriben como **código** (no migraciones): `types/entrevista.ts`, `services/alumnos/entrevista-actions.ts` y el formulario. Se conservan RLS docente (`0022`), exclusión del director (B1), gate de aviso (A1), retención C1+C2 (no delete) y edición in-place (D1). **No** se toca la entrevista familiar (`SPEC_TEC_11`).

## Alcance de archivos/módulos

**Migración (creación aditiva, no reescritura; sin aplicación):**
- `supabase/migrations/0023_entrevista_inicial_completa.sql` (**CREAR**; artefacto **pendiente de aplicación** — no ejecutar `supabase db push`). **Único cambio**: añadir `directorio jsonb` con `not null` + default del esqueleto literal vacío (SPEC §5.1). **NO** incluye transformación ni backfill de `respuestas` (D9-13 resuelta: 0 filas).
- `supabase/migrations_master.sql` (añadir sección `0023` **sin editar** la sección `0022` existente).

**Tipos (reescritura):**
- `types/entrevista.ts` — contrato v2: `EntrevistaInicialV2`, `RespuestasV2` (bloques 1 y 2), `Directorio`, `validateCuestionarioV2`, `buildRespuestasVaciasV2`, `buildDirectorioVacio`.

**Servicios (reescritura):**
- `services/alumnos/entrevista-actions.ts` — `getEntrevista`, `upsertEntrevista` (valida v2 + directorio + gate A1 + ownership), `archivarEntrevista`. Sin `deleteEntrevista`. Sin referencias a `entrevista_familiar_alumno`.

**UI (reescritura):**
- `components/alumnos/entrevista-inicial-form.tsx` — 3 bloques en orden; dibujos como carga de imagen (evidencia en Supabase Storage privado); directorio con 4 contactos (nombre + teléfono).
- `app/(app)/alumnos/entrevista-dialog-content.tsx` y `app/(app)/alumnos/alumnos-manager.tsx` — ajustar el contrato de datos (v2) sin cambiar el CRUD.

**Tests (reescritura/adición):**
- `tests/unit/services/alumnos/entrevista-actions.spec.ts` — AC-12..AC-27.
- `tests/unit/components/entrevista-inicial-form.spec.tsx` — render de 3 bloques, dibujos como carga de imagen, directorio.
- `e2e/entrevista-inicial.spec.ts` — AC-26 (declarar NO EJECUTABLE en sandbox).

## Contratos que cambian

- Columna nueva `directorio jsonb` (aditiva, `0023`; SPEC §4B.2 / §5.1): esqueleto literal inmutable + 4 contactos (`nombre` + `telefono`).
- `respuestas jsonb`: de array plano v1 (21) a objeto v2 `{ entrevista_inicial (23), ambiente_familiar_escuela: { encabezado, celdas (16) } }` (SPEC §4B.1) — **cambio de contenido**, no de DDL. La columna ya existe en `0022`. **Sin backfill**: 0 filas existentes ⇒ solo filas nuevas capturadas en v2.
- `types/entrevista.ts`, `services/alumnos/entrevista-actions.ts`, `components/alumnos/entrevista-inicial-form.tsx` — reescritos al contrato v2.

## Contratos protegidos (NO tocar)

- `supabase/migrations/0022_entrevista_inicial_alumno.sql` y `0001`–`0021` — **INMUTABLES** (`0022` ya aplicada; `git diff` sobre ellas → vacío). No renombrar, no renumerar, no editar.
- DDL/RLS/trigger/`unique` ya aplicados por `0022`: `trg_entrevista_updated`, `entrevista_docente_own`, `idx_entrevista_*`, `unique (alumno_id, ciclo_escolar, tipo_entrevista)`, check `estado`/`tipo_entrevista`, RLS default-deny del director (B1). `0023` NO los recrea ni altera.
- `entrevista_familiar_alumno` / `SPEC_TEC_11` / familia (no referenciar desde la infantil; directorio no se mezcla).
- `services/alumnos/alumno-actions.ts`, `lib/supabase/server.ts`.
- `lib/ia/*`, `services/ia/*`, `app/api/**/ia/*`, `anonymizer.ts` (AC-21: 0 referencias a la tabla y al bucket).
- `discovery/`, `fuentes/`, `SPEC_MVP_01`, `.env*`, `package.json` (sin dependencias nuevas).
- `aceptacion_aviso_privacidad` (sólo lectura para gate A1).

## Criterios AC (ver SPEC_TEC_09 §12.2)

- **AC-12..AC-17** — literalidad (23/16/4; texto idéntico a §4; duplicados y peculiaridades conservados).
- **AC-18** — dibujos como `tipo:'dibujo'` + `evidencia`, no preguntas (14 preguntas en bloque 2).
- **AC-19..AC-20** — directorio en columna propia (añadida por `0023`), sin mezclar con familiar; `nombre`+`telefono` por contacto.
- **AC-21** — no-IA extendido (tabla + bucket de evidencias con 0 referencias en capa IA).
- **AC-22** — `0023` aditiva (`add column if not exists directorio` + backfill + not null); `0022` sin cambios; `migrations_master.sql` con sección `0023`.
- **AC-23** — RLS docente intacta en `0022`; `0023` sin `create policy`/`drop policy` ni policy de director (B1).
- **AC-24** — trigger `0022` intacto; `0023` sin `create trigger`.
- **AC-25** — server actions v2 (gate A1, ownership, upsert idempotente, archivado, no delete).
- **AC-26** — UI 3 bloques (E2E; NO EJECUTABLE en sandbox).
- **AC-27** — archivado C1+C2 + edición in-place.
- **Gates globales:** `pnpm typecheck`/`lint`/`test`/`build` → 0 errores.

## Casos borde

- Alumno sin entrevista → formulario con 3 bloques vacíos; encabezados y etiquetas literales fijos; `NOMBRE DEL ALUMNO`/`FECHA` pre-poblados.
- Docente sin aviso → `upsertEntrevista` devuelve "Se requiere aceptar el aviso de privacidad antes de registrar la entrevista".
- Alumno ajeno/CCT distinto → "Alumno no encontrado".
- Evidencia de dibujo sin subir → `evidencia: null` (el espacio/instrucción persiste literal).
- Contacto del directorio sin teléfono → `telefono: ""` (vacío permitido, texto libre).
- **Filas v1 existentes:** **no existen** (confirmado: `select count(*)` remoto = 0). Todas las filas nuevas se capturan directamente en v2; no hay backfill ni conversión de `respuestas`.
- Entrevista `archivada` → read-only, sólo `archivarEntrevista` la cambia; edición de `completa` permitida (D1).

## Validaciones detectadas (comandos, sin ejecutar migraciones)

- `pnpm typecheck` / `lint` / `test` / `build` → 0 errores (0 warnings nuevos).
- `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts tests/unit/components/entrevista-inicial-form.spec.tsx` → PASS.
- `pnpm exec playwright test e2e/entrevista-inicial.spec.ts` → NO EJECUTABLE en sandbox; PASS en staging.
- `grep -rn "entrevista_inicial_alumno" app/api services/ia lib/ia` → 0 matches (AC-21).
- `grep -rn "entrevista-evidencia" app/api services/ia lib/ia` → 0 matches (AC-21).
- `grep -n "entrevista_familiar_alumno" services/alumnos/entrevista-actions.ts` → 0 matches (AC-19).
- `grep -n "add column if not exists directorio" supabase/migrations/0023_entrevista_inicial_completa.sql` → 1 match; `grep -n "directorio" supabase/migrations/0023_entrevista_inicial_completa.sql types/entrevista.ts` → ≥1 por archivo (AC-22/AC-19).
- `git diff -- supabase/migrations/0022_entrevista_inicial_alumno.sql` → vacío (0022 inmutable).
- `grep -n "create policy\|drop policy\|entrevista_director_cct" supabase/migrations/0023_entrevista_inicial_completa.sql` → 0 matches (AC-23); `grep -n "entrevista_docente_own" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match.
- `grep -n "create trigger\|trg_entrevista_updated" supabase/migrations/0023_entrevista_inicial_completa.sql` → 0 matches (AC-24); `grep -n "trg_entrevista_updated" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match.
- `grep -n "archivada" supabase/migrations/0022_entrevista_inicial_alumno.sql` → ≥1; `grep -n "archivarEntrevista" services/alumnos/entrevista-actions.ts` → 1; `grep -n "deleteEntrevista" services/alumnos/entrevista-actions.ts` → 0 (AC-27).

## Restricciones

- **Sin commit/push/PR/deploy. Sin `supabase db push`.** `0023` queda como artefacto pendiente; Frank autoriza la aplicación.
- **Sin reescribir/renombrar** `0022` ni `0001`–`0021` (inmutables). El único cambio de migración es la **creación aditiva** de `0023`.
- **Sin service-role key.** RLS docente con `createClient()` sesión-docente.
- **Sin dependencias nuevas** (zod y shadcn/ui ya en uso; Supabase Storage es parte de Supabase ya configurado).
- **Sin tocar** `alumno-actions.ts`, `lib/supabase/server.ts`, `lib/ia/*`, `services/ia/*`, routes IA, `anonymizer.ts`, `discovery/`, `fuentes/`, `SPEC_MVP_01`, `.env*`.
- **Sin transformar ni backfillear `respuestas`** en `0023` (D9-13 resuelta: 0 filas ⇒ no aplica); la estructura v2 es contrato nuevo en código.
- **Sin implementar entrevista familiar** (OQ-20260820-04 / SPEC_TEC_11; no inferir preguntas). El directorio del niño **no** va en `entrevista_familiar_alumno`.
- **Sin `deleteEntrevista`**, sin tabla de versiones (D1).
- **Sin alterar, reordenar, deduplicar ni corregir** los 3 bloques del documento (DEC-20260820-05).

## Dependencias

- `SPEC_TEC_09` **v2.1** (§4 documento literal, §4B contratos JSON, §5 migración aditiva, §12 AC) — lectura obligatoria.
- `ADR-20260820-05` **revisado** (D9-09..D9-13) y `ADR-20260820-02` (D9-01, D9-03..D9-08) — lectura obligatoria.
- `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` — **RESUELTO (Q1=0)**: no condiciona nada (0 filas ⇒ sin reconciliación).
- `docx_extract/ENTREVISTA INICIAL.docx.pdf` — autoridad literal; cualquier discrepancia con la transcripción §4 es `SPEC-GAP`.
- `services/alumnos/alumno-actions.ts:1-198`, `app/(app)/alumnos/alumnos-manager.tsx` — patrón a seguir.
- `supabase/migrations/0008_docente_director_grupo_alumno.sql:59-81`, `0014_rls_policies.sql:7,16,61-65` — FKs y patrón RLS; `0022_entrevista_inicial_alumno.sql` — DDL vigente (no editar).

## DoD

- AC-12..AC-27 PASS en sandbox (AC-23 = 0 matches director; AC-21 = 0 matches no-IA).
- AC-26 spec E2E creado; declarado NO EJECUTABLE en sandbox **O** PASS en staging.
- Guardrails §5/§11 verificado: `0022`/`0001`–`0021` sin cambios; `0023` aditiva (único cambio: `directorio`); **sin** transformación ni backfill de `respuestas` (0 filas); `supabase db push` NO ejecutado.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- Reporte `specs/IMPL-20260820-08_report.md` con manifiesto, criterios, validaciones con comando+resultado, estado `READY_FOR_VERIFYING`.
- Solicitar auditoría **GEMINI** sobre: modelo de datos (AC-22/AC-24), RLS docente + director (AC-23), no-IA (AC-21), literalidad 3 bloques (AC-12..AC-17), dibujos como evidencia (AC-18), directorio sin mezclar con familiar (AC-19/AC-20), archivado (AC-27), preservación de datos v1 (D9-13). **Obligatorio** (datos sensibles de menores, RLS, teléfonos de emergencia).

## Prohibido inferir

- No inventar preguntas familiares ni adjuntar el directorio a la entrevista familiar.
- No deduplicar los duplicados de §4.0 ni "corregir" `ENTEVISTA`/`JARDIN`/acentos/minúsculas.
- No convertir los dibujos en preguntas de texto.
- No crear policy de director (B1 permanente).
- No implementar `deleteEntrevista` (Sí `archivarEntrevista`).
- **No reescribir ni renombrar `0022`** (ya aplicada; `0023` es aditiva).
- **No transformar ni backfillear `respuestas`** en `0023` (D9-13 resuelta: 0 filas ⇒ no aplica); la estructura v2 es contrato nuevo en código.
- No aplicar `supabase db push` (Frank autoriza).
- No leer la tabla ni el bucket desde la capa IA (R-IA-10, AC-21).
- No heredar A1/B1/C1+C2/D1 hacia la familiar.

---

**Paralelismo (INTEGRA):** los archivos son una **reescritura encadenada** (tipos → server actions → UI → tests dependen del contrato v2); la migración `0023` depende del contrato de columnas. No hay dos grupos disjuntos independientes. **Recomendación: 1 SOFIA secuencial.** INTEGRA no lanza SOFIA este turno; el handoff queda `READY_FOR_SOFIA` para activación por ATLAS en sesión independiente.

**Fin del handoff.** Estado: `READY_FOR_SOFIA` (reimplementación v2 + migración aditiva `directorio`), **sin sub-paso BLOCKED**: `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` RESUELTO (Q1=0). Tras `READY_FOR_VERIFYING`, INTEGRA solicita auditoría GEMINI (obligatoria). Staging/producción requieren además `0023` aplicada (Frank `supabase db push`) + AC-26 E2E en staging + OK explícito de Frank.