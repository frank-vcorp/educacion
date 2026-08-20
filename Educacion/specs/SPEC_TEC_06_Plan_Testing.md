# SPEC TEC 06 — Plan de Testing (NEM Módulo Docente)

**ID:** ARCH-NOCTURNO-2026-08-16-INTEGRA-B
**Versión:** 1.0.0
**Fecha:** 2026-08-16
**Estado:** ESPECIFICACIÓN TÉCNICA LISTA PARA IMPLEMENTACIÓN
**Autor:** INTEGRA (orquestación nocturna)
**Alinea con:** `SPEC_MVP_01_Modulo_Docente.md` v0.13 (P-UX1 a P-UX10, T-UX1 a T-UX6), `E22_CIERRE_DISCOVERY.md` v1.1, `SPEC_TEC_03_API_Contract.md` v1.0.0, `SPEC_TEC_04_Estructura_Proyecto.md` v1.0.0

**Consumidor destino:** SOFIA (implementación de tests), GEMINI (auditoría), Frank (revisión).
**Stack de testing:** Vitest + React Testing Library + Playwright + MSW + Supabase local + ajv + Lighthouse CI + Percy/Chromatic (regresión visual).

---

## 0. CÓMO LEER ESTE DOCUMENTO

- Los IDs de tests siguen el formato `T-<NIVEL>-<NN>` (ej: `T-U-01` = Unit 01, `T-E2E-01` = E2E 01). Trazables en CI.
- Los `DEC-06-NN` son decisiones arquitectónicas; `PEND-06-NN` son decisiones pendientes que requieren aprobación de Frank.
- Toda ruta de test es **relativa a `tests/`** dentro del repo (ver SPEC_TEC_04 §3).

---

## 1. PROPÓSITO Y ALCANCE

Definir la estrategia de testing del MVP del Módulo Docente (NEM preescolar). Cubre: pirámide de tests, stack, convenciones, tests críticos, cobertura objetivo, CI/CD, regresión visual, performance, criterios por feature.

**Cobertura mínima obligatoria (regla dura):**

- Lógica de negocio (`services/**`): **≥80%**.
- Componentes UI interactivos (`components/**`): **≥70%**.
- Route handlers (`app/api/v1/**`): **≥90%** (contrato público, alta criticidad).
- Migraciones SQL y RLS: **100%** de policies con test de aislamiento.

**Fuera de alcance:**

- Load testing con miles de usuarios concurrentes (diferido a pre-piloto).
- Fuzzing de seguridad externo (diferido, requiere scope de pentest).
- Tests A/B de UX (Fase 2 con métricas analíticas).

---

## 2. PIRÁMIDE DE TESTS

```text
        ▲
       / \
      / E2E \           ~10 tests (Playwright, lentos, happy paths críticos)
     /-------\
    / Integ.  \         ~40 tests (route handlers + DB local + MSW)
   /-----------\
  /   Unit + RTL  \      ~200 tests (lógica pura + componentes aislados)
 /-----------------\
```

| Nivel | Cantidad objetivo | Costo ejecución | Frecuencia CI |
|---|---|---|---|
| Unit + RTL | ~200 | <30s total | Cada push |
| Integration | ~40 | <2min | Cada PR |
| E2E | ~10 | <5min | Cada merge a main + nightly |
| Regresión visual | ~30 snapshots | <3min | Cada PR |
| Performance | ~5 escenarios | <2min | Nightly + pre-deploy |

**Proporción objetivo:** 80% unit / 15% integration / 5% E2E.

---

## 3. STACK DE TESTING

### 3.1. Unit + Componentes

- **Vitest** (no Jest — alineado con Vercel + ESM + Next.js App Router nativo).
- **React Testing Library (RTL)** + `@testing-library/user-event` + `@testing-library/jest-dom`.
- **jsdom** como environment (configurado en `vitest.config.ts`).
- **@vitest/coverage-v8** para cobertura.

### 3.2. Mocks HTTP

- **MSW (Mock Service Worker)** para interceptar fetch desde Client Components.
- Service workers de MSW solo en test env (`setup.ts`).

### 3.3. Integración

- **Supabase local** (CLI `supabase start`) — instancia Postgres + Auth + Storage en Docker.
- Cada test file usa **schema aislado** o **transaction rollback** para evitar contaminación.
- Helper `tests/helpers/supabase-test-client.ts` crea cliente con `service_role` para seed + `anon` para assertions.

### 3.4. E2E

- **Playwright** + `@playwright/test`.
- Browser targets: **chromium** (Vercel preview), **webkit** (Safari — Tía Lola podría usar iPhone).
- Mobile viewport fijo **360×640** (P-UX4 obligatorio).
- DB reset entre tests via `globalSetup` + `globalTeardown`.

### 3.5. Contrato API

- **ajv** para validar respuestas contra JSON Schemas de SPEC_TEC_03.
- Helper `tests/helpers/assert-schema.ts` que toma `$id` y valida.

### 3.5.1. Pact (consumer-driven) — opcional

- **PEND-06-01:** si el frontend y API son equipos separados, Pact adiciona contrato bidireccional. Para MVP (mismo repo), ajv es suficiente.

### 3.6. Regresión visual

- **Percy** o **Chromatic** (DEC-06-01, decisión en §14).
- Capturas en cada story de Storybook (si se incluye) + en E2E críticos.
- Tolerancia diff: `0.1` (anti-flake por anti-aliasing).

### 3.7. Performance

- **Lighthouse CI** (`@lhci/cli`) en PRs a `main`.
- **Web Vitals** recogidos en producción via Vercel Analytics (no en tests).
- **Playwright trace** para medir FCP/LCP en flujos críticos (onboarding, crear planeación).

### 3.8. Accesibilidad

- **axe-playwright** en E2E (WCAG 2.1 AA, P-UX alineado).
- Falla build si encuentra violación `critical` o `serious`.

### 3.9. CodeQL / Semgrep

- Análisis estático SAST en CI (Vercel native CodeQL + Semgrep para reglas custom).
- Bloquea PR si encuentra secretos en código (trufflehog).

---

## 4. CONVENCIONES DE TESTING

### 4.1. Estructura

