# AUDITORÍA QA FINAL — MVP NEM (pre-Frank)

- **Auditoría:** QA-20260818-01
- **ID delegación:** QA-FINAL-2026-08-18-GEMINI-A
- **Fecha:** 2026-08-18 00:42–01:15 UTC-6
- **Auditor:** GEMINI (independiente — no participó en sesiones SOFIA ni VALID INTEGRA)
- **SPEC/ADR:** `SPEC_TEC_01..06.md` (5,981 líneas), `SPEC_CORRECCIONES_2026-08-17.md`, `SPEC_MODALIDADES_2026-08-17.md` (ambas con bloque VALIDACIÓN INTEGRA 2026-08-18)
- **Incremento auditado:** estado final del working tree `Educacion/` tras 6 sesiones SOFIA (IMPL-20260817-01/03/04/05 + IMPL-20260818-06) + validación INTEGRA-VALID-2026-08-18-01, contra producción `https://educacion-nem-mvp.vercel.app`
- **Alcance:** reforzada (API/schema/migración + PII de menores + producción)
- **Veredicto QA:** **FAIL** (1 finding P1 bloqueante para la afirmación "completo A a la Z") — ver §Veredicto final

---

## 0. HECHO ESTRUCTURAL QUE CONDICIONA TODO EL VEREDICTO

**Producción hoy corre el código de sesión 5, NO de sesión 6.**

Evidencia:
- `IMPL-20260817-05_report.md` §Deploy: `vercel deploy --prod --yes` ejecutado 2026-08-17 23:50 (`Ready in 56s`, alias `educacion-nem-mvp.vercel.app`).
- `IMPL-20260818-06_report.md` §Riesgos: "Deploy y migración aplicada en staging/prod: ⏳ PENDIENTE OK FRANK". SOFIA **no** desplegó sesión 6 (correcto: sin migración 0018 aplicada, el INSERT con `metadata` rompería `createPlaneacion` con `column "metadata" does not exist`).
- Migración 0018: archivo creado, **no aplicada en ningún entorno** (ni local — Docker indisponible — ni staging ni prod).

**Secuencia pendiente de autorización de Frank (orden obligatorio):**
1. Aplicar migración 0018 en producción (Supabase).
2. `vercel deploy --prod` del código de sesión 6.
3. `git commit` del MVP completo (ver finding P2-04: **nada** del MVP está commiteado).

Por tanto, los fixes P0/P1 que INTEGRA detectó (window.prompt, sugerencias sin disparador, validación zod incompleta, persistencia metadata) **están en el código local pero NO en producción todavía**. La auditoría evalúa el estado final del working tree (lo que Frank va a aprobar) y verifica producción como referencia.

---

## A. Coherencia general (5 puntos)

### A.1 — ¿SPEC_TEC_01..06 intactas? → ✅

| Evidencia | Resultado |
|---|---|
| `wc -l SPEC_TEC_0*.md` = **5,981 líneas** | Coincide exactamente con el claim de `GO_FINAL_ABSOLUTO_2026-08-17.md` §1 ("5,981 líneas") |
| `stat` mtime: 2026-08-17 10:38–14:16 | Todas anteriores al arranque de SOFIA sesión 1 (14:30). Ninguna tocada durante las 6 sesiones |
| Los 6 reportes IMPL declaran "SPEC_TEC no modificados" | Consistente con mtimes |

Caveat: las specs son untracked en git (último commit real: 2026-08-13), por lo que no existe baseline de hash contra el cual diffear. La evidencia de mtimes + line count + consistencia cruzada es sólida pero indirecta.

### A.2 — ¿SPEC_CORRECCIONES y SPEC_MODALIDADES actualizadas y production-ready? → ✅

- Ambas contienen el bloque **"⚠️ VALIDACIÓN INTEGRA — 2026-08-18 00:30 UTC-6"** al inicio, con estado real verificado por lectura de código.
- `SPEC_MODALIDADES`: corrección explícita de la afirmación falsa "No necesitas cambiar BD" → DDL completo de migración 0018 + contrato `metadata.modalidad_data` para las 6 modalidades + esquema zod canónico (camelCase real) + validación condicional completa + gates DONE.
- `SPEC_CORRECCIONES`: estado real C-1..C-7 (IMPLEMENTADOS), gaps P-PD9 de C-5 con correcciones concretas, P2 menores, resumen 15 criterios.
- El contenido original de Kilo se preservó bajo "Contexto (original)". Production-ready: ✅.

