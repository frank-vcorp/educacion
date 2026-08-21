# SPEC-HANDOFF — SOFIA: Entrevista familiar (migración aditiva `0024`) — READY_FOR_SOFIA

- **Origen:** INTEGRA
- **ID tarea:** IMPL-20260821-05
- **Fecha:** 2026-08-21
- **SPEC activa:** `specs/SPEC_TEC_11_Entrevista_Familiar.md` (SPEC-20260820-11 **v2.0**, revisión 2026-08-21 por `DEC-20260821-01`)
- **ADR:** `specs/ADR-20260820-04.md` (ARCH-20260820-04, **revisado 2026-08-21**; D11-01..D11-11; F-A..F-E cerradas con valores concretos por DEC-20260821-01)
- **Supersede:** `specs/SPEC-HANDOFF-20260820-SOFIA-ENTREVISTA-FAMILIAR.md` (IMPL-20260820-07, estado BLOCKED; el GAP que lo bloqueaba — `DISCOVERY-GAP-20260820-ENTREVISTA-FAMILIAR` — queda **RESUELTO** por DEC-20260821-01)
- **Referencias funcionales:** **DEC-20260821-01** (cuestionario literal, captura por maestras autorizadas, ubicación separada, no-envío a IA, sin inventar campos/usos), DEC-20260820-04 (ubicación conjunta + separación + literalidad + relación alumno/grupo/ciclo), DEC-20260820-02 (privacidad infantil — referencia, no heredada), DEC-20260820-05 (infantil completa — referencia), FND-20260820-08 (datos de terceros), OQ-20260820-07 (answered), OQ-20260820-04 (answered), SCN-20260820-08, BR (no mezcla/no-IA/no herencia), D-FIN-15.
- **Estado anterior → recomendado:** `BLOCKED` (F-A..F-E pendientes, IMPL-20260820-07) → **`READY` → `IN_PROGRESS` → `READY_FOR_VERIFYING`** para la captura familiar autorizada. `DISCOVERY-GAP-20260820-ENTREVISTA-FAMILIAR` queda **RESUELTO** por DEC-20260821-01; no hay sub-paso bloqueante.

---

## Resultado

Implementar la **entrevista familiar** como nueva sección dentro del contenedor `Perfil del alumno → Entrevistas` (junto a `Entrevista del niño`, ya implementada), reproduciendo **literalmente** el documento `docx_extract/NUEVA ENTREVISTA.pdf` (6 bloques: encabezado + identificación; tabla mamá/papá; situación legal con casillas; padres separados condicional; 15 ítems de hábitos familiares numerados con salto 14→16; cierre literal + bloques de firma con nombre tecleado). Sin inventar campos ni usos (DEC-20260821-01). La captura es por maestras autorizadas, ligada a alumno/grupo/ciclo, con gate de aviso existente, RLS única de docente (director sin acceso), retención conservar+archivar, edición in-place y firma como nombre tecleado (sin imagen, sin valor legal de firma manuscrita).

La entrevista se materializa como **migración aditiva** `supabase/migrations/0024_entrevista_familiar_alumno.sql` (tabla nueva, **independiente** de `entrevista_inicial_alumno`; sin tocar `0001`–`0023`). La infantil permanece intacta. El artefacto de migración queda **pendiente de aplicación** — SOFIA no ejecuta `supabase db push`; Frank autoriza.

---

## Alcance de archivos/módulos

**Migración (creación aditiva, no aplicación):**
- `supabase/migrations/0024_entrevista_familiar_alumno.sql` (**CREAR**; artefacto **pendiente de aplicación** — no ejecutar `supabase db push`). Crea la tabla nueva con: columnas (id, alumno_id, grupo_id, docente_id, cct, ciclo_escolar, respuestas jsonb con default del esqueleto literal §4.2, fecha_aplicacion, estado, created_at, updated_at), `unique (alumno_id, ciclo_escolar)`, índices (`idx_entrevista_familiar_alumno`, `idx_entrevista_familiar_docente`, `idx_entrevista_familiar_grupo_ciclo`), trigger `trg_entrevista_familiar_updated` (función canónica `set_updated_at()` de `0015`), `alter table ... enable row level security`, policy única `entrevista_familiar_docente_own` (patrón idéntico a `entrevista_docente_own` `0022:61-64`), `comment on table ...`. **NO** crea policy de director (D11-08 / B1). **NO** crea columna/tabla de versiones (D11-10). **NO** crea bucket de imágenes para firma (D11-11).
- `supabase/migrations_master.sql` — añadir la sección `0024` **sin editar** las secciones `0022`/`0023` existentes.