```text
tests/
├── unit/
│   ├── lib/
│   │   ├── ia-anonymizer.spec.ts          # crítico: PII filtering
│   │   ├── pdf-template.spec.ts
│   │   ├── utils.spec.ts
│   │   └── matching-semantico.spec.ts
│   ├── services/
│   │   ├── planeaciones/
│   │   │   ├── create.spec.ts
│   │   │   ├── duplicate.spec.ts
│   │   │   └── entregar-director.spec.ts
│   │   ├── recursos-aula/
│   │   │   └── sugerir-uso-ia.spec.ts
│   │   └── ia/
│   │       ├── variantes-bloque.spec.ts
│   │       └── rate-limiter.spec.ts
│   └── stores/
│       ├── usePlaneacionStore.spec.ts
│       └── useInventarioStore.spec.ts
├── components/                            # RTL tests
│   ├── planeaciones/
│   │   ├── BancoBloques.test.tsx
│   │   └── CalendarioMensual.test.tsx
│   ├── recursos-aula/
│   │   └── SugerenciaIAChips.test.tsx     # P-PD9: chips clicables
│   └── evaluacion/
│       └── RubricaSemaforo.test.tsx
├── integration/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── planeaciones/
│   │   │   │   ├── create.integration.test.ts
│   │   │   │   ├── get.integration.test.ts
│   │   │   │   ├── patch.integration.test.ts
│   │   │   │   ├── duplicate.integration.test.ts
│   │   │   │   ├── entregar-director.integration.test.ts
│   │   │   │   └── evaluaciones.integration.test.ts
│   │   │   ├── alumnos/
│   │   │   │   ├── crud.integration.test.ts
│   │   │   │   └── bulk-import.integration.test.ts
│   │   │   ├── recursos-aula/
│   │   │   │   ├── crud.integration.test.ts
│   │   │   │   ├── cargar-kit-generico.integration.test.ts
│   │   │   │   └── ia-sugerir-uso.integration.test.ts
│   │   │   ├── catalogo/
│   │   │   │   └── queries.integration.test.ts
│   │   │   └── onboarding/aviso-privacidad.integration.test.ts
│   │   └── entregas/
│   │       ├── marcar-recibida.integration.test.ts
│   │       └── comentario.integration.test.ts
│   └── rls/
│       ├── rls-cct-cross-tenant.integration.test.ts   # CRÍTICO
│       ├── rls-alumnos-by-cct.integration.test.ts
│       └── rls-evaluaciones-by-cct.integration.test.ts
├── e2e/
│   ├── onboarding-5-pantallas.e2e.spec.ts            # CRÍTICO 1
│   ├── crear-planeacion.e2e.spec.ts                  # CRÍTICO 2
│   ├── drag-drop-bloques.e2e.spec.ts                 # CRÍTICO 3
│   ├── rubrica-semaforo.e2e.spec.ts                 # CRÍTICO 4
│   ├── generacion-pdf.e2e.spec.ts                   # CRÍTICO 5
│   ├── catalogo-nem-queries.e2e.spec.ts             # CRÍTICO 6
│   ├── rls-por-cct.e2e.spec.ts                      # CRÍTICO 7
│   ├── entregar-director-url-firmada.e2e.spec.ts
│   ├── recursos-aula-inventario.e2e.spec.ts
│   ├── pwa-offline-sync.e2e.spec.ts
│   └── biblioteca-conaliteg.e2e.spec.ts
├── fixtures/
│   ├── planeaciones/
│   │   ├── buenas-decisiones.json
│   │   └── emociones.json
│   ├── alumnos/
│   │   └── grupo-lola-25.json
│   ├── catalogo-nem.json
│   ├── kit-generico.json
│   └── jwt-director-firmado.txt                      # JWT de test para /v/[entrega_id]
└── helpers/
    ├── supabase-test-client.ts
    ├── mock-auth.ts                                   # mock Supabase Auth session
    ├── seed-test-db.ts                                # seed con datos mínimos
    ├── assert-schema.ts                                # ajv wrapper
    ├── dnd-test-utils.ts                               # helpers @dnd-kit en jsdom
    └── mock-minimax.ts                                 # mock responses F1/F2/F3/F-IA1
```

### 4.2. Naming

- Unit: `<archivo>.spec.ts` (lógica pura) o `<componente>.test.tsx` (RTL).
- Integration: `<recurso>.integration.test.ts`.
- E2E: `<flujo>.e2e.spec.ts` (alineado con Playwright default).
- Fixture: `<nombre>.json` en kebab-case.

### 4.3. Patrón AAA + describe anidado

```ts
describe("services/planeaciones/create", () => {
  describe("cuando el body es válido", () => {
    it("crea planeación con estado 'borrador'", async () => { /* ... */ });
    it("asigna versión=1", async () => { /* ... */ });
  });
  describe("cuando el body es inválido", () => {
    it.each([
      ["sin grupo_id", { /* ... */ }],
      ["modalidad no soportada", { /* ... */ }],
      ["pda_ids con ID inválido", { /* ... */ }],
    ])("retorna 422 para %s", async (_label, body) => { /* ... */ });
  });
});
```

### 4.4. Datos de prueba

- Usar **fixtures JSON** en `tests/fixtures/`, no datos hardcodeados en tests.
- Para PII en tests, **nunca** usar datos reales. Faker con seed fijo para nombres.

---

## 5. TESTS UNITARIOS (lógica pura)

### 5.1. `lib/ia-anonymizer.spec.ts` — CRÍTICO

**Objetivo:** verificar que `ia_anonymizer` filtra TODOS los PII antes de cualquier llamada MiniMax.

**Casos:**

| ID | Descripción | Entrada | Aserción |
|---|---|---|---|
| T-U-01 | Filtra nombre del docente | `{ nombre: "Lola", cct: "22DJN0059R" }` | Output no contiene "Lola" ni "22DJN0059R" |
| T-U-02 | Filtra datos de alumnos | `{ alumnos: ["María", "José"] }` | Output no contiene nombres |
| T-U-03 | Filtra celular del director | `{ director_celular: "+525512345678" }` | Output no contiene el número |
| T-U-04 | Preserva datos pedagógicos | `{ bloque_texto: "El frasco de la calma..." }` | Output contiene el texto íntegro |
| T-U-05 | Detecta PII en texto libre | `{ uso: "María usa el frasco" }` | Output reemplaza "María" por `[ALUMNO_REDACTED]` |
| T-U-06 | Snapshot del log de llamada | Cualquier input complejo | Snapshot cubre que el log no contiene PII |

