# SPEC TEC 11 — Entrevista familiar + contenedor conjunto "Entrevistas" (MVP)

- **ID:** SPEC-20260820-11
- **Versión:** 2.0 (supersede v1.0; **revisión 2026-08-21** por `DEC-20260821-01`)
- **Fecha:** 2026-08-20 (rev. 2026-08-21)
- **Estado:** ESPECIFICACIÓN TÉCNICA — **CAPTURA HABILITADA** (`READY_FOR_SOFIA`). Frank autorizó `DEC-20260821-01` (2026-08-21): maestras autorizadas pueden capturar la entrevista familiar para alumno/grupo/ciclo; el contrato de privacidad, visibilidad, retención, edición y firma queda cerrado con valores concretos (sin reinventar campos ni usos). Permanece intacto: cuestionario literal del PDF, separación de tablas, no-envío a IA, asociación alumno/grupo/ciclo y ubicación `Perfil del alumno → Entrevistas → Entrevista familiar` (separada de la infantil).
- **Autor:** INTEGRA
- **Audiencia:** SOFIA (implementación), GEMINI (auditoría), Frank (aprobación), ATLAS (orquestación)

**Fuentes de verdad:**
- `discovery/DECISIONS.md` **DEC-20260821-01** (cuestionario literal, captura por maestras autorizadas, ubicación separada, no-envío a IA, sin inventar campos/uso), DEC-20260820-04 (ubicación conjunta + separación funcional + relación alumno/grupo/ciclo + fuente familiar literal), DEC-20260820-05 (cuestionario infantil completo; referencia), DEC-20260820-02 (privacidad A1/B1/C1+C2/D1 de la infantil — **no se heredan automáticamente**; BR).
- `discovery/FINDINGS.md` FND-20260820-08 (datos de terceros en el cuestionario familiar; Frank autoriza captura con separación de tabla).
- `discovery/OPEN-QUESTIONS.md` OQ-20260820-07 (answered por DEC-20260821-01), OQ-20260820-04 (answered: no inferir; fuente literal).
- `discovery/BUSINESS-RULES.md` (sin mezclar respuestas/registros/permisos; no IA; no herencia automática).
- `discovery/SCENARIOS.md` SCN-20260820-08 (dos secciones separadas sin mezclar respuestas).
- `docx_extract/NUEVA ENTREVISTA.pdf` — **autoridad literal del texto §4** (cuestionario familiar, dos páginas).
- `specs/SPEC_TEC_09_Entrevista_Inicial.md` (patrón de la infantil; sin tocar).
- `specs/ADR-20260820-04.md` (D11-01..D11-06; este ADR supersede el bloqueo F-A..F-E con valores concretos — `DEC-20260821-01`).
- `specs/DISCOVERY-GAP-20260820-ENTREVISTA-FAMILIAR.md` (RESUELTO por `DEC-20260821-01`; F-A=aviso existente; F-B=docente/deny director; F-C=conservar+archivar; F-D=edición in-place; F-E=nombre tecleado de mamá/papá sin valor legal de firma manuscrita, sin imagen).
- Código observado (punto de entrada a extender, sin tocar la infantil): `app/(app)/alumnos/alumnos-manager.tsx:125-134,245-280` (botón "Entrevista"), `app/(app)/alumnos/entrevista-dialog-content.tsx:1-60` (contenedor actual — pasar a dos pestañas), `components/alumnos/entrevista-inicial-form.tsx:1-260` (infantil intacta), `services/alumnos/entrevista-actions.ts:1-304` (infantil intacta), `types/entrevista.ts:1-188` (infantil intacta), `supabase/migrations/0022_entrevista_inicial_alumno.sql` (infantil aplicada, **inmutable**), `supabase/migrations/0023_entrevista_inicial_completa.sql` (aditiva de la infantil, **inmutable**; `0024` queda libre para la familiar).

**Nota 2026-08-21 (INTEGRA):** la versión 1.0 de esta SPEC quedó bloqueada por `DISCOVERY-GAP-20260820-ENTREVISTA-FAMILIAR` (F-A..F-E). Frank cerró el GAP con `DEC-20260821-01` confirmando valores concretos para las cinco dimensiones y autorizando a maestras. La presente versión 2.0 sustituye el bloqueo por contrato ejecutable. La separación de tablas (D11-01), el cuestionario literal (D11-02), el contenedor conjunto (D11-03), el no-envío a IA (D11-04) y la no-herencia de decisiones de la infantil (D11-06) **se conservan** del v1.0; el cambio es que las dimensiones F-A..F-E ahora tienen valores firmes y la captura queda habilitada.

---

## 1. PROPÓSITO Y ALCANCE

Especificar la **entrevista familiar** dentro del contenedor `Perfil del alumno → Entrevistas`, como sección **separada** de la `Entrevista del niño` (ya implementada, `SPEC_TEC_09`), usando **exactamente** las preguntas y campos del documento `docx_extract/NUEVA ENTREVISTA.pdf`, ligada al mismo alumno/grupo/ciclo, capturable por maestras autorizadas, sin envío a IA, y conservando las decisiones de privacidad del perfil (default-deny al director, gate de aviso existente, conservación + archivado, edición in-place).

