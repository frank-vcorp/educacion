# SPEC-HANDOFF — SOFIA: Entrevista inicial del niño (entidad + RLS + UI + no-IA) — READY_FOR_SOFIA

> ⚠️ **SUPERSEDED (2026-08-20).** Este handoff corresponde a la entrevista v1 (21 ítems, DEC-20260820-01), que quedó **reemplazada** por `DEC-20260820-05` (documento completo de 3 páginas). No activar SOFIA con este contrato. Ver el handoff vigente: `specs/SPEC-HANDOFF-20260820-SOFIA-ENTREVISTA-COMPLETA.md` (IMPL-20260820-08) y la SPEC `SPEC_TEC_09_Entrevista_Inicial.md` v2.0 + `ADR-20260820-05.md`.

- **Origen:** INTEGRA
- **ID tarea:** IMPL-20260820-03
- **Fecha:** 2026-08-20
- **SPECs activas:**
  - `specs/SPEC_TEC_09_Entrevista_Inicial.md` (SPEC-20260820-09) — contrato técnico de la entrevista del niño.
  - `specs/ADR-20260820-02.md` (ARCH-20260820-02) — decisión arquitectónica.
  - `specs/DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD.md` — RESUELTO (A1/B1/C1+C2/D1, 2026-08-20). Sin bloqueos activos.
- **Referencias funcionales:** DEC-20260820-01 (entrevista MVP, plantilla literal), FND-20260820-06 (datos sensibles de menores/terceros), OQ-20260820-03 (answered), OQ-20260820-04 (open: familia fuera), SCN-20260820-04 (edición sin mezclar ciclos), SCN-20260820-05 (protegida frente a IA), D-FIN-2 (Alumno), D-FIN-15 (aviso previo, gate definitivo A1).
- **Estado anterior → recomendado:** `BLOCKED` (DISCOVERY-GAP resuelto 2026-08-20) → `READY` → `IN_PROGRESS` → `READY_FOR_VERIFYING`. **Listo para activación de SOFIA en sesión independiente vía ATLAS.**

---

## Resultado

Implementar la **entrevista inicial del niño** como capacidad MVP dentro del perfil del alumno: migración `0022` (tabla `entrevista_inicial_alumno` + RLS docente + trigger + índices, artefacto pendiente de aplicación), server actions `services/alumnos/entrevista-actions.ts` (`getEntrevista`, `upsertEntrevista`, `archivarEntrevista`, helper de aviso), UI del formulario literal de 21 ítems, y garantía estática de no-envío a IA. **No** implementar la entrevista familiar (OQ-20260820-04 open). **No** implementar exportación a PDF de la entrevista. **No** implementar `deleteEntrevista` (retención C1+C2: conservar + archivar, no borrar).

**Bloqueos:** ninguno. `DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD` está RESUELTO (A1 aviso existente como gate definitivo; B1 director sin acceso, default-deny permanente; C1+C2 conservar + archivar; D1 edición in-place). El contrato completo (tabla, cuestionario, RLS docente, exclusión del director, gate de aviso, retención/archivado, no-IA, UI, server actions) es implementable ahora como artefacto pendiente. **No** se aplica `supabase db push` ni staging/producción sin autorización expresa de Frank.

## Alcance de archivos/módulos

**Migración (Grupo A):**
- `supabase/migrations/0022_entrevista_inicial_alumno.sql` (NUEVO, ARTEFACTO PENDIENTE DE APLICACIÓN).
- `supabase/migrations_master.sql` (editar: añadir el DDL de `entrevista_inicial_alumno`, RLS docente, trigger e índices; mantener el patrón de `0020`/`0021`).

**Servicios (Grupo B):**
- `services/alumnos/entrevista-actions.ts` (NUEVO) — `getEntrevista`, `upsertEntrevista`, `archivarEntrevista`, helper de aviso. Patrón `services/alumnos/alumno-actions.ts`.
- `types/domain.ts` o `types/entrevista.ts` (NUEVO a criterio) — tipo `EntrevistaInicial` y el contrato zod de `respuestas` (21 ítems).

**UI (Grupo C):**
- `app/(app)/alumnos/alumnos-manager.tsx` (editar: añadir acción "Entrevista inicial" por fila, preservando el CRUD existente) **O** `app/(app)/alumnos/[id]/page.tsx` (NUEVO, ruta de perfil del alumno con la sección de entrevista). Decisión reversible de SOFIA (P-UX1: una pregunta/grupo por pantalla).
- `components/alumnos/entrevista-inicial-form.tsx` (NUEVO, cliente) — renderiza los 21 ítems literales en orden.

