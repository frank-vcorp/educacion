# Preguntas abiertas

## OQ-20260818-01 — Priorización de D-FIN-17 frente al estado de implementación

- **Tipo:** non_blocking para coherencia documental; blocking para declarar MVP completamente implementado.
- **Pregunta:** ¿La implementación de duplicar/clonar debe ejecutarse dentro de este MVP antes de su cierre?
- **Opciones:** mantener D-FIN-17 en MVP y planificar implementación; o decidir explícitamente su supersession hacia Fase 2.
- **Responsable:** Frank.
- **Estado:** open.

## OQ-20260818-02 — Alcance de `recurso_skill`

- **Tipo:** blocking para implementar la clasificación por habilidad.
- **Pregunta:** ¿El algoritmo de clasificación `recurso_skill` forma parte del MVP o se difiere a Fase 2?
- **Opciones:** mantener algoritmo en MVP; diferir algoritmo y conservar el inventario básico de recursos.
- **Responsable:** Frank.
- **Estado:** open.

## OQ-20260820-03 — Entrevista inicial dentro del perfil del alumno

- **Tipo:** non_blocking para confirmar la capacidad; blocking para definir el formulario y construirlo.
- **Pregunta:** ¿Confirmamos incorporar la entrevista inicial por alumno, ligada al grupo y ciclo escolar, con una sección separada para respuestas del niño y de su familia?
- **Decisión resultante:** incluir en MVP; formulario breve versionado por ciclo, editable por la docente, con privacidad y acceso restringido. Se separan ficha del niño y aportes familiares.
- **Responsable:** Frank.
- **Estado:** answered.
- **Nota de privacidad:** la imagen contiene datos de menores y familiares; la finalidad, consentimiento/aviso, visibilidad, retención y exclusión de IA deben quedar definidos antes de implementar.

## OQ-20260820-04 — Entrevista separada a madres/padres

- **Tipo:** non_blocking para implementar la entrevista del niño; blocking solo para diseñar el flujo familiar.
- **Pregunta:** ¿Qué preguntas exactas y qué mecanismo de participación tendrá la entrevista a madres/padres?
- **Responsable:** Frank.
- **Estado:** open.
- **Regla:** no inferir ni agregar preguntas familiares a partir de la plantilla infantil.

Las preguntas A-D de privacidad, visibilidad, retención y edición de `DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD` quedaron respondidas por `DEC-20260820-02`.

## OQ-20260820-05 — Aplicación de propuestas IA en el problema del contexto

- **Tipo:** answered; blocking resuelto para conectar IA al wizard.
- **Pregunta:** cuando la docente escribe el problema del contexto, ¿la IA debe escribir directamente propósito y ajustes razonables, o debe mostrar propuestas y aplicarlas solo cuando la docente pulse “Usar esta propuesta”?
- **Decisión resultante:** proponer y aplicar con un clic. La IA entrega problema mejor estructurado, propósito y ajustes; la docente acepta cada bloque antes de llenar el campo. Además, las propuestas consideran la modalidad y el contexto acumulado del borrador.
- **Responsable:** Frank.
- **Estado:** answered.
- **Motivo:** la opción 2 contradice la regla vigente de no mutar la planeación sin aceptación explícita.

## OQ-20260820-06 — Retención de borrador contextual

- **Tipo:** non_blocking para el flujo principal; necesario para definir recuperación de borradores abandonados.
- **Pregunta:** si la docente abandona la planeación antes de terminarla, ¿cuánto tiempo conservamos el contexto acumulado del borrador?
- **Opciones:** conservar 7 días; conservar hasta que la docente lo elimine; descartar al salir sin guardar.
- **Responsable:** Frank.
- **Estado:** open.

## OQ-20260820-07 — Contrato de privacidad de entrevista familiar

- **Tipo:** answered para implementar la captura autorizada; la retención detallada sigue siendo una mejora posterior.
- **Decisión resultante:** sí forma parte del mismo espacio funcional del perfil, en una sección separada de la entrevista del niño, conserva las preguntas de `docx_extract/NUEVA ENTREVISTA.pdf` y puede ser capturada por maestras autorizadas.
- **Responsable:** Frank.
- **Estado:** answered.
- **Nota:** la fuente contiene teléfonos, situación legal, patria potestad, hábitos y expectativas familiares; no se enviará a IA.

La pregunta sobre el cuestionario infantil queda resuelta por `DEC-20260820-05`: se usa el documento completo, incluidos duplicados, dibujos y directorio de emergencia.
