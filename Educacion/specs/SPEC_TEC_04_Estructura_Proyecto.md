# SPEC TEC 04 — Estructura del Proyecto (Monorepo Next.js)

**ID:** ARCH-NOCTURNO-2026-08-16-INTEGRA-B
**Versión:** 1.0.0
**Fecha:** 2026-08-16
**Estado:** ESPECIFICACIÓN TÉCNICA LISTA PARA IMPLEMENTACIÓN
**Autor:** INTEGRA (orquestación nocturna)
**Alinea con:** `SPEC_MVP_01_Modulo_Docente.md` v0.13, `E22_CIERRE_DISCOVERY.md` v1.1 (D-FIN-11 a D-FIN-14, D-FIN-16), `E20` P-PD1 a P-PD9, `E21` catálogo recursos, `SPEC_TEC_03_API_Contract.md` v1.0.0

**Consumidor destino:** SOFIA (implementación), GEMINI (auditoría), Frank (revisión).
**Stack:** Next.js 14+ App Router + TypeScript strict + Tailwind + shadcn/ui + Supabase + @dnd-kit + PWA.

---

## 0. CÓMO LEER ESTE DOCUMENTO

- Todo bloque ```` ```text ```` con árbol de carpetas es **canónico**: SOFIA debe crear exactamente esa estructura.
- Los `DEC-04-NN` son decisiones arquitectónicas trazables; `PEND-04-NN` son decisiones pendientes que requieren aprobación de Frank.
- Toda ruta de archivo es **relativa a la raíz del repo** (`Educacion/`) salvo que se indique `~/` (home) o ruta absoluta.
- Toda referencia a "SPEC_TEC_03 §N" remite al contrato de API ya entregado.

---

## 1. PROPÓSITO Y ALCANCE

Definir la estructura canónica del monorepo Next.js que implementa el MVP del Módulo Docente (NEM preescolar). Cubre: layout de carpetas, convenciones de naming, patrones de componentes, estado global, auth, integración @dnd-kit, módulos principales, configuración PWA.

**Fuera de alcance:**

- Configuración de CI/CD (ver `SPEC_TEC_06_Plan_Testing.md` §6).
- Contrato de API (ver `SPEC_TEC_03_API_Contract.md`).
- Curaduría pedagógica de catálogos (ver `E14_CATALOGACION_AUTONOMA_FASE_2.md`).
- Monorepo turborepo/pnpm workspaces (MVP es **single-repo**, no monorepo con paquetes internos; ver DEC-04-01).

---

## 2. DECISIONES ARQUITECTÓNICAS INICIALES

### DEC-04-01 — Single-repo Next.js, no monorepo turborepo

**Decisión:** El MVP es un único app Next.js, no un monorepo con workspaces. Razones:

- Consumidores: 1 app web (PWA). No hay paquetes npm internos a publicar.
- Velocidad de setup y depuración: single-repo gana.
- Vercel native deploy: zero config.

**Revisión obligatoria Fase 2:** si aparece el módulo Director (E2) como app separada o el marketplace de bloques (D-DIF-5), migrar a turborepo + pnpm workspaces.

### DEC-04-02 — App Router (no Pages Router)

Next.js 14+ con **App Router** (`app/` directory). Server Components por defecto; `"use client"` solo donde hay interactividad (state, effects, dnd-kit, form).

### DEC-04-03 — Estado global: Zustand con stores por dominio

**Decisión:** Zustand (no Redux, no Jotai, no Recoil) para estado global. Stores por dominio: `useOnboardingStore`, `usePlaneacionStore`, `useCatalogoStore`, `useInventarioStore`, `useUiStore`.

**Justificación:**

| Factor | Zustand | Jotai | Redux Toolkit |
|---|---|---|---|
| Curva de aprendizaje | Baja | Media-baja | Media |
| Boilerplate | Mínimo | Mínimo | Alto |
| Persistencia IndexedDB | `middleware/persist` nativo | Requiere wrapper | Requiere wrapper |
| Offline-first PWA | Natural | Menos natural | Indirecto |
| Stores por dominio | Directo | Atomic model difiere mentalmente | Slice-based, similar |
| Devtools | Sí (devtools middleware) | Sí | Sí |

**Zustand + persist con storage IndexedDB (vía `idb-keyval`):** stores críticos (`planeacionActiva`, `inventarioAula`, `alumnosGrupo`) persisten offline. Stores UI (`modalAbierto`, `toast`) no persisten.

### DEC-04-04 — shadcn/ui como base de componentes

**Decisión:** shadcn/ui (Radix UI + Tailwind + cva) como librería base. NO usar Material UI, NO usar Chakra.

**Razones:**

- Componentes **se clonan al repo** (no dependencia npm): control total, auditable por GEMINI.
- Tailwind nativo (sin overrides de tema oscuros).
- Radix UI garantiza accesibilidad WCAG 2.1 AA (P-UX alineado).
- Composición sobre configuración.

**Setup inicial:** `pnpm dlx shadcn-ui@latest init` + agregar componentes según §5.

### DEC-04-05 — TypeScript strict mode

`tsconfig.json` con `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`. Cero `any` en código de producción (escapes solo en `types/` con justificación en comentario).

### DEC-04-06 — Path alias `@/*` para imports

`@/*` mapea a `./*` (raíz del repo). **No** anidar más alias (`@components`, `@lib`) — prefijo único simplifica grep y refactor.

---

## 3. ESTRUCTURA DE CARPETAS CANÓNICA

```text
Educacion/                          # raíz del repo
├── app/                            # App Router (rutas + API)
│   ├── (auth)/                     # route group: páginas con auth público (login, registro, OTP)
│   │   ├── login/page.tsx
│   │   ├── registro/page.tsx
│   │   └── layout.tsx              # layout minimal, sin sidebar
│   ├── (app)/                      # route group: páginas con auth docente
│   │   ├── dashboard/page.tsx      # home: "mis planeaciones" + calendario
│   │   ├── planeaciones/
│   │   │   ├── nueva/page.tsx      # wizard Flujo A (D-FIN-6 adaptativo)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # vista + edición
│   │   │   │   ├── editar/page.tsx
│   │   │   │   └── entregar/page.tsx   # modal entrega al director
│   │   │   └── page.tsx            # lista
│   │   ├── onboarding/
│   │   │   ├── paso-1/page.tsx      # registro
│   │   │   ├── paso-2/page.tsx      # CCT autocomplete (D-FIN-4, ENT-003 D2)
│   │   │   ├── paso-3/page.tsx      # grupo
│   │   │   ├── paso-4/page.tsx      # alumnos (opcional, + CSV)
│   │   │   ├── paso-4-5/page.tsx    # inventario aula (E21, opcional)
│   │   │   └── paso-5/page.tsx      # bienvenida
│   │   ├── alumnos/page.tsx        # CRUD lista
│   │   ├── recursos-aula/page.tsx  # inventario (E21)
│   │   ├── evaluaciones/page.tsx   # rúbrica semáforo (D-FIN-2, D-FIN-3)
│   │   ├── biblioteca/page.tsx     # PDFs CONALITEG (D-FIN-10)
│   │   ├── ajustes/page.tsx        # configuración M4 + comparación meses (T6 on/off)
│   │   └── layout.tsx              # layout con sidebar + header
│   ├── v/[entrega_id]/page.tsx     # URL firmada del director (pública, sin auth Supabase)
│   ├── api/                        # route handlers (SPEC_TEC_03)
│   │   └── v1/
│   │       ├── planeaciones/
│   │       │   ├── route.ts                    # POST (crear), GET (listar)
│   │       │   ├── [id]/route.ts               # GET, PATCH, DELETE
│   │       │   ├── [id]/duplicar/route.ts      # POST
│   │       │   ├── [id]/entregar-director/route.ts
│   │       │   ├── [id]/evaluaciones/route.ts # POST (rúbrica)
│   │       │   └── [id]/ia/
│   │       │       ├── variantes-bloque/route.ts   # F1
│   │       │       ├── help-redaccion/route.ts     # F2
│   │       │       └── pulir-pdf/route.ts          # F3
│   │       ├── alumnos/
│   │       │   ├── route.ts                   # POST, GET
│   │       │   ├── [id]/route.ts              # GET, PATCH, DELETE
│   │       │   └── bulk-import/route.ts       # POST multipart
│   │       ├── recursos-aula/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   ├── [id]/ia/sugerir-uso/route.ts   # F-IA1
│   │       │   └── cargar-kit-generico/route.ts
│   │       ├── catalogo/
│   │       │   ├── pda/route.ts
│   │       │   ├── campos-formativos/route.ts
│   │       │   ├── ejes/route.ts
│   │       │   └── bloques/route.ts           # catálogo M1
│   │       ├── entregas/
│   │       │   └── [entrega_id]/
│   │       │       ├── marcar-recibida/route.ts
│   │       │       └── comentario/route.ts
│   │       └── onboarding/
│   │           └── aviso-privacidad/aceptar/route.ts
│   ├── layout.tsx                 # root layout: <html>, fonts, providers
│   ├── globals.css                 # Tailwind base + variables paleta NEM
│   ├── error.tsx                   # error boundary global
│   ├── not-found.tsx
│   ├── manifest.ts                 # PWA manifest (Next.js native)
│   ├── opengraph-image.tsx         # OG dinámica
│   └── icon.tsx                   # favicon dinámico
├── components/                     # componentes UI compartidos
│   ├── ui/                         # shadcn/ui base (clonados, no npm)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   └── ... (añadir según necesidad)
│   ├── planeaciones/               # específicos del dominio planeaciones
│   │   ├── PlaneacionCard.tsx
│   │   ├── WizardFlujoA.tsx        # wizard adaptativo (D-FIN-6)
│   │   ├── BloqueArrastrable.tsx   # @dnd-kit item
│   │   ├── BancoBloques.tsx        # sidebar con catálogo M1 + inventario
│   │   ├── CalendarioMensual.tsx   # vista M3 con código de colores
│   │   └── EntregarDirectorModal.tsx
│   ├── catalogo/
│   │   ├── CatalogoPdaSelector.tsx
│   │   ├── CamposFormativosCheck.tsx
│   │   └── EjesArticuladoresMulti.tsx
│   ├── recursos-aula/
│   │   ├── InventarioList.tsx
│   │   ├── RecursoCard.tsx
│   │   ├── RecursoForm.tsx
│   │   ├── KitGenericoModal.tsx
│   │   └── SugerenciaIAChips.tsx   # F-IA1: chips clicables (P-PD9)
│   ├── evaluacion/
│   │   ├── RubricaSemaforo.tsx     # 4 niveles (D-FIN-3)
│   │   ├── AlumnoDragItem.tsx      # @dnd-kit
│   │   └── NivelSemaforoDropzone.tsx
│   ├── onboarding/
│   │   ├── Paso1Registro.tsx
│   │   ├── Paso2CCTAutocomplete.tsx
│   │   ├── Paso3Grupo.tsx
│   │   ├── Paso4Alumnos.tsx
│   │   ├── Paso4-5Inventario.tsx
│   │   ├── Paso5Bienvenida.tsx
│   │   └── AvisoPrivacidadModal.tsx  # D-FIN-15
│   ├── pdf-viewer/
│   │   ├── ConalitegIframe.tsx     # online (D-FIN-10)
│   │   ├── ConalitegPdfJs.tsx      # offline (PDF.js cacheado)
│   │   └── AtribucionSep.tsx       # compliance
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── GrupoSelector.tsx       # siempre visible (D-FIN-16)
│   │   └── CommandPalette.tsx      # ⌘K (opcional MVP, ver PEND-04-02)
│   ├── shared/
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingState.tsx
│   │   ├── EmptyState.tsx
│   │   └── ConfirmDialog.tsx
│   └── ia/                         # patrones UI para sugerencias IA
│       ├── SugerenciaChip.tsx      # chip genérico (P-PD9)
│       ├── SugerenciaPanel.tsx     # contenedor estándar
│       └── AuditBadge.tsx          # muestra origen: maestra/ia_sugerencia/...
├── lib/                            # utilidades puras (sin dominio)
│   ├── supabase/
│   │   ├── client.ts               # browser client
│   │   ├── server.ts               # server client (server components, route handlers)
│   │   ├── middleware.ts           # auth middleware (refresh session)
│   │   └── rls-helpers.ts          # utilidades para validar RLS en server
│   ├── auth/
│   │   ├── session.ts              # getServerSession, getCurrentUser
│   │   ├── roles.ts                # isDocente, isDirectorRegistrado
│   │   └── url-firmada.ts          # sign/verify JWT director (D-FIN-5)
│   ├── ia/
│   │   ├── anonymizer.ts           # ia_anonymizer (P-PD8, P-PD9)
│   │   ├── minimax-client.ts      # conector OpenAI-compatible (D-FIN-13)
│   │   ├── cache.ts               # cache 30 días prompts idénticos
│   │   └── rate-limiter.ts         # 5/min por usuario
│   ├── pdf/
│   │   ├── generate.ts             # Playwright headless
│   │   ├── template-nem.ts        # HTML template §3.5 contrato curricular
│   │   └── storage.ts              # Supabase Storage upload
│   ├── validators/                 # wrappers sobre ajv (zod schemas espejo)
│   │   └── planeacion.ts
│   ├── i18n/
│   │   ├── es-MX.json             # strings UI
│   │   └── index.ts
│   ├── utils.ts                    # cn (classnames), formatters, dates
│   └── constants.ts                # URLs CONALITEG (D-FIN-10), paleta, etc.
├── services/                       # lógica de negocio (orquesta API + DB + IA)
│   ├── planeaciones/
│   │   ├── create.ts               # POST /planeaciones wrapper
│   │   ├── getById.ts
│   │   ├── list.ts
│   │   ├── update.ts
│   │   ├── duplicate.ts            # D-FIN-17
│   │   ├── entregarDirector.ts     # D-FIN-5, D-FIN-19
│   │   └── generatePdf.ts
│   ├── alumnos/
│   │   ├── crud.ts
│   │   └── bulk-import.ts
│   ├── recursos-aula/
│   │   ├── crud.ts
│   │   ├── cargar-kit-generico.ts
│   │   └── sugerir-uso-ia.ts       # F-IA1 (server-side, con anonymizer)
│   ├── evaluacion/
│   │   └── rubrica.ts              # upsert batch
│   ├── catalogo/
│   │   ├── pda.ts
│   │   ├── campos-formativos.ts
│   │   ├── ejes.ts
│   │   └── bloques.ts
│   ├── ia/
│   │   ├── variantes-bloque.ts     # F1
│   │   ├── help-redaccion.ts       # F2
│   │   └── pulir-pdf.ts           # F3
│   ├── onboarding/
│   │   └── aceptar-aviso.ts
│   ├── entregas/
│   │   ├── marcar-recibida.ts
│   │   └── comentario.ts
│   └── offline/
│       ├── sync-queue.ts           # cola IndexedDB → Supabase
│       └── conflict-resolver.ts
├── stores/                         # Zustand stores por dominio (DEC-04-03)
│   ├── useOnboardingStore.ts
│   ├── usePlaneacionStore.ts
│   ├── useCatalogoStore.ts
│   ├── useInventarioStore.ts
│   ├── useAlumnosStore.ts
│   ├── useEvaluacionStore.ts
│   ├── useUiStore.ts               # modales, toasts, sidebars
│   └── middleware/
│       ├── persist-idb.ts          # IndexedDB storage adapter
│       └── devtools.ts
├── hooks/                          # custom hooks (client-side)
│   ├── usePlaneacion.ts            # data fetching + cache (SWR o TanStack Query)
│   ├── useAlumnos.ts
│   ├── useInventario.ts
│   ├── useEvaluacion.ts
│   ├── useDndSemaforo.ts           # @dnd-kit setup rúbrica
│   ├── useDndBancoBloques.ts       # @dnd-kit setup catálogo M1
│   ├── usePWAOnline.ts             # navigator.onLine + sync events
│   └── useUrlFirmada.ts            # valida JWT director en /v/[id]
├── types/                          # TypeScript types
│   ├── domain.ts                   # Docente, Escuela, Grupo, Alumno, Planeacion, ...
│   ├── api.ts                      # Request/Response DTOs (espejo de JSON Schemas)
│   ├── catalogo.ts                 # PDA, CampoFormativo, Eje, Bloque
│   ├── evaluacion.ts               # NivelSemaforo enum (D-FIN-3)
│   ├── inventario.ts               # RecursoAula, CategoriaKitGenerico (E21)
│   ├── entrega.ts                  # Entrega, EstadoEntrega
│   ├── ia.ts                       # SugerenciaIA, OrigenSugerencia
│   └── global.d.ts                 # augmentaciones (process.env, window)
├── supabase/                       # Supabase local + migrations
│   ├── migrations/
│   │   ├── 0001_init_auth_users.sql
│   │   ├── 0002_docente_grupo_alumno.sql
│   │   ├── 0003_planeacion_sesion_bloque.sql
│   │   ├── 0004_evaluacion_alumno.sql
│   │   ├── 0005_recurso_aula_recurso_skill.sql
│   │   ├── 0006_entrega_url_firmada.sql
│   │   ├── 0007_aceptacion_aviso_privacidad.sql
│   │   ├── 0008_audit_log.sql
│   │   ├── 0009_idempotency_keys.sql
│   │   ├── 0010_rls_policies.sql         # todas las policies por CCT (D-FIN-12)
│   │   ├── 0011_storage_buckets.sql       # pdfs, fotos-bitacora
│   │   ├── 0012_realtime_publication.sql  # entregas por CCT
│   │   └── 0013_indexes.sql               # índices para paginación cursor
│   ├── seed/
│   │   ├── pda.sql              # ~30 PDA oficiales (E14)
│   │   ├── catalogo_campos_formativos.sql # 4 fijos
│   │   ├── catalogo_ejes.sql              # 7 fijos
│   │   ├── catalogo_bloques.sql          # ~30-50 bloques MVP (D-FIN-1)
│   │   ├── kit_preescolar_generico.sql   # ~30 items (E21 §3.2)
│   │   └── conaliteg_urls.sql            # 19 refs (D-FIN-10)
│   ├── functions/                  # Edge Functions (solo si necesarias, ver DEC-04-07)
│   │   └── (vacío en MVP)
│   ├── config.toml                 # config local Supabase CLI
│   └── .env.example                # plantilla env vars (sin valores)
├── public/                         # assets estáticos servidos por CDN
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── maskable-512.png
│   ├── manifest-icons/
│   ├── pdf-templates/              # HTML templates para Playwright (SPEC §3.5)
│   │   └── planeacion-nem.html
│   ├── biblioteca-conaliteg/       # PDFs cacheados offline (D-FIN-10)
│   │   └── .gitkeep                # se llena en runtime via IndexedDB sync
│   └── og-default.png
├── tests/                          # ver SPEC_TEC_06_Plan_Testing.md
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   │   ├── planeaciones/
│   │   ├── alumnos/
│   │   ├── catalogo-nem.json       # catálogo mock
│   │   └── kit-generico.json
│   └── helpers/
│       ├── supabase-test-client.ts
│       ├── mock-auth.ts
│       └── seed-test-db.ts
├── scripts/                        # scripts de dev ops (no runtime)
│   ├── dev/
│   │   ├── setup-local.sh          # install deps + supabase start + seed
│   │   └── reset-db.sh
│   ├── catalogo/
│   │   ├── import-pda-from-dof.ts  # ETL E14 → seed
│   │   └── validate-bloques.ts
│   └── deploy/
│       └── migrate-production.sh
├── docs/                           # documentación del proyecto
│   ├── decisiones/                 # ADRs
│   │   ├── ADR-001-single-repo.md
│   │   ├── ADR-002-app-router.md
│   │   ├── ADR-003-zustand.md
│   │   ├── ADR-004-shadcn-ui.md
│   │   └── ADR-005-supabase-rls-cct.md
│   └── runbooks/                   # ops: cómo hacer X
│       ├── onboarding-nueva-maestra.md
│       └── rollback-migracion.md
├── .kilo/                          # INTEGRA + agentes Kilo
│   └── agent-manager.json
├── context/                        # artefactos de agents (compact-saves, learnings, queries)
│   ├── compact-saves/
│   ├── learnings/
│   └── queries/
├── .env.example                    # plantilla variables de entorno (sin secretos)
├── .env.local                      # local dev (gitignored)
├── .gitignore
├── .editorconfig
├── .eslintrc.json                  # eslint flat config
├── .prettierrc
├── next.config.mjs                 # Next.js config + PWA plugin
├── tailwind.config.ts              # paleta NEM + dark mode class strategy
├── postcss.config.mjs
├── tsconfig.json
├── components.json                 # shadcn/ui config
├── playwright.config.ts            # E2E
├── vitest.config.ts                # unit + integration
├── package.json
├── pnpm-lock.yaml
├── README.md
└── PROYECTO.md                     # máquina estados IDL (pendiente crear, ver reporte INTEGRA)
```

---

## 4. CONVENCIONES DE NAMING

### 4.1. Archivos

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componente React | `PascalCase.tsx` | `PlaneacionCard.tsx`, `WizardFlujoA.tsx` |
| Hook | `camelCase` con prefijo `use` | `usePlaneacion.ts`, `useDndSemaforo.ts` |
| Servicio | `camelCase` por dominio | `services/planeaciones/create.ts` |
| Store Zustand | `camelCase` con prefijo `use` + sufijo `Store` | `usePlaneacionStore.ts` |
| Type / Interface | `PascalCase` | `PlaneacionDto`, `AlumnoEntity` |
| Enum | `PascalCase`, valores `SCREAMING_SNAKE_CASE` | `enum NivelSemaforo { VERDE, AMARILLO, NARANJA, ROJO }` |
| Route handler | `route.ts` (fijo por App Router) | `app/api/v1/planeaciones/route.ts` |
| Utilidad pura | `camelCase` | `lib/utils.ts`, `formatDate.ts` |
| Migración SQL | `NNNN_descriptivo.sql` | `0010_rls_policies.sql` |
| Test | `<nombre>.spec.ts` (unit) / `.integration.test.ts` / `.e2e.spec.ts` | `planeacion-create.spec.ts` |
| Fixture | `kebab-case.json` | `planeacion-buenas-decisiones.json` |

### 4.2. Clases CSS y estilos

- Tailwind utility classes en JSX. Sin CSS custom salvo variables en `globals.css`.
- Prefijo `data-[state=...]` para variantes Radix.
- Variables CSS en `:root` y `.dark` para paleta NEM (ver §7).

### 4.3. Branches Git

- `main` — producción-ready, protected.
- `feature/<id-tkt>-<slug>` — features (`feature/IMPL-20260816-01-wizard-adaptativo`).
- `fix/<id-fix>-<slug>` — bugfixes.
- `docs/<id-doc>-<slug>` — solo docs.
- Convención Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

### 4.4. Nombres de tablas y columnas

- Tablas: `snake_case` plural (`planeaciones`, `alumnos`, `recursos_aula`).
- Columnas: `snake_case` (`cct`, `created_at`, `url_firmada_token`).
- FKs: `<tabla_singular>_id` (`planeacion_id`, `alumno_id`).
- Soft-delete: `activo BOOLEAN DEFAULT true` + `deleted_at TIMESTAMPTZ`.
- Audit: `created_at`, `updated_at` (trigger), `created_by` (auth.uid()).

---

## 5. PATRONES DE COMPONENTES (shadcn/ui)

### 5.1. Composición sobre configuración

Todo componente sigue el patrón Radix: **compound components**.

**Ejemplo (anti-pattern prohibido):**

```tsx
// ❌ NO: configuración monolítica
<Dialog title="..." content="..." isOpen={...} onConfirm={...} />
```

**Patrón correcto:**

```tsx
// ✅ SÍ: composición
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Entregar al director</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Entregar planeación</DialogTitle>
      <DialogDescription>Se generará un PDF y un enlace firmado.</DialogDescription>
    </DialogHeader>
    <EntregarDirectorForm />
  </DialogContent>
</Dialog>
```

### 5.2. Variants con cva (class-variance-authority)

Todo componente base define variants via `cva`:

```tsx
// components/ui/button.tsx (shadcn default)
const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-red-600 ...",
        outline: "border ...",
        // NEM-specific: añadir 'semaforo-verde', 'semaforo-amarillo', etc.
      },
      size: { default: "h-10 px-4", sm: "h-8 px-3", lg: "h-12 px-6" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

### 5.3. Server vs Client Components

**Regla:** Server Component por defecto. `"use client"` **solo** cuando hay:

- Event handlers (onClick, onSubmit)
- useState/useReducer/useEffect
- @dnd-kit (es client-only)
- Form con progressive enhancement (aunque Server Actions permiten híbrido)

**Patrones por dominio:**

| Componente | Server/Client | Razón |
|---|---|---|
| `PlaneacionCard` (solo render) | Server | Sin estado |
| `WizardFlujoA` (multi-step state) | Client | useState step |
| `BancoBloques` (dnd + filter) | Client | @dnd-kit + state |
| `CalendarioMensual` (drag-drop) | Client | @dnd-kit |
| `RubricaSemaforo` (drag-drop) | Client | @dnd-kit |
| `CatalogoPdaSelector` (async + filter) | Client | state + fetch |
| `AvisoPrivacidadModal` (form) | Client | form + accept |
| `ConalitegIframe` (iframe) | Server (render) | Sin estado |

### 5.4. Data fetching: Server Components + TanStack Query en client

- **Server Components:** fetch directo con Supabase server client. Cache con `unstable_cache` o `fetch` revalidate.
- **Client Components interactivas:** TanStack Query (QueryClientProvider en root layout) para data fetching post-hidration.
- **NO** usar SWR y TanStack Query a la vez (elegir uno; DEC-04-08).

### 5.5. Formularios

- `react-hook-form` + `zod` para validación client-side (espejo de JSON Schema server-side).
- Para formularios críticos (onboarding, crear planeación), usar **Server Actions** (React 19) además de validación client.

### 5.6. Iconografía

- `lucide-react` (incluido con shadcn/ui).
- Iconos siempre con texto adyacente (P-UX3).
- Tamaños canónicos: 16, 20, 24, 32.

---

## 6. ESTADO GLOBAL (Zustand)

### 6.1. Stores por dominio

```ts
// stores/usePlaneacionStore.ts
interface PlaneacionState {
  planeacionActiva: PlaneacionDto | null;
  cargando: boolean;
  error: string | null;
  // acciones
  setActiva: (p: PlaneacionDto | null) => void;
  patchActiva: (patch: Partial<PlaneacionDto>) => void;
}

export const usePlaneacionStore = create<PlaneacionState>()(
  persist(
    (set) => ({
      planeacionActiva: null,
      cargando: false,
      error: null,
      setActiva: (p) => set({ planeacionActiva: p }),
      patchActiva: (patch) =>
        set((s) => ({
          planeacionActiva: s.planeacionActiva
            ? { ...s.planeacionActiva, ...patch }
            : null,
        })),
    }),
    {
      name: "nem-planeacion-activa",
      storage: createIDBStorage("nem-db", "planeaciones"),
      partialize: (s) => ({ planeacionActiva: s.planeacionActiva }),
    }
  )
);
```

### 6.2. Persistencia IndexedDB

- Adapter `lib/persist-idb.ts` via `idb-keyval`.
- Stores persistidos: `planeacionActiva`, `inventarioAula`, `alumnosGrupo` (cuando offline).
- Stores NO persistidos: `useUiStore` (modales, toasts), estado efímero de forms.

### 6.3. Sincronización offline → online

- Cola en `services/offline/sync-queue.ts` (IndexedDB `outbox`).
- Cada mutación offline encola `{ endpoint, method, body, idempotency_key, created_at }`.
- Hook `usePWAOnline` escucha `navigator.onLine` → al reconectar, drena cola FIFO.
- Conflict resolution LWW (Last-Write-Wins) por `updated_at` + alerta UI si hay conflicto.

### 6.4. Selectores para performance

Usar `useShallow` de `zustand/react/shallow` para evitar re-renders innecesarios:

```tsx
const { planeacionActiva, patchActiva } = usePlaneacionStore(
  useShallow((s) => ({ planeacionActiva: s.planeacionActiva, patchActiva: s.patchActiva }))
);
```

---

## 7. GESTIÓN DE AUTENTICACIÓN (Supabase Auth Helpers)

### 7.1. Stack de auth

- `@supabase/ssr` (NO usar el deprecado `@supabase/auth-helpers-nextjs`).
- `@supabase/supabase-js` v2+.
- Cookies httpOnly para sesión server-side.

### 7.2. Clientes Supabase (3 entrypoints)

```ts
// lib/supabase/client.ts — browser client (Client Components)
"use client";
import { createBrowserClient } from "@supabase/ssr";
export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```ts
// lib/supabase/server.ts — server client (Server Components + Route Handlers)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}
```

```ts
// lib/supabase/middleware.ts — refresh session en every request
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(/* ... cookies from request/response ... */);
  await supabase.auth.getUser(); // refresh session
  return response;
}
```

### 7.3. Route groups

- `(auth)/` — páginas públicas (login, registro, OTP). Middleware permite acceso sin sesión.
- `(app)/` — páginas privadas. Middleware **redirige a /login si no hay sesión**.
- `/v/[entrega_id]` — pública, valida JWT del director (no Supabase Auth).

### 7.4. RLS helpers server-side

Todo Route Handler en `app/api/v1/...` debe:

1. Llamar `await supabaseServer().auth.getUser()`.
2. Si sin sesión → 401 `NEM_AUTH_UNAUTHORIZED`.
3. Obtener `cct` del usuario desde `auth.users` join.
4. Pasar `cct` al servicio; servicio filtra queries con `.eq('cct', cctId)` (doble defensa: RLS en BD + filtro explícito en query).

### 7.5. Logout

- Server Action `logout()` que llama `supabase.auth.signOut()` + limpia Zustand stores + redirige a `/login`.
- Invalida cookies via `cookies().delete('sb-...')`.

---

## 8. INTEGRACIÓN CON @dnd-kit

### 8.1. Paquetes

```json
"@dnd-kit/core": "^6.x",
"@dnd-kit/sortable": "^8.x",
"@dnd-kit/modifiers": "^7.x",
"@dnd-kit/utilities": "^3.x"
```

NO usar `react-dnd` (legacy) ni `react-beautiful-dnd` (deprecado).

### 8.2. Reglas UX mobile-first (SPEC §6.1)

| Regla | Implementación |
|---|---|
| `touch-action: none` en draggables | Inline `style={{ touchAction: 'none' }}` (no en className, issue Tailwind Feb 2025) |
| Botón "Agregar" como alternativa al drag | `<Button onClick={addToDay}>+ Agregar</Button>` junto al drag handle |
| Haptic feedback | `navigator.vibrate(20)` en `onDragStart` (con feature detection) |
| Soporte teclado (WCAG) | `KeyboardSensor` con `KeyboardCode.Space` para agarrar/soltar |
| Undo button | `<UndoButton />` visible 2 semanas post-acción, en `useUiStore.undoStack` |
| Drag handles | `<DragHandle>` con icono `⠿` (Lucide `GripVertical`) en cada item |

### 8.3. Setup canónico (Banco de Bloques)

```tsx
// components/planeaciones/BancoBloques.tsx (esqueleto, NO implementación completa)
"use client";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

