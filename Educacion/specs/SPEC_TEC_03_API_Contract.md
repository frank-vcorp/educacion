# SPEC TEC 03 — Contrato de API (NEM Módulo Docente)

**ID:** ARCH-NOCTURNO-2026-08-16-INTEGRA-B
**Versión:** 1.0.0
**Fecha:** 2026-08-16
**Estado:** ESPECIFICACIÓN TÉCNICA LISTA PARA IMPLEMENTACIÓN
**Autor:** INTEGRA (orquestación nocturna)
**Alinea con:** `SPEC_MVP_01_Modulo_Docente.md` v0.13, `E22_CIERRE_DISCOVERY.md` v1.1 (D-FIN-1 a D-FIN-19), `E20_PRINCIPIOS_DISENNO_PRODUCTO.md` v0.2 (P-PD1 a P-PD9), `E21_CATALOGO_RECURSOS_AULA.md` v0.1, `ENT-003_DECISIONES_MVP.md`

**Consumidor destino:** SOFIA (implementación), GEMINI (auditoría), Frank (revisión).
**Stack de referencia:** Next.js 14+ App Router + Supabase (Postgres + Auth + Storage + Realtime) + Vercel.

---

## 0. CÓMO LEER ESTE DOCUMENTO

- Todo bloque de código etiquetado ```` ```json-schema ```` contiene un **JSON Schema Draft 2020-12 válido y parseable** (validable con `ajv`). No usar variantes inventadas.
- Todo bloque etiquetado ```` ```http ```` muestra un ejemplo de intercambio HTTP (request/response).
- Los identificadores `DEC-03-NN` son decisiones arquitectónicas trazables; `PEND-03-NN` son decisiones pendientes que requieren aprobación de Frank antes de implementar.
- Los `code` de error siguen el formato `NEM_<DOMINIO>_<CAUSA>` para permitir routing de i18n en el frontend sin ambigüedad.

---

## 1. PROPÓSITO Y ALCANCE

Contrato público de la API HTTP del Módulo Docente (MVP). Define endpoints, payloads, autenticación, autorización (RLS por CCT), manejo de errores, rate limiting y versionado.

**Fuera de alcance (diferido a Fase 2):**

- API pública para terceros (marketplace de bloques, D-DIF-5).
- GraphQL (ver DEC-03-01).
- Webhooks salientes a sistemas externos (solo Supabase Realtime en MVP).
- API del Módulo Director (E2, UX pendiente de validación). El director consume **URL firmada de solo lectura** sin API propia.

---

## 2. DECISIONES ARQUITECTÓNICAS DE LA API

### DEC-03-01 — REST primario; GraphQL diferido a Fase 2

**Decisión:** La API pública del MVP es **REST** sobre Next.js App Router route handlers (`app/api/<recurso>/route.ts`). No se expone endpoint GraphQL en MVP.

**Justificación:**

| Factor | REST | GraphQL |
|---|---|---|
| Consumidores en MVP | 1 app Next.js + 1 portal director URL firmada (HTML, no API) | — |
| Complejidad operativa | Baja (route handlers nativos) | Alta (servidor Apollo + schema + resolvers + caching granular) |
| RLS por CCT | Natural: filtrado server-side por `auth.uid()` | Requiere directivas `@auth` + complexidad |
| Caché HTTP | Nativa (CDN/Vercel) | Requiere `@cacheControl` manual |
| Acoplamiento con Supabase | Directo (cliente server) | Necesita capa intermedia |
| Tiempo de implementación | Aceptable para MVP | Over-engineering |

**Revisión obligatoria Fase 2:** cuando existan ≥2 consumidores con necesidades de agregación dispar (app móvil + marketplace de bloques), reabrir GraphQL como `SPEC_TEC_03b_GraphQL.md`.

### DEC-03-02 — Next.js Route Handlers, no Server Actions exclusivas

**Decisión:** Toda mutación y lectura pública vive en `app/api/v1/**/route.ts`. Las Server Actions de React 19 se usan **solo** para formularios optimistas internos de la app (ej: onboarding), no como API pública.

**Justificación:** separar "API pública versionada" de "acciones internas del form" permite que GEMINI audite contrato estable sin perseguir Server Actions dispersas.

### DEC-03-03 — Respuesta envolvente canónica

Toda respuesta exitosa usa el envoltorio:

```json
{
  "data": { /* payload */ },
  "meta": {
    "requestId": "req_01H8...",
    "timestamp": "2026-08-16T07:49:41Z",
    "version": "v1"
  }
}
```

Toda respuesta de error usa:

```json
{
  "error": {
    "code": "NEM_PLANEACIONES_VALIDATION_ERROR",
    "message": "Mensaje legible para humanos (es-MX).",
    "details": [ /* opcional, array de errores de campo */ ],
    "requestId": "req_01H8...",
    "docs": "https://docs.nem.mx/errors/NEM_PLANEACIONES_VALIDATION_ERROR"
  }
}
```

**`requestId`** es obligatorio en ambos casos. Se propaga como header `X-Request-Id`. Permite a DEBY trazar bugs en logs.

### DEC-03-04 — Versionado por path

- Base path: `/api/v1/...`
- Breaking changes → `/api/v2/...` (no se mezclan en el mismo path).
- Non-breaking (añadir campos opcionales, nuevos endpoints) no suben versión.
- Deprecación: header `Sunset` + `Deprecation` (RFC 8594 y draft-ietf-httpapi-deprecation-header) con 6 meses de solapamiento mínimo.

---

## 3. AUTENTICACIÓN Y AUTORIZACIÓN

### 3.1. Modelo de autenticación

| Flujo | Mecanismo | Audiencia |
|---|---|---|
| Docente (app) | Supabase Auth: email + password + magic link. Sesión server-side vía `@supabase/ssr`. JWT en cookie httpOnly `sb-...`. | Maestras (Tía Lola y pares) |
| Director (URL firmada) | JWT firmado por el backend con `sub: entrega_id`, `exp` (default 30 días, configurable D-FIN-5), scope `director:view`. **No requiere registro ni Supabase Auth.** | Director (sin cuenta) |
| Director registrado | Supabase Auth con OTP WhatsApp (D-FIN-19, T27-T32). Misma cookie que docente. | Director con cuenta |
| Service-to-service (IA, cron) | `service_role` key Supabase en variables de entorno. **Nunca en cliente.** | Backend interno |

**Regla dura (P-PD9 + D-FIN-13):** ninguna llamada a MiniMax desde el navegador. Todas las features IA (F1, F2, F3, F-IA1) son **server-side**, detrás de endpoints `/api/v1/.../ia/...` que aplican `ia_anonymizer` antes de cualquier solicitud externa.

### 3.2. Autorización por RLS (Row-Level Security) por CCT

**Principio (D-FIN-12, SPEC §6.2):** cada escuela es un tenant lógico. Toda tabla que contiene datos del docente lleva `cct TEXT NOT NULL`. RLS en Postgres filtra por `auth.uid() → users.cct`.

**Tablas sujetas a RLS:**

| Tabla | Columna tenant | Política |
|---|---|---|
| `docente` | `cct` | SELECT/UPDATE solo si `cct = current_user_cct_clave` |
| `grupo` | `cct` | Igual |
| `alumno` | `cct` (vía `grupo`) | Igual |
| `planeacion` | `cct` | Igual |
| `sesion` | `cct` (vía `planeacion`) | Igual |
| `evaluacion_alumno` | `cct` (vía `planeacion`) | Igual |
| `recurso_aula` | `docente_id` (dentro del CCT) | Igual |
| `entrega` | `cct` (vía `planeacion`) | Igual |
| `bitacora` | `cct` (vía `sesion`) | Igual |
| `aceptacion_aviso_privacidad` | `docente_id` | SELECT propio; INSERT propio |

**Catálogos NEM (`pda`, `campo_formativo`, `eje_articulador`, `bloque_catalogo`):** sin RLS, lectura pública, sin `cct` (son del DOF, no datos de tenant).

**Test de aislamiento obligatorio (ver SPEC_TEC_06):** E2E `rls-cross-cct.spec.ts` — maestra de CCT-A intenta leer `GET /api/v1/planeaciones/:id` de CCT-B → **403 NEM_AUTH_RLS_VIOLATION**.

### 3.3. Endpoint de URL firmada del director (D-FIN-5, D-FIN-19)

No es API REST sino **ruta pública** que renderiza HTML (no JSON):

```
GET /v/<entrega_id>?token=<jwt_director>
```

- Valida `exp` del JWT. Si vencido → página estática "Link vencido, pide a la maestra reenviar".
- Si válido → render HTML con: header (maestra, escuela, CCT, timestamp), PDF embebido, resumen curricular, acciones "Marcar recibida" + "Comentario libre" (sin registro).
- Acción "Marcar recibida" persiste via `POST /api/v1/entregas/:entrega_id/marcar-recibida` con el mismo JWT del director como Bearer.

> **⚠️ Nota de desviación (D-FIN-5):** la mención "PDF embebido" describe el contrato objetivo. En el MVP desplegado, `/v/[entrega_id]` renderiza **HTML** (no un `.pdf` binario embebido vía iframe/PDF.js). La generación binaria está diferida — ver la nota de desviación en §6.7 y `specs/AUDITORIA_INTEGRA_ADDENDUM_2026-08-18.md` §1. El requisito funcional "Descargable binario" (D-FIN-5) **no se cumple como binario** en el estado actual.

---

## 4. CONVENCIONES

### 4.1. Naming

