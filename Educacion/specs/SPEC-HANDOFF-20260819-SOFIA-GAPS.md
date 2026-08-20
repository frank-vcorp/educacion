# SPEC-HANDOFF — SOFIA: Cierre gaps D-FIN-5 (PDF binario) + D-FIN-17 (duplicar)

**Origen:** INTEGRA
**ID intervención:** ARCH-20260819-01
**ID implementación SOFIA (sugerido):** IMPL-20260819-01
**Fecha:** 2026-08-19
**Modo:** Nocturno con autorización vigente de Frank ("pues a darle"). **Sin commits, sin push, sin despliegues, sin migraciones.** Sólo código + tests + validaciones locales.
**Raíz:** `/home/frank/repos/educacion/Educacion`
**WIP:** 1 (una instancia SOFIA; las dos sub-unidades se ejecutan secuenciales dentro de la misma sesión).

---

## SPEC activa

- `specs/SPEC_TEC_03_API_Contract.md` (corregida hoy): **§6.30 nuevo** (Descargar PDF binario, E30) + **§6.6** (Duplicar, con nota de transporte) + **§5** catálogo (E30) + **§12** AC 11/12/13.
- `specs/SPEC_TEC_02_Modelo_Datos.md` §5.3.6 (`planeacion.clonada_de` ya existe), §5.3.13 (`entrega.pdf_sha256`/`doc_pdf_storage_path` ya existen). **No se requieren migraciones.**
- `specs/SPEC_TEC_06_Plan_Testing.md` T-I-04 (duplicar), T-E2E-05 (PDF binario, pasos 4-5 + `pdf_sha256`), T-I-05 (celda PDF hash).
- `specs/AUDITORIA_INTEGRA_ADDENDUM_2026-08-18.md` §1 (desviación D-FIN-5 a cerrar).

## Referencias funcionales

- D-FIN-5 (PDF triple, "Descargable" binario) — `fuentes/E22_CIERRE_DISCOVERY.md` §D-FIN-5.
- D-FIN-17 (Duplicar/Clonar planeación) — `fuentes/E22_CIERRE_DISCOVERY.md` §D-FIN-17.
- FND-20260818-04 (PDF binario no materializado) — `discovery/FINDINGS.md`.
- FND-20260818-02 (clonado sin implementación) — `discovery/FINDINGS.md`.

## Resultado

Cerrar dos gaps de implementación MVP confirmados, sin alterar producto ni discovery:

1. **D-FIN-5 "Descargable binario":** el botón "Descargar PDF" produce un `.pdf` binario real (no HTML imprimible), con SHA-256 verdadero, y `entrega.pdf_sha256` deja de ser placeholder.
2. **D-FIN-17 "Duplicar/Clonar":** la maestra puede clonar una planeación a otro grupo (o el mismo), copiando estructura (sesiones + bloques) pero NO evaluaciones.

## Alcance de archivos/módulos

### Sub-unidad A — D-FIN-5 PDF binario (archivos mutables)

- **NEW** `lib/pdf/generate.ts` — renderer HTML→PDF binario reutilizable. Devuelve `{ pdf: Buffer, sha256: string, size: number }`. Usa `puppeteer-core` + `@sparticuz/chromium` (ya en `package.json`). Recibe la plantilla HTML de planeación como input.
- **EDIT** `app/api/planeaciones/[id]/generar-pdf/route.ts` — refactor: usar `lib/pdf/generate.ts`, retornar `application/pdf` + `Content-Disposition: attachment` + header `X-Pdf-Sha256`. Conservar ownership check (línea 35 `docente_id !== session.docenteId` → 403) y la plantilla HTML existente (encabezado, problema contexto, campos, ejes, PDA, ajustes, footer CCT).
- **EDIT** `services/entregas/entrega-actions.ts` — reemplazar `placeholderHash` por hash real del binario generado vía `lib/pdf/generate.ts`. `doc_pdf_url` apunta a fuente binaria real. `pdf_sha256` persistido = hash del MISMO binario que E30.
- **NEW** `tests/unit/lib/pdf-generate.test.ts` — hash estable (mismo input → mismo hash), size > 10 KB, buffer con cabecera `%PDF-`.
- **NEW** `tests/integration/api/v1/planeaciones/generar-pdf.integration.test.ts` — 200 `application/pdf` + attachment + `X-Pdf-Sha256`; 401 sin sesión; 403 cross-docente; 404; 422 si chromium no disponible (mock/no env).