### A.3 — ¿Los 6 reportes IMPL reflejan el estado real? → ✅ (alta fidelidad)

Verificación independiente (no se confió en el reporte; se re-ejecutó y re-leyó):

| Claim de reporte | Verificación GEMINI | Resultado |
|---|---|---|
| Sesión 6: `pnpm typecheck` PASS | Re-ejecutado: exit 0, sin errores | ✅ reproducido |
| Sesión 6: `pnpm lint` PASS + 1 warning preexistente | Re-ejecutado: PASS, 1 warning en `lib/supabase/server.ts` (`DB` unused) | ✅ reproducido |
| Sesión 6: 30 PASS, 2 skipped | Re-ejecutado `vitest run`: **30 passed, 2 skipped** (RLS cross-tenant, requiere BD) | ✅ reproducido |
| Sesión 6: archivos modificados (5) | Todos existen con los cambios descritos (leídos: `planeacion-actions.ts`, `sugerencias-ia.tsx`, `wizard-calendario-semanal.tsx`, `wizard-planeacion.tsx`, `0018_*.sql`) | ✅ |
| Sesión 5: deploy prod + rutas 200/302 | HTTP verificado hoy: `/` 200, `/planeaciones/nueva` 307→login | ✅ |
| Sesión 4: rutas nuevas | `/perfil`, `/alumnos`, `/grupos/…/editar` responden 307 en producción | ✅ |
| Sesión 3: 28 rutas + PWA + biblioteca | `/biblioteca`, `/recursos-aula`, `/catalogo/campos` 307; manifest + iconos 200 | ✅ |

Desviación menor: `IMPL-20260818-06_report.md` líneas 26 y 286 contienen emojis corruptos (` Alta`, ` Pendiente`) — cosmético (P3-06). El claim "las 5 modalidades NEM restantes ahora también persisten datos" (línea 169) es **inexacto para ABJ y Taller Crítico** — ver finding P1-01.

### A.4 — ¿INTEGRA-VALID-01 alineado con sesión 6? → ✅

Correspondencia 1:1 entre lo que VALID-01 asignó y lo que sesión 6 entregó (verificado en código, no en el papel):

| Asignación VALID-01 | Entrega sesión 6 verificada |
|---|---|
| P0: migración 0018 | `supabase/migrations/0018_planeacion_metadata.sql` (71 líneas, idempotente, GIN, bloque de verificación) |
| P1.1 (SPEC_MOD): window.prompt | `grep window.prompt app/ components/` → **0 resultados**; Dialog shadcn en `wizard-calendario-semanal.tsx:246+` |
| P1.2 (SPEC_MOD): validación condicional incompleta | `validarModalidad()` cubre las 6 modalidades (`planeacion-actions.ts:95-162`) |
| P1 C-5 (SPEC_CORR): disparador + descartar | `sugerencias-ia.tsx` estados `closed/open/hidden` + botón "✕ Descartar" + "Volver a mostrar" |
| P1.2 edge case cambio modalidad | `cambiarModalidad` + Dialog confirmación + `limpiarDatosEspecificos` (`wizard-planeacion.tsx:405-462`) |

### A.5 — ¿Contradicciones entre specs y código? → ⚠️ (4 encontradas)

