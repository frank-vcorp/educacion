# SPEC-HANDOFF — SOFIA: Cierre P3 tras QA-20260819-02 (N1, N2, N3 como L1; N4 aceptado)

**Origen:** INTEGRA
**ID intervención:** ARCH-20260819-01 (addendum P3; continuación de IMPL-20260819-02)
**ID implementación SOFIA (sugerido):** IMPL-20260819-03
**Fecha:** 2026-08-19
**Raíz:** `/home/frank/repos/educacion/Educacion`
**Estado anterior:** IMPL-20260819-02 `VERIFYING` (QA-20260819-02 PASS_WITH_WARNINGS).
**Estado objetivo:** `IN_PROGRESS` → `READY_FOR_VERIFYING` tras los 3 fixes L1.
**Modo:** sin commits, sin push, sin despliegues, sin migraciones, sin dependencias nuevas.

---

## SPEC activa y decisiones de contrato (leer antes de implementar)

- `specs/ADR-20260819-01.md` — **incluye Addendum "Cierre P3 tras QA-20260819-02"** (lectura obligatoria). Registra las 4 decisiones de cierre y que N1/N2 son refinements y N3 restaura el contrato del handoff P2-FIXES.
- `specs/SPEC-HANDOFF-20260819-SOFIA-P2-FIXES.md` — **Fix 2 punto 4 es contrato protegido** (mensaje de fallo de compensación verbatim).
- `specs/QA-20260819-02.md` — auditoría que origina los 4 hallazgos (P3-N1..N4), con evidencia, reproducción y owner recomendado por hallazgo.
- `specs/SPEC_TEC_03_API_Contract.md` §6.6 (clonado atómico, sin cambio) y §6.30 (invariante de hash, sin cambio).
- `specs/SPEC_TEC_06_Plan_Testing.md` T-I-04/T-I-05/T-E2E-05 (sin cambio).

## Referencias funcionales

- D-FIN-5 (PDF "Descargable binario") — preservado, NO rebajar.
- D-FIN-17 (Duplicar/Clonar, sin evaluaciones) — preservado; estos fixes sólo tocan paths de error y lifecycle, no el path de éxito.
- QA-20260819-02 §D (P3-N1..N4) y §G (handoff a INTEGRA).

## Resultado

Cerrar 3 de los 4 P3 de QA-20260819-02 con fixes L1 acotados + tests de regresión específicos, sin alterar producto ni contratos protegidos. El cuarto (P3-N4) se acepta documentadamente (ver §Aceptaciones).

### Decisiones de cierre (resumen ejecutivo)

| Hallazgo | Cierre | Razón condensada |
|---|---|---|
| **P3-N1** errSes sin compensar | **L1** | `planeacion-actions.ts:487-489` devuelve `{ok:false}` sin compensar tras crear la planeacion. Fix = invocar `compensarClonado` antes del return (mismo patrón que los 3 call sites existentes 514/536/559). Cierra "cero huérfanas". |
| **P3-N2** `newPage()` fuera del try | **L1** | `lib/pdf/generate.ts:334` precede al `try`; si `newPage()` lanza, el browser queda huérfano. Fix = el fallo de `newPage()` también cierra el browser y propaga el error. |
| **P3-N3** mensaje fallo compensación + errores intermedios | **L1** | Restaura el contrato del handoff P2-FIXES Fix 2 punto 4. Partes (i) y (ii) acopladas: al usar el booleano en los call sites, éste debe ser exacto → inspeccionar los `{error}` de los 3 deletes. |
| **P3-N4** fragilidad de tests (TZ/ICU/source-text) | **ACEPTADO** | No hay CI externo; tests deterministas hoy. Endurecer cuando exista CI heterogéneo. Ver §Aceptaciones. |

---

## Alcance de archivos/módulos (archivos mutables)

### Unidad A — P3-N2: lifecycle de `newPage()` (archivo: `lib/pdf/generate.ts`)

- **EDIT** `lib/pdf/generate.ts` — función `createPuppeteerRenderer` (líneas ~328-354). Hoy `const page = await browser.newPage();` (línea 334) se ejecuta **antes** del `try`. Reestructurar para que un fallo de `newPage()` ejecute el cierre del `browser` y propague el error al caller.
  - Comportamiento requerido: si `browser.newPage()` lanza/rechaza → `browser.close()` debe invocarse (no huérfano) y `renderHtmlToPdf` debe rechazar con ese mismo error (no hay `page` → no hay PDF → el render falla; el error **se propaga**, no se traga).
  - El path de éxito (newPage OK → setContent → pdf → finally cierra page y browser) no cambia.
  - Decisión interna reversible (§15 SOFIA): cómo estructurar (mover `newPage` dentro del `try` con `let page` y guard `page?.close()` en el finally, o envolver `newPage` con su propio try/catch que cierre el browser y relance). SOFIA elige la forma; INTEGRA sólo fija el comportamiento.
  - **No** tocar `buildPlaneacionHtml`, `formatFechaEsMx`, `getDefaultRenderer`, ni el renderer inyectado de tests.

