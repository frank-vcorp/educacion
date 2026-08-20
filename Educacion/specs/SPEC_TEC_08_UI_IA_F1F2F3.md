# SPEC_TEC_08 — Unidad UI para activación de F1/F2/F3 (prueba real Tía Lola) + AC-28 E2E

- **ID:** SPEC-20260820-08
- **Estado:** DRAFT v1.0 — lista para handoff a SOFIA; pendiente de implementación + re-auditoría GEMINI. Sin autorización de commit/push/deploy este turno.
- **Propietario:** INTEGRA
- **Fuentes funcionales:** P-PD9 (IA sólo sugiere, la maestra acepta vía PATCH), D-FIN-13 (server-side + anonimizador + cero datos de menores), baseline §3.7 (features IA F1/F2/F3).
- **Fuentes técnicas:**
  - `specs/SPEC_TEC_07_Capa_IA.md` §5.1 (F1), §5.2 (F2), §5.3 (F3), §6.1/§6.1.1 (trazabilidad audit_log), §11 AC-28, §16 (checklist producción).
  - `specs/ADR-20260819-02.md` Decisiones 3/9 (trazabilidad propuesta→aceptación).
  - `specs/ADR-20260820-01.md` (resolución P2-RLS; gate de staging: política INSERT aplicada).
  - `specs/QA-20260819-05.md` §D P2-RLS, §F (staging/producción NO_LISTO por UI inexistente = P3-8 de QA-04).
  - `app/(app)/planeaciones/[id]/page.tsx` (vista detalle actual: read-only, Cards, sin botones IA ni editor de bloques).
  - `components/planeaciones/wizard-planeacion.tsx:694,904` (MVP actual: planeación se guarda **sin sesiones/bloques**; "después podrás arrastrar bloques del catálogo M1 en la vista de edición").
  - `components/ia/.gitkeep` (directorio vacío; 0 componentes UI referencian los routes IA — confirma P3-8).
  - Routes IA: `app/api/planeaciones/[id]/ia/{variantes-bloque,help-redaccion,pulir-pdf}/route.ts`.
  - `services/planeaciones/update-actions.ts` (`updateBloque`, `updatePlaneacion` — server actions PATCH).
  - `Encuesta_Tia_Lola.md` (Tía Lola: maestra+directora, planea de noche en la cama con el celular → **mobile-first, baja fricción**).

---

## 1. Resultado

Proveer la unidad UI mínima para que Tía Lola (1 docente de confianza, prueba real en Vercel) pueda activar las 3 features IA (F1 variantes de bloque, F2 ayuda redacción, F3 pulir PDF) desde la interfaz, ver la sugerencia, aceptarla (persistencia vía PATCH con `origen='ia_sugerencia'`), y descargar el PDF con campos pulidos. Esto desbloquea AC-28 (E2E Playwright), que es gate de staging/producción (SPEC_TEC_07 §15) y hoy es `N/A` por UI inexistente (QA-05 §B).

## 2. Alcance (incluido) y exclusiones

### Incluido
- Extensión de la vista detalle `app/(app)/planeaciones/[id]/page.tsx` con un **panel IA** (3 botones + área de sugerencia + aceptar/rechazar).
- **Vista mínima de bloques** en la planeación (lista + editor de `texto_base`), necesaria para que F1/F2 sean operables (hoy el wizard no crea bloques). Esto es alcance técnico mínimo, **no** el editor de bloques completo (drag-drop catálogo M1 = Fase 2).
- Integración de los 3 botones con los routes IA existentes (`/api/planeaciones/[id]/ia/*`).
- Integración de aceptación con los server actions existentes (`updateBloque`, `updatePlaneacion`).
- Estados de UI: idle, loading, success, error (`NEM_IA_*`), `fallback_vacio`.
- AC-28: definición E2E testeable (Playwright) cubriendo los 3 flujos (a)(b)(c) de SPEC_TEC_07 §11.