1. **P1-01 (material):** `SPEC_MODALIDADES` define `modalidad_data` de ABJ como `{tipo_juego, reglas, extension}`, pero el wizard **no captura** esos campos — captura 3 momentos (Inicio/Desarrollo/Cierre del juego, requeridos ≥5 chars) que luego **descarta** en `buildModalidadData`. Para Taller Crítico captura contenido de Reflexión/Producción/Socialización y persiste solo las claves `['reflexion','produccion','socializacion']` sin contenido.
2. **D-FIN-17** (clonar planeación) está especificado en `SPEC_TEC_03 §6.6` (E6 `POST /api/v1/planeaciones/:id/duplicar`) y testeado en `SPEC_TEC_06` (T-I-04), con columna `clonada_de` ya en schema (migración 0010:29) — pero **no hay implementación** (0 referencias a duplicar/clonar en `app/`, `components/`, `services/`).
3. **D-FIN-18 MVP** ("Exportar mis datos", `SPEC_TEC_05` DP-06 y §ARCO LFPDPPP) — **no implementado** (0 referencias a exportar/export en código). El backup automático está correctamente diferido a Fase 2 por decisión E22, pero el fallback MVP tampoco existe.
4. **`app/error.tsx`** listado en `SPEC_TEC_04 §3` (línea 159, "error boundary global") — **no existe** en el código (ver P3-01).

---

## B. Reglas duras (5 puntos)

### B.1 — Secretos → ✅

- `grep -rE "sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{50,}|ghp_[a-zA-Z0-9]{20,}"` sobre `*.ts/tsx/json/md/mjs/js` (excl. node_modules/.next/lock): **0 coincidencias**.
- `.env.local` y `.env.production` (con valores reales incl. `VERCEL_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`): **gitignored** (`.gitignore:24-29`) y untracked — no commiteables por accidente.
- `.env.example`: 25 valores no-vacíos inspeccionados programáticamente — **todos placeholders** (incl. `SUPABASE_DB_URL` con host-template `db.PROJECT.supabase.co` y password genérico). Sin secretos.

### B.2 — react-dnd legacy → ✅

- `grep react-dnd` → **0 resultados**.
- `@dnd-kit` confirmado en `package.json` (`@dnd-kit/core ^6.1.0`) y en uso real: `components/evaluacion/rubrica-semaforo-board.tsx` y `wizard-calendario-semanal.tsx`.

### B.3 — Scraping CONALITEG en runtime → ✅

- `grep -iE "fetch.*conaliteg|axios.*conaliteg|cheerio|scrape"` en `app/ components/ services/ lib/` → **0 resultados**.
- Las URLs de libros viven **hardcodeadas en el seed** de la migración `0006_referencias_conaliteg.sql` (`url_publica text`, ej. `https://libros.conaliteg.gob.mx/2024/K1MLL.htm`, 19 referencias). El iframe de `/biblioteca` apunta al portal, no scrapea.

### B.4 — Contenido CONALITEG en Storage → ✅

- `public/biblioteca-conaliteg/` contiene **solo `.gitkeep`** (ídem `pdf-templates/`, `manifest-icons/`).
- Ninguna migración crea buckets con contenido CONALITEG. ADR-010 respetado.

### B.5 — Datos de menores a MiniMax → ✅ (doble protección)

1. **No existe ninguna llamada a IA externa en el código actual**: `F-IA1` es mini-NLP determinista (`services/recursos-aula/sugerir-uso.ts`, keyword matching); las sugerencias del wizard son estáticas (`sugerencias-data.ts`). Cero envíos de datos a terceros, punto.
2. **`ia_anonymizer` implementado** para cuando F1 llegue: `lib/ia/anonymizer.ts` (regex NOMBRE/CELULAR/EMAIL/CCT/CURP + SAFE_TOKENS español) con **10 tests unitarios PASS** (re-ejecutados por GEMINI).

---

## C. Cobertura funcional MVP (5 puntos)

### C.1 — Decisiones D-FIN-1..19 → ⚠️ (16/19 + 1 parcial)

