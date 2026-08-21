# DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1 — **RESUELTO (Q1=0 · 2026-08-20)** — reconciliación de datos v1 al aplicar el cuestionario v2 (migración aditiva `0023`)

**Resolución 2026-08-20 (`ATLAS → INTEGRA`):** consulta operativa confirmada por ATLAS —
`select count(*) from public.entrevista_inicial_alumno` en **Supabase remoto** → **0 filas**.

- **Q1 (¿hay filas v1?) = 0** ⇒ no existen respuestas capturadas con el cuestionario de 21 ítems
  (DEC-20260820-01) en la base destino.
- **Q2 (O1/O2/O3/O4) NO APLICA** ⇒ sin filas v1 no hay transformación ni reconciliación que decidir;
  no se pierde ningún dato porque no hay datos.
- **Estado: RESUELTO.** El sub-paso "transformación de `respuestas` v1→v2" queda **desactivado**
  (no `BLOCKED`), porque el trabajo de reconciliación **no existe**.
- **Consecuencia técnica firme:** la migración aditiva `0023_entrevista_inicial_completa.sql` queda con
  un **único cambio** — añadir la columna `directorio jsonb` (default + `not null`) — **sin backfill de
  `respuestas`** (0 filas existentes que migrar). La estructura v2 de `respuestas` se implementa en
  **código** (`types/entrevista.ts`, zod, server action, UI) como contrato nuevo, **sin backfill de filas
  existentes**. `0022` permanece **INMUTABLE**.
- **No requiere decisión de Frank** (0 filas ⇒ no es política de datos sobre menores): cierre operativo
  comunicado a ATLAS, no decisión de producto.

El bloque `~~~text` siguiente es el **registro histórico** del GAP emitido antes de la resolución Q1=0
(explica por qué la reconciliación estaba abierta). Queda **superseded** por esta resolución.

~~~text
DISCOVERY-GAP
Origen: INTEGRA
SPEC/ARCH afectada:
  - specs/SPEC_TEC_09_Entrevista_Inicial.md (SPEC-20260820-09, v2.1)
  - specs/ADR-20260820-05.md (ARCH-20260820-05; D9-12 REVISADA, D9-13 nueva)
  - specs/SPEC-HANDOFF-20260820-SOFIA-ENTREVISTA-COMPLETA.md (IMPL-20260820-08, corregido)
IDs funcionales relacionados:
  - DEC-20260820-05 (cuestionario v2, 3 bloques; supersede la lista de 21 ítems)
  - DEC-20260820-01 (cuestionario original de 21 ítems — SUPERSEDED)
  - DEC-20260820-02 (privacidad infantil A1/B1/C1+C2/D1, RESUELTO)
  - FND-20260820-09 (la entrevista desplegada v1 es incompleta vs el documento completo)
Contradicción o faltante:
  Hallazgo operativo (ATLAS, 2026-08-20): `supabase migration list` confirma que
  `0022_entrevista_inicial_alumno.sql` YA está aplicada remotamente. Por tanto la premisa
  del ADR-20260820-05 §3.4 / SPEC_TEC_09 v2.0 §5/§11 ("0022 pendiente de aplicación, base
  vacía, reescribir en sitio") es FALSA. La tabla `entrevista_inicial_alumno` existe con el
  esquema v1 y potencialmente con filas capturadas con el cuestionario de 21 ítems
  (DEC-20260820-01) que DEC-20260820-05 SUPERSEDE.
  El cuestionario v1 (21 ítems) y el v2 (23 + 16 celdas + directorio) son instrumentos
  semánticamente distintos: solo ~4-5 de los 21 ítems v1 coinciden literalmente con v2;
  ~16 ítems v1 (color/comida/frutas/película favorita, "Observaciones", y los
  administrativos Nombre/Grado/Grupo/Fecha embebidos) no tienen correspondencia en v2, y
  ~18 ítems v2 son nuevos o reformulados. No existe transformación mecánica fiel e inocua.
Por qué impide especificar:
  Decidir el destino de las respuestas v1 (conservarlas y migrar las que coinciden
  literalmente; archivarlas como históricas read-only; mantenerlas como legacy read-only
  con discriminador; o descartarlas y recapturar) es POLÍTICA DE PRODUCTO sobre datos
  reales y sensibles de menores, no una decisión técnica reversible. INTEGRA no la puede
  fijar sin violar el mandato de no inventar decisiones funcionales (precedente:
  DISCOVERY-GAP familiar F-A..F-E; y el guardrail original de SPEC_TEC_09 §5 "no deducir
  ni aplicar una conversión de datos por cuenta propia").
Opciones técnicamente viables (no decisión de INTEGRA):
  O1) MIGRACIÓN LITERAL + SIDECAR LOSSLESS: transformar `respuestas` v1→v2 copiando solo
      los ítems que coinciden por texto literal exacto (los demás vacíos) y conservar el
      `respuestas` v1 íntegro en una columna nueva `respuestas_v1 jsonb`.
      - No se pierde ningún dato; las filas v1 quedan como entrevista v2 con campos nuevos
        vacíos (la docente los completa). Requiere una columna extra y lógica de parse.
  O2) ARCHIVAR v1 + RECAPTURAR: marcar las filas v1 `estado='archivada'` (consulta
      histórica read-only) y exigir recaptura completa en v2.
      - Sin mezcla silenciosa de instrumentos; re-trabajo docente; la v1 queda inaccesible
        para edición.
  O3) COMPAT READ-ONLY: conservar v1 tal cual con un discriminador (`version_contrato`
      'v1'/'v2') y un visor legacy; solo filas nuevas usan v2.
      - Sin pérdida ni transformación; costo de mantener dos formas de `respuestas` en app.
  O4) DESCARTAR v1 + RECAPTURAR: borrar filas v1 y empezar v2 (FND-20260820-09 califica la
      v1 de incompleta).
      - Destructivo; requiere confirmación explícita de Frank y justificación de minimización.