- Recursos: plural, kebab-case: `/planeaciones`, `/recursos-aula`, `/campos-formativos`.
- IDs: UUID v4 en path (`:id`), prefijado cuando ayuda al routing (`:entrega_id`, `:alumno_id`).
- Query params: snake_case para alinear con Postgres/Supabase: `?page=1&page_size=20&sort=created_at:desc&filtro_grupo_id=...`.
- Body: camelCase JSON (alineado a TypeScript convención del frontend).

### 4.2. Paginación

- Cursor-based para listas grandes (`/planeaciones`, `/alumnos`, `/recursos-aula`):
  ```json
  "meta": {
    "cursor": "eyJpZCI6IjAxSDgifQ==",
    "hasNext": true,
    "pageSize": 20
  }
  ```
- Offset-based tolerado solo para endpoints administrativos internos (no en API pública v1).

### 4.3. Idempotencia

Toda mutación `POST`/`PATCH` acepta header opcional `Idempotency-Key: <uuid>`. El backend lo guarda en tabla `idempotency_keys(cct, key, response_hash, expires_at)` con TTL 24h. Repetir misma key dentro de TTL → misma respuesta.

**Crítico para:** `POST /planeaciones` (doble-clic accidental), `POST /planeaciones/:id/entregar-director` (evita generar 2 URLs firmadas).

### 4.4. Content-Type y charset

- Request: `Content-Type: application/json; charset=utf-8`.
- Response: `Content-Type: application/json; charset=utf-8`.
- Errores de upload de archivos: `multipart/form-data` (solo fotos de bitácora, ver §6.5).

---

## 5. CATÁLOGO DE ENDPOINTS (RESUMEN)

| # | Método | Path | Auth | Descripción |
|---|---|---|---|---|
| E1 | POST | `/api/v1/planeaciones` | Docente | Crear planeación |
| E2 | GET | `/api/v1/planeaciones/:id` | Docente (RLS) | Obtener planeación por id |
| E3 | GET | `/api/v1/planeaciones` | Docente | Listar planeaciones (cursor) |
| E4 | PATCH | `/api/v1/planeaciones/:id` | Docente (RLS) | Editar planeación |
| E5 | DELETE | `/api/v1/planeaciones/:id` | Docente (RLS) | Eliminar planeación (soft delete) |
| E6 | POST | `/api/v1/planeaciones/:id/duplicar` | Docente (RLS) | Clonar a otro grupo (D-FIN-17) |
| E7 | POST | `/api/v1/planeaciones/:id/entregar-director` | Docente (RLS) | Generar URL firmada + WhatsApp (D-FIN-5, D-FIN-19) |
| E8 | GET | `/api/v1/catalogo/pda` | Docente | Catálogo NEM de PDA |
| E9 | GET | `/api/v1/catalogo/campos-formativos` | Docente | 4 campos formativos oficiales |
| E10 | GET | `/api/v1/catalogo/ejes` | Docente | 7 ejes articuladores oficiales |
| E11 | GET | `/api/v1/catalogo/bloques` | Docente | Catálogo M1 de bloques arrastrables (D-FIN-1) |
| E12 | POST | `/api/v1/planeaciones/:id/evaluaciones` | Docente (RLS) | Registrar rúbrica semáforo por alumno (D-FIN-2, D-FIN-3) |
| E13 | POST | `/api/v1/alumnos` | Docente (RLS) | Crear alumno |
| E14 | GET | `/api/v1/alumnos` | Docente (RLS) | Listar alumnos (con filtro grupo) |
| E15 | GET | `/api/v1/alumnos/:id` | Docente (RLS) | Obtener alumno |
| E16 | PATCH | `/api/v1/alumnos/:id` | Docente (RLS) | Editar alumno |
| E17 | DELETE | `/api/v1/alumnos/:id` | Docente (RLS) | Soft-delete alumno |
| E18 | POST | `/api/v1/recursos-aula` | Docente (RLS) | Crear recurso del aula (E21) |
| E19 | GET | `/api/v1/recursos-aula` | Docente (RLS) | Listar inventario |
| E20 | GET | `/api/v1/recursos-aula/:id` | Docente (RLS) | Obtener recurso |
| E21 | PATCH | `/api/v1/recursos-aula/:id` | Docente (RLS) | Editar recurso |
| E22 | DELETE | `/api/v1/recursos-aula/:id` | Docente (RLS) | Soft-delete recurso |
| E23 | POST | `/api/v1/recursos-aula/:id/ia/sugerir-uso` | Docente (RLS) | F-IA1: sugerir uso del recurso con MiniMax (E21 §3.3.1) |
| E24 | POST | `/api/planeaciones/:id/ia/variantes-bloque` | Docente (RLS) | F1: variantes de bloque por contexto |
| E25 | POST | `/api/planeaciones/:id/ia/help-redaccion` | Docente (RLS) | F2: help-in-line redacción |
| E26 | POST | `/api/planeaciones/:id/ia/pulir-pdf` | Docente (RLS) | F3: pulido final PDF |
| E27 | POST | `/api/v1/onboarding/aviso-privacidad/aceptar` | Docente | Persistir aceptación LFPDPPP (D-FIN-15) |
| E28 | POST | `/api/v1/entregas/:entrega_id/marcar-recibida` | Director (JWT URL firmada) | Director marca recibida sin registro |
| E29 | POST | `/api/v1/entregas/:entrega_id/comentario` | Director (JWT URL firmada) | Director deja comentario sin registro |
| E30 | GET | `/api/planeaciones/:id/generar-pdf` | Docente (RLS) | Descargar PDF binario (D-FIN-5 "Descargable") |
| E31 | POST | `/api/planeaciones/ia/contexto-problema` | Docente | F0: IA contextualizada por modalidad en el paso inicial del wizard (`ARCH-20260820-03` / `SPEC_TEC_10`) |

**Total: 31 endpoints** (los 11 explícitamente pedidos por Frank + 20 necesarios para CRUD completo, catálogo M1 de bloques, features IA F0/F1/F2/F3/F-IA1, aceptación aviso privacidad, acciones del director y descarga PDF binaria D-FIN-5).

> **Nota sobre E30 (ruta sin `/api/v1/`):** el endpoint de descarga binaria vive en `/api/planeaciones/:id/generar-pdf` (sin prefijo `v1`) para coincidir con la ruta ya implementada (`app/api/planeaciones/[id]/generar-pdf/route.ts`) y referenciada por `entrega-actions.ts` (`doc_pdf_url`). No es un contrato REST JSON versionado, sino una **descarga binaria** (no envolvente `data/meta`). La ausencia del prefijo `v1` es una excepción documentada, no una omisión; el resto de endpoints JSON siguen DEC-03-04 (`/api/v1/`).

**Justificación de los 18 añadidos:** Frank pidió "POST /api/alumnos (CRUD)" y "POST /api/recursos-aula (CRUD con F-IA1)". CRUD implica GET/PATCH/DELETE además de POST. Documentar solo POST dejaría contrato incompleto para SOFIA y rompería SPEC testeable (§16.2 regla 7). Los endpoints IA son necesarios porque P-PD9 exige que toda IA sea server-side; sin endpoint público, el frontend no puede invocarlas y la regla dura se rompe.

---

## 6. DETALLE DE ENDPOINTS

### 6.1. POST /api/v1/planeaciones — Crear planeación

**Auth:** Docente autenticado. `cct` se toma de la sesión, no del body (anti-tampering).

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/planeacion-create.json",
  "title": "PlaneacionCreate",
  "type": "object",
  "additionalProperties": false,
  "required": ["grupo_id", "modalidad", "nombre", "periodo"],
  "properties": {
    "grupo_id": {
      "type": "string",
      "format": "uuid",
      "description": "UUID del grupo destino. Debe pertenecer al CCT del docente."
    },
    "modalidad": {
      "type": "string",
      "enum": ["proyecto_comunitario", "unidad_didactica", "abj", "rincones", "centros_interes", "taller_critico"],
      "description": "Modalidad pedagógica NEM. MVP soporta solo 'proyecto_comunitario'; el resto valida pero genera wizard base."
    },
    "nombre": {
      "type": "string",
      "minLength": 3,
      "maxLength": 200,
      "description": "Nombre del proyecto/situación."
    },
    "periodo": {
      "type": "object",
      "additionalProperties": false,
      "required": ["tipo", "inicio", "fin"],
      "properties": {
        "tipo": { "type": "string", "enum": ["rango_fechas", "mensual", "trimestral", "semestral"] },
        "inicio": { "type": "string", "format": "date" },
        "fin": { "type": "string", "format": "date" }
      }
    },
    "problema_contexto": {
      "type": "string",
      "minLength": 10,
      "maxLength": 1000,
      "description": "Problema del contexto (M2). Validado no-vacío y con verbo de acción al exportar PDF."
    },
    "proposito": { "type": "string", "maxLength": 500 },
    "campos_formativos_ids": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "IDs de catálogo. Mínimo 1 en preescolar; SPEC §3.5 recomienda ≥2 en primaria/sec."
    },
    "ejes_ids": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "pda_ids": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "PDA oficiales del catálogo. Regla dura: nunca inventados por IA."
    },
    "producto_integrador": { "type": "string", "maxLength": 500 },
    "ajustes_razonables": { "type": "string", "maxLength": 1000 },
    "contenido_ref": { "type": "string", "maxLength": 200 },
    "banco_palabras": {
      "type": "array",
      "items": { "type": "string", "maxLength": 60 },
      "maxItems": 10,
      "description": "D-FIN-7: solo aplica si modalidad=unidad_didactica."
    }
  }
}
```

**Response 201:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/planeacion-response.json",
  "title": "PlaneacionResponse",
  "type": "object",
  "required": ["data", "meta"],
  "properties": {
    "data": {
      "type": "object",
      "required": ["id", "grupo_id", "modalidad", "nombre", "estado", "created_at"],
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "grupo_id": { "type": "string", "format": "uuid" },
        "modalidad": { "type": "string" },
        "nombre": { "type": "string" },
        "estado": { "type": "string", "enum": ["borrador", "lista", "entregada", "archivada"] },
        "version": { "type": "integer", "minimum": 1 },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" }
      }
    },
    "meta": { "$ref": "https://nem.mx/schemas/v1/meta.json" }
  }
}
```