| D-FIN | Estado | Evidencia |
|---|---|---|
| 1 — Catálogo M1 bloques | ✅ | Migración 0017 (36 bloques seed) + `/catalogo/bloques` + `BloqueCard` |
| 2 — Rúbrica por alumno | ✅ | `rubrica-semaforo-board.tsx` + `upsertEvaluacion` |
| 3 — Semáforo 4 niveles | ✅ | 4 dropzones 🟢🟡🟠🔴 con `@dnd-kit` DragOverlay |
| 4 — Onboarding 5 pantallas | ✅ | 10 rutas onboarding (bienvenida/cct/grupo/alumnos/paso-1..5) |
| 5 — PDF triple | ⚠️ | Visualizable + compartible (URL firmada JWT 30 días, `lib/auth/url-firmada.ts`, 4 tests) ✅; **descargable binario diferido** — HTML imprimible (decisión documentada sesión 3 §6.1, L2) |
| 6 — Wizard adaptativo | ✅ | 6 modalidades con `buildSteps()` dinámico (pero ver P1-01 en persistencia) |
| 7 — Banco de palabras | ✅ | `wizard-banco-palabras.tsx` + `banco_palabras text[]` persistido + 4 tests |
| 8 — Actividades recurrentes | ✅ (opcional MVP) | Placeholder `[]` en `buildModalidadData` — la spec lo declara opcional MVP |
| 9 — Ajustes por sesión | ✅ (parcial) | Columna `sesion.ajustes_sesion` existe; captura en wizard de sesiones diferida a edición (placeholder documentado sesión 3) |
| 10 — CONALITEG híbrido | ✅ | `/biblioteca` iframe sandbox + atribución SEP, sin alojamiento |
| 11 — Next.js + Vercel | ✅ | Next 14.2 + deploy verificado |
| 12 — Supabase RLS por CCT | ✅ | Migración 0014 (48 statements, `planeacion_docente_own` por docente_id+cct) — **pero T-E2E-07 nunca ejecutado, ver P2-01** |
| 13 — MiniMax vía conector | ✅ | Sin llamadas aún; `AI_*` env vars definidas + anonymizer listo |
| 14 — DnD + PWA | ✅ | @dnd-kit + manifest + sw.js + offline.html |
| 15 — Aviso privacidad | ✅ | `lib/aviso/` (modal + texto + actions) + `aviso-privacidad-gate.tsx` |
| 16 — Multi-grupo | ✅ | `components/grupo/grupo-selector.tsx` en header |
| 17 — Duplicar/Clonar | ❌ | **No implementado** (ver A.5.2 / P2-02) |
| 18 — Backup automático | ⚠️ | Diferido a Fase 2 por decisión E22 ✅, pero el fallback MVP "Exportar mis datos" **tampoco existe** (P2-03) |
| 19 — WhatsApp director | ✅ | `/planeaciones/[id]/entregar` + `EntregarDirectorDialog` + wa.me server-side |

### C.2 — Principios P-PD1..9 → ✅

- **P-PD1 (85/15):** wizard es selección-dominante (campos/PDA/ejes por selección, banco por chips, sugerencias click-to-fill). ✅
- **P-PD2 (catálogo curado):** todo dato pedagógico viene de BD (migraciones 0016/0017 + catálogo JSON 100%). ✅
- **P-PD3 (datos del mundo precargados):** CCT autocomplete desde tabla `cct` — **verificado en producción**: `/api/cct/buscar?q=preescolar` devuelve CCTs reales (`01KJN0001O PREESCOLAR COMUNITARIO AGUASCALIENTES`). ✅
- **P-PD4 (captura única):** onboarding captura una vez; `/perfil` reutiliza. ✅
- **P-PD5 (wizard adaptativo):** 6 estructuras diferenciadas. ✅
- **P-PD6 (4 niveles):** intacto (sesiones 4-5 no tocaron rúbrica). ✅
- **P-PD7 (PDF triple):** parcial por desviación documentada (ver D-FIN-5). ⚠️ aceptado.
- **P-PD8 (IA adaptador):** sin IA real; determinista + anonymizer. ✅
- **P-PD9 (IA solo sugiere):** sugerencias estáticas con disparador explícito + descartar + badge "Estático · sin IA" (verificado en código sesión 6). ✅ — provenance `origen:'ia_sugerencia'` diferido a F1 (documentado).

### C.3 — Correcciones C-1..C-7 (sesión 4) → ✅

Las 7 en código y las rutas vivas en producción (verificado por HTTP y lectura):

