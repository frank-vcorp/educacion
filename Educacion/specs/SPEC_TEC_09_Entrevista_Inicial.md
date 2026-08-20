# SPEC TEC 09 — Entrevista inicial del alumno (MVP)

- **ID:** SPEC-20260820-09
- **Versión:** 1.0
- **Fecha:** 2026-08-20
- **Estado:** ESPECIFICACIÓN TÉCNICA — lista para implementación. `DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD` RESUELTO (2026-08-20): A1 (aviso existente como gate definitivo), B1 (director sin acceso, default-deny permanente), C1+C2 (conservar durante el ciclo + archivar al finalizar), D1 (edición in-place, sin versionado). El modelo de datos, el cuestionario literal, la RLS de docente (y la exclusión permanente del director), el gate de aviso, la retención/archivado y el no-envío a IA están cerrados.
- **Autor:** INTEGRA
- **Audiencia:** SOFIA (implementación), GEMINI (auditoría), Frank (aprobación), ATLAS (resolución del GAP)

**Fuentes de verdad:**
- `discovery/DECISIONS.md` DEC-20260820-01 (entrevista inicial en MVP, plantilla literal).
- `discovery/FINDINGS.md` FND-20260820-06 (ampliación del perfil del alumno; nota de privacidad).
- `discovery/OPEN-QUESTIONS.md` OQ-20260820-03 (answered), OQ-20260820-04 (open, no inferir preguntas familiares).
- `discovery/BUSINESS-RULES.md` (entrevista ligada a grupo+ciclo, restringida a la docente, no se envía a IA por defecto).
- `discovery/SCENARIOS.md` SCN-20260820-04 (edición sin mezclar ciclos), SCN-20260820-05 (protegida frente a IA).
- `SPEC_MVP_01_Modulo_Docente.md` §4 (entidad Alumno, privacidad D-FIN-2/D-FIN-15).
- `specs/SPEC_TEC_02_Modelo_Datos.md` §5.3.4 (`alumno`), §5.3.5 (`aceptacion_aviso_privacidad`), §7 (RLS por CCT).
- `specs/ADR-20260820-02.md` (decisión arquitectónica de esta SPEC).
- Código observado: `services/alumnos/alumno-actions.ts:1-198`, `app/(app)/alumnos/alumnos-manager.tsx:1-401`, `supabase/migrations/0008_docente_director_grupo_alumno.sql:59-81`, `supabase/migrations/0014_rls_policies.sql:7,16,61-65`.

---

## 1. PROPÓSITO Y ALCANCE

Especificar la **entrevista inicial del niño** como capacidad MVP dentro del perfil del alumno: un formulario breve, ligado a un alumno concreto de un grupo y ciclo escolar, que reproduce **literalmente** la plantilla visual confirmada por Frank, registra la fecha de aplicación, es editable por la docente autorizada, permanece restringido a ella y **no se envía a funciones de IA por defecto**.

**En alcance (confirmado):**
- Una tabla `entrevista_inicial_alumno` con RLS por CCT, acceso de la docente propietaria. El director **no** tiene acceso (decisión funcional B1, default-deny permanente).
- El cuestionario literal de 21 ítems (§4) como contrato inmutable.
- Captura y edición de respuestas del niño con fecha de aplicación y estado (`borrador`/`completa`/`archivada`).
- Separación explícita niño/familia: **sólo** la entrevista del niño. La entrevista a madres/padres queda **fuera** de alcance (OQ-20260820-04 open).
- Garantía de no-envío a IA: ningún path de la capa IA lee esta tabla.
- Gate de captura: requiere `aceptacion_aviso_privacidad` previa (D-FIN-15) como gate definitivo (decisión funcional A1: aviso existente, sin aviso específico nuevo).
- Retención: conservar mientras exista el ciclo escolar; archivar al finalizar el ciclo (decisión funcional C1+C2). No `deleteEntrevista`.
- Edición: in-place con `updated_at`, sin versionado visible (decisión funcional D1).

**Fuera de alcance (no implementar en este incremento):**
- Entrevista a madres/padres (OQ-20260820-04 open). **No inferir ni agregar preguntas familiares.**
- Exportación de la entrevista a PDF.
- Historial de versiones por edición (decisión funcional D1: no se requiere).
- Uso de la entrevista como contexto de prompts de IA (prohibido en MVP; ver §9).
- Catálogo de preguntas configurable/editable: la plantilla es **literal e inmutable** (DEC-20260820-01).
- `deleteEntrevista` / borrado físico (decisión funcional C: conservar y archivar, no borrar).