### Exclusiones
- Editor de bloques completo con drag-drop del catálogo M1 (Fase 2; `wizard-planeacion.tsx:694` lo declara diferido).
- Gestión de sesiones (Fase 2; `wizard-planeacion.tsx:904`).
- Migración `ia_sugerencia` (`0020`) — sigue pendiente de aplicación; la trazabilidad opera vía `audit_log` + `bloque.origen` (SPEC §6.1, suficiente para la prueba).
- Cambios a los routes IA, `services/ia/*`, `lib/ia/*` (inmutables este turno; QA-05 PASS_WITH_WARNINGS).
- Cambios al anonimizador (R-IA-10 aceptado, ADR-02).

## 3. Contrato de rutas (dónde se exponen F1/F2/F3)

| Ruta (Next.js App Router) | Componente raíz | Propósito |
|---|---|---|
| `app/(app)/planeaciones/[id]/page.tsx` (extender la existente) | `PlaneacionDetallePage` (server component) | Vista detalle; añade sección "Bloques" + "Asistente IA" |
| — sub-componente cliente `components/ia/ia-sugerencia-panel.tsx` (NUEVO) | `IASugerenciaPanel` | Botones F1/F2/F3 + estado + área de sugerencia + aceptar/rechazar |
| — sub-componente cliente `components/planeaciones/bloque-editor.tsx` (NUEVO) | `BloqueEditor` | Lista de bloques + editor `texto_base` + trigger F1/F2 por bloque |
| `app/api/planeaciones/[id]/ia/variantes-bloque/route.ts` (existente, inmutable) | — | F1 |
| `app/api/planeaciones/[id]/ia/help-redaccion/route.ts` (existente, inmutable) | — | F2 |
| `app/api/planeaciones/[id]/ia/pulir-pdf/route.ts` (existente, inmutable) | — | F3 |
| `app/api/planeaciones/[id]/generar-pdf/route.ts` (existente) | — | Descarga PDF (F3 acepta → redirige/descarga) |

**Nota de arquitectura:** los componentes cliente usan `fetch` nativo a los routes IA (D-FIN-13 server-side preservado: la llamada al proveedor ocurre sólo en el route, nunca en el navegador). `AI_API_KEY` nunca cruza al bundle (AC-23, ya verificado por QA-05).

## 4. Modelo técnico (contratos de componente, sin código de producción)

### 4.1 `BloqueEditor` (cliente) — prerrequisito para F1/F2

La planeación NEM se compone de bloques; hoy el wizard no los crea (MVP). Para que Tía Lola pruebe F1/F2, la unidad UI debe permitir **crear/ver/editar** al menos un bloque por planeación.

**Contrato de props (firma, no implementación):**

```
BloqueEditor({ planeacionId, docenteId, cct, bloques: Bloque[] }): JSX
```

- `bloques`: array de bloques de la planeación (cargados server-side en `page.tsx` vía `getPlaneacion` extendido o `getBloques(planeacionId)`).
- Permite: (a) listar bloques existentes; (b) crear un bloque mínimo (texto_base + referencias a PDA/campo/eje ya en la planeación); (c) editar `texto_base` inline; (d) exponer, por bloque, los botones F1 "Variante de bloque" y F2 "Ayuda a redactar".
- **Persistencia:** crear/editar bloque vía server action existente (`createBloque`/`updateBloque` en `services/planeaciones/update-actions.ts` o equivalente; SOFIA verifica el contrato real del action y reporta si falta `createBloque` — ver §10 Dependencias).

### 4.2 `IASugerenciaPanel` (cliente) — los 3 botones + estado + aceptar/rechazar

**Contrato de props:**

```
IASugerenciaPanel({
  planeacionId, bloqueId?, docenteId, cct,
  feature: 'F1' | 'F2' | 'F3',
  textoBase?: string,        // F1/F2: texto_base del bloque
  camposPulir?: string[],    // F3: ['problema_contexto','proposito','producto_integrador','ajustes_razonables']
}): JSX
```

- Un panel reutilizable instanciado por feature. `BloqueEditor` instancia F1/F2 por bloque; la cabecera de planeación instancia F3.
- **Estados (máquina):** `idle → loading → {success | fallback_vacio | error} → {accepted | rejected}`.
- **Fetch al route IA:** `POST /api/planeaciones/[id]/ia/<feature>` con body según SPEC_TEC_07 §6.24-6.26 (F1: `{ bloque_id, variante_tipo }`; F2: `{ bloque_id, edad_destino? }`; F3: `{ campos_a_pulir: [...] }`). El route ya valida zod + RLS + anonimiza + llama proveedor (inmutable).
- **Render de la sugerencia:**
  - F1: `variante_texto` (string) en un área de texto editable (la maestra puede ajustar antes de aceptar).
  - F2: `texto_propuesto` (string) en área editable.
  - F3: `campos_pulidos` (objeto `{campo: valor}`) en campos editables.
  - `origen` (`'ia'` | `'cache'` | `'fallback_vacio'`) visible como badge (transparencia para la docente).
