# SPEC TEC 05 — Infraestructura y DevOps NEM

**ID:** ARCH-NOCTURNO-2026-08-16-INTEGRA-A / SPEC-TEC-05
**Versión:** 1.0
**Fecha:** 2026-08-16
**Estado:** ESPECIFICACIÓN TÉCNICA — production-ready
**Autor:** INTEGRA (delegación nocturna ARCH-NOCTURNO-2026-08-16-INTEGRA-A)
**Audiencia:** SOFIA (implementación de IaC/pipelines), GEMINI (auditoría infra), Frank (aprobación)

**Fuentes de verdad:**
- `Educacion/fuentes/E22_CIERRE_DISCOVERY.md` D-FIN-11 a D-FIN-14 (stack), D-FIN-18 (backup diferido)
- `Educacion/SPEC_MVP_01_Modulo_Docente.md` §6 (plataforma), §3.7.3 (configuración MiniMax), §3.7.6 (riesgos IA)
- `SPEC_TEC_01_Arquitectura.md` ADR-001 a ADR-012 + DP-01 a DP-08
- `SPEC_TEC_02_Modelo_Datos.md` §3 (extensiones), §7 (RLS)

> **Nota sobre implementación:** Esta SPEC **describe** la infraestructura objetivo. Los archivos de configuración de runtime (`Dockerfile`, manifests K8s, `.github/workflows/*.yml`, `terraform/*.tf`) son **código de infraestructura** que corresponde a SOFIA implementar (ver §14 política INTEGRA). Aquí se define el **qué** y el **cómo declarativo**; SOFIA genera los artefactos ejecutables.

---

## 1. PROPÓSITO Y ALCANCE

Esta SPEC define la **infraestructura y operaciones** de la plataforma NEM: entornos (dev/staging/prod), configuración Supabase y Vercel, variables de entorno, pipeline CI/CD, monitoreo, backups, disaster recovery y límites de escalabilidad esperados en el MVP.

**Es autocontenida:** un DevOps nuevo puede desplegar la plataforma leyendo este documento + `SPEC_TEC_01` + `SPEC_TEC_02`.

---

## 2. TOPOLOGÍA DE ENTORNOS

```mermaid
flowchart LR
    subgraph DEV["DEV (local + preview)"]
        DEV_LOCAL["Local<br/>next dev + Supabase CLI<br/>o Vercel preview"]
    end
    subgraph STAGING["STAGING"]
        ST_VERCEL["Vercel preview branch<br/>'staging'"]
        ST_SUPA["Supabase project staging"]
        ST_IA["MiniMax (mismo prod,<br/>keys separadas)"]
    end
    subgraph PROD["PROD"]
        P_VERCEL["Vercel prod<br/>dominio principal"]
        P_SUPA["Supabase project prod"]
        P_IA["MiniMax prod"]
    end

    DEV --> STAGING
    STAGING --> PROD
```

| Entorno | Propósito | Frontend | BD | IA |
|---------|-----------|----------|-----|-----|
| **DEV** | Desarrollo local del docente. Tests unitarios. Iteración rápida. | `next dev` (localhost:3000) | Supabase CLI local (`supabase start`, PostgreSQL en Docker) o Supabase project dev | MiniMax con key dev (cuota limitada) o mock |
| **STAGING** | Validación pre-prod. E2E con Playwright. Pruebas con Tía Lola. | Vercel preview branch `staging` | Supabase project staging (separado) | MiniMax con key staging |
| **PROD** | Usuarios reales (Tía Lola piloto). | Vercel prod (dominio principal) | Supabase project prod | MiniMax prod |

**Aislamiento de datos:** 3 proyectos Supabase separados (no 3 schemas del mismo project). Razón: si un bug en dev/staging corrompe BD, no afecta prod. Supabase free tier permite 2 projects; el tercero (prod) requiere plan Pro ($25/mes).

---

## 3. CONFIGURACIÓN SUPABASE POR ENTORNO

### 3.1 Parámetros comunes (todos los entornos)

| Parámetro | Valor |
|-----------|-------|
| Región | Definir por DP-02 (recomendado: `us-east-1` para latencia MX vía Vercel edge, o `sa-east-1` para compliance regional) |
| PostgreSQL version | 15.x (default Supabase al 2026-08) |
| Auth provider | Email + password (GoTrue). Magic link opcional. |
| Storage driver | S3-compatible (Supabase Storage) |
| Realtime | Habilitado para tablas: `planeacion`, `entrega`, `bitacora` |
| Extensions | `pgcrypto` (obligatorio), `pg_stat_statements` (opcional, monitoreo) |

