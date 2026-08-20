# SPEC-HANDOFF — SOFIA: Resolución P2-RLS + cierre P3-N1/N2 + Unidad UI F1/F2/F3 (post-QA-20260819-05)

- **Origen:** INTEGRA
- **ID tarea:** IMPL-20260820-01 (continuación de IMPL-20260819-05, que quedó `READY_FOR_VERIFYING` con QA-20260819-05 PASS_WITH_WARNINGS)
- **Fecha:** 2026-08-20
- **SPECs activas:**
  - `specs/ADR-20260820-01.md` (ARCH-20260820-01) — decisión RLS INSERT restringida para `audit_log` (resolución P2-RLS).
  - `specs/SPEC_TEC_08_UI_IA_F1F2F3.md` (SPEC-20260820-08) — unidad UI F1/F2/F3 + AC-28 E2E.
  - `specs/SPEC_TEC_07_Capa_IA.md` v1.1 (§6.1.1, §11 AC-28, §15, §16) — capa IA (inmutable este turno).
  - `specs/ADR-20260819-02.md` (Decisiones 3/9, R-IA-10) — trazabilidad.
- **Referencias funcionales:** P-PD9 (IA sólo sugiere), D-FIN-13 (server-side + anonimizador + cero datos de menores), baseline §3.7 (F1/F2/F3).
- **QA de origen:** `specs/QA-20260819-05.md` (**PASS_WITH_WARNINGS**) — hallazgo P2-RLS (§D), P3-N1 (§D), P3-N2 (§D).
- **Estado anterior → recomendado:** `READY_FOR_VERIFYING` (IMPL-20260819-05) → `IN_PROGRESS` (este IMPL) → `READY_FOR_VERIFYING` (tras tu reporte) → re-auditoría GEMINI.

---

## Resultado

Aplicar 3 grupos de cambios **independientes entre sí** para habilitar la prueba real con Tía Lola: (A) fix DDL del P2-RLS ambiental de `audit_log`; (B) cierre de 2 hallazgos P3 cosméticos/de-cobertura de QA-05; (C) unidad UI mínima para que la docente active F1/F2/F3 desde la interfaz (desbloquea AC-28, gate de staging/producción). **Sin tocar** los routes IA, `services/ia/*`, `lib/ia/*` (inmutables; QA-05 PASS_WITH_WARNINGS). **Sin commit/push/deploy/migración aplicada** (restricción vigente; Frank autoriza).

## Alcance por grupo (3 grupos de archivos disjuntos)

### Grupo A — Fix DDL P2-RLS (`audit_log` INSERT)

**Archivos (todos NUEVOS o de migración; disjuntos de B y C):**
- `supabase/migrations/0021_audit_log_insert_rls.sql` (NUEVO, artefacto pendiente de aplicación).
- `supabase/migrations_master.sql` (editar: añadir la política INSERT de `audit_log` en la sección `audit_log` existente, ~línea 780, consistente con cómo ya mantiene `0014`).

**Contrato (ver ADR-20260820-01 §2 para el razonamiento completo):**

Política a crear en `0021` (y a reflejar en `migrations_master.sql`):
- Nombre: `audit_log_docente_insert`
- Tipo: `for insert to authenticated`
- Check: `with check (docente_id = auth.uid() and cct = user_cct())`
- Funciones helper `user_cct()` ya existen (0014:7-13); no se recrean.
- No abrir `for update`/`for delete` (la tabla es log inmutable, comment 0013:70).
- Header del archivo: declarar "ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`" (mismo patrón que `0020`).

**Test de regresión (declarar "NO EJECUTADA" en sandbox):**
- Sin Supabase local/staging (QA-05 §A), RLS cross-tenant no es ejecutable. Verifica por análisis estático: la política existe, el `with check` es correcto, el patrón es consistente con `entrega`/`bitacora` (0014:129-138).
- Si tienes Supabase local disponible (Docker), opcional: test que intente insert con `docente_id` ajeno → espera 42501. Si no, declarar "NO EJECUTADA — sin Supabase local; verificación por análisis estático (determinista para DDL)".

### Grupo B — Cierre P3-N1 + P3-N2 (QA-05 §D)

