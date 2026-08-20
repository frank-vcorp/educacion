# SPEC-HANDOFF-20260819-SOFIA-IA — Implementación de la capa IA (F1/F2/F3)

- **Origen:** INTEGRA
- **ID tarea:** `IMPL-20260819-04` (propuesto; CRONISTA asigna el definitivo)
- **SPEC activa:** `specs/SPEC_TEC_07_Capa_IA.md` v1.0
- **ADR:** `specs/ADR-20260819-02.md` (ID lógico `ARCH-20260819-03`)
- **Fecha:** 2026-08-19
- **Estado del handoff:** LISTO para delegación cuando Frank autorice lanzar SOFIA vía `task` con `subagent_type='sofia'`. **No lanzar este turno sin OK explícito de Frank.**

---

## Referencias funcionales

- `SPEC_MVP_01_Modulo_Docente.md` v0.14 §3.7 (F1/F2/F3 + política proveedor único sin fallback).
- `fuentes/E22_CIERRE_DISCOVERY.md` §D-FIN-13 (server-side + anonimizador + cero datos de menores).
- `discovery/FINDINGS.md` §FND-20260819-05 (P1, gap a cerrar).
- `discovery/BUSINESS-RULES.md` (regla dura LFPDPPP: cero datos de menores a IA).

## Resultado

Implementar tres endpoints API Route (F1/F2/F3) + cliente IA + rate-limiter + cache + ampliación del anonimizador + tests, conforme a `SPEC_TEC_07_Capa_IA.md`. Cerrar `FND-20260819-05`. Dejar la unidad en `READY_FOR_VERIFYING` para que INTEGRA decida DONE tras GEMINI.

## Alcance de archivos/módulos

### Crear (nuevo)

- `app/api/planeaciones/[id]/ia/variantes-bloque/route.ts` (F1)
- `app/api/planeaciones/[id]/ia/help-redaccion/route.ts` (F2)
- `app/api/planeaciones/[id]/ia/pulir-pdf/route.ts` (F3)
- `services/ia/client.ts` (cliente IA, `fetch` nativo)
- `services/ia/rate-limiter.ts` (in-memory, 5 req/min)
- `services/ia/cache.ts` (in-memory, 30 días para F1)
- `services/ia/prompts.ts` (system prompts F1/F2/F3; SOFIA redacta respetando §4.3 de SPEC_TEC_07)
- `supabase/migrations/0020_ia_trazabilidad.sql` (artefacto PENDIENTE de aplicación; **no ejecutar `supabase db push`**)
- Tests:
  - `tests/unit/services/ia/client.spec.ts`
  - `tests/unit/services/ia/rate-limiter.spec.ts`
  - `tests/unit/services/ia/cache.spec.ts`
  - `tests/unit/services/ia/variantes-bloque.spec.ts` (validación post-IA estructura)
  - `tests/unit/services/ia/help-redaccion.spec.ts`
  - `tests/unit/services/ia/pulir-pdf.spec.ts`
  - `tests/helpers/mock-minimax.ts` (mock del proveedor OpenAI-compatible; nombre histórico, cubre cualquier `AI_PROVIDER`)
  - `tests/integration/ia/variantes-bloque.spec.ts` (flujo completo con mock proveedor)
  - `tests/integration/ia/help-redaccion.spec.ts`
  - `tests/integration/ia/pulir-pdf.spec.ts`

### Ampliar (existente)

- `lib/ia/anonymizer.ts`: ampliar `anonymizeRequest` para cubrir campos que F1/F2/F3 envían (`texto_base`, `variante_tipo`, campos de planeación). Los patrones regex existentes (CURP, CCT, EMAIL, CELULAR, NOMBRES) ya cubren la PII; el cambio es de shape de entrada, no de patrones. Definir criterio de "PII irredactable" para emitir `NEM_IA_ANONYMIZER_BLOCKED`.
- `tests/unit/lib/ia-anonymizer.spec.ts`: ampliar casos para F1/F2/F3 (regla dura cero datos de alumnos, AC-22).

### Leer (referencia, no editar)