### 3.2 Buckets de Storage

| Bucket | Privacidad | Path pattern | Contenido |
|--------|-----------|--------------|-----------|
| `planeaciones` | privado | `ccts/{cct}/planeaciones/{planeacion_id}/{version}.pdf` | PDFs generados por Playwright |
| `bitacora-evidencias` | privado | `ccts/{cct}/bitacoras/{fecha}/{uuid}.jpg` | Fotos del trabajo del niño (NO del niño) |
| `avatares-docente` | público (con RLS de path) | `docentes/{docente_id}/avatar.jpg` | Foto perfil docente (opcional) |

**ELIMINADO L2-10:** bucket `conaliteg-cache` removido. Regla dura cumplida: NO alojamos contenido CONALITEG. Los PDFs se cachean en **IndexedDB local del docente** (ADR-010) — el cliente descarga desde el portal CONALITEG cuando tiene internet y guarda localmente para uso offline. Si el docente quiere compartir referencia con un colega, usa el link público del portal.

**RLS de Storage:** cada bucket valida que el path contenga el CCT del usuario autenticado (igual que RLS de tablas). Ver §7.3 SPEC_02 para el patrón `user_cct()`.

### 3.3 Configuración por entorno

| Aspecto | DEV | STAGING | PROD |
|---------|-----|---------|------|
| Supabase plan | Free | Free | Pro ($25/mes) |
| Database size | 500MB | 500MB | 8GB (ampliable) |
| Auth users | 10k | 10k | 100k |
| Storage | 1GB | 1GB | 100GB |
| Backups | manuales | diarios (free tier: 7 días) | diarios + PITR (Pro) |
| Pausing | sí (inactividad 7 días) | sí | no (Pro no pausa) |
| service_role key | en `.env.local` | en Vercel env vars | en Vercel env vars + rotación 90 días |
| anon key | en `.env.local` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

### 3.4 Migraciones de schema

**Estrategia:** Supabase CLI (`supabase db push`) para aplicar migraciones desde `supabase/migrations/`. Cada migración es un archivo `.sql` versionado. El DDL de `SPEC_TEC_02` se divide en migraciones iniciales:

| Migración | Contenido | Origen |
|------------|-----------|--------|
| `0001_init_catalogo_nem.sql` | Grupo A §5.1 (10 tablas catálogo) + seed | SPEC_02 §5.1 + §10 |
| `0002_init_mundo_cct.sql` | Grupo B §5.2 (cct, escuela) + ETL seed parcial | SPEC_02 §5.2 |
| `0003_init_tenant_rls.sql` | Grupo C §5.3 (12 tablas tenant) + funciones helper | SPEC_02 §5.3 + §7.1 |
| `0004_triggers_indices.sql` | §6 triggers + §8 índices | SPEC_02 §6 + §8 |
| `0005_rls_policies.sql` | §7.2 + §7.3 policies | SPEC_02 §7 |
| `0006_constraints_checks.sql` | §9 constraints + trigger contrato NEM | SPEC_02 §9 |
| `0007_seed_catalogo_nem.sql` | §10 seed completo (90 registros) | SPEC_02 §10 |

**Orden de aplicación estricto.** SOFIA generará los archivos en `supabase/migrations/`.

---

## 4. VARIABLES DE ENTORNO

### 4.1 Convención

- Prefijo `NEXT_PUBLIC_` = expuesta al bundle del cliente (NO debe contener secrets).
- Sin prefijo = server-side only (Route Handlers, middleware).
- 3 archivos: `.env.local` (dev), `.env.staging`, `.env.production`. **NUNCA commitear `.env.production`** (gitignored).

### 4.2 Variables completas (28)

#### 4.2.1 Supabase (8)

| Variable | Entorno | Cliente/Servidor | Descripción |
|----------|---------|------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | dev/staging/prod | cliente+server | URL del project Supabase. Ej: `https://xxxxxxxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dev/staging/prod | cliente+server | Anon key (pública, RLS aplica). |
| `SUPABASE_SERVICE_ROLE_KEY` | dev/staging/prod | **server only** | service_role (bypass RLS). Solo para migraciones, ETL, operaciones admin. NUNCA en bundle. |
| `SUPABASE_DB_URL` | dev/staging/prod | server only | `postgresql://postgres:{password}@db.{project}.supabase.co:5432/postgres`. Para migraciones CLI y pg_dump. |
| `SUPABASE_PROJECT_REF` | dev/staging/prod | server only | ID del project (para Management API: backups, restart). |
| `SUPABASE_STORAGE_URL` | dev/staging/prod | cliente+server | `{SUPABASE_URL}/storage/v1` (default, derivable pero explícito para claridad). |
| `SUPABASE_DB_POOL_SIZE` | prod | server only | Tamaño del pool de conexiones (default 10). Ajustar según carga. |
| `SUPABASE_DB_SSL` | prod | server only | `require` (siempre true en prod). |

