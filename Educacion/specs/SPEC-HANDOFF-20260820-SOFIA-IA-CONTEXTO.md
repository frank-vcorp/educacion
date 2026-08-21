# SPEC-HANDOFF-20260820-SOFIA-IA-CONTEXTO — IA contextualizada por modalidad en el paso inicial del wizard (F0)

- **Origen:** INTEGRA
- **ID tarea:** `IMPL-20260820-06` (propuesto; CRONISTA asigna el definitivo)
- **SPEC activa:** `specs/SPEC_TEC_10_IA_Contexto_Problema.md` (ID `SPEC-20260820-10`) v1.0
- **ADR:** `specs/ADR-20260820-03.md` (ID lógico `ARCH-20260820-03`)
- **Fecha:** 2026-08-20
- **Estado del handoff:** `READY_FOR_SOFIA`

---

## Referencias funcionales

- `discovery/DECISIONS.md` DEC-20260820-03.
- `discovery/FINDINGS.md` FND-20260820-07 (resuelto funcionalmente).
- `discovery/OPEN-QUESTIONS.md` OQ-20260820-05 (answered), OQ-20260820-06 (open; **no** definir retención).
- `SPEC_MVP_01_Modulo_Docente.md` §3.7, §3.7.2; `E20` P-PD8/P-PD9; `E22` D-FIN-13.

## Resultado

Sustituir el panel estático `ESTÁTICO · SIN IA` del paso inicial del wizard por una IA que, dado el borrador (modalidad + problema + propósito/ajustes parciales), propone **problema estructurado**, **propósito** y **ajustes razonables**, aplicables **campo por campo con clic explícito**, con invalidación/regeneración al cambiar modalidad/problema y trazabilidad `audit_log` POST. Sin persistencia de drafts. Cerrar técnicamente `FND-20260820-07`.

## Alcance de archivos/módulos

### Crear (nuevo)

- `app/api/planeaciones/ia/contexto-problema/route.ts` (F0).
- `components/ia/ia-contexto-problema-panel.tsx` (`IAContextoProblemaPanel`).
- Tests:
  - `tests/integration/ia/contexto-problema.spec.ts` (flujo F0 con mock proveedor; AC-1..AC-10).
  - `tests/unit/components/ia-contexto-problema-panel.spec.tsx` (AC-12..AC-16).
  - `e2e/ia-f0.spec.ts` (AC-17).

### Ampliar (existente)

- `services/ia/prompts.ts`: añadir `SYSTEM_PROMPT_F0` (invariantes §4.2 SPEC_TEC_10).
- `services/ia/validate.ts`: añadir `parseRespuestaF0` + tipo `F0Respuesta` (§4.2).
- `components/planeaciones/wizard-planeacion.tsx`: en `renderContexto()` (línea ~388-393), sustituir `<SugerenciasIA .../>` por `<IAContextoProblemaPanel .../>` con los callbacks `onApplyProblema/Proposito/Ajustes` que llaman `set('problemaContexto'|'proposito'|'ajustesRazonables', ...)`.

### Eliminar

- `app/(app)/planeaciones/nueva/_components/sugerencias-ia.tsx` y `sugerencias-data.ts` (panel estático; único importador el wizard — verificado por grep). Si SOFIA los conserva como seed no-IA, declararlo en el IMPL-REPORT; la SPEC los da por eliminados (AC-24).

### Leer (referencia, no editar)

- `app/api/planeaciones/[id]/ia/pulir-pdf/route.ts` — patrón canónico de route IA (auth → rate-limit → zod → anonymizer → iaChat → parse JSON → audit).
- `services/ia/client.ts`, `types.ts`, `rate-limiter.ts`, `validate.ts`, `prompts.ts`.
- `lib/ia/anonymizer.ts` (`anonymizeRequest`, `findIrredactableField`), `lib/ia/audit-post.ts` (`auditPostIA`).
- `components/ia/ia-sugerencia-panel.tsx` (patrón de estados/máquina y data-testids).
- `services/planeaciones/planeacion-actions.ts` (`createPlaneacion` — punto de persistencia final; sin cambio).

