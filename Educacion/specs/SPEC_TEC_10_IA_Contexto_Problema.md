# SPEC_TEC_10 — IA contextualizada por modalidad en el paso inicial del wizard (F0)

- **ID:** `SPEC-20260820-10`
- **Estado:** DRAFT v1.1 — implementada (IMPL-20260820-06 `READY_FOR_VERIFYING`) y auditada (QA-20260820-05 `PASS_WITH_WARNINGS`, P3=2 cerrados por aceptación explícita). Lista para commit (autorización de Frank vía ATLAS). Sin commits/push/deploys/migraciones este turno.
- **Versión:** 1.1
- **Propietario:** INTEGRA
- **Fecha:** 2026-08-20
- **ADR de origen:** `specs/ADR-20260820-03.md` (ID lógico `ARCH-20260820-03`)
- **Fuentes funcionales:**
  - `discovery/DECISIONS.md` DEC-20260820-03 (modalidad + contexto acumulado; problema/propósito/ajustes; aplicación por clic; invalidación sin borrar aceptados).
  - `discovery/FINDINGS.md` FND-20260820-07 (paso inicial `ESTÁTICO · SIN IA`).
  - `discovery/OPEN-QUESTIONS.md` OQ-20260820-05 (answered), OQ-20260820-06 (open/no bloqueante).
  - `SPEC_MVP_01_Modulo_Docente.md` §3.7 (IA sugiere, maestra decide), §3.7.2 (regla dura cero datos de menores a IA).
  - `E20_PRINCIPIOS_DISENNO_PRODUCTO.md` P-PD8 (IA no altera estructura NEM), P-PD9 (IA sólo sugiere; audit trail).
- **Fuentes técnicas:**
  - `specs/SPEC_TEC_07_Capa_IA.md` §4.2 (cliente/rate-limiter/anonymizer), §6.1.1 (contrato `audit_log` POST), §7 (invariantes), §8 (degradación graceful).
  - `specs/SPEC_TEC_08_UI_IA_F1F2F3.md` §5 (estados de UI) — patrón reutilizable de panel IA (no aplica a la vista detalle; sólo al wizard).
  - `specs/ADR-20260819-02.md` Decisiones 1/2/5/9; R-IA-10.
  - `specs/ADR-20260820-03.md` Decisiones D10-01..D10-08.

---

## 1. Resultado

Conectar la IA al paso inicial del wizard (`Contexto`/`Problema`) mediante un nuevo feature `F0` que, dado el estado del borrador (modalidad elegida + problema del contexto + propósito/ajustes parciales opcionales + nivel), devuelve tres propuestas —**problema estructurado**, **propósito**, **ajustes razonables**— que la docente aplica **campo por campo con clic explícito** (P-PD9). Sustituir el panel estático `ESTÁTICO · SIN IA` por el nuevo panel IA. Definir la persistencia del contexto de borrador (estado cliente, **sin inventar retención** — OQ-20260820-06 permanece abierto), la invalidación/regeneración ante cambio de modalidad/problema, la trazabilidad (`audit_log` POST) y los tests.

## 2. Alcance técnico

### Incluido

- Nuevo endpoint `POST /api/planeaciones/ia/contexto-problema` (F0, **sin** `[id]` porque la planeación aún no existe).
- Nuevo system prompt `SYSTEM_PROMPT_F0` en `services/ia/prompts.ts`.
- Helper puro de parse/validación de respuesta F0 (JSON + no-vacío).
- Nuevo componente cliente `components/ia/ia-contexto-problema-panel.tsx` (`IAContextoProblemaPanel`), instanciado en `renderContexto()`.
- Eliminación/reemplazo del panel estático (`sugerencias-ia.tsx` y `sugerencias-data.ts`).
- `audit_log` POST con contrato §6.1.1 (endpoint `planeaciones_contexto_problema`).
- Tests unit/integration/E2E (listados en §11).

### Excluido

- Persistencia server-side de borradores (retención = OQ-20260820-06, open; no se inventa).
- Pasos posteriores del wizard (banco, calendario, fases, campos, PDA, ejes) — la IA F0 aplica sólo al paso `Contexto`/`Problema`.
- Modificar F1/F2/F3 ni sus routes (inmutables, QA PASS).
- Inyectar `modalidad` en los prompts F1/F2/F3 (refinamiento diferido, ver §14 R-SC-3).
- Migraciones: ninguna nueva. `0020`/`0021` siguen pendientes de aplicación por Frank.
- Validación post-IA de PDA (D10-07: campos libres sin estructura PDA en este paso).
- Cache server-side para F0 (cada draft es distinto; sin cache, igual que F2).