Consecuencias de cada opción:
  - O1/O3 preservan el 100% de los datos; O2 preserva a nivel de fila (read-only); O4 pierde
    datos de forma irreversible. La DDL aditiva `directorio` es común a todas (lossless,
    esqueleto vacío) y NO depende de esta decisión.
  - Aplicándo O1/O2/O3, la invariante "no perder datos, no conjeturar conversión" se cumple;
    O4 la incumple y necesita justificación explícita de Frank.
Pregunta funcional mínima (a Frank vía ATLAS) — 2 ítems:
  1) OPERACIONAL: ¿la tabla `entrevista_inicial_alumno` remota tiene filas v1? (0 filas ⇒
     no se necesita transformación; solo DDL aditiva `directorio` + captura v2 nueva.)
  2) FUNCIONAL (solo si hay filas): política de reconciliación de las respuestas v1 con el
     cuestionario v2 — ¿O1 (migrar literal + sidecar lossless), O2 (archivar + recapturar),
     O3 (compat read-only) u O4 (descartar + recapturar, con confirmación explícita)?
Estado recomendado: BLOCKED (solo el paso de transformación de `respuestas`; el resto —
  reimplementación v2 de código + DDL aditiva `directorio` — queda READY y no bloqueado).
~~~

## Alcance que SÍ queda especificable ahora (no bloqueado)

INTEGRA puede especificar y delegar YA, sin invadir la política de producto:

1. **Reimplementación v2 del código** — `types/entrevista.ts`, `services/alumnos/entrevista-actions.ts`,
   `components/alumnos/entrevista-inicial-form.tsx`, `entrevista-dialog-content.tsx` y tests
   (contrato de 3 bloques es firme por DEC-20260820-05).
2. **Migración aditiva `0023_entrevista_inicial_completa.sql`** — bloque `directorio` (añadir columna,
   backfill lossless del esqueleto literal vacío, `not null` + default). No depende de la reconciliación.
3. **`0022` inmutable** — no se reescribe, no se renombra, no se renumeran `0001`–`0021`. El DDL/RLS/trigger/
   `unique` ya aplicado se preserva. `migrations_master.sql` recibe una sección `0023` (sin editar `0022`).

Lo que queda **BLOQUEADO** hasta la respuesta de Frank: únicamente el paso de
**transformación/reconciliación de `respuestas` v1→v2** dentro de `0023` (O1/O2/O3/O4) y cualquier
comportamiento de lectura que dependa de esa política.

## Notas para ATLAS

- Este GAP es **distinto** del `DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD` (infantil, RESUELTO con
  A1/B1/C1+C2/D1). Aquí no se revisa privacidad; se revisa **destino de datos** ya capturados contra un
  cuestionario ya superseded.
- La respuesta a Q1 (¿hay filas v1?) puede ser operacional (un `SELECT count(*)` en la base destino o
  `supabase migration list` + inspección); si es 0, este GAP se cierra y `0023` queda **solo** con el
  bloque aditivo `directorio`. Si es >0, Q2 (O1/O2/O3/O4) debe cerrarla Frank.
- La renumeración de la migración familiar (antes etiquetada `0023` en SPEC_TEC_11, bloqueada) pasa a
  `0024` o posterior; no colisiona con esta `0023` (ver SPEC_TEC_09 v2.1 §11).

---

**Cierre 2026-08-20:** con Q1=0 este GAP queda **RESUELTO**; la renumeración de la familiar (`0024` o
posterior) sigue vigente. Los artefactos actualizados (SPEC_TEC_09 v2.1, ADR-20260820-05, handoff
`SPEC-HANDOFF-20260820-SOFIA-ENTREVISTA-COMPLETA.md`) son la fuente vigente; `0023` queda **solo** con el
bloque aditivo `directorio` y la estructura v2 de `respuestas` se implementa sin backfill de filas existentes.