**Regla dura:** si este test falla, **bloquea merge** (P-PD8 + SPEC §3.7.2).

### 5.2. `lib/matching-semantico.spec.ts` (E21 §4.2)

Verifica algoritmo de score entre `uso` del recurso y `recursos_requeridos` del bloque.

| ID | Caso | Score esperado | Tier esperado |
|---|---|---|---|
| T-U-10 | Match perfecto: uso="para el frasco de la calma" + bloque requiere "frasco"+"calma" | ≥0.8 | 🥇 |
| T-U-11 | Match alternativo: uso="para musicalizar" + bloque pide "instrumento" + categoría música | 0.5-0.8 | 🥈 |
| T-U-12 | No match: uso="colores" + bloque pide "frasco" | <0.5 | ❌ |
| T-U-13 | Edad incompatible → score 0 | Recurso 3-4 años, bloque 5-6 años | 0 |

### 5.3. `services/ia/rate-limiter.spec.ts`

| ID | Caso | Aserción |
|---|---|---|
| T-U-20 | 5 llamadas en 1 min → OK | Responde 200 |
| T-U-21 | 6ª llamada en 1 min → 429 | `NEM_RATE_LIMIT_EXCEEDED` |
| T-U-22 | Tras 60s, contador resetea | Nueva llamada OK |

### 5.4. Stores Zustand

| ID | Store | Caso |
|---|---|---|
| T-U-30 | `usePlaneacionStore` | `setActiva` actualiza `planeacionActiva` y persiste a IDB mock |
| T-U-31 | `usePlaneacionStore` | `patchActiva` merge parcial |
| T-U-32 | `useInventarioStore` | Cargar kit genérico reemplaza items existentes |
| T-U-33 | `useUiStore` | `undoStack` mantiene últimas 5 acciones (FIFO) |

### 5.5. PDF template

| ID | Caso | Aserción |
|---|---|---|
| T-U-40 | Template renderiza con todos los campos §3.5 | Snapshot HTML cubre las 6 secciones |
| T-U-41 | Problema del contexto vacío → bloqueo pre-render | Lanza error `NEM_PDF_CONTEXTO_VACIO` |
| T-U-42 | 0 PDA seleccionados → bloqueo | Lanza error `NEM_PDF_SIN_PDA` |
| T-U-43 | Hash SHA-256 estable | Mismo input → mismo hash |

---

## 6. TESTS DE COMPONENTES (RTL)

### 6.1. `<SugerenciaIAChips />` — P-PD9 crítico

**Objetivo:** verificar patrón UI de sugerencias IA: chips clicables, campo siempre editable, sin autocomplete forzado.

| ID | Caso | Aserción |
|---|---|---|
| T-C-01 | Renderiza 3 chips | `getByRole('button', { name: /sugerencia 1/i })` visible |
| T-C-02 | Click en chip puebla input | Tras click, input value === sugerencia |
| T-C-03 | Input editable después de usar chip | `user.clear(input)` funciona |
| T-C-04 | Botón "Ignorar" oculta chips | Tras click, chips no visibles |
| T-C-05 | Indicador de provenance visible | `getByText(/origen: ia/i)` o similar |
| T-C-06 | No autocompleta sin click | Sin interacción, input vacío |

### 6.2. `<BancoBloques />` + @dnd-kit

| ID | Caso | Aserción |
|---|---|---|
| T-C-10 | Renderiza 30 bloques por campo formativo | `getAllByRole('button', { name: /bloque/i })` length === 30 |
| T-C-11 | Filtro por tipo reduce lista | Click filtro "Apertura" → length ≤ 5 |
| T-C-12 | Drag handle accesible | `getByRole('button', { name: /arrastrar/i })` presente |
| T-C-13 | Botón "Agregar" alternativo al drag | Click → dispara `onAdd` callback |
| T-C-14 | Undo button aparece tras agregar | Visible en UI store |

### 6.3. `<RubricaSemaforo />`

| ID | Caso | Aserción |
|---|---|---|
| T-C-20 | Renderiza 4 dropzones con colores | `getByTestId('dropzone-verde')`, etc. |
| T-C-21 | Arrastra alumno a verde → nivel=1 | Tras drop, llamada a `onNivelChange(alumnoId, 1)` |
| T-C-22 | Cambio de nivel por teclado (WCAG) | Tab → Space agarra → flechas → Space suelta |

### 6.4. `<AvisoPrivacidadModal />`

| ID | Caso | Aserción |
|---|---|---|
| T-C-30 | Modal full-screen en primer login | Overlay cubre viewport |
| T-C-31 | Checkbox requerido | Submit deshabilitado sin check |
| T-C-32 | Si rechaza, botón "Capturar alumnos" deshabilitado | En dashboard, `Capturar alumnos` button disabled |

---

## 7. TESTS DE INTEGRACIÓN

### 7.1. Contrato API (ajv + Supabase local)

Cada route handler tiene un test que:

1. Llama con input válido → valida response con ajv contra schema SPEC_TEC_03.
2. Llama con input inválido → valida 422 con code esperado.
3. Llama sin auth → valida 401.
4. Llama con auth de otro CCT → valida 403 `NEM_AUTH_RLS_VIOLATION`.

