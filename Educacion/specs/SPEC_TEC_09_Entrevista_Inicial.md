# SPEC TEC 09 — Entrevista inicial del alumno (MVP)

- **ID:** SPEC-20260820-09
- **Versión:** 2.1 (supersede v1.0; **revisión 2026-08-20** por hallazgo operativo)
- **Fecha:** 2026-08-20 (rev. 2026-08-20)
- **Revisión 2026-08-20:** `0022_entrevista_inicial_alumno.sql` **ya está aplicada remotamente** (`supabase migration list` lo confirma) y la tabla **no tiene filas** (`select count(*) from public.entrevista_inicial_alumno` remoto → **0**). Se invalida la premisa original "reescribir `0022` / base vacía" y **se cierra la reconciliación v1→v2**: sin filas v1 no hay transformación que decidir. La evolución v1→v2 pasa a **migración aditiva `0023_entrevista_inicial_completa.sql`** (único cambio: añadir `directorio jsonb`), `0022` inmutable; la estructura v2 de `respuestas` se implementa en código, **sin backfill de filas existentes**. `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` **RESUELTO (Q1=0)**.
- **Estado:** ESPECIFICACIÓN TÉCNICA — **CUESTIONARIO v2**. `DEC-20260820-05` supersede el cuestionario de 21 ítems (`DEC-20260820-01`) y exige el documento completo `docx_extract/ENTREVISTA INICIAL.docx.pdf` (tres páginas). El contrato ahora especifica **tres bloques** (Entrevista inicial, Ambiente Familiar/Escuela con dibujos, y Directorio de emergencia), la representación de dibujos como evidencia (no preguntas) y el directorio como bloque sensible separado — sin mezclarlo con la entrevista familiar. Las decisiones de privacidad A1/B1/C1+C2/D1, la RLS de docente, la exclusión del director, el gate de aviso y el no-envío a IA permanecen vigentes.
- **Autor:** INTEGRA
- **Audiencia:** SOFIA (reimplementación), GEMINI (auditoría), Frank (aprobación), ATLAS (resolución de gaps)

**Fuentes de verdad:**
- `discovery/DECISIONS.md` **DEC-20260820-05** (cuestionario infantil completo, literal, tres bloques; supersede DEC-20260820-01), DEC-20260820-02 (privacidad A1/B1/C1+C2/D1), DEC-20260820-04 (ubicación conjunta y separación funcional familiar).
- `discovery/FINDINGS.md` FND-20260820-09 (la entrevista desplegada usa la versión incompleta de 21 preguntas; falta el documento completo), FND-20260820-06 (datos sensibles de menores/terceros).
- `discovery/OPEN-QUESTIONS.md` OQ-20260820-03 (answered), OQ-20260820-04 (open: no inferir preguntas familiares).
- `discovery/BUSINESS-RULES.md` (entrevista ligada a grupo+ciclo, restringida a la docente, no IA).
- `discovery/SCENARIOS.md` SCN-20260820-04 (edición sin mezclar ciclos), SCN-20260820-05 (protegida frente a IA), SCN-20260820-08 (dos secciones separadas con la familiar).
- `docx_extract/ENTREVISTA INICIAL.docx.pdf` — **autoridad literal del texto §4** (tres páginas).
- `SPEC_MVP_01_Modulo_Docente.md` §4 (entidad Alumno, privacidad D-FIN-2/D-FIN-15).
- `specs/SPEC_TEC_02_Modelo_Datos.md` §5.3.4 (`alumno`), §5.3.5 (`aceptacion_aviso_privacidad`), §7 (RLS por CCT).
- `specs/ADR-20260820-02.md` (decisiones estructurales D9-01/D9-03..D9-08 vigentes; el cuestionario D9-02 queda superseded por ADR-20260820-05).
- `specs/ADR-20260820-05.md` (cuestionario v2 en tres bloques, dibujos como evidencia, directorio separado; **revisado**: migración aditiva `0023`, `0022` inmutable, D9-13 **resuelta** — 0 filas v1).
- Código observado: `supabase/migrations/0022_entrevista_inicial_alumno.sql:1-73` (**aplicada remotamente, INMUTABLE** — no reescribir), `types/entrevista.ts:1-188` (v1, a reescribir), `services/alumnos/entrevista-actions.ts:1-304` (v1, a reescribir), `components/alumnos/entrevista-inicial-form.tsx:1-302` (v1, a reescribir), `app/(app)/alumnos/entrevista-dialog-content.tsx:1-60` (ajustar contrato v2). Migración nueva: `supabase/migrations/0023_entrevista_inicial_completa.sql` (a crear, **aditiva**).

---

## 1. PROPÓSITO Y ALCANCE

Especificar la **entrevista inicial del niño** como capacidad MVP dentro del perfil del alumno, reproduciendo **literalmente** el documento completo `docx_extract/ENTREVISTA INICIAL.docx.pdf` (tres páginas): el bloque inicial de preguntas, el bloque *Ambiente Familiar / Escuela* (con instrucciones de dibujo y preguntas) y el bloque *Directorio de emergencia* (teléfonos, padre, madre y dos familiares/parentescos). El formulario permanece ligado a un alumno concreto de un grupo y ciclo escolar, es editable por la docente autorizada, conserva el aviso existente como gate y **no se envía a IA**.

**En alcance (confirmado):**
- Una tabla `entrevista_inicial_alumno` con RLS por CCT y acceso de la docente propietaria; el director **no** tiene acceso (B1, default-deny permanente).
- **Cuestionario v2 en tres bloques** (§4): Entrevista inicial (23 ítems), Ambiente Familiar/Escuela (16 celdas: 2 instrucciones de dibujo + 14 preguntas) y Directorio de emergencia (4 contactos con teléfono). Literal e inmutable.
- **Dibujos como evidencia** (§4.4): las dos instrucciones de dibujo se representan como espacios de evidencia/dibujo, **no** como preguntas de texto (DEC-20260820-05).
- **Directorio como bloque sensible separado** (§4.3, §5): columna/jsonb propia, dentro de la entrevista del niño, **sin mezclarse** con la entrevista familiar (tabla distinta, SPEC_TEC_11).
- Captura y edición con fecha de aplicación y estado (`borrador`/`completa`/`archivada`).
- Separación explícita niño/familia: **sólo** la entrevista del niño. La entrevista familiar queda en `SPEC_TEC_11` (bloqueada por su propio GAP).
- Garantía de no-envío a IA extendida: ningún path de la capa IA lee `entrevista_inicial_alumno` (preguntas, dibujos ni directorio).
- Gate de captura: `aceptacion_aviso_privacidad` previa (A1, aviso existente).
- Retención: conservar durante el ciclo + archivar al finalizar (C1+C2). No `deleteEntrevista`.
- Edición in-place, sin versionado visible (D1).