**Errores específicos:**

| HTTP | code | Causa |
|---|---|---|
| 400 | `NEM_PLANEACIONES_VALIDATION_ERROR` | Body no valida schema |
| 403 | `NEM_AUTH_RLS_VIOLATION` | `grupo_id` no pertenece al CCT del docente |
| 409 | `NEM_PLANEACIONES_DUPLICATE_NAME_PERIOD` | Ya existe planeación con mismo nombre+periodo+grupo |
| 422 | `NEM_PLANEACIONES_PDA_INVALIDO` | `pda_ids` contiene ID no presente en catálogo oficial |
| 429 | `NEM_RATE_LIMIT_EXCEEDED` | Ver §7 |

**Ejemplo:**

```http
POST /api/v1/planeaciones HTTP/1.1
Host: app.nem.mx
Content-Type: application/json; charset=utf-8
Idempotency-Key: 9c4f3a2e-7b8d-4f1a-9e6c-2b3a4c5d6e7f
Cookie: sb-...=<jwt>

{
  "grupo_id": "01H8X9F2K3M4N5P6Q7R8S9T0V1",
  "modalidad": "proyecto_comunitario",
  "nombre": "Manifiesta tus emociones",
  "periodo": { "tipo": "mensual", "inicio": "2026-09-01", "fin": "2026-09-30" },
  "problema_contexto": "Los niños del grupo no saben nombrar lo que sienten durante los conflictos del recreo.",
  "campos_formativos_ids": ["LO_HUMANO_LO_COMUNITARIO"],
  "ejes_ids": ["INCLUSION"],
  "pda_ids": ["PDA-F2-DHUC-007"],
  "producto_integrador": "Frasco de la calma colectivo"
}

HTTP/1.1 201 Created
X-Request-Id: req_01H8X9F2K3M4N5P6Q7R8S9T0V1
Content-Type: application/json; charset=utf-8

{
  "data": {
    "id": "01H8X9F2K3M4N5P6Q7R8S9T0V2",
    "grupo_id": "01H8X9F2K3M4N5P6Q7R8S9T0V1",
    "modalidad": "proyecto_comunitario",
    "nombre": "Manifiesta tus emociones",
    "estado": "borrador",
    "version": 1,
    "created_at": "2026-08-16T07:49:41Z",
    "updated_at": "2026-08-16T07:49:41Z"
  },
  "meta": { "requestId": "req_01H8...", "timestamp": "2026-08-16T07:49:41Z", "version": "v1" }
}
```

### 6.2. GET /api/v1/planeaciones/:id — Obtener planeación

**Auth:** Docente autenticado + RLS valida `cct` de la planeación = `cct` del docente.

**Query params:**

- `include=sesiones,bloques,evaluaciones` — inclusiones opcionales (comma-separated).
- `version=2` — obtener versión específica (default: última).

**Response 200:** esquema `PlaneacionFull` (idéntico a `PlaneacionResponse` + propiedades opcionales `sesiones`, `bloques`, `evaluaciones`, `entregas`).

**Errores:** 404 `NEM_PLANEACIONES_NOT_FOUND`, 403 `NEM_AUTH_RLS_VIOLATION`.

### 6.3. GET /api/v1/planeaciones — Listar

**Query params:**

- `cursor` (string, opaque)
- `page_size` (int, default 20, max 50)
- `grupo_id` (uuid, filtro)
- `estado` (enum)
- `sort` (string, formato `campo:direccion`, default `created_at:desc`)
- `periodo_inicio` / `periodo_fin` (date, filtro rango)

**Response 200:** `{ data: [PlaneacionSummary], meta: { cursor, hasNext, pageSize, totalApprox } }`.

### 6.4. PATCH /api/v1/planeaciones/:id — Editar

**Reglas de edición (D-FIN-5, M5 §3.6):**

- Estado `entregada`: cada edición genera nueva versión (v+1). La versión anterior queda accesible via `?version=N`.
- Estado `archivada`: 409 `NEM_PLANEACIONES_ARCHIVED`.
- Campos inmutables post-`entregada`: `modalidad`, `grupo_id` (mover a otro grupo requiere `duplicar`).

**Request body:** subset de `PlaneacionCreate` (todos los campos opcionales). Se aplica JSON Merge Patch (RFC 7386) parcial: arrays se reemplazan, no se mergean (anti-conflictos en arrastrar/soltar bloques).

**Response 200:** `PlaneacionResponse` con `version` incrementada si corresponde.

### 6.5. DELETE /api/v1/planeaciones/:id — Soft delete

**Comportamiento:** marca `activo=false`, `deleted_at=now()`. No borra físicamente (trazabilidad pedagógica + LFPDPPP art. 22 ARCO). Solo el docente dueño puede eliminar.

**Response 204 No Content** (sin body, solo `X-Request-Id`).

### 6.6. POST /api/v1/planeaciones/:id/duplicar — Clonar (D-FIN-17)

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/planeacion-duplicar.json",
  "title": "PlaneacionDuplicar",
  "type": "object",
  "additionalProperties": false,
  "required": ["grupo_destino_id"],
  "properties": {
    "grupo_destino_id": {
      "type": "string",
      "format": "uuid",
      "description": "Grupo destino (puede ser el mismo u otro del docente)."
    },
    "nombre_sufijo": {
      "type": "string",
      "maxLength": 20,
      "default": "(copia)",
      "description": "Sufijo que se agrega al nombre original."
    },
    "copiar_evaluaciones": {
      "type": "boolean",
      "default": false,
      "description": "D-FIN-17: default false. Las evaluaciones no se clonan porque los alumnos del grupo destino pueden ser distintos."
    }
  }
}
```

**Response 201:** nueva `PlaneacionResponse` con `id` distinto, `version: 1`, `nombre` con sufijo.

> **Nota de transporte (DEC-03-02, aclaración INTEGRA 2026-08-19):** el contrato semántico de §6.6 (esquema `grupo_destino_id` + `nombre_sufijo` + `copiar_evaluaciones`, RLS por CCT, `clonada_de` poblado, evaluaciones no copiadas por defecto) es lo protegido. El **transporte** puede implementarse como **Server Action** (`duplicarPlaneacion` en `services/planeaciones/planeacion-actions.ts`, patrón consistente con `createPlaneacion`/`entregarDirector` y DEC-03-02) en lugar de un route handler `/api/v1/...`, dado que el codebase actual usa Server Actions para mutaciones disparadas desde la UI. Esta elección de transporte es una decisión interna reversible (§15 SOFIA decide organización interna reversible); el contrato de §6.6 y los criterios T-I-04 se preservan. El test de integración puede invocar la acción directamente (Vitest) en lugar de vía HTTP.

> **Nota de atomicidad (ADR-20260819-01, 2026-08-19, tras QA-20260819-01 P2-2).** La operación de clonado es semánticamente atómica (un clon completo o nada). Como el SDK postgrest de Supabase no soporta transacciones explícitas multi-statement, la estrategia de implementación en MVP es **compensación en el action**: si un `insert` de sesión o bloque falla tras haber creado la `planeacion` (o filas previas), el action ejecuta hard-delete en orden inverso (bloques → sesiones → `planeacion`) sobre los identificadores del intento actual y devuelve `{ok:false, error}`. Cero filas huérfanas. **Cierre total diferido** (`ARCH-20260819-02`): RPC PostgreSQL `duplicar_planeacion(...)` con `BEGIN/COMMIT` y `SECURITY DEFINER` respetando RLS — requiere migración `CREATE FUNCTION` aplicable con `supabase db push` (despliegue de schema, autorización de Frank). La compensación es aceptable para MVP (N pequeño, probabilidad baja de fallo a mitad).

### 6.7. POST /api/v1/planeaciones/:id/entregar-director — Generar URL firmada (D-FIN-5, D-FIN-19)

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/entregar-director.json",
  "title": "EntregarDirector",
  "type": "object",
  "additionalProperties": false,
  "required": ["director_celular"],
  "properties": {
    "director_celular": {
      "type": "string",
      "pattern": "^\\+52[0-9]{10}$",
      "description": "Celular declarado por la maestra. T27-T32: usado para OTP si el director decide registrarse."
    },
    "director_nombre": {
      "type": "string",
      "maxLength": 200,
      "description": "Opcional. Si existe en BD por CCT, se autocompleta."
    },
    "mensaje_personalizado": {
      "type": "string",
      "maxLength": 500,
      "description": "D-FIN-19, T24: mensaje WhatsApp editable. Default pre-armado si se omite."
    },
    "expira_dias": {
      "type": "integer",
      "minimum": 1,
      "maximum": 90,
      "default": 30,
      "description": "T23: default 30 días, configurable."
    },
    "generar_pdf": {
      "type": "boolean",
      "default": true,
      "description": "Si true, genera PDF server-side (Playwright) y lo almacena en Supabase Storage antes de firmar URL."
    }
  }
}
```

