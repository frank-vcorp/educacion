# SPEC-HANDOFF-20260819-SOFIA-P1-P2-FIXES — Fixes post-QA-20260819-04 (Capa IA)

- **Origen:** INTEGRA
- **ID tarea:** `IMPL-20260819-05` (propuesto; CRONISTA asigna el definitivo) — continuación de `IMPL-20260819-04`
- **SPEC activa:** `specs/SPEC_TEC_07_Capa_IA.md` **v1.1** (§5.1, §6.1.1, §8, §11 AC-29..31, §17)
- **ADR:** `specs/ADR-20260819-02.md` (ID lógico `ARCH-20260819-03`) — Decisiones 9 (audit_log POST), 10 (P-PD8 F1 PDA-only), residual R-IA-10 (P2-2)
- **QA de origen:** `specs/QA-20260819-04.md` (**FAIL**) — hallazgos P1-1, P1-2, P2-1, P2-2
- **IMPL previo:** `specs/IMPL-20260819-04_report.md`
- **Fecha:** 2026-08-19
- **Estado del handoff:** LISTO para delegación cuando Frank autorice lanzar SOFIA vía `task` con `subagent_type='sofia'`. **No lanzar este turno sin OK explícito de Frank. No usar Agent Manager.**

---

## Referencias funcionales

- `SPEC_MVP_01_Modulo_Docente.md` v0.14 §3.7 (F1/F2/F3 + proveedor único sin fallback).
- `fuentes/E22_CIERRE_DISCOVERY.md` §D-FIN-13 (server-side + anonimizador + cero datos de menores).
- Reglas: **P-PD8** (IA no altera estructura NEM), **P-PD9** (IA sólo sugiere; audit trail).
- `discovery/FINDINGS.md` §FND-20260819-05 (gap funcional que la capa IA cierra; sin cambio este turno).

## Resultado

Aplicar los fixes L1 que cierren los 2 hallazgos P1 de `QA-20260819-04` y materializar las decisiones INTEGRA sobre los 2 hallazgos P2, **sin tocar contratos protegidos ni restricciones vigentes**. La unidad queda en `READY_FOR_VERIFYING` para re-auditoría GEMINI de los puntos cerrados. No es una reimplementación: es un parche acotado sobre `IMPL-20260819-04`.

| Hallazgo QA | Severidad | Qué cambia (resumen) | AC |
|---|---|---|---|
| P1-1 | P1 | Los 3 routes IA insertan 1 fila `audit_log` POST (con `cct` real, `method='POST'`, `body_hash` del payload anonimizado, `response_status` final) e inspeccionan `{ error }` (fail-loud). | AC-29 |
| P1-2 | P1 | `updateBloque` selecciona `cct`, usa `bloque.cct` (no `docente_id`) en el insert de `audit_log`, y trata explícitamente el fallo del insert. | AC-30 |
| P2-1 | P2 | (Decisión INTEGRA ya aplicada en SPEC §5.1: criterio PDA-only.) SOFIA añade un test que **documenta** el criterio (no cambia `validate.ts`). | AC-31 |
| P2-2 | P2 | (Decisión INTEGRA: restricción aceptada, no fix.) SOFIA añade un **fixture documental** que registra el falso positivo conocido (no afloja el anonimizador). | fixture |

## Alcance de archivos/módulos

### Editar (existente, dentro del incremento IMPL-04)

- `app/api/planeaciones/[id]/ia/variantes-bloque/route.ts` (F1) — **P1-1**.
- `app/api/planeaciones/[id]/ia/help-redaccion/route.ts` (F2) — **P1-1**.
- `app/api/planeaciones/[id]/ia/pulir-pdf/route.ts` (F3) — **P1-1**.
- `services/planeaciones/update-actions.ts` — **P1-2** (`updateBloque`); **P3 opcional de consistencia** (`updatePlaneacion`).

### Crear (tests)

- `tests/unit/services/planeaciones/update-actions.spec.ts` — **AC-30** (nuevo; hoy cobertura 0% de `update-actions.ts`).
- Ampliaciones a tests existentes: `tests/integration/ia/variantes-bloque.spec.ts`, `help-redaccion.spec.ts`, `pulir-pdf.spec.ts` — **AC-29**; `tests/unit/services/ia/validate.spec.ts` — **AC-31**; `tests/unit/lib/ia-anonymizer.spec.ts` — **fixture P2-2**.

### Leer (referencia, no editar)