## 3. Fuentes funcionales por ID

| ID funcional | Origen | Cómo se traduce |
|---|---|---|
| DEC-20260820-03 (modalidad) | `DECISIONS.md` | F0 recibe `modalidad` en body y el prompt la declara explícitamente. |
| DEC-20260820-03 (contexto acumulado) | `DECISIONS.md` | El draft (`problema/proposito/ajustes` + `modalidad`) se re-envía por cada POST F0; el panel mantiene coherencia entre regeneraciones. |
| DEC-20260820-03 (clic explícito) | `DECISIONS.md` | Tres propuestas con botón "Usar esta propuesta" independiente; no autocompleta. |
| DEC-20260820-03 (desactualizadas sin borrar aceptados) | `DECISIONS.md` | Snapshot `generadoCon`; badge "desactualizada" + regenerar; aceptados no se revierten. |
| P-PD9 (IA sólo sugiere) | `E20` | F0 no muta campos; la aceptación es callback al `FormState`. |
| D-FIN-13 (server-side + anonimizador + cero menores) | `E22` | Endpoint server-only; `anonymizeRequest` obligatorio; grep de no-lectura de tablas de alumnos/entrevista. |
| OQ-20260820-05 (answered) | `OPEN-QUESTIONS.md` | Propuesta → clic → llenar campo (no autocompletar). |
| OQ-20260820-06 (open) | `OPEN-QUESTIONS.md` | Se deja abierto; la SPEC **no** define retención de drafts. |

## 4. Modelo técnico (contratos, sin código de producción)

### 4.1 Arquitectura del flujo F0

```
Wizard (cliente) — IAContextoProblemaPanel
   │  POST /api/planeaciones/ia/contexto-problema
   │  body: { modalidad, problema_contexto, proposito?, ajustes_razonables?, nivel? }
   ▼
Next.js API Route (app/api/planeaciones/ia/contexto-problema/route.ts)
   │  1. getServerSession() → 401 si no auth
   │  2. checkRateLimit(docenteId, 'planeaciones_contexto_problema') → 429
   │  3. zod parse body → 422 NEM_PLANEACIONES_VALIDATION_ERROR
   │  4. findIrredactableField({ extras }) → 500 NEM_IA_ANONYMIZER_BLOCKED
   │  5. anonymizeRequest({ extras }) → user message anonimizado
   │  6. iaChat([system F0, user]) → { text, origen }
   │  7. parseRespuestaF0(text) → JSON | null (fallback_vacio si inválido o problema vacío)
   │  8. auditPostIA(cct=session.cct, endpoint='planeaciones_contexto_problema', method='POST', body_hash(userMsg), responseStatus)
   │  9. 200 { data: { problema_estructurado, proposito, ajustes_razonables, origen } }
   ▼
JSON { data } | { error: { code, message } }
```

- **`cct` para el audit:** `session.cct` (clave `cct.clave`), porque F0 no tiene fila DB de la que leerla. Es la misma fuente que `createPlaneacion` usa para insertar en `planeacion.cct`.
- **Sin RLS check de recurso** (no hay recurso); la autorización es la sesión del docente. Defensa en profundidad: el endpoint no lee ninguna tabla del tenant.

### 4.2 Módulos (firmas)

#### `services/ia/prompts.ts` (ampliar) — `SYSTEM_PROMPT_F0`

Plantilla estática (sin PII). Invariantes auditables:

- Eres un asistente pedagógico para docentes de preescolar mexicana (NEM, Fase 2).
- Dado: `modalidad` elegida + `problema contexto` (borrador) + `proposito`/`ajustes_razonables` parciales (pueden ir vacíos) + `nivel` (opcional).
- Devuelve **SOLO** JSON con la forma exacta:
  `{"problema_estructurado":"<texto>","proposito":"<texto>","ajustes_razonables":"<texto>"}`
  - `problema_estructurado`: reescritura del problema como pregunta detonadora clara y estructurada, coherente con la modalidad.
  - `proposito`: propósito pedagógico breve, coherente con el problema y la modalidad.
  - `ajustes_razonables`: 1 o más estrategias de inclusión razonables, coherentes con la modalidad.
- **NO** inventes PDA; **NO** menciones alumnos ni datos personales; **NO** agregues explicaciones, encabezados, viñetas ni markdown; responde SOLO el JSON.
- Longitud máxima de cada campo: problema ≤ 500 chars, propósito ≤ 500 chars, ajustes ≤ 700 chars.

