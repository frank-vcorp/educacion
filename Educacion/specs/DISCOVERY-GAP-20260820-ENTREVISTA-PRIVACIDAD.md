# DISCOVERY-GAP — Entrevista inicial: política de privacidad/retención (RESUELTO 2026-08-20)

~~~text
DISCOVERY-GAP
Origen: INTEGRA
SPEC/ARCH afectada:
  - specs/SPEC_TEC_09_Entrevista_Inicial.md (SPEC-20260820-09)
  - specs/ADR-20260820-02.md (ARCH-20260820-02)
  - specs/SPEC-HANDOFF-20260820-SOFIA-ENTREVISTA.md (IMPL-20260820-03)
IDs funcionales relacionados:
  - DEC-20260820-01 (entrevista inicial en MVP; plantilla literal; privacidad, acceso restringido, edición, fecha; no IA; familia fuera)
  - FND-20260820-06 (datos sensibles de menores y terceros; nota: "no deben agregarse sin definir finalidad, consentimiento, visibilidad, retención y límites de uso")
  - OQ-20260820-03 (answered, nota de privacidad: "finalidad, consentimiento/aviso, visibilidad, retención y exclusión de IA deben quedar definidos antes de implementar")
  - OQ-20260820-04 (open: entrevista familiar fuera de alcance; no inferir)
  - SCN-20260820-04 (edición sin mezclar ciclos)
  - SCN-20260820-05 (protegida frente a IA)
  - D-FIN-2, D-FIN-15 (datos de alumnos + aviso de privacidad previo)
Contradicción o faltante:
  DEC-20260820-01 confirma la entrevista del niño y su cuestionario literal, y declara consecuencias de privacidad ("privacidad específica, acceso restringido, edición y registro de fecha; no se enviará a IA por defecto"). FND-20260820-06 y la nota de OQ-20260820-03 exigen que finalidad, consentimiento/aviso, visibilidad, retención y exclusión de IA queden definidos ANTES de implementar. De esos cinco, sólo tres están cerrados funcionalmente:
    - Finalidad: DEFINIDA — "permite a la docente conocer contexto, intereses y emociones al inicio del ciclo y usarlo como referencia pedagógica" (DEC-20260820-01).
    - Exclusión de IA: DEFINIDA — "no se enviará a IA por defecto" (DEC, BR, SCN-20260820-05).
    - Acceso restringido a la docente autorizada: DEFINIDA en intención, AMBIGUA en alcance (¿incluye o excluye al director?).
  Faltan cuatro decisiones funcionales materiales que INTEGRA no puede inferir sin violar el mandato expreso de Frank ("si la política de privacidad/retención requiere una decisión funcional, devuelve DISCOVERY-GAP en vez de inferir"):
    A) Consentimiento/aviso específico para datos sensibles del menor y de terceros.
    B) Visibilidad del director sobre la entrevista.
    C) Retención / ciclo de vida de la entrevista.
    D) Modelo de edición vs. versionado (historial de versiones).
Por qué impide especificar:
  A y B afectan directamente la migración RLS y el gate de captura: no se puede fijar el contrato de `entrevista_inicial_alumno` (policy del director) ni el flujo de consentimiento sin la decisión funcional. C afecta el ciclo de vida (soft-delete, archivado por ciclo, anonimización) y la presencia/ausencia de un `deleteEntrevista`. D afecta si basta `updated_at` (edición in-place) o se requiere tabla de versiones. El cuestionario literal, la tabla, la RLS de docente y el no-envío a IA SÍ están cerrados y se especificaron en SPEC_TEC_09; lo que queda bloqueado es la habilitación de captura para usuarios reales y la policy del director.
Opciones técnicamente viables:
  A) Aviso/consentimiento:
     A1) Reutilizar el aviso existente (D-FIN-15 / aceptacion_aviso_privacidad) tal cual: la docente confirma "consentimiento institucional para registrar datos de los alumnos a mi cargo" y con eso captura la entrevista. Simple, sin cambios de modelo.
     A2) Añadir un aviso/consentimiento específico para la entrevista que mencione datos emocionales del menor y datos de terceros (padre/madre/hermanos/convivencia), con su propia version_aviso y registro de aceptación. Mayor cobertura LFPDPPP para datos sensibles.
     A3) Captura diferida: no habilitar la entrevista del niño hasta que Frank redacte un aviso específico (alineado con la nota de FND-20260820-06).
  B) Visibilidad del director:
     B1) Director NO ve la entrevista (default-deny, fail-closed). Consistente con la lectura más estricta de "restringida a la docente autorizada".
     B2) Director ve la entrevista de su CCT (for select), consistente con alumno/planeacion/entrega (patrón canónico 0014:64-65).
  C) Retención / ciclo de vida:
     C1) Conservar mientras el alumno exista; sin borrado explícito; el cierre de ciclo no borra.
     C2) Archivar/al finalizar el ciclo (estado adicional o tabla histórica).
     C3) Anonimizar campos sensibles (emociones, terceros) al cerrar el ciclo, conservando sólo metadatos.
     C4) Borrado al finalizar el ciclo (más agresivo, alineado con minimización LFPDPPP).
  D) Edición vs. versionado:
     D1) Edición in-place con updated_at + estado (borrador/completa). Una entrevista del niño por alumno por ciclo, editable.
     D2) Historial de versiones (tabla entrevista_inicial_version con snapshot inmutable por edición).