### Sub-unidad B — D-FIN-17 duplicar (archivos mutables)

- **NEW/EDIT** `services/planeaciones/planeacion-actions.ts` — añadir `duplicarPlaneacion(input)` (Server Action, patrón consistente con `createPlaneacion`). Clona `planeacion` + `sesion` + `bloque` a `grupo_destino_id`; NO clona `evaluacion_alumno`. Puebla `clonada_de = original.id`. `nombre + sufijo` (default "(copia)"). Valida RLS: `grupo_destino_id` pertenece al docente (mismo CCT) → si no, error `NEM_AUTH_RLS_VIOLATION` (o `{ok:false, error}` según patrón del archivo).
- **NEW** `app/...` UI: botón "Duplicar/Clonar" en vista de planeación + modal "¿Clonar para qué grupo?" con selector de grupos del docente (D-FIN-17). Reutilizar patrones UI existentes (shadcn/ui, Radix Dialog ya en deps). Si no existe una vista de detalle/lista de planeaciones consumible, ubicar el botón donde la maestra ve sus planeaciones (leer `app/` y `components/planeaciones/` para no duplicar).
- **NEW** `tests/unit/services/planeaciones/duplicate.test.ts` — lógica de clonado: cuenta de sesiones/bloques copiados == original; `clonada_de` correcto; `nombre` con sufijo; evaluaciones NO copiadas (count 0 en destino).
- **NEW** `tests/integration/api/v1/planeaciones/duplicate.integration.test.ts` — T-I-04: (a) mismo grupo, (b) otro grupo del docente, (c) evaluaciones no copiadas, (d) RLS 403 si `grupo_destino_id` de otro CCT.

### Independencia A vs B (evidencia)

Conjuntos de archivos mutables **disjuntos**:
- A: `lib/pdf/generate.ts`, `generar-pdf/route.ts`, `services/entregas/entrega-actions.ts`, tests pdf.
- B: `services/planeaciones/planeacion-actions.ts`, UI duplicar, tests duplicate.
- Ambos sólo **leen** libs compartidos no mutados: `lib/supabase/server.ts`, `lib/auth/session.ts`, `lib/utils.ts`, `lib/auth/url-firmada.ts` (sólo A).
- **Sin archivo mutable compartido.** La decisión de ejecutar A→B secuencial en una sola sesión (no paralelo) se debe a que ambas validan con `pnpm typecheck`/`pnpm test` en el mismo workspace (sin worktree aislado, que requeriría `agent_manager` no solicitado por Frank); serializar evita races sobre `tsconfig.tsbuildinfo`/cache. WIP=1 se preserva.

## Contratos que cambian

- **E30 (NEW):** `GET /api/planeaciones/:id/generar-pdf` pasa de `text/html` inline → `application/pdf` attachment + `X-Pdf-Sha256`. Ver §6.30.
- `services/entregas/entrega-actions.ts`: `pdf_sha256` deja de ser placeholder → hash real; `doc_pdf_url` → fuente binaria real.
- **NEW acción** `duplicarPlaneacion` (D-FIN-17): añade capacidad de clonado. Transporte Server Action (nota §6.6).

## Contratos protegidos (no tocar)

- RLS por CCT en `planeacion`/`sesion`/`bloque`/`entrega`/`evaluacion_alumno` (migración 0014). El clonado debe respetar `docente_id = auth.uid()` y `cct = user_cct()`.
- `planeacion.clonada_de` (ya en esquema 0010) — pueblar, no redefinir.
- `entrega.pdf_sha256 NOT NULL` (0013) — debe quedar con hash real, no nulo.
- Regla dura P-PD9/P-PD8: la IA no muta planeación. (No aplica a estos gaps, pero preservar el invariant.)
- JWT URL firmada (`lib/auth/url-firmada.ts`) — no modificar su contrato sign/verify.
- Soft-delete y `audit_log` existentes.
- La plantilla HTML de planeación (encabezado, secciones §3.5) — reutilizar, no introducir plantilla paralela.