- `specs/SPEC_TEC_07_Capa_IA.md` v1.1 §6.1.1 (contrato audit_log POST), §5.1 (criterio PDA-only), §8 (R-IA-10), §17 (hub).
- `specs/ADR-20260819-02.md` Decisiones 9, 10 + R-IA-10.
- `specs/QA-20260819-04.md` §D (hallazgos P1-1/P1-2/P2-1/P2-2 con evidencia y línea exacta).
- `supabase/migrations/0013_entrega_bitacora_audit_idempotency.sql:56-67` (schema `audit_log`).
- `supabase/migrations/0010_planeacion_sesion_bloque.sql:65` (`bloque.cct`), `:10` (`planeacion.cct`), `:78` (`bloque.origen` check).
- `services/ia/validate.ts`, `lib/ia/anonymizer.ts` (sólo lectura para los tests).

### Prohibido tocar

- `discovery/*`, `fuentes/*`, `SPEC_MVP_01_Modulo_Docente.md` (ownership ATLAS/Frank).
- `supabase/migrations/0001-0019*.sql` existentes y `0020_ia_trazabilidad.sql` (artefacto, sin `supabase db push`).
- `app/api/recursos-aula/ia-sugerir-uso/route.ts`, `services/recursos-aula/sugerir-uso.ts` (F-IA1 sin cambio).
- `lib/pdf/generate.ts` (renderer sin acoplamiento IA; AC-16).
- `services/ia/client.ts`, `rate-limiter.ts`, `cache.ts`, `prompts.ts`, `types.ts` (sin cambios este handoff).
- `.env`, `.env.local`, `.env.production`, `.env.example`, `package.json`, `next.config.mjs`, manifests.
- `specs/SPEC_TEC_01..06`, `SPEC_TEC_07`, `ADR-20260819-02` (ownership INTEGA; SOFIA no edita SPECs/ADRs).

## Detalle de los fixes (el QUÉ; SOFIA decide el CÓMO interno reversible)

### P1-1 — audit_log POST en los 3 routes IA

**Problema (ver QA-04 §D P1-1):** `grep -rn "audit_log" app/api/planeaciones/ → 0`. Ningún route IA escribe la fila POST. La Decisión 3 del ADR requería dos filas (POST propuesta + PATCH aceptación); sólo existe el lado PATCH (y roto, ver P1-2).

**Contrato (SPEC §6.1.1, Decisión 9 ADR-02):** cada route inserta **exactamente una** fila `audit_log` por POST que alcanza la etapa de procesamiento (tras auth + zod + RLS + no-archivada). Detalle por columnas:

- `cct`: clave CCT real (string `cct.clave`, p.ej. `22DJN0059R`; **nunca** un UUID). Origen por route:
  - **F1** (`variantes-bloque/route.ts`): el route ya carga el bloque (hoy `:102` selecciona `id, planeacion_id, docente_id, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, planeacion:planeacion(estado)`). Añadir `cct` a ese `select` y usar `bloque.cct` (la columna existe, `text not null references cct(clave)`, migración 0010:65).
  - **F2** (`help-redaccion/route.ts`): el route ya carga la planeación (hoy `:90` selecciona `id, docente_id, estado`). Añadir `cct` al `select` y usar `planeacion.cct` (migración 0010:10).
  - **F3** (`pulir-pdf/route.ts`): el route ya carga la planeación (hoy `:84` selecciona `id, docente_id, estado, problema_contexto, proposito, producto_integrador, ajustes_razonables`). Añadir `cct` al `select` y usar `planeacion.cct`.
- `docente_id`: `session.docenteId`.
- `endpoint`: el identificador estable ya definido en cada route (`planeaciones_variantes_bloque` / `planeaciones_help_redaccion` / `planeaciones_pulir_pdf`).
- `method`: `'POST'` (valor admitido por el check de migración 0013:61).
- `body_hash`: `sha256` truncado (16 hex; puede reusar el helper `hashShort`/patrón ya presente en `update-actions.ts`) de una representación **anonimizada** del request. Usar el `user` message post-`anonymizeRequest` que ya se construye en cada route (F1 `:184`, F2 `:151`, F3 `:141`). **Nunca** el prompt crudo ni texto con PII. En el path cache-hit de F1 puede reusarse `requestHash([docenteId, bloque_id, variante_tipo])` (ids no-PII).
- `response_status`: `200` (éxito, cache, `fallback_vacio`) o `422` (`NEM_IA_VARIANTE_VIOLA_ESTRUCTURA`).
- `ip`, `user_agent`: opcionales (nullable en schema).