**Fuera de alcance (no implementar en este incremento):**
- Entrevista a madres/padres (familia) — vive en `SPEC_TEC_11`, captura bloqueada por `DISCOVERY-GAP-20260820-ENTREVISTA-FAMILIAR` (F-A..F-E). **No inferir ni agregar preguntas familiares.**
- Exportación de la entrevista a PDF.
- Historial de versiones por edición (D1).
- Uso de la entrevista como contexto de prompts de IA (prohibido; §9).
- Catálogo de preguntas configurable/editable: la plantilla es **literal e inmutable** (DEC-20260820-05).
- `deleteEntrevista` / borrado físico (C1+C2: conservar + archivar, no borrar).

**Resuelto (privacidad infantil, cerrado 2026-08-20):** A1 (aviso existente como gate definitivo), B1 (director sin acceso, default-deny permanente), C1+C2 (conservar + archivar), D1 (edición in-place sin versionado). Estas decisiones **no** se heredan a la familiar (BR; D11-06).

---

## 2. RESULTADO TÉCNICO ESPERADO

Una docente con sesión activa, grupo activo y aviso de privacidad aceptado puede, desde el perfil de un alumno de su grupo activo:
1. Abrir la sección "Entrevista inicial" del niño.
2. Capturar los **tres bloques en el orden literal** del documento (§4), sin que la app añada, quite, reordene ni reescriba enunciado alguno: 23 preguntas del bloque inicial, 16 celdas del bloque Ambiente Familiar/Escuela (incluidas las 2 instrucciones de dibujo como carga de imagen/evidencia) y 4 contactos del directorio (nombre + teléfono).
3. Guardar la fecha de aplicación (`fecha_aplicacion`, heredada del encabezado "FECHA" del documento) y un estado (`borrador`/`completa`/`archivada`).
4. Editar la entrevista del mismo ciclo sin duplicarla ni mezclarla con otro ciclo (edición in-place).
5. Que sus datos (preguntas, dibujos y directorio) **no** alimenten ninguna llamada a IA (AC no-IA).
6. Archivar la entrevista al finalizar el ciclo (transición → `archivada`); no se borra.

El director **no** ve la entrevista (B1; §8.3).

---

## 3. DECISIONES ARQUITECTÓNICAS

Ver `ADR-20260820-02.md` (estructura/privacidad) y `ADR-20260820-05.md` (cuestionario v2). Resumen:

- **D9-01 — Tabla dedicada, no columnas en `alumno`.** Vigente.
- **D9-02 — Cuestionario literal en `jsonb`.** **MODIFICADA por ADR-20260820-05:** el contrato pasa de un array plano de 21 ítems a un objeto v2 de bloques (§4B.1). El principio (literalidad auditable, no normalizar a columnas) se conserva.
- **D9-03 — Una entrevista del niño por alumno por ciclo** (`unique (alumno_id, ciclo_escolar, tipo_entrevista='nino')`). Vigente.
- **D9-04 — RLS por CCT, acceso docente; director sin acceso (B1).** Vigente.
- **D9-05 — No-envío a IA por construcción.** Vigente y **extendido** al directorio y a las evidencias de dibujo (AC no-IA).
- **D9-06 — Gate de captura = aviso existente (A1).** Vigente.
- **D9-07 — Retención conservar + archivar (C1+C2).** Vigente.
- **D9-08 — Edición in-place, sin versionado visible (D1).** Vigente.
- **D9-09 (nueva) — Cuestionario v2 en tres bloques, transcripción literal del PDF** (`ADR-20260820-05`). `respuestas jsonb` pasa a `{ entrevista_inicial, ambiente_familiar_escuela }`; el directorio va en columna `directorio jsonb` propia.
- **D9-10 (nueva) — Dibujos como evidencia, no preguntas** (`ADR-20260820-05`). Las dos instrucciones son entradas `tipo:'dibujo'` con `instruccion` literal y un campo `evidencia` (imagen, `null` si no capturada). No se convierten en ítems de texto; el conteo de *preguntas* del bloque 2 es 14, no 16.
- **D9-11 (nueva) — Directorio como bloque sensible separado** (`ADR-20260820-05`). Columna `directorio jsonb` con 4 contactos (etiqueta literal + nombre + teléfono). Vive en la tabla de la entrevista del niño; **nunca** se fusiona con `entrevista_familiar_alumno` (tabla distinta, permisos y retención propios).
- **D9-12 (REVISADA 2026-08-20) — Migración aditiva `0023_entrevista_inicial_completa.sql`** (`ADR-20260820-05`). `0022` **ya está aplicada remotamente** → **inmutable** (no se reescribe ni renombra). El contrato v2 se materializa como migración **aditiva** `0023` que añade la columna `directorio jsonb` (`not null` + default) y preserva el DDL/RLS/trigger/`unique` ya aplicado por `0022`.
- **D9-13 (RESUELTA 2026-08-20) — Sin filas v1 ⇒ sin reconciliación** (`ADR-20260820-05`). El cambio de `respuestas` es de contenido (`{items:[21]}` → `{entrevista_inicial, ambiente_familiar_escuela}`), no de DDL. Confirmado operativamente que `entrevista_inicial_alumno` remota tiene **0 filas** (`select count(*)` = 0): no existen respuestas v1 que reconciliar, por lo que **no hay transformación** y las opciones O1-O4 no aplican (`DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` RESUELTO). Invariante técnica vigente: **no perder datos, no conjeturar conversión** (trivialmente satisfecha: no hay datos v1).

---

## 4. DOCUMENTO LITERAL (contrato inmutable)

Fuente autoritativa: `docx_extract/ENTREVISTA INICIAL.docx.pdf` (tres páginas). **No cambiar, resumir, reordenar, deduplicar ni corregir.** El orden, el texto, la capitalización, los acentos y las peculiaridades observadas se preservan **tal cual**.

### 4.0 Peculiaridades literales (no corregir)

- `JARDIN DE NIÑOS` — «JARDIN» sin tilde (sic). «NIÑOS» con Ñ.
- `ENTEVISTA AL ALUMNO` — sin la primera «R» (sic: ENTEVISTA, por ENTREVISTA).
- `¿con quien vives en tu casa?` — «con» minúscula y «quien» sin tilde.
- Iniciales minúsculas en bloque 1: `¿tienes mascotas?`, `¿te leen cuentos en casa?`, `¿te gusta venir a la escuela?`, `¿tienes teléfono o Tablet?`, `¿con quién juegas?`, `¿a qué te gusta jugar?`.
- `¿a qué te gusta jugar?` (bloque 1, «a» minúscula) **vs** `¿A qué te gusta jugar?` (bloque 2, «A» mayúscula): duplicado con capitalización distinta — conservar ambos.
- `¿tienes teléfono o Tablet?` — «Tablet» con T mayúscula.
- `¿te leen cuentos en casa?` y `¿Quién?` son dos ítems en la misma celda (conservar ambos, en ese orden).
- `¿tienes teléfono o Tablet?` y `¿Qué ves ahí?` comparten línea (conservar ambos como ítems separados, en ese orden).
- `DIRECTORIO CELESTINO FREINET 24-25` — ciclo «24-25» del documento fuente (sic).
- `2° “A”` — con comillas curvas y «°».
- `María Dolores Marín Pastrana` — nombre de la educadora en el documento fuente (sic).
- `Números telefónicos en caso de emergencia` — encabezado literal de la columna de teléfonos del directorio.
- `Nombre de familiar y parentesco` aparece **dos veces** (dos familiares) — conservar el duplicado.