export function BancoBloques({ bloques, onDragEnd }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableBloques items={bloques} />
      <DragOverlay>{/* render del item siendo arrastrado */}</DragOverlay>
    </DndContext>
  );
}
```

### 8.4. Dos contextos dnd separados

- **Banco → Lienzo (planeaciones):** arrastra bloque del catálogo M1 a la sesión. Droppable = sesión.
- **Alumno → Nivel (rúbrica):** arrastra alumno a nivel semáforo. Droppable = `NivelSemaforoDropzone`.

**Crítico:** NO anidar `DndContext`. Si ambos están en pantalla, usar **un solo `DndContext`** con IDs únicos por droppable y routing en `onDragEnd` por `over.data.current.type`.

---

## 9. MÓDULOS PRINCIPALES

### 9.1. Onboarding (D-FIN-4, ENT-003 D2)

- 5 pantallas + 1 opcional (paso 4.5 inventario).
- Wizard state en `useOnboardingStore` (persistido en sessionStorage, NO IndexedDB — no queremos medio onboarding robado).
- Validación por paso con zod schema.
- Step 2 (CCT): fetch a `services/catalogo/cct.ts` (catálogo SEP E15, cacheado).
- Step 5: persistir `aceptacion_aviso_privacidad` via `POST /api/v1/onboarding/aviso-privacidad/aceptar`.

### 9.2. Planeaciones (SPEC §3 Flujo A y B)

- **Wizard adaptativo** (D-FIN-6, P-PD5): estructura cambia por `modalidad`. MVP soporta `proyecto_comunitario` con 5 fases.
- **Banco lateral:** `BancoBloques` con catálogo M1 (E11 `/api/v1/catalogo/bloques`) + inventario aula (E21).
- **Calendario mensual** (M3): `CalendarioMensual` con código colores verde/amarillo/rojo/gris + resumen "qué te falta".
- **Edición post-entrega:** genera `version+1` (PATCH endpoint).

### 9.3. Catálogo (M1 bloques, D-FIN-1)

- `services/catalogo/bloques.ts` cachea en TanStack Query con `staleTime: Infinity` (catálogo cambia solo con release).
- Filtros client-side por `campo_formativo`, `tipo`, `modalidad`, `nivel_flexibilidad`.
- Search debounced 200ms.

### 9.4. Recursos-aula (E21)

- CRUD `services/recursos-aula/crud.ts`.
- **Cargar kit genérico** con 1 click: `POST /api/v1/recursos-aula/cargar-kit-generico`.
- **F-IA1 sugerir uso**: chip clickable (P-PD9) que llama `POST /api/v1/recursos-aula/:id/ia/sugerir-uso`.
- Matching semántico al arrastrar bloque: client-side en `lib/matching-semantico.ts` (algoritmo de score E21 §4.2).

### 9.5. Evaluación (D-FIN-2, D-FIN-3)

- `RubricaSemaforo` con 4 dropzones (🟢 🟡 🟠 🔴).
- `AlumnoDragItem` arrastrable a dropzone.
- Batch upsert via `POST /api/v1/planeaciones/:id/evaluaciones`.
- Historial por alumno: GET `planeaciones?include=evaluaciones` filtrado por `alumno_id`.

### 9.6. PDF-generation (D-FIN-5, SPEC §3.5)

- Server-side via Playwright headless en `lib/pdf/generate.ts`.
- Template HTML en `public/pdf-templates/planeacion-nem.html` con placeholders Mustache-like.
- Output: PDF subido a Supabase Storage bucket `pdfs/{cct}/{planeacion_id}/{version}.pdf`.
- Hash SHA-256 persistido en `entregas.pdf_sha256` para integridad.

### 9.7. PDF-viewer CONALITEG (D-FIN-10)

- **Online:** `ConalitegIframe` con `src` directo a `https://libros.conaliteg.gob.mx/2024/K{grado}{codigo}.htm`.
- **Offline:** `ConalitegPdfJs` con PDF.js + IndexedDB cache (solo libros del grado actual del docente).
- **Atribución obligatoria:** `AtribucionSep` visible ("Libro distribuido por CONALITEG, SEP. © Gobierno de México").
- URLs canónicas en `lib/constants.ts` (tabla D-FIN-10).