**Archivos (disjuntos de A y C):**
- `tests/unit/lib/ia-audit-post.spec.ts` (NUEVO) — P3-N1.
- `lib/ia/audit-post.ts` (editar 1 comentario, P3-N2 implícito) — ver abajo.
- `services/planeaciones/update-actions.ts` (editar 1 comentario, P3-N2) — ver abajo.

**P3-N1 — test del guard `cct` ausente de `auditPostIA`:**
- `lib/ia/audit-post.ts:65-78` (skip + `console.error` cuando `cct` es null/undefined/'') no está cubierto por ningún test (QA-05 §D P3-N1: cobertura 77.27% líneas, 80% branch; líneas 69-78 descubiertas).
- Crea `tests/unit/lib/ia-audit-post.spec.ts` con 1 test que simule `cct: null` (y `cct: undefined`, `cct: ''`) → espera `{ ok: false, skipped: true, error: { message: 'cct missing' } }` + espía `console.error` con `{ endpoint, docenteId }`. Sin insert (espía `supabase.from('audit_log').insert` no llamado).
- Patrón de mock consistente con `tests/integration/ia/variantes-bloque.spec.ts` (captura de `audit_log` inserts).

**P3-N2 — comentario inexacto en `update-actions.ts:238-239`:**
- QA-05 §D P3-N2: el comentario dice "hashShort se importa desde `@/lib/ia/audit-post`"; el archivo no importa `hashShort` (ya no lo usa; el helper vive y se usa sólo en `audit-post.ts`).
- Corrige el comentario a algo exacto (p.ej. "La trazabilidad PATCH la maneja `auditPostIA` en `@/lib/ia/audit-post`"). No hay cambio funcional; 1 línea.

### Grupo C — Unidad UI F1/F2/F3 (SPEC_TEC_08)

**Archivos (disjuntos de A y B):**
- `app/(app)/planeaciones/[id]/page.tsx` (editar: añadir sección "Bloques" + "Asistente IA", preservando Cards + botones Evaluar/Entregar/Duplicar existentes).
- `components/ia/ia-sugerencia-panel.tsx` (NUEVO, cliente) — ver SPEC_TEC_08 §4.2.
- `components/planeaciones/bloque-editor.tsx` (NUEVO, cliente) — ver SPEC_TEC_08 §4.1.
- `services/planeaciones/bloque-actions.ts` (NUEVO) — ver abajo `createBloque`/`getBloques`.
- `tests/unit/components/ia-sugerencia-panel.spec.tsx` (NUEVO) — AC-UI-2 (anti-doble-submit).
- `e2e/ia-f1.spec.ts`, `e2e/ia-f2.spec.ts`, `e2e/ia-f3.spec.ts`, `e2e/ia-errores.spec.ts` (NUEVOS) — AC-28a/b/c/d. Declarar "NO EJECUTABLES en sandbox" (sin Supabase + proveedor) salvo que tengas staging.

**Verificación previa de INTEGRA (ya hecha, te la paso para evitar SPEC-GAP):**
- `services/planeaciones/planeacion-actions.ts:266` expone `getPlaneacion(id)` → NO anida bloques (la page actual no los muestra).
- `services/planeaciones/update-actions.ts:52` expone `updateBloque` (PATCH existente, ya con `auditPostIA` POST-QA-05).
- `services/planeaciones/update-actions.ts:153` expone `updatePlaneacion` (PATCH F3 existente).
- **NO existen `createBloque` ni `getBloques(planeacionId)`** (sólo `getBloquesCatalogo` en `services/catalogo/catalogo.ts:174`, que es del catálogo M1, no de una planeación).
- **Decisión INTEGRA (no SPEC-GAP):** incluye `createBloque(input)` y `getBloques(planeacionId)` mínimos en `services/planeaciones/bloque-actions.ts` (NUEVO) como parte del alcance C. Son aditivos (no rompen contrato). Firma:
  - `getBloques(planeacionId): Promise<{ data: Bloque[] | null; ok: boolean }>` — server-side, `createClient()` + RLS (`docente_id = auth.uid() and cct = user_cct()`), select de `bloque` donde `planeacion_id = $1`.
  - `createBloque(input: { planeacionId, texto_base, ... }): Promise<{ data: Bloque | null; ok: boolean; error?: string }>` — server-side, `createClient()` + RLS, insert con `docente_id = session.docenteId`, `cct = planeacion.cct`, `origen = 'maestra'` (no `ia_sugerencia`; la IA sólo sugiere).