- `app/api/recursos-aula/ia-sugerir-uso/route.ts` — patrón canónico de endpoint IA (auth, zod, RLS, envelope `{ data }`/`{ error }`).
- `services/recursos-aula/sugerir-uso.ts` — F-IA1 determinista (sin cambio; nota línea 5 ya prevé el wrapper IA).
- `lib/pdf/generate.ts` — renderer PDF. **No acoplar a IA** (AC-16: grep `services/ia` en `lib/pdf/generate.ts` → 0 matches).
- `services/planeaciones/planeacion-actions.ts` — actions existentes (`createPlaneacion`, `getPlaneacion`, `duplicarPlaneacion`, `listGruposDocente`). Si no existe `updatePlaneacion`/`updateBloque` para persistir variantes aceptadas, créalos siguiendo el patrón de `createPlaneacion` (zod + RLS + `audit_log`).
- `lib/auth/session.ts` — `getServerSession()`.
- `lib/supabase/server.ts` — `createClient()`.
- `specs/SPEC_TEC_02_Modelo_Datos.md` §5.3 — `bloque.origen` check, `planeacion` columnas, `audit_log`.

### Prohibido tocar

- `discovery/*`, `fuentes/*`, `SPEC_MVP_01_Modulo_Docente.md` (ownership ATLAS/Frank).
- `supabase/migrations/0001-0019*.sql` existentes (no modificar migraciones aplicadas).
- `app/api/recursos-aula/ia-sugerir-uso/route.ts` y `services/recursos-aula/sugerir-uso.ts` (F-IA1 sin cambio).
- `lib/pdf/generate.ts` (renderer sin acoplamiento IA; AC-16).
- `.env`, `.env.local`, `.env.production`, `package.json` (sin dependencias nuevas), `next.config.mjs`, manifests.
- `specs/SPEC_TEC_01..06` (ownership INTEGRA; SOFIA no edita SPECs).

## Contratos que cambian

- **Nuevos endpoints:** E24 (F1), E25 (F2), E26 (F3) en rutas reales `/api/planeaciones/[id]/ia/...` (sin `/v1/`).SPEC_TEC_03 §6.24-6.26 ya corregido por INTEGRA.
- **Nuevos códigos de error:** `NEM_IA_VARIANTE_TIPO_NO_SOPORTADO` (422, F1 `plurilingue` Fase 2). Reutiliza `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA` (422) para F3 PDA no en catálogo (con `details.campo`).
- **Nuevos módulos server-only:** `services/ia/*`.
- **Ampliación de `lib/ia/anonymizer.ts`:** shape de `anonymizeRequest`.

## Contratos protegidos

- **D-FIN-13:** server-side + anonimizador + cero datos de menores. Inviolable.
- **P-PD8:** IA no altera PDA/campos/ejes. Validación post-IA obligatoria.
- **P-PD9:** IA sólo sugiere; F1/F2/F3 no persisten automáticamente. La maestra acepta vía PATCH.
- **"Proveedor único sin fallback" (baseline §3.7):** sin fallback automático. Degradación graceful `fallback_vacio`, no reintento a otro proveedor.
- **`bloque.origen` check:** `'maestra','ia_sugerencia','maestra_editado_de_ia','kit_template'` (no añadir valores nuevos).
- **`lib/pdf/generate.ts` closure (ADR-01):** lifecycle chromium, hash determinista, footer determinista. No introducir dependencia IA.
- **Envelope `{ data }`/`{ error: { code, message } }`:** respetar formato de F-IA1 y resto de la API.
- **Rate-limit 5 req/min por docente en `/ia/*` (SPEC §7.1):** sin alterar el límite.

## Criterios AC (resumen; ver SPEC_TEC_07 §11 para detalle testable)

- **AC-1 a AC-6:** F1 (200 con `origen` correcto, 422 estructura violada, 200 fallback sin key, 429 rate-limit, 200 cache hit, 200 cache miss con `forzar_refresh`).
- **AC-7 a AC-11:** F2 (200, no persiste automáticamente, anonimización de `texto_base`, 422 validation < 5 chars, PATCH posterior con `origen='ia_sugerencia'` + trazabilidad `audit_log`).
- **AC-12 a AC-17:** F3 (200 con `campos_pulidos`, 422 array vacío, 422 enum inválido `"objetivo"`, 422 PDA no en catálogo, `lib/pdf/generate.ts` sin import `services/ia`, PATCH + generar-pdf con campos persistidos).
- **AC-18 a AC-27:** cross-cutting (`pnpm typecheck`/`lint`/`test`/`build` PASS; cobertura anonymizer 100% y `services/ia/**` ≥90%; regla dura cero datos de alumnos AC-22; `NEXT_PUBLIC_AI` 0 matches; `openai`/`@upstash` 0 en package.json; `AI_API_KEY` sólo vía `process.env`; migración 0020 existe sin aplicar; sin commits/push).
- **AC-28:** Playwright E2E cubriendo flujos F1/F2/F3 (gate de staging/producción, no de DONE local).

## Casos borde (ver SPEC_TEC_07 §8)