**Paths que NO insertan** (0 filas): 401, 403, 404, 409, 429, 422-`VALIDATION`, 500-`NEM_IA_ANONYMIZER_BLOCKED` (el insert del 500-anonymizer es opcional, no requerido para cerrar P1-1).

**Fail-loud (no silencioso):** el route **debe** inspeccionar `{ error }` del `insert()`. Si falla: `console.error` con `{ endpoint, docenteId, errorCode, message }` y **no** abortar la respuesta 200/422 al cliente (la sugerencia ya se generó; el fallo de auditoría se loguea, no bloquea el flujo de la docente). El cierre transaccional route↔audit es de la migración 0020 (fuera de L1).

**Ubicación del insert:** antes de retornar la `NextResponse` 200/422 final. SOFIA decide la organización interna (p.ej. un helper `auditPost(supabase, { cct, docenteId, endpoint, bodyHash, status })` reusable por los 3 routes es aceptable y reversible) siempre que el contrato de columnas y el "exactamente una fila por POST procesado" se cumplan.

### P1-2 — `updateBloque`: `cct` real + fallo explícito de auditoría

**Problema (ver QA-04 §D P1-2, estático determinista):** `services/planeaciones/update-actions.ts:82` inserta `cct: bloque.docente_id` (UUID) en `audit_log.cct` (`text not null references cct(clave)`, migración 0013:58) → `foreign_key_violation` en el 100% de las aceptaciones F1/F2. El resultado del `.insert()` no se comprueba (`:80`); la función devuelve `ok:true` sin fila de auditoría. El comentario `:82` ("best-effort; columna cct no está aquí") es incorrecto: `bloque` **sí** tiene `cct` (migración 0010:65); simplemente no se selecciona (`:63` = `'id, docente_id'`).

**Fix L1:**

1. En la read del bloque (`:63`), añadir `cct` al `select` → `'id, docente_id, cct'`.
2. En el insert (`:82`), usar `cct: bloque.cct` (el CCT real, no `docente_id`).
3. Inspeccionar el resultado del insert: `const { error: errAudit } = await supabase.from('audit_log').insert({...})`. Si `errAudit`: `console.error('[audit_log] updateBloque', { bloqueId, errorCode: errAudit.code, message: errAudit.message })` y **no** revertir el update de bloque (ya se aplicó en `:73-77`); la función retorna `ok: true` con `id: bloqueId` y, para hacer observable el fallo (no silencioso), añade un campo **opcional** `auditError?: string` a `UpdateBloqueResult` (extensión backward-compatible del contrato). Si el insert es OK, retorna `ok: true` sin `auditError`.

**Contrato cambiado (backward-compatible):** `UpdateBloqueResult` gana `auditError?: string`. Es la única extensión de tipo; no rompe callers existentes.

**P3 opcional de consistencia (mismo archivo):** `updatePlaneacion` (`:191`) usa `cct: planeacion.cct` (correcto, sin FK bug) pero también silencia el error del insert. Aplicar el mismo patrón fail-loud (inspeccionar `{ error }`, log, `auditError` opcional en `UpdatePlaneacionResult`) por consistencia. **No es bloqueante** para cerrar P1-2 (que es sólo `updateBloque`); incluirlo sólo si no añade riesgo.

### P2-1 — Documentar el criterio PDA-only (decisión INTEGRA ya en SPEC §5.1)

**Decisión INTEGRA (no requiere código nuevo en `validate.ts`):** el criterio operativo de validación post-IA de F1 es **PDA introducidos** (no campos/ejes, no eliminación). SPEC §5.1 v1.1 ya está corregida. SOFIA sólo añade/ajusta un test en `tests/unit/services/ia/validate.spec.ts` que **documente** el criterio: una variante que sustituye un `campos_formativos` por otro distinto (en prosa) **no** produce 422; una variante que **introduce** un PDA no en el bloque sí produce 422 con `pdaIntroducidos` correcto. **No** añadir validación fuzzy de campos/ejes (sería un cambio de SPEC no autorizado y propenso a falsos positivos).

### P2-2 — Fixture documental del falso positivo (decisión INTEGRA: restricción aceptada)