### 9.8. Entrega al director (D-FIN-5, D-FIN-19)

- `EntregarDirectorModal` captura `director_celular` (autocomplete si existe en BD por CCT).
- Llama `POST /api/v1/planeaciones/:id/entregar-director`.
- UI muestra: URL firmada (copy), QR (descarga), botón "Abrir WhatsApp" (usa `url_whatsapp` retornada).
- **No se envía WhatsApp automáticamente** (anti-feature).

---

## 10. CONFIGURACIÓN PWA

### 10.1. Plugin

- `next-pwa` (o `@ducanh2912/next-pwa` si next-pwa se rezaga).
- Configuración en `next.config.mjs`:
  ```js
  // esqueleto, no implementación
  import withPWAInit from "next-pwa";
  const withPWA = withPWAInit({
    dest: "public",
    register: true,
    disable: process.env.NODE_ENV === "development",
  });
  export default withPWA({ /* resto de config Next.js */ });
  ```

### 10.2. Manifest (`app/manifest.ts`)

```ts
// esqueleto
import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEM — Módulo Docente",
    short_name: "NEM Docente",
    description: "Planeación NEM para docentes mexicanos de preescolar.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1F8A4C", // verde NEM
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    orientation: "portrait",
  };
}
```

### 10.3. Service Worker