| Issue | Código | Producción |
|---|---|---|
| C-1 `/perfil` | `app/(app)/perfil/page.tsx` + `editar-cct-form.tsx` + `lib/perfil/actions.ts` | 307→login ✅ |
| C-2 editar grupo | `grupos/[id]/editar/` + `lib/grupos/actions.ts` | 307→login ✅ |
| C-3 alumnos CRUD | `alumnos/alumnos-manager.tsx` + `services/alumnos/alumno-actions.ts` | 307→login ✅ |
| C-4 header/nav | `_components/{app-header,nav-menu,user-menu}.tsx` + GrupoSelector | ✅ |
| C-5 sugerencias | `sugerencias-ia.tsx` + `sugerencias-data.ts` (18 sugerencias) | ✅ (mejorada en sesión 6) |
| C-6 404 custom | `app/not-found.tsx` | ✅ |
| C-7 empty states | `dashboard/page.tsx` (3 EmptyState) | ✅ |

Nota C-2: eliminar grupo con alumnos usa **soft delete con warning y conteo** (decisión documentada sesión 4 §7.2) en vez del bloqueo sugerido por VALID P2.1 — aceptable: no hay pérdida de datos (alumnos permanecen en historial).

### C.4 — 6 modalidades en el wizard → ⚠️

Funcionan: selector de 6 radio buttons accesibles, `buildSteps()` dinámico por modalidad, validación por paso, confirmación de cambio de modalidad con limpieza de datos específicos, validación zod server-side completa, persistencia de `metadata.modalidad_data`.

**Pero:** ABJ y Taller Crítico pierden el contenido de fases capturado (finding P1-01). El wizard funciona; la persistencia es incompleta en 2 de 6 modalidades.

### C.5 — Migración 0018 lista para OK de Frank → ✅

- `0018_planeacion_metadata.sql`: `add column if not exists metadata jsonb not null default '{}'::jsonb` + comment + índice GIN `jsonb_path_ops` idempotente + bloque `do $$ … raise exception/notice` de verificación.
- **pglast: parsea OK (4 statements)** — re-ejecutado por GEMINI. Las 18 migraciones parsean OK.
- NO toca RLS (0014 intacta), NO altera `sesion.fase_interna`, sin DROP/CREATE destructivos.
- **No aplicada en ningún entorno** (correcto: espera OK de Frank). Rollback documentado en IMPL-06 §Notas de reversión.
- ⚠️ Dependencia de orden: el código de sesión 6 **requiere** la columna antes del deploy (sin ella, `createPlaneacion` falla con `column "metadata" does not exist`). Secuencia obligatoria: migración → deploy → commit.

---

## D. Estado de producción (5 puntos)

### D.1 — URL responde → ✅

| Ruta | Status | Interpretación |
|---|---|---|
| `/` | 200 | Landing pública |
| `/login` | 200 | Auth |
| `/recuperar-password` | 200 | Recovery |
| `/dashboard`, `/perfil`, `/planeaciones/nueva`, `/biblioteca`, `/alumnos`, `/recursos-aula`, `/catalogo/campos` | 307 → `/login?redirect=…` | Protección correcta de middleware |
| `/api/cct/buscar?q=preescolar` | 200 + datos reales | **BD de producción conectada y cargada** |

### D.2 — Iconos PWA → ✅

`/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png` → **200** los cuatro. `/favicon.ico` (raíz) → 200. (`/icons/favicon.ico` da 404 pero **nada lo referencia**: el manifest solo apunta a los 3 PNG y Next sirve el favicon desde la raíz.)

### D.3 — Manifest válido → ✅

`/manifest.webmanifest` (y `/manifest.json`) devuelven JSON válido: `name: "NEM — Módulo Docente"`, `start_url: /dashboard`, `display: standalone`, `theme_color: #1F8A4C` (verde NEM), `lang: es-MX`, 3 iconos (192/512/maskable) que responden 200. Fuente: `app/manifest.ts` (Next.js nativo).

### D.4 — Migraciones ejecutables en Supabase → ✅ con caveat

- 18/18 migraciones parsean con pglast (verificado por GEMINI).
- Ejecución semántica **no verificable en este sandbox** (sin Docker/Supabase local) — SOFIA lo documentó igual. La BD de producción sí está operativa (evidencia D.1: CCT endpoint con datos reales), lo que indica que 0001-0017 se aplicaron correctamente en su momento.
- 0018 es idempotente y aditiva → riesgo de ejecución bajo.

### D.5 — Riesgo de 500 en rutas críticas → ⚠️