**Decisión INTEGRA (no fix del anonimizador):** `IRREDACTABLE_PATTERN` permanece fail-closed. No aflojar la heurística (aflojarla filtra nombres todo-mayúsculas, único catch pues `NOMBRE_PATTERN` no los captura). SOFIA añade un test en `tests/unit/lib/ia-anonymizer.spec.ts` que **registre el falso positivo conocido** como restricción documentada (p.ej. `detectIrredactablePII('EL NIÑO EXPLORARÁ LAS SEMILLAS') === true` y el route emite 500 `NEM_IA_ANONYMIZER_BLOCKED`), con un comentario que apunte a R-IA-10/§8. Esto deja el comportamiento trazado, no oculto. **No** modificar `lib/ia/anonymizer.ts`.

## Contratos que cambian

- `audit_log` recibe filas POST en los 3 routes IA (no es cambio de schema; la tabla ya existe). `method='POST'` ya admitido por el check existente.
- `UpdateBloqueResult` (y opcionalmente `UpdatePlaneacionResult`) gana `auditError?: string` (backward-compatible).
- Query `select` de bloque (F1 route + `updateBloque`) y de planeación (F2/F3 routes) añaden la columna `cct` (no cambia contrato público de endpoints; detalle interno).

## Contratos protegidos (sin cambio)

- D-FIN-13 (server-side + anonimizador + cero datos de menores): los inserts de `audit_log` no envían nada al proveedor; `body_hash` se computa sobre payload ya anonimizado.
- P-PD8 (estructura NEM inviolable): criterio operativo confirmado PDA-only (Decisión 10); F1/F3 siguen sin persistir.
- P-PD9 (IA sólo sugiere; audit trail): ahora con fila POST (P1-1) + fila PATCH correcta (P1-2) → trazabilidad reconstruible.
- `bloque.origen` check (sin nuevos valores); `lib/pdf/generate.ts` sin acoplamiento IA; F-IA1 sin cambio; "proveedor único sin fallback" (sin reintentos).
- `AI_API_KEY` sólo vía `process.env`, nunca loggeada ni en bundle (`NEXT_PUBLIC_*` prohibido).

## Criterios AC (testables por construcción)

- **AC-29 (P1-1):** para cada route F1/F2/F3, integration test con mock de `createClient` verifica: en flujo 200 éxito, **exactamente una** llamada a `audit_log.insert` con `cct` = string formato `cct.clave` (fixture, **no** UUID), `method === 'POST'`, `endpoint` correcto, `body_hash` hex no vacío cuyo input no contiene PII de fixture; en flujo 422 `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA`, una fila con `response_status === 422`; en 401/403/429/422-`VALIDATION`, **0** llamadas. Comando: `pnpm test -- tests/integration/ia`. Output: PASS.
- **AC-30 (P1-2):** unit test `tests/unit/services/planeaciones/update-actions.spec.ts` con supabase mockeado: (a) la read de bloque selecciona `cct` (mock retorna bloque con `cct: '22DJN0059R'`); (b) el payload del `audit_log.insert` lleva `cct === '22DJN0059R'` (no `docente_id`), `method === 'PATCH'`, `endpoint === 'update_bloque_post_ia'`; (c) si el mock de `insert` retorna error, la función retorna `ok: true` (update ya aplicado) **y** expone `auditError` sin lanzar; (d) si retorna OK, `ok: true` sin `auditError`. Comando: `pnpm test -- tests/unit/services/planeaciones/update-actions.spec.ts`. Output: PASS.
- **AC-31 (P2-1):** unit test en `validate.spec.ts`: variante que sustituye `campos_formativos` (en prosa) → no 422; variante que introduce PDA no en bloque → 422 con `pdaIntroducidos`. Comando: `pnpm test -- tests/unit/services/ia/validate.spec.ts`. Output: PASS.
- **Fixture P2-2:** test en `ia-anonymizer.spec.ts` documenta `detectIrredactablePII('EL NIÑO EXPLORARÁ LAS SEMILLAS') === true` (restricción R-IA-10). Comando: `pnpm test -- tests/unit/lib/ia-anonymizer`. Output: PASS.

## Casos borde

- `audit_log` insert falla en runtime (p.ej. RLS, cct inexistente por dato corrupto): el route/`updateBloque` no aborta; loguea (`console.error` con contexto) y, en `updateBloque`, expone `auditError`. La respuesta al cliente es la del flujo principal (200/422/`ok:true`).
- `bloque.cct` o `planeacion.cct` es `null` en DB: imposible por schema (`not null`, migración 0010:10/65). Si el mock lo simula null para un test, el route debe manejarlo sin lanzar (omitir el insert o loguear) — SOFIA decide el guard defensivo, siempre fail-loud.
- Cache-hit en F1 (no se llama al proveedor): aún así inserta fila POST con `response_status=200` y `body_hash=requestHash(ids)` (no-PII).