**Tipos (creación):**
- `types/entrevista-familiar.ts` — contrato: `EntrevistaFamiliarV1`, `RespuestasFamiliarV1`, `BloqueProgenitor`, `BloqueHabito`, `BloqueCierre`, `BloqueFirmas`, `validateCuestionarioFamiliarV1`, `buildRespuestasFamiliaresVaciasV1`. Validación literal byte-a-byte contra §4.1.

**Servicios (creación):**
- `services/alumnos/entrevista-familiar-actions.ts` — `'use server'`. Funciones:
  - `getEntrevistaFamiliar(alumnoId): Promise<{ data: EntrevistaFamiliarV1 | null; ok: boolean; error?: string }>`
  - `upsertEntrevistaFamiliar(input: { alumnoId; fechaAplicacion; estado; respuestas }): Promise<{ ok: boolean; error?: string; id?: string }>` — valida §4.2 + literalidad §4.1 + gate D11-07 + ownership; upsert por `(alumno_id, ciclo_escolar)`.
  - `archivarEntrevistaFamiliar(alumnoId)` — transiciona a `archivada`; idempotente.
  - **Sin** `deleteEntrevistaFamiliar`. **Sin** referencias a `entrevista_inicial_alumno`.

**UI (creación + integración del contenedor):**
- `components/alumnos/entrevista-familiar-form.tsx` — formulario con los 6 bloques §4.1 en orden literal; textos no editables; sub-campos adyacentes; casillas booleanas; tabla mamá/papá; firma = dos campos de texto (`nombreMama`, `nombrePapa`); estados `borrador`/`completa`/`archivada`.
- `app/(app)/alumnos/entrevista-dialog-content.tsx` — ajustar el contenedor a **dos pestañas** (`Entrevista del niño` | `Entrevista familiar`). La pestaña infantil sigue con `EntrevistaInicialForm` intacto; la familiar carga el nuevo formulario. Sin scroll horizontal 375×812; anti-doble-submit.
- `app/(app)/alumnos/alumnos-manager.tsx` — punto de entrada "Entrevista" sin cambios de contrato (sigue abriendo el contenedor con dos pestañas).

**Tests (creación):**
- `tests/unit/services/alumnos/entrevista-familiar-actions.spec.ts` — AC-FF1, AC-FF2, AC-FF8, AC-FF9, AC-FF10, AC-FF11.
- `tests/unit/components/entrevista-familiar-form.spec.tsx` — render de 6 bloques; literalidad visible; tabla mamá/papá; casillas situación legal; 15 ítems numerados con salto 14→16; firma con dos inputs de texto.
- `e2e/entrevistas-contenedor.spec.ts` — AC-FF5 (declarar NO EJECUTABLE en sandbox sin Supabase; PASS en staging).

---

## Contratos que cambian

- Tabla nueva `entrevista_familiar_alumno` (aditiva, `0024`; SPEC §5): columnas estructurales + `unique (alumno_id, ciclo_escolar)` + `estado` check + `cct` para RLS + `respuestas jsonb` con default esqueleto literal §4.2.
- `respuestas jsonb`: contrato por bloques §4.2 (identificación, mamá, papá, situaciónLegal, padresSeparados, habitosFamiliares, cierre, firmas). Validación zod server-side.
- `types/entrevista-familiar.ts`, `services/alumnos/entrevista-familiar-actions.ts`, `components/alumnos/entrevista-familiar-form.tsx` — nuevos.
- `app/(app)/alumnos/entrevista-dialog-content.tsx` — pasa de un solo diálogo a contenedor con dos pestañas.

## Contratos protegidos (NO tocar)