### Unidad B — P3-N1 + P3-N3: compensación errSes + mensaje/errores intermedios (archivo: `services/planeaciones/planeacion-actions.ts`)

N1 y N3 viven en el mismo archivo y en la misma familia de funciones (`duplicarPlaneacion` + `compensarClonado`); están acoplados (N3 cambia cómo se invoca el booleano que N1 añade en un 4º call site). **Se ejecutan como una sola unidad.**

- **EDIT (P3-N1)** `planeacion-actions.ts:487-489` — bloque `if (errSes) { return { ok: false, error: errSes.message }; }`. Antes del `return`, invocar `await compensarClonado(supabase, nuevaPlaneacionId, sesionesCreadas)`. En este punto `sesionesCreadas` está vacío (se inicializa en línea 477, antes del SELECT del paso 5), por lo que la compensación sólo borrará la `planeacion` recién creada (paso 4). Mismo patrón que los call sites 514/536/559.
- **EDIT (P3-N3 parte ii)** `compensarClonado` (líneas ~611-643) — hoy sólo inspecciona el `{ error }` del delete de `planeacion` (línea 621-631); los deletes de `bloque` (618) y `sesion` (620) no inspeccionan su `{ error }`. Modificar para inspeccionar los 3: cada `delete` se desestructura con `{ error }`; si cualquiera devuelve `error`, se loggea con `console.warn` (incluyendo `nuevaPlaneacionId` y la tabla) y se retorna `false`. Sólo retornar `true` si todos los deletes aplicables (bloque si `sesionesCreadas` no vacío, sesion, planeacion) no devolvieron error y no hubo excepción. El bloque `catch` externo se mantiene.
- **EDIT (P3-N3 parte i)** los **4 call sites** de `compensarClonado` (líneas 487-489 tras N1, 512-519, 535-538, 557-564) — hoy descartan el booleano. Capturar el retorno: `const compensada = await compensarClonado(...)`. Si `!compensada`, devolver `{ ok: false, error: \`Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=${nuevaPlaneacionId}\` }`. Si `compensada === true`, devolver el error original (comportamiento actual). **El mensaje es verbatim el del handoff P2-FIXES Fix 2 punto 4** (no variar texto, no traducir, no abreviar).
  - Nota: el 4º call site (errSes, N1) también aplica esta lógica: si la compensación del path errSes falla (caso patológico), devuelve el mensaje de fallo de compensación; si no, devuelve `errSes.message`.

### Tests (archivos mutables)

- **EDIT** `tests/unit/services/planeaciones/duplicate-compensation.test.ts` — añadir:
  - **AC-P3-1 (N1):** caso "fallo en SELECT de sesiones origen tras insert de planeacion" — mock que permite insert de `planeacion` y luego hace fallar el SELECT de `sesion` por `planeacion_id` origen; assert `r.ok === false`, `store.inserted.planeacion.length === 0` (la planeacion fue compensada) y que se invocó delete sobre `planeacion` con `eq('id', <nueva>)`.
  - **AC-P3-3 (N3 i):** caso "compensación falla (RLS patológico)" — mock cuyos deletes devuelven error; assert `r.ok === false` y `r.error === 'Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=<uuid>'` (verbatim).
  - **AC-P3-4 (N3 ii):** caso "sólo el delete de `bloque` falla" (sesionesCreadas no vacío; deletes de `sesion` y `planeacion` exitosos) — assert `r.ok === false` y `r.error` contiene "Falló la compensación del clonado" (demuestra que el error intermedio del bloque se inspecciona y el booleano es `false`).
  - **No-regresión AC-4:** los casos A/B/C/D existentes siguen assertando el **error original** (la compensación sigue exitosa en esos mocks) → el booleano es `true` → se devuelve el error original. Re-verificar que los 4 casos siguen pasando sin cambio.