**Duplicados textuales (conservar, no deduplicar):**
- `¿Cómo te llamas?` — bloque 1 (orden 1) y bloque 2 (fila 2, Ambiente Familiar).
- `¿Cuántos años tienes?` — bloque 1 (orden 2) y bloque 2 (fila 5, Ambiente Familiar).
- `¿Qué te gusta hacer en la escuela?` — bloque 1 (orden 19) y bloque 2 (fila 3, Escuela).
- `¿A qué te gusta jugar?` — bloque 1 (orden 9, «a» minúscula) y bloque 2 (fila 7, Ambiente Familiar, «A» mayúscula).

**No confundir (textualmente distintos, no son duplicados exactos):** `¿con quien vives en tu casa?` (bloque 1) y `¿Quién vive contigo?` (bloque 2) son redacciones distintas del mismo tema — se conservan ambas literales.

Si SOFIA detecta una discrepancia entre esta transcripción y el PDF, la reporta como `SPEC-GAP`/`DISCOVERY-GAP` y **no** normaliza silenciosamente.

### 4.1 Bloque 1 — Entrevista inicial (23 preguntas)

| orden | pregunta (literal) | naturaleza |
|---:|---|---|
| 1 | ¿Cómo te llamas? | abierta |
| 2 | ¿Cuántos años tienes? | abierta |
| 3 | ¿Cómo se llama tu mamá? | abierta |
| 4 | ¿Cómo se llama tu papá? | abierta |
| 5 | ¿Cuántos hermanos tienes? | abierta |
| 6 | ¿con quien vives en tu casa? | abierta |
| 7 | ¿tienes mascotas? | abierta |
| 8 | ¿Qué haces en casa cuando llegas de la escuela? | abierta |
| 9 | ¿a qué te gusta jugar? | abierta |
| 10 | ¿con quién juegas? | abierta |
| 11 | ¿Cuál es tu juguete favorito? | abierta |
| 12 | ¿te leen cuentos en casa? | abierta |
| 13 | ¿Quién? | abierta |
| 14 | ¿Cuál es tu cuento favorito? | abierta |
| 15 | ¿Qué te gusta ver en la televisión? | abierta |
| 16 | ¿tienes teléfono o Tablet? | abierta |
| 17 | ¿Qué ves ahí? | abierta |
| 18 | ¿te gusta venir a la escuela? | abierta |
| 19 | ¿Qué te gusta hacer en la escuela? | abierta |
| 20 | ¿Qué te pone alegre? | emocional |
| 21 | ¿Qué te pone triste? | emocional |
| 22 | ¿Qué te pone enojado? | emocional |
| 23 | ¿Qué te da miedo? | emocional |

### 4.2 Bloque 2 — Ambiente Familiar / Escuela (16 celdas = 8 filas × 2 columnas)

Encabezado del bloque (literal):
- Línea institucional: `JARDIN DE NIÑOS “CELESTINO FREINET”`.
- Título: `ENTEVISTA AL ALUMNO` (sic, sin la primera R).
- `FECHA: _______________________________` → se llena con `fecha_aplicacion` del registro.
- `NOMBRE DEL ALUMNO: ____________________` → derivable de `alumno.nombre`, confirmable en el formulario.

Dos columnas: `AMBIENTE FAMILIAR` (izquierda) y `ESCUELA` (derecha). Las filas se conservan en orden de lectura (zigzag izquierda→derecha por fila):

| fila | ambiente_familiar (izquierda) | escuela (derecha) | tipo |
|---:|---|---|---|
| 1 | Realiza un dibujo de cómo eres tú | Dibuja a tus mejores amigos en la escuela | dibujo |
| 2 | ¿Cómo te llamas? | ¿Te gusta la escuela? | pregunta |
| 3 | ¿Dónde vives? | ¿Qué te gusta hacer en la escuela? | pregunta |
| 4 | ¿Quién vive contigo? | ¿Qué te desagrada de la escuela? | pregunta |
| 5 | ¿Cuántos años tienes? | ¿Quiénes son tus mejores amigos en la escuela? | pregunta |
| 6 | ¿Qué haces cuando estás en tu casa? | ¿Alguien te molesta en el salón? | pregunta |
| 7 | ¿A qué te gusta jugar? | ¿Te agrada tu maestra? | pregunta |
| 8 | ¿Quién es tu persona favorita en casa? | ¿Eres feliz en la escuela? | pregunta |

- **La fila 1 (dibujos) son instrucciones de evidencia, no preguntas.** No se tratan como ítems de texto. El conteo de *preguntas* del bloque 2 es 14 (2 instrucciones de dibujo + 14 preguntas = 16 celdas).
- Cada celda de dibujo conserva su `instruccion` literal y admite una evidencia (imagen), `null` si aún no se captura (§4.4).

### 4.3 Bloque 3 — Directorio de emergencia

Encabezado del bloque (literal):
- Título: `DIRECTORIO CELESTINO FREINET 24-25`.
- Sub-título: `2° “A” Educadora: María Dolores Marín Pastrana` (sic).
- `NOMBRE DEL ALUMNO: ____________________` → derivable de `alumno.nombre`, confirmable en el formulario.
- Encabezado de columna de teléfonos: `Números telefónicos en caso de emergencia`.

Contactos (4, en orden; cada uno captura **nombre** y **teléfono de emergencia**):

| orden | etiqueta (literal, inmutable) | significado |
|---:|---|---|
| 1 | Nombre del padre | padre (nombre + teléfono) |
| 2 | Nombre de la madre | madre (nombre + teléfono) |
| 3 | Nombre de familiar y parentesco | familiar 1 (nombre + teléfono + parentesco) |
| 4 | Nombre de familiar y parentesco | familiar 2 (nombre + teléfono + parentesco) |

- La etiqueta `Nombre de familiar y parentesco` se repite dos veces (dos familiares distintos) — conservar.
- La columna `Números telefónicos en caso de emergencia` es el encabezado de la celda de teléfono de cada contacto; **no** es una pregunta abierta adicional.

### 4.4 Representación de dibujos/evidencias (sin inventar preguntas)

- Cada instrucción de dibujo es una entrada `tipo:'dibujo'` (no `tipo:'pregunta'`) con `instruccion` literal y `evidencia`.
- `evidencia`: `null` o un objeto `{ url, mime }`. `mime` restringido a imágenes (`image/jpeg`, `image/png`, `image/webp`).
- El dibujo se captura como **adjunto de imagen** en almacenamiento dedicado (Supabase Storage, bucket `entrevista-evidencia`), con acceso restringido a la docente propietaria (misma tenencia que la fila). No se usa texto libre como sustituto.
- La evidencia de dibujo **no** se envía a IA (la tabla entera está excluida por AC no-IA).
- No se inventa ninguna pregunta asociada a los dibujos (DEC-20260820-05: «las instrucciones de dibujo se representan como espacios de evidencia/dibujo, no como preguntas de texto»).