#### `services/ia/validate.ts` (ampliar) — `parseRespuestaF0`

```ts
export interface F0Respuesta {
  problema_estructurado: string;
  proposito: string;
  ajustes_razonables: string;
}
export function parseRespuestaF0(texto: string | undefined): F0Respuesta | null;
```

- Extrae el primer objeto JSON del texto (tolera envoltura ```json ... ```), igual que F3.
- `null` si: JSON inválido **o** `problema_estructurado` vacío tras `trim()` (el problema es obligatorio; propósito/ajustes pueden venir vacíos y degradan a `''`).
- Normaliza: `proposito`/`ajustes_razonables` vacíos/ausentes → `''`. No muta PII (el caller ya anonimizó).
- No hace validación de PDA (D10-07).

### 4.3 Contrato del endpoint — `POST /api/planeaciones/ia/contexto-problema`

**Request body (zod):**

| Campo | Tipo | Req | Validación |
|---|---|---|---|
| `modalidad` | enum `['proyecto_comunitario','unidad_didactica','abj','rincones','centros_interes','taller_critico']` | sí | enum (misma lista que migración 0010 y `wizard-modalidad-data.ts`) |
| `problema_contexto` | string | sí | `min 1, max 1000` tras trim (permite borrador breve) |
| `proposito` | string | no | `max 1000` |
| `ajustes_razonables` | string | no | `max 1000` |
| `nivel` | enum `['preescolar','primaria','secundaria']` | no | contexto informativo; omitido si el grupo no lo define |

**Response 200:**

```json
{ "data": { "problema_estructurado": "...", "proposito": "...", "ajustes_razonables": "...", "origen": "ia" } }
```

- `origen ∈ ['ia','fallback_vacio']`. Si `fallback_vacio` → los tres campos `''`.

**Errores:**

| code | HTTP | Causa |
|---|---|---|
| `NEM_AUTH_UNAUTHORIZED` | 401 | No autenticado |
| `NEM_RATE_LIMIT_EXCEEDED` | 429 | >5 req/min; header `Retry-After` |
| `NEM_PLANEACIONES_VALIDATION_ERROR` | 422 | Body inválido (zod) |
| `NEM_IA_ANONYMIZER_BLOCKED` | 500 | PII irredactable (R-IA-10) |
| `NEM_INTERNAL_ERROR` | 500 | Error no clasificado; log + `X-Request-Id` |

### 4.4 Componente cliente — `IAContextoProblemaPanel`

**Firma (contrato):**

```ts
IAContextoProblemaPanel({
  modalidad: string;            // modalidad vigente del FormState
  problemaContexto: string;     // borrador actual
  proposito: string;            // borrador actual (puede ir vacío)
  ajustesRazonables: string;    // borrador actual (puede ir vacío)
  nivel: string | null;         // nivel educativo del grupo
  onApplyProblema: (texto: string) => void;
  onApplyProposito: (texto: string) => void;
  onApplyAjustes: (texto: string) => void;
}): JSX
```

**Estados (máquina):** `idle → loading → {success | fallback_vacio | error}`; por-campo `pending → accepted`.

- El botón "Pedir sugerencia" se **habilita sólo** si `problemaContexto.trim().length > 0` (no se llama con problema vacío; decisión técnica de UX coherente con DEC: la docente escribe el problema primero).
- `POST /api/planeaciones/ia/contexto-problema` con los 4 campos (más `proposito`/`ajustes_razonables`/`nivel` opcionales).
- **Render:** tres bloques (problema / propósito / ajustes), cada uno con su área de texto editable y su botón "Usar esta propuesta". El badge `origen` visible.
- **Aceptar (por campo):** llama `onApplyProblema`/`onApplyProposito`/`onApplyAjustes` con el texto (editable) de ese bloque y marca el bloque `accepted`. Los otros dos bloques **no** se autocompletan (P-PD9).
- **Snapshot `generadoCon`:** `{ modalidad, problemaContexto }` al recibir respuesta.
- **Desactualización:** si `generadoCon.modalidad !== modalidad` **o** `generadoCon.problemaContexto !== problemaContexto`, y aún hay bloques pendientes, se muestra badge "Posiblemente desactualizada" + botón "Regenerar". No se borran las propuestas pendientes ni se revierten los aceptados.
- **`fallback_vacio`:** mensaje "La IA no pudo generar una sugerencia ahora. Puedes escribir o editar manualmente." + bloques editables (no bloquea el flujo).
- **Errores:** 429 (Retry-After), 422, 500 anonymizer (mensaje de reformular, R-IA-10), 401/403 (recarga).
- **Anti-doble-submit:** botón deshabilitado en `loading` (ref o `disabled`).
- **Mobile-first:** bloques full-width; botones `size="sm"` (36px) consistente con el resto de paneles IA (F1/F2/F3, `ia-sugerencia-panel.tsx`). El objetivo de accesibilidad "touch target ≥44px" queda **diferido** al lote de pulido mobile (afecta a todos los paneles IA, no sólo F0) — ver §16 Cierre P3.