- **No se autocompleta** (P-PD9): la sugerencia aparece en el panel, **no** se escribe automáticamente en el bloque/planeación. La docente debe pulsar "Aceptar" (SPEC §11 AC-28 b).
- **Aceptar** → invoca server action (`updateBloque` con `texto=<sugerencia (o edición)>`, `origen='ia_sugerencia'` para F1/F2; `updatePlaneacion` con campos pulidos para F3). Tras PATCH OK, el bloque/planeación se revalida (router refresh o re-fetch).
- **Rechazar** → descarta la sugerencia (no hay PATCH; el `audit_log` POST ya registró la propuesta; no se persiste aceptación). Opcional: insertar fila de rechazo cuando `0020` esté aplicada (cierre total).

### 4.3 F3 → descarga PDF

Tras aceptar F3 (`updatePlaneacion` OK), la UI ofrece "Descargar PDF" → `GET /api/planeaciones/[id]/generar-pdf` (route existente). El PDF refleja los campos pulidos (SPEC §11 AC-28 c).

## 5. Estados de UI y manejo de errores (decisión técnica INTEGRA)

| Estado | Trigger | UI |
|---|---|---|
| `idle` | inicial | botones F1/F2/F3 habilitados |
| `loading` | tras click, antes de response | spinner + botón deshabilitado (anti-doble-submit) |
| `success` | response 200 `origen='ia'` o `'cache'` | sugerencia visible + botones "Aceptar"/"Rechazar" |
| `fallback_vacio` | response 200 `origen='fallback_vacio'` | mensaje "La IA no pudo generar una sugerencia ahora. Puedes escribir/editar manualmente." + área editable |
| `error 422` `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA` | F1/F3 response 422 | mensaje "La sugerencia viola la estructura NEM. Intenta de otro modo." + retry |
| `error 429` | rate-limit | mensaje "Demasiadas solicitudes. Espera 1 minuto." + `Retry-After` |
| `error 422` `VALIDATION` | zod fail | mensaje "Revisa los campos." |
| `error 500` `NEM_IA_ANONYMIZER_BLOCKED` | anonimizador fail-closed (R-IA-10) | mensaje "El texto tiene mayúsculas sostenidas que podrían parecer nombres. Reformula en minúsculas o edita manualmente." (mitigación operativa ADR-02 §R-IA-10) |
| `error 401/403` | auth/RLS | mensaje "Sesión expirada. Recarga." |
| `accepted` | PATCH OK | confirmación + bloque/planeación refrescado |
| `error PATCH` | server action fail | mensaje "No se pudo guardar. Intenta de nuevo." + botón retry |

**Anti-doble-submit (F1/F2/F3):** botón deshabilitado durante `loading`. Rate-limit server-side (5 req/min, SPEC §7 regla 7) es defensa adicional.

**Mobile-first (Tía Lola planea en celular):** panel responsive, botones grandes, área de texto full-width, `inputmode` apropiado. No requiere drawer/modal complejo; un acordeón por feature es suficiente.

## 6. Contratos afectados y protegidos

| Contrato | Estado |
|---|---|
| Routes IA (`/api/planeaciones/[id]/ia/*`) | **Protegido (inmutable)** — QA-05 PASS_WITH_WARNINGS; la UI sólo los consume |
| `audit_log` POST (AC-29, P1-1) | **Protegido** — el route inserta la fila POST; la UI no toca `audit_log` |
| `audit_log` PATCH (AC-30, P1-2) | **Protegido** — `updateBloque`/`updatePlaneacion` insertan la fila PATCH; la UI sólo invoca el action |
| `bloque.origen` (AC-11) | **Afectado (consistente)** — aceptar F1/F2 → `origen='ia_sugerencia'`; ya especificado en SPEC §6.1 |
| `AI_API_KEY` bundle (AC-23) | **Protegido** — la UI es cliente; no hay `NEXT_PUBLIC_AI` |
| D-FIN-13 (server-side) | **Protegido** — la UI hace `fetch` al route; el route llama al proveedor |
| AC-22 (cero datos de alumnos) | **Protegido** — la UI no consulta `alumno`/`evaluacion_alumno`/`bitacora` |
| `bloque`/`planeacion` schema | **Protegido** — la UI no crea tablas; usa `updateBloque`/`updatePlaneacion` existentes |