---

## 4B. CONTRATO JSON (v2)

El `respuestas` es `jsonb` con dos bloques (Entrevista inicial + Ambiente Familiar/Escuela) y el `directorio` es `jsonb` propio (bloque 3). La BD no impone JSON Schema en runtime (no acoplar la migración a un validador externo); la garantía es la validación zod espejo en el server action + auditoría comparativa.

### 4B.1 `respuestas` (bloques 1 y 2)

```json
{
  "type": "object",
  "required": ["entrevista_inicial", "ambiente_familiar_escuela"],
  "additionalProperties": false,
  "properties": {
    "entrevista_inicial": {
      "type": "object",
      "required": ["items"],
      "properties": {
        "items": {
          "type": "array",
          "minItems": 23,
          "maxItems": 23,
          "items": {
            "type": "object",
            "required": ["orden", "pregunta", "respuesta"],
            "additionalProperties": false,
            "properties": {
              "orden": { "type": "integer", "minimum": 1, "maximum": 23 },
              "pregunta": { "type": "string" },
              "respuesta": { "type": "string", "maxLength": 1000 }
            }
          }
        }
      }
    },
    "ambiente_familiar_escuela": {
      "type": "object",
      "required": ["encabezado", "celdas"],
      "additionalProperties": false,
      "properties": {
        "encabezado": {
          "type": "object",
          "required": ["lineaInstitucion", "titulo", "fecha", "nombreAlumno"],
          "properties": {
            "lineaInstitucion": { "const": "JARDIN DE NIÑOS “CELESTINO FREINET”" },
            "titulo": { "const": "ENTEVISTA AL ALUMNO" },
            "fecha": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
            "nombreAlumno": { "type": "string", "maxLength": 200 }
          }
        },
        "celdas": {
          "type": "array",
          "minItems": 16,
          "maxItems": 16,
          "items": {
            "oneOf": [
              {
                "type": "object",
                "description": "celda de dibujo (evidencia)",
                "required": ["orden", "columna", "tipo", "instruccion", "evidencia"],
                "additionalProperties": false,
                "properties": {
                  "orden": { "type": "integer", "minimum": 1, "maximum": 16 },
                  "columna": { "enum": ["ambiente_familiar", "escuela"] },
                  "tipo": { "const": "dibujo" },
                  "instruccion": { "type": "string" },
                  "evidencia": {
                    "type": ["object", "null"],
                    "properties": {
                      "url": { "type": "string" },
                      "mime": { "enum": ["image/jpeg", "image/png", "image/webp"] }
                    }
                  }
                }
              },
              {
                "type": "object",
                "description": "celda de pregunta",
                "required": ["orden", "columna", "tipo", "pregunta", "respuesta"],
                "additionalProperties": false,
                "properties": {
                  "orden": { "type": "integer", "minimum": 1, "maximum": 16 },
                  "columna": { "enum": ["ambiente_familiar", "escuela"] },
                  "tipo": { "const": "pregunta" },
                  "pregunta": { "type": "string" },
                  "respuesta": { "type": "string", "maxLength": 1000 }
                }
              }
            ]
          }
        }
      }
    }
  }
}
```

- `entrevista_inicial.items` tiene **exactamente 23 elementos** en orden 1..23 (§4.1).
- `ambiente_familiar_escuela.celdas` tiene **exactamente 16 celdas** en orden de lectura 1..16 (§4.2). Las celdas 1 y 2 son `tipo:'dibujo'` (fila 1: AF luego ESC); las celdas 3..16 son `tipo:'pregunta'` (fila 2: AF luego ESC; fila 3: AF luego ESC; …; fila 8: AF luego ESC). **Conteo: 2 dibujos + 14 preguntas = 16 celdas.**
- **Nota de modelado (D9-09):** el documento es una tabla de 8 filas × 2 columnas. El contrato serializa las 16 celdas en orden de lectura por fila (fila 1: AF luego ESC; fila 2: AF luego ESC; …), cada una con `columna` (`ambiente_familiar`|`escuela`). SOFIA puede representar internamente 8 filas con 2 celdas, siempre que el orden y el texto literal sean verificables contra §4.2 (AC literales). La decisión de representación interna es reversible; la literalidad no.
- `encabezado.lineaInstitucion` y `encabezado.titulo` son `const` (no editables). `encabezado.fecha` mapea `fecha_aplicacion`; `encabezado.nombreAlumno` mapea `alumno.nombre`.
- `pregunta`/`instruccion` son **inmutables**: se generan desde §4.1/§4.2 y la UI las muestra no editables. La auditoría compara el texto persistido contra las tablas §4 (AC literales).
- `respuesta` es texto libre con máximo 1000 caracteres por ítem.

### 4B.2 `directorio` (bloque 3)

```json
{
  "type": "object",
  "required": ["titulo", "subtitulo", "nombreAlumno", "encabezadoTelefonos", "contactos"],
  "additionalProperties": false,
  "properties": {
    "titulo": { "const": "DIRECTORIO CELESTINO FREINET 24-25" },
    "subtitulo": { "const": "2° “A” Educadora: María Dolores Marín Pastrana" },
    "nombreAlumno": { "type": "string", "maxLength": 200 },
    "encabezadoTelefonos": { "const": "Números telefónicos en caso de emergencia" },
    "contactos": {
      "type": "array",
      "minItems": 4,
      "maxItems": 4,
      "items": {
        "type": "object",
        "required": ["orden", "etiqueta", "nombre", "telefono"],
        "additionalProperties": false,
        "properties": {
          "orden": { "type": "integer", "minimum": 1, "maximum": 4 },
          "etiqueta": { "type": "string" },
          "nombre": { "type": "string", "maxLength": 200 },
          "telefono": { "type": "string", "maxLength": 50 }
        }
      }
    }
  }
}
```

- `titulo`, `subtitulo` y `encabezadoTelefonos` son `const` (no editables).
- `contactos` tiene **exactamente 4 elementos** con `etiqueta` literal inmutable (§4.3): `Nombre del padre`, `Nombre de la madre`, `Nombre de familiar y parentesco`, `Nombre de familiar y parentesco`.
- `nombre` captura el nombre de la persona; `telefono` captura el número de emergencia (columna `Números telefónicos en caso de emergencia`). Ambos texto libre.
- `nombreAlumno` es confirmable/derivable de `alumno.nombre`.

---

## 5. MODELO DE DATOS (contrato; SOFIA crea la migración aditiva `0023`; `0022` inmutable)

La tabla `entrevista_inicial_alumno` **ya existe** (aplicada por `0022` — hallazgo operativo 2026-08-20) con el DDL v1: `create table` (columnas `id`, `alumno_id`, `grupo_id`, `docente_id`, `cct`, `ciclo_escolar`, `tipo_entrevista`, `respuestas jsonb`, `fecha_aplicacion`, `estado`, `created_at`, `updated_at`), `unique (alumno_id, ciclo_escolar, tipo_entrevista)`, índices, trigger `trg_entrevista_updated` y RLS docente. **Ese DDL no se toca.**