**Resuelto (era bloqueado por DISCOVERY-GAP, cerrado 2026-08-20):**
- RLS del director: §8.3 — director sin acceso por decisión B1 (default-deny permanente, no conservador).
- Consentimiento/aviso: §9.2 — aviso existente como gate definitivo (A1).
- Retención/ciclo de vida: §10 — conservar durante ciclo + archivar al finalizar (C1+C2).

---

## 2. RESULTADO TÉCNICO ESPERADO

Una docente con sesión activa, grupo activo y aviso de privacidad aceptado puede, desde el perfil de un alumno de su grupo activo:
1. Abrir la sección "Entrevista inicial" del niño.
2. Capturar las 21 respuestas en el orden literal de la plantilla, sin que la app añada, quite, reordene o reescriba pregunta alguna.
3. Guardar la fecha de aplicación y un estado (`borrador`/`completa`/`archivada`).
4. Editar la entrevista del mismo ciclo sin crear duplicados ni mezclarla con otro ciclo (edición in-place, sin versionado visible).
5. Que sus datos **no** alimenten ninguna llamada a IA (verificación estática: cero lecturas de la tabla desde la capa IA).
6. Archivar la entrevista al finalizar el ciclo escolar (transición `completa`/`borrador` → `archivada`); no se borra.

El director **no** ve la entrevista (decisión funcional B1, default-deny permanente; §8.3).

---

## 3. DECISIONES ARQUITECTÓNICAS

Ver `ADR-20260820-02.md` para el razonamiento completo. Resumen:

- **D9-01 — Tabla dedicada, no columnas en `alumno`.** La entrevista es un agregado versionable por ciclo y separable del perfil permanente del alumno (BR: "no se mezcla con el perfil permanente"). Una tabla propia evita mutar `alumno` (que sólo lleva nombre+grado+ciclo, D-FIN-2) y permite soft-delete/retención diferenciados.
- **D9-02 — Cuestionario literal en `jsonb` con contrato JSON Schema.** Las 21 preguntas son inmutables (DEC-20260820-01). Se persisten como `respuestas jsonb` cuya estructura valida un JSON Schema que enumera los 21 ítems en orden con su texto literal. No se normalizan a 21 columnas (rompería "no sustituir preguntas" y acoplaría el schema a la plantilla). El texto de la pregunta se guarda como parte del contrato, no como dato editable.
- **D9-03 — Una entrevista del niño por alumno por ciclo.** Restricción de unicidad `(alumno_id, ciclo_escolar, tipo_entrevista='nino')`. Permite editar sin duplicar (SCN-20260820-04). El "versionado por ciclo" de OQ-20260820-03 se interpreta operativamente como esta unicidad. El historial de versiones múltiples fue **descartado** por decisión funcional D1 (edición in-place, sin versionado visible).
- **D9-04 — RLS por CCT, acceso docente; director sin acceso (decisión funcional B1).** Patrón canónico de `alumno` (`0014:61-63`). La docente propietaria opera `for all`. El director **no** tiene policy sobre esta tabla por decisión funcional confirmada por Frank (DISCOVERY-GAP ítem B = B1): RLS default-deny → el director nunca ve la entrevista. Es default-deny **permanente**, no conservador.
- **D9-05 — No-envío a IA por construcción.** Ningún route/service de la capa IA (`app/api/**/ia/*`, `services/ia/*`, `lib/ia/*`) lee `entrevista_inicial_alumno`. El `anonymizer` (R-IA-10, fail-closed) ya bloquea datos de alumnos; esta SPEC añade la garantía estática de que la tabla no es leída por ningún path IA.
- **D9-06 — Gate de captura = aviso existente (decisión funcional A1).** Reutiliza `aceptacion_aviso_privacidad` (D-FIN-15) como gate **definitivo** (no mínimo). Frank confirmó que el aviso existente cubre la captura de la entrevista, incluidos datos sensibles del menor y de terceros; no se requiere aviso/consentimiento específico nuevo.
- **D9-07 — Retención: conservar durante el ciclo + archivar al finalizar (decisión funcional C1+C2).** El `estado` admite `'archivada'`. No se expone `deleteEntrevista` (no borrar). Al finalizar el ciclo escolar la entrevista transiciona a `archivada` y permanece conservada. El disparador exacto del archivado (acción manual de la docente vs batch) es detalle de implementación reversible de SOFIA.
- **D9-08 — Edición in-place, sin versionado visible (decisión funcional D1).** Una entrevista del niño por alumno por ciclo, editable en sitio con `updated_at` + `estado`. No se crea tabla de versiones ni historial.