- `AI_API_KEY` vacía → 200 `fallback_vacio`, no 5xx.
- Proveedor cae / timeout > 8s → 200 `fallback_vacio`.
- Rate-limit excedido → 429 `NEM_RATE_LIMIT_EXCEEDED` + `Retry-After`.
- Anonimizador detecta PII irredactable → 500 `NEM_IA_ANONYMIZER_BLOCKED`.
- Respuesta F1 altera PDA/campos/ejes → 422 `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA`.
- Respuesta F3 introduce PDA no en catálogo → 422 con `details.campo`.
- `variante_tipo='plurilingue'` → 422 `NEM_IA_VARIANTE_TIPO_NO_SOPORTADO`.
- `texto_base` < 5 o > 1000 chars → 422 `VALIDATION`.
- `campos_a_pulir` vacío o con `"objetivo"` → 422 `VALIDATION`.
- Respuesta F3 no es JSON válido → 200 `fallback_vacio`, `campos_pulidos: []` (no 422).
- Planeación archivada → 409 `NEM_PLANEACIONES_ARCHIVED`.

## Validaciones detectadas (comandos)

```bash
pnpm typecheck                       # AC-18: 0 errores
pnpm lint                            # AC-19: 0 errores
pnpm test                            # AC-20: PASS (suite + nuevos IA)
pnpm build                           # AC-21: PASS
PDF_GENERATOR=playwright pnpm test    # smoke chromium real si toca PDF
```

Salida esperada: todos PASS sin regresión. SOFIA debe ejecutar `pnpm install` (no necesario: sin dependencias nuevas) + typecheck + lint + tests + build antes de declarar `READY_FOR_VERIFYING`. Si sandbox no permite alguna, declarar "NO EJECUTADA" con razón.

## Restricciones

- **Sin commits, push, PR, staging ni producción** (restricción vigente ADR-01).
- **Sin migraciones aplicadas:** escribir `supabase/migrations/0020_ia_trazabilidad.sql` como artefacto pendiente; **no ejecutar `supabase db push`**.
- **Sin dependencias nuevas:** `fetch` nativo; rate-limiter y cache in-memory. No `openai`, no `@upstash/ratelimit`.
- **Sin tocar** `discovery/`, `fuentes/`, `SPEC_MVP_01_Modulo_Docente.md`, migraciones existentes, `.env*`, `package.json`, manifests.
- **Cliente IA no hardcodea proveedor:** lee `AI_PROVIDER`/`AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`/`AI_TIMEOUT_MS` vía `process.env` (server-only). Nunca loggear `AI_API_KEY`.
- **`lib/pdf/generate.ts` no se acopla a IA** (AC-16).
- **System prompts sin PII:** plantillas estáticas; contenido variable va en `user` message tras `anonymizeRequest`.
- **WIP=1:** una instancia SOFIA; los endpoints F1/F2/F3 + servicios IA comparten `services/ia/*` y `lib/ia/anonymizer.ts` → **secuencial** (no paralelizable: conjuntos de archivos no disjuntos, comparten `services/ia/` y `lib/ia/`).

## Dependencias

- **Disponibles ya:** `zod`, `@supabase/ssr`, `@supabase/supabase-js`, `next` (API Routes), `vitest`, `@testing-library/react`, `playwright`. Sin necesidad de `pnpm install` de paquetes nuevos.
- **Vars de entorno:** `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_RATE_LIMIT_BACKEND` ya declaradas en `.env.example`; Frank las configuró en Vercel. En tests, `tests/helpers/vitest-setup.ts` ya setea `AI_API_KEY='test-ai-key'` (línea 39); ampliar para las demás vars si hace falta.
- **Mock proveedor:** `tests/helpers/mock-minimax.ts` intercepta `fetch` (o el cliente IA inyectable) para devolver respuestas deterministas. SOFIA puede hacer el cliente IA inyectable (patrón de `PdfRenderer` en `lib/pdf/generate.ts`) para que tests no necesiten interceptar `fetch` global.

## DoD

- AC-1 a AC-27 PASS.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- Cobertura `lib/ia/anonymizer.ts` = 100%, `services/ia/**` ≥90%.
- 0 SPEC-GAP activo (si encuentras ambigüedad, devuelve `SPEC-GAP` a INTEGRA; no inventes).
- Sin commits/push/deploys/migraciones aplicadas.
- Reporta `READY_FOR_VERIFYING` o `BLOCKED` con IMPL-REPORT (archivos modificados, criterios cubiertos, validaciones con comando y resultado, evidencia reproducible, desviaciones/riesgos).