La evolución v1→v2 se materializa en una **migración aditiva** `supabase/migrations/0023_entrevista_inicial_completa.sql` que añade la columna `directorio jsonb` con `not null` + default (esqueleto literal vacío). **No hay paso de reconciliación de `respuestas`**: confirmado operativamente que la tabla remota tiene **0 filas** (se cierra `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` con Q1=0), por lo que la estructura v2 de `respuestas` se implementa como **contrato nuevo en código**, sin backfill de filas existentes.

**Guardrails (obligatorios para SOFIA):**
- **No reescribir ni renombra** `0022` ni `0001`–`0021` (inmutables; `0022` ya aplicada).
- **No ejecutar** `supabase db push` (Frank autoriza la aplicación de `0023`).
- **No deducir ni aplicar una conversión de datos v1→v2** (D9-13, resuelta): confirmadas **0 filas** remotas, no existe conversión que hacer; `0023` **no** transforma `respuestas` (solo añade `directorio`).

### 5.1 Migración aditiva `0023_entrevista_inicial_completa.sql`

El bloque `directorio` es **firme** y el **único** cambio de `0023`. No hay bloque `respuestas` en la migración (0 filas v1 ⇒ sin transformación; la estructura v2 de `respuestas` se implementa en código). Contrato mínimo del archivo:

```sql
-- 0023_entrevista_inicial_completa.sql
-- SPEC_TEC_09 (SPEC-20260820-09) v2.1 + ADR-20260820-05 (D9-12 revisada, D9-13 resuelta Q1=0).
-- Migración ADITIVA sobre la tabla ya creada por 0022 (APLICADA, INMUTABLE).
-- ÚNICO CAMBIO: añadir la columna `directorio jsonb` (bloque 3, D9-11) con default (esqueleto literal
-- vacío) y `not null`. Se preserva el DDL/RLS/trigger/unique de 0022.
-- DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1 RESUELTO (Q1=0): 0 filas remotas ⇒ sin transformación
-- ni backfill de `respuestas` v1→v2. Este archivo NO toca `respuestas`.

-- Columna aditiva del directorio (esqueleto literal vacío; 0 filas existentes ⇒ sin backfill de filas):
alter table entrevista_inicial_alumno
  add column if not exists directorio jsonb not null
  default '{"titulo":"DIRECTORIO CELESTINO FREINET 24-25","subtitulo":"2° “A” Educadora: María Dolores Marín Pastrana","nombreAlumno":"","encabezadoTelefonos":"Números telefónicos en caso de emergencia","contactos":[{"orden":1,"etiqueta":"Nombre del padre","nombre":"","telefono":""},{"orden":2,"etiqueta":"Nombre de la madre","nombre":"","telefono":""},{"orden":3,"etiqueta":"Nombre de familiar y parentesco","nombre":"","telefono":""},{"orden":4,"etiqueta":"Nombre de familiar y parentesco","nombre":"","telefono":""}]}'::jsonb;
```

### 5.2 Trigger, RLS, índices y `unique` — NO se recrean (ya en `0022`)

`trg_entrevista_updated` (función canónica `set_updated_at()`), la policy `entrevista_docente_own`, los índices `idx_entrevista_*` y `unique (alumno_id, ciclo_escolar, tipo_entrevista)` ya están aplicados por `0022` (inmutable). `0023` **no** los recrea, no los altera ni los duplica:
- La policy de director **no** existe y `0023` **no** crea ninguna policy (B1) — la RLS default-deny de `0022` sigue vigente.
- SOFIA NO debe repetir estas definiciones en `0023`; si un entorno mostrara la tabla sin RLS/trigger, es un problema distinto a reportar (no se "repara" desde `0023` sin autorización).

### 5.3 Convenciones respetadas

- `snake_case` singular; PK/FK/`cct`/índices/trigger/RLS ya definidos en `0022` (patrón `alumno`).
- `directorio` es columna `jsonb` propia (D9-11), separada de `respuestas` y, sobre todo, **separada de `entrevista_familiar_alumno`** (tabla distinta en SPEC_TEC_11). No comparten permisos ni retención.

---

## 6. SERVICIOS Y ACCIONES (contrato, no implementación)

SOFIA reimplementa `services/alumnos/entrevista-actions.ts` siguiendo el patrón de `services/alumnos/alumno-actions.ts` (`'use server'`, `createClient`, `auth.getUser()`, validación zod, ownership, `revalidatePath`). Las firmas se mantienen; cambia el contrato validado (v2) y se añade el directorio.

- `getEntrevista(alumnoId): Promise<{ data: EntrevistaInicialV2 | null; ok: boolean; error?: string }>`
  - Devuelve la fila incluyendo `respuestas` (v2) y `directorio`, del ciclo activo (`tipo_entrevista='nino'`). `null` si no existe.
  - Alumno fuera del grupo activo → `{ ok:false, error:'Alumno no encontrado' }` (mismo mensaje).

- `upsertEntrevista(input: { alumnoId; fechaAplicacion; estado; respuestas; directorio }): Promise<{ ok: boolean; error?: string; id?: string }>`
  - zod valida: `fechaAplicacion` (date), `estado` ∈ `{'borrador','completa'}`, `respuestas` contra §4B.1 y `directorio` contra §4B.2.
  - **Validación literal v2:** `validateCuestionarioV2` comprueba 23 ítems (orden + `pregunta` idéntica a §4.1), 16 celdas (14 preguntas + 2 dibujos, orden, `instruccion`/`pregunta` idénticas a §4.2, `tipo` correcto) y 4 contactos del directorio (`etiqueta` idéntica a §4.3). El `const` de encabezados lo replica el zod espejo.
  - Gate A1 (`aceptacion_aviso_privacidad`), ownership (alumno del grupo activo), upsert por `(alumno_id, ciclo_escolar, 'nino')`.
  - `tipo_entrevista` siempre `'nino'` (server-side, no aceptado del cliente).
  - El directorio se persiste en la columna `directorio`; el build del objeto directorio con etiquetas literales lo arma el server action, el cliente solo envía `nombre`/`telefono` por contacto.

- `archivarEntrevista(alumnoId)` — transiciona a `archivada` (C1+C2). Sin `deleteEntrevista`. (Idéntico a v1.)

**No implementar** `deleteEntrevista`. **No** añadir `tipo_entrevista='familia'` aquí (SPEC_TEC_11).

---

## 7. UI (contrato de comportamiento, no implementación)

El formulario renderiza **tres bloques** en orden (§4):

- **Bloque 1 — Entrevista inicial:** 23 ítems con texto no editable, campo de respuesta por ítem.
- **Bloque 2 — Ambiente Familiar / Escuela:** encabezado (línea institucional + título no editables, `FECHA` y `NOMBRE DEL ALUMNO` pre-poblados), y las 16 celdas (8 filas × 2 columnas, `AMBIENTE FAMILIAR` | `ESCUELA`). Las 2 celdas de dibujo muestran la instrucción (no editable) y un control de carga de imagen para la evidencia; las 14 celdas de pregunta muestran la pregunta (no editable) y un campo de respuesta.
- **Bloque 3 — Directorio de emergencia:** encabezado (título/sub-título/encabezado de teléfonos no editables, `NOMBRE DEL ALUMNO` pre-poblado) y 4 contactos, cada uno con etiqueta (no editable) + campo `nombre` + campo `teléfono`.