- Si al implementar descubres que `bloque` tiene columnas obligatorias no cubiertas por este contrato mínimo, reporta `SPEC-GAP` con la ambigüedad; INTEGRA especifica.
- El schema `bloque` está en migración 0010 (referencia `SPEC_TEC_02 §5.3`); lee la migración antes de implementar para respetar columnas NOT NULL y FKs.

**Contrato UI (ver SPEC_TEC_08 §4 para firmas de props y §5 para estados):**
- `BloqueEditor` lista/crea/edita bloques; por bloque, instancia `IASugerenciaPanel` para F1 y F2.
- `IASugerenciaPanel` maneja `idle → loading → {success|fallback_vacio|error} → {accepted|rejected}`.
- Fetch a los routes IA existentes (`/api/planeaciones/[id]/ia/*`), body según SPEC_TEC_07 §6.24-6.26. **No** llamar al proveedor desde la UI (D-FIN-13).
- Aceptar → server action `updateBloque`/`updatePlaneacion` existentes. F1/F2 → `origen='ia_sugerencia'` (o `'maestra_editado_de_ia'` si la docente edita la sugerencia antes de aceptar). F3 → `updatePlaneacion` con campos pulidos.
- F3 acepta → botón "Descargar PDF" → `GET /api/planeaciones/[id]/generar-pdf`.
- Mobile-first (Tía Lola planea en celular, `Encuesta_Tia_Lola.md`): responsive 375px+, botones ≥44px, sin scroll horizontal.
- Anti-doble-submit: botón deshabilitado durante `loading`.

## Contratos que cambian

- `audit_log` RLS: **+1 política `for insert`** (Grupo A). Sin tocar las 2 existentes `for select`.
- `app/(app)/planeaciones/[id]/page.tsx`: **+secciones Bloques + Asistente IA** (Grupo C). Cards + botones existentes preservados.
- `services/planeaciones/`: **+`bloque-actions.ts`** (`createBloque`/`getBloques`) (Grupo C). Aditivo.
- `components/ia/`: **+`ia-sugerencia-panel.tsx`** (Grupo C). Antes vacío (`.gitkeep`).
- `components/planeaciones/`: **+`bloque-editor.tsx`** (Grupo C).

## Contratos protegidos (NO tocar)

- Routes IA `app/api/planeaciones/[id]/ia/{variantes-bloque,help-redaccion,pulir-pdf}/route.ts` (QA-05 PASS_WITH_WARNINGS; la UI es consumidora).
- `lib/ia/audit-post.ts` lógica (sólo se edita comentario si P3-N2 lo requiere — ver Grupo B; el helper `auditPostIA` y `hashShort` no cambian).
- `services/ia/*`, `lib/ia/anonymizer.ts` (R-IA-10 aceptado, no aflojar).
- Migraciones 0001–0019 (intactas). `0020` (intacta, pendiente).
- `discovery/`, `fuentes/`, `SPEC_MVP_01_Modulo_Docent.md`, `.env`/`.env.local`/`.env.production`, `package.json` (sin dependencias nuevas: `fetch` nativo, componentes con shadcn/ui ya existente).

## Criterios AC (resumen; ver ADR-20260820-01 §7 y SPEC_TEC_08 §9 para el detalle testeable)