## 7. Casos borde

| Caso | Comportamiento |
|---|---|
| Planeación sin bloques (MVP actual) | `BloqueEditor` ofrece "Añadir bloque" → crear mínimo (texto_base) → F1/F2 habilitados |
| Sugerencia igual al texto actual | "Aceptar" sigue permitido (idempotente); `origen='ia_sugerencia'` registra el origen |
| Docente edita la sugerencia antes de aceptar | `origen='maestra_editado_de_ia'` (SPEC §6.1 tabla F1); la UI envía el texto editado |
| Rate-limit 429 | UI bloquea con `Retry-After`; no reintenta automáticamente (anti-burst) |
| `fallback_vacio` | UI no bloquea el flujo; la docente escribe manualmente (P-PD9: IA es sugerencia) |
| Anonymizer blocked (R-IA-10) | UI guía a reformular en minúsculas; no reintenta con el mismo texto |
| Sesión expira durante `loading` | 401 → UI pide recargar; no hay refresh token silencioso este turno |
| 2 clicks rápidos | botón deshabilitado en `loading` (anti-doble-submit) |

## 8. Seguridad, privacidad y permisos

- **Sin PII al navegador del proveedor:** la UI no llama al proveedor; sólo `fetch` al route. El route anonimiza (D-FIN-13).
- **Sin `AI_API_KEY` en bundle:** verificado por AC-23 (QA-05). La UI no referencia `process.env.AI_*`.
- **RLS:** la UI opera con `createClient()` sesión-docente (anon key + cookies). Los server actions (`updateBloque`/`updatePlaneacion`) ya validan ownership (`docente_id = auth.uid() and cct = user_cct()`). La UI no bypasa RLS.
- **`audit_log` INSERT:** tras ADR-20260820-01 (política `0021` aplicada), los inserts POST/PATCH persisten. La UI no inserta directamente en `audit_log`; lo hacen los routes/actions.
- **Mobile (Tía Lola):** sin almacenar sugerencias en `localStorage` con PII; la sugerencia vive en memoria del componente hasta aceptar/rechazar.

## 9. Criterios de aceptación (AC) — todos testeables por ejecución

> Continuación de AC-28 de SPEC_TEC_07 §11. AC-28 era `N/A` (gate diferido por UI inexistente). Esta SPEC materializa la UI y hace AC-28 ejecutable.

### AC-28a — F1 E2E
- **Flujo:** docente (Tía Lola) abre `planeaciones/[id]` → añade un bloque (texto_base) → click "Variante de bloque (F1)" → response 200 con `variante_texto` visible → (opcional) edita → "Aceptar" → `updateBloque` PATCH con `origen='ia_sugerencia'` → bloque refrescado → `audit_log` tiene 1 fila POST (`endpoint='planeaciones_variantes_bloque'`, `method='POST'`) + 1 fila PATCH (`endpoint='update_bloque_post_ia'`, `method='PATCH'`).
- **Validación funcional: Playwright E2E** cubriendo el flujo (a) de SPEC §11.
- **Comando:** `pnpm exec playwright test e2e/ia-f1.spec.ts` (SOFIA crea el spec).
- **Output esperado:** 1 passed; aserciones: sugerencia visible, `bloque.origen='ia_sugerencia'` tras reload, 2 filas en `audit_log` (verificable con query de verificación del §7 del ADR-20260820-01 si Supabase disponible).

### AC-28b — F2 E2E
- **Flujo:** docente abre `planeaciones/[id]` → bloque existente → click "Ayuda a redactar (F2)" → response 200 con `texto_propuesto` visible **y no autocompletado en el bloque** (P-PD9) → "Aceptar" → `updateBloque` PATCH → bloque actualizado → `audit_log` POST + PATCH.
- **Validación funcional: Playwright E2E** cubriendo el flujo (b) de SPEC §11 (incluye aserción: el texto del bloque **no** cambia hasta "Aceptar").
- **Comando:** `pnpm exec playwright test e2e/ia-f2.spec.ts`.
- **Output esperado:** 1 passed.