- P-UX1 (una pregunta/grupo por pantalla) con scroll vertical; mobile-first 375×812 sin scroll horizontal (P-UX4); botones ≥44px.
- Anti-doble-submit (botón deshabilitado durante `isPending`). Sin emojis/gamificación.
- Accesibilidad WCAG 2.1 AA (labels asociados, teclado, foco visible).
- La evidencia de dibujo se sube a Supabase Storage (bucket `entrevista-evidencia`) con acceso restringido; la URL resultante se persiste en `evidencia.url`.
- Estados vacíos (P-UX7): "Registra la entrevista inicial de {nombre}".
- Tras guardar, `revalidatePath('/alumnos')`.

**No implementar** exportación a PDF.

---

## 8. SEGURIDAD, PRIVACIDAD Y RLS

### 8.1 RLS habilitada (ya aplicada en `0022`, inmutable)

La RLS está habilitada por `0022` (aplicada). `0023` **no** la recrea. Referencia del DDL ya aplicado:

```sql
alter table entrevista_inicial_alumno enable row level security;
```

### 8.2 Policy de docente (confirmada; ya aplicada en `0022`, inmutable)

Referencia del DDL ya aplicado (patrón idéntico a `alumno_docente_own`, `0014:61-63`). `0023` **no** recrea ni modifica la policy:

```sql
drop policy if exists "entrevista_docente_own" on entrevista_inicial_alumno;
create policy "entrevista_docente_own" on entrevista_inicial_alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
```

Patrón idéntico a `alumno_docente_own` (`0014:61-63`). `for all` cubre SELECT/INSERT/UPDATE; DELETE no se expone (§6).

### 8.3 Policy de director — NO se crea (decisión funcional B1)

Frank confirmó (DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD, ítem B=B1): solo la docente responsable consulta/edita; el director **no** tiene acceso. RLS default-deny → sin policy de director, el director no accede. Es **permanente** (no default conservador). No se crea `entrevista_director_cct`.

### 8.4 Multi-tenant y evidencia

- `cct` para RLS directa (patrón `alumno`). Doble defensa: RLS + filtro explícito server-side.
- **Directorio y dibujos no amplían permisos:** viven en la misma tabla con la RLS B1 (docente, director sin acceso). El bucket de evidencias (`entrevista-evidencia`) usa política por propietario (docente), sin acceso público.

---

## 9. NO-ENVÍO A IA (SCN-20260820-05, extendido)

- Ningún route de `app/api/**/ia/*`, servicio de `services/ia/*` ni utilidad de `lib/ia/*` ejecuta `from('entrevista_inicial_alumno')` ni referencia `directorio`/`evidencia` de la entrevista. Verificación por grep (AC no-IA).
- El `anonymizer` (`lib/ia/anonymizer.ts`, R-IA-10 fail-closed) ya bloquea datos de alumnos; la entrevista (preguntas + directorio + dibujos) es un subconjunto de "datos de alumnos" y queda cubierta por fail-closed.
- Ninguna entrevista (niño ni familiar) entra como contexto de prompt.

---

## 10. RETENCIÓN Y CICLO DE VIDA (C1+C2)

Sin cambios respecto a v1: conservar durante el ciclo + archivar al finalizar; `estado='archivada'` vía `archivarEntrevista`; no `deleteEntrevista`. Un nuevo ciclo permite una nueva entrevista (unicidad `(alumno_id, ciclo_escolar, 'nino')`). El disparador del archivado (manual/batch) es decisión reversible de SOFIA.

---

## 11. MIGRACIÓN Y COMPATIBILIDAD

- **Migración aditiva `0023_entrevista_inicial_completa.sql`** (D9-12 revisada): añade `directorio jsonb` (`not null` + default) sobre la tabla v1 ya aplicada por `0022`. `0022` y `0001`–`0021` quedan **inmutables**; no se renumeran. Se actualiza `supabase/migrations_master.sql` añadiendo la sección `0023` (sin editar la sección `0022`).
- **Reconciliación de datos v1→v2 (D9-13, RESUELTA):** confirmadas **0 filas** remotas, no hay datos v1 que reconciliar; `0023` **no** transforma `respuestas` y la estructura v2 se implementa en código sin backfill. `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` queda RESUELTO (Q1=0); las opciones O1-O4 no aplican.
- **Renumeración familiar:** la migración de la familiar (antes etiquetada `0023` en SPEC_TEC_11, hoy bloqueada) pasa a `0024` o posterior; no colisiona con esta `0023`.
- Tipos: `types/entrevista.ts` se reescribe al contrato v2 (`EntrevistaInicialV2`, `RespuestasV2`, `Directorio`, `validateCuestionarioV2`, `buildRespuestasVaciasV2`, `buildDirectorioVacio`).
- Rollback recomendado (no ejecutar): `alter table entrevista_inicial_alumno drop column if exists directorio cascade;` (revierte la parte aditiva sin tocar `0022` ni los datos v1 de `respuestas`).

---

## 12. CRITERIOS DE ACEPTACIÓN (testeables por ejecución o análisis estático)

### 12.1 AC v1 — OBSOLETOS (superseded por DEC-20260820-05)

Los criterios `AC-1`..`AC-11` de la SPEC v1.0 (21 ítems) quedan **OBSOLETOS**. Se sustituyen por `AC-12`..`AC-27`. El `AC-8` (no-IA) y el `AC-5` (director sin acceso) se reformulan como `AC-21` y `AC-23` con comandos idénticos.

### 12.2 AC v2 — vigentes (literalidad y estructura)