- **AC-RLS-1:** `0021` + `migrations_master.sql` contienen la política `audit_log_docente_insert` `for insert to authenticated with check (docente_id = auth.uid() and cct = user_cct())`. Verificación: `grep -n "audit_log_docente_insert" supabase/migrations/0021_audit_log_insert_rls.sql supabase/migrations_master.sql` → 1 match en cada archivo.
- **AC-RLS-2:** `0021` declara "ARTEFACTO PENDIENTE DE APLICACIÓN" en el header (no se aplica). Verificación: `grep -n "PENDIENTE DE APLICACIÓN" supabase/migrations/0021_audit_log_insert_rls.sql` → 1 match.
- **AC-P3N1:** `tests/unit/lib/ia-audit-post.spec.ts` cubre `cct: null|undefined|''` → `{ ok:false, skipped:true }` + `console.error` espía, 0 inserts. Comando: `pnpm vitest run tests/unit/lib/ia-audit-post.spec.ts` → PASS.
- **AC-P3N2:** `services/planeaciones/update-actions.ts` ya no dice "hashShort se importa desde…". Verificación: `grep -n "hashShort se importa" services/planeaciones/update-actions.ts` → 0 matches.
- **AC-UI-2:** `tests/unit/components/ia-sugerencia-panel.spec.tsx` → anti-doble-submit (botón deshabilitado en loading, 2º click no dispara 2º fetch). Comando: `pnpm vitest run tests/unit/components/ia-sugerencia-panel.spec.tsx` → PASS.
- **AC-28a/b/c/d:** specs E2E creados (`e2e/ia-f{1,2,3}.spec.ts`, `e2e/ia-errores.spec.ts`). Comando: `pnpm exec playwright test e2e/ia-*.spec.ts`. Salida esperada en sandbox: **NO EJECUTABLES** (sin Supabase + proveedor; declarar con razón); ejecutables en staging con Supabase + `AI_API_KEY` real.
- **AC-UI-1 (mobile):** `playwright_browser_resize` 375×812 → captura sin overflow horizontal (validación visual, no automatable como PASS/FAIL estricto).
- **Gates globales:** `pnpm typecheck`/`lint`/`test`/`build` → 0 errores (0 warnings nuevos; el warning preexistente `lib/supabase/server.ts:11` de QA-05 se tolera).

## Casos borde (ver SPEC_TEC_08 §7)

- Planeación sin bloques → `BloqueEditor` ofrece "Añadir bloque".
- Sugerencia igual al texto actual → "Aceptar" permitido (idempotente).
- Docente edita sugerencia antes de aceptar → `origen='maestra_editado_de_ia'`.
- 429 → UI bloquea con `Retry-After`, no reintenta automáticamente.
- `fallback_vacio` → no bloquea; la docente escribe manualmente.
- Anonymizer blocked (R-IA-10) → UI guía a reformular en minúsculas.
- 2 clicks rápidos → botón deshabilitado en loading.

## Validaciones detectadas (comandos, sin ejecutar migraciones)

- `pnpm typecheck` — 0 errores.
- `pnpm lint` — 0 errores (0 warnings nuevos).
- `pnpm test` — suite completa PASS (197 + nuevos de P3-N1 y AC-UI-2; 0 regresiones).
- `pnpm vitest run tests/unit/lib/ia-audit-post.spec.ts tests/unit/components/ia-sugerencia-panel.spec.tsx` — nuevos PASS.
- `pnpm build` — PASS; `routes-manifest.json` mantiene las 3 rutas `/api/planeaciones/[id]/ia/*`.
- `pnpm exec playwright test e2e/ia-*.spec.ts` — declarar NO EJECUTABLE en sandbox si no hay Supabase + proveedor.
- `grep -n "audit_log_docente_insert" supabase/migrations/0021_audit_log_insert_rls.sql supabase/migrations_master.sql` — 1 match por archivo (AC-RLS-1).
- `grep -rn "audit_log" app/api/planeaciones/` — sigue 11 matches (8 call-sites `auditPostIA`); la UI no añade write-sites directos.

## Restricciones

- **Sin commit/push/PR/deploy** (Frank: "no hagas commit/push/deploy todavía").
- **Sin `supabase db push`** (migración `0021` queda como artefacto pendiente; Frank autoriza la aplicación).
- **Sin service-role key** (ADR-20260820-01 descarta la Opción B; no añadir `SUPABASE_SERVICE_ROLE_KEY` a `.env`).
- **Sin dependencias nuevas** (`fetch` nativo; shadcn/ui ya existente; sin `openai`/`@upstash`).
- **Sin tocar** routes IA, `services/ia/*`, `lib/ia/anonymizer.ts`, `discovery/`, `fuentes/`, `SPEC_MVP_01`, migraciones existentes, `.env*`.
- `PROYECTO.md` no existe (prohibido ADR-01); no lo crees. La trazabilidad vive en ADR + SPEC + tu IMPL-REPORT.

## Dependencias