- `supabase/migrations/0001`–`0023` — **INMUTABLES** (`0022` aplicada; `0023` aditiva de la infantil pendiente Frank; ambas no se renumeran ni se reescriben). `git diff` sobre ellas → vacío.
- `entrevista_inicial_alumno` (migración `0022`/`0023`), `services/alumnos/entrevista-actions.ts`, `components/alumnos/entrevista-inicial-form.tsx`, `types/entrevista.ts` — **NO TOCAR** (la infantil permanece intacta).
- `services/alumnos/alumno-actions.ts`, `lib/supabase/server.ts`.
- `lib/ia/*`, `services/ia/*`, `app/api/**/ia/*`, `anonymizer.ts` (AC-FF7: 0 referencias a `entrevista_familiar_alumno` y a `entrevista_inicial_alumno`; AC-FF4: 0 matches de `entrevista_familiar_director_cct`).
- `aceptacion_aviso_privacidad` (solo lectura para gate D11-07; no se modifica su DDL).
- `discovery/`, `fuentes/`, `SPEC_MVP_01`, `.env*`, `package.json` (sin dependencias nuevas; sin nuevas APIs; sin buckets de Storage).
- `app/(app)/alumnos/alumnos-manager.tsx` no cambia contrato del punto de entrada (sigue abriendo el contenedor con dos pestañas tras el ajuste mínimo de `entrevista-dialog-content.tsx`).
- **No** crear tabla de versiones / historial (D11-10).
- **No** crear bucket de Storage para firma (D11-11).
- **No** inventar campos/usos adicionales a los del PDF (DEC-20260821-01).

---

## Criterios AC (ver SPEC_TEC_11 §12)

**Literalidad:**
- **AC-FF1** — cuestionario literal §4: 6 bloques (A identificación, B mamá/papá, C situación legal, D padres separados, E 15 hábitos con `orden` ∈ {1..14,16}, F cierre + firmas); `validateCuestionarioFamiliarV1` rechaza orden/distinto/texto alterado/cierre alterado. `pnpm vitest run tests/unit/services/alumnos/entrevista-familiar-actions.spec.ts` → PASS.
- **AC-FF2** — peculiaridades preservadas: salto 14→16 (sin 15), `escorar` (sic) en 13, `limites` sin tilde en 10/11, `ocupación` con minúscula, `SITUACION LEGAL` / `HABITOS FAMILIARES` sin tilde, bloques de firma literales. Comparación byte-a-byte. `pnpm vitest` → PASS.

**Modelo de datos / RLS / no-IA:**
- **AC-FF3** — `0024` aditiva: tabla + RLS habilitada + policy `entrevista_familiar_docente_own` + trigger `trg_entrevista_familiar_updated` + `unique (alumno_id, ciclo_escolar)` + `comment on table`; `migrations_master.sql` con sección `0024`; `git diff -- supabase/migrations/0022_entrevista_inicial_alumno.sql supabase/migrations/0023_entrevista_inicial_completa.sql` → vacío.
- **AC-FF4** — RLS única docente + sin policy de director. `grep -n "entrevista_familiar_docente_own" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 1; `grep -n "entrevista_familiar_director_cct" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0; `grep -rn "entrevista_familiar_alumno" app/api services/ia lib/ia` → 0.
- **AC-FF7** — no-IA: `grep -rn "entrevista_inicial_alumno\|entrevista_familiar_alumno" app/api services/ia lib/ia` → 0; `grep -rn "entrevista-familiar" app/api services/ia lib/ia` → 0.

**Separación:**
- **AC-FF6** — `grep -n "entrevista_familiar_alumno" services/alumnos/entrevista-actions.ts` → 0; `grep -n "entrevista_inicial_alumno" services/alumnos/entrevista-familiar-actions.ts` → 0; el formulario infantil no consulta la tabla familiar ni viceversa.

**Comportamiento / UI:**
- **AC-FF5** — contenedor con dos pestañas. Playwright E2E `e2e/entrevistas-contenedor.spec.ts`: abrir contenedor, ver ambas pestañas, pestaña familiar muestra cuestionario literal §4, llenar un ítem, guardar y ver persistencia al recargar. NO EJECUTABLE en sandbox sin Supabase; PASS en staging.
- **AC-FF8** — gate D11-07: sin `aceptacion_aviso_privacidad` activa → error de gate; con aviso → ok. `pnpm vitest` → PASS.
- **AC-FF9** — edición in-place D11-10: `unique (alumno_id, ciclo_escolar)`; segunda llamada `upsertEntrevistaFamiliar` actualiza el mismo registro (`updated_at` se incrementa). `pnpm vitest` → PASS.
- **AC-FF10** — archivado D11-09: `grep -n "deleteEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` → 0; `grep -n "archivarEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` → 1; `grep -rn "entrevista_familiar.*version" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0.
- **AC-FF11** — firma D11-11 / E1: `firmas.nombreMama`/`nombrePapa` son strings; sin storage de imágenes, sin hash, sin certificado. `grep -rn "firma.*storage\|firma.*upload\|firma.*image\|firma_imagen\|firma_hash" services supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0; `grep -n "nombreMama\|nombrePapa" services/alumnos/entrevista-familiar-actions.ts types/entrevista-familiar.ts` → ≥1 por archivo.