| ID | Endpoint | Casos |
|---|---|---|
| T-I-01 | `POST /planeaciones` | 4 casos (DEC-03-03 envelope, RLS, idempotencia, schema válido) |
| T-I-02 | `GET /planeaciones/:id` | 3 casos (404, 403 cross-CCT, paginación cursor) |
| T-I-03 | `PATCH /planeaciones/:id` | 4 casos (merge patch, version bump, archived, inmutable post-entrega) |
| T-I-04 | `POST /planeaciones/:id/duplicar` | 3 casos (mismo grupo, otro grupo, evaluaciones no copiadas) |
| T-I-05 | `POST /planeaciones/:id/entregar-director` | 4 casos (URL firmada generada, QR SVG, wa.me URL, PDF hash). **Actualizado (ADR-20260819-01):** `pdf_sha256` ya se persiste con hash real del binario (no diferido); la idempotencia estricta del hash entre entrega y descarga queda nominal hasta el cierre total con Storage (ver T-E2E-05 y SPEC_TEC_03 §6.30 regla 2). |
| T-I-06 | `POST /planeaciones/:id/evaluaciones` | 4 casos (single, batch 50, upsert nivel, PDA inválido) |
| T-I-07 | `POST /alumnos` + bulk-import | 4 casos (single, CSV 25 alumnos, CSV mal formado, RLS) |
| T-I-08 | `POST /recursos-aula` + cargar-kit | 4 casos (single, kit genérico 30 items, duplicado, RLS) |
| T-I-09 | `POST /recursos-aula/:id/ia/sugerir-uso` | 5 casos (MiniMax mock, cache 30 días, fallback vacío, anonymizer check, RLS) |
| T-I-10 | `GET /catalogo/pda` | 3 casos (filtro campo, filtro fase, full-text) |
| T-I-11 | `GET /catalogo/bloques` | 3 casos (filtro tipo, filtro modalidad, flexibilidad) |
| T-I-12 | `POST /onboarding/aviso-privacidad/aceptar` | 3 casos (aceptación, repetición 409, sin consentimiento) |
| T-I-13 | `POST /entregas/:entrega_id/marcar-recibida` | 3 casos (JWT válido, JWT expirado 401, ya recibida idempotente) |
| T-I-14 | `POST /entregas/:entrega_id/comentario` | 3 casos (persistencia, texto >1000 chars, vinculación futura) |

**Total integration: ~40 tests** (algunos con `it.each` para múltiples casos).

### 7.2. RLS por CCT — CRÍTICO

| ID | Tabla | Test |
|---|---|---|
| T-I-RLS-01 | `planeaciones` | Maestra CCT-A no puede leer planeación de CCT-B (403) |
| T-I-RLS-02 | `alumnos` | Maestra CCT-A no puede listar alumnos de CCT-B |
| T-I-RLS-03 | `evaluacion_alumno` | Maestra CCT-A no puede escribir evaluación en alumno de CCT-B |
| T-I-RLS-04 | `recurso_aula` | Maestra CCT-A no puede editar recurso de docente de CCT-B |
| T-I-RLS-05 | `entregas` | Director con JWT firmado solo ve entrega del sub correcto |
| T-I-RLS-06 | `bitacora` | Maestra CCT-A no puede ver bitácora de CCT-B |
| T-I-RLS-07 | `aceptacion_aviso_privacidad` | Maestra solo ve su propia aceptación |
| T-I-RLS-08 | Catálogos NEM | Sin RLS — lectura pública siempre OK |

**Regla dura:** si cualquier test RLS falla, **bloquea deploy** (D-FIN-12).

---

## 8. TESTS E2E (Playwright)

### 8.1. Config

```ts
// playwright.config.ts (extracto)
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,        // Supabase local no soporta bien paralelo
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 360, height: 640 },  // P-UX4 obligatorio
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### 8.2. Tests críticos (los 7 pedidos por Frank + 4 adicionales)

#### T-E2E-01 — Onboarding 5 pantallas (CRÍTICO 1)

**Setup:** DB reset, sin usuarios. URL `/`.

**Pasos:**

1. Click "Crear cuenta" → llenar nombre, email, password.
2. Submit → redirect a paso 2.
3. Escribir CCT `22DJN0059R` → autocomplete muestra "Jardín Celestino Freinet".
4. Confirmar → paso 3.
5. Seleccionar Preescolar, grado 1°, grupo A, # alumnos 20.
6. Continuar → paso 4.
7. Agregar 3 alumnos manualmente (María, José, Ana).
8. Continuar → paso 4.5 (inventario opcional).
9. Cargar kit preescolar genérico → 30 items cargados.
10. Continuar → paso 5.
11. Modal aviso privacidad → aceptar.
12. Click "Ir a mis planeaciones" → `/dashboard`.

**Aserciones:**

- URL final: `/dashboard`.
- Sidebar muestra "Jardín Celestino Freinet" + CCT.
- 3 alumnos visibles en lista.
- 30 recursos en inventario.
- `aceptacion_aviso_privacidad` insertado en BD.

**Mobile-first assertion:** viewport 360×640 todo el flujo sin scroll horizontal.

#### T-E2E-02 — Crear planeación end-to-end (CRÍTICO 2)

**Setup:** Usuario Tía Lola ya onboardingado (seed).

**Pasos:**

1. `/dashboard` → click "Nueva planeación".
2. Seleccionar modalidad "Proyecto Comunitario".
3. Escribir nombre "Manifiesta tus emociones".
4. Periodo: septiembre 2026.
5. Problema del contexto: "Los niños no nombran emociones en conflictos del recreo."
6. Seleccionar campo formativo "De lo Humano y lo Comunitario".
7. Seleccionar eje "Inclusión".
8. Seleccionar PDA del catálogo (autocomplete).
9. Producto integrador: "Frasco de la calma colectivo".
10. Click "Crear" → redirect `/planeaciones/[id]`.
11. Arrastrar 5 bloques al lienzo (1 apertura + 3 desarrollo + 1 cierre).
12. Click "Guardar".
13. Validar estado: `borrador`, versión 1.

**Aserciones:**

- BD: `planeaciones` insert con todos los campos.
- BD: 5 `sesion_bloque` inserts.
- UI: badge "Borrador" visible.
- UI: botón "Entregar al director" presente.

#### T-E2E-03 — Drag & drop bloques (CRÍTICO 3)

**Setup:** Planeación creada (T-E2E-02).

**Pasos:**

1. Abrir planeación.
2. Click en sesión 1 → vacía.
3. Banco lateral: filtrar por tipo "Apertura".
4. **Touch action:** arrastrar "El frasco de la calma" al lienzo (usar `page.dragAndDrop` o finger).
5. Validar bloque aparece en sesión 1.
6. **Keyboard action:** Tab al siguiente bloque, Space agarra, flecha abajo, Space suelta.
7. Validar segundo bloque agregado.
8. **Botón "Agregar":** click en tercer bloque → agregado sin drag.
9. **Undo:** click botón "Deshacer" → remueve último.
10. **Conflicto:** intentar arrastrar bloque incompatible con modalidad → warning visible.

**Aserciones:**

- 3 bloques en sesión tras drag + keyboard + botón.
- Undo remueve 1 bloque.
- `navigator.vibrate` fue llamado (mock).
- Sin scroll horizontal en 360×640.

#### T-E2E-04 — Rúbrica con semáforo (CRÍTICO 4)

**Setup:** Planeación creada con 5 alumnos en el grupo.

**Pasos:**

1. Abrir planeación → tab "Evaluación".
2. Ver 5 alumnos en columna izquierda.
3. Ver 4 dropzones: 🟢 🟡 🟠 🔴.
4. Arrastrar "María" a 🟢 → nivel=1 persistido.
5. Arrastrar "José" a 🟡 → nivel=2.
6. Arrastrar "Ana" a 🟠 → nivel=3.
7. Click "Guardar rúbrica" → toast "Guardado".
8. Recargar página → niveles persistidos.

**Aserciones:**

- BD: 3 `evaluacion_alumno` inserts con niveles 1, 2, 3.
- UI: badges de color correctos.
- Mobile: drag funciona con touch.

#### T-E2E-05 — Generación PDF (CRÍTICO 5)

**Setup:** Planeación completa con todos los campos §3.5.

**Pasos:**

1. Abrir planeación → botón "Generar PDF".
2. Loading state (spinner) durante generación (Playwright headless).
3. Toast "PDF listo" + iframe con preview.
4. Click "Descargar PDF" → descarga inicia.
5. Validar archivo: nombre `planeacion-manifiesta-tus-emociones-v1.pdf`, tamaño > 10KB.
6. Click "Entregar al director" → modal.
7. Llenar celular `+525512345678`.
8. Submit → URL firmada generada + QR visible + botón "Abrir WhatsApp".
9. Click "Abrir WhatsApp" → `https://wa.me/525512345678?text=...` abre.
10. Validar URL firmada abre página director (sin registro).