### Prohibido tocar

- `discovery/`, `fuentes/`, `SPEC_MVP_01_Modulo_Docente.md` (ownership ATLAS/Frank).
- Migraciones `0001–0022` (incluidas `0020`/`0021`, artefactos pendientes de Frank).
- Los 3 routes IA F1/F2/F3 (`app/api/planeaciones/[id]/ia/*`) y `services/ia/client.ts`.
- `lib/pdf/generate.ts`, `lib/ia/audit-post.ts` (helper compartido), `services/planeaciones/planeacion-actions.ts` (sólo lectura).
- `.env*`, `package.json`, `next.config.mjs`, manifests, `specs/*` (salvo los que esta SPEC autoriza ampliar en `services/ia/` y `components/`).

## Contratos que cambian

- **Nuevo endpoint:** `POST /api/planeaciones/ia/contexto-problema` (E31 en SPEC_TEC_03 §6.31).
- **Nuevo endpoint de auditoría:** `planeaciones_contexto_problema` (columna `endpoint` de `audit_log`).
- **Nuevos módulos server-only:** `SYSTEM_PROMPT_F0` (prompts.ts), `parseRespuestaF0` (validate.ts).

## Contratos protegidos

- **D-FIN-13 / cero datos de menores:** F0 no lee `alumno`/`evaluacion_alumno`/`bitacora`/`entrevista_inicial_alumno` (AC-11).
- **P-PD9:** F0 no muta campos; aceptación por clic (AC-14).
- **Proveedor único sin fallback (baseline §3.7):** degradación `fallback_vacio`, sin reintentos ni segundo proveedor.
- **F1/F2/F3 + `services/ia/client.ts`:** inmutables (QA PASS).
- **`createPlaneacion`:** sin cambio; es la persistencia final.
- **Envelope `{ data }`/`{ error: { code, message } }`.**

## Criterios AC (resumen; detalle testable en SPEC_TEC_10 §11)

- **AC-1 a AC-11:** endpoint F0 (200 ok, JSON inválido→fallback, problema vacío→fallback, campos opcionales vacíos, sin key→fallback, 422 modalidad/body, 429 rate-limit, anonimización, audit_log POST exactamente una fila, cero datos de alumnos por grep).
- **AC-12 a AC-16:** panel (botón deshabilitado sin problema, fetch con body correcto + anti-doble-submit, P-PD9 no-autocompletar, invalidación por modalidad/problema, no invalidación por propósito/ajustes).
- **AC-17:** Playwright E2E flujo completo wizard→F0→aceptar problema→cambiar modalidad→desactualización→guardar.
- **AC-18 a AC-24:** cross-cutting (`typecheck`/`lint`/`test`/`build` PASS, `NEXT_PUBLIC_AI` 0, sin dependencias nuevas, panel estático eliminado).

## Casos borde (ver SPEC_TEC_10 §8)

`AI_API_KEY` vacía/proveedor caído/timeout → 200 `fallback_vacio`; JSON inválido → fallback; problema estructurado vacío → fallback; anonimizador blocked → 500; cambiar modalidad/problema → desactualizadas sin borrar aceptadas; cambiar sólo propósito/ajustes → no invalida; recarga del wizard → se pierde el borrador (aceptado, OQ-20260820-06).