### 4.5 Wiring en el wizard

- `wizard-planeacion.tsx` `renderContexto()`: sustituir `<SugerenciasIA .../>` por `<IAContextoProblemaPanel modalidad={form.modalidad} problemaContexto={form.problemaContexto} proposito={form.proposito} ajustesRazonables={form.ajustesRazonables} nivel={nivel} onApplyProblema={(t)=>set('problemaContexto',t)} onApplyProposito={(t)=>set('proposito',t)} onApplyAjustes={(t)=>set('ajustesRazonables',t)} />`.
- El panel vive bajo el campo "Problema del contexto" (misma ubicación que hoy, `wizard-planeacion.tsx:388-393`). "Bajo el campo" se interpreta como **posición visual y de orden de lectura/tab** (el panel se renderiza después del `<Textarea id="problema">`, dentro del mismo bloque del campo, con `mt-3`); **no** exige ser hermano DOM estricto del `<div>` del campo. La asociación `Label htmlFor="problema" → Textarea id="problema"` permanece intacta. Ver §16 Cierre P3.
- **Persistencia final:** sin cambios; al "Guardar planeación", `createPlaneacion` persiste `problemaContexto`/`proposito`/`ajustesRazonables` ya aceptados (o escritos a mano).

## 5. Contratos afectados y protegidos

| Contrato | Estado |
|---|---|
| `audit_log` POST (§6.1.1 SPEC_TEC_07) | **Afectado (aditivo)** — nuevo `endpoint='planeaciones_contexto_problema'`. |
| RLS INSERT `audit_log` (`0021`, ADR-20260820-01) | **Protegido** — la política existente cubre el insert F0; no se crea otra. |
| F1/F2/F3 routes + `services/ia/client.ts` | **Protegido (inmutable)** — F0 sólo añade `prompts.ts` + `validate.ts` + route nuevo. |
| `lib/ia/anonymizer.ts` | **Protegido** — se usa `anonymizeRequest`/`findIrredactableField` existentes (shape `extras` ya soportado). |
| `createPlaneacion` | **Protegido** — la aceptación F0 no lo modifica; persiste los valores finales como hoy. |
| D-FIN-13 / cero datos de menores | **Protegido** — endpoint no lee tablas de alumnos/entrevista; anonimiza; server-only. |
| `AI_API_KEY` bundle (AC-23 SPEC_TEC_07) | **Protegido** — la UI es cliente; no hay `NEXT_PUBLIC_AI`. |

## 6. Trazabilidad

- **POST F0:** una fila `audit_log` por request que alcanza procesamiento, con `cct=session.cct`, `method='POST'`, `endpoint='planeaciones_contexto_problema'`, `body_hash=hashShort(userMsg anonimizado)`, `response_status ∈ {200, 422}`. Paths 401/429/422-`VALIDATION`/500-`ANONYMIZER_BLOCKED` **no** insertan (mismo criterio §6.1.1). Fail-loud: inspeccionar `{ error }`, `console.error`, no abortar la respuesta.
- **Aceptación:** client-side (rellena `FormState`); la persistencia final es `createPlaneacion`. No hay PATCH de aceptación F0 (no existe la planeación). Residual documentado: la provenance por campo de F0 no es persistente (sólo `audit_log` + fila `planeacion` final); cierre total en `0020`.
- **`ia_sugerencia` (0020, pendiente):** el `feature` check actual es `('F1','F2','F3','F_IA1')`; la extensión a `'F0'` se anota para cuando Frank autorice aplicar la migración (no se edita 0020 este turno).

## 7. Reglas e invariantes