- **No existe `app/error.tsx` ni `global-error.tsx`** (SPEC_TEC_04 §3 sí lista error boundary global) → un error no manejado en server component muestra la página 500 default de Next.js, no una experiencia NEM. Finding P3-01.
- Endpoints API manejan errores correctamente: `generar-pdf` devuelve 401/403/404 con ownership check (`docente_id !== session.docenteId` → 403); server actions retornan `{ok:false,error}` en vez de throw.
- Middleware refresca sesión y redirige (verificado en producción). Sin evidencia de rutas que 500een hoy (todas las críticas responden 200/307).

---

## Hallazgos priorizados

### 🔴 P1-01 — Pérdida silenciosa de contenido de fases en ABJ y Taller Crítico

- **Evidencia:** `wizard-planeacion.tsx` captura contenido obligatorio (≥5 chars, validación líneas 520-540) para los 3 momentos ABJ (`inicioJuego`/`desarrolloJuego`/`cierreJuego`) y las 3 fases de Taller Crítico (`reflexion`/`produccion`/`socializacion`). Pero `buildModalidadData` (líneas 98-135) descarta ese contenido: ABJ devuelve `{tipo_juego:'', reglas:'', extension:''}` (strings vacíos de campos que el wizard ni captura) y Taller Crítico devuelve solo `['reflexion','produccion','socializacion']` (claves sin contenido). `createPlaneacion` no inserta filas en `sesion`. El paso "Revisión" tampoco muestra estas fases.
- **Impacto:** la maestra escribe 3 pantallas de contenido obligatorio, guarda, y el contenido **se pierde silenciosamente**. Es la misma clase de bug que INTEGRA clasificó **P0** en sesión 5 (entonces afectaba a 5 modalidades; sesión 6 corrigió 3 y quedaron 2). El claim de IMPL-06 "las 5 modalidades NEM restantes ahora también persisten datos" es inexacto para estas 2.
- **Reproducción:** wizard → ABJ → completar Inicio/Desarrollo/Cierre del juego → guardar → abrir `/planeaciones/[id]` → el contenido no está en ninguna parte.
- **Criterio/contrato:** C.4, A.5; contrato `metadata.modalidad_data` de SPEC_MODALIDADES §Estructura canónica.
- **Owner recomendado:** SOFIA vía INTEGRA. **Nivel de fix sugerido: L1** (~15 líneas en `buildModalidadData` para incluir el contenido de fases en metadata + ajustar estructura ABJ del spec o el wizard + 3 tests unitarios a los helpers).
- **Condición de cierre:** test unitario que arme `FormState` ABJ/taller con contenido y asserte que `buildModalidadData` lo incluye; smoke: crear planeación ABJ y leer `metadata.modalidad_data` con el texto capturado.

### 🟡 P2-01 — Gate bloqueante T-E2E-07 (RLS cross-tenant) nunca ejecutado

- **Evidencia:** `tests/integration/rls-cross-tenant.test.ts` auto-skipped (2 skipped en la suite re-ejecutada); `GO_FINAL_ABSOLUTO §5`: "T-E2E-07: RLS por CCT (**NO promover sin este test pasando**)". Producción fue promovida sin él (limitación de sandbox documentada desde sesión 3 §6.4).
- **Impacto:** el aislamiento multi-tenant (maestra A no lee datos de maestra B) está **especificado y policy-escrito** (0014) pero **nunca verificado empíricamente**. Con 1 usuario piloto el riesgo real es bajo; con 2+ docentes reales es un riesgo de privacidad de menores.
- **Owner:** SOFIA vía INTEGRA (requiere Supabase local o staging). Nivel L2.
- **Condición de cierre:** `pnpm test:integration` verde contra BD real antes de onboardear a la segunda docente.

### 🟡 P2-02 — D-FIN-17 (Duplicar/Clonar) no implementado

- **Evidencia:** spec completa en SPEC_TEC_03 §6.6 + test T-I-04 en SPEC_TEC_06 + columna `clonada_de` en schema; 0 líneas de implementación.
- **Impacto:** gap funcional vs spec técnica. Frank debe dirimir si era alcance MVP o Fase 2 (E22 lo formalizó como decisión; GO_FINAL no lo listó entre tests bloqueantes).
- **Owner:** INTEGRA decide alcance; si es MVP → SOFIA (nivel L2).
- **Condición de cierre:** endpoint/server action `duplicar` con `clonada_de` + modal de grupo destino, o decisión documentada de diferimiento.