---

## 4. CUESTIONARIO LITERAL (contrato inmutable)

La plantilla se reproduce **exactamente** como la confirmó Frank en DEC-20260820-01. **No cambiar, resumir, reordenar ni sustituir.** El orden y el texto son contrato.

| orden | pregunta (literal) | naturaleza |
|---:|---|---|
| 1 | ¿Cómo te llamas? | abierta |
| 2 | ¿Cuántos años tienes? | abierta |
| 3 | ¿Cuántos hermanos tienes? ¿Cómo se llaman? | abierta (compuesta) |
| 4 | ¿Cómo se llama tu papá? | abierta |
| 5 | ¿Con quién vives en tu casa? | abierta |
| 6 | ¿Cómo se llama tu mamá? | abierta |
| 7 | ¿Cuál es tu color Favorito? | abierta |
| 8 | ¿Tienes mascota? ¿Qué animal es? ¿Cómo se llama? | abierta (compuesta) |
| 9 | ¿Cuál es tu comida favorita? | abierta |
| 10 | ¿Cuáles son tus frutas favoritas? | abierta |
| 11 | ¿Cuál es tu película (caricatura) favorita? | abierta |
| 12 | ¿A que te gusta jugar? ¿Con quién? | abierta (compuesta) |
| 13 | ¿Qué te hace feliz? | abierta (emocional) |
| 14 | ¿Qué te pone triste? | abierta (emocional) |
| 15 | ¿Qué te hace enojar? | abierta (emocional) |
| 16 | ¿Qué te da miedo? | abierta (emocional) |
| 17 | Observaciones: | abierta (uso docente) |
| 18 | Nombre del Alumno: | administrativa (derivable de `alumno.nombre`; se confirma en el formulario) |
| 19 | Grado: | administrativa (derivable de `alumno.grado`/`grupo.grado`) |
| 20 | Grupo: | administrativa (derivable de `grupo.grupo`) |
| 21 | Fecha de aplicación. | administrativa (= `fecha_aplicacion` del registro) |

**Notas de contrato:**
- Los ítems 18–21 son parte literal de la plantilla y **deben aparecer** en el formulario en ese orden. Los ítems 18–20 pueden pre-poblarse desde `alumno`/`grupo` y dejarse editables/confirmables; el ítem 21 se llena con la `fecha_aplicacion` del registro. No se omiten.
- Los ítems 3, 8 y 12 son compuestos (varias sub-preguntas en una sola línea). Se persisten como una sola respuesta de texto libre por ítem, respetando la literalidad de la línea; la UI puede ofrecer campos auxiliares pero el contrato almacena un valor textual por `orden`.
- La "F" mayúscula de "color Favorito" (ítem 7), "A que" sin tilde (ítem 12) y "película (caricatura) favorita" (ítem 11) son **literales**: el texto de la pregunta persistida debe ser idéntico al de esta tabla.

### 4.1 Contrato JSON Schema de `respuestas`

El campo `respuestas` es un `jsonb` que **debe** conformar el siguiente contrato (SOBIA implementa la validación con zod espejo en el server action; la BD no impone el JSON Schema en runtime para no acoplar la migración a un validador externo, pero la SPEC es el contrato verificable):

```json
{
  "type": "object",
  "required": ["items"],
  "additionalProperties": false,
  "properties": {
    "items": {
      "type": "array",
      "minItems": 21,
      "maxItems": 21,
      "items": {
        "type": "object",
        "required": ["orden", "pregunta", "respuesta"],
        "additionalProperties": false,
        "properties": {
          "orden": { "type": "integer", "minimum": 1, "maximum": 21 },
          "pregunta": { "type": "string" },
          "respuesta": { "type": "string", "maxLength": 1000 }
        }
      }
    }
  }
}
```

- El array `items` tiene **exactamente 21 elementos**, uno por ítem de la tabla §4, en orden ascendente por `orden` (1..21).
- `pregunta` es **inmutable**: SOFIA la genera desde la tabla §4 y la UI la muestra como texto no editable. Una auditoría puede comparar el `pregunta` persistido contra la tabla §4 (ver AC-7).
- `respuesta` es texto libre, máximo 1000 caracteres por ítem (suficiente para respuestas infantiles cortas; previene abuso/overflow). Para ítems compuestos, la docente redacta una sola cadena.

---

## 5. MODELO DE DATOS (contrato; SOFIA genera la migración `0022`)