1. **D-FIN-13 server-side:** llamada al proveedor sólo en el route; `AI_API_KEY` nunca al bundle.
2. **Cero datos de menores:** ningún path F0 lee `alumno`/`evaluacion_alumno`/`bitacora`/`entrevista_inicial_alumno`. Regla dura LFPDPPP / ADR-20260820-02 D9-05.
3. **Anonimización obligatoria:** todo string al proveedor pasa por `anonymizeRequest`; `findIrredactableField` antes.
4. **P-PD9 IA sólo sugiere:** F0 no muta campos; aceptación explícita por campo.
5. **P-PD8 (a nivel DB):** F0 no toca estructura NEM; `createPlaneacion` sigue validando los campos finales.
6. **Proveedor único sin fallback:** degradación graceful `fallback_vacio`, sin reintentos, sin segundo proveedor.
7. **Rate-limit:** 5 req/min por docente en el endpoint F0 (contabilizado en el mismo bucket `/ia/*`; ver SPEC_TEC_03 §7.1).
8. **Timeout:** `AI_TIMEOUT_MS ?? 8000`; si aborta → `fallback_vacio`.
9. **Sin persistencia de drafts:** F0 no crea ni actualiza ninguna tabla; OQ-20260820-06 permanece open.
10. **Logs sin PII:** sólo prompt anonimizado + `requestId`, nunca `AI_API_KEY`.

## 8. Casos borde y errores

| Caso | Comportamiento |
|---|---|
| `AI_API_KEY` vacía / proveedor cae / timeout | 200 `origen:'fallback_vacio'`, tres campos `''`. |
| Respuesta no es JSON válido | 200 `fallback_vacio` (degradación, no 422). |
| JSON válido pero `problema_estructurado` vacío | 200 `fallback_vacio` (el problema es obligatorio). |
| `proposito`/`ajustes_razonables` vacíos en la respuesta | se normalizan a `''`; el cliente los muestra vacíos/editables. |
| Rate-limit excedido | 429 `NEM_RATE_LIMIT_EXCEEDED` + `Retry-After`. |
| Anonimizador detecta PII irredactable (R-IA-10) | 500 `NEM_IA_ANONYMIZER_BLOCKED`; no se llama al proveedor. |
| `modalidad` no en enum | 422 `NEM_PLANEACIONES_VALIDATION_ERROR`. |
| `problema_contexto` > 1000 chars | 422 `VALIDATION`. |
| `problema_contexto` vacío | 422 `VALIDATION` (el cliente, además, deshabilita el botón). |
| Docente cambia `modalidad` tras generar | propuestas pendientes → badge "desactualizada" + "Regenerar"; aceptadas no se borran. |
| Docente cambia `problema_contexto` tras generar | idem (snapshot `generadoCon.problemaContexto` difiere). |
| Docente cambia sólo `proposito`/`ajustes_razonables` | **no** invalida (DEC lista sólo modalidad y problema). |
| Docente edita una propuesta antes de aceptar | se aplica el texto editado (callback con el texto del área editable). |
| Docente recarga el wizard | el borrador y las propuestas se pierden (sin draft server-side; aceptado por OQ-20260820-06). |
| 2 clicks rápidos | botón deshabilitado en `loading` (anti-doble-submit). |
| Sesión expira en `loading` | 401 → mensaje "Recarga la página"; sin refresh silencioso. |

## 9. Seguridad, privacidad y permisos

- **Server-only:** `AI_*` sólo en el route; verificar con grep `NEXT_PUBLIC_AI` → 0 matches.
- **Sin datos de alumnos:** grep `from('alumno'|from('evaluacion_alumno'|from('bitacora'|from('entrevista_inicial_alumno'` en `app/api/planeaciones/ia/contexto-problema/**` y `services/ia/**` → 0 matches (verificable).
- **Anonimizador:** `lib/ia/anonymizer.ts` es el único camino al proveedor; cobertura 100% (SPEC_TEC_06 §6).
- **RLS del audit:** la fila POST usa `session.docenteId` + `session.cct`; persistencia real sujeta a `0021` aplicada (ADR-20260820-01); sin `0021`, fail-loud (no bloquea).
- **Prompt injection:** system prompt restringe a "responder SOLO el JSON"; el contenido del docente va en `user` message anonimizado.
- **Mobile (Tía Lola):** no se persisten propuestas en `localStorage`; viven en memoria del componente.

## 10. Migración/compatibilidad

- **Sin migraciones.** F0 no añade tablas/columnas. `0020`/`0021` siguen como artefactos pendientes de Frank.
- **Compatibilidad hacia atrás:** el panel nuevo sustituye al estático; `createPlaneacion` y las features F1/F2/F3 no cambian.
- **`sugerencias-data.ts`**: se elimina (dead code, único importador `wizard-planeacion.tsx`; verificado por grep). Si SOFIA prefiere conservarlo como seed no-IA, debe declararlo explícitamente en el IMPL-REPORT (la SPEC lo da por eliminado).