Consecuencias de cada opción:
  A1: rápido, pero deja datos sensibles/de terceros amparados sólo por un aviso pensado para "nombre del alumno"; riesgo regulatorio si un auditor considera insuficiente el consentimiento para emociones y datos familiares.
  A2: cobertura LFPDPPP sólida para datos sensibles; requiere redacción del aviso por Frank y nueva version_aviso; la captura real queda bloqueada hasta entonces.
  A3: pospone la capacidad; no pierde el avance técnico ya especificado.
  B1: máxima privacidad; el director (que sí ve planeaciones/entregas/alumnos) no ve la entrevista. Coherente con "datos sensibles del menor".
  B2: consistente con el resto del modelo; puede exponer datos sensibles del menor al director, que DEC llama "restringida a la docente".
  C1: simple, cumple "editable"; puede acumular datos sensibles indefinidamente.
  C2/C3: alineados con minimización y finalidad; mayor superficie de modelo.
  C4: minimización máxima; puede perder valor pedagógico longitudinal.
  D1: simple, cubre SCN-20260820-04; no conserva historia de respuestas previas.
  D2: auditoría fina de cambios; más superficie; requiere decisión de si la pedagogía lo justifica.
Pregunta funcional mínima (a Frank vía ATLAS):
  1) A: ¿la captura de la entrevista se ampara en el aviso de privacidad existente (D-FIN-15) o requiere un aviso/consentimiento específico que mencione datos emocionales del menor y datos de terceros (padre/madre/hermanos/convivencia)?
  2) B: ¿el director puede ver la entrevista inicial del niño de su CCT, o queda estrictamente restringida a la docente autorizada (director sin acceso)?
  3) C: ¿cuál es la retención de la entrevista — conservar mientras exista el alumno, archivar/anonimizar al cerrar el ciclo, o borrar al finalizar el ciclo?
  4) D: ¿basta edición in-place (una entrevista del niño por alumno por ciclo, editable) o se requiere historial de versiones por cada edición?
Estado recomendado: BLOCKED
~~~

## Resolución (Frank, 2026-08-20)

Frank cerró los cuatro ítems del GAP con decisiones funcionales definitivas:

| Ítem | Opción elegida | Decisión funcional |
|---|---|---|
| **A — Consentimiento/aviso** | **A1** | Se usa el aviso de privacidad **existente** (`aceptacion_aviso_privacidad`, D-FIN-15) como gate antes de guardar. No se requiere aviso/consentimiento específico nuevo para datos sensibles del menor ni de terceros. La captura queda habilitada para usuarios reales sin bloqueo por aviso. |
| **B — Visibilidad del director** | **B1** | Solo la docente responsable puede consultar/editar la entrevista. El director **no** tiene acceso (default-deny permanente por decisión funcional, no default conservador). No se crea policy `entrevista_director_cct`. |
| **C — Retención / ciclo de vida** | **C1 + C2** | Conservar mientras exista el ciclo escolar; archivar al finalizar el ciclo. No borrar. Traducción técnica INTEGRA (§5.1 SPEC_TEC_09): ampliar `estado` a `('borrador','completa','archivada')` y exponer `archivarEntrevista(alumnoId)`; no `deleteEntrevista`. El disparador exacto del archivado (manual por docente vs batch) es detalle de implementación reversible de SOFIA, no bloqueante. |
| **D — Edición vs. versionado** | **D1** | Edición in-place con `updated_at` + `estado`, **sin versionado visible**. No se crea tabla de versiones ni historial. |

**Decisiones adicionalmente reconfirmadas** (ya cerradas en la SPEC, no parte del GAP):
- No enviar la entrevista a IA (D9-05, BR, SCN-20260820-05).
- Mantener literalmente las 21 preguntas de la imagen, sin preguntas familiares nuevas (DEC-20260820-01; OQ-20260820-04 sigue open).

**Estado final del GAP:** RESUELTO. `SPEC-20260820-09`, `ARCH-20260820-02` y `IMPL-20260820-03` quedan desbloqueados; el SPEC-HANDOFF pasa a `READY_FOR_SOFIA`.

## Notas para ATLAS

- **GAP resuelto (2026-08-20).** Las cuatro decisiones funcionales (A1, B1, C1+C2, D1) están confirmadas por Frank. El contrato técnico de `SPEC_TEC_09` y `ADR-20260820-02` se actualiza para reflejarlas como decisiones definitivas (no defaults conservadores). El SPEC-HANDOFF `IMPL-20260820-03` pasa a `READY_FOR_SOFIA`.
- **Ninguna nueva DISCOVERY-GAP material.** El disparador exacto del archivado (manual por docente vs batch automático al cerrar ciclo) queda como detalle de implementación reversible dentro de la SPEC; no requiere decisión funcional adicional porque Frank ya definió el QUÉ ("archivar al finalizar el ciclo") y el CÓMO es ownership de INTEGRA/SOFIA.
- **Entrevista familiar (OQ-20260820-04):** sigue fuera de alcance por confirmación expresa de Frank. No inferir ni agregar preguntas familiares.