**Response 201:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/entrega-response.json",
  "title": "EntregaResponse",
  "type": "object",
  "required": ["data"],
  "properties": {
    "data": {
      "type": "object",
      "required": ["entrega_id", "url_firmada", "url_whatsapp", "expira_at", "version"],
      "properties": {
        "entrega_id": { "type": "string", "format": "uuid" },
        "url_firmada": {
          "type": "string",
          "format": "uri",
          "description": "URL pública con JWT embebido. No incluye el JWT en body separado."
        },
        "url_whatsapp": {
          "type": "string",
          "format": "uri",
          "description": "https://wa.me/<celular>?text=<mensaje_url_encoded>"
        },
        "qr_data_uri": {
          "type": "string",
          "description": "data:image/svg+xml;base64,... para render directo en UI."
        },
        "expira_at": { "type": "string", "format": "date-time" },
        "version": { "type": "integer", "minimum": 1 }
      }
    }
  }
}
```

**Flujo server-side:**

1. Validar `:id` pertenece al CCT del docente.
2. Generar PDF server-side (si `generar_pdf=true`) vía Playwright headless. Hash SHA-256 del PDF persistido en `entregas.pdf_sha256`.
3. Insertar `entregas` con `estado=entregada`, `fecha_entrega=now()`, `director_celular`, `url_firmada_token` (JWT), `url_firmada_expira_at = now() + expira_dias`.
4. Construir mensaje WhatsApp default si no viene `mensaje_personalizado`.
5. Generar QR como SVG embebido.
6. NO se envía WhatsApp automáticamente (D-FIN-19, M5 anti-feature): la maestra abre `url_whatsapp` desde su navegador.

**Errores específicos:** 422 `NEM_ENTREGA_PDF_GENERATION_FAILED` (Playwright falló), 429 `NEM_ENTREGA_RATE_LIMIT` (ver §7).

> **⚠️ DESVIACIÓN ACEPTADA — D-FIN-5 "Descargable binario" NO cumplido como binario (seguimiento ARCH-20260818-01, 2026-08-18).**
>
> El contrato funcional (E22 §D-FIN-5, "PDF triple": visualizable + **descargable** + compartible) exige el uso **"Descargable"** como **botón "Descargar PDF" que produce un archivo `.pdf` binario** generado server-side con Playwright/Puppeteer, almacenado en Supabase Storage y con hash SHA-256 persistido en `entregas.pdf_sha256` (ver E22 §D-FIN-5 implementación, línea 120: "Generación PDF server-side (Playwright o Puppeteer)"; §3.3 tabla uso "Descargable").
>
> **Estado de implementación actual (MVP desplegado):** el endpoint real `app/api/planeaciones/[id]/generar-pdf/route.ts` **NO genera un `.pdf` binario**. Retorna `Content-Type: text/html; charset=utf-8` con `Content-Disposition: inline; filename="planeacion-<id>.html"` (HTML imprimible). No hay almacenamiento en Storage, ni hash SHA-256, ni inserción de `pdf_sha256`. La generación binaria con Playwright/Puppeteer queda **explícitamente diferida** tras la env var `PDF_GENERATOR=playwright` (no activada en MVP); el comentario del propio endpoint declara "Por ahora devolvemos HTML para que el navegador pueda imprimirlo (cmd+P → PDF)".
>
> **Capacidad actual sustitutiva:** visualizable (HTML del director en `/v/[entrega_id]?token=...`, §3.3) ✅ y compartible (URL firmada JWT 30 días + QR + `wa.me`, D-FIN-19) ✅. El "Descargable" se cubre parcialmente vía **imprimir/guardar como PDF desde el navegador** sobre el HTML, NO vía generación binaria server-side.
>
> **Preservación del requisito funcional:** esta desviación es **aceptada y diferida**, **no** una redefinición. El requisito funcional D-FIN-5 "Descargable binario" **sigue sin cumplirse como binario** y permanece abierto. Su cierre requiere: activar `PDF_GENERATOR=playwright`, implementar render HTML→PDF con `@sparticuz/chromium` + `puppeteer-core` (ya en `package.json`), subir el `.pdf` a Storage (`ccts/{cct}/planeaciones/{id}/{version}.pdf`) y persistir `pdf_sha256`. Hasta entonces, los criterios binarios (hash estable, `pdf_sha256` no nulo, descarga `.pdf` > 10 KB) **no son verificables**.
>
> **Trazabilidad:** GEMINI QA-20260818-01 §C.1 ("descargable binario diferido — HTML imprimible, decisión documentada sesión 3 §6.1, L2") y §P-PD7 ("parcial por desviación documentada, ⚠️ aceptado"). Ver addendum `specs/AUDITORIA_INTEGRA_ADDENDUM_2026-08-18.md` §1.

### 6.8. GET /api/v1/catalogo/pda — Catálogo NEM de PDA

**Auth:** Docente autenticado. Sin RLS (catálogo público del DOF).

**Query params:**

- `campo_formativo_id` (filtro)
- `fase` (int 2-6; Fase 1 marcada como "extensión no oficial")
- `q` (búsqueda full-text en `nombre` + `descripcion`)

**Response 200:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/catalogo-pda-response.json",
  "title": "CatalogoPdaResponse",
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "codigo", "nombre", "campo_formativo_id", "fase"],
        "properties": {
          "id": { "type": "string" },
          "codigo": { "type": "string", "pattern": "^PDA-F[0-9]-" },
          "nombre": { "type": "string" },
          "descripcion": { "type": "string" },
          "campo_formativo_id": { "type": "string" },
          "fase": { "type": "integer", "minimum": 1, "maximum": 6 },
          "oficial": { "type": "boolean", "description": "false para Fase 1 (extensión no oficial)" }
        }
      }
    }
  }
}
```

### 6.9. GET /api/v1/catalogo/campos-formativos

**Response 200:** array de 4 elementos fijos:

| id | codigo | nombre |
|---|---|---|
| `LENGUAJES` | F1 | Lenguajes |
| `SABERES_PENSAMIENTO_CIENTIFICO` | F2 | Saberes y Pensamiento Científico |
| `ETICA_NATURALEZA_SOCIEDADES` | F3 | Ética, Naturaleza y Sociedades |
| `LO_HUMANO_LO_COMUNITARIO` | F4 | De lo Humano y lo Comunitario |

### 6.10. GET /api/v1/catalogo/ejes

**Response 200:** array de 7 elementos fijos (Plan 2022 §8.1):

| id | codigo | nombre |
|---|---|---|
| `INCLUSION` | E1 | Inclusión |
| `PENSAMIENTO_CRITICO` | E2 | Pensamiento Crítico |
| `INTERCULTURALIDAD_CRITICA` | E3 | Interculturalidad Crítica |
| `IGUALDAD_GENERO` | E4 | Igualdad de Género |
| `VIDA_SALUDABLE` | E5 | Vida Saludable |
| `APROPIACION_CULTURAS_LECTURA` | E6 | Apropiación de las Culturas a través de la Lectura y la Escritura |
| `ARTES_EXPERIENCIAS_ESTETICAS` | E7 | Artes y Experiencias Estéticas |

### 6.11. GET /api/v1/catalogo/bloques — Catálogo M1 (D-FIN-1)

**Query params:**

- `campo_formativo_id`
- `tipo` (enum: `apertura`, `desarrollo`, `practica`, `cierre`, `evaluacion`, `evaluacion_semanal`)
- `modalidad` (D-FIN-6)
- `nivel_flexibilidad` (enum: `cerrado`, `abierto`, `en_blanco`)

**Response 200:** array de bloques con estructura D-FIN-1:

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/bloque-catalogo.json",
  "title": "BloqueCatalogo",
  "type": "object",
  "required": ["id", "codigo", "nombre", "tipo", "nivel_flexibilidad", "pda_ids", "campos_formativos"],
  "properties": {
    "id": { "type": "string" },
    "codigo": { "type": "string" },
    "nombre": { "type": "string" },
    "descripcion": { "type": "string" },
    "tipo": { "type": "string", "enum": ["apertura", "desarrollo", "practica", "cierre", "evaluacion", "evaluacion_semanal"] },
    "nivel_flexibilidad": { "type": "string", "enum": ["cerrado", "abierto", "en_blanco"] },
    "pda_ids": { "type": "array", "items": { "type": "string" } },
    "campos_formativos": { "type": "array", "items": { "type": "string" } },
    "ejes": { "type": "array", "items": { "type": "string" } },
    "recursos_requeridos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "categoria": { "type": "string" },
          "clave_busqueda": { "type": "string" },
          "cantidad": { "type": "integer", "minimum": 1 }
        }
      }
    },
    "modalidades_compatibles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "≥1 de las 6 modalidades NEM."
    }
  }
}
```

### 6.12. POST /api/v1/planeaciones/:id/evaluaciones — Registrar rúbrica semáforo (D-FIN-2, D-FIN-3)

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/evaluacion-create.json",
  "title": "EvaluacionCreate",
  "type": "object",
  "additionalProperties": false,
  "required": ["alumno_id", "nivel", "fecha"],
  "properties": {
    "alumno_id": { "type": "string", "format": "uuid" },
    "nivel": {
      "type": "integer",
      "enum": [1, 2, 3, 4],
      "description": "D-FIN-3: 1=Logrado sin apoyo (verde), 2=Logrado con apoyo (amarillo), 3=Requiere apoyo constante (naranja), 4=No logrado (rojo)."
    },
    "fecha": { "type": "string", "format": "date" },
    "pda_id": { "type": "string", "description": "PDA trabajado en la sesión evaluada." },
    "sesion_id": { "type": "string", "format": "uuid" },
    "observaciones": { "type": "string", "maxLength": 500 }
  }
}
```

**Reglas:**