- Pre-cache: assets estáticos (CSS, JS, iconos, fonts).
- Runtime cache: `pages` (network-first con fallback cache), `api-catalogo` (stale-while-revalidate), `pdfs-conaliteg` (cache-first).
- NO cachear: `/api/v1/planeaciones/*` (datos frescos críticos), `/api/v1/ia/*` (sugerencias frescas).
- Bypass en dev (`disable: NODE_ENV === 'development'`).

### 10.4. IndexedDB

- DB name: `nem-db`.
- Object stores: `planeaciones-outbox` (cola sync), `inventario-aula`, `alumnos-grupo`, `pdfs-conaliteg`, `sugerencias-ia-cache`.
- Adapter Zustand: `lib/persist-idb.ts` (via `idb-keyval`).

### 10.5. Install prompt

- NO mostrar prompt automático (anti-friction P-UX2).
- Botón discreto "Instalar app" en Ajustes, solo si `beforeinstallprompt` event fired.
- iOS: instrucciones "Add to Home Screen" si detecta Safari iOS.

### 10.6. Offline detection

- Hook `usePWAOnline` escucha `online`/`offline` events + `navigator.onLine`.
- UI indicator en `Header`: "🔴 Sin conexión — cambios se guardan localmente".
- Al reconectar: drain `planeaciones-outbox` + toast "Sincronizado".