## 11. Criterios de aceptación (testables por construcción)

> SOFIA ejecuta las validaciones; INTEGRA define el QUÉ. Cada AC con comando + salida esperada.

### Endpoint F0 (unit + integration, mock proveedor `tests/helpers/mock-minimax.ts`)

- **AC-1:** `POST /api/planeaciones/ia/contexto-problema` con `{ "modalidad":"rincones","problema_contexto":"a los niños les cuesta compartir","nivel":"preescolar" }` y mock proveedor que devuelva JSON válido `{"problema_estructurado":"...","proposito":"...","ajustes_razonables":"..."}` → HTTP 200, `data.problema_estructurado`/`proposito`/`ajustes_razonables` no vacíos, `data.origen='ia'`.
- **AC-2:** mock proveedor devuelve JSON **inválido** (o texto no-JSON) → HTTP 200 `origen:'fallback_vacio'`, tres campos `''`.
- **AC-3:** mock proveedor devuelve JSON válido con `problema_estructurado:''` → HTTP 200 `origen:'fallback_vacio'`.
- **AC-4:** mock proveedor devuelve JSON válido con `proposito:''`/`ajustes_razonables:''` → HTTP 200 `origen:'ia'`, esos campos `''`, `problema_estructurado` presente.
- **AC-5:** `AI_API_KEY` vacía (sin mock) → HTTP 200 `origen:'fallback_vacio'` (no 5xx).
- **AC-6:** `modalidad:"no_existe"` → HTTP 422 `NEM_PLANEACIONES_VALIDATION_ERROR`.
- **AC-7:** `problema_contexto:""` → HTTP 422 `VALIDATION`.
- **AC-8:** 6 llamadas en 60s → la 6ª HTTP 429 `NEM_RATE_LIMIT_EXCEEDED` + `Retry-After`.
- **AC-9 (anonimización):** `problema_contexto` con nombre propio ("En el grupo de María López hay peleas") + spy del cliente IA → el `user` message no contiene "María López" (contiene `[NOMBRE]`).
- **AC-10 (trazabilidad):** flujo 200 éxito → exactamente **una** llamada a `audit_log.insert` con `cct=session.cct` (clave, no UUID), `method='POST'`, `endpoint='planeaciones_contexto_problema'`, `body_hash` hex no vacío derivado del user message **anonimizado** (el input del hash no contiene PII). El flujo 422 `VALIDATION`/429/500-anonymizer **no** inserta (0 llamadas).
- **AC-11 (cero datos de alumnos):** `grep -rE "from\('(alumno|evaluacion_alumno|bitacora|entrevista_inicial_alumno)'" app/api/planeaciones/ia/contexto-problema services/ia` → 0 matches.

### Panel cliente (unit, RTL)

- **AC-12:** con `problemaContexto` vacío, el botón "Pedir sugerencia" está deshabilitado.
- **AC-13:** click "Pedir sugerencia" → `fetch` a `/api/planeaciones/ia/contexto-problema` con body conteniendo `modalidad` y `problema_contexto` vigentes; el botón queda deshabilitado durante `loading` (segundo click no dispara 2º fetch).
- **AC-14 (P-PD9):** respuesta con 3 propuestas → **ningún** `onApply*` se llama automáticamente; al pulsar "Usar esta propuesta" en el bloque problema, sólo `onApplyProblema` se llama (proposito/ajustes intactos).
- **AC-15 (invalidación):** generar con `modalidad=A`, luego cambiar `modalidad` a `B` → badge "desactualizada" + botón "Regenerar" visibles; los `onApply*` ya aceptados **no** se revierten.
- **AC-16 (no invalidación por propósito):** cambiar sólo `proposito` tras generar → **no** aparece badge "desactualizada" (snapshot sólo compara modalidad y problema).

### E2E (Playwright)

- **AC-17:** `e2e/ia-f0.spec.ts` — flujo: abrir "Nueva planeación" → elegir modalidad → escribir problema → pedir sugerencia → 3 propuestas visibles → aceptar sólo problema → el campo `problema` se rellena y `proposito`/`ajustes` siguen vacíos → cambiar modalidad → propuestas pendientes marcadas desactualizadas y el problema aceptado permanece → "Guardar planeación" persiste con el problema aceptado.

### Cross-cutting