Migración nueva: `supabase/migrations/0022_entrevista_inicial_alumno.sql` (**artefacto pendiente de aplicación**; `supabase db push` requiere autorización de Frank, mismo patrón que `0020`/`0021`). Reflejar también en `supabase/migrations_master.sql`.

### 5.1 Tabla `entrevista_inicial_alumno`

```sql
-- 0022_entrevista_inicial_alumno.sql (ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR supabase db push)
create table if not exists entrevista_inicial_alumno (
    id              uuid primary key default gen_random_uuid(),
    alumno_id       uuid not null references alumno(id) on delete cascade,
    grupo_id        uuid not null references grupo(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    ciclo_escolar   text not null,                         -- heredado del grupo al momento de crear
    tipo_entrevista text not null default 'nino'
                    check (tipo_entrevista in ('nino')),  -- 'familia' queda fuera (OQ-20260820-04); se añade al cerrarse
    respuestas      jsonb not null,                        -- contrato §4.1 (21 ítems literales)
    fecha_aplicacion date not null,                       -- ítem 21 de la plantilla
    estado          text not null default 'borrador'
                    check (estado in ('borrador','completa','archivada')),  -- D9-07: 'archivada' al finalizar el ciclo (decisión funcional C1+C2)
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (alumno_id, ciclo_escolar, tipo_entrevista)    -- una entrevista del niño por alumno por ciclo (D9-03)
);

comment on table entrevista_inicial_alumno is
  'Entrevista inicial del niño (DEC-20260820-01). Ligada a alumno+grupo+ciclo. Cuestionario literal inmutable en respuestas jsonb (SPEC_TEC_09 §4). No se envía a IA por defecto (BR, SCN-20260820-05). Acceso restringido a la docente autorizada (RLS §8); el director NO tiene acceso por decisión funcional B1 (DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD resuelto). Retención: conservar durante el ciclo + archivar al finalizar (C1+C2); no deleteEntrevista (§10).';

create index if not exists idx_entrevista_alumno on entrevista_inicial_alumno(alumno_id);
create index if not exists idx_entrevista_docente on entrevista_inicial_alumno(docente_id);
create index if not exists idx_entrevista_grupo_ciclo on entrevista_inicial_alumno(grupo_id, ciclo_escolar);
```

### 5.2 Trigger `updated_at`

La tabla incluye `updated_at`; debe crear el trigger canónico `set_updated_at()` (función ya existente, `SPEC_TEC_02` §6.1):

```sql
create trigger trg_entrevista_updated before update on entrevista_inicial_alumno
  for each row execute function set_updated_at();
```

No crear trigger sobre `created_at` (es inmutable salvo el `default now()`).

### 5.3 Convenciones respetadas

- `snake_case` singular (SPEC_TEC_02 §2).
- PK `uuid default gen_random_uuid()` (oculta contadores).
- FKs con `on delete cascade` desde `alumno`/`grupo`/`docente` (consistente con el soft-delete de `alumno`: si el alumno se inactiva con `activo=false` la fila se conserva; sólo un `delete` físico la borraría — la retención definida por Frank es C1+C2: conservar durante el ciclo + archivar al finalizar, no borrar; ver §10).
- Multi-tenant: `cct text not null references cct(clave)` para RLS directa (patrón `alumno`, `0008:64`).

---

## 6. SERVICIOS Y ACCIONES (contrato, no implementación)

SOBIA implementa server actions en `services/alumnos/entrevista-actions.ts` siguiendo el patrón de `services/alumnos/alumno-actions.ts` (`'use server'`, `createClient` de `@/lib/supabase/server`, `supabase.auth.getUser()`, validación zod, verificación de ownership, `revalidatePath`).

Firmas de contrato (SOBIA decide organización interna reversible):

- `getEntrevista(alumnoId): Promise<{ data: EntrevistaInicial | null; ok: boolean; error?: string }>`
  - Server-side. Sesión docente. RLS filtra por `docente_id = auth.uid() and cct = user_cct()`.
  - Devuelve la entrevista del ciclo activo del alumno (`tipo_entrevista='nino'`) o `null` si no existe.
  - Si el alumno no pertenece al grupo activo de la docente → `{ ok: false, error: 'Alumno no encontrado' }` (mismo mensaje que `alumno-actions.ts:120`, sin distinguir "no existe" de "no autorizado").