## Validaciones detectadas (comandos)

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright test e2e/ia-f0.spec.ts   # gate de staging; declarar NO EJECUTADA sin Supabase/proveedor
```

Salida esperada: todos PASS sin regresión. SoFIA ejecuta typecheck + lint + tests + build antes de `READY_FOR_VERIFYING`.

## Restricciones

- **Sin commits, push, PR, staging ni producción** (restricción vigente).
- **Sin migraciones aplicadas ni creadas** (F0 no requiere ninguna).
- **Sin dependencias nuevas** (`fetch` nativo; rate-limiter/cache existentes).
- **Sin service-role key.**
- **Sin inventar retención de borradores** (OQ-20260820-06 open): no crear tablas de drafts ni endpoints de guardado intermedio.
- **WIP=1:** una instancia SOFIA, secuencial (route + panel + wizard comparten `services/ia/` y `components/`).

## Dependencias

- Disponibles: `zod`, `next` (API Routes), `vitest`, `@testing-library/react`, `playwright`, `tests/helpers/mock-minimax.ts`.
- Vars IA ya en `.env.example`/Vercel (`AI_*`); `tests/helpers/vitest-setup.ts` ya setea `AI_API_KEY`.
- `audit_log` INSERT persistente en runtime requiere `0021` aplicada (Frank); sin ella, fail-loud (el test de AC-10 usa mock de `createClient`).

## DoD

- AC-1 a AC-24 PASS (AC-17 gate de staging).
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- Cobertura `lib/ia/anonymizer.ts` 100% (sin regresión), `services/ia/**` ≥90%.
- 0 SPEC-GAP activo (ante ambigüedad, devuelve `SPEC-GAP` a INTEGRA; no inventes).
- Sin commits/push/deploys/migraciones.
- Reporta `READY_FOR_VERIFYING` o `BLOCKED` con IMPL-REPORT.

## Prohibido inferir

- **No inventes producto:** si algo no está en SPEC_TEC_10, DEC-20260820-03 o baseline §3.7, devuelve `SPEC-GAP`.
- **No definas retención de borradores** (OQ-20260820-06): no guardes drafts server-side.
- **No toques F1/F2/F3** ni el cliente IA core.
- **No asumas proveedor concreto** (comentarios genéricos "proveedor IA"; lógica lee `process.env.AI_*`).
- **No modifiques `createPlaneacion`** ni su validación de campos finales.
- **No autocompletes campos** (P-PD9): cada propuesta requiere clic.

## Notas de INTEGRA para SOFIA

- **Patrón de route:** replica `pulir-pdf/route.ts` (auth → rate-limit → zod → `findIrredactableField` → `anonymizeRequest` → `iaChat` → parse → `auditPostIA`). F0 no tiene `[id]`: el `cct` para el audit es `session.cct`; el rate-limit usa `checkRateLimit(docenteId, 'planeaciones_contexto_problema')`.
- **Parse JSON tolerante:** reutiliza la técnica de `pulir-pdf/route.ts:160-168` (extraer primer `{...}`) en `parseRespuestaF0`.
- **Panel:** sigue el patrón de estados de `ia-sugerencia-panel.tsx`; snapshot `generadoCon={modalidad,problemaContexto}` y comparación estricta para la desactualización; NO compares `proposito`/`ajustes_razonables`.
- **Iterative Retrieval:** si tras leer 2 archivos más no tienes 80% de confianza, devuelve `SPEC-GAP` a INTEGRA. No escalas a Frank; INTEGRA resuelve o devuelve a ATLAS.

## Trazabilidad

- **IDs funcionales:** DEC-20260820-03, FND-20260820-07, OQ-20260820-05/06, P-PD8/P-PD9, D-FIN-13.
- **IDs técnicos:** ARCH-20260820-03, SPEC-20260820-10, E31, IMPL-20260820-06, Decisiones 1/2/5/9 (ADR-02), R-IA-10, ARCH-20260820-01.
- **Cadena esperada:** `Necesidad (DEC-20260820-03) → SPEC_TEC_10 (AC) → IMPL-20260820-06 → QA (GEMINI)`.

---

**Fin del handoff.** INTEGRA no activa a SOFIA en su propia sesión; devuelve este handoff a ATLAS con estado `READY_FOR_SOFIA` para que ATLAS active la sesión independiente de SOFIA.