- **EDIT** `tests/unit/lib/pdf-generate.test.ts` — añadir:
  - **AC-P3-2 (N2):** caso "si `newPage()` lanza, `browser.close()` se llama y el error propaga" — browser mock cuyo `newPage()` rechaza con un error; assert `browser.close` (spy) llamado 1 vez y `renderHtmlToPdf(html)` rechaza con el error de `newPage`.
  - **No-regresión AC-7:** los 3 tests existentes de `createPuppeteerRenderer` (newPage OK → browser.close llamado; tolera error de browser.close; tolera error de page.close) siguen pasando sin cambio.

### Justificación de paralelismo (independencia Unidad A vs Unidad B)

- **Archivos disjuntos:** Unidad A edita `lib/pdf/generate.ts` (+ `tests/unit/lib/pdf-generate.test.ts`); Unidad B edita `services/planeaciones/planeacion-actions.ts` (+ `tests/unit/services/planeaciones/duplicate-compensation.test.ts`). Cero solapamiento.
- **Acoplamiento verificado (grep):** `planeacion-actions.ts` no importa `lib/pdf/generate` (0 ocurrencias); `lib/pdf/generate.ts` no importa `planeacion-actions` (0 ocurrencias). N1+N3 están acoplados entre sí (misma familia de funciones) → van juntos; N2 es independiente.
- **Recomendación INTEGRA:** dada la independencia, 2 SOFIAs en paralelo son viables (Grupo A = N2; Grupo B = N1+N3). No obstante, el tamaño total es trivial (~22 líneas de producción: N1 ≈1, N2 ≈5, N3 ≈16) — por la regla "tarea trivial <3 archivos → secuencial" (§19), **1 SOFIA secuencial es el default pragmático**; ATLAS puede optar por 2 paralelas si el wall-clock lo justifica, usando la división arriba. N1+N3 **nunca** se parten entre 2 SOFIAs (comparten archivo y familia de funciones).
- No hay lockfile, config, barrel ni contrato mutable compartido. Las validaciones globales (typecheck/lint/test/build) corren al cierre; si se paraleliza, serializar el `pnpm test`/`build` final o usar worktrees separados.

---

## Contratos que cambian

- **Ninguno público.** §6.6 (semántica de clonado) y §6.30 (invariante de hash) sin cambio. El retorno de `duplicarPlaneacion` sigue siendo `{ok:boolean, error?:string, ...}`; sólo varía la **cadena** del `error` en el caso patológico de fallo de compensación (que el handoff P2-FIXES Fix 2 punto 4 ya mandató). El contrato del renderer (`PdfRenderer.renderHtmlToPdf`) no cambia firma ni retorno.

## Contratos protegidos (no tocar)