## Criterios AC (verificables por ejecución)

### Sub-unidad A — D-FIN-5

- **AC-A1:** `GET /api/planeaciones/:id/generar-pdf` con docente owner retorna `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="planeacion-<id>.pdf"`. **Validación:** `curl -sD - http://localhost:3000/api/planeaciones/<id>/generar-pdf -H "Cookie: sb-...=..." | head -20` muestra `Content-Type: application/pdf`.
- **AC-A2:** El cuerpo binario comienza con `%PDF-` y pesa > 10 KB para una planeación con contenido §3.5. **Validación:** test `pdf-generate.test.ts` aserta `buffer.subarray(0,5)` === `%PDF-` y `size > 10240`.
- **AC-A3:** Header `X-Pdf-Sha256` presente, 64 hex chars, y == SHA-256 del cuerpo. Mismo input (misma planeación + mismo template) → mismo hash. **Validación:** test unitario; dos llamadas idénticas → mismo `X-Pdf-Sha256`.
- **AC-A4:** `entrega-actions.ts` persiste `pdf_sha256` real (regex `^[a-f0-9]{64}$`), NO `sha256-<id>-<ts>`. El hash de la entrega coincide con el de E30 para la misma planeación. **Validación:** test unitario sobre `entregarDirector` (mock supabase) aserta `pdf_sha256` matchea `^[a-f0-9]{64}$` y no contiene `placeholder`.
- **AC-A5:** Errores: 401 sin sesión; 403 si `:id` es de otro docente; 404 inexistente; 422 `NEM_ENTREGA_PDF_GENERATION_FAILED` si `PDF_GENERATOR !== 'playwright'` o chromium no disponible. **Nunca** retorna `text/html`. **Validación:** integration test con env/mock.
- **AC-A6:** `pnpm typecheck` sin errores; `pnpm lint` sin errores.

### Sub-unidad B — D-FIN-17

- **AC-B1:** `duplicarPlaneacion({planeacionId, docenteId, cct, grupoDestinoId})` crea una nueva `planeacion` con `clonada_de = <original.id>`, `nombre = <original.nombre> + sufijo` (default "(copia)"), `estado='borrador'`, `grupo_id = grupoDestinoId`. **Validación:** test unitario.
- **AC-B2:** Copia **todas** las `sesion` (con `numero`, `fase_interna`, `duracion_min`, `ajustes_sesion`) y **todos** los `bloque` (con `tipo`, `nivel_flexibilidad`, `contenido_textual`, `pda_ids`, `campos_formativos`, `ejes_articuladores`, `recursos_requeridos`, `orden`, `origen`) a la nueva planeacion, con nuevos UUIDs y `planeacion_id`/`sesion_id` apuntando a los nuevos. **Validación:** test unitario: `count(sesion) destino == origen`; `count(bloque) destino == origen`.
- **AC-B3:** **NO** copia `evaluacion_alumno` (count 0 en destino, sin importar `copiar_evaluaciones`). `copiar_evaluaciones` default `false`; si `true` se documenta como no soportado en MVP (retorna error o ignora con warning — decisión reversible de SOFIA, pero el default `false` es contrato). **Validación:** test unitario: 0 evaluaciones en destino.
- **AC-B4:** RLS: si `grupoDestinoId` no pertenece al docente/CCT → rechazo (403 equivalente o `{ok:false, error:'NEM_AUTH_RLS_VIOLATION'}`). **Validación:** integration test T-I-04 caso (d).
- **AC-B5:** UI: botón "Duplicar/Clonar" visible en vista de planeación; modal con selector de grupos del docente; tras clonar, redirect o toast a la nueva planeacion. **Validación:** si Playwright E2E factible (build+start+supabase), flujo mínimo; si no, **revisión visual** declarada explícitamente (SPEC testeable §8: "validación: revisión visual" para UI humana cuando no haya E2E).
- **AC-B6:** `pnpm typecheck` sin errores; `pnpm lint` sin errores.

## Casos borde