## Validaciones detectadas y salida esperada

| Comando | Salida esperada |
|---|---|
| `pnpm typecheck` | 0 errores |
| `pnpm lint` | 0 errores nuevos (1 warning preexistente `lib/supabase/server.ts` no relacionado) |
| `pnpm test` | PASS (suite existente + nuevos; 0 regresiones en los 82 tests IA de IMPL-04) |
| `pnpm test -- tests/integration/ia tests/unit/services/planeaciones tests/unit/services/ia/validate.spec.ts tests/unit/lib/ia-anonymizer` | PASS (AC-29, AC-30, AC-31, fixture P2-2) |
| `pnpm build` | PASS (3 rutas IA siguen registradas; sin cambios de rutas) |
| `grep -rn "audit_log" app/api/planeaciones/` | ≥3 matches (uno por route IA; antes era 0) |
| `grep -rn "bloque.docente_id" services/planeaciones/update-actions.ts \| grep -i cct` | 0 matches en la línea del insert (ya no se usa `docente_id` como `cct`) |
| `git status` | untracked/modificado, sin staging de commits |
| `git log origin/main..HEAD` | sin commits nuevos |

## Restricciones

- **Sin commits, push, PR, staging ni producción** (restricción vigente ADR-01/02).
- **Sin migraciones aplicadas** (`supabase db push` requiere OK de Frank). `0020` sigue como artefacto pendiente.
- **Sin dependencias nuevas.** Reusar helpers existentes (`hashShort`/patrón de `update-actions.ts`).
- **Sin tocar** `discovery/`, `fuentes/`, `SPEC_MVP_01_*`, migraciones, `.env*`, `package.json`, `lib/pdf/generate.ts`, F-IA1, `services/ia/{client,rate-limiter,cache,prompts,types,validate}.ts` (sólo lectura), SPECs/ADRs.
- **Sin usar Agent Manager.** Delegación sólo vía `task` con `subagent_type='sofia'` cuando Frank autorice.
- WIP=1: una SOFIA secuencial (los 3 routes + `update-actions.ts` comparten el contrato `audit_log`; no son disjuntos → no paralelizar).

## Dependencias

- Ninguna nueva. Requiere: `@/lib/supabase/server` (`createClient`), `@/lib/auth/session` (`getServerSession`), `zod`, `node:crypto` (`createHash`) — todas ya presentes.

## DoD

- AC-29, AC-30, AC-31 PASS + fixture P2-2 PASS (este handoff).
- AC-1..AC-27 sin regresión (re-ejecutar suite IA de IMPL-04: 82 tests).
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- Cobertura `services/planeaciones/update-actions.ts` > 0% (hoy 0%); `lib/ia/anonymizer.ts` y `services/ia/**` mantienen umbrales (SPEC §15).
- 0 SPEC-GAP activo.
- Estado `READY_FOR_VERIFYING` (no `DONE`); INTEGRA decide DONE tras re-auditoría GEMINI de los puntos cerrados.
- Sin commits/push/deploys/migraciones aplicadas.

## Prohibido inferir

- No asumir que el criterio P2-1 requiere validar campos/ejes (decisión INTEGRA: PDA-only). No añadir validación fuzzy.
- No aflojar `IRREDACTABLE_PATTERN` (P2-2 es restricción aceptada, no fix). No modificar `lib/ia/anonymizer.ts`.
- No introducir transacciones/RPC para atomicidad route↔audit (es cierre total de `0020`, fuera de L1).
- No seleccionar `cct` de una tabla distinta a la que el route ya carga para RLS (usar `bloque.cct` en F1/`updateBloque`, `planeacion.cct` en F2/F3).
- No cambiar `endpoint`/`method`/`body_hash` del contrato de columnas de SPEC §6.1.1.
- No reordenar rate-limit antes de RLS (P3-2, no incluido en este handoff salvo decisión de INTEGRA).

---

**Fin del handoff.** Tras `READY_FOR_VERIFYING`, INTEGRA solicita re-auditoría GEMINI (`task` con `subagent_type='gemini'`) sobre P1-1, P1-2, P2-1, P2-2. Staging/producción requieren además UI (P3-8/AC-28) + vars IA en Vercel + OK explícito de Frank.