### AC-28c — F3 E2E
- **Flujo:** docente abre `planeaciones/[id]` → click "Pulir PDF (F3)" → response 200 con `campos_pulidos` visibles → "Aceptar" → `updatePlaneacion` PATCH → "Descargar PDF" → PDF descargado con campos pulidos → `audit_log` POST (`endpoint='planeaciones_pulir_pdf'`) + PATCH.
- **Validación funcional: Playwright E2E** cubriendo el flujo (c) de SPEC §11.
- **Comando:** `pnpm exec playwright test e2e/ia-f3.spec.ts`.
- **Output esperado:** 1 passed; aserción: PDF descargado (Content-Disposition attachment), campos en PDF coinciden con los pulidos.

### AC-28d — Estados de error (regresión)
- **Flujo:** forzar `fallback_vacio` (proveedor caído / `AI_API_KEY` inválida) → mensaje "no pudo generar" + área editable. Forzar 429 → bloqueo con `Retry-After`. Forzar anonymizer blocked → mensaje de reformular.
- **Comando:** `pnpm exec playwright test e2e/ia-errores.spec.ts` (mock de route o Vercel sin key).
- **Output esperado:** 1 passed; aserciones: UI no crashea, mensajes visibles, botón retry presente.

### AC-UI-1 — Mobile-first
- **Validación visual:** `playwright_browser_resize` a 375×812 (iPhone) → panel usable sin scroll horizontal, botones ≥44px.
- **Output esperado:** captura sin overflow.

### AC-UI-2 — Anti-doble-submit
- **Test unitario:** click F1 → botón deshabilitado durante `loading`; segundo click no dispara 2º fetch.
- **Comando:** `pnpm vitest run components/ia/ia-sugerencia-panel.spec.tsx`.
- **Output esperado:** 1 passed.

## 10. Dependencias y prerrequisitos

| Dependencia | Estado | Acción |
|---|---|---|
| `audit_log` política INSERT (`0021`) | **Bloqueante para staging/producción** (P2-RLS) | ADR-20260820-01; SOFIA crea `0021`; Frank aplica `supabase db push` |
| Server action `createBloque` (si no existe) | **A verificar por SOFIA** | Si `services/planeaciones/update-actions.ts` no expone `createBloque`, SOFIA reporta `SPEC-GAP`; INTEGRA decide (puede delegar `createBloque` mínimo como parte del mismo handoff o confirmar que ya existe vía otra ruta) |
| `getBloques(planeacionId)` (carga server-side) | **A verificar por SOFIA** | Si no existe un loader de bloques por planeación, SOFIA reporta; INTEGRA especifica el contrato |
| Vars IA en Vercel | **Frank** | `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_TIMEOUT_MS` (SPEC §16) |
| Supabase (local o staging) | **Para AC-28 E2E** | Requerido para que los inserts `audit_log` persistan y sean verificables; QA-05 declaró "sin Supabase local/staging" → AC-28 es gate de staging |
| Playwright config | Existe (`playwright.config.ts`) | SOFIA añade specs `e2e/ia-f{1,2,3}.spec.ts` + `e2e/ia-errores.spec.ts` |

## 11. Migración/compatibilidad

- **Sin migraciones aplicadas este turno** (restricción vigente). `0021` es artefacto pendiente; `0020` sigue pendiente.
- La UI es aditiva: extiende `page.tsx` y añade 2 componentes en `components/ia/` y `components/planeaciones/`. No rompe la vista detalle existente (Cards + botones Evaluar/Entregar/Duplicar).
- Si `createBloque`/`getBloques` no existen, son aditivos en `services/planeaciones/` (no rompen contrato existente).

## 12. Rollback (recomendado, no ejecutado)

- Revertir `page.tsx` a la versión read-only (Cards + botones existentes).
- Borrar `components/ia/ia-sugerencia-panel.tsx`, `components/planeaciones/bloque-editor.tsx`, specs E2E.
- Sin migraciones ni dependencias: rollback limpio. Los routes IA y server actions quedan intactos (la UI es consumidora).