- `alumno_id` debe pertenecer al CCT del docente (RLS vía grupo).
- Solo se permite 1 evaluación por `(alumno_id, fecha, pda_id, sesion_id)`. Repetir → upsert (actualiza nivel).
- Endpoint soporta batch: body puede ser array si header `Content-Type: application/json` y body es `[{...}, {...}]`. Máximo 50 evaluaciones por request (rate limit por array).

**Response 201:** `{ data: { evaluacion_id, alumno_id, nivel, fecha, created_at }, meta: {...} }`.

**Errores:** 422 `NEM_EVALUACION_PDA_INVALIDO`, 403 `NEM_AUTH_RLS_VIOLATION`.

### 6.13–6.17. CRUD /api/v1/alumnos

Esquemas compactos:

**AlumnoCreate / AlumnoUpdate:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/alumno-write.json",
  "title": "AlumnoWrite",
  "type": "object",
  "additionalProperties": false,
  "required": ["grupo_id", "nombre"],
  "properties": {
    "grupo_id": { "type": "string", "format": "uuid" },
    "nombre": { "type": "string", "minLength": 3, "maxLength": 100 },
    "grado": { "type": "integer", "minimum": 1, "maximum": 3 },
    "grupo": { "type": "string", "maxLength": 3 },
    "ciclo_escolar": { "type": "string", "pattern": "^20[0-9]{2}-20[0-9]{2}$" }
  }
}
```

**AlumnoResponse:** añade `id`, `activo`, `created_at`, `updated_at`.

**Endpoints:**

| # | Método | Path | Body | Response |
|---|---|---|---|---|
| E13 | POST | `/api/v1/alumnos` | `AlumnoWrite` | 201 `AlumnoResponse` |
| E14 | GET | `/api/v1/alumnos?grupo_id=...&cursor=...` | — | 200 array |
| E15 | GET | `/api/v1/alumnos/:id` | — | 200 `AlumnoResponse` |
| E16 | PATCH | `/api/v1/alumnos/:id` | subset `AlumnoWrite` | 200 `AlumnoResponse` |
| E17 | DELETE | `/api/v1/alumnos/:id` | — | 204 (soft delete, `activo=false`) |

**CSV bulk import:** `POST /api/v1/alumnos/bulk-import` con `multipart/form-data` (file=`alumnos.csv`). Formato: `nombre,grado,grupo` (no IDs sensibles). Response: `{ data: { inserted, skipped, errors: [...] } }`.

### 6.18–6.22. CRUD /api/v1/recursos-aula (E21)

**RecursoAulaWrite:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/recurso-aula-write.json",
  "title": "RecursoAulaWrite",
  "type": "object",
  "additionalProperties": false,
  "required": ["nombre", "categoria"],
  "properties": {
    "nombre": { "type": "string", "minLength": 3, "maxLength": 200 },
    "categoria": {
      "type": "string",
      "enum": ["manipulativos", "impresos", "sensoriales", "simbolicos", "musicales", "plasticos", "otro"],
      "description": "E21 §3.2: 6 categorías pedagógicas canónicas."
    },
    "uso": {
      "type": "string",
      "maxLength": 100,
      "description": "Campo clave E21 §3.3: 'para qué lo usa' en palabras de la maestra. Usado por matching semántico."
    },
    "edad": { "type": "string", "enum": ["3-4", "4-5", "5-6", "todas"] },
    "cantidad": { "type": "integer", "minimum": 1, "default": 1 },
    "foto_url": { "type": "string", "format": "uri" },
    "kit_origen": {
      "type": "string",
      "enum": ["kit_preescolar_generico", "manual"],
      "default": "manual"
    },
    "uso_fuente": {
      "type": "string",
      "enum": ["maestra", "ia_sugerida", "maestra_editada_de_ia", "kit_template"],
      "default": "maestra",
      "description": "P-PD9: provenance del texto del uso. Permite auditar adopción IA."
    }
  }
}
```

**Endpoints:** análogos a alumnos (POST/GET list/GET one/PATCH/DELETE). Bulk-import de kit preescolar genérico vía `POST /api/v1/recursos-aula/cargar-kit-generico` (sin body; inserta ~30 items de E21 §3.2).

### 6.23. POST /api/v1/recursos-aula/:id/ia/sugerir-uso — F-IA1 (E21 §3.3.1)

**Auth:** Docente (RLS). Server-side solo.

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/f-ia1-request.json",
  "title": "FIA1Request",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "forzar_refresh": {
      "type": "boolean",
      "default": false,
      "description": "Si true, ignora cache de 30 días y re-llama a MiniMax."
    }
  }
}
```

**Response 200:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/f-ia1-response.json",
  "title": "FIA1Response",
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "required": ["sugerencias", "origen"],
      "properties": {
        "sugerencias": {
          "type": "array",
          "items": { "type": "string", "maxLength": 60 },
          "maxItems": 4,
          "description": "E21: 3-4 usos típicos pedagógicamente válidos. Array vacío si MiniMax no sabe."
        },
        "origen": {
          "type": "string",
          "enum": ["cache", "minimax", "fallback_vacio"],
          "description": "Cache 30 días por par (nombre, categoria)."
        },
        "cache_expira_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

**Política de datos hacia MiniMax (P-PD8, P-PD9, D-FIN-13, SPEC §3.7.2):**

| Dato | Sale a MiniMax | Justificación |
|---|---|---|
| `nombre` del recurso | Sí | Pedagógico, no personal |
| `categoria` | Sí | Pedagógico |
| `edad` | Sí | Pedagógico |
| `uso` escrito por la maestra | No (no se manda; se pide sugerir) | La maestra aún no lo escribió |
| `docente_id`, `cct`, email | **No** | `ia_anonymizer` lo filtra |
| Datos de alumnos | **REGLA DURA: NUNCA** | SPEC §3.7.2 |

**Implementación:** `lib/ia/anonymizer.ts` (ruta real del codebase; `anonymizeText`, `anonymizeRequest`, `_INTERNAL_PATTERNS` ya exportados) es el único camino al proveedor. Test unitario `lib/ia-anonymizer.spec.ts` (ver SPEC_TEC_06 §5.1, cobertura 100%) verifica que el log de la llamada al proveedor IA no contiene PII. F1/F2/F3 amplían la cobertura del anonimizador para los campos que envían (prompt pedagógico, contexto, `texto_base`); ver `SPEC_TEC_07_Capa_IA.md` §4.2 y §9.

### 6.24. POST /api/planeaciones/:id/ia/variantes-bloque — F1

> **Corrección ADR-20260819-02 (ARCH-20260819-03):** ruta alineada con el codebase (sin prefijo `/v1/`, ver `app/api/recursos-aula/ia-sugerir-uso/route.ts` y nota de excepción E30 en §6.30). Proveedor IA configurable vía `AI_PROVIDER`/`AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL` (OpenAI-compatible); las referencias a "MiniMax" se interpretan como "el proveedor IA configurado". Contrato denso, trazabilidad sugerencia vs aceptación, rate-limit (5 req/min), timeout (`AI_TIMEOUT_MS` 8000ms), degradación graceful, cache 30 días y criterios testables en `SPEC_TEC_07_Capa_IA.md`.

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/f1-request.json",
  "title": "F1Request",
  "type": "object",
  "additionalProperties": false,
  "required": ["bloque_id"],
  "properties": {
    "bloque_id": { "type": "string" },
    "variante_tipo": {
      "type": "string",
      "enum": ["urbana", "rural", "plurilingue"],
      "description": "T13: MVP soporta urbana + rural genéricas. Plurilingüe es Fase 2."
    }
  }
}
```

**Response 200:** `{ data: { variante_texto, variante_tipo, bloque_id, origen: 'ia' | 'cache' | 'fallback_vacio' } }`. Si `origen='fallback_vacio'` → `variante_texto=''` (timeout, sin `AI_API_KEY`, o error de red). **Trazabilidad de aceptación (P-PD9):** al persistir la variante aceptada por la docente, `bloque.origen` queda `'ia_sugerencia'` (aceptó tal cual) o `'maestra_editado_de_ia'` (aceptó y editó); `audit_log` registra el POST F1 (`body_hash` del request) y el PATCH del bloque (`body_hash` del texto aceptado). Ver SPEC_TEC_07 §5.1 y §6.

**Regla dura P-PD8 + SPEC §3.7.1:** el proveedor IA **solo adapta el texto del bloque**, no propone PDA, campos formativos ni ejes nuevos. La validación server-side post-IA verifica que la estructura (PDA, campos, ejes) del bloque no fue alterada. Si el proveedor la altera → se descarta la variante, se retorna 422 `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA`. Excepción de seguridad (no degradación): `NEM_IA_ANONYMIZER_BLOCKED` 500 si el anonimizador detecta PII irredactable. Ver SPEC_TEC_07 §5.1 y §8.

### 6.25. POST /api/planeaciones/:id/ia/help-redaccion — F2