## Prohibido inferir

- **No inventes producto:** si algo no está en `SPEC_TEC_07` o en el baseline §3.7, devuelve `SPEC-GAP` a INTEGRA. No añadas features (p.ej. F4, streaming, multi-proveedor con fallback).
- **No asumas proveedor concreto:** el código no debe decir "MiniMax" en lógica; usa `process.env.AI_*`. Los comments pueden mencionar "proveedor IA" genérico.
- **No alteres D-FIN-13 / P-PD8 / P-PD9:** son contratos funcionales. Si una decisión técnica los tensiona, devuelve `SPEC-GAP`.
- **No toques F-IA1:** el endpoint `recursos-aula/ia-sugerir-uso` y `services/recursos-aula/sugerir-uso.ts` quedan como están (keyword matching determinista).
- **No apliques la migración 0020:** escríbela como `.sql` pendiente; `supabase db push` requiere autorización de Frank.
- **No commitees:** `git status` debe mostrar untracked/modificado, sin staging.

## Notas de INTEGRA para SOFIA

- **Patrón de endpoint:** sigue `app/api/recursos-aula/ia-sugerir-uso/route.ts` (auth → zod → RLS → service → envelope). Los tres nuevos endpoints son estructuralmente idénticos en el handler; sólo varían el body schema, el service llamado y la validación post-IA.
- **Cliente IA inyectable:** para testabilidad, sigue el patrón de `PdfRenderer` (`lib/pdf/generate.ts:35-38`): define `IaClient` como interfaz, con `createRealIaClient()` (production) y `createMockIaClient()` (tests). El route handler recibe el cliente vía parámetro opcional o factory, para que los tests inyecten el mock sin interceptar `fetch` global.
- **Validación post-IA F1:** compara PDA/campos/ejes **del bloque** (leídos de DB) contra los **referenciados en la variante**. Si la variante menciona un PDA no en el bloque → 422. Criterio: el proveedor sólo adapta texto, no estructura.
- **Validación post-IA F3:** regex sobre `PDA-F\d-...` en `texto_pulido`; si un match no está en la tabla `pda` (query a Supabase) → 422 con `details.campo`.
- **System prompts (§4.3 SPEC_TEC_07):** redáctalos respetando los invariantes (F1: sólo texto adaptado ≤500 chars; F2: expandir/simplificar ≤1000 chars; F3: JSON `{ campos: [{ campo, texto_pulido }] }`).
- **Si `updatePlaneacion`/`updateBloque` no existen** en `planeacion-actions.ts`: créalos siguiendo el patrón de `createPlaneacion` (zod schema + `createClient()` + RLS + `audit_log`). Son decisiones internas reversibles dentro de la SPEC.
- **Rate-limit headers:** emite `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` en cada response IA (200 y 429).
- **`requestId`:** genera un `X-Request-Id` por request (UUID v4) y loggéalo con el prompt anonimizado. Útil para DEBY si hay incidente.
- **Iterative Retrieval:** si tras leer 2 archivos más no tienes 80% de confianza en algo, devuelve `SPEC-GAP` a INTEGRA con la pregunta mínima. No escalas a Frank directamente; INTEGRA resuelve o devuelve a ATLAS.

## Trazabilidad

- **IDs funcionales:** §3.7 F1/F2/F3, D-FIN-13, P-PD8, P-PD9, FND-20260819-05.
- **IDs técnicos:** ARCH-20260819-03 (ADR-02), SPEC-20260819-07, IMPL-20260819-04 (propuesto), E24/E25/E26.
- **Códigos de error:** `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA`, `NEM_IA_ANONYMIZER_BLOCKED`, `NEM_IA_VARIANTE_TIPO_NO_SOPORTADO`, `NEM_RATE_LIMIT_EXCEEDED`, `NEM_IA_TIMEOUT` (reservado), `NEM_AUTH_UNAUTHORIZED`, `NEM_AUTH_RLS_VIOLATION`, `NEM_PLANEACIONES_ARCHIVED`, `NEM_INTERNAL_ERROR`.
- **Cadena esperada:** `Necesidad (§3.7) → DEC/BR → SPEC_TEC_07 (AC) → IMPL-20260819-04 → QA (GEMINI)`.

---

**Fin del handoff.** INTEGRA no lanza SOFIA este turno (Frank no lo pidió explícitamente; pidió preparar el handoff). Cuando Frank autorice, INTEGA delega vía `task` con `subagent_type='sofia'` y este handoff como prompt. **No usar Agent Manager** (Frank lo prohibió explícitamente).
