# SPEC-HANDOFF — SOFIA: Fixes P2 tras QA-20260819-01 (P2-1 causa a, P2-2, P2-3, P3-3)

**Origen:** INTEGRA
**ID intervención:** ARCH-20260819-01 (continuación)
**ID implementación SOFIA (sugerido):** IMPL-20260819-02
**Fecha:** 2026-08-19
**Raíz:** `/home/frank/repos/educacion/Educacion`
**WIP:** 1 (una instancia SOFIA; los 3 fixes se ejecutan secuenciales en la misma sesión — ver justificación de no-paralelismo abajo).
**Estado anterior:** IMPL-20260819-01 `READY_FOR_VERIFYING` (QA PASS_WITH_WARNINGS). Este handoff reabre trabajo sobre el mismo incremento para cerrar los P2 aprobados.

---

## SPEC activa y decisiones de contrato (leer antes de implementar)

- `specs/SPEC_TEC_03_API_Contract.md` §6.30 (regla 2 **actualizada** con aclaración de alcance del invariante de hash) y §6.6 (nota de atomicidad **añadida**).
- `specs/SPEC_TEC_06_Plan_Testing.md` T-E2E-05 (nota de desviación **resuelta/actualizada**), T-I-05 (ya no "diferido"), matriz D-FIN-5 (actualizada).
- `specs/ADR-20260819-01.md` — **lectura obligatoria**: contiene el razonamiento completo de las tres decisiones. Resumen ejecutivo abajo.

### Resumen de decisiones (ADR-20260819-01)

- **P2-1 (hash PDF):** INTEGRA acepta explícitamente el invariante redefinido (el hash acredita el binario del momento de generación; la idempotencia estricta entre entrega y descarga queda nominal hasta el cierre total con Storage, SPEC `ARCH-20260819-02`). **Fix aprobado para este turno:** cerrar la causa (a) congelando el timestamp del footer. La causa (b) (`/CreationDate`/`/ModDate` embebidos por Chromium) queda residual documentada — NO la ataques en este turno (requiere post-proceso frágil o dependencia nueva, fuera de alcance).
- **P2-2 (atomicidad clonado):** estrategia de compensación en el action (hard-delete en orden inverso de las filas del intento actual si un insert falla a mitad). La RPC transaccional queda diferida a `ARCH-20260819-02` (requiere migración aplicable, no autorizada este turno).
- **P2-3 (lifecycle Chromium):** cerrar el `browser` en el `finally` del renderer real. Sin cambio de contrato.

## Referencias funcionales

- D-FIN-5 (PDF "Descargable binario") — preservado, NO rebajar.
- D-FIN-17 (Duplicar/Clonar) — semántica atómica del clonado.
- QA-20260819-01 §P2-1, §P2-2, §P2-3, §P3-3.

## Resultado

Cerrar los 3 P2 aprobados con fixes de implementación acotados + tests de regresión específicos, sin alterar producto ni contratos protegidos, y corregir el reporte stale (P3-3).

## Alcance de archivos/módulos (archivos mutables)

### Fix 1 — P2-1 causa (a): footer determinista
- **EDIT** `lib/pdf/generate.ts` — función `buildPlaneacionHtml` (línea ~138). Reemplazar `new Date().toLocaleString('es-MX')` por una fecha determinista derivada de la planeación. Como `PlaneacionPdfData` (interface ~líneas 41-52) **no incluye** `updated_at` hoy, añadir un campo opcional `updated_at?: string | null` a la interface y usarlo en el footer (`Generado el ${formatFecha(planeacion.updated_at)}` o, si es null/undefined, omitir la fecha del footer y dejar sólo `Plataforma NEM · CCT ${cct}`). **No** usar `new Date()` en ningún camino. Esto cierra la causa (a) de no-estabilidad del hash.
  - Los callers (`app/api/planeaciones/[id]/generar-pdf/route.ts:41-47` y `services/entregas/entrega-actions.ts:58-64`) hacen `select(...)` sobre `planeacion`; **añadir `updated_at`** al `select` de ambos para que el footer tenga la fecha real de última edición.
  - Mantener escape HTML. Mantener es-MX. No tocar el resto de la plantilla (§3.5 preservado).
  - **No** intentar eliminar `/CreationDate`/`/ModDate` del binario (causa b) — fuera de alcance, residual.