- `upsertEntrevista(input: { alumnoId; fechaAplicacion; estado; respuestas }): Promise<{ ok: boolean; error?: string; id?: string }>`
  - Valida con zod: `fechaAplicacion` (date válida), `estado` ∈ `{'borrador','completa'}`, `respuestas` contra el contrato §4.1 (21 ítems, orden 1..21, `pregunta` idéntica a §4 — ver AC-7, `respuesta` ≤1000 chars).
  - Gate: verifica `aceptacion_aviso_privacidad` previa de la docente (D-FIN-15). Si no existe registro de aceptación → `{ ok: false, error: 'Se requiere aceptar el aviso de privacidad antes de registrar la entrevista' }`.
  - Ownership: el `alumnoId` debe pertenecer al grupo activo de la docente (`alumno.docente_id = auth.uid()`, `alumno.cct = user_cct()`).
  - Upsert por `(alumno_id, ciclo_escolar, 'nino')`: si existe, actualiza `respuestas`/`fecha_aplicacion`/`estado` y `updated_at` se refresca vía trigger; si no, inserta con `ciclo_escolar` heredado del grupo, `grupo_id`/`docente_id`/`cct` del alumno.
  - No permite pasar `tipo_entrevista` desde el cliente (es siempre `'nino'`).

- `existeAvisoAceptado(supabase): Promise<boolean>` (helper interno, o reutiliza el existente si ya lo hay; si no existe, lo crea SOFIA en este archivo).
  - Verifica existencia de fila en `aceptacion_aviso_privacidad` para `docente_id = auth.uid()`.

- `archivarEntrevista(alumnoId): Promise<{ ok: boolean; error?: string }>`
  - Transiciona la entrevista del ciclo activo del alumno de `borrador`/`completa` → `archivada` (decisión funcional C1+C2: archivar al finalizar el ciclo; no borrar).
  - Sesión docente, RLS filtra por `docente_id = auth.uid() and cct = user_cct()`. Ownership: `alumnoId` debe pertenecer al grupo activo de la docente.
  - Una entrevista `archivada` permanece conservada (lectura permitida para la docente; no editable ni borrable por este action).
  - El disparador exacto (acción manual de la docente al cerrar ciclo vs batch automático) es decisión reversible de SOFIA; la SPEC sólo exige el contrato del action y el estado `archivada`.

**No implementar** un `deleteEntrevista`: la retención definida por Frank es conservar + archivar (C1+C2), no borrar (§10).

---

## 7. UI (contrato de comportamiento, no implementación)

Ubicación: ampliar el perfil del alumno. La UI actual es una lista CRUD (`app/(app)/alumnos/alumnos-manager.tsx`); SCN-20260820-04 requiere "abrir su perfil y registrar la entrevista". Contrato de comportamiento:

- Desde la fila de un alumno en `AlumnosManager`, acción "Entrevista inicial" abre un `Dialog` (o ruta `app/(app)/alumnos/[id]/page.tsx` — SOFIA decide, manteniendo P-UX1 "una pregunta/grupo por pantalla" con scroll vertical).
- El formulario renderiza los **21 ítems en orden literal** (§4). El texto de la pregunta es no editable. Cada ítem tiene un campo de respuesta (`Input`/`Textarea` según longitud esperada).
- Ítems 18–21 se pre-pueblan: 18 desde `alumno.nombre`, 19 desde `alumno.grado`, 20 desde `grupo.grupo`, 21 con la fecha de hoy (editable). Siguen apareciendo en orden y son editables/confirmables.
- Estados vacíos (P-UX7): si el alumno no tiene entrevista, mostrar "Registra la entrevista inicial de {nombre}" con CTA.
- Anti-doble-submit: botón "Guardar" deshabilitado durante `isPending` (patrón de `alumnos-manager.tsx`).
- Mobile-first (P-UX4): usable a 375×812 sin scroll horizontal; botones ≥44px.
- Sin emojis en UI de producto (P-UX), sin gamificación.
- Tras guardar, `revalidatePath('/alumnos')` y feedback visual (toast/inline).
- Accesibilidad WCAG 2.1 AA (labels asociados a inputs, navegación por teclado).

**No implementar** exportación a PDF de la entrevista (fuera de alcance).

---

## 8. SEGURIDAD, PRIVACIA Y RLS

### 8.1 RLS habilitada

```sql
alter table entrevista_inicial_alumno enable row level security;
```

### 8.2 Policy de docente (confirmada)

```sql
create policy "entrevista_docente_own" on entrevista_inicial_alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
```

Patrón idéntico a `alumno_docente_own` (`0014:61-63`) y `eval_docente_own` (`0014:96-98`). La docente sólo opera sus propias entrevistas, dentro de su CCT. `for all` permite SELECT/INSERT/UPDATE; DELETE queda cubierto por la policy pero el server action no expone delete (§6), y la retención definida por Frank es conservar + archivar (C1+C2).