**Literalidad (fuente §4):**
- **AC-12 (bloques/cantidades):** `types/entrevista.ts` define exactamente: bloque 1 = 23 ítems, bloque 2 = 16 celdas (14 preguntas + 2 dibujos), directorio = 4 contactos. Comando: `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` — casos que envían 22/24 ítems en bloque 1, 15/17 celdas en bloque 2, o 3/5 contactos → rechazo. PASS.
- **AC-13 (texto literal bloque 1):** cada `pregunta` del bloque 1 es idéntica a §4.1 (orden 1..23). Test: envía `pregunta` alterada (p. ej. "¿Cómo te llamas?" → "¿Como te llamas?") → rechazo. `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **AC-14 (texto literal bloque 2):** cada `instruccion`/`pregunta` de las 16 celdas es idéntica a §4.2 (incluye el encabezado `const` `lineaInstitucion` y `titulo`). Test: celda alterada o `tipo` incorrecto → rechazo. `pnpm vitest` → PASS.
- **AC-15 (texto literal directorio):** `etiqueta` de los 4 contactos idéntica a §4.3 y `titulo`/`subtitulo`/`encabezadoTelefonos` como `const`. Test: etiqueta alterada → rechazo. `pnpm vitest` → PASS.
- **AC-16 (duplicados conservados):** el array literal contiene las ocurrencias duplicadas de §4.0 (§4.0 «Duplicados textuales»): `¿Cómo te llamas?` ×2, `¿Cuántos años tienes?` ×2, `¿Qué te gusta hacer en la escuela?` ×2, `¿A qué te gusta jugar?` ×2 (con capitalización distinta). Test: el validador/array fuente presenta exactamente esas 2 ocurrencias por texto, sin deduplicar. `pnpm vitest` → PASS.
- **AC-17 (peculiaridades conservadas):** el array fuente conserva las peculiaridades §4.0: `ENTEVISTA AL ALUMNO` (sin primera R), `JARDIN` (sin tilde), `¿con quien vives en tu casa?`, `¿tienes teléfono o Tablet?`, `¿a qué te gusta jugar?` (bloque 1) vs `¿A qué te gusta jugar?` (bloque 2), `DIRECTORIO CELESTINO FREINET 24-25`, `2° “A” Educadora: María Dolores Marín Pastrana`. Test: comparación byte-a-byte contra los literales esperados. `pnpm vitest` → PASS.

**Dibujos y directorio (sin inventar / sin mezclar):**
- **AC-18 (dibujos como evidencia, no preguntas):** en bloque 2 las 2 celdas de dibujo son `tipo:'dibujo'` con `instruccion` literal y campo `evidencia` (nunca `pregunta`/`respuesta` de texto). El conteo de celdas `tipo:'pregunta'` en bloque 2 es 14. Test: intentar enviar un dibujo como `tipo:'pregunta'` → rechazo. `pnpm vitest` → PASS.
- **AC-19 (directorio sin mezclar con la familiar):** `directorio` vive en columna `entrevista_inicial_alumno.directorio` (añadida por `0023`); el server action de la infantil **no** referencia `entrevista_familiar_alumno`. Comando: `grep -n "entrevista_familiar_alumno" services/alumnos/entrevista-actions.ts` → 0 matches; `grep -n "directorio" supabase/migrations/0023_entrevista_inicial_completa.sql` → ≥1 match; `grep -n "directorio" types/entrevista.ts` → ≥1 match.
- **AC-20 (directorio con teléfono por contacto):** cada contacto del directorio tiene `nombre` y `telefono` (columna `Números telefónicos en caso de emergencia`). Verificación: el zod de `directorio` exige `nombre` y `telefono` por contacto. `pnpm vitest` → PASS.

**No-IA / RLS / migración:**
- **AC-21 (no-IA extendido):** `grep -rn "entrevista_inicial_alumno" app/api services/ia lib/ia` → 0 matches, y `grep -rn "entrevista-evidencia" app/api services/ia lib/ia` → 0 matches.
- **AC-22 (migración aditiva 0023):** `supabase/migrations/0023_entrevista_inicial_completa.sql` contiene `alter table entrevista_inicial_alumno add column if not exists directorio jsonb not null default ...` (un **único** cambio: la columna `directorio`; **sin** transformación ni backfill de `respuestas`); `migrations_master.sql` refleja la nueva sección `0023`. `0022` permanece **sin cambios** (`git diff -- supabase/migrations/0022_entrevista_inicial_alumno.sql` → vacío). Comandos: `grep -n "add column if not exists directorio" supabase/migrations/0023_entrevista_inicial_completa.sql` → 1 match; `grep -n "directorio" supabase/migrations/0023_entrevista_inicial_completa.sql` → ≥1 match; `grep -n "update \|set directorio" supabase/migrations/0023_entrevista_inicial_completa.sql` → 0 matches (sin backfill de `respuestas`); `grep -n "0023" supabase/migrations_master.sql` → ≥1 match.
- **AC-23 (RLS docente + director sin acceso B1):** la policy `entrevista_docente_own` vive en `0022` (aplicada, inmutable). `0023` **no** crea ni altera ninguna policy. Comandos: `grep -n "entrevista_director_cct" supabase/migrations/0023_entrevista_inicial_completa.sql` → 0 matches; `grep -n "create policy\|drop policy" supabase/migrations/0023_entrevista_inicial_completa.sql` → 0 matches; `grep -n "entrevista_docente_own" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match (inmutable, B1).
- **AC-24 (trigger intacto en 0022; 0023 no recrea):** `grep -n "trg_entrevista_updated" supabase/migrations/0022_entrevista_inicial_alumno.sql` → 1 match (inmutable); `grep -n "create trigger\|trg_entrevista_updated" supabase/migrations/0023_entrevista_inicial_completa.sql` → 0 matches; header de `0023` → "ADITIVA" (≥1 match).

**Comportamiento / UI:**
- **AC-25 (server actions v2):** `upsertEntrevista` valida v2 + gate A1 + ownership; `archivarEntrevista` idempotente; sin `deleteEntrevista`. Tests: sin aviso → error; alumno ajeno → error; upsert idempotente; archivar `completa`→`archivada`; no `deleteEntrevista`. `pnpm typecheck` → 0 errores; `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts` → PASS.
- **AC-26 (UI 3 bloques):** el formulario renderiza bloque 1 (23), bloque 2 (16 celdas, dibujos como carga de imagen) y bloque 3 (directorio 4 contactos con nombre+teléfono). Validación funcional: Playwright E2E `e2e/entrevista-inicial.spec.ts` cubriendo abrir perfil, ver los 3 bloques en orden, editar una respuesta y un contacto, guardar, recargar y ver persistencia. `pnpm exec playwright test e2e/entrevista-inicial.spec.ts` → NO EJECUTABLE en sandbox sin Supabase (declarar con razón); PASS en staging.
- **AC-27 (archivado C1+C2 + edición in-place):** `estado` check `('borrador','completa','archivada')` vive en `0022` (inmutable); `archivarEntrevista`; no `deleteEntrevista`; no tabla de versiones. `grep -n "archivada" supabase/migrations/0022_entrevista_inicial_alumno.sql` → ≥1 match (inmutable); `grep -n "archivarEntrevista" services/alumnos/entrevista-actions.ts` → 1 match; `grep -n "deleteEntrevista" services/alumnos/entrevista-actions.ts` → 0 matches; `grep -rn "entrevista.*version" supabase/migrations/0023_entrevista_inicial_completa.sql` → 0 matches.

**Gates globales:** `pnpm typecheck`/`lint`/`test`/`build` → 0 errores (0 warnings nuevos).

---

## 13. VALIDACIONES DETECTADAS Y SALIDA ESPERADA