---

## 11. VARIABLES DE ENTORNO

### 11.1. `.env.example`

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # server-only, nunca en cliente
# Director URL firmada
JWT_SECRET=<32+ chars random>
# IA (D-FIN-13)
AI_PROVIDER=minimax
AI_API_KEY=...
AI_MODEL=minimax-m3
AI_BASE_URL=https://api.minimax.chat/v1
# Rate limiting (Upstash / Vercel KV)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
# PDF generation
PDF_SERVICE_URL=                            # si se externaliza; si no, local Playwright
# Sentry (auditoría errores)
SENTRY_DSN=...
# App
NEXT_PUBLIC_APP_URL=https://app.nem.mx
NEXT_PUBLIC_APP_ENV=development             # development | staging | production
```

### 11.2. Reglas

- Toda variable **client-expuesta** lleva prefijo `NEXT_PUBLIC_`.
- Toda variable **server-only** (service role, secrets IA, JWT director) NO lleva prefijo y se valida con un script `scripts/dev/check-env.ts` que falle build si falta.
- `.env.local` está en `.gitignore`.
- Vercel: variables inyectadas via dashboard (no via archivos).

---

## 12. CONFIGURACIÓN DE DESARROLLO

### 12.1. Scripts `package.json`

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint && tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "supabase:migrate": "supabase db push",
    "supabase:seed": "supabase db seed",
    "prepare": "husky install"
  }
}
```