**Aserciones:**

- BD: `entregas` insert con `estado='entregada'`, `pdf_sha256` no nulo, `url_firmada_token` presente.
- BD: `url_firmada_expira_at` = created_at + 30 días.
- `/v/[entrega_id]?token=...` retorna 200 con HTML director.
- Hash PDF estable (regenerar → mismo hash si input idéntico). **Ver aclaración de alcance abajo (ADR-20260819-01).**

> **⚠️ ESTADO ACTUALIZADO (ADR-20260819-01, 2026-08-19, tras IMPL-20260819-01 + QA-20260819-01).**
>
> Tras IMPL-20260819-01, el binario D-FIN-5 **está cerrado** y la desviación anterior (endpoint `text/html`, `pdf_sha256` no poblado) **queda resuelta**:
> - Paso 4 ("Click 'Descargar PDF' → descarga inicia") y paso 5 ("archivo `.pdf`, tamaño > 10KB"): el endpoint `app/api/planeaciones/[id]/generar-pdf/route.ts` retorna `Content-Type: application/pdf` + `Content-Disposition: attachment; filename="planeacion-<id>.pdf"` + `X-Pdf-Sha256`. Binario real verificado por QA: 37 KB, `%PDF-1.4`.
> - Aserción `pdf_sha256` no nulo: `entrega-actions.ts` persiste el SHA-256 real del binario generado (no placeholder).
>
> **Lo que sigue nominal (P2-1, no rebaja D-FIN-5):** la aserción "Hash PDF estable (regenerar → mismo hash si input idéntico)" **se interpreta con alcance preciso**:
> - **Estricto para el binario persistido en una entrega** (cierre total futuro `ARCH-20260819-02`, requiere Storage): `entrega.pdf_sha256` debe coincidir con el hash de descargas posteriores. **No se cumple hoy** porque `generar-pdf` re-renderiza en cada descarga y Chromium embebe `/CreationDate`/`/ModDate` desde el reloj del host (causa residual b). Causa (a) cerrada por SOFIA: footer con fecha determinista derivada de la planeación.
> - **Nominal para renders on-demand** (descarga sin entrega asociada): el `X-Pdf-Sha256` acredita el binario de esa llamada, no entre llamadas consecutivas.
> - El test de integración "mismo input → mismo hash" verifica determinismo en el **renderer inyectado** (buffer fijo), no idempotencia del renderer real con chromium. No exige idempotencia del renderer real hasta el cierre total con Storage.
>
> **Validable hoy:** pasos 1-5 (botón, loading, descarga binaria > 10KB), pasos 6-10 (entregar al director: URL firmada + QR + `wa.me` + página director sin registro), `pdf_sha256` poblado con hex 64. **No validable hoy (gate de staging/producción):** E2E completo contra Supabase real (T-E2E-05 end-to-end + flujo D-FIN-17), idempotencia estricta del hash entre entrega y descarga (cierre Storage).
>
> **Preservación del requisito:** D-FIN-5 "Descargable binario" **cumplido como binario**. La garantía de integridad entre entrega y descarga queda acotada (no rebajada) hasta el cierre total. Ver SPEC_TEC_03 §6.30 regla 2 (aclaración ADR-20260819-01) y §6.7 (nota de desviación resuelta).

#### T-E2E-06 — Catálogo NEM queries (CRÍTICO 6)

**Pasos:**

1. `/dashboard` → click "Biblioteca NEM".
2. Ver 4 campos formativos como cards.
3. Click "Saberes y Pensamiento Científico".
4. Ver ~24 PDA listados.
5. Filtro por Fase 2 → reducir a ~24.
6. Buscar "frasco" → resultados con palabra.
7. Click en PDA → ver detalle + bloques asociados.
8. Click bloque → ver descripción + nivel flexibilidad.
9. Click "Agregar a planeación" → redirige a wizard con bloque pre-seleccionado.

**Aserciones:**

- Respuestas cacheadas (TanStack Query `staleTime: Infinity`).
- Sin error 500 en ningún click.
- Búsqueda full-text < 200ms.

#### T-E2E-07 — RLS por CCT (CRÍTICO 7)

**Setup:** 2 maestras en CCTs distintos, cada una con 1 planeación.

**Pasos:**