**En alcance (firmes tras DEC-20260821-01):**
- **Contenedor conjunto `Entrevistas`** con dos pestañas/secciones claramente separadas (`Entrevista del niño` y `Entrevista familiar`), ligadas al mismo alumno/grupo/ciclo (D11-03).
- **Tabla dedicada `entrevista_familiar_alumno`** (D11-01), **independiente** de `entrevista_inicial_alumno` (sin columna `tipo_entrevista`, sin fusión de RLS ni de retención).
- **Cuestionario familiar literal** (§4) reproducido exactamente, sin resumir, deduplicar, reordenar ni sustituir.
- **Captura por maestras autorizadas** para el alumno, grupo y ciclo escolar correspondientes (DEC-20260821-01).
- **Asociación alumno + grupo + ciclo + docente** (misma llave natural que la infantil, sin compartir tabla ni permisos).
- **Gate de aviso existente** (`aceptacion_aviso_privacidad`, D-FIN-15) como requisito previo a la captura (D11-07 — derivado de DEC-20260821-01; cierre de F-A).
- **RLS por CCT, acceso de la docente propietaria; director sin acceso** (B1, default-deny; cierre de F-B — coherente con la infantil y autorizado por DEC-20260821-01).
- **Retención: conservar durante el ciclo + archivar al finalizarlo** (C1+C2; cierre de F-C — coherente con la infantil y autorizado por DEC-20260821-01).
- **Edición in-place, sin versionado visible** (D1; cierre de F-D — coherente con la infantil y autorizado por DEC-20260821-01).
- **Firma**: nombre tecleado de mamá/papá como identificación del responsable del llenado, sin valor legal de firma manuscrita, sin captura de imagen (E1 — cierre de F-E; sin valor legal porque la fuente es una transcripción por la docente).
- **No-envío a IA** de **ninguna** respuesta, firma, teléfono, situación legal o dato familiar (D11-04, DEC-20260821-01).
- **Migración aditiva `0024_entrevista_familiar_alumno.sql`** (sin reescribir `0001`–`0023`; sin renumerar la `0023` de la infantil; `0023` aplicada e **inmutable**).

**Fuera de alcance (definitivo, no implementar):**
- Cambios al instrumento infantil (`entrevista_inicial_alumno`, cuestionario, tabla, RLS, actions, form) — permanece intacta.
- Exportación a PDF de cualquiera de las entrevistas.
- Catálogo de preguntas configurable/editable: ambos instrumentos son literales e inmutables.
- Uso de las entrevistas como contexto de prompts de IA (prohibido; §8).
- Historial de versiones por edición (D1; no se crea tabla de snapshots).
- `deleteEntrevista` (conservar + archivar; no borrar).
- Representación con valor legal de firma manuscrita (imagen, certificado, etc.) — E1 explícito.
- Inventar campos o usos adicionales no presentes en el PDF.

---

## 2. RESULTADO TÉCNICO ESPERADO

1. Desde el perfil/listado de un alumno, la docente abre `Entrevistas` y ve **dos pestañas** claramente separadas: `Entrevista del niño` (comportamiento actual intacto) y `Entrevista familiar`.
2. La pestaña `Entrevista familiar` permite a la **maestra autorizada** capturar la entrevista para el alumno/grupo/ciclo, **con el cuestionario literal** (§4) reproducido exactamente.
3. La entrevista familiar **solo es accesible** a la docente autorizada (RLS por CCT + ownership); el **director no tiene acceso** (B1; sin policy de director).
4. La captura exige el **aviso de privacidad aceptado** (gate `aceptacion_aviso_privacidad`); sin aviso, error de gate (mismo patrón que la infantil).
5. La entrevista es **editable en sitio** (D1) sin crear versiones visibles ni historial; se conserva durante el ciclo y se archiva al finalizarlo (`estado='archivada'`); no se borra (C1+C2).
6. La firma se registra como **nombre tecleado de mamá y papá** (E1), sin imagen ni valor legal de firma manuscrita; sin sobreescritura con valores no presentes en el PDF.
7. **Ningún** dato familiar (respuestas, teléfonos, situación legal, firma) entra a ninguna llamada de IA (D11-04; verificación por grep).

---

## 3. DECISIONES ARQUITECTÓNICAS

Ver `ADR-20260820-04.md` (revisado por DEC-20260821-01). Resumen:

- **D11-01 — Tabla dedicada `entrevista_familiar_alumno`** (no extender `entrevista_inicial_alumno`, sin columna `tipo_entrevista`). Independencia de cuestionario, RLS, gate, retención y firma; la separación es estructural y verificable.
- **D11-02 — Cuestionario literal en `respuestas jsonb` con contrato por bloques** (§4.2). No normalizar a columnas.
- **D11-03 — Contenedor conjunto "Entrevistas"** con dos pestañas; agrupación de UI únicamente, sin fusión de datos.
- **D11-04 — No-envío a IA extendido a la familiar** (espejo AC-8 + DEC-20260821-01).
- **D11-05 — Captura habilitada tras DEC-20260821-01.** Las cinco dimensiones F-A..F-E quedan cerradas con valores concretos (D11-07..D11-11); la migración aditiva `0024` es delegable.
- **D11-06 — No herencia automática de A1/B1/C1+C2/D1** (infantil) hacia la familiar. Por DEC-20260821-01, Frank **replica** las mismas reglas para esta versión inicial; cada reapertura debe documentarse como decisión funcional nueva (no herencia silenciosa).
- **D11-07 — Gate = aviso existente** (`aceptacion_aviso_privacidad`, D-FIN-15). Cierre de F-A.
- **D11-08 — RLS = `entrevista_familiar_docente_own` por CCT + docente; sin policy de director (default-deny).** Cierre de F-B.
- **D11-09 — Retención: conservar durante el ciclo + archivar al finalizarlo** (`estado='archivada'`); sin `deleteEntrevista`. Cierre de F-C.
- **D11-10 — Edición in-place, sin versionado visible.** Cierre de F-D.
- **D11-11 — Firma: nombre tecleado de mamá/papá (E1); sin imagen, sin valor legal de firma manuscrita.** Cierre de F-E.

---

## 4. CUESTIONARIO FAMILIAR LITERAL (contrato inmutable)

Fuente autoritativa: `docx_extract/NUEVA ENTREVISTA.pdf` — "JARDIN DE NIÑOS \"CELESTINO FREINET\" / CUESTIONARIO A PADRES DE FAMILIA". **No cambiar, resumir, reordenar, deduplicar ni sustituir.** El orden, la capitalización, los acentos y las peculiaridades observadas se preservan **tal cual** en el instrumento.