### 12.2. Husky pre-commit

- `lint-staged`: prettier + eslint en archivos staged.
- `validate-migrations`: chequea que migraciones SQL tengan orden secuencial sin saltos.

### 12.3. VS Code settings (`.vscode/settings.json`)

- Format on save con Prettier.
- ESLint auto-fix on save.
- Tailwind CSS IntelliSense activado.
- Mermaid preview nativo (VSC 1.121+, sin extensiones de terceros — ver AGENTS.md global).

---

## 13. PALETA NEM (Tailwind config)

```ts
// tailwind.config.ts (extracto)
const config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paleta NEM (E17 §3.2 + D-FIN-3 naranja)
        nem: {
          verde: "#1F8A4C",          // Logrado sin apoyo
          amarillo: "#D4A017",       // Logrado con apoyo
          naranja: "#E07B00",        // Requiere apoyo constante (D-FIN-3)
          rojo: "#A02B2B",           // No logrado
          // Colores sistema
          primary: "#1F8A4C",
          background: "#ffffff",
          foreground: "#0a0a0a",
          muted: "#f5f5f5",
          border: "#e5e5e5",
        },
      },
      fontFamily: {
        // Sistema (P-UX決 sin fuente custom pesada en MVP)
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
};
```

**P-UX-regla:** tipografía del sistema, NO cargar fuente web custom en MVP (ahorro de bytes, FCP rápido).