1. Login maestra A (CCT-A).
2. Crear planeación PA.
3. Cerrar sesión.
4. Login maestra B (CCT-B).
5. Intentar navegar a `/planeaciones/PA_ID` directamente (URL hack).
6. Validar: redirect a `/403` o mensaje "No tienes acceso".

**Aserciones:**

- 403 en route handler.
- UI no muestra contenido de PA.
- BD: query retorna 0 rows (RLS bloquea).

#### T-E2E-08 — Entregar al director (URL firmada)

**Pasos:**

1. Maestra genera entrega (T-E2E-05).
2. Abrir URL firmada en navegador incógnito.
3. Ver header con datos de la maestra + escuela + CCT + timestamp.
4. Ver PDF embebido en iframe.
5. Click "Marcar como recibida" → estado cambia a "Recibida".
6. Escribir comentario "Buen trabajo, revisar ajustes razonables." → submit.
7. BD: `entregas.estado='recibida'`, `comentario_director` insert.

#### T-E2E-09 — Recursos-aula inventario

**Pasos:**

1. `/recursos-aula` → ver inventario vacío.
2. Click "Cargar kit preescolar genérico" → 30 items.
3. Click "Agregar recurso" → form.
4. Escribir "Frasco de cristal grande", categoría "Sensoriales".
5. Click en input "uso" → sugerencias F-IA1 aparecen (3 chips).
6. Click en chip "para el frasco de la calma" → input puebla.
7. Editar input a "para el frasco de la calma y mezclas".
8. Submit → recurso persistido.
9. Badge "origen: ia_sugerencia" visible.

**Aserciones:**

- BD: `recurso_aula.uso_fuente='maestra_editada_de_ia'`.
- UI: chips respetan P-PD9 (clicables, no autocompletan sin click).

#### T-E2E-10 — PWA offline sync

**Pasos:**

1. `/dashboard` online.
2. DevTools → offline mode.
3. Crear planeación offline (en cola IndexedDB).
4. Validar toast "Sin conexión — cambios en cola".
5. DevTools → online mode.
6. Validar drain de cola + toast "Sincronizado".
7. BD: planeación persistida con timestamps.

#### T-E2E-11 — Biblioteca CONALITEG

**Pasos:**

1. `/biblioteca` → ver 19 libros en grid.
2. Click "Mi Álbum 1°" → online: iframe CONALITEG carga.
3. Validar atribución visible "Libro distribuido por CONALITEG, SEP".
4. DevTools offline → click → PDF.js offline carga.
5. Validar PDF cacheado en IndexedDB.

**Aserciones:**

- No se aloja contenido CONALITEG en Supabase (solo URLs).
- Atribución visible en ambos modos.

#### T-E2E-12 — Bitácora post-clase (Flujo C, criterio MVP §7.1 #3)