- D-FIN-5 (binario descargable) — N2 no altera el render ni el binario; sólo el lifecycle.
- D-FIN-17 (clonado sin evaluaciones) — N1/N3 sólo tocan paths de error; el path de éxito (paso 7, `evaluacionesCopiadas=0`, `clonada_de`, sufijo) intacto.
- RLS por CCT (migración 0014) — la compensación sigue usando el mismo cliente Supabase con cookies.
- `planeacion.clonada_de` (0010), `entrega.pdf_sha256` (0013), `entrega.doc_pdf_storage_path` (0013) — sin cambios.
- Plantilla HTML de planeación (§3.5) — sin cambios.
- `lib/auth/url-firmada.ts`, `getDefaultRenderer`, `buildPlaneacionHtml`, `formatFechaEsMx` — sin cambios.
- `discovery/`, `fuentes/`, `SPEC_MVP_01_Modulo_Docente.md`, `supabase/migrations/*.sql`, `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `tsconfig.json` — sin cambios.
- Sin migraciones, sin dependencias nuevas, sin `.env`, sin commits/push/PR/staging/producción.

---

## Criterios AC (verificables por ejecución)

### Unidad A — P3-N2

- **AC-P3-2:** Si `browser.newPage()` lanza/rechaza, `createPuppeteerRenderer.renderHtmlToPdf` invoca `browser.close()` (1 vez) y rechaza con el error de `newPage` (no lo traga). **Validación:** `PDF_GENERATOR=playwright pnpm test tests/unit/lib/pdf-generate.test.ts` — nuevo test "AC-7: si newPage() lanza, browser.close() se llama y el error propaga" PASS.
- **AC-P3-2b (no-regresión):** Los 3 tests AC-7 existentes (`createPuppeteerRenderer`) siguen PASS (newPage OK → browser.close llamado; tolera error de browser.close; tolera error de page.close). **Validación:** misma ejecución de suite anterior; 3 tests PASS sin cambio.

### Unidad B — P3-N1 + P3-N3

- **AC-P3-1 (N1):** Si el SELECT de sesiones origen falla tras insert exitoso de `planeacion`, `duplicarPlaneacion` invoca `compensarClonado` y el store termina con `store.inserted.planeacion.length === 0`. **Validación:** `PDF_GENERATOR=playwright pnpm test tests/unit/services/planeaciones/duplicate-compensation.test.ts` — nuevo caso "AC-4 caso E: fallo en SELECT de sesiones origen" PASS; assert `r.ok === false` y `store.inserted.planeacion.length === 0`.
- **AC-P3-3 (N3 i):** Si `compensarClonado` retorna `false`, los call sites devuelven verbatim `error: 'Falló la compensación del clonado; revisar filas huérfanas para planeacion_id=<id>'`. **Validación:** nuevo caso "compensación falla (RLS patológico)" PASS; assert `r.ok === false` y `r.error` === la cadena verbatim con el UUID.
- **AC-P3-4 (N3 ii):** Si sólo el delete de `bloque` falla (sesion y planeacion exitosos, sesionesCreadas no vacío), `compensarClonado` retorna `false` (error intermedio inspeccionado) → el caller devuelve el mensaje de fallo de compensación. **Validación:** nuevo caso "sólo delete de bloque falla" PASS; assert `r.error` contiene "Falló la compensación del clonado".
- **AC-P3-4b (no-regresión AC-4):** Los casos A/B/C/D existentes siguen devolviendo el **error original** (compensación exitosa → booleano `true`). **Validación:** los 4 casos existentes PASS sin modificación de sus aserciones.
- **AC-P3-5 (no-regresión AC-5):** La compensación sigue operando sólo sobre IDs del intento (fila ajena sembrada no se borra). **Validación:** el test AC-5 existente PASS sin cambio.
- **AC-P3-6 (no-regresión AC-6):** El path de éxito de `duplicarPlaneacion` no regresa. **Validación:** `PDF_GENERATOR=playwright pnpm test tests/unit/services/planeaciones/duplicate.test.ts tests/integration/api/v1/planeaciones/duplicate.integration.test.ts` PASS (8 + 4 tests).

### Validaciones globales (regresión)

- **AC-G1:** `pnpm typecheck` exit 0, sin errores. **Validación:** `pnpm typecheck` → exit 0.
- **AC-G2:** `pnpm lint` exit 0 (1 warning preexistente `lib/supabase/server.ts:11` tolerado, no introducido). **Validación:** `pnpm lint` → exit 0.
- **AC-G3:** `PDF_GENERATOR=playwright pnpm test` sin regresión: 86 tests previos + los nuevos tests P3 siguen pasando; 2 skipped preexistentes (RLS cross-tenant) siguen skipped. **Validación:** conteo `Tests passed` ≥ 86+3 (los 3 nuevos), 0 fallas.
- **AC-G4:** `pnpm build` exit 0. **Validación:** `pnpm build` → `✓ Compiled successfully`.

---

## Casos borde

- **N1 (errSes) con `sesionesCreadas` vacío:** la compensación omite el delete de `bloque` (array vacío), el delete de `sesion` (0 filas con `planeacion_id = nueva`) y borra la `planeacion`. No lanzar. (Ya cubierto por el caso borde del handoff P2-FIXES línea 114; reusar el invariante.)
- **N1 (errSes) y la compensación misma falla:** retorna el mensaje de fallo de compensación (AC-P3-3 aplicado al 4º call site).
- **N2 con `newPage()` OK:** path de éxito sin cambio; el `finally` cierra `page` y `browser`.
- **N2 con `newPage()` lanza y `browser.close()` también lanza:** el `.catch(() => undefined)` sobre `browser.close()` traga el error de cierre; el error que propaga `renderHtmlToPdf` es el de `newPage` (no el de cierre).
- **N3 con `sesionesCreadas` vacío:** el delete de `bloque` se omite (no hay error que inspeccionar); se inspeccionan sesion y planeacion.
- **N3 path de éxito:** `compensarClonado` no se invoca (sólo en paths de error); el path de éxito no se ve afectado.

## Validaciones detectadas

- `pnpm typecheck` (`tsc --noEmit`) — obligatorio, exit 0.
- `pnpm lint` — obligatorio, exit 0.
- `PDF_GENERATOR=playwright pnpm test` — obligatorio; unit + integration + smoke. Los tests nuevos (AC-P3-1/2/3/4) deben pasar.
- `pnpm build` — obligatorio, exit 0.
- **No ejecutables en sandbox (declarar "NO EJECUTADA" con razón):** E2E Playwright, RLS cross-tenant contra Postgres real, compensación contra Postgres real (verificada contra mock fiel al contrato supabase-js). Mismo régimen que QA-20260819-02.

## Restricciones

- **Sin commits, push, PR, staging, producción, ni migraciones aplicadas.** (Frank, este turno.)
- No modificar `discovery/*`, `fuentes/*`, `SPEC_MVP_01_Modulo_Docente.md`, `supabase/migrations/*.sql`, `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `tsconfig.json`, `playwright.config.ts`.
- No introducir dependencias nuevas.
- No modificar RLS existente.
- No alterar la semántica de `duplicarPlaneacion` (mismo clonado, mismas evaluaciones=0, mismo `clonada_de`, mismo path de éxito).
- No cambiar la firma ni el retorno de `PdfRenderer.renderHtmlToPdf`.
- No tocar `buildPlaneacionHtml`, `formatFechaEsMx`, `getDefaultRenderer`, la plantilla HTML (§3.5), ni el renderer inyectado de tests.
- No intentar cerrar la causa (b) `/CreationDate`/`/ModDate` (residual, fuera de alcance).
- No implementar la RPC `duplicar_planeacion` ni subir a Storage (diferidas a `ARCH-20260819-02`).
- El mensaje de fallo de compensación es **verbatim** (handoff P2-FIXES Fix 2 punto 4); no variar.
- Español es-MX en mensajes y logs.
- Si dudas con 80% de confianza leyendo 1-2 archivos más, resuelve sin escalar. Si dudas del contrato, escala vía SPEC-GAP.

## Dependencias

- Sin nuevas. `puppeteer-core`, `@sparticuz/chromium`, `zod`, `@supabase/sss`, `vitest` ya presentes.

## DoD

- AC-P3-1, AC-P3-2 (+AC-P3-2b), AC-P3-3, AC-P3-4 (+AC-P3-4b, AC-P3-5, AC-P3-6) cubiertos con evidencia reproducible.
- AC-G1..AC-G4 PASS (typecheck, lint, tests, build) sin regresión.
- Reporte `specs/IMPL-20260819-03_report.md` (nuevo ID) con: archivos modificados, criterios cubiertos, validaciones (comando + resultado), notas de reversión, estado `READY_FOR_VERIFYING` o `BLOCKED`.
- **Solicitar re-auditoría a GEMINI** (`subagent_type='gemini'`) sobre el incremento P3 antes de declarar DONE. INTEGRA lanzará GEMINI al recibir el reporte — SOFIA no necesita invocarla.

## Aceptaciones documentadas (P3-N4)

- **P3-N4 — ACEPTADO** por INTEGRA el 2026-08-19. Razón: no existe CI externo/heterogéneo; los tests AC-1 y AC-2 pasan deterministamente en el entorno actual (CST + ICU es-MX + vitest sin minificar), verificado por GEMINI en QA-20260819-02 (re-ejecución verbose PASS). Endurecer ahora es trabajo especulativo sin señal de fallo.
- **Condición de re-evaluación:** al configurar un CI con runner en TZ distinta a CST o con minificación de tests, endurecer: (a) AC-2 → aserciones estructurales (contiene "agosto" y "2026") o TZ fijada por env en el test; (b) AC-1 → reemplazar la aserción de source-text (`Function.toString().includes('new Date()')`) por la conductual ya existente ("mismo input → mismo HTML").
- **Owner del endurecimiento futuro:** SOFIA vía INTEGRA, en lote dedicado cuando se configure CI externo. No bloquea DONE de este incremento.

## Prohibido inferir

- No asumir que `newPage()` siempre funciona — manejar su fallo (N2).
- No asumir que la compensación siempre tiene sesiones/bloques que borrar — manejar arrays vacíos (N1, N3).
- No asumir que los deletes intermedios siempre exitosos — inspeccionar sus `{ error }` (N3 ii).
- No alterar el mensaje verbatim de fallo de compensación.
- No cambiar el path de éxito de `duplicarPlaneacion` ni el render de PDF.
- No exportar `compensarClonado` (sigue interna; los tests la ejercitan vía `duplicarPlaneacion` contra el mock store).

---

**Fin del SPEC-HANDOFF.** INTEGRA declara **READY** (DoR §5.2 cumplido: ID + prioridad, SPEC activa, referencias funcionales, resultado técnico, contratos afectados/protegidos, criterios verificables ejecutables, dependencias disponibles, comandos de validación detectados, sin decisiones bloqueantes).