**Peculiaridades literales observadas (no corregir):**
- La numeración de `HABITOS FAMILIARES` **salta de 14 a 16** (no existe el ítem 15; conserva el salto).
- "escorar" en el ítem 13 (sic: "...en este ciclo escolar?" → "escorar", sic del PDF).
- "limites" sin tilde (ítems 10 y 11).
- Encabezados en mayúsculas sin tilde: `SITUACION LEGAL DE LA FAMILIA`, `HABITOS FAMILIARES`.
- `ocupación` con minúscula inicial (fila de la tabla MAMÁ/PAPÁ).
- Texto de cierre en mayúsculas con peculiaridades observadas en la fuente: `GRACIAS POR SU TIEMPO PARA CONTESTAR ESTE CUESTIONARIO.`; `LA INFORMACIÓN RECABADA SERVIRA AL DOCENTE PARA COMPRENDER ALGUNAS ACTITUDES DEL ALUMNO; PARA PLANEAR, VALORAR E INFORMAR PERTINENTEMENTE SOBRE LA ATENCION EDUCATIVA MAS ASERTIVA.` (tildes omitidas en el original; conservar).
- Bloques de firma: `NOMBRE Y FIRMA DE MAMÁ` y `NOMBRE Y FIRMA DE PAPÁ` (registro digital = nombre tecleado; D11-11).
- `¿con quién vive el alumno?` aparece como **casilla adjunta** al bloque de situación legal (no es una pregunta abierta suelta).

Si SOFIA detecta una discrepancia entre esta transcripción y el PDF, la reporta como `SPEC-GAP`/`DISCOVERY-GAP` y **no** normaliza silenciosamente.

### 4.1 Bloques y enunciados (transcripción literal del PDF)

**Bloque A — Encabezado e identificación.**
- Línea institucional: `JARDIN DE NIÑOS "CELESTINO FREINET"`.
- Título: `CUESTIONARIO A PADRES DE FAMILIA`.
- `NOMBRE DEL ALUMNO:` (texto libre; derivable de `alumno.nombre`, confirmable en el formulario).
- `FECHA DE NACIMIENTO:` (fecha `YYYY-MM-DD`).

**Bloque B — Datos de MAMÁ y PAPÁ** (tabla de 6 filas × 2 columnas MAMÁ/PAPÁ; etiquetas de fila literales):
| # | etiqueta (literal) | tipo |
|---|---|---|
| 1 | `Nombre` | texto |
| 2 | `Teléfono celular` | texto |
| 3 | `Edad` | texto |
| 4 | `Nivel de estudios` | texto |
| 5 | `ocupación` | texto (minúscula inicial, literal) |
| 6 | `Horario de trabajo` | texto |

**Bloque C — `SITUACION LEGAL DE LA FAMILIA`** (casillas booleanas; conserva el orden visual del PDF):
- Casilla 1: `casados`
- Casilla 2: `unión libre`
- Casilla 3: `¿con quién vive el alumno?` (texto libre adjunto; la pregunta sigue al grupo de casillas)
- Casilla 4: `divorciados`
- Casilla 5: `madre soltera`

Nota de modelado: las primeras dos casillas (`casados`, `unión libre`) y las dos últimas (`divorciados`, `madre soltera`) son opciones de estado civil; la casilla-pregunta `¿con quién vive el alumno?` adjunta un campo de texto libre. La agrupación exacta de las casillas se reproduce fiel al PDF.

**Bloque D — `EN CASO DE PADRES SEPARADOS RESPONDER LAS SIGUIENTES PREGUNTAS`** (condicional; se muestra cuando el bloque C no marca `casados`/`unión libre`; si está vacío o no aplica, el bloque entero queda en blanco pero **se persiste**):
- 1.- `¿quién tiene la patria potestad?` (texto libre).
- 2.- `¿convive con la otra parte (papá o mamá)?` (Sí/No) + sub-campo `si no es así, explique brevemente por qué?` (texto libre, multi-línea).

**Bloque E — `HABITOS FAMILIARES`** (ítems numerados, con salto 14→16 — sin 15; orden literal del PDF):
| # | enunciado (literal) | sub-campo adjunto (literal) |
|---:|---|---|
| 1 | `¿Cuántos hijos tienen?` | `¿Qué lugar ocupa el alumno?` |
| 2 | `¿después del horario de clases quien es responsable del alumno?` | — |
| 3 | `¿con quién duerme el alumno?` | `¿se viste solo?` |
| 4 | `¿Quién lo apoya en las tareas?` | `¿con quién juega?` |
| 5 | `¿qué aparatos tecnológicos utiliza el alumno? (computadora, video juegos, celular o Tablet) ¿Quién supervisa su uso?` | — |
| 6 | `¿Cuánto tiempo ve la televisión?` | `¿Qué programación le gusta?` |
| 7 | `¿su hijo tiene tareas de colaboración en casa? ¿Cuáles son?` | `¿si no las cumple, que ocurre?` |
| 8 | `¿tiene actividades extraescolares por la tarde? ¿Cuáles?` | — |
| 9 | `mencione las actividades que realizan en familia` | — |
| 10 | `¿Quién marca los limites y reglas en casa?` | — |
| 11 | `mencione 2 limites o reglas establecidas en casa para el menor` | — |
| 12 | `¿ustedes que consideran que se le dificulta a su hijo en el aprendizaje escolar?` | — |
| 13 | `¿Qué esperan que aprenda su hijo en este ciclo escorar?` | — |
| 14 | `¿Qué esperan de su maestra?` | — |
| 16 | `¿a qué se comprometen como padres de familia para lograr los aprendizajes de su hijo?` | — |

Nota: la numeración **no se renumera**; se conserva el salto 14→16. Los campos sin sub-campo siguen siendo preguntas abiertas con un único campo de respuesta.

**Bloque F — Cierre y firma.**
- `GRACIAS POR SU TIEMPO PARA CONTESTAR ESTE CUESTIONARIO.` (literal).
- `LA INFORMACIÓN RECABADA SERVIRA AL DOCENTE PARA COMPRENDER ALGUNAS ACTITUDES DEL ALUMNO; PARA PLANEAR, VALORAR E INFORMAR PERTINENTEMENTE SOBRE LA ATENCION EDUCATIVA MAS ASERTIVA.` (literal).
- `NOMBRE Y FIRMA DE MAMÁ` → campo `nombreMama` (texto libre, requerido si está firmado por la docente; D11-11).
- `NOMBRE Y FIRMA DE PAPÁ` → campo `nombrePapa` (texto libre, requerido si está firmado por la docente; D11-11).

### 4.2 Contrato JSON Schema de `respuestas` (por bloques, definitivo)