### Fix 2 — P2-2: compensación en `duplicarPlaneacion`
- **EDIT** `services/planeaciones/planeacion-actions.ts` — función `duplicarPlaneacion` (pasos 4-6, líneas ~431-545). Reestructurar para que, si cualquier `insert` de sesión (paso 5) o bloque (paso 6) falla tras haber creado la `planeacion` (paso 4) o filas previas, se ejecute una **compensación** antes de devolver `{ok:false}`:
  1. Llevar registro en memoria de los identificadores del intento: `nuevaPlaneacionId` (ya existe) + array `sesionesCreadas: string[]` (UUIDs de sesiones insertadas en este intento).
  2. En el path de error (cualquier `errInsSes`/`errInsBloque`), invocar una función interna `compensarClonado(supabase, nuevaPlaneacionId, sesionesCreadas)` que ejecute hard-delete en **orden inverso**:
     - `supabase.from('bloque').delete().in('sesion_id', sesionesCreadas)` (si `sesionesCreadas` no vacío),
     - `supabase.from('sesion').delete().eq('planeacion_id', nuevaPlaneacionId)`,
     - `supabase.from('planeacion').delete().eq('id', nuevaPlaneacionId)`.
  3. Tras compensar, devolver `{ok:false, error: <mensaje original>}`. Loggear la compensación (`console.warn` con `nuevaPlaneacionId` y conteos).
  4. Si la compensación misma falla (p.ej. RLS bloquea el delete — no debería, el docente es owner), loggear el error de compensación y devolver `{ok:false, error: 'Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=<id>'}` (caso patológico, improbable).
- **No** cambiar el contrato §6.6 (semántica de clonado). **No** añadir RPC/migración (diferido a `ARCH-20260819-02`).
- **No** cambiar el comportamiento de éxito (paso 7 regreso evaluaciones sin cambio).

### Fix 3 — P2-3: cerrar `browser` en el renderer real
- **EDIT** `lib/pdf/generate.ts` — función `createPuppeteerRenderer` (líneas ~272-293). En el `finally` del método `renderHtmlToPdf`, tras `page.close()`, **cerrar también el `browser`** (`await browser.close().catch(() => undefined)`).
  - Esto sólo afecta al renderer real (puppeteer-core). Los tests que inyectan un renderer simulado (`fakeRenderer` en tests) no se ven afectados (no tienen browser real).
  - `getDefaultRenderer()` ya crea un browser nuevo por request; con este fix, cada request cierra su browser al terminar. Cero chromium huérfanos en long-running.

### Fix 4 (menor, P3-3) — corregir reporte stale
- **EDIT** `specs/IMPL-20260819-01_report.md` — self-audit #4 (fila de la tabla). El texto dice "`listGruposDocente` no filtra `activo=true`". El código SÍ filtra (`planeacion-actions.ts:586` `eq('activo', true)`). Corregir la fila para reflejar que el filtro SÍ está aplicado en server. No tocar el resto del reporte.

### Justificación de no-paralelismo (1 SOFIA secuencial)

Los 3 fixes de código tocan **2 archivos**:
- Grupo A: `lib/pdf/generate.ts` (Fix 1 footer + Fix 3 browser close).
- Grupo B: `services/planeaciones/planeacion-actions.ts` (Fix 2 compensación).

`lib/pdf/generate.ts` es **compartido** entre Fix 1 y Fix 3 → no son disjuntos. Por la regla de paralelismo (INTEGRA §19: "si los conjuntos de archivos no son disjuntos → secuencial por defecto"), se ejecutan en 1 SOFIA secuencial. Además el trabajo total es pequeño (3 fixes acotados + 3 tests), el overhead de coordinación de 2 SOFIAs supera el beneficio. Fix 4 es sólo edición de markdown (reporte), sin acoplamiento.

## Contratos que cambian

- Ninguno público. §6.30 regla 2 y §6.6 ya fueron actualizadas por INTEGRA en la SPEC (aclaración documental, no cambio de semántica). Los fixes son internos: footer determinista, compensación de clonado, cierre de browser.

## Contratos protegidos (no tocar)

- D-FIN-5 (binario descargable) — preservado; Fix 1 no reduce el binario, sólo hace determinista el footer.
- D-FIN-17 (clonado sin evaluaciones) — preservado; Fix 2 no cambia semántica, sólo añade compensación.
- RLS por CCT (migración 0014) — la compensación usa el mismo `supabase` cliente con cookies (respeta RLS).
- `planeacion.clonada_de` (0010), `entrega.pdf_sha256` (0013), `entrega.doc_pdf_storage_path` (0013) — sin cambios.
- Plantilla HTML de planeación (§3.5) — sólo cambia la fuente del timestamp del footer; el resto intacto.
- `lib/auth/url-firmada.ts` — sin cambios.
- `discovery/`, `fuentes/`, `SPEC_MVP_01_Modulo_Docente.md` — sin cambios.
- Sin migraciones, sin dependencias nuevas, sin `.env`, sin commits/push/PR/staging/producción.