## 13. Riesgos y pendientes

| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R-UI-1 | `createBloque`/`getBloques` no existen → F1/F2 no operables | Medio | SOFIA reporta; INTEGRA especifica contrato mínimo en handoff si falta |
| R-UI-2 | AC-28 requiere Supabase real → no ejecutable en sandbox | Medio | Gate de staging/producción; los tests unit (AC-UI-2) sí son ejecutables en sandbox |
| R-UI-3 | Tía Lola en celular con conexión inestable | Bajo | Estados de error claros; `fallback_vacio` no bloquea |
| R-UI-4 | Editor de bloques mínimo confundido con editor completo | Bajo | Esta SPEC declara alcance mínimo; drag-drop catálogo M1 es Fase 2 |

## 14. DoD

- AC-28a/b/c/d PASS (E2E Playwright en staging con Supabase + proveedor) **O** declarados "NO EJECUTABLES en sandbox" con razón (sin Supabase local/staging), manteniendo los tests unit (AC-UI-2) ejecutables.
- AC-UI-1 (mobile) y AC-UI-2 (anti-doble-submit) PASS en sandbox.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- GEMINI PASS o PASS_WITH_WARNINGS sobre la unidad UI.
- P2-RLS resuelto (`0021` aplicada en staging) **para declarar trazabilidad operativa**; si `0021` no está aplicada, la UI funciona pero `audit_log` no persiste (fail-loud), y AC-28a/b/c no pueden verificar las 2 filas en `audit_log` (se declara el gap).
- Sin commits/push/deploys/migraciones aplicadas (restricción vigente; Frank autoriza).
- `PROYECTO.md` no existe (prohibido ADR-01); trazabilidad en este ADR + SPEC + reportes.

## 15. Preparación para producción (prueba real Tía Lola) — extends SPEC_TEC_07 §16

- [ ] `0021` aplicada en Supabase staging/producción (Frank `supabase db push`).
- [ ] UI desplegada en Vercel (Frank `git push` + deploy).
- [ ] Vars IA en Vercel (Frank).
- [ ] Tía Lola con cuenta docente + planeación + bloque creados.
- [ ] AC-28a/b/c/d ejecutados en staging (GEMINI o Frank).
- [ ] OK explícito de Frank para producción.

## 16. Nota sobre DISCOVERY-GAP (no aplica)

La creación mínima de bloques es **operacionalización técnica** de la estructura NEM (la planeación se compone de bloques por definición; el wizard actual no los crea por limitación MVP declarada en `wizard-planeacion.tsx:694`). No es una decisión funcional: la regla "la planeación tiene bloques" es del baseline. Si ATLAS/Frank quisiera un editor de bloques completo (drag-drop catálogo M1), es decisión funcional diferida (Fase 2), documentable como `BR`/`DEC` nueva; no bloquea la prueba con Tía Lola sobre la unidad mínima aquí especificada.

---

## Autoauditoría INTEGRA

- [x] No inventé decisiones funcionales: P-PD9, D-FIN-13, baseline §3.7 preservados. La creación mínima de bloques es operacionalización técnica (§16), no `DISCOVERY-GAP`.
- [x] No generé ni edité código de producción: sólo SPEC markdown. Las firmas de props (§4) son **contrato** (firmas/tipos en Markdown, permitido §11.2), no archivos `.tsx`. Sin `.ts`/`.tsx`/`.sql`/`.sh`.
- [x] No declaré DONE: la UI está en SPEC DRAFT; implementación por SOFIA (handoff) + re-auditoría GEMINI son gate.
- [x] Conservé IDs: SPEC-20260820-08, ARCH-20260820-01, P-PD9, D-FIN-13, AC-28, P3-8 (QA-04), P2-RLS (QA-05), Decisiones 3/9 (ADR-02), R-IA-10.
- [x] No omití GEMINI: re-auditoría UI es gate de DONE (handoff).
- [x] No paralelicé sin independencia: no se lanza SOFIA este turno.
- [x] No usé Agent Manager: Frank lo prohibió.
- [x] No commiteé, no pusheé, no desplegué, no apliqué migraciones, no toqué `.env` ni dependencias.