### 8.3 Policy de director — NO se crea (decisión funcional B1)

`DEC-20260820-01` consecuencias y `BUSINESS-RULES.md` dicen "permanece restringida a la docente autorizada". **Frank confirmó (DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD, ítem B = B1, 2026-08-20): solo la docente responsable puede consultar/editar; el director NO tiene acceso.**

**Decisión:** RLS es default-deny; al no existir policy de director, el director no ve la entrevista. Esto es **permanente** (no default conservador). No se crea `entrevista_director_cct`:

```sql
-- NO crear. Decisión funcional B1 (DISCOVERY-GAP resuelto): el director no tiene acceso a la entrevista.
-- create policy "entrevista_director_cct" on entrevista_inicial_alumno
--   for select using (cct = user_cct() and is_director());  -- OMITIDA POR DECISIÓN FUNCIONAL
```

Si en el futuro Frank revierte B1, se añade la policy `for select` comentada arriba (contrato reversible, sin romper la existente).

### 8.4 Multi-tenant

La tabla lleva `cct` para RLS directa (no requiere JOIN), igual que `alumno`/`planeacion`/`entrega`. Doble defensa: RLS en BD + filtro explícito en el server action (`docente_id = auth.uid()`).

---

## 9. NO-ENVÍO A IA (SCN-20260820-05)

### 9.1 Garantía por construcción

- Ningún route handler de `app/api/**/ia/*`, ningún servicio de `services/ia/*` ni utilidad de `lib/ia/*` ejecuta un `SELECT`/`insert`/`.from('entrevista_inicial_alumno')`.
- El `anonymizer` (`lib/ia/anonymizer.ts`, R-IA-10 fail-closed) ya bloquea datos de alumnos (nombres, notas, observaciones) antes de cualquier llamada al proveedor. La entrevista es un subconjunto de "datos de alumnos" y queda cubierta por fail-closed.
- Esta SPEC añade la garantía **estática**: la tabla no es leída por la capa IA. Verificación por grep (AC-8).

### 9.2 Consentimiento (gate definitivo A1)

- **Gate definitivo (decisión funcional A1, 2026-08-20):** la captura requiere `aceptacion_aviso_privacidad` previa (D-FIN-15). Frank confirmó que el aviso **existente** cubre la captura de la entrevista, incluidos datos sensibles del menor (emociones, ítems 13–16) y datos de terceros (padre/madre/hermanos, ítems 3–6). No se requiere aviso/consentimiento específico nuevo. La captura queda **habilitada** para usuarios reales con el gate de aviso existente.
- Esta decisión cierra el ítem A del DISCOVERY-GAP.

### 9.3 Transferencia internacional

La entrevista no cruza al proveedor IA (§9.1). La política de transferencia internacional de D-FIN-13 no aplica a este dato porque no se envía.

---

## 10. RETENCIÓN Y CICLO DE VIDA (decisión funcional C1+C2, 2026-08-20)

Frank confirmó: **conservar mientras exista el ciclo escolar y archivar al finalizar el ciclo** (C1+C2). Traducción técnica:

- **Durante el ciclo escolar activo:** la entrevista está en `borrador`/`completa`, editable in-place (D1). No se borra.
- **Al finalizar el ciclo escolar:** la entrevista transiciona a `estado='archivada'` vía `archivarEntrevista(alumnoId)` (§6). Permanece conservada (no se borra). La docente puede leerla; no se expone `deleteEntrevista`.
- **No `deleteEntrevista`:** el borrado físico/soft-delete de entrevistas no se implementa. La FK `on delete cascade` sólo aplica si el alumno se borra físicamente (lo cual no ocurre en el flujo normal; `alumno.activo=false` es soft-delete y la fila de entrevista se conserva).
- **Al cambiar de grupo/ciclo:** el `unique (alumno_id, ciclo_escolar, 'nino')` garantiza una entrevista por alumno por ciclo; un nuevo ciclo permite una nueva entrevista sin afectar la archivada del ciclo anterior.
- **Disparador del archivado:** el QUÉ ("archivar al finalizar el ciclo") lo definió Frank. El CÓMO (acción manual de la docente vs batch al detectar cierre de ciclo) es detalle de implementación reversible de SOFIA; la SPEC exige el contrato del action `archivarEntrevista` y el estado `archivada`, no el mecanismo de scheduling.

---

## 11. MIGRACIÓN Y COMPATIBILIDAD