**Corrección de auditoría documental (ARCH-20260818-01, INTEGRA):** la versión 1.0 de esta SPEC marcaba el Flujo C como "Diferido" en §13, contradiciendo el baseline funcional (`SPEC_MVP_01 §7.1` criterio #3 "llena bitácora <30s", `SPEC_TEC_01 §5.4` Flujo C, tabla `bitacora` en `SPEC_TEC_02 §5.3.14`). El Flujo C **es alcance MVP**. Se añade este test para cerrar el gap de cobertura.

**Pasos:**

1. `/dashboard` → sesión con planeación calendarizada hoy.
2. Click "Bitácora de hoy".
3. Capturar: participación (slider 1-5), actividad mejor (selector de bloque del proyecto del día), dificultades (texto opcional), evidencia (foto opcional del TRABAJO del niño, NO del niño).
4. Validar mensaje explícito "La foto es del trabajo del niño, no del niño" al abrir cámara/subir.
5. Guardar.
6. DevTools → offline → llenar otra bitácora → validar cola IndexedDB + toast "Sin conexión".
7. DevTools → online → validar sync (drain de cola) + `bitacora.sync_estado='sincronizada'`.

**Aserciones:**

- BD: `bitacora` insert con `participacion_grupo` 1-5, `evidencia_url` no nula si se subió foto, `sync_estado` correcto.
- Regla dura foto: la evidencia referencia `ccts/{cct}/bitacoras/{fecha}/{uuid}.jpg` (trabajo del niño, no del niño).
- Tiempo objetivo: < 30 s de captura (P-UX9 / criterio MVP §7.1 #3).
- RLS: cubierto por `T-I-RLS-06` (maestra CCT-A no ve bitácora de CCT-B).

---

## 9. TESTS DE REGRESIÓN VISUAL

### 9.1. Storybook (DEC-06-02 — pendiente)

Si se incluye Storybook (PEND-06-02):

- Cada componente en `components/**` con story `Default` + variantes.
- CI corre `chromatic test --exit-zero-on-changes` para no bloquear PR pero marcar diffs.
- Baseline aprobado por Frank en primera configuración.

### 9.2. Snapshots E2E

Sin Storybook, usar `page.screenshot()` en E2E críticos:

- `/dashboard` tras login.
- `/planeaciones/[id]` tras crear.
- `/evaluaciones` con rúbrica llena.
- `/v/[entrega_id]` página director.

**Tolerancia:** `0.1` (anti-flake anti-aliasing). Fail build si diff > 0.1.

### 9.3. Dark mode

PEND-04-08: si se implementa dark mode, snapshots en ambos modos.

---

## 10. TESTS DE PERFORMANCE

### 10.1. Lighthouse CI

| Escenario | Métrica objetivo (P-UX5) | Falla build si |
|---|---|---|
| `/` (landing/login) | FCP < 1.2s, LCP < 2.5s | LCP > 4s |
| `/dashboard` (auth) | FCP < 1.5s, LCP < 2.5s | LCP > 4s |
| `/planeaciones/[id]` (con 5 sesiones) | LCP < 3s | LCP > 5s |
| `/biblioteca` (19 libros) | LCP < 3s | LCP > 5s |

### 10.2. Bundle size

- `bundle-analyzer` en CI. Falla si **client JS** > 250KB gzip en cualquier ruta.
- Anti-bundle-bloat: si una ruta supera, SOFIA debe code-split.

### 10.3. Trace Playwright

- En E2E-01 (onboarding) y E2E-02 (crear planeación), capturar trace + métricas.
- Objetivo: 95% de navegaciones con LCP < 2.5s.

### 10.4. DB query perf

- Tests integration con `EXPLAIN ANALYZE` en queries críticas (paginación cursor, RLS JOIN).
- Falla si query > 100ms en dataset de test (1000 planeaciones).

---

## 11. COBERTURA OBJETIVO

### 11.1. Por dominio

| Dominio | Cobertura mínima | Razón |
|---|---|---|
| `lib/ia-anonymizer.ts` | **100%** | Regla dura PII |
| `lib/auth/**` | **100%** | Seguridad crítica |
| `services/planeaciones/**` | **≥85%** | Lógica de negocio central |
| `services/ia/**` | **≥90%** | Compliance IA |
| `services/recursos-aula/**` | **≥80%** | — |
| `services/evaluacion/**` | **≥80%** | — |
| `services/onboarding/**` | **≥85%** | — |
| `services/offline/**` | **≥80%** | PWA crítico |
| `app/api/v1/**` (route handlers) | **≥90%** | Contrato público |
| `components/**` | **≥70%** | UI testing es caro |
| `stores/**` | **≥85%** | Estado crítico |
| `lib/utils.ts`, formatters | **≥90%** | Fáciles de testear |

### 11.2. Exclusiones

- `app/**/page.tsx` (Server Components): cubiertos por E2E, no unit.
- `next.config.mjs`, `tailwind.config.ts`: no testeados.
- `supabase/migrations/*.sql`: cubiertos por integration tests (no unit).

### 11.3. Reporte

- `pnpm test:coverage` genera `coverage/lcov.info` + HTML.
- Codecov o Vercel-native coverage en PR.
- Fallo build si coverage baja >2% vs main.

---

## 12. CI/CD PIPELINE

### 12.1. GitHub Actions (DEC-06-03)

```yaml
# .github/workflows/ci.yml (extracto)
name: CI
on: [push, pull_request]
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps: [setup-node, pnpm install, pnpm lint, pnpm typecheck]
  unit:
    runs-on: ubuntu-latest
    steps: [setup, pnpm test:coverage]
    coverage-to-codecov: true
  integration:
    runs-on: ubuntu-latest
    services:
      supabase: local CLI
    steps: [setup, pnpm supabase:start, pnpm test:integration, pnpm supabase:stop]
  e2e:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, unit, integration]
    if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
    steps: [setup, pnpm build, pnpm test:e2e]
  lighthouse:
    runs-on: ubuntu-latest
    needs: [e2e]
    steps: [setup, lhci autorun]
  visual-regression:
    runs-on: ubuntu-latest
    needs: [e2e]
    steps: [percy/Chromatic run]
  security-scan:
    runs-on: ubuntu-latest
    steps: [codeql, semgrep, trufflehog]
```

### 12.2. Gates de calidad (bloqueantes)

| Gate | Falla build si |
|---|---|
| Lint | Cualquier error ESLint |
| Typecheck | Cualquier error `tsc --noEmit` |
| Unit | Cualquier test falla |
| Coverage | Cobertura baja >2% vs main en dominios críticos |
| Integration | Cualquier test RLS falla |
| E2E | Cualquier test crítico T-E2E-01 a T-E2E-07 falla |
| Lighthouse | LCP > 4s en cualquier página crítica |
| Bundle | JS client > 250KB gzip |
| Security | CodeQL/Semgrep encuentra high severity |

### 12.3. Nightly job

- Corre **todos** los E2E en chromium + webkit.
- Regresión visual completa.
- Performance tests.
- Reporte a Slack/Telegram (configurable).

### 12.4. Pre-deploy (Vercel)

- Vercel automáticamente corre build + e2e en preview deployments.
- Manual approval gate para `production` env.
- Si un check falla, bloquea merge to main.

---

## 13. CRITERIOS DE ACEPTACIÓN POR FEATURE

Cada feature en `SPEC_MVP_01` debe tener criterios testeables. Tabla maestra:

| Feature SPEC § | Test ID | Criterio aceptación |
|---|---|---|
| §3 Flujo A (crear proyecto) | T-E2E-02 | Maestra crea proyecto <15 min en 360×640 sin errores |
| §3 Flujo B (calendario) | T-E2E-02 (parte) | Calendario muestra colores M3 correctamente |
| §3 Flujo C (bitácora) | T-E2E-12, T-I-RLS-06 | Flujo C **en alcance MVP** (criterio §7.1 #3). Corregido por auditoría ARCH-20260818-01 (v1.0 marcaba "Diferido" incorrectamente). <30s + offline sync + RLS aislamiento |
| §3.6.M1 (bloques) | T-E2E-03 | Drag-drop, keyboard, undo funcionan mobile |
| §3.6.M2 (problema contexto) | T-E2E-02 (paso 5) | Campo validado no-vacío, con verbo acción al exportar |
| §3.6.M3 (vista mensual) | T-C-10, T-E2E-02 | Código colores visible, resumen "qué falta" correcto |
| §3.6.M4 (configuración escuela) | T-I-12 (onboarding) | M4 capturada en onboarding persiste |
| §3.6.M5 (entrega director) | T-E2E-05, T-E2E-08 | URL firmada + QR + WhatsApp + página director sin registro |
| §3.7 F1 (variantes IA) | T-I-09 (parte F1) | MiniMax no altera estructura (P-PD8) |
| §3.7 F2 (help redacción) | T-I-09 (parte F2) | Output revisable, no autocompleta |
| §3.7 F3 (pulir PDF) | T-I-09 (parte F3) | Solo campos marcados como pulibles |
| F-IA1 (sugerir uso recurso) | T-I-09, T-C-01..06 | Chips clicables, audit trail uso_fuente |
| D-FIN-2 (alumnos) | T-E2E-04 | CRUD alumnos funciona |
| D-FIN-3 (semáforo 4 niveles) | T-E2E-04, T-C-20..22 | Niveles 1-4, colores, drag-drop |
| D-FIN-4 (onboarding 5 pantallas) | T-E2E-01 | 5 pantallas + 1 opcional <5 min |
| D-FIN-5 (PDF triple) | T-E2E-05, T-E2E-08 | **Actualizado (IMPL-20260819-01 + ADR-20260819-01):** visualizable ✅ + compartible ✅ + **descargable binario ✅** (endpoint `.pdf` real + `pdf_sha256` poblado). Idempotencia estricta del hash entre entrega y descarga: nominal hasta cierre total con Storage (`ARCH-20260819-02`). |
| D-FIN-10 (CONALITEG) | T-E2E-11 | Online iframe + offline PDF.js + atribución |
| D-FIN-12 (RLS por CCT) | T-I-RLS-01..07, T-E2E-07 | Aislamiento cross-tenant 100% |
| D-FIN-13 (conector IA) | T-U-01..06, T-I-09 | Anonymizer + OpenAI-compatible + env vars |
| D-FIN-14 (PWA) | T-E2E-10 | Offline-first + sync queue |
| D-FIN-15 (aviso privacidad) | T-E2E-01 (paso 11), T-C-30..32 | Aceptación obligatoria + checkbox |
| D-FIN-16 (multi-grupo) | T-E2E-02 (parte) | Selector visible en layout |
| D-FIN-17 (duplicar) | T-I-04 | Clona a otro grupo sin evaluaciones |
| D-FIN-19 (WhatsApp) | T-E2E-05 (paso 8) | wa.me URL con mensaje pre-armado |
| P-PD9 (IA solo sugiere) | T-C-01..06, T-U-01..06 | Anonymizer + chips clicables + audit trail |
| P-UX1 (una pregunta/pantalla) | T-E2E-01 | Auditoría onboarding 5 pantallas |
| P-UX4 (mobile first honest) | TODOS E2E | Viewport 360×640 sin scroll horizontal |
| P-UX5 (carga <1.5s p75) | Lighthouse CI | LCP < 2.5s en rutas críticas |

---

## 14. DECISIONES PENDIENTES

### PEND-06-01 — Pact para contrato API

**Estado:** ajv es suficiente para MVP (mismo repo). **Confirmar** si se quiere Pact para Fase 2 (cuando módulo Director sea app separada).

### PEND-06-02 — Storybook

**Estado:** no incluido en MVP. **Decisión:** ¿Storybook en MVP o Fase 2? Pros: documentación viva de componentes, regressión visual aislada. Contras: setup time, mantenimiento. Recomendación: Fase 2 (post-piloto con Tía Lola).

### PEND-06-03 — Percy vs Chromatic

**Estado:** propuesto Percy. **Confirmar** o cambiar a Chromatic (mejor integración con Storybook, si se incluye PEND-06-02). Costo: Percy free tier 5k snapshots/mes, Chromatic similar.

### PEND-06-04 — axe-playwright severidad

**Estado:** falla build en `critical` + `serious`. **Confirmar** si también `moderate` debe fallar (más estricto, más fricción) o si solo `critical`.

### PEND-06-05 — Coverage gate 2% delta

**Estado:** bloquea PR si coverage baja >2% vs main. **Confirmar** tolerancia (alternativa: 5% más permisivo, o 1% más estricto).

### PEND-06-06 — E2E en webkit

**Estado:** incluye webkit (Safari). **Confirmar** o reducir a chromium-only en MVP para ahorrar CI minutes (trade-off: Tía Lola podría usar iPhone).

### PEND-06-07 — Nightly vs on-merge

**Estado:** nightly job corre todos los E2E. **Confirmar** o mover a on-merge-to-main (más frecuente, más costo CI).

### PEND-06-08 — Performance tests en DB grande

**Estado:** tests integration con 1000 planeaciones. **Confirmar** si se quiere dataset más grande (10k) para stress test de paginación cursor.

---

## 15. CRITERIOS DE ACEPTACIÓN (para GEMINI antes de DONE)

1. ✅ Pirámide de tests definida con proporciones 80/15/5.
2. ✅ Stack de testing completo (Vitest, RTL, Playwright, MSW, Supabase local, ajv, Lighthouse, axe).
3. ✅ Los 7 tests críticos pedidos por Frank (onboarding, crear planeación, dnd, rúbrica, PDF, catálogo, RLS) detallados con pasos y aserciones.
4. ✅ Cobertura objetivo ≥80% en lógica de negocio, con exclusiones justificadas.
5. ✅ CI/CD con gates bloqueantes definidos.
6. ✅ Regresión visual con tolerancia anti-flake.
7. ✅ Performance tests alineados a P-UX5.
8. ✅ Criterios de aceptación por feature trazables a IDs de test.
9. ✅ RLS tiene tests dedicados (T-I-RLS-01 a T-I-RLS-07).
10. ✅ PII filtering (ia-anonymizer) tiene tests dedicados con regla dura de bloqueo.

---

## 16. RELACIÓN CON OTROS DOCUMENTOS

| Documento | Relación |
|---|---|
| `SPEC_TEC_03_API_Contract.md` | Los tests de integración validan contra sus JSON Schemas (ajv) |
| `SPEC_TEC_04_Estructura_Proyecto.md` | Define `tests/` estructura alineada |
| `SPEC_MVP_01_Modulo_Docente.md` | Criterios de aceptación trazan a SPEC §N |
| `E22_CIERRE_DISCOVERY.md` | D-FIN-NN con tests dedicados |
| `E20_PRINCIPIOS_DISENNO_PRODUCTO.md` | P-PD8, P-PD9 verificados por T-U-01..06 |
| `fuentes/E21_CATALOGO_RECURSOS_AULA.md` | F-IA1 cubierto por T-I-09, T-C-01..06 |

---

## 17. PRÓXIMOS PASOS

1. ⏳ Frank valida las 8 decisiones pendientes (PEND-06-01 a PEND-06-08).
2. ⏳ GEMINI audita este SPEC contra SPEC_TEC_03 + SPEC_TEC_04 (consistencia).
3. ⏳ SOFIA configura `vitest.config.ts`, `playwright.config.ts`, helpers y fixtures.
4. ⏳ SOFIA implementa tests en orden: unit (T-U-01 ia-anonymizer primero) → integration RLS (T-I-RLS-01..07) → E2E críticos.
5. ⏳ CI workflow `.github/workflows/ci.yml` configurado.

---

**Fin del documento SPEC TEC 06.**