### 🟡 P2-03 — D-FIN-18 MVP "Exportar mis datos" no implementado (ARCO/LFPDPPP)

- **Evidencia:** SPEC_TEC_05 DP-06 y §ARCO lo definen como mecanismo de cumplimiento para el piloto; 0 referencias en código.
- **Impacto:** gap de compliance (derecho de acceso/portabilidad) para el piloto. Bajo riesgo práctico con 1 usuaria, pero es el único mecanismo ARCO del MVP.
- **Owner:** SOFIA vía INTEGRA. Nivel L1-L2 (JSON export del tenant).
- **Condición de cierre:** botón en `/perfil` o `/ajustes` que exporte las planeaciones del docente como JSON.

### 🟡 P2-04 — MVP completo sin commitear (riesgo de trazabilidad/reproducibilidad)

- **Evidencia:** `git log -1` en main = 2026-08-13 (E19 v12). Las 6 sesiones SOFIA (~150+ archivos: app, components, services, 18 migraciones, specs) viven **solo en el working tree**. El código en producción no es reconstruible desde git; un accidente del worktree pierde el MVP.
- **Contexto:** estado conocido y aceptado (regla explícita "NO commitees sin OK de Frank" en todas las specs). No es negligencia de SOFIA.
- **Impacto:** operativo, no de calidad de código. Crítico cerrar junto con el deploy.
- **Owner:** Frank (autorización) → SOFIA ejecuta commit. Nivel L1.
- **Condición de cierre:** commit en main (o rama mergeada) que contenga exactamente lo que corre en producción post-deploy.

### 🟢 P3-01 — Sin error boundary (`app/error.tsx` / `global-error.tsx`)
Requerido por SPEC_TEC_04 §3; hoy un 500 muestra la página default de Next.js. Fix L1.

### 🟢 P3-02 — Tests E2E Playwright (T-E2E-01..05) no escritos
`tests/e2e/` vacío; documentado desde sesión 3 como L2 diferido. Cubierto parcialmente por smoke HTTP + 30 unit tests.

### 🟢 P3-03 — Estado de nube no codificado
Los 3 buckets Storage (planeaciones, bitacora-evidencias, avatares-docente) y la carga de 95,345 CCTs no están en migraciones ni scripts del repo (`scripts/deploy/` y `scripts/dev/` vacíos). La carga CCT se verificó viva en producción, pero no es reproducible desde el repo. Recomendar migración `storage.buckets` + script de carga versionado. Fix L2.

### 🟢 P3-04 — `X-Frame-Options: ALLOWALL` no es valor válido
`next.config.mjs` lo emite para `/v/:entrega_id`; los navegadores lo ignoran (efecto: frameable desde cualquier origen). Si el embedding del link de entrega es intencional, usar `Content-Security-Policy: frame-ancestors *` explícito o quitar el header. Fix L1.

### 🟢 P3-05 — `serverExternalPackages` es clave de Next 15 en un proyecto Next 14.2
Warning de build documentado desde sesión 4. Clave correcta: `experimental.serverComponentsExternalPackages`. Fix L1.

### 🟢 P3-06 — Reporte IMPL-20260818-06 con 2 emojis corruptos (líneas 26, 286). Cosmético.

### 🟢 P3-07 — Sesión 6 no agregó tests a los helpers puros nuevos
`buildModalidadData`/`tieneDatosEspecificos`/`limpiarDatosEspecificos` fueron extraídos como "testeables" pero sin tests. Precisamente esos tests habrían detectado P1-01. Fix L1.

### Desviaciones aceptadas (no findings nuevos)
- PDF binario diferido (HTML imprimible) — decisión documentada sesión 3 §6.1.
- `auditoria_carga` PK serial vs uuid (§5.1.10) — L3 documentado sesión 1.
- `GroupSelector` con `<a href>` en vez de `<Link>` — follow-up documentado sesión 4.

---

## Riesgo operativo