---

## 14. DECISIONES PENDIENTES (REQUIEREN APROBACIÓN DE FRANK)

### PEND-04-01 — Zustand vs Jotai

**Estado:** propuesto Zustand (DEC-04-03). **Confirmar** con Frank o si prefiere Jotai (más atomic, peor DX para offline). Reabrir si hay opinión fuerte.

### PEND-04-02 — Command Palette (⌘K)

**Estado:** no incluido en MVP. `CommandPalette.tsx` queda comentado en árbol. **Confirmar** si se quiere como feature MVP (valor: navegación rápida para maestras con many planeaciones) o diferir a Fase 2.

### PEND-04-03 — TanStack Query vs SWR

**Estado:** propuesto TanStack Query (DEC-04-08 implícito). **Confirmar**; alternativa SWR es más ligera pero con menos features (mutations, optimistic updates).

### PEND-04-04 — Edge Functions Supabase

**Estado:** no se usan en MVP (DEC-04-07). Toda la lógica server-side vive en Next.js route handlers. **Confirmar**; alternativa sería migrar endpoints IA a Edge Functions (más cerca de la BD, menos cold start) pero aumenta acoplamiento a Supabase.

### PEND-04-05 — PDF generation en Vercel vs externo

**Estado:** Playwright headless en Vercel tiene límites (50s timeout function, 1024MB). Para PDFs pesados puede requerir servicio externo (Browserless, APITemplate). **Decisión** requiere input de Frank sobre costo vs simplicidad.