**Gates globales:** `pnpm typecheck`/`lint`/`test`/`build` → 0 errores (0 warnings nuevos). La suite infantil sigue PASS (sin regresiones).

---

## Casos borde

- Alumno sin entrevista familiar → formulario con 6 bloques vacíos; `NOMBRE DEL ALUMNO` derivable de `alumno.nombre` (confirmable), `FECHA DE NACIMIENTO` vacía; esqueleto de `respuestas` con `padresSeparados: null` y `habitosFamiliares.items` con 15 entradas vacías.
- Docente sin aviso de privacidad → `upsertEntrevistaFamiliar` retorna error de gate (mismo mensaje que la infantil).
- Alumno ajeno / CCT distinto → "Alumno no encontrado".
- Bloque C con `casados` o `unión libre` marcados → `padresSeparados` se guarda como `null`; los campos del bloque D no se muestran (no se persisten como nulls vacíos).
- Bloque C con `divorciados` o `madreSoltera` marcados → `padresSeparados` se persiste con los tres campos (puede ser texto vacío si la docente deja la sección en blanco al archivar).
- Edición in-place D11-10: si la docente abre una entrevista existente y la modifica, se actualiza la misma fila (`updated_at` se incrementa vía trigger).
- Archivo `archivada`: tras archivar, la pestaña familiar muestra la entrevista en lectura (con aviso de "archivada"); `archivarEntrevistaFamiliar` es idempotente.
- Sin borrado físico: ninguna ruta permite `DELETE`; el server action no expone `deleteEntrevistaFamiliar`.
- Mobile 375×812: el contenedor con dos pestañas no debe generar scroll horizontal; cada bloque respeta P-UX1 (una pregunta/grupo por pantalla).
- Si SOFIA detecta discrepancia entre la transcripción §4.1 y el PDF, la reporta como `SPEC-GAP`/`DISCOVERY-GAP` y **no** normaliza silenciosamente.

---

## Validaciones detectadas (carcasa + modelo + comportamiento)

- `pnpm typecheck` / `lint` / `test` / `build` → 0 errores.
- `pnpm vitest run tests/unit/services/alumnos/entrevista-familiar-actions.spec.ts tests/unit/components/entrevista-familiar-form.spec.tsx` → PASS (AC-FF1, AC-FF2, AC-FF8, AC-FF9, AC-FF11).
- `pnpm exec playwright test e2e/entrevistas-contenedor.spec.ts` → NO EJECUTABLE en sandbox sin Supabase; PASS en staging (AC-FF5).
- `grep -rn "entrevista_inicial_alumno\|entrevista_familiar_alumno" app/api services/ia lib/ia` → 0 (AC-FF7).
- `grep -n "entrevista_familiar_alumno" services/alumnos/entrevista-actions.ts` → 0; `grep -n "entrevista_inicial_alumno" services/alumnos/entrevista-familiar-actions.ts` → 0 (AC-FF6).
- `grep -n "entrevista_familiar_docente_own" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 1; `grep -n "entrevista_familiar_director_cct" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0 (AC-FF4).
- `grep -n "create table if not exists entrevista_familiar_alumno" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 1 (AC-FF3); `grep -n "0024" supabase/migrations_master.sql` → ≥1.
- `grep -n "deleteEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` → 0; `grep -n "archivarEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` → 1 (AC-FF10).
- `grep -rn "firma.*storage\|firma.*upload\|firma.*image\|firma_imagen\|firma_hash" services supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0; `grep -n "nombreMama\|nombrePapa" services/alumnos/entrevista-familiar-actions.ts types/entrevista-familiar.ts` → ≥1 por archivo (AC-FF11).
- `git diff -- supabase/migrations/0022_entrevista_inicial_alumno.sql supabase/migrations/0023_entrevista_inicial_completa.sql` → vacío (inmutables).

---

## Restricciones