- **AC-18:** `pnpm typecheck` → 0 errores.
- **AC-19:** `pnpm lint` → 0 errores.
- **AC-20:** `pnpm test` → PASS (suite existente + nuevos F0).
- **AC-21:** `pnpm build` → PASS.
- **AC-22:** `grep -r "NEXT_PUBLIC_AI" app/ lib/ services/ components/` → 0 matches.
- **AC-23:** `grep -rE "openai|@upstash" package.json` → 0 matches (sin dependencias nuevas).
- **AC-24:** `grep -rn "sugerencias-data\|getSugerencias\|SugerenciasIA" components/ app/` → 0 matches (panel estático eliminado), salvo que SOFIA declare conservarlo como seed y lo justifique en IMPL-REPORT.

## 12. Validaciones detectadas y salida esperada

| Comando | Salida esperada |
|---|---|
| `pnpm typecheck` | 0 errores |
| `pnpm lint` | 0 errores |
| `pnpm test` | PASS (+ string `contexto-problema`/`ia-f0` en salida) |
| `pnpm build` | PASS |
| `pnpm exec playwright test e2e/ia-f0.spec.ts` | 1 passed (si Supabase/proveedor disponibles; si no, declarar NO EJECUTADA con razón — gate de staging) |
| `grep -r "NEXT_PUBLIC_AI" app/ lib/ services/ components/` | 0 matches |
| `grep -rE "openai|@upstash" package.json` | 0 matches |

## 13. Rollback recomendado (no ejecución)

- **Endpoint:** eliminar `app/api/planeaciones/ia/contexto-problema/route.ts` revierte F0.
- **Prompt/validate:** revertir `services/ia/prompts.ts` y `services/ia/validate.ts` al estado pre-F0 (aditivo).
- **UI:** revertir `wizard-planeacion.tsx` a `<SugerenciasIA/>` y restaurar `sugerencias-data.ts` / `sugerencias-ia.tsx` (si SOFIA los conservó en git; la SPEC los da por eliminados).
- **Tests:** eliminar `ia-f0` specs nuevos.
- Sin migraciones ni dependencias: rollback limpio.

## 14. Riesgos y pendientes

| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R-SC-1 | Sin persistencia de drafts: recargar el wizard pierde el borrador | Bajo (MVP) | Retention es decisión de Frank (OQ-20260820-06); no se inventa. |
| R-SC-2 | Provenance por campo de F0 no persistente (sólo `audit_log`) | Bajo | Cierre total en `0020`; coherente con F3. |
| R-SC-3 | F1/F2/F3 no inyectan `modalidad` en sus prompts (coherencia "sesiones/bloques" diferida) | Medio (valor futuro) | Refinamiento diferido; no bloquea el paso inicial. Ver §2 exclusiones. |
| R-SC-4 | Prompt injection desde `problema_contexto` del docente | Medio | System prompt restricto + anonimizador + parse JSON. |
| R-SC-5 | El proveedor devuelve texto ofensivo/inapropiado | Medio | System prompt con guardrails; la docente siempre decide aceptar (P-PD9). |
| R-SC-6 | Coste del proveedor (Tía Lola genera muchas veces) | Bajo | Rate-limit 5 req/min; sin cache (draft cambiante). |

## 15. DoD

- AC-1 a AC-24 PASS (AC-17 es gate de staging/producción; los unit/integration sí ejecutables en sandbox).
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- Cobertura `lib/ia/anonymizer.ts` = 100% (sin regresión), `services/ia/**` ≥90%.
- GEMINI emite `PASS` o `PASS_WITH_WARNINGS` (auditoría endpoint F0 + panel + no-IA ceros de alumnos + invalidación).
- 0 SPEC-GAP activo.
- Sin commits/push/deploys/migraciones aplicadas (restricción vigente).
- `PROYECTO.md` no existe en este repositorio (instrucción de Frank); la trazabilidad vive en ADR + SPEC + reportes IMPL + QA.
- `DONE` = verificado localmente; staging/producción son campos separados (requieren `0021` aplicada + vars IA en Vercel + OK Frank).

## 16. Cierre de hallazgos P3 (QA-20260820-05)

QA-20260820-05 (`PASS_WITH_WARNINGS`, P0=0/P1=0/P2=0/P3=2) auditó IMPL-20260820-06. INTEGRA, bajo ownership técnico de contrato/UI, decide **aceptar explícitamente** ambos P3 sin re-delegación a SOFIA. No se altera P-PD9, no se introduce mutación automática, F1/F2/F3 permanecen intactos (git diff vacío, QA §C). Detalle en `specs/CIERRE-P3-20260820-06.md`.