#### 4.2.2 IA / MiniMax (5)

| Variable | Entorno | Cliente/Servidor | Descripción |
|----------|---------|------------------|-------------|
| `AI_PROVIDER` | dev/staging/prod | server only | `minimax` (default) \| `openai` \| `anthropic` \| `together`. D-FIN-13. |
| `AI_API_KEY` | dev/staging/prod | **server only** | API key del proveedor. NUNCA en bundle cliente. |
| `AI_BASE_URL` | dev/staging/prod | server only | `https://api.minimax.chat/v1` (default). Cambiable por proveedor. |
| `AI_MODEL` | dev/staging/prod | server only | `minimax-m3` (default). Modelo a usar. |
| `AI_TIMEOUT_MS` | prod | server only | `8000` (default). Timeout antes de degradación graceful (ADR-012). |

#### 4.2.3 Aplicación Next.js (5)

| Variable | Entorno | Cliente/Servidor | Descripción |
|----------|---------|------------------|-------------|
| `NEXT_PUBLIC_APP_URL` | dev/staging/prod | cliente+server | URL canónica del app. `http://localhost:3000` (dev), `https://staging.{dominio}` o preview Vercel, `https://{dominio}` (prod). |
| `NEXT_PUBLIC_CATALOGO_VERSION` | dev/staging/prod | cliente+server | `PLAN_2022_ED_2025_FASE_2`. Versión del catálogo NEM cargado (para mostrar banner "catálogo versión X"). |
| `NODE_ENV` | todos | server only | `development` \| `production`. |
| `NEXT_PUBLIC_ENABLE_COMPARACION_MESES` | staging/prod | cliente+server | `false` (default OFF, SPEC §3.6.M3 T6). |
| `PDF_GENERATOR` | prod | server only | `playwright` (default) \| `puppeteer`. DP-01. |

#### 4.2.4 PDF y URLs firmadas (3)

| Variable | Entorno | Cliente/Servidor | Descripción |
|----------|---------|------------------|-------------|
| `PDF_URL_FIRMA_EXPIRA_DIAS` | prod | server only | `30` (default, D-FIN-5). Expiración JWT de URLs firmadas. |
| `JWT_SECRET` | prod | **server only** | Secreto para firmar JWT de URLs firmadas de entrega al director. Generar con `openssl rand -base64 32`. NUNCA commitear. |
| `PDF_STORAGE_BUCKET` | prod | server only | `planeaciones` (default). |

#### 4.2.5 WhatsApp / Director (2)

| Variable | Entorno | Cliente/Servidor | Descripción |
|----------|---------|------------------|-------------|
| `WHATSAPP_BUSINESS_API_TOKEN` | prod (si se usa OTP) | **server only** | Token de WhatsApp Business API (si DP-03 opción a/b). Vacío si solo deep link `wa.me` (DP-03 opción c). |
| `WHATSAPP_OTP_TEMPLATE_NAME` | prod | server only | Nombre del template aprobado por Meta para OTP (ej. `nem_otp_es`). |

#### 4.2.6 Monitoreo y errores (2)

| Variable | Entorno | Cliente/Servidor | Descripción |
|----------|---------|------------------|-------------|
| `SENTRY_DSN` | staging/prod | cliente+server | DSN de Sentry (DP-05). Cliente: errores frontend. Server: errores Route Handlers. |
| `SENTRY_AUTH_TOKEN` | prod | server only | Token para subir source maps a Sentry en build. |

#### 4.2.7 CI/CD (3)

| Variable | Entorno | Cliente/Servidor | Descripción |
|----------|---------|------------------|-------------|
| `VERCEL_TOKEN` | CI | server only (GitHub Actions secret) | Token para deploy desde CI. |
| `SUPABASE_ACCESS_TOKEN` | CI | server only (GitHub Actions secret) | Token de Supabase CLI para migraciones desde CI. |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | CI | server only | IDs del project Vercel para `vercel deploy`. |