## Criterios AC (verificables por ejecución)

### Fix 1 — P2-1 causa (a)
- **AC-1:** `buildPlaneacionHtml` no contiene la literal `new Date()` en su cuerpo (grep del archivo → 0 ocurrencias dentro de la función). **Validación:** `rg -n "new Date\(\)" lib/pdf/generate.ts` no reporta ocurrencias dentro de `buildPlaneacionHtml` (puede haber otras fuera, pero no en esa función).
- **AC-2:** El footer renderiza `updated_at` de la planeación si está disponible, o lo omite (no muestra la hora actual). **Validación:** test unitario en `tests/unit/lib/pdf-generate.test.ts` que llame `buildPlaneacionHtml({... campos ..., updated_at: '2026-08-19T10:00:00Z'})` y afirme que el string de salida contiene el texto derivado de esa fecha (p.ej. formato es-MX legible) y **no** contiene la hora actual del test. Un segundo test con `updated_at: null` afirma que el footer no incluye una fecha variable.
- **AC-3:** Los callers (`route.ts` y `entrega-actions.ts`) añaden `updated_at` al `select` de `planeacion`. **Validación:** grep en ambos archivos muestra `updated_at` en el string de `select`.

### Fix 2 — P2-2
- **AC-4:** Si un `insert` de sesión o bloque falla tras crear la `planeacion`, `duplicarPlaneacion` ejecuta la compensación (hard-delete en orden inverso) y devuelve `{ok:false}`. **Validación:** test de regresión en `tests/unit/services/planeaciones/duplicate.test.ts` (o integration) que inyecte un mock de `supabase` que: (a) permite insert de `planeacion` y de las primeras K sesiones, (b) falla el insert de la sesión K+1 (o de un bloque). El test afirma: se llamó `delete` sobre `bloque` (si hubo sesiones creadas), `sesion` y `planeacion` con los identificadores del intento; el resultado es `{ok:false}`; el mock `store` termina con cero filas con `planeacion_id = nueva.id`.
- **AC-5:** La compensación opera sólo sobre los identificadores del intento actual (no borra filas ajenas). **Validación:** el test de AC-4 verifica que los `delete` usan `eq('planeacion_id', nueva.id)` / `in('sesion_id', sesionesCreadas)` — no un `delete()` sin filtro.
- **AC-6:** El path de éxito no regresa (los tests existentes AC-B1/B2/B3 siguen pasando sin cambio). **Validación:** `PDF_GENERATOR=playwright pnpm test tests/unit/services/planeaciones/duplicate.test.ts` PASS (tests previos + nuevo test de compensación).

### Fix 3 — P2-3
- **AC-7:** `createPuppeteerRenderer` llama `browser.close()` en el `finally` (tras `page.close()`). **Validación:** test unitario en `tests/unit/lib/pdf-generate.test.ts` que pase un `browser` mock (con `newPage()` devolviendo una `page` mock con `setContent`/`pdf`/`close`) y afirme que tras `renderHtmlToPdf(html)` se llamó `browser.close()` (spy `expect(browser.close).toHaveBeenCalled()`). El spy debe capturar el `.catch(() => undefined)` (no lanzar si close falla).
- **AC-8:** Los tests existentes de `pdf-generate.test.ts` siguen pasando (el renderer inyectado simulado no se ve afectado). **Validación:** `PDF_GENERATOR=playwright pnpm test tests/unit/lib/pdf-generate.test.ts` PASS.

### Fix 4 — P3-3
- **AC-9:** El reporte `IMPL-20260819-01_report.md` self-audit #4 refleja que `listGruposDocente` SÍ filtra `activo=true`. **Validación:** grep del reporte → la fila #4 no contiene "no filtra por `activo=true`".

### Validaciones globales (regresión)
- **AC-10:** `pnpm typecheck` exit 0, sin errores.
- **AC-11:** `pnpm lint` exit 0 (1 warning preexistente `lib/supabase/server.ts:11` tolerado, no introducido).
- **AC-12:** `PDF_GENERATOR=playwright pnpm test` — todos los tests previos (73 passed, 2 skipped) siguen pasando + los nuevos tests de AC-2, AC-4, AC-7. Sin regresión.
- **AC-13:** `pnpm build` exit 0 (`✓ Compiled successfully`).