### 16.1 F0-P3-1 — botones `size="sm"` (36px) vs. target ≥44px → ACEPTADO

- **Motivo:** el `Button` del design system define `sm`=36px, `default`=40px, `lg`=44px (`components/ui/button.tsx:21-26`). Los paneles IA existentes (F1/F2/F3, `ia-sugerencia-panel.tsx`) usan `size="sm"` de forma consistente (6 ocurrencias). Forzar ≥44px sólo en F0 (`size="lg"`) rompería la consistencia visual; `size="default"` (40px) tampoco alcanzaría 44px.
- **Accesibilidad:** WCAG 2.5.5 (tamaño de objetivo ≥44px) es criterio AAA, no exigible en AA; los botones llevan `aria-label` y separación adecuada (`flex-wrap gap-2` + bloques full-width). Impacto residual bajo.
- **Contrato resultante:** §4.4 actualizado: botones `size="sm"` (36px) como norma de la familia IA; el upgrade "touch target ≥44px" se registra como trabajo diferido de pulido mobile **transversal** (afecta F1/F2/F3 también), no como fix puntual de F0.

### 16.2 F0-P3-2 — panel IA anidado dentro del contenedor del textarea vs. hermano DOM → ACEPTADO

- **Motivo:** el panel queda visualmente bajo el `<Textarea id="problema">` y en orden de lectura/tab correcto (se renderiza tras el textarea, `wizard-planeacion.tsx:388-399`, `mt-3`). La asociación `Label htmlFor="problema" → Textarea id="problema"` está intacta. Moverlo a hermano DOM estricto no tiene efecto observable (visual, AX ni semántico) y re-tocaría un archivo ya verificado por QA, sin beneficio.
- **Contrato resultante:** §4.5 aclarado: "bajo el campo" = posición visual/de lectura, no jerarquía DOM estricta.

### 16.3 Decisión de estado

- IMPL-20260820-06 pasa de `READY_FOR_VERIFYING` a **`DONE (listo para commit)`**: AC cubiertos, typecheck/lint/test/build PASS, 0 SPEC-GAP activo, GEMINI PASS_WITH_WARNINGS consumido, riesgos residuales registrados. Staging/producción NO implicados (gates de Frank).
- **El commit NO se ejecuta por INTEGRA** (acción destructiva → autorización explícita de Frank vía ATLAS). F0 queda "lista para commit".
- Residuales no bloqueantes ya conocidos: `0020`/`0021` pendientes de Frank, vars `AI_*` de Vercel, AC-17 E2E gate de staging, OQ-20260820-06 open.

### 16.4 Autoauditoría INTEGRA (cierre P3)

- [x] No implementé código ni hice commit/deploy; sólo SPEC/ADR/nota de cierre + handoff a ATLAS.
- [x] No debilité P-PD9 ni la no-mutación automática; F1/F2/F3 intactos (QA §C).
- [x] Aceptación explícita con razón para ambos P3, no silencio.
- [x] Conservé IDs: SPEC-20260820-10 (v1.1), ARCH-20260820-03, IMPL-20260820-06, QA-20260820-05.

---

## Autoauditoría INTEGRA

- [x] No inventé decisiones funcionales: DEC-20260820-03 y P-PD9 se traducen literalmente; OQ-20260820-06 queda open (no se define retención). El contexto de borrador como estado cliente es la lectura que no invade retención.
- [x] No generé ni edité código de producción: sólo SPEC markdown. Las firmas (§4) y el JSON de prompt son **contrato**, no archivos `.ts`/`.tsx`/`.sql`.
- [x] No declaré DONE: SPEC en DRAFT; implementación por SOFIA + re-auditoría GEMINI son gate.
- [x] Conservé IDs: SPEC-20260820-10, ARCH-20260820-03, E31, DEC-20260820-03, FND-20260820-07, OQ-20260820-05/06, P-PD8/P-PD9, D-FIN-13, Decisiones 1/2/5/9 ADR-02, R-IA-10.
- [x] No omití GEMINI: auditoría gate de DONE.
- [x] No paralelicé sin independencia: un solo handoff secuencial.
- [x] No usé Agent Manager; no commiteé, no pusheé, no desplegué, no apliqué migraciones, no toqué `.env` ni dependencias.

---

**Fin de SPEC_TEC_10.** Implementación delegable a SOFIA vía `specs/SPEC-HANDOFF-20260820-SOFIA-IA-CONTEXTO.md`.