**Tests (Grupo D):**
- `tests/unit/services/alumnos/entrevista-actions.spec.ts` (NUEVO) — AC-6, AC-7.
- `tests/unit/components/entrevista-inicial-form.spec.tsx` (NUEVO) — anti-doble-submit, render de 21 ítems.
- `e2e/entrevista-inicial.spec.ts` (NUEVO) — AC-9 (declarar NO EJECUTABLE en sandbox).

## Contratos que cambian

- `supabase/migrations/0022_entrevista_inicial_alumno.sql` (NUEVO) + `migrations_master.sql` (sección nueva).
- `services/alumnos/`: +`entrevista-actions.ts` (aditivo).
- `app/(app)/alumnos/`: +acción/ruta de entrevista (aditivo; el CRUD existente se preserva).
- `components/alumnos/`: +`entrevista-inicial-form.tsx` (carpeta nueva si no existe).
- `types/`: +tipo `EntrevistaInicial` (aditivo).

## Contratos protegidos (NO tocar)

- `services/alumnos/alumno-actions.ts` (CRUD de alumnos; la entrevista es aditiva, no muta el CRUD).
- `lib/supabase/server.ts` (`createClient` sesión-docente; no service-role).
- `lib/ia/anonymizer.ts`, `lib/ia/*`, `services/ia/*`, `app/api/**/ia/*` (R-IA-10 fail-closed; la entrevista no se envía a IA; AC-8 exige 0 referencias a la tabla aquí).
- Migraciones `0001`–`0019`, `0020`, `0021` (intactas; `0022` es aditiva).
- `discovery/`, `fuentes/`, `SPEC_MVP_01_Modulo_Docente.md`, `.env*`, `package.json` (sin dependencias nuevas; shadcn/ui ya existente; zod ya en uso en `alumno-actions.ts`).
- `aceptacion_aviso_privacidad` (tabla y aviso existente; la entrevista sólo **lee** para el gate, no muta).

## Criterios AC (ver SPEC_TEC_09 §12 para el detalle testeable)