## Casos borde

- **Fix 1:** `updated_at` null/undefined en la planeación (planeación recién creada sin update) → footer omite la fecha, muestra sólo `Plataforma NEM · CCT <cct>`. No lanzar.
- **Fix 2:** compensación cuando `sesionesCreadas` está vacío (falló el primer insert de sesión, sin sesiones previas) → el `delete` de `bloque` se omite (array vacío), sólo se borra `sesion` (donde `planeacion_id = nueva`, posiblemente 0 filas) y `planeacion`. No lanzar.
- **Fix 2:** compensación cuando `nuevaPlaneacionId` es null (falló el insert de planeacion, paso 4) → no hay nada que compensar, devolver `{ok:false}` directo.
- **Fix 3:** `browser.close()` lanza → `.catch(() => undefined)` lo traga (no propagar el error de cierre; el PDF ya se generó).

## Validaciones detectadas

- `pnpm typecheck` (`tsc --noEmit`) — obligatorio, exit 0.
- `pnpm lint` — obligatorio, exit 0.
- `PDF_GENERATOR=playwright pnpm test` — obligatorio; unit + integration + smoke. Los tests nuevos (AC-2, AC-4, AC-7) deben pasar.
- `pnpm build` — obligatorio, exit 0.
- **No ejecutables en sandbox (declarar "NO EJECUTADA" con razón):** E2E Playwright, RLS cross-tenant contra Postgres real, roundtrip HTTP con sesión real (requieren Supabase + servidor).

## Restricciones

- **Sin commits, push, PR, staging, producción, ni migraciones aplicadas.** (Frank, este turno.)
- No modificar `discovery/*`, `fuentes/*`, `SPEC_MVP_01_Modulo_Docente.md`, migraciones `supabase/migrations/*.sql`.
- No introducir dependencias nuevas (no `pdf-lib`, no `qpdf`).
- No modificar RLS existente.
- No reescribir la plantilla HTML de planeación (sólo cambiar la fuente del timestamp del footer).
- No intentar cerrar la causa (b) `/CreationDate`/`/ModDate` (residual, fuera de alcance).
- No implementar la RPC `duplicar_planeacion` (diferida a `ARCH-20260819-02`).
- No implementar subida a Storage (diferida a `ARCH-20260819-02`).
- Español es-MX en todos los mensajes y logs.
- Si dudas con 80% de confianza leyendo 1-2 archivos más (M3 barato), resuelve sin preguntar a INTEGRA. Si dudas del contrato, escala vía SPEC-GAP.

## Dependencias

- Sin nuevas. `puppeteer-core`, `@sparticuz/chromium`, `zod`, `@supabase/ssr`, `vitest` ya presentes.

## DoD

- AC-1 a AC-9 cubiertos con evidencia reproducible.
- AC-10 a AC-13 PASS (typecheck, lint, tests, build).
- Sin regresión: los 73 tests previos siguen pasando.
- Reporte `specs/IMPL-20260819-02_report.md` (nuevo ID) con: archivos modificados, criterios cubiertos (AC-1..AC-9), validaciones (comando + resultado), notas de reversión, estado `READY_FOR_VERIFYING` o `BLOCKED`.
- **Solicitar revisión final a GEMINI** (`subagent_type='gemini'`) como segunda mano de validación antes de marcar listo (cambio no trivial: toque de renderer + atomicidad de clonado). INTEGRA lanzará GEMINI tras recibir el reporte — SOFIA no necesita invocarla.

## Prohibido inferir

- No asumir que `updated_at` siempre está poblado — manejar null/undefined.
- No asumir que la compensación siempre tendrá sesiones que borrar — manejar array vacío.
- No usar `new Date()` en el footer bajo ningún pretexto (rompe el fix).
- No cerrar el `browser` en el renderer inyectado de tests (sólo en el renderer real `createPuppeteerRenderer`).
- No alterar la semántica de `duplicarPlaneacion` (mismo clonado, mismas evaluaciones=0, mismo `clonada_de`).

---

**Fin del SPEC-HANDOFF.** INTEGRA declara **READY** (DoR §5.2 cumplido: ID + prioridad, SPEC activa, referencias funcionales, resultado técnico, contratos afectados/protegidos, criterios verificables, dependencias disponibles, comandos de validación detectados, sin decisiones bloqueantes).