> **Corrección ADR-20260819-02:** ruta alineada con el codebase (sin `/v1/`). Contrato denso, anonimización obligatoria de `texto_base`, trazabilidad y criterios testables en `SPEC_TEC_07_Capa_IA.md` §5.2.

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/f2-request.json",
  "title": "F2Request",
  "type": "object",
  "additionalProperties": false,
  "required": ["texto_base", "accion"],
  "properties": {
    "texto_base": { "type": "string", "minLength": 5, "maxLength": 1000 },
    "accion": { "type": "string", "enum": ["expandir", "simplificar"] },
    "edad_destino": { "type": "string", "enum": ["3-4", "4-5", "5-6"] }
  }
}
```

**Response 200:** `{ data: { texto_propuesto, accion, origen: 'ia' | 'fallback_vacio' } }`. P-PD9: la maestra acepta o descarta; **no se persiste automáticamente** en el bloque. Si acepta, un PATCH sobre el bloque persiste `texto=texto_propuesto` con `origen='ia_sugerencia'` o `'maestra_editado_de_ia'`; `audit_log` registra el POST F2 y el PATCH (trazabilidad sugerencia→aceptación, SPEC_TEC_07 §6).

### 6.26. POST /api/planeaciones/:id/ia/pulir-pdf — F3

> **Corrección ADR-20260819-02:** ruta alineada con el codebase (sin `/v1/`). F3 es **propuesta previa al render** (la maestra acepta → PATCH `planeacion` → luego `generar-pdf` renderiza con valores persistidos); `lib/pdf/generate.ts` no se acopla a IA. Contrato denso, criterios testables y flujo post-aceptación en `SPEC_TEC_07_Capa_IA.md` §5.3 y §4.1 (Decisión 4 del ADR-02).

**Request body:** `{ "campos_a_pulir": ["problema_contexto", "proposito", "producto_integrador", "ajustes_razonables"] }` (`minItems 1`; enum = columnas text abiertas reales de la tabla `planeacion`).

> **Mapeo (Decisión 8 ADR-02):** el baseline §3.7 F3 menciona "objetivo, propósito, producto integrador". La tabla `planeacion` no tiene columna `objetivo`; "objetivo" se mapea a `problema_contexto` (pregunta detonadora M2) y `proposito` (objetivo pedagógico). La semántica funcional "pulir campos abiertos" se preserva.

**Response 200:** `{ data: { campos_pulidos: [{ campo, texto_original, texto_pulido }], origen: 'ia' | 'fallback_vacio' } }`. Si `origen='fallback_vacio'` → `campos_pulidos: []`.

**No aplica a:** bloques del catálogo, nombres de proyectos, PDA oficiales. Validación server-side: si `texto_pulido` introduce PDA no en catálogo → 422 `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA` con `details.campo`.

### 6.27. POST /api/v1/onboarding/aviso-privacidad/aceptar (D-FIN-15)

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/aceptacion-aviso.json",
  "title": "AceptacionAviso",
  "type": "object",
  "additionalProperties": false,
  "required": ["version_aviso", "consentimiento_institucional"],
  "properties": {
    "version_aviso": { "type": "string", "description": "Ej: '2026.08.1'. Versión del aviso aceptado." },
    "consentimiento_institucional": {
      "type": "boolean",
      "description": "D-FIN-15: 'Confirmo que tengo consentimiento institucional para registrar datos de los alumnos a mi cargo'. Si false, la app no permite capturar nombres de alumnos."
    },
    "user_agent": { "type": "string", "maxLength": 500 },
    "ip": { "type": "string", "format": "ipv4", "description": "Opcional. Solo se persiste si el docente opt-in en ajustes." }
  }
}
```

**Response 201:** `{ data: { docente_id, fecha_aceptacion, version_aviso } }`. Insert en `aceptacion_aviso_privacidad`.

### 6.28. POST /api/v1/entregas/:entrega_id/marcar-recibida — Director sin registro

**Auth:** JWT de URL firmada del director (header `Authorization: Bearer <jwt_director>`). NO requiere Supabase Auth.

**Request body:** vacío (`{}`).

**Response 200:** `{ data: { entrega_id, estado: 'recibida', fecha_recibida } }`.

**Validación:** el JWT debe tener `sub: <entrega_id>` y no estar expirado. Si expirado → 401 `NEM_ENTREGA_TOKEN_EXPIRADO`.

### 6.29. POST /api/v1/entregas/:entrega_id/comentario — Director sin registro

**Request body:**

```json-schema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nem.mx/schemas/v1/comentario-director.json",
  "title": "ComentarioDirector",
  "type": "object",
  "additionalProperties": false,
  "required": ["texto"],
  "properties": {
    "texto": { "type": "string", "minLength": 1, "maxLength": 1000 }
  }
}
```

**Response 201:** `{ data: { comentario_id, entrega_id, texto, created_at, vinculado_a_director_id: null } }`. El `vinculado_a_director_id` se llena cuando el director se registra (T32).

### 6.30. GET /api/planeaciones/:id/generar-pdf — Descargar PDF binario (D-FIN-5 "Descargable")

**Contrato objetivo (cierre del gap FND-20260818-04, 2026-08-19).** Formaliza el uso **"Descargable"** de D-FIN-5: botón "Descargar PDF" que produce un archivo `.pdf` binario generado server-side. Cierra la desviación documentada en §6.7 y en `specs/AUDITORIA_INTEGRA_ADDENDUM_2026-08-18.md` §1.

**Auth:** Docente autenticado + RLS valida `docente_id` de la planeación = `session.docenteId` (mismo ownership check que la versión HTML actual, ver `generar-pdf/route.ts:35`).

**Request:** sin body. `:id` = UUID de la planeación.

**Response 200 (binaria, sin envolvente `data/meta`):**

| Header | Valor |
|---|---|
| `Content-Type` | `application/pdf` |
| `Content-Disposition` | `attachment; filename="planeacion-<planeacion_id>.pdf"` |
| `X-Pdf-Sha256` | hash SHA-256 (hex, 64 chars) del cuerpo binario retornado |
| `Content-Length` | tamaño en bytes del `.pdf` |

**Cuerpo:** binario PDF válido (> 10 KB para una planeación con contenido §3.5). Generado server-side renderizando la plantilla HTML de planeación (misma que la versión imprimible actual) a PDF vía `puppeteer-core` + `@sparticuz/chromium` (ya en `package.json`).

**Errores específicos:**

| HTTP | code | Causa |
|---|---|---|
| 401 | `NEM_AUTH_UNAUTHORIZED` | Sin sesión |
| 403 | `NEM_AUTH_RLS_VIOLATION` | `:id` no pertenece al docente (ownership) |
| 404 | `NEM_PLANEACIONES_NOT_FOUND` | Planeación inexistente o soft-deleted |
| 422 | `NEM_ENTREGA_PDF_GENERATION_FAILED` | El render HTML→PDF falló (chromium no disponible, timeout, o input inválido) |

**Reglas e invariantes:**

1. **Binario real, no HTML.** El `Content-Type` debe ser `application/pdf` (NO `text/html`). El cuerpo debe ser un PDF parseable (cabecera `%PDF-`), no HTML imprimible. Esto revierte el comportamiento actual (HTML `inline`) documentado en la desviación §6.7.
2. **Hash verdadero.** `X-Pdf-Sha256` debe ser el SHA-256 real del binario retornado (calculado sobre el cuerpo, no un placeholder). Esto sustituye al placeholder `sha256-<id>-<timestamp>` de `entrega-actions.ts`.

   > **Alcance del invariante de idempotencia (aclaración ADR-20260819-01, 2026-08-19, tras QA-20260819-01 P2-1).** La propiedad "mismo input → mismo hash" se interpreta con alcance preciso:
   > - **Estricto para el binario persistido en una entrega** (cierre total futuro, SPEC de seguimiento `ARCH-20260819-02`): `entrega.pdf_sha256` acredita el binario que el director recibe; las descargas posteriores deben servir el mismo binario (Storage + `doc_pdf_storage_path`). **No se cumple hoy** porque `entregar-director` calcula el path de Storage (`doc_pdf_storage_path`) pero no sube el binario (sin bucket configurado), y `generar-pdf` re-renderiza en cada descarga. El hash persistido NO coincide con descargas posteriores hasta el cierre total.
   > - **Nominal para renders on-demand** (botón "Descargar PDF" sin entrega asociada, p.ej. en borrador): el `X-Pdf-Sha256` acredita el binario generado en esa llamada, no entre llamadas consecutivas. Dos renders reales consecutivos de la misma planeación pueden producir hashes distintos por (a) footer `new Date().toLocaleString('es-MX')` (causa cerrada por SOFIA: fecha determinista derivada de la planeación) y (b) metadata `/CreationDate`/`/ModDate` embebida por Chromium desde el reloj del host (causa residual, no controlable vía `page.pdf()`; cierre diferido a Storage).
   > - **Esto NO rebaja D-FIN-5:** el botón "Descargar PDF" produce `.pdf` binario real (verificado por QA: 37 KB, `%PDF-1.4`, SHA-256 real del cuerpo). El requisito funcional "Descargable binario" está cumplido. Lo acotado es la garantía de integridad entre entrega y descarga, que es especificación técnica de reglas 2-4.
   > - **Test T-E2E-05 "Hash PDF estable":** verifica determinismo del hash en el renderer inyectado (buffer fijo). No afirma idempotencia del renderer real con chromium hasta el cierre total con Storage.
3. **Shared renderer.** La lógica HTML→PDF + sha256 debe centralizarse en un módulo reutilizable (`lib/pdf/`) consumido tanto por este endpoint (descarga) como por `services/entregas/entrega-actions.ts` (flujo `entregar-director` §6.7), para que el `pdf_sha256` persistido en `entrega` sea el hash del MISMO binario que el botón "Descargar PDF" produce. Sin duplicación de lógica de render.
4. **Integridad de `entrega.pdf_sha256`.** Tras el cierre, `entrega-actions.ts` debe persistir en `entrega.pdf_sha256` el hash real del binario generado (no `placeholderHash`). `doc_pdf_url` debe apuntar a una fuente de binario real (endpoint `generar-pdf` o URL de Storage si `PDF_STORAGE_BUCKET` está configurado).
5. **Degradación graceful (env).** Si `PDF_GENERATOR !== 'playwright'` o chromium no está disponible en el entorno (p.ej. dev local sin la layer de @sparticuz/chromium), el endpoint debe retornar **422 `NEM_ENTREGA_PDF_GENERATION_FAILED`** con mensaje legible, NO caer silenciosamente a HTML. La caída a HTML era el comportamiento diferido; el cierre exige binario o error explícito. Ver "Casos borde" abajo.
6. **Plantilla.** Reutilizar la plantilla HTML actual de `generar-pdf/route.ts` (encabezado, problema del contexto, campos, ejes, PDA, ajustes razonables, footer con CCT) como input del render HTML→PDF. No introducir una plantilla paralela.