**Total variables: 28** (8 Supabase + 5 IA + 5 Next.js + 3 PDF/JWT + 2 WhatsApp + 2 Sentry + 3 CI). De estas, **17 son server-only** (secrets), **11 son públicas** (NEXT_PUBLIC_* o no sensibles).

### 4.3 Validación de env vars en runtime

La app debe validar al arrancar (Route Handlers) que las variables críticas existen:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → si faltan, error de boot.
- `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` → si falta, features IA en degradación graceful (ADR-012) pero app arranca.
- `SUPABASE_SERVICE_ROLE_KEY` → si falta, migraciones ETL fallan (dev/staging). En prod, si falta, operaciones admin fallan.
- `JWT_SECRET` → si falta, generación de URLs firmadas falla (Flujo B/D). Bloqueante en prod.

---

## 5. CONFIGURACIÓN VERCEL

### 5.1 Build settings

| Setting | Valor |
|---------|-------|
| Framework preset | Next.js |
| Build command | `pnpm build` (o `npm run build`) |
| Output directory | `.next` (auto-detectado) |
| Install command | `pnpm install --frozen-lockfile` |
| Node version | 20.x (LTS) |
| Package manager | pnpm (preferido por velocidad + disk efficiency) |
| Function timeout (Route Handlers) | 10s default (plan hobby). DP-01: si PDF >10s, migrar a función dedicada. |
| Memory | 1024MB default (plan hobby). |

### 5.2 Environment variables en Vercel

Configurar las 17 server-only en Vercel Dashboard → Settings → Environment Variables, marcadas por entorno (Preview / Production). Las 11 `NEXT_PUBLIC_*` también en Vercel (las lee el build).

### 5.3 Domains

| Dominio | Entorno | Uso |
|---------|---------|-----|
| `{dominio-principal}` | Production | App prod (definir DP-07). |
| `staging.{dominio-principal}` | Staging | Branch `staging`. |
| `*.vercel.app` | Preview | Cada PR genera un subdominio preview. |

### 5.4 Headers

Headers de seguridad recomendados (CSP, HSTS, X-Frame-Options). **Esto es spec para SOFIA implementar en `next.config.js` o `vercel.json`:**

- `Content-Security-Policy`: permitir scripts self + Supabase + Vercel Analytics + Sentry. Bloquear inline eval (excepto dev).
- `X-Frame-Options`: `ALLOWALL` solo en ruta `/v/[entregaId]` (para iframe del director, D-FIN-5). Resto: `DENY`.
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains` en prod.
- `X-Content-Type-Options`: `nosniff`.
- `Referrer-Policy`: `strict-origin-when-cross-origin`.

### 5.5 Analytics

- Vercel Analytics habilitado (Core Web Vitals, T-UX5 p75 LCP < 1.5s).
- Speed Insights habilitado.

---

## 6. CI/CD PIPELINE (GitHub Actions)

> **Spec, no archivo `.yml`.** El workflow `.github/workflows/ci.yml` lo implementa SOFIA. Aquí se define el **qué**.

```mermaid
flowchart TB
    A[Push / PR a rama] --> B{¿rama?}
    B -->|cualquier rama| C[CI: lint + typecheck + unit tests]
    B -->|staging| D[CI + E2E Playwright + build]
    B -->|main| E[CI + E2E + deploy prod]

    C --> C1{¿pasa?}
    C1 -->|no| F[Bloquear PR]
    C1 -->|sí| G[OK, comentario en PR]

    D --> D1{¿pasa?}
    D1 -->|no| F
    D1 -->|sí| H[Deploy Vercel preview staging<br/>+ Supabase migrate staging]

    E --> E1{¿pasa?}
    E1 -->|no| F
    E1 -->|sí| I[Deploy Vercel prod<br/>+ Supabase migrate prod<br/>+ Sentry release]