- **AC-1 (DDL):** `0022` + `migrations_master.sql` contienen `create table if not exists entrevista_inicial_alumno` con columnas §5.1 y `unique (alumno_id, ciclo_escolar, tipo_entrevista)`. `grep -n "entrevista_inicial_alumno" supabase/migrations/0022_entrevista_inicial_alumno.sql supabase/migrations_master.sql` → ≥1 match por archivo.
- **AC-2 (header pendiente):** `grep -n "PENDIENTE DE APLICACIÓN" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match.
- **AC-3 (trigger):** `grep -n "trg_entrevista_updated" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match.
- **AC-4 (RLS docente):** `grep -n "entrevista_docente_own" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match, `for all using (docente_id = auth.uid() and cct = user_cct())`.
- **AC-5 (RLS director sin acceso — decisión funcional B1):** `0022` **no** crea policy `entrevista_director_cct` (decisión funcional permanente: el director no tiene acceso). `grep -n "entrevista_director_cct" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 0 matches. No es bloqueo: es el contrato definitivo.
- **AC-6 (server actions):** `pnpm typecheck` 0 errores; `tests/unit/services/alumnos/entrevista-actions.spec.ts` cubre (a) sin aviso aceptado → error; (b) alumno ajeno → "Alumno no encontrado"; (c) upsert crea y luego actualiza la misma fila; (d) `archivarEntrevista` transiciona `completa`→`archivada` y no duplica. `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **AC-7 (cuestionario literal):** el contrato zod valida 21 ítems con `orden` 1..21 y `pregunta` idéntica a SPEC_TEC_09 §4. Test con 20 ítems → rechazo; con `pregunta` alterada → rechazo. `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **AC-8 (no-IA):** `grep -rn "entrevista_inicial_alumno" app/api services/ia lib/ia` → 0 matches.
- **AC-9 (UI E2E):** `e2e/entrevista-inicial.spec.ts` cubre abrir perfil, ver 21 ítems en orden, editar ítem 7, guardar, recargar y ver persistencia. `pnpm exec playwright test e2e/entrevista-inicial.spec.ts` → NO EJECUTABLE en sandbox sin Supabase (declarar con razón); PASS en staging.
- **AC-10 (mobile):** `playwright_browser_resize` 375×812 → sin overflow horizontal (validación visual).
- **AC-11 (archivado — decisión funcional C1+C2):** `0022` define `estado check (estado in ('borrador','completa','archivada'))` y `entrevista-actions.ts` expone `archivarEntrevista(alumnoId)` que transiciona `borrador`/`completa` → `archivada`; no expone `deleteEntrevista`. `grep -n "archivada" supabase/migrations/0022_entrevista_inicial_alumno.sql` → ≥1 match; `grep -n "archivarEntrevista" services/alumnos/entrevista-actions.ts` → 1 match; `grep -n "deleteEntrevista" services/alumnos/entrevista-actions.ts` → 0 matches. Test: archivar una `completa` → pasa a `archivada`; archivar una ya `archivada` → no duplica/no error. `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **Gates globales:** `pnpm typecheck`/`lint`/`test`/`build` → 0 errores (0 warnings nuevos).

## Casos borde

- Alumno sin entrevista → formulario en blanco con ítems 18–21 pre-poblados (18=nombre, 19=grado, 20=grupo, 21=hoy).
- Docente sin grupo activo → `upsertEntrevista` devuelve "No tienes un grupo activo" (mismo mensaje que `alumno-actions.ts:79`).
- Docente sin aviso aceptado → `upsertEntrevista` devuelve "Se requiere aceptar el aviso de privacidad antes de registrar la entrevista" (no crear fila).
- Alumno ajeno / de otro CCT → RLS rechaza; el server action devuelve "Alumno no encontrado" (sin distinguir no-existe de no-autorizado).
- Edición de una entrevista ya `completa` → permitida (DEC: "editable"); `updated_at` se refresca; el `unique` evita duplicado.
- Ítem compuesto (3, 8, 12) → una sola cadena de respuesta por ítem; el `pregunta` persistido es la línea literal completa.
- Alumno con `activo=false` (soft-delete) → la fila de entrevista se conserva (FK cascade sólo aplica a `delete` físico); la retención definida por Frank es C1+C2 (conservar + archivar, no borrar); no `deleteEntrevista`.

## Validaciones detectadas (comandos, sin ejecutar migraciones)

- `pnpm typecheck` — 0 errores.
- `pnpm lint` — 0 errores (0 warnings nuevos).
- `pnpm test` — suite completa PASS + nuevos tests (AC-6, AC-7, UI) PASS; 0 regresiones.
- `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts tests/unit/components/entrevista-inicial-form.spec.tsx` — PASS.
- `pnpm exec playwright test e2e/entrevista-inicial.spec.ts` — declarar NO EJECUTABLE en sandbox sin Supabase.
- `pnpm build` — PASS.
- `grep -rn "entrevista_inicial_alumno" app/api services/ia lib/ia` — 0 matches (AC-8).
- `grep -n "entrevista_docente_own" supabase/migrations/0022_entrevista_inicial_alumno.sql` — 1 match (AC-4).
- `grep -n "entrevista_director_cct" supabase/migrations/0022_entrevista_inicial_alumno.sql` — 0 matches (AC-5, decisión funcional B1 permanente).
- `grep -n "archivada" supabase/migrations/0022_entrevista_inicial_alumno.sql` — ≥1 match (AC-11, retención C1+C2).
- `grep -n "archivarEntrevista" services/alumnos/entrevista-actions.ts` — 1 match (AC-11).
- `grep -n "deleteEntrevista" services/alumnos/entrevista-actions.ts` — 0 matches (retención C: no borrar).
- `select polcmd, polname from pg_policies where tablename='entrevista_inicial_alumno';` (gate de staging) → 1 policy `entrevista_docente_own` (`for all`); 0 policies de director (decisión B1, permanente).

## Restricciones

- **Sin commit/push/PR/deploy** (restricción vigente del lote).
- **Sin `supabase db push`** (`0022` queda como artefacto pendiente; Frank autoriza la aplicación).
- **Sin service-role key** (la RLS de docente opera con `createClient()` sesión-docente).
- **Sin dependencias nuevas** (zod y shadcn/ui ya en uso).
- **Sin tocar** `alumno-actions.ts`, `lib/supabase/server.ts`, `lib/ia/*`, `services/ia/*`, routes IA, `anonymizer.ts`, `discovery/`, `fuentes/`, `SPEC_MVP_01`, migraciones existentes, `.env*`.
- **Sin implementar entrevista familiar** (OQ-20260820-04 open; no inferir preguntas).
- **Sin implementar `deleteEntrevista`** (retención definida por Frank: C1+C2, conservar + archivar, no borrar). Sí implementar `archivarEntrevista` (AC-11).
- **Sin tabla de versiones** (decisión funcional D1: edición in-place, sin versionado visible).
- **Sin crear `PROYECTO.md`** (prohibo por ADR-01 del repo; la trazabilidad vive en ADR + SPEC + IMPL-REPORT).
- **Sin alterar el cuestionario** (21 ítems literales en orden; el `pregunta` persistido debe ser idéntico a SPEC_TEC_09 §4).

## Dependencias

- `SPEC_TEC_09` (lectura obligatoria para el cuestionario, el modelo, la RLS y los AC).
- `ADR-20260820-02` (lectura obligatoria para el razonamiento de D9-01..D9-06).
- `DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD` (lectura obligatoria: define las decisiones A1/B1/C1+C2/D1 ya confirmadas por Frank; sin bloqueos activos).
- `services/alumnos/alumno-actions.ts:1-198` (patrón a replicar).
- `app/(app)/alumnos/alumnos-manager.tsx:1-401` (UI a extender).
- `supabase/migrations/0008_docente_director_grupo_alumno.sql:59-81` (schema `alumno` para FKs).
- `supabase/migrations/0014_rls_policies.sql:7,16,61-65` (helpers y patrón RLS).
- Para AC-9 E2E ejecutable: Supabase (local o staging) con sesión docente real.

## DoD

- AC-1..AC-11 PASS en sandbox (AC-5 = 0 matches del director por decisión funcional B1, permanente; AC-11 archivado soportado).
- AC-9 spec E2E creado; declarado NO EJECUTABLE en sandbox **O** PASS en staging.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- `DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD` RESUELTO (A1, B1, C1+C2, D1, 2026-08-20). La captura queda habilitada para usuarios reales con el gate de aviso existente.
- Reporte `specs/IMPL-20260820-03_report.md` con manifiesto de archivos, criterios cubiertos, validaciones con comando+resultado, desviaciones/riesgos/SPEC-GAP, estado `READY_FOR_VERIFYING`.
- Solicitar auditoría **GEMINI** (`task` con `subagent_type='gemini'`) sobre: modelo de datos (AC-1..AC-3), RLS docente (AC-4), exclusión del director (AC-5), no-IA (AC-8), cuestionario literal (AC-7) y archivado (AC-11). GEMINI es **obligatorio** (toca datos sensibles de menores y RLS; ADR-20260820-02 §6 / SPEC_TEC_09 §15).

## Prohibido inferir

- No inventar columnas de `entrevista_inicial_alumno` fuera de SPEC_TEC_09 §5.1.
- No crear policy de director (AC-5): el director no tiene acceso por decisión funcional B1, permanente.
- No implementar `deleteEntrevista` (retención C1+C2: conservar + archivar, no borrar). Sí implementar `archivarEntrevista` (AC-11).
- No añadir tabla de versiones (decisión funcional D1: edición in-place, sin versionado visible).
- No aflojar el `anonymizer` ni leer la tabla desde la capa IA (R-IA-10, AC-8).
- No añadir `SUPABASE_SERVICE_ROLE_KEY` (RLS docente con `createClient()`).
- No aplicar `supabase db push` (Frank autoriza).
- No crear `PROYECTO.md` (prohibido ADR-01).
- No alterar, reordenar, resumir ni sustituir las 21 preguntas del cuestionario (DEC-20260820-01).
- No inferir ni agregar preguntas familiares (OQ-20260820-04).
- No inventar un mecanismo de aviso específico nuevo (decisión A1: aviso existente D-FIN-15 como gate definitivo).

---

**Paralelismo (decisión INTEGRA, §19):** los 4 grupos (A migración, B servicios, C UI, D tests) son **disjuntos por archivos** y sin acoplamiento runtime cruzado (A es DDL puro; B expone server actions consumidos por C; D testea B y C). Sin embargo, C depende de B (la UI llama a `upsertEntrevista`/`archivarEntrevista`), y D depende de B+C. Verificación de acoplamiento: B no importa a A; C importa a B (dependencia natural cliente→server action); D importa a B y C. **Por la dependencia B→C y B→D, no son 4 grupos paralelizables.** Recomendación: **secuencial** (A puede ir primero o en paralelo por ser DDL puro disjunto; luego B; luego C+D). Default: **1 SOFIA secuencial**. INTEGRA no lanza SOFIA este turno (handoff listo para activación por ATLAS en sesión independiente).

**Fin del handoff.** Estado: `READY_FOR_SOFIA` (DISCOVERY-GAP resuelto A1/B1/C1+C2/D1). Tras `READY_FOR_VERIFYING`, INTEGRA solicita auditoría GEMINI (obligatoria por datos sensibles de menores y RLS). Staging/producción requieren además `0022` aplicada (Frank `supabase db push`) + AC-9 E2E en staging + OK explícito de Frank.