**Casos borde:**

- **Planeación sin `producto_integrador` / sin PDA:** el botón "Descargar PDF" puede deshabilitarse en UI (validación previa). Si se llama igualmente, retorna 422 con `details` indicando el campo faltante (criterio MVP §3.5: `producto_integrador` obligatorio para exportar).
- **Chromium no disponible en runtime:** 422 `NEM_ENTREGA_PDF_GENERATION_FAILED`. Mensaje es-MX: "No se pudo generar el PDF en este entorno. Intenta de nuevo o exporta desde el navegador." No exponer stack.
- **Timeout de render:** límite `maxDuration=60` (ya declarado). Si excede, 422 con mismo code.

**Relación con §6.7 (entregar-director):** el flujo `entregar-director` (E7) genera el PDF (paso 2 del flujo server-side) y persiste `pdf_sha256` en `entrega`. Tras este cierre, ese flujo DEBE consumir el mismo `lib/pdf/` renderer para que el hash persistido coincida con el hash del botón "Descargar PDF" (E30). La nota de desviación §6.7 pasa a **resuelta** cuando E30 produce binario + hash verdadero y `entrega-actions.ts` los consume.

**Trazabilidad:** FND-20260818-04; D-FIN-5; SPEC_TEC_06 T-E2E-05 (pasos 4-5 + aserción `pdf_sha256`), T-I-05 (celda "PDF hash" deja de ser diferida); addendum §1.

### 6.31. POST /api/planeaciones/ia/contexto-problema — F0 (IA contextualizada por modalidad)

> **Introducido por `ARCH-20260820-03` / `SPEC_TEC_10_IA_Contexto_Problema.md`.** Ruta **sin `[id]`**: la planeación aún no existe en el paso inicial del wizard. Auth por sesión; sin RLS check de recurso (no hay recurso).

**Request body:**

```json
{
  "modalidad": "rincones",
  "problema_contexto": "a los niños les cuesta compartir los materiales",
  "proposito": "que aprendan a turnarse",
  "ajustes_razonables": "",
  "nivel": "preescolar"
}
```

- `modalidad` (enum 6, obligatorio), `problema_contexto` (string, min 1, max 1000, obligatorio), `proposito`/`ajustes_razonables` (string opcionales, max 1000), `nivel` (`preescolar|primaria|secundaria`, opcional).

**Response 200:** `{ data: { problema_estructurado, proposito, ajustes_razonables, origen: 'ia' | 'fallback_vacio' } }`. Si `origen='fallback_vacio'` → los tres campos `''` (timeout, sin `AI_API_KEY`, red, o JSON inválido del proveedor).

**P-PD9:** F0 **no muta** campos; devuelve propuestas que la docente aplica **campo por campo** con clic explícito en el wizard. La persistencia final la hace `POST /api/planeaciones` (E1, `createPlaneacion`). **Sin persistencia de drafts** (retención = OQ-20260820-06, open).

**Trazabilidad (Decisión 9 ADR-02, SPEC_TEC_07 §6.1.1):** una fila `audit_log` POST por request con `cct = session.cct`, `endpoint = 'planeaciones_contexto_problema'`, `body_hash` del `user` message anonimizado. Persistencia real sujeta a política RLS INSERT (`0021`, ARCH-20260820-01).

**Errores:** análogos a F1/F2/F3 (§8.2): `NEM_RATE_LIMIT_EXCEEDED` (429), `NEM_PLANEACIONES_VALIDATION_ERROR` (422), `NEM_IA_ANONYMIZER_BLOCKED` (500), `NEM_AUTH_UNAUTHORIZED` (401), `NEM_INTERNAL_ERROR` (500). **Sin** `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA` (D10-07: campos libres sin estructura PDA).

Detalle denso, prompt, casos borde y AC en `SPEC_TEC_10_IA_Contexto_Problema.md`.

---

## 7. RATE LIMITING

### 7.1. Tokens por endpoint

| Categoría | Endpoint | Límite | Burst | Razón |
|---|---|---|---|---|
| CRUD estándar | `/planeaciones`, `/alumnos`, `/recursos-aula` | 60 req/min por docente | 10 | Uso normal sin abuso |
| Catálogos (cacheados) | `/catalogo/*` | 120 req/min por docente | 20 | Alta frecuencia, respuestas cacheadas |
| IA (F0, F1, F2, F3, F-IA1) | `/ia/*` (incl. `/planeaciones/ia/contexto-problema`) | 5 req/min por docente | 1 | SPEC §3.7.3: rate limit MiniMax |
| Entrega al director | `/planeaciones/:id/entregar-director` | 3 req/hora por planeación | 1 | Genera PDF + URL firmada (costoso) |
| Acciones director (sin registro) | `/entregas/:entrega_id/marcar-recibida`, `/comentario` | 10 req/hora por entrega_id | 2 | Anti-abuso de URL pública |
| Aceptación aviso | `/onboarding/aviso-privacidad/aceptar` | 1 req por docente (lifetime) | — | Una sola vez |

### 7.2. Implementación

- **Capa:** middleware Next.js + Upstash Redis (Vercel KV) para contador distribuido.
- **Headers de respuesta:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (RFC draft-ietf-httpapi-ratelimit-headers).
- **429 body:** `{ "error": { "code": "NEM_RATE_LIMIT_EXCEEDED", "message": "Intenta de nuevo en N segundos.", "retryAfter": N } }` + header `Retry-After: N`.

### 7.3. Degradación graceful de IA

> **Ampliación ADR-20260819-02 (Decisión 5):** detalle completo y casos borde en `SPEC_TEC_07_Capa_IA.md` §8.

Si el proveedor IA cae, excede timeout (`AI_TIMEOUT_MS` 8000ms) o no hay `AI_API_KEY` configurada, los endpoints `/ia/*` retornan **200 con `origen: 'fallback_vacio'`** y array/respuesta vacía, **NO 5xx**. El frontend muestra "IA no disponible ahora, hazlo manual" (anti-feature: nunca bloquear el flujo de la maestra por IA). Sin fallback automático a un segundo proveedor (D-FIN-13 / baseline §3.7 "proveedor único sin fallback").

**Excepciones de seguridad (no son "IA caída"):**

- `NEM_IA_ANONYMIZER_BLOCKED` (500): el anonimizador detectó PII irredactable; no se envía nada al proveedor. Caso patológico, no esperado en flujo normal.
- `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA` (422): la respuesta del proveedor altera PDA/campos/ejes (F1) o introduce PDA no en catálogo (F3). Validación post-IA; la propuesta se descarta.
- `NEM_RATE_LIMIT_EXCEEDED` (429): >5 req/min por docente; header `Retry-After`. Anti-abuso, no degradación.
- `NEM_IA_TIMEOUT` (504): código canónico reservado en §8.2, **no emitido este turno** (la degradación graceful lo sustituye con 200 `fallback_vacio`); se emitirá en futuros endpoints donde la degradación no sea posible.

---

## 8. CÓDIGOS DE ERROR CANÓNICOS

### 8.1. Estructura

`NEM_<DOMINIO>_<CAUSA>` donde:

- `DOMINIO`: recurso principal (`PLANEACIONES`, `ALUMNOS`, `RECURSOS_AULA`, `AUTH`, `IA`, `ENTREGA`, `CATALOGO`, `EVALUACION`, `ONBOARDING`).
- `CAUSA`: snake_case corto.

### 8.2. Tabla maestra

| code | HTTP | Descripción |
|---|---|---|
| `NEM_AUTH_UNAUTHORIZED` | 401 | No autenticado |
| `NEM_AUTH_TOKEN_EXPIRED` | 401 | JWT vencido |
| `NEM_AUTH_RLS_VIOLATION` | 403 | RLS: recurso fuera del CCT del docente |
| `NEM_AUTH_FORBIDDEN_ROLE` | 403 | Rol insuficiente (ej: docente intentando endpoint de director registrado) |
| `NEM_PLANEACIONES_NOT_FOUND` | 404 | Planeación inexistente o soft-deleted |
| `NEM_PLANEACIONES_VALIDATION_ERROR` | 400 | Schema inválido |
| `NEM_PLANEACIONES_DUPLICATE_NAME_PERIOD` | 409 | Mismo nombre+periodo+grupo |
| `NEM_PLANEACIONES_ARCHIVED` | 409 | Editar archivada |
| `NEM_PLANEACIONES_PDA_INVALIDO` | 422 | PDA no en catálogo oficial |
| `NEM_ALUMNOS_NOT_FOUND` | 404 | — |
| `NEM_ALUMNOS_VALIDATION_ERROR` | 400 | — |
| `NEM_RECURSOS_AULA_NOT_FOUND` | 404 | — |
| `NEM_RECURSOS_AULA_VALIDATION_ERROR` | 400 | — |
| `NEM_EVALUACION_PDA_INVALIDO` | 422 | — |
| `NEM_EVALUACION_NIVEL_INVALIDO` | 422 | Nivel fuera de [1,4] |
| `NEM_CATALOGO_NOT_FOUND` | 404 | — |
| `NEM_IA_TIMEOUT` | 504 | MiniMax > 8s (SPEC §3.7.3) |
| `NEM_IA_VARIANTE_VIOLA_ESTRUCTURA` | 422 | MiniMax alteró PDA/campos/ejes (P-PD8) |
| `NEM_IA_ANONYMIZER_BLOCKED` | 500 | `ia_anonymizer` detectó PII forbidden en prompt |
| `NEM_ENTREGA_PDF_GENERATION_FAILED` | 422 | Playwright falló |
| `NEM_ENTREGA_TOKEN_EXPIRADO` | 401 | URL firmada vencida |
| `NEM_ENTREGA_RATE_LIMIT` | 429 | Ver §7 |
| `NEM_ONBOARDING_AVISO_ALREADY_ACCEPTED` | 409 | Ya aceptado en versión actual |
| `NEM_RATE_LIMIT_EXCEEDED` | 429 | Rate limit genérico |
| `NEM_INTERNAL_ERROR` | 500 | Error no clasificado; log + `requestId` para DEBY |