### PEND-04-06 — Husky pre-push

**Estado:** pre-commit sí, pre-push (corre tests + typecheck) **no** en MVP (más lento). **Confirmar** o activar si se prefiere safety over velocity.

### PEND-04-07 — Ubicación de `context/` y `.kilo/`

**Estado:** en raíz del repo (alineado a AGENTS.md global). **Confirmar** que se quieren commiteados o si deben estar en `.gitignore` (algunos equipos prefieren no commitear `.kilo/`).

### PEND-04-08 — Dark mode

**Estado:** soportado vía `class` strategy pero sin diseño completo de paleta dark en MVP. **Decisión:**¿dark mode en MVP o Fase 2? Recomendación: Fase 2 (no es diferenciador para Tía Lola, resta tiempo de diseño).

---

## 15. CRITERIOS DE ACEPTACIÓN (para GEMINI antes de DONE)

1. ✅ El árbol de carpetas §3 se crea sin desviaciones (salvo PEND aprobadas).
2. ✅ Todo archivo `.tsx`/`.ts` usa TypeScript strict, cero `any` sin justificación.
3. ✅ Todo componente interactivo tiene `"use client"` y justificación en comentario.
4. ✅ Stores Zustand usan `persist` solo para datos offline (no UI efímera).
5. ✅ Supabase clients son 3 (browser, server, middleware) — no hay cuarto ad-hoc.
6. ✅ @dnd-kit setup sigue reglas mobile-first §8.2 (touch-action, haptic, keyboard).
7. ✅ PWA manifest tiene icons 192, 512, maskable-512.
8. ✅ Service worker no cachea rutas `/api/v1/planeaciones/*` ni `/api/v1/ia/*`.
9. ✅ Variables de entorno server-only validadas en build.
10. ✅ Migraciones Supabase siguen orden secuencial 0001-0013.
11. ✅ PROYECTO.md se crea en raíz tras implementación (ver reporte INTEGRA).

---

## 16. RELACIÓN CON OTROS DOCUMENTOS

| Documento | Relación |
|---|---|
| `SPEC_TEC_03_API_Contract.md` | Define los route handlers que viven en `app/api/v1/...` |
| `SPEC_TEC_06_Plan_Testing.md` | Define estructura de `/tests` y patrones |
| `SPEC_MVP_01_Modulo_Docente.md` | SPEC funcional; este es su reflejo de proyecto |
| `E22_CIERRE_DISCOVERY.md` | D-FIN-11 a D-FIN-14 (stack) trazados |
| `E20_PRINCIPIOS_DISENNO_PRODUCTO.md` | P-PD1 a P-PD9 implementados en módulos |
| `E21_CATALOGO_RECURSOS_AULA.md` | Módulo `recursos-aula` + F-IA1 |

---

## 17. PRÓXIMOS PASOS

1. ⏳ Frank valida las 8 decisiones pendientes (PEND-04-01 a PEND-04-08).
2. ⏳ GEMINI audita este SPEC contra `SPEC_TEC_03` (consistencia estructura↔API).
3. ⏳ SOFIA inicializa repo: `pnpm create next-app`, instala deps, crea árbol §3, agrega shadcn/ui.
4. ⏳ SOFIA genera migraciones 0001-0013 con RLS.
5. ⏳ SOFIA implementa módulos en orden: onboarding → catalogo → planeaciones → recursos-aula → evaluacion → pdf-generation → pdf-viewer.
6. ⏳ Tests según `SPEC_TEC_06_Plan_Testing.md`.

---

**Fin del documento SPEC TEC 04.**