- ADR-20260820-01 (Grupo A) — lectura obligatoria para el contrato DDL.
- SPEC_TEC_08 (Grupo C) — lectura obligatoria para el contrato UI + AC-28.
- SPEC_TEC_07 v1.1 (referencia; no editar) — capa IA inmutable.
- `0020_ia_trazabilidad.sql` (no se aplica; referencia del patrón `for insert with check`).
- Para AC-28 E2E ejecutable: Supabase (local o staging) + `AI_API_KEY` real en Vercel (Frank). En sandbox, declarar NO EJECUTABLE.

## DoD

- AC-RLS-1, AC-RLS-2, AC-P3N1, AC-P3N2, AC-UI-2 PASS en sandbox.
- AC-28a/b/c/d specs creados; declarados NO EJECUTABLES en sandbox (sin Supabase + proveedor) **O** PASS si tienes staging.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- 0 regresiones (suite completa ≥ 197 passed + nuevos; 0 failed).
- Reporte `specs/IMPL-20260820-01_report.md` con manifiesto de archivos, criterios cubiertos, validaciones con comando+resultado, desviaciones/riesgos/SPEC-GAP, estado `READY_FOR_VERIFYING`.
- Solicitar re-auditoría GEMINI (`task` con `subagent_type='gemini'`) sobre: Grupo A (P2-RLS), Grupo B (P3-N1/N2), Grupo C (UI + AC-28). Indicar a GEMINI que verifique el contrato DDL por análisis estático (sin runtime) y la UI por lectura + tests unit (AC-UI-2); AC-28 E2E es gate de staging, no de DONE local.

## Prohibido inferir

- No inventar columnas de `bloque` no declaradas en migración 0010; lee la migración antes de implementar `createBloque`/`getBloques`.
- No aflojar el anonimizador (R-IA-10 aceptado; fail-closed preservado).
- No añadir `SUPABASE_SERVICE_ROLE_KEY` (Opción B descartada en ADR-20260820-01).
- No aplicar `supabase db push` (Frank autoriza).
- No autocompletar la sugerencia en el bloque/planeación (P-PD9; la docente debe pulsar "Aceptar").
- No llamar al proveedor desde la UI (D-FIN-13 server-side).
- No crear `PROYECTO.md` (prohibido ADR-01).
- No tocar los routes IA ni `services/ia/*` (inmutables; QA-05 PASS_WITH_WARNINGS).

---

**Paralelismo (decisión INTEGRA, §19):** los 3 grupos (A, B, C) son **disjuntos por archivos** y sin acoplamiento runtime (A es DDL puro; B es test+comentario; C es UI+services nuevos). Verificación de cero acoplamiento:
- Grupo A: `supabase/migrations/0021*.sql`, `supabase/migrations_master.sql`.
- Grupo B: `tests/unit/lib/ia-audit-post.spec.ts`, `lib/ia/audit-post.ts` (comentario), `services/planeaciones/update-actions.ts` (comentario).
- Grupo C: `app/(app)/planeaciones/[id]/page.tsx`, `components/ia/*`, `components/planeaciones/bloque-editor.tsx`, `services/planeaciones/bloque-actions.ts`, `tests/unit/components/*`, `e2e/ia-*.spec.ts`.

**Sin imports cruzados** entre los 3 grupos: A no importa a B/C; B no importa a C (sólo toca comentarios de `update-actions.ts`, que C no edita — C añade `bloque-actions.ts` nuevo, no toca `update-actions.ts`); C no importa a A/B. Sin shared lockfile, config ni barrel mutable entre grupos.

**Sin embargo:** INTEGRA no lanza SOFIA este turno (Frank no lo pidió explícitamente; el handoff es el artefacto entregable). Cuando Frank autorice, los 3 grupos **pueden paralelizarse en 2-3 Sofias** (A+B juntos por ser pequeños, o A|B|C separados) **o** ejecutarse secuencialmente. La SPEC está particionada para ambas opciones. La decisión de lanzamiento (paralelo vs secuencial, número de instancias) requiere OK de Frank.

**Fin del handoff.** Tras `READY_FOR_VERIFYING`, INTEGRA solicita re-auditoría GEMINI. Staging/producción requieren además `0021` aplicada (Frank `supabase db push`) + vars IA en Vercel (Frank) + AC-28 E2E en staging + OK explícito de Frank.