### 8.3. Reglas para SOFIA

- Nunca retornar 500 sin loggear el stack interno a Vercel + sentry.io.
- Nunca exponer stack traces en body (solo `requestId`).
- `message` siempre en es-MX legible (no técnico para la maestra), salvo `details[]` que puede tener mensaje técnico para debug.

---

## 9. REALTIME Y WEBSOCKETS

### 9.1. Supabase Realtime (D-FIN-12)

Suscripción para director **registrado** (no URL firmada):

- Canal: `entregas:cct=<cct>`
- Eventos: `INSERT` (nueva entrega de maestra del CCT), `UPDATE` (estado cambia a `recibida`).
- Payload: `{ entrega_id, planeacion_nombre, maestra_nombre, estado, fecha_entrega }`. **Sin datos de alumnos**.

### 9.2. Sin WebSocket custom en MVP

No se implementan websockets propios. Supabase Realtime cubre los 2 casos del MVP (entregas al director, edición colaborativa diferida a Fase 2).

---

## 10. COMPLIANCE Y DATOS SENSIBLES

### 10.1. LFPDPPP 2025

- **Aviso de privacidad (D-FIN-15):** aceptación obligatoria antes de capturar nombres de alumnos. Endpoint E27 persiste.
- **ARCO (art. 22):** el soft-delete de alumnos/planeaciones permite ejercicio de derechos. Endpoint futuro `/api/v1/datos/exportar` (D-FIN-18 export JSON manual en MVP; endpoint formal en Fase 2).
- **Transferencia internacional a MiniMax (art. 36-38):** `ia_anonymizer` + aviso explícito en privacidad (SPEC §3.7.4).

### 10.2. Regla dura: CERO datos de alumnos a MiniMax

Implementación: `services/ia-anonymizer.ts` filtra cualquier campo que coincida con patron de `alumno_*`, `nombre_alumno`, `evaluacion_alumno.*`. Tests unitarios en SPEC_TEC_06 §5.

### 10.3. Regla dura: IA solo sugiere (P-PD9)

Endpoints `/ia/*` retornan sugerencias; **nunca mutan** la planeación. La mutación solo ocurre cuando la maestra llama a `PATCH /planeaciones/:id` con texto que ella pega/edita desde la sugerencia. Audit trail via `uso_fuente` en `recurso_aula` y `texto_origen` en campos de bloque.

### 10.4. Audit log

Toda mutación se loguea en tabla `audit_log(cct, docente_id, endpoint, method, body_hash, ip, user_agent, created_at)`. Retención: 90 días (LFPDPPP proporcionalidad).

---

## 11. DECISIONES PENDIENTES (REQUIEREN APROBACIÓN DE FRANK)

### PEND-03-01 — GraphQL en MVP

**Estado:** diferido a Fase 2 (DEC-03-01). **Confirmar con Frank** que está de acuerdo con REST-only en MVP.

### PEND-03-02 — Versión pública de la API

**Estado:** los endpoints `/api/v1/*` requieren auth de docente o URL firmada. No hay API key pública para terceros. **Confirmar** que esto es correcto para MVP (D-DIF-5 marketplace es Fase 3).

### PEND-03-03 — Paginación: cursor vs offset

**Estado:** cursor-based en endpoints públicos. Offset tolerado en admin interno. **Confirmar** o cambiar a offset estándar si se prefiere simplicidad (trade-off: cursor más rápido en tablas grandes, pero paginación no-secuencial harder en UI).

### PEND-03-04 — Rate limit: Upstash Redis vs Supabase pg_rate_limit

**Estado:** propuesta Upstash Redis en Vercel KV (rápido, distribuido). Alternativa: pg_rate_limit en Supabase (sin servicio extra pero más lento). **Decisión** requiere input de Frank sobre stack ops.

### PEND-03-05 — WhatsApp Business API vs wa.me

**Estado:** MVP usa `https://wa.me/<celular>?text=...` (no requiere API de WhatsApp, la maestra abre la app). **Confirmar** que esto es aceptable para MVP; la API Business con envío automático se diferencia a Fase 2.

### PEND-03-06 — Longitud máx. de campos de texto libre

**Estado:** límites propuestos en schemas (ej: `problema_contexto` 1000 chars, `observaciones` 500). **Confirmar** que estos límites son pedagógicamente razonables. Si Tía Lola escribe más, se trunca o se sube a 2000.

### PEND-03-07 — Soft-delete vs hard-delete

**Estado:** todos los DELETE son soft-delete (`activo=false`). **Confirmar** que esto cumple LFPDPPP ARCO o si hay casos que requieran hard-delete inmediato (ej: RGPD-style "right to be forgotten" futuro).

### PEND-03-08 — Expiración default de URL firmada

**Estado:** default 30 días (T23). **Confirmar** que 30 días es correcto; alternativa: 7 días (más seguro pero más fricción si el director tarda en revisar).

---

## 12. CRITERIOS DE ACEPTACIÓN (para GEMINI antes de DONE)

1. ✅ Los 29 endpoints tienen esquema JSON Schema Draft 2020-12 válido (parseable con `ajv`).
2. ✅ Ningún endpoint expone `cct` en body request (siempre de sesión).
3. ✅ Ningún endpoint IA muta la planeación (P-PD9).
4. ✅ Todo endpoint `/ia/*` documenta política de datos hacia MiniMax.
5. ✅ Rate limiting definido para los 6 grupos de endpoints.
6. ✅ Códigos de error canónicos sin colisión.
7. ✅ Versionado por path (`/api/v1/`) con plan de deprecación.
8. ✅ RLS por CCT documentada en cada endpoint con datos de tenant.
9. ✅ Regla dura "CERO datos de alumnos a MiniMax" explícita.
10. ✅ Decisiones pendientes marcadas con `PEND-03-NN` para escalada a Frank.
11. ✅ **E30 — Descargar PDF binario (D-FIN-5 "Descargable", cierre FND-20260818-04):** `GET /api/planeaciones/:id/generar-pdf` retorna `Content-Type: application/pdf` + `Content-Disposition: attachment`, cuerpo binario `%PDF-` > 10 KB, y header `X-Pdf-Sha256` con SHA-256 real del binario (mismo input → mismo hash). 422 `NEM_ENTREGA_PDF_GENERATION_FAILED` si chromium no está disponible; nunca cae a `text/html`.
12. ✅ **Integridad `entrega.pdf_sha256` (D-FIN-5):** `services/entregas/entrega-actions.ts` persiste el hash real del binario generado (no placeholder), consumiendo el mismo renderer `lib/pdf/` que E30, de modo que el hash de la entrega coincide con el del botón "Descargar PDF".
13. ✅ **E6/D-FIN-17 — Duplicar (transporte Server Action permitido):** la acción `duplicarPlaneacion` cumple el contrato §6.6 (`grupo_destino_id`, `nombre_sufijo` default "(copia)", `copiar_evaluaciones` default false, `clonada_de` poblado, RLS por CCT, evaluaciones no copiadas). Implementación como Server Action permitida per nota de transporte §6.6; criterios T-I-04 preservados.

---

## 13. RELACIÓN CON OTROS DOCUMENTOS

| Documento | Relación |
|---|---|
| `SPEC_TEC_04_Estructura_Proyecto.md` | Define dónde viven estos route handlers en el monorepo |
| `SPEC_TEC_06_Plan_Testing.md` | Define tests de contrato API (Pacto + Vitest) |
| `SPEC_MVP_01_Modulo_Docente.md` | SPEC funcional; este es su reflejo técnico de API |
| `E22_CIERRE_DISCOVERY.md` | Decisiones D-FIN-1 a D-FIN-19 trazadas |
| `E20_PRINCIPIOS_DISENNO_PRODUCTO.md` | P-PD8, P-PD9 implementados en endpoints IA |
| `E21_CATALOGO_RECURSOS_AULA.md` | E18-E23 + F-IA1 (E23) |
| `fuentes/E15_INVESTIGACION_CCT_ZONA.md` | Fuente para autocomplete de CCT en onboarding (E27 implícito) |

---

## 14. PRÓXIMOS PASOS

1. ⏳ Frank valida las 8 decisiones pendientes (PEND-03-01 a PEND-03-08).
2. ⏳ GEMINI audita este SPEC contra `SPEC_MVP_01` (consistencia contrato curricular).
3. ⏳ SOFIA implementa route handlers en `app/api/v1/...` según `SPEC_TEC_04_Estructura_Proyecto.md`.
4. ⏳ SOFIA genera migraciones Supabase con RLS según §3.2.
5. ⏳ Tests de contrato (SPEC_TEC_06 §3).

---

**Fin del documento SPEC TEC 03.**