- `pnpm typecheck` — 0 errores.
- `pnpm lint` — 0 errores (0 warnings nuevos).
- `pnpm test` — suite completa PASS (regresión 0) + nuevos tests AC-12..AC-27.
- `pnpm vitest run tests/unit/services/alumnos/entrevista-actions.spec.ts tests/unit/components/entrevista-inicial-form.spec.tsx` — PASS.
- `pnpm exec playwright test e2e/entrevista-inicial.spec.ts` — declarar NO EJECUTABLE en sandbox sin Supabase; PASS en staging.
- `pnpm build` — PASS.
- `grep -rn "entrevista_inicial_alumno" app/api services/ia lib/ia` — 0 matches (AC-21).
- `grep -rn "entrevista-evidencia" app/api services/ia lib/ia` — 0 matches (AC-21).
- `grep -n "entrevista_familiar_alumno" services/alumnos/entrevista-actions.ts` — 0 matches (AC-19).
- `grep -n "directorio" supabase/migrations/0023_entrevista_inicial_completa.sql types/entrevista.ts` — ≥1 match por archivo (AC-19/AC-22).
- `grep -n "add column if not exists directorio" supabase/migrations/0023_entrevista_inicial_completa.sql` — 1 match (AC-22).
- `grep -n "create policy\|drop policy\|entrevista_director_cct" supabase/migrations/0023_entrevista_inicial_completa.sql` — 0 matches (AC-23, B1); `grep -n "entrevista_docente_own" supabase/migrations/0022_entrevista_inicial_alumno.sql` — 1 match (inmutable).
- `grep -n "create trigger\|trg_entrevista_updated" supabase/migrations/0023_entrevista_inicial_completa.sql` — 0 matches; `grep -n "trg_entrevista_updated" supabase/migrations/0022_entrevista_inicial_alumno.sql` — 1 match (AC-24).
- `git diff -- supabase/migrations/0022_entrevista_inicial_alumno.sql` — vacío (0022 inmutable).
- `grep -n "archivada" supabase/migrations/0022_entrevista_inicial_alumno.sql` — ≥1 (inmutable); `grep -n "archivarEntrevista" services/alumnos/entrevista-actions.ts` — 1; `grep -n "deleteEntrevista" services/alumnos/entrevista-actions.ts` — 0 (AC-27).

---

## 14. RIESGOS Y PENDIENTES

- ~~R9-1..R9-4~~ cerrados (A1/B1/C1+C2/D1, 2026-08-20).
- **R9-7 (CONFIRMADO/REALIZADO, 2026-08-20):** `0022` **ya está aplicada remotamente** (hallazgo operativo de ATLAS). Reescribirla rompería la idempotencia, por lo que **se prohíbe** (D9-12 revisada). Mitigación aplicada: migración aditiva `0023`; `0022` inmutable.
- **R9-8 (BAJO):** `directorio` en columna `jsonb` no valida JSON Schema en runtime en BD. Mitigación: zod server-side + auditoría comparativa (AC-15/AC-20).
- **R9-9 (MEDIO):** almacenamiento de dibujos (imágenes de menores) introduce un bucket de evidencias. Mitigación: bucket privado por propietario (docente), MIME whitelist, sin acceso público, no-IA. Si Frank prefiere **no** capturar imágenes en MVP, el contrato `evidencia` permanece `null` y la carga se difiere como cambio acotado (no rompe `respuestas`).
- **R9-10 (BAJO):** el disparador exacto del archivado queda como decisión reversible de SOFIA (el QUÉ lo define C1+C2).
- ~~R9-11~~ (CERRADO 2026-08-20): la tabla remota tiene **0 filas** (`select count(*)` = 0), por lo que no existen filas v1 que reconciliar; las opciones O1-O4 no aplican. `0023` no transforma `respuestas` (solo añade `directorio`). `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` RESUELTO (Q1=0).
- **Pendiente funcional (no bloqueante para la entrevista del niño):** confirmar si el encabezado «`24-25`» y «`María Dolores Marín Pastrana`» del directorio se mantienen literales (documento fuente) o deben volverse dinámicos; por DEC-20260820-05 se preservan literalmente hasta nueva decisión.

Nota R9-9: la representación de dibujos como adjuntos de imagen es **contractual** (DEC-20260820-05 las define como espacios de evidencia/dibujo). Si ATLAS/Frank decide posponer la carga real de imagen, SOFIA entrega el espacio de evidencia vacío (`evidencia: null`) y el bucket se habilita después; la literalidad y la estructura no cambian.

---

## 15. DOD (DoD)

- AC-12..AC-27 PASS en sandbox (AC-23 = 0 matches del director por B1; AC-21 = 0 matches no-IA).
- AC-26 spec E2E creado; declarado NO EJECUTABLE en sandbox **O** PASS en staging.
- `pnpm typecheck`/`lint`/`test`/`build` PASS.
- Guardrails §5 verificados: `0022` **sin cambios** (`git diff` vacío); `0023` aditiva con un único cambio (`directorio`) y sin recrear DDL/RLS/trigger; `supabase db push` NO ejecutado.
- Reconciliación de datos v1: **no aplica** — `DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1` RESUELTO (Q1=0, 0 filas). `0023` añade solo `directorio`; la estructura v2 de `respuestas` es contrato nuevo en código, sin transformación ni backfill.
- Reporte `specs/IMPL-20260820-08_report.md` con manifiesto, criterios cubiertos, validaciones con comando+resultado, estado `READY_FOR_VERIFYING`.
- GEMINI audita: modelo de datos (AC-22/AC-24), RLS docente + exclusión director (AC-23), no-IA (AC-21), literalidad 3 bloques (AC-12..AC-17), dibujos como evidencia (AC-18), directorio sin mezclar con familiar (AC-19/AC-20), retención/archivado (AC-27), preservación de datos v1 (D9-13). **Obligatorio** (datos sensibles de menores, RLS y directorio con teléfonos).

---

## 16. TRAZABILIDAD

- **IDs funcionales:** DEC-20260820-05 (cuestionario v2, literal), DEC-20260820-02 (privacidad A1/B1/C1+C2/D1), DEC-20260820-04 (ubicación conjunta/separación), FND-20260820-09, FND-20260820-06, OQ-20260820-03 (answered), OQ-20260820-04 (open), SCN-20260820-04, SCN-20260820-05, SCN-20260820-08, D-FIN-2, D-FIN-15.
- **IDs técnicos:** SPEC-20260820-09 (esta SPEC, **v2.1**), ARCH-20260820-02 (estructura/privacidad, vigente), ARCH-20260820-05 (cuestionario v2, **revisado**), IMPL-20260820-08 (handoff corregido), DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD (resuelto), DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1 (RESUELTO, Q1=0).
- **Cadena:** DEC-20260820-05 → SPEC_TEC_09 §4 (documento literal) → AC-12..AC-17 (literalidad) + AC-18..AC-20 (dibujos/directorio) → IMPL-20260820-08 → QA (GEMINI).

---

**Fin de SPEC TEC 09 v2.1.** Cuestionario v2 (documento completo de 3 páginas), dibujos como evidencia, directorio separado (sin mezclar con la familiar) y privacidad A1/B1/C1+C2/D1 vigente. Evolución por **migración aditiva `0023_entrevista_inicial_completa.sql`** (único cambio: añadir `directorio jsonb`); `0022` inmutable (ya aplicada). Reconciliación de datos v1 **resuelta** (`DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1`, Q1=0: 0 filas ⇒ sin transformación ni backfill).