```

### 6.1 Jobs del pipeline

**Job 1 — CI (cualquier rama):**
1. Checkout.
2. Setup pnpm + Node 20.
3. `pnpm install --frozen-lockfile`.
4. `pnpm typecheck` (tsc --noEmit).
5. `pnpm lint` (ESLint + Prettier check).
6. `pnpm test:unit` (Vitest o Jest).
7. Audit de deps (`pnpm audit --audit-level=moderate`).
8. Subir coverage a Codecov (opcional).

**Job 2 — E2E (rama staging y main, tras Job 1 verde):**
1. Levantar Supabase local via CLI (`supabase start`).
2. Aplicar migraciones (`supabase db push`).
3. Cargar seed catálogo NEM (migración 0007).
4. `pnpm build`.
5. `pnpm test:e2e` (Playwright) cubriendo:
   - Onboarding 5 pantallas.
   - Flujo A crear proyecto.
   - Flujo B calendarizar + exportar PDF.
   - Flujo C bitácora offline.
   - Flujo D director abre URL firmada.
   - **Test E2E de aislamiento RLS** (SPEC §6.2): docente CCT-A no ve entregas CCT-B.
   - T-UX2: viewport 360×640 usable.
6. Subir reporte Playwright + screenshots como artifact.

**Job 3 — Deploy staging (rama staging, tras Job 2 verde):**
1. `supabase db push --db-url $STAGING_DB_URL` (migraciones a Supabase staging).
2. `vercel deploy --prod=false --token $VERCEL_TOKEN --scope staging` (deploy preview Vercel).
3. Notificar URL preview en comentario del PR.

**Job 4 — Deploy prod (rama main, tras Job 2 verde + aprobación manual):**
1. `supabase db push --db-url $PROD_DB_URL` (migraciones a Supabase prod).
2. `vercel deploy --prod --token $VERCEL_TOKEN` (deploy prod Vercel).
3. `sentry-cli releases new $VERSION` + `sentry-cli releases set-commits` + `sentry-cli releases finalize` (release tracking).
4. Notificación push a Frank (notify_user) con resultado del deploy.

### 6.2 Gates y protecciones

| Gate | Mecanismo |
|------|-----------|
| No merge sin CI verde | Branch protection rule en GitHub: `Require status checks to pass before merging`. |
| Aprobación manual para prod | GitHub Environment `production` con `Required reviewers` = Frank. |
| No force-push a main/staging | Branch protection rule: `Do not allow bypassing`. |
| Secrets en GitHub Actions | Usar `secrets.*`, nunca hardcodeados. Rotación 90 días para `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`. |
| E2E obligatorio en staging/main | `Require status checks` incluye `e2e` job. |

### 6.3 Estrategia de branches

- `main` → prod. Solo merges vía PR aprobado.
- `staging` → staging. Merges desde `main` o hotfixes.
- Features en `feature/*` o `fix/*` → PRs a `main`.
- Hotfixes: `hotfix/*` → PR directo a `main` + cherry-pick a `staging`.

---

## 7. MONITOREO

### 7.1 Logs

| Origen | Destino | Retención | Consulta |
|--------|---------|-----------|----------|
| Vercel (Route Handlers, edge) | Vercel Logs nativos | 7 días (plan hobby) / 30 (Pro) | Dashboard Vercel |
| Supabase (PostgreSQL, Auth, Storage, Realtime) | Supabase Logs nativos (Logflare) | 7 días (free) / 30 (Pro) | Dashboard Supabase → Logs |
| Errores frontend (cliente) | Sentry | 30 días | Sentry dashboard |
| Errores backend (Route Handlers) | Sentry | 30 días | Sentry dashboard |
| Llamadas a MiniMax | Log estructurado en Route Handler → Sentry + Supabase | 30 días | Para auditoría de coste y compliance |

### 7.2 Errores

**Sentry** (DP-05) cubre:
- Excepciones no capturadas (frontend + backend).
- Source maps subidos en build (Job 4 prod) para stacktraces legibles.
- Alertas: email + integración opcional a Vercel/Slack.
- Rate limit de eventos para no exceder cuota gratuita (5k errores/mes).

**Tipos de errores a vigilar:**
- Errores RLS (PostgreSQL `new row violates row-level security policy`) → posible bug de policy. **Crítico.**
- Timeouts de MiniMax (>8s) → degradación. Alerta si >5% de llamadas en 1h.
- Fallos de generación PDF (Playwright) → si >1% en prod, investigar DP-01.
- Fallos de sync offline (conflictos no resueltos) → vigilar `bitacora.sync_estado='conflicto'`.

### 7.3 Métricas

| Métrica | Origen | Umbral MVP | Acción si excede |
|---------|--------|------------|-------------------|
| LCP p75 | Vercel Analytics | < 1.5s (T-UX5) | Investigar bundle, lazy load |
| LCP p95 | Vercel Analytics | < 3s | Crítico |
| Tiempo respuesta MiniMax p95 | Sentry / log Route Handler | < 3s | Cache, degradación |
| Latencia query PostgreSQL p95 | Supabase Logs | < 200ms | Índices (SPEC_02 §8), pool |
| Errores 5xx | Vercel + Sentry | < 0.5% requests | Investigar |
| Costo MiniMax mensual | Log de uso + estimación | < USD 30 (SPEC §7.3 criterio 24) | Rate limit, cache |
| % features IA en degradación | Log | < 5% sesiones | Monitor MiniMax, fallback |
| Sesgo de accesibilidad (axe-core) | Job E2E | 0 issues serious/critical | Corregir antes de merge |

### 7.4 Dashboard de observabilidad (spec para SOFIA)

Un dashboard simple (Vercel Analytics dashboard + Sentry dashboard + query Supabase) que muestre:
- LCP p75/p95 por día.
- Errores 5xx por día.
- Llamadas MiniMax por día + costo estimado.
- Queries PostgreSQL lentas (top 10, desde `pg_stat_statements`).
- % bitácoras sincronizadas vs pendientes (salud del offline-first).

---

## 8. BACKUPS Y DISASTER RECOVERY

### 8.1 Backups Supabase

| Entorno | Plan | Estrategia | Retención |
|---------|------|------------|-----------|
| DEV | Free | Manual: `supabase db dump` periódico | Local |
| STAGING | Free | Manual + diario automático (free tier) | 7 días |
| PROD | Pro ($25/mes) | Diario automático + PITR (Point-in-Time Recovery) | 7 días diarios + 30 días PITR |

**DP-06:** E22 D-FIN-18 diferió el backup automático a Fase 2. Para piloto con Tía Lola (<10 docentes), export JSON manual (botón "Exportar mis datos" D-FIN-18) + `pg_dump` cron es aceptable. Para >10 docentes, migrar a Pro con PITR.

### 8.2 Backup manual (MVP, piloto)

Cron diario (no automatizado en MVP, ejecutado por Frank o script):

```bash
# Espec de script (NO lo crea INTEGRA; SOFIA lo implementa como scripts/backup.sh):
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --file="backups/nem-prod-$(date +%Y%m%d).dump"
# Subir a storage externo (Backblaze B2, S3, o local NAS)
```

Retención: 30 días locales. Verificar restore mensual (test DR).

### 8.3 Disaster Recovery (DR)

| Escenario | RPO | RTO | Plan |
|-----------|-----|-----|------|
| Pérdida de fila accidental (docente borra planeación) | 0 (soft delete `activo=false`) | Inmediato | Reactivar `activo=true`. |
| Corrupción de tabla | 24h (backup diario) | 2h | Restore desde `pg_dump` o PITR. |
| Pérdida de project Supabase completo | 24h | 4h | Crear project nuevo, aplicar migraciones 0001-0007, restore datos. |
| Caída de Vercel | 0 (stateless frontend) | 30min | Vercel tiene multi-region fallback. App sin estado, BD sigue. |
| Caída de MiniMax | 0 (degradación graceful) | Inmediato | ADR-012: features IA muestran "no disponible", app sigue. |
| Caída de portal CONALITEG | 0 (PDF cacheado) | Inmediato | ADR-010: fallback a PDF.js con cache IndexedDB. |
| Fuga de `SUPABASE_SERVICE_ROLE_KEY` | — | Inmediato | Rotar key en Supabase Dashboard + Vercel env vars + GitHub secrets. Auditar accesos. |
| Fuga de `AI_API_KEY` | — | Inmediato | Rotar key en proveedor IA + Vercel + secrets. Auditar logs MiniMax. |
| Fuga de `JWT_SECRET` | — | 1h | Rotar `JWT_SECRET`. URLs firmadas existentes dejan de validar (regenerar). |

**RPO** = Recovery Point Objective (datos máximos perdibles). **RTO** = Recovery Time Objective (tiempo máx de recuperación).

### 8.4 Test DR

Cada release mayor (o mensual):
1. Restore del backup diario en un project Supabase sandbox.
2. Aplicar migraciones pendientes.
3. Ejecutar suite E2E contra el restore.
4. Verificar que el catálogo NEM (90 registros seed) está intacto.
5. Documentar tiempo de restore.

---

## 9. ESCALABILIDAD Y LÍMITES MVP

### 9.1 Límites esperados MVP (piloto Tía Lola)

| Recurso | Límite MVP | Plan upgrade |
|---------|------------|--------------|
| Docentes activos | 100 | Supabase Pro + Vercel Pro |
| Planeaciones/mes | 1000 | Verificar costo IA < USD 30 (SPEC §7.3) |
| Sesiones totales | 10k | OK con índices |
| Alumnos totales | 3000 (30 × 100) | OK |
| Entregas/mes | 400 | OK |
| Bitácoras/mes | 10k | OK, vigilar sync |
| PDFs generados/mes | 400 | Vigilar DP-01 (timeout Playwright) |
| Llamadas MiniMax/mes | 5000 | Rate limit 5/min/user + cache |
| Storage | 5GB | OK (PDFs ~500KB × 400 = 200MB; fotos bitácora ~500KB × 10k = 5GB) |
| Ancho de banda | 100GB/mes | OK para 100 docentes |
| Conexiones BD simultáneas | 60 (Supabase default) | Pooler Supabase (PgBouncer) |

### 9.2 Cuellos de botella conocidos

| Cuello | Síntoma | Mitigación |
|--------|---------|------------|
| Generación PDF en Vercel serverless | Timeout 10s si PDF NEM complejo | DP-01: validar con PDF real; si >10s, función dedicada o microservicio. |
| RLS con JOINs complejos | Query lenta en `sesion_recurso` (policy con EXISTS) | Índices en `sesion_id`, `cct`. Vigilar con `pg_stat_statements`. |
| Sync offline conflictos | `bitacora.sync_estado='conflicto'` acumula | Política last-write-wins + prompt al docente. |
| MiniMax rate limit | "IA no disponible" frecuente | Cache 30 días + queue. Si persiste, evaluar proveedor alterno (DP-08). |
| Catálogo CCT 414MB en query | Latencia autocomplete CCT | ETL materializa en tabla `cct` con índice en `clave`. No query al CSV en runtime. |

### 9.3 Plan de escalamiento (post-MVP, Fase 2)

| Trigger | Acción |
|---------|--------|
| >100 docentes | Supabase Pro + Vercel Pro + backup automático (DP-06 → Pro). |
| >1000 docentes | Read replicas Supabase. CDN para assets. |
| >10k planeaciones/mes | Particionamiento de `bitacora` y `evaluacion_alumno` por `ciclo_escolar`. |
| Multi-región (latencia) | Evaluar regiones Supabase + Vercel adicionales. |
| IA uso intensivo | Proveedor dedicado o self-hosted (LLaMA cuantizado, ADR R-IA2). |

---

## 10. SEGURIDAD OPERACIONAL

### 10.1 Gestión de secretos

| Secreto | Dónde vive | Rotación |
|---------|------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars + GitHub secrets (CI) | 90 días |
| `AI_API_KEY` | Vercel env vars + GitHub secrets | 90 días |
| `JWT_SECRET` | Vercel env vars | 180 días |
| `VERCEL_TOKEN` | GitHub secrets | 90 días |
| `SUPABASE_ACCESS_TOKEN` | GitHub secrets | 90 días |
| `SENTRY_AUTH_TOKEN` | GitHub secrets | 180 días |
| `WHATSAPP_BUSINESS_API_TOKEN` | Vercel env vars | 90 días (si DP-03 a/b) |

**Nunca** en código, ni en logs, ni en commits. `.env*` en `.gitignore` excepto `.env.example` (sin valores, solo keys).

### 10.2 Auditoría de acceso

| Acceso | Log | Revisión |
|--------|-----|----------|
| service_role en BD | Supabase Logs | Mensual: queries con service_role fuera de migraciones |
| Llamadas MiniMax | Route Handler → Sentry + Supabase | Mensual: verificar que ningún PII cruza (ADR-007) |
| Accesos a Storage | Supabase Logs | Mensual: accesos cross-CCT |
| Logins (Auth) | Supabase Auth logs | Semanal: logins fallidos anormales |

### 10.3 Compliance LFPDPPP (operacional)

| Requisito | Implementación |
|-----------|----------------|
| Aviso de privacidad (art. 27) | Tabla `aceptacion_aviso_privacidad` (D-FIN-15). Modal en primer login. |
| Base legal (art. 8/10) | Consentimiento expreso checkbox. Documentar excepción educativa si aplica. |
| Transferencia internacional IA (art. 36-38) | ADR-007 anonymizer + aviso IA explícito + consentimiento expreso. |
| Decisiones automatizadas (art. 76-78) | F1/F2/F3 son **sugerencia**, no decisión. La maestra decide (P-PD9). |
| ARCO (acceso, rectificación, cancelación, oposición) | Botón "Exportar mis datos" (D-FIN-18) + "Borrar mi cuenta" (soft delete). |
| Datos de menores | Solo nombre + grado + nivel logro. SIN salud, neurotipo, foto del niño. Regla dura. |

---

## 11. DECISIONES DE INFRA PENDIENTES (requieren aprobación de Frank)

Las decisiones DP-01 a DP-08 de `SPEC_TEC_01` aplican aquí también. Adicionales de infra:

| ID | Decisión | Opciones | Impacto |
|----|----------|----------|---------|
| DI-01 | Plan Supabase prod | (a) Free (pausa en inactividad, sin backups automáticos) · (b) Pro $25/mes (no pausa, backups diarios + PITR) | Para piloto Tía Lola (<10 docentes), (a) + backup manual cron es viable. Para >10, (b). Recomiendo arrancar con (a) y migrar al superar 10 docentes. |
| DI-02 | Plan Vercel prod | (a) Hobby (free, 100GB BW, función 10s timeout) · (b) Pro $20/mes (1TB BW, función 60s timeout, más RAM) | (a) viable para piloto. (b) necesario si DP-01 PDF >10s o si >100GB BW/mes. |
| DI-03 | Sentry plan | (a) Free (5k errores/mes) · (b) Team $26/mes (50k) | (a) para piloto. (b) si excede. |
| DI-04 | Herramienta E2E | (a) Playwright (recomendado, cross-browser, soporta PWA) · (b) Cypress (no soporta PWA/service worker tan bien) | Recomiendo (a) Playwright. |
| DI-05 | Secret management avanzado | (a) Vercel env vars + GitHub secrets (simple, MVP) · (b) Doppler/HashiCorp Vault (overkill MVP) | (a) para MVP. |
| DI-06 | CDN para assets estáticos | (a) Vercel edge (incluido) · (b) Cloudflare separado | (a) suficiente. |
| DI-07 | Status page público | (a) No en MVP (solo notificación a Frank) · (b) Statuspage / Upptime simple | (a) para piloto. (b) si >100 docentes. |
| DI-08 | Monitoreo de uptime | (a) Vercel Analytics nativo · (b) Better Stack / UptimeRobot ( checks HTTP cada 1min) | (a) para piloto. (b) si >50 docentes para alertar caídas. |

---

## 12. NO-OBJETIVOS DE INFRA (MVP)

- ❌ **No self-hosting** de Supabase/PostgreSQL en MVP (lock-in aceptado, mitigado con SQL estándar).
- ❌ **No Kubernetes** en MVP (Vercel + Supabase gestionados).
- ❌ **No Terraform/IaC completo** en MVP (configuración manual en Dashboards, documentada aquí). Fase 2: IaC.
- ❌ **No multi-region** en MVP (1 región Supabase + Vercel edge global).
- ❌ **No observabilidad distribuida completa** (OpenTelemetry, Jaeger) en MVP. Sentry + Vercel + Supabase logs bastan.
- ❌ **No feature flags service** (LaunchDarkly) en MVP. Variables de entorno.
- ❌ **No APM dedicado** (New Relic, Datadog) en MVP. Sentry + dashboards nativos.

---

## 13. CRITERIOS DE ACEPTACIÓN DE ESTA SPEC

- [x] Topología de 3 entornos (dev/staging/prod) definida.
- [x] Configuración Supabase por entorno (planes, buckets, migraciones).
- [x] 28 variables de entorno documentadas (17 server-only, 11 públicas).
- [x] Configuración Vercel (build, domains, headers, analytics).
- [x] Pipeline CI/CD con 4 jobs (CI, E2E, deploy staging, deploy prod) + gates.
- [x] Monitoreo (logs, errores, métricas con umbrales MVP).
- [x] Backups y DR con RPO/RTO por escenario.
- [x] Escalabilidad y límites MVP (100 docentes, 1000 planeaciones/mes).
- [x] Seguridad operacional (gestión de secretos, auditoría, compliance LFPDPPP).
- [x] Decisiones de infra pendientes (DI-01 a DI-08) con opciones.
- [x] Autocontenida (glosario implícito + referencias a SPEC_01/02).

---

## 14. RELACIÓN CON OTROS DOCUMENTOS

| Documento | Relación |
|-----------|----------|
| `SPEC_TEC_01_Arquitectura.md` | ADRs y DP-01 a DP-08 referencedos aquí. |
| `SPEC_TEC_02_Modelo_Datos.md` | DDL y RLS aplicados via migraciones §3.4. |
| `SPEC_MVP_01_Modulo_Docente.md` | Criterios §7.1 (costo < USD 50/mes con 100 docentes) verificados en §9.1. |
| `fuentes/E22_CIERRE_DISCOVERY.md` | D-FIN-11 a D-FIN-14 (stack), D-FIN-18 (backup diferido). |

---

**Fin de SPEC TEC 05.**