- **Seguridad:** sin secretos expuestos; RLS escrita pero no verificada empíricamente (P2-01); endpoints con ownership checks correctos; PII de menores protegida por diseño (sin IA externa, anonymizer listo).
- **Datos:** migración 0018 aditiva e idempotente, rollback trivial documentado; riesgo de pérdida de datos nuevo solo en P1-01 (metadata de 2 modalidades).
- **Observabilidad:** sin Sentry activo (env vars definidas, sin error boundary); logs de server actions estándar.
- **Reversión:** `vercel rollback` disponible para el deploy; código sesión 5↔6 reversible según IMPL-06 §Notas de reversión; **pero nada está en git** (P2-04), lo que debilita cualquier reversión estructurada.

## Preparación por entorno

- **Calidad del incremento (working tree sesiones 1-6):** FAIL por P1-01 (el resto: 19/20 criterios ✅ o ⚠️ no bloqueante).
- **Staging:** NO_EVALUADO (no existe entorno staging separado; el alias Vercel es producción).
- **Producción:** NO_LISTO — pendiente la secuencia autorizada por Frank: (1) migración 0018 → (2) deploy sesión 6 → (3) commit; además P1-01 (fix o aceptación explícita) y T-E2E-07 antes de la segunda docente.

---

## Veredicto final

```
⚠️ NEEDS MORE FIXES — una iteración corta de SOFIA (~30-45 min) y luego secuencia de deploy.
```

**El MVP está funcionalmente completo y sólido en todo lo auditado** (reglas duras 5/5, producción viva y correcta, gates typecheck/lint/tests reproducidos, specs coherentes), **pero no se puede certificar "completo A a la Z"** mientras exista P1-01: dos de las seis modalidades pierden silenciosamente contenido obligatorio capturado — exactamente la clase de defecto que la sesión 6 debía eliminar.

**Dos caminos para Frank:**

- **Camino A (recomendado):** 1 sesión corta de SOFIA para P1-01 (fix `buildModalidadData` ABJ/Taller + 3 tests; aprovecha y cierra P3-07). Luego: OK a migración 0018 → deploy sesión 6+fix → commit (P2-04). T-E2E-07 antes de la segunda docente.
- **Camino B (aceptación de riesgo):** Frank acepta explícitamente P1-01 (ABJ/Taller sin contenido de fases persistido; Proyecto Comunitario —la modalidad recomendada para preescolar— no está afectada) y procede directo con migración → deploy → commit. En este caso P1-01 queda como deuda documentada Fase 2.

Ningún finding impide que Frank continúe el piloto individual con Proyecto Comunitario en la producción actual.

---

## Handoff a INTEGRA

```text
[QA_RESULT]
ID tarea: QA-FINAL-2026-08-18-GEMINI-A (auditoría final MVP NEM)
Auditoría: QA-20260818-01 — Educacion/specs/GEMINI-AUDIT-FINAL-2026-08-18.md
Incremento: working tree Educacion/ sesiones SOFIA 1-6 (uncommitted) vs producción educacion-nem-mvp.vercel.app (código sesión 5)
Veredicto: FAIL (1 P1 bloqueante para el claim "completo A-Z"; resto del MVP sólido)
Findings: P0:0 P1:1 P2:4 P3:7
Gates ejecutados: typecheck PASS · lint PASS (1 warning preexistente) · vitest 30 PASS/2 skipped · pglast 18/18 migraciones · HTTP 16 endpoints prod · scan secretos limpio · react-dnd ausente · CONALITEG sin scraping/storage · anonymizer 10 tests
Staging: NO_EVALUADO (sin entorno staging separado)
Producción: NO_LISTO — secuencia pendiente: migración 0018 → deploy sesión 6 → commit; P1-01 fix o aceptación explícita de Frank; T-E2E-07 antes de 2ª docente
Owner siguiente: INTEGRA
Acción requerida: presentar a Frank los Caminos A/B del veredicto; si Camino A, SPEC-HANDOFF corto a SOFIA para P1-01 (+P3-07); si Camino B, registrar aceptación de riesgo y ejecutar secuencia migración→deploy→commit con OK explícito
```

— **GEMINI, 2026-08-18 01:15 UTC-6** (auditoría independiente, sin edición de código)