El campo `respuestas` será un `jsonb` que **debe** respetar los bloques §4.1. La BD no impone el JSON Schema en runtime (mismo criterio que SPEC_TEC_09 §4B); la garantía es validación zod server-side + auditoría comparativa. SOFIA implementa el zod espejo y los `validate*` literales antes del primer `INSERT`/`UPDATE`.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "identificacion",
    "mama",
    "papa",
    "situacionLegal",
    "padresSeparados",
    "habitosFamiliares",
    "cierre",
    "firmas"
  ],
  "properties": {
    "identificacion": {
      "type": "object",
      "required": ["nombreAlumno", "fechaNacimiento"],
      "additionalProperties": false,
      "properties": {
        "nombreAlumno": { "type": "string", "maxLength": 200 },
        "fechaNacimiento": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" }
      }
    },
    "mama": { "$ref": "#/$defs/datosProgenitor" },
    "papa": { "$ref": "#/$defs/datosProgenitor" },
    "situacionLegal": {
      "type": "object",
      "required": [
        "casados",
        "unionLibre",
        "divorciados",
        "madreSoltera",
        "conQuienVive"
      ],
      "additionalProperties": false,
      "properties": {
        "casados": { "type": "boolean" },
        "unionLibre": { "type": "boolean" },
        "divorciados": { "type": "boolean" },
        "madreSoltera": { "type": "boolean" },
        "conQuienVive": { "type": "string", "maxLength": 500 }
      }
    },
    "padresSeparados": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "required": ["patriaPotestad", "conviveOtraParte", "explicacion"],
      "properties": {
        "patriaPotestad": { "type": "string", "maxLength": 500 },
        "conviveOtraParte": { "type": "boolean" },
        "explicacion": { "type": "string", "maxLength": 1000 }
      }
    },
    "habitosFamiliares": {
      "type": "object",
      "required": ["items"],
      "additionalProperties": false,
      "properties": {
        "items": {
          "type": "array",
          "minItems": 15,
          "maxItems": 15,
          "items": {
            "type": "object",
            "required": ["orden", "pregunta", "subcampo", "respuesta", "respuestaSubcampo"],
            "additionalProperties": false,
            "properties": {
              "orden": { "type": "integer", "enum": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16] },
              "pregunta": { "type": "string" },
              "subcampo": { "type": ["string", "null"] },
              "respuesta": { "type": "string", "maxLength": 1500 },
              "respuestaSubcampo": { "type": ["string", "null"], "maxLength": 1500 }
            }
          }
        }
      }
    },
    "cierre": {
      "type": "object",
      "required": ["mensajeGracias", "mensajeRecabada"],
      "additionalProperties": false,
      "properties": {
        "mensajeGracias": { "const": "GRACIAS POR SU TIEMPO PARA CONTESTAR ESTE CUESTIONARIO." },
        "mensajeRecabada": { "const": "LA INFORMACIÓN RECABADA SERVIRA AL DOCENTE PARA COMPRENDER ALGUNAS ACTITUDES DEL ALUMNO; PARA PLANEAR, VALORAR E INFORMAR PERTINENTEMENTE SOBRE LA ATENCION EDUCATIVA MAS ASERTIVA." }
      }
    },
    "firmas": {
      "type": "object",
      "required": ["nombreMama", "nombrePapa"],
      "additionalProperties": false,
      "properties": {
        "nombreMama": { "type": "string", "maxLength": 200 },
        "nombrePapa": { "type": "string", "maxLength": 200 }
      }
    }
  },
  "$defs": {
    "datosProgenitor": {
      "type": "object",
      "required": [
        "nombre",
        "telefonoCelular",
        "edad",
        "nivelEstudios",
        "ocupacion",
        "horarioTrabajo"
      ],
      "additionalProperties": false,
      "properties": {
        "nombre": { "type": "string", "maxLength": 200 },
        "telefonoCelular": { "type": "string", "maxLength": 50 },
        "edad": { "type": "string", "maxLength": 20 },
        "nivelEstudios": { "type": "string", "maxLength": 200 },
        "ocupacion": { "type": "string", "maxLength": 200 },
        "horarioTrabajo": { "type": "string", "maxLength": 300 }
      }
    }
  }
}
```

Reglas del contrato:
- `habitosFamiliares.items` conserva el **orden y numeración literal** (1..14, 16; sin 15) y el `pregunta`/`subcampo` inmutables (§4.1 Bloque E). El `minItems`/`maxItems` es **15** (1,2,3,4,5,6,7,8,9,10,11,12,13,14,16); cualquier ítem fuera de ese conjunto o con `orden` distinto es rechazado por el zod.
- `padresSeparados` es `null` cuando no aplica (casillas `casados`/`unión libre` marcadas). El sub-campo `explicacion` corresponde al literal "si no es así, explique brevemente por qué?".
- `cierre.mensajeGracias` y `cierre.mensajeRecabada` son `const` (no editables; sirven de auditoría de literalidad del bloque F).
- `firmas.nombreMama` y `firmas.nombrePapa` son los nombres tecleados (D11-11, E1); no se persiste URL de imagen ni hash de firma manuscrita.
- `mama`/`papa` validan cada uno las 6 filas del bloque B con etiqueta textual (`nombre`, `teléfono celular`, etc.) en la **UI** (no se persisten las etiquetas — los nombres de campo son `nombre`/`telefonoCelular`/etc.; la UI muestra la etiqueta literal del PDF).

---

## 5. MODELO DE DATOS (contrato estructural, ejecutable; SOFIA crea `0024`)

Migración aditiva `supabase/migrations/0024_entrevista_familiar_alumno.sql`. **No** se reescriben ni se renumeran `0001`–`0023`. `0022` y `0023` (infantil) son **inmutables** (la primera aplicada; la segunda pendiente de autorización de Frank; ninguna se reescribe). `0024` **no** las toca.

### 5.1 Relieve estructural (D11-01) — contrato de `0024`

Tabla **dedicada** `entrevista_familiar_alumno`, **independiente** de `entrevista_inicial_alumno`:

- Columnas (alineadas con `0022` en convención; sin `tipo_entrevista`, sin acoplar a la infantil):
  - `id uuid primary key default gen_random_uuid()`
  - `alumno_id uuid not null references alumno(id) on delete cascade`
  - `grupo_id uuid not null references grupo(id) on delete cascade`
  - `docente_id uuid not null references docente(id) on delete cascade`
  - `cct text not null references cct(clave)`
  - `ciclo_escolar text not null` (heredado del grupo al momento de crear)
  - `respuestas jsonb not null` (contrato §4.2; esqueleto vacío por defecto)
  - `fecha_aplicacion date not null`
  - `estado text not null default 'borrador' check (estado in ('borrador','completa','archivada'))`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- `unique (alumno_id, ciclo_escolar)` — una entrevista familiar por alumno por ciclo (D11-10; edición in-place).
- Índices: `idx_entrevista_familiar_alumno`, `idx_entrevista_familiar_docente`, `idx_entrevista_familiar_grupo_ciclo`.
- Trigger: `trg_entrevista_familiar_updated` (función canónica `set_updated_at()` ya creada por `0015_triggers_updated_at.sql`).
- RLS habilitada (`alter table ... enable row level security`).
- Policy **única** `entrevista_familiar_docente_own`: `for all using (docente_id = auth.uid() and cct = user_cct()) with check (docente_id = auth.uid() and cct = user_cct())`. Patrón idéntico a `entrevista_docente_own` (`0022:61-64`).
- **Sin** policy de director (D11-08 / B1; default-deny permanente, espejo de la infantil `0022:66-72`).
- **Sin** `deleteEntrevista`; `archivarEntrevista` actualiza `estado='archivada'` (D11-09 / C1+C2).

### 5.2 Esqueleto literal por defecto de `respuestas`

`0024` define `default` con el esqueleto vacío del contrato §4.2 (estructura §4.2 con campos vacíos; `habitosFamiliares.items` con los 15 ítems `{orden, pregunta, subcampo, respuesta:'', respuestaSubcampo:null}`; `firmas.nombreMama`/`nombrePapa` vacíos; `padresSeparados=null`; `cierre` con `const` literales del bloque F). Este esqueleto es **interno** y no se muestra completo al usuario hasta que la docente introduce datos.

### 5.3 `comment on table`

`comment on table entrevista_familiar_alumno is 'Entrevista familiar (DEC-20260821-01). Ligada a alumno+grupo+ciclo. Cuestionario literal inmutable en respuestas jsonb (SPEC_TEC_11 §4). Separada de entrevista_inicial_alumno (D11-01). No se envía a IA por defecto (D11-04, BR). Acceso restringido a la docente autorizada (RLS §7); el director NO tiene acceso por B1/D11-08. Gate = aviso existente (D11-07). Retención: conservar durante el ciclo + archivar al finalizar (D11-09 / C1+C2); no deleteEntrevista. Firma = nombre tecleado de mamá/papá (D11-11 / E1); sin valor legal de firma manuscrita.';`

### 5.4 Compatibilidad

- `0024` es aditiva: no toca `entrevista_inicial_alumno`, `0001`–`0023`, índices únicos de otros dominios ni migraciones aplicadas.
- `migrations_master.sql` se actualiza añadiendo la sección `0024` (sin editar la sección `0023`).
- Rollback recomendado (no ejecutar): `drop table if exists entrevista_familiar_alumno cascade;` — reversible, no afecta la infantil ni migraciones anteriores.

---

## 6. UI (contrato de comportamiento, no implementación)

El contenedor `Entrevistas` (punto de entrada actual en `alumnos-manager.tsx:125-134`) abre dos pestañas/secciones separadas:

- **Pestaña `Entrevista del niño`**: reutiliza el contrato existente (`EntrevistaDialogContent` → `EntrevistaInicialForm`), **sin cambios** (comportamiento, gate, formulario v2 intactos).
- **Pestaña `Entrevista familiar`**: nuevo formulario que reproduce **exactamente** los bloques §4 (encabezado + identificación; tabla mamá/papá; situación legal con casillas; padres separados condicional; 15 ítems de hábitos familiares numerados con salto 14→16; cierre literal; bloques de firma con nombre tecleado). Los textos y números son **no editables** (la UI los muestra como etiquetas literales del PDF).

Contrato de comportamiento (P-UX):
- Dos pestañas/`Tabs` accesibles (WCAG 2.1 AA, navegación por teclado, labels asociados).
- Una pregunta/grupo por pantalla cuando el bloque es largo (P-UX1); mobile-first 375×812 sin scroll horizontal (P-UX4); botones ≥44px (o `size` del design system).
- Sin emojis, sin gamificación.
- Anti-doble-submit (botón deshabilitado durante `isPending`).
- Estados vacíos: "Registra la entrevista familiar de {nombre}" si no existe; si existe `archivada`, mostrar aviso de archivado y mantener lectura.
- La decisión de SOFIA sobre la ubicación física (dialog con tabs vs. ruta `app/(app)/alumnos/[id]/entrevistas`) es **reversible** y no cambia la separación lógica: dos pestañas, dos tablas, permisos independientes.
- La pestaña familiar **nunca** consulta `entrevista_inicial_alumno`; el formulario de la infantil **nunca** consulta `entrevista_familiar_alumno` (AC-FF6).

---

## 7. SEGURIDAD, PRIVACIDAD Y RLS

### 7.1 RLS habilitada por `0024`

`alter table entrevista_familiar_alumno enable row level security;`

### 7.2 Policy de docente (D11-08)

`drop policy if exists "entrevista_familiar_docente_own" on entrevista_familiar_alumno;`
`create policy "entrevista_familiar_docente_own" on entrevista_familiar_alumno`
`  for all using (docente_id = auth.uid() and cct = user_cct())`
`  with check (docente_id = auth.uid() and cct = user_cct());`

Patrón idéntico a `entrevista_docente_own` (`0022:61-64`) y `alumno_docente_own` (`0014:61-63`). `for all` cubre SELECT/INSERT/UPDATE; DELETE no se expone (§8) — la policy lo cubre pero el server action no expone `deleteEntrevista`.

### 7.3 Policy de director — NO se crea (D11-08 / B1)

Frank confirmó (DEC-20260821-01, cierre de F-B): solo la docente responsable consulta/edita; el director **no** tiene acceso. RLS default-deny → sin policy de director, el director no accede. Es **permanente** (no default conservador). No se crea `entrevista_familiar_director_cct`.

### 7.4 Multi-tenant y gate

- `cct` para RLS directa (patrón `alumno`/`entrevista_inicial_alumno`). Doble defensa: RLS + filtro explícito server-side.
- **Gate de captura (D11-07):** `aceptacion_aviso_privacidad` activa para el `cct` y el ciclo; el server action verifica la aceptación y rechaza con error de gate si falta (mismo patrón que `entrevista-actions.ts` para la infantil).

### 7.5 Restricción absoluta: no service-role key

Toda operación del usuario usa `createClient()` sesión-docente. Nada de service-role para selects/inserts/updates del docente.

---

## 8. NO-ENVÍO A IA (DEC-20260821-01)

- **Garantía estática:** ningún archivo de `app/api/**/ia/*`, `services/ia/*`, `lib/ia/*` lee `entrevista_familiar_alumno` ni `entrevista_inicial_alumno`. Verificación por grep (AC-FF4, AC-FF7).
- El `anonymizer` (`lib/ia/anonymizer.ts`, R-IA-10 fail-closed) ya bloquea datos de alumnos/familiares; la tabla familiar queda cubierta.
- Ninguna entrevista (niño NI familiar) entra como contexto de prompt. **Ninguna** respuesta, firma, teléfono, situación legal o dato familiar se envía a IA (DEC-20260821-01).

---

## 9. SERVICIOS Y ACCIONES (contrato, no implementación)

SOFIA crea `services/alumnos/entrevista-familiar-actions.ts` siguiendo el patrón de `entrevista-actions.ts` (`'use server'`, `createClient`, `auth.getUser()`, validación zod, ownership, `revalidatePath`). Firmas (definitivas, reversibles dentro del contrato):

- `getEntrevistaFamiliar(alumnoId): Promise<{ data: EntrevistaFamiliarV1 | null; ok: boolean; error?: string }>`
  - Devuelve la fila del ciclo activo. `null` si no existe.
  - Alumno fuera del grupo activo → `{ ok:false, error:'Alumno no encontrado' }` (mismo mensaje que la infantil).

- `upsertEntrevistaFamiliar(input: { alumnoId; fechaAplicacion; estado; respuestas }): Promise<{ ok: boolean; error?: string; id?: string }>`
  - zod valida: `fechaAplicacion` (date), `estado` ∈ `{'borrador','completa'}`, `respuestas` contra §4.2 (validación literal: 15 ítems con `orden` ∈ {1..14,16}; `pregunta` y `subcampo` idénticos a §4.1; `cierre.mensajeGracias`/`mensajeRecabada` como `const`; `firmas.nombreMama`/`nombrePapa` requeridos si `estado='completa'`).
  - **Validación literal:** `validateCuestionarioFamiliarV1` compara byte-a-byte cada `pregunta`/`subcampo`/`const` contra §4.1.
  - Gate D11-07 (`aceptacion_aviso_privacidad`), ownership (alumno del grupo activo + `docente_id=auth.uid()` + `cct=user_cct()`).
  - Upsert por `(alumno_id, ciclo_escolar)` (D11-10, edición in-place).
  - No `deleteEntrevistaFamiliar`.

- `archivarEntrevistaFamiliar(alumnoId)` — transiciona a `archivada` (D11-09). Idempotente. Sin borrado físico.

Tipos en `types/entrevista-familiar.ts` (nuevo): `EntrevistaFamiliarV1`, `RespuestasFamiliarV1`, `BloqueProgenitor`, `BloqueHabito`, `BloqueCierre`, `BloqueFirmas`, `validateCuestionarioFamiliarV1`, `buildRespuestasFamiliaresVaciasV1`.

---

## 10. RETENCIÓN Y EDICIÓN

- **Retención (D11-09 / C1+C2):** conservar durante el ciclo + archivar al finalizarlo (`estado='archivada'`). No se borra. Sin `deleteEntrevistaFamiliar`.
- **Edición (D11-10 / D1):** edición in-place; sin tabla de versiones ni historial visible. `unique (alumno_id, ciclo_escolar)` garantiza una entrevista familiar por alumno por ciclo; las correcciones se hacen sobre el mismo registro, conservando `updated_at` vía trigger `trg_entrevista_familiar_updated`.

---

## 11. MIGRACIÓN Y COMPATIBILIDAD

- **Migración aditiva `0024_entrevista_familiar_alumno.sql`** (D11-01, D11-05, D11-08, D11-09, D11-10): tabla nueva, columnas, índices, trigger, RLS, policy única de docente, sin policy de director, sin tocar `0001`–`0023`.
- `0001`–`0023` quedan **inmutables**; `0022` (aplicada) y `0023` (aditiva de la infantil, pendiente de Frank) **no se renumeran ni se reescriben**.
- `migrations_master.sql` se actualiza añadiendo la sección `0024` (sin editar las secciones anteriores).
- Tipos: `types/entrevista-familiar.ts` (nuevo) con el cuestionario literal y el zod espejo (§4.2).
- Rollback recomendado (no ejecutar): `drop table if exists entrevista_familiar_alumno cascade;` — reversible, no afecta la infantil ni migraciones anteriores.

---

## 12. CRITERIOS DE ACEPTACIÓN (testeables por ejecución o análisis estático)

**Literalidad (fuente §4):**
- **AC-FF1 (cuestionario literal):** el contrato zod de `respuestas` exige exactamente: bloque A (nombreAlumno + fechaNacimiento); bloque B (mamá/papá con 6 campos cada uno); bloque C (5 campos boolean + `conQuienVive`); bloque D (3 campos o null); bloque E (15 ítems con `orden` ∈ {1,2,3,4,5,6,7,8,9,10,11,12,13,14,16}); bloque F (2 `const` + 2 nombres). Comandos: `pnpm vitest run tests/unit/services/alumnos/entrevista-familiar-actions.spec.ts` — enviar cuestionario con orden de hábitos incorrecto (ej. {1..15}) → rechazo; con orden {1..14,16} → PASS; con pregunta alterada → rechazo; con `mensajeGracias`/`mensajeRecabada` alterados → rechazo. PASS.
- **AC-FF2 (peculiaridades conservadas):** `validateCuestionarioFamiliarV1` preserva: salto 14→16 (sin ítem 15), `escorar` (sic) en ítem 13, `limites` sin tilde en 10/11, `ocupación` con minúscula, `SITUACION LEGAL` / `HABITOS FAMILIARES` sin tilde, `NOMBRE Y FIRMA DE MAMÁ` / `NOMBRE Y FIRMA DE PAPÁ`. Test: comparación byte-a-byte contra §4.1. `pnpm vitest` → PASS.

**Modelo de datos:**
- **AC-FF3 (migración aditiva 0024):** `supabase/migrations/0024_entrevista_familiar_alumno.sql` contiene `create table if not exists entrevista_familiar_alumno (...)`, `alter table entrevista_familiar_alumno enable row level security`, `create policy "entrevista_familiar_docente_own" ...`, `create trigger trg_entrevista_familiar_updated ...`, y `comment on table ...`. Comandos: `grep -n "create table if not exists entrevista_familiar_alumno" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 1 match; `grep -n "0024" supabase/migrations_master.sql` → ≥1 match; `git diff -- supabase/migrations/0022_entrevista_inicial_alumno.sql supabase/migrations/0023_entrevista_inicial_completa.sql` → vacío (`0022`/`0023` inmutables).
- **AC-FF4 (RLS docente + director sin acceso D11-08):** `entrevista_familiar_docente_own` existe en `0024`; `entrevista_familiar_director_cct` **no** existe. Comandos: `grep -n "entrevista_familiar_docente_own" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 1 match; `grep -n "entrevista_familiar_director_cct" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0 matches; `grep -rn "entrevista_familiar_alumno" app/api services/ia lib/ia` → 0 matches (no-IA).

**Comportamiento / UI:**
- **AC-FF5 (contenedor con dos pestañas):** `Entrevistas` muestra dos pestañas `Entrevista del niño` y `Entrevista familiar`, ambas sobre el mismo alumno/grupo/ciclo. Validación funcional: Playwright E2E `e2e/entrevistas-contenedor.spec.ts` cubriendo abrir el contenedor, ver ambas pestañas y que la pestaña familiar muestra el cuestionario literal §4. `pnpm exec playwright test e2e/entrevistas-contenedor.spec.ts` → NO EJECUTABLE en sandbox sin Supabase; PASS en staging.
- **AC-FF6 (separación estricta):** `services/alumnos/entrevista-actions.ts` (infantil) **no** referencia `entrevista_familiar_alumno`; `services/alumnos/entrevista-familiar-actions.ts` (familiar) **no** referencia `entrevista_inicial_alumno`. Comandos: `grep -n "entrevista_familiar_alumno" services/alumnos/entrevista-actions.ts` → 0 matches; `grep -n "entrevista_inicial_alumno" services/alumnos/entrevista-familiar-actions.ts` → 0 matches.
- **AC-FF7 (no-IA):** `grep -rn "entrevista_inicial_alumno\|entrevista_familiar_alumno" app/api services/ia lib/ia` → 0 matches; `grep -rn "entrevista-familiar" app/api services/ia lib/ia` → 0 matches.
- **AC-FF8 (gate aviso D11-07):** sin `aceptacion_aviso_privacidad` activa → `upsertEntrevistaFamiliar` retorna error de gate (mismo mensaje que la infantil). Test: `pnpm vitest run tests/unit/services/alumnos/entrevista-familiar-actions.spec.ts` → caso sin aviso → error; caso con aviso → ok. PASS.
- **AC-FF9 (edición in-place D11-10):** `unique (alumno_id, ciclo_escolar)` evita duplicados; la segunda llamada `upsertEntrevistaFamiliar` para el mismo `(alumno, ciclo)` actualiza el mismo registro (`updated_at` se incrementa). Test: `pnpm vitest` → PASS.
- **AC-FF10 (archivado D11-09):** `archivarEntrevistaFamiliar` transiciona `estado` a `archivada`; no se ofrece `deleteEntrevistaFamiliar`; sin tabla de versiones. Comandos: `grep -n "deleteEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` → 0 matches; `grep -n "archivarEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` → 1 match; `grep -rn "entrevista_familiar.*version" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0 matches.
- **AC-FF11 (firma D11-11 / E1):** `firmas.nombreMama`/`nombrePapa` son strings (no URL ni hash); `0024` **no** crea columna de imagen de firma; `entrevista-familiar-actions.ts` **no** maneja upload. Comandos: `grep -rn "firma.*storage\|firma.*upload\|firma.*image" services/alumnos/entrevista-familiar-actions.ts` → 0 matches; `grep -n "firma_imagen\|firma_hash" supabase/migrations/0024_entrevista_familiar_alumno.sql` → 0 matches; `grep -n "nombreMama\|nombrePapa" services/alumnos/entrevista-familiar-actions.ts types/entrevista-familiar.ts` → ≥1 match por archivo.

**Gates globales:** `pnpm typecheck`/`lint`/`test`/`build` → 0 errores (0 warnings nuevos). La suite de la infantil sigue PASS (sin regresiones): `tests/unit/services/alumnos/entrevista-actions.spec.ts`, `tests/unit/components/entrevista-inicial-form.spec.tsx`.

---

## 13. VALIDACIONES DETECTADAS Y SALIDA ESPERADA

- `pnpm typecheck` — 0 errores.
- `pnpm lint` — 0 errores (0 warnings nuevos).
- `pnpm test` — suite completa PASS (regresión 0) + nuevos tests AC-FF1..AC-FF11.
- `pnpm vitest run tests/unit/services/alumnos/entrevista-familiar-actions.spec.ts tests/unit/components/entrevista-familiar-form.spec.tsx` — PASS.
- `pnpm exec playwright test e2e/entrevistas-contenedor.spec.ts` — declarar NO EJECUTABLE en sandbox sin Supabase; PASS en staging.
- `pnpm build` — PASS.
- `grep -rn "entrevista_inicial_alumno\|entrevista_familiar_alumno" app/api services/ia lib/ia` — 0 matches (AC-FF7).
- `grep -n "entrevista_familiar_alumno" services/alumnos/entrevista-actions.ts` — 0 matches (AC-FF6).
- `grep -n "entrevista_inicial_alumno" services/alumnos/entrevista-familiar-actions.ts` — 0 matches (AC-FF6).
- `grep -n "entrevista_familiar_docente_own" supabase/migrations/0024_entrevista_familiar_alumno.sql` — 1 match; `grep -n "entrevista_familiar_director_cct" supabase/migrations/0024_entrevista_familiar_alumno.sql` — 0 matches (AC-FF4).
- `grep -n "create table if not exists entrevista_familiar_alumno" supabase/migrations/0024_entrevista_familiar_alumno.sql` — 1 match (AC-FF3); `grep -n "0024" supabase/migrations_master.sql` — ≥1 match.
- `grep -n "deleteEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` — 0; `grep -n "archivarEntrevistaFamiliar" services/alumnos/entrevista-familiar-actions.ts` — 1 (AC-FF10).
- `grep -rn "firma.*storage\|firma.*upload\|firma.*image\|firma_imagen\|firma_hash" services supabase/migrations/0024_entrevista_familiar_alumno.sql` — 0 matches (AC-FF11).
- `git diff -- supabase/migrations/0022_entrevista_inicial_alumno.sql supabase/migrations/0023_entrevista_inicial_completa.sql` — vacío (0022/0023 inmutables).

---

## 14. RIESGOS Y PENDIENTES

- ~~R11-1..R11-2~~ (cerrados 2026-08-21): captura habilitada por DEC-20260821-01; F-A..F-E resueltos con valores concretos; no herencia automática documentada (D11-06).
- **R11-3 (MEDIO):** mezclado accidental entre tablas si se importa código cruzado. **Mitigación:** separación física (D11-01) + AC-FF6 (grep cruzado en ambos sentidos → 0 matches).
- **R11-4 (BAJO):** `respuestas jsonb` sin JSON Schema en runtime en BD. **Mitigación:** zod server-side + auditoría comparativa (AC-FF1/AC-FF2).
- **R11-5 (BAJO):** discrepancia de transcripción del cuestionario frente al PDF. **Mitigación:** el PDF es autoridad; cualquier discrepancia es `SPEC-GAP`/`DISCOVERY-GAP`, no normalización silenciosa.
- **R11-6 (BAJO):** el aviso de privacidad existente (D-FIN-15) ampara la entrevista familiar **por decisión de Frank (DEC-20260821-01)** sin redacción adicional. Si más adelante se requiere un consentimiento específico de titulares (teléfonos, situación legal, patria potestad), es una reapertura F-A que NO es herencia silenciosa (D11-06) y se documenta como decisión funcional nueva.
- **R11-7 (BAJO):** el nombre tecleado (E1) **no tiene valor legal de firma manuscrita**; si Frank requiere mayor robustez legal, es reapertura F-E como decisión nueva (no herencia).
- **Pendientes funcionales:** ninguno bloqueante para la captura autorizada. Cualquier ampliación de campos/usos requiere nueva decisión funcional vía ATLAS.

---

## 15. DOD (DoD)

- AC-FF1..AC-FF11 PASS en sandbox (AC-FF4 = director sin acceso; AC-FF7 = 0 matches no-IA).
- AC-FF5 spec E2E creado; declarado NO EJECUTABLE en sandbox **O** PASS en staging.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- Guardrails §5 verificados: `0022` y `0023` **sin cambios** (`git diff` vacío); `0024` aditiva con tabla propia, RLS única docente, sin policy de director, sin borrado físico; `supabase db push` NO ejecutado.
- Reporte `specs/IMPL-20260821-05_report.md` con manifiesto, criterios cubiertos, validaciones con comando+resultado, estado `READY_FOR_VERIFYING`.
- GEMINI audita: modelo de datos (AC-FF3), RLS docente + exclusión director (AC-FF4), no-IA (AC-FF7), literalidad 6 bloques (AC-FF1/AC-FF2), separación estricta (AC-FF6), gate aviso (AC-FF8), edición in-place (AC-FF9), archivado sin borrado (AC-FF10), firma como nombre tecleado (AC-FF11). **Obligatorio** (datos sensibles de menores y de terceros, RLS, tabla nueva).

---

## 16. TRAZABILIDAD

- **IDs funcionales:** **DEC-20260821-01** (cuestionario literal, captura por maestras, ubicación separada, no-envío a IA, sin inventar), DEC-20260820-04 (ubicación conjunta/separación), DEC-20260820-02 (privacidad infantil — referencia, no heredada), DEC-20260820-05 (cuestionario infantil completo — referencia), FND-20260820-08 (datos de terceros), OQ-20260820-07 (answered), OQ-20260820-04 (answered), SCN-20260820-08, BR (no mezcla/no-IA/no herencia), D-FIN-2, D-FIN-15.
- **IDs técnicos:** SPEC-20260820-11 (esta SPEC, **v2.0**), ARCH-20260820-04 (este ADR, revisado por DEC-20260821-01), IMPL-20260821-05 (handoff `READY_FOR_SOFIA`), DISCOVERY-GAP-20260820-ENTREVISTA-FAMILIAR (RESUELTO por DEC-20260821-01).
- **Cadena:** `Necesidad (DEC-20260821-01) → SPEC_TEC_11 §4 (cuestionario) + §5 (modelo) + §7 (RLS) + §9 (acciones) → IMPL-20260821-05 → QA (GEMINI obligatorio por datos sensibles y RLS)`.

---

**Fin de SPEC TEC 11 v2.0.** Cuestionario literal del PDF `NUEVA ENTREVISTA.pdf` (6 bloques, peculiaridades preservadas), tabla dedicada `entrevista_familiar_alumno`, migración aditiva `0024` (sin tocar `0001`–`0023`), RLS única de docente (director sin acceso, D11-08), gate de aviso existente (D11-07), retención conservar + archivar (D11-09), edición in-place (D11-10), firma como nombre tecleado de mamá/papá (D11-11, E1), no-envío a IA (D11-04). Captura habilitada por `DEC-20260821-01` (2026-08-21); sin reinvención de campos/uso.