- Migración `0022` es **aditiva** (tabla nueva + RLS + índices + trigger). No toca `0001`–`0019` ni `0020`/`0021`.
- No requiere regenerar tipos de Supabase para que la app compile (`types/database.ts` es stub, `types/domain.ts` se puebla por módulo); SOFIA añade el tipo `EntrevistaInicial` en `types/domain.ts` o en un `types/entrevista.ts` (decisión reversible).
- Rollback recomendado (no ejecutar): `drop table if exists entrevista_inicial_alumno cascade;` (reversible; no afecta datos de otras tablas).

---

## 12. CRITERIOS DE ACEPTACIÓN (testeables por ejecución o análisis estático)

- **AC-1 (DDL):** `0022_entrevista_inicial_alumno.sql` y `migrations_master.sql` contienen `create table if not exists entrevista_inicial_alumno` con las columnas de §5.1 y el `unique (alumno_id, ciclo_escolar, tipo_entrevista)`. Verificación: `grep -n "entrevista_inicial_alumno" supabase/migrations/0022_entrevista_inicial_alumno.sql supabase/migrations_master.sql` → ≥1 match por archivo.
- **AC-2 (header pendiente):** `0022` declara "ARTEFACTO PENDIENTE DE APLICACIÓN". Verificación: `grep -n "PENDIENTE DE APLICACIÓN" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match.
- **AC-3 (trigger):** `0022` crea `trg_entrevista_updated` con `set_updated_at()`. Verificación: `grep -n "trg_entrevista_updated" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match.
- **AC-4 (RLS docente):** `0022` habilita RLS y crea `entrevista_docente_own` `for all using (docente_id = auth.uid() and cct = user_cct()) with check (...)`. Verificación: `grep -n "entrevista_docente_own" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match.
- **AC-5 (RLS director sin acceso — decisión funcional B1):** `0022` **no** crea policy `entrevista_director_cct` (permanente por decisión funcional confirmada por Frank: el director no tiene acceso). Verificación: `grep -n "entrevista_director_cct" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 0 matches. No es un bloqueo: es el contrato definitivo.
- **AC-6 (server actions):** `services/alumnos/entrevista-actions.ts` expone `getEntrevista` y `upsertEntrevista` con gate de `aceptacion_aviso_privacidad` y verificación de ownership. Comando: `pnpm typecheck` → 0 errores. Test unitario: `tests/unit/services/alumnos/entrevista-actions.spec.ts` cubre (a) sin aviso aceptado → error; (b) alumno ajeno → error "Alumno no encontrado"; (c) upsert crea y luego actualiza la misma fila (misma `(alumno_id, ciclo_escolar)`). Comando: `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **AC-7 (cuestionario literal):** el contrato zod en `entrevista-actions.ts` valida que `respuestas.items` tiene 21 elementos con `orden` 1..21 y que cada `pregunta` es idéntica a la tabla §4. Test: `tests/unit/services/alumnos/entrevista-actions.spec.ts` incluye un caso que envía 20 ítems → rechazo, y un caso que envía `pregunta` alterada → rechazo. Comando: `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **AC-8 (no-IA):** ningún archivo de `app/api/**/ia/*`, `services/ia/*`, `lib/ia/*` referencia `entrevista_inicial_alumno`. Verificación: `grep -rn "entrevista_inicial_alumno" app/api services/ia lib/ia` → 0 matches.
- **AC-9 (UI):** el formulario renderiza los 21 ítems en orden con texto no editable y pre-puebla ítems 18–21. Validación funcional: Playwright E2E en `e2e/entrevista-inicial.spec.ts` cubriendo: abrir perfil de alumno, ver 21 ítems en orden, editar respuesta del ítem 7, guardar, recargar y ver el valor persistido. Comando: `pnpm exec playwright test e2e/entrevista-inicial.spec.ts`. En sandbox sin Supabase: declarar NO EJECUTABLE (mismo patrón que AC-28 del handoff RLS-UI); ejecutable en staging.
- **AC-10 (mobile):** `playwright_browser_resize` 375×812 → captura sin overflow horizontal (validación visual).
- **AC-11 (archivado — decisión funcional C1+C2):** `0022` define `estado check (estado in ('borrador','completa','archivada'))` y `entrevista-actions.ts` expone `archivarEntrevista(alumnoId)` que transiciona `borrador`/`completa` → `archivada` (no expone `deleteEntrevista`). Verificación: `grep -n "archivada" supabase/migrations/0022_entrevista_inicial_alumno.sql` → ≥1 match; `grep -n "archivarEntrevista" services/alumnos/entrevista-actions.ts` → 1 match; `grep -n "deleteEntrevista" services/alumnos/entrevista-actions.ts` → 0 matches. Test unitario: caso que archiva una entrevista `completa` → pasa a `archivada`; caso que intenta archivar una ya `archivada` → no duplica / no error. `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **Gates globales:** `pnpm typecheck`/`lint`/`test`/`build` → 0 errores (0 warnings nuevos).

---

## 13. VALIDACIONES DETECTADAS Y SALIDA ESPERADA

- `pnpm typecheck` — 0 errores.
- `pnpm lint` — 0 errores (0 warnings nuevos).
- `pnpm test` — suite completa PASS (regresión 0) + nuevos tests de AC-6/AC-7.
- `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` — PASS.
- `pnpm exec playwright test e2e/entrevista-inicial.spec.ts` — declarar NO EJECUTABLE en sandbox sin Supabase; PASS en staging.
- `pnpm build` — PASS.
- `grep -rn "entrevista_inicial_alumno" app/api services/ia lib/ia` — 0 matches (AC-8).
- `grep -n "archivada" supabase/migrations/0022_entrevista_inicial_alumno.sql` — ≥1 match (AC-11).
- `grep -n "deleteEntrevista" services/alumnos/entrevista-actions.ts` — 0 matches (retención C: no borrar).
- `select polcmd, polname from pg_policies where tablename='entrevista_inicial_alumno';` (en Supabase real, gate de staging) → 1 policy `entrevista_docente_own` (`for all`); 0 policies de director (decisión B1, permanente).

---

## 14. RIESGOS Y PENDIENTES

- ~~**R9-1 (ALTO):** captura de datos sensibles del menor y de terceros sin aviso específico.~~ **CERRADO (A1, 2026-08-20):** Frank confirmó que el aviso existente (D-FIN-15) cubre la captura; no se requiere aviso específico. Captura habilitada con el gate existente.
- ~~**R9-2 (MEDIO):** visibilidad del director no decidida.~~ **CERRADO (B1, 2026-08-20):** el director no tiene acceso (default-deny permanente por decisión funcional).
- ~~**R9-3 (MEDIO):** retención no definida.~~ **CERRADO (C1+C2, 2026-08-20):** conservar durante el ciclo + archivar al finalizar; no borrar.
- ~~**R9-4 (BAJO):** modelado de edición in-place vs. historial.~~ **CERRADO (D1, 2026-08-20):** edición in-place, sin versionado visible.
- **R9-5 (BAJO):** `respuestas` en `jsonb` no valida el JSON Schema en runtime en BD. Mitigación: validación zod en el server action (AC-7) + auditoría comparativa de `pregunta` contra §4.
- **R9-6 (BAJO):** el disparador exacto del archivado (manual vs batch) queda como decisión reversible de SOFIA. Mitigación: la SPEC exige el contrato del action `archivarEntrevista` y el estado `archivada`; el mecanismo de scheduling no es contractual.

---

## 15. DOG

- AC-1..AC-11 PASS en sandbox (AC-5 = 0 matches del director por decisión funcional B1, permanente).
- AC-9 spec E2E creado; declarado NO EJECUTABLE en sandbox **O** PASS en staging.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD RESUELTO (A1, B1, C1+C2, D1, 2026-08-20). La captura queda habilitada para usuarios reales con el gate de aviso existente.
- Reporte `specs/IMPL-20260820-03_report.md` con manifiesto de archivos, criterios cubiertos, validaciones con comando+resultado, estado `READY_FOR_VERIFYING`.
- GEMINI audita: modelo de datos + RLS docente + no-IA (AC-8) + cuestionario literal (AC-7) + exclusión del director (AC-5) + archivado (AC-11).

---

## 16. TRAZABILIDAD

- **IDs funcionales:** DEC-20260820-01, FND-20260820-06, OQ-20260820-03, OQ-20260820-04, SCN-20260820-04, SCN-20260820-05, D-FIN-2, D-FIN-15.
- **IDs técnicos:** SPEC-20260820-09 (esta SPEC), ARCH-20260820-02 (ADR), IMPL-20260820-03 (handoff a SOFIA), DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD.
- **Cadena:** DEC-20260820-01 → SPEC_TEC_09 §4 (cuestionario) → AC-7 (literalidad) → IMPL-20260820-03 → QA (GEMINI).

---

**Fin de SPEC TEC 09.** DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD resuelto (A1, B1, C1+C2, D1, 2026-08-20): el cuestionario literal, la tabla, la RLS de docente (director excluido permanentemente), el gate de aviso existente, la retención/archivado, la edición in-place y el no-envío a IA están cerrados y son implementables.