- **A:** Planeación sin `producto_integrador` o sin PDA → botón deshabilitado en UI; si se llama al endpoint, 422 con `details` (criterio §3.5). Chromium no disponible → 422 (no HTML). Timeout > 60s → 422.
- **B:** Clonar al **mismo** grupo → permitido (crea copia distinta). `nombre_sufijo` custom (maxLength 20). Grupo destino inactivo → ¿permitir? Decisión reversible SOFIA; default: permitir (el grupo destino es del docente). `clonada_de` puede formar cadena (clonar un clon) — sin ciclo (es FK a original, no a sí misma).
- **A+B:** No hay dependencia entre A y B; fallo de una no bloquea la otra.

## Validaciones detectadas

- `pnpm typecheck` (`tsc --noEmit`) — **obligatorio, sin errores**.
- `pnpm lint` (`next lint && tsc --noEmit`) — **obligatorio, sin errores**.
- `pnpm test` (vitest run) — unit tests nuevos (pdf-generate, duplicate) **deben pasar**. Estos no requieren Supabase local.
- `pnpm test:e2e` (playwright) — requiere `pnpm build && pnpm start` + Supabase local. Si el sandbox nocturno no permite levantarlos, **declarar "NO EJECUTADA"** con razón; implementar los archivos de test igual para que queden listos.
- Integration tests (T-I-04, generar-pdf integration) requieren Supabase local (`pnpm supabase:start`). Si no disponible, declarar "NO EJECUTADA".

## Restricciones

- **Sin commits, push, PR, despliegues, migraciones, ni cambios en `.env`.** (Autorización nocturna de Frank.)
- No modificar `discovery/*`, `fuentes/*`, `SPEC_MVP_01_Modulo_Docente.md`.
- No modificar migraciones `supabase/migrations/*.sql` (las columnas necesarias ya existen).
- No introducir dependencias nuevas (puppeteer-core, @sparticuz/chromium, playwright, zod, jose ya están).
- No exponer `SUPABASE_SERVICE_ROLE_KEY` al bundle cliente.
- No cambiar el contrato de `lib/auth/url-firmada.ts`.
- No reescribir la plantilla HTML de planeación (reutilizar la de `generar-pdf/route.ts`).
- Siempre en español es-MX para mensajes de usuario.

## Dependencias

- `puppeteer-core` ^23.1.0, `@sparticuz/chromium` ^127.0.0, `playwright` ^1.46.0 (PDF).
- `@supabase/ssr`, `lib/supabase/server.ts` (duplicar + entrega).
- `zod` (validación input duplicar).
- `jose` (JWT, ya usado por url-firmada).
- shadcn/ui + Radix (UI modal duplicar).

## DoD

- AC-A1..A6 y AC-B1..B6 cubiertos con evidencia reproducible.
- `pnpm typecheck` + `pnpm lint` PASS.
- Unit tests nuevos PASS (pdf-generate, duplicate).
- Integration/E2E: PASS si ejecutables, o "NO EJECUTADA" con razón documentada.
- Sin `text/html` en generar-pdf; sin placeholder en `pdf_sha256`.
- Reporte IMPL-20260819-01 con archivos modificados, criterios cubiertos, validaciones (comando + resultado), desviaciones/riesgos, estado `READY_FOR_VERIFYING` o `BLOCKED`.
- **Solicitar revisión final a GEMINI** (`subagent_type='gemini'`) como segunda mano de validación antes de marcar listo (cambio no trivial: nuevo endpoint binario + integridad `pdf_sha256` + RLS en clonado).

## Prohibido inferir

- No asumir que `PDF_GENERATOR=playwright` está activo en dev local — verificar `process.env.PDF_GENERATOR` y manejar el caso ausente con 422 graceful.
- No inventar un bucket de Storage si `PDF_STORAGE_BUCKET` no está configurado — el hash debe ser real igual (sobre el binario generado), aunque no se suba a Storage.
- No asumir que existe una vista de detalle de planeacion con lugar para el botón — leer `app/` y `components/planeaciones/` antes de ubicar el botón D-FIN-17.
- No clonar `evaluacion_alumno` (es contrato D-FIN-17: "Evaluaciones vacías").
- No modificar RLS existente.

---

**Fin del SPEC-HANDOFF.** INTEGRA declara **READY** (DoR §5.2 cumplido).