- **Sin commit/push/PR/deploy.** Sin `supabase db push` (Frank autoriza la aplicación de `0024`).
- **Sin reescribir ni renumerar** `0001`–`0023`. `0022` (aplicada) y `0023` (aditiva de la infantil, pendiente) son **inmutables**.
- **Sin tocar** `entrevista_inicial_alumno`, `entrevista-actions.ts`, `entrevista-inicial-form.tsx`, `types/entrevista.ts` (la infantil permanece intacta).
- **Sin inventar** campos, usos, consentimiento específico, política de retención alternativa, formato de firma con valor legal, ni bucket de imágenes para firma (DEC-20260821-01; D11-07..D11-11).
- **Sin service-role key** en el flujo de usuario.
- **Sin paralelizar** SOFIA (una sola sesión: cohesión de schema/actions/form/UI; sin grupos disjuntos).
- **Sin crear `PROYECTO.md`** (convención del repo: trazabilidad en ADR + SPEC + handoff + reporte).
- **Sin usar Agent Manager** para esta tarea.

---

## Dependencias

- `SPEC_TEC_11` v2.0 (§4 cuestionario literal; §5 modelo de datos `0024`; §6 UI; §7 RLS D11-08; §8 no-IA D11-04; §9 acciones; §10 retención/edición; §11 migración; §12 AC-FF1..AC-FF11).
- `ADR-20260820-04` revisado (D11-01..D11-11; §3.7 cierre F-A..F-E).
- `SPEC_TEC_09` v2.1 + `ADR-20260820-05` (patrón de la infantil; sin tocar).
- `discovery/DECISIONS.md` DEC-20260821-01, DEC-20260820-04, DEC-20260820-02, DEC-20260820-05.
- `docx_extract/NUEVA ENTREVISTA.pdf` (autoridad literal §4).
- Código observado (punto de entrada a integrar): `app/(app)/alumnos/alumnos-manager.tsx:125-134,245-280`, `app/(app)/alumnos/entrevista-dialog-content.tsx:1-60`, `components/alumnos/entrevista-inicial-form.tsx:1-260` (intacta), `services/alumnos/entrevista-actions.ts:1-304` (intacta), `types/entrevista.ts:1-188` (intacta), `supabase/migrations/0022_entrevista_inicial_alumno.sql:1-73` (intacta, aplicada), `supabase/migrations/0023_entrevista_inicial_completa.sql` (intacta, pendiente Frank).

---

## DoD

- AC-FF1..AC-FF11 PASS en sandbox; GEMINI PASS/PASS_WITH_WARNINGS (auditoría obligatoria de modelo de datos + RLS + no-IA + literalidad + separación + gate + edición + archivado + firma).
- `pnpm typecheck`/`lint`/`test`/`build` PASS; sin regresiones de la suite infantil.
- Guardrails verificados: `git diff` sobre `0001`–`0023` → vacío; `0024` aditiva con tabla propia, RLS única docente, sin policy de director, sin borrado físico; `supabase db push` NO ejecutado.
- Reporte `specs/IMPL-20260821-05_report.md` con manifiesto, criterios cubiertos, validaciones con comando+resultado, estado `READY_FOR_VERIFYING`.
- Tras GEMINI PASS, INTEGRA mueve a `DONE (pendiente-prod)` y solicita a ATLAS sincronización con CRONISTA; staging y producción requieren autorización separada.

---

## Prohibido inferir

- No agregar campos fuera del PDF (DEC-20260821-01).
- No usar `tipo_entrevista='familia'` en `entrevista_inicial_alumno` (D11-01: tabla dedicada).
- No crear policy de director (D11-08).
- No exponer `deleteEntrevistaFamiliar` ni crear borrado físico (D11-09).
- No crear tabla de versiones ni historial visible (D11-10).
- No crear bucket de imágenes ni hash para firma; no asignar valor legal de firma manuscrita (D11-11).
- No enviar ninguna respuesta, firma, teléfono, situación legal o dato familiar a IA (D11-04; DEC-20260821-01).
- No alterar el cuestionario infantil ni el familiar (literalidad).
- No ejecutar `supabase db push` ni `git commit`/`push` (Frank autoriza).

---

**Paralelismo:** no aplica — una sola SOFIA. La especificación es cohesiva (tabla + RLS + acciones + form + UI del contenedor comparten el mismo contrato §4 y la misma decisión D11-01..D11-11). Sin grupos disjuntos.

**Fin del handoff.** Estado: **`READY_FOR_SOFIA`**. Migración aditiva `0024_entrevista_familiar_alumno.sql` (única delegada; sin aplicación). INTEGRA solicita a ATLAS la transición `READY → IN_PROGRESS` (CRONISTA la aplica en sesión independiente). Tras SOFIA → `READY_FOR_VERIFYING`, GEMINI audita y, con PASS, INTEGRA declara `DONE` y solicita a ATLAS sincronización con CRONISTA.
