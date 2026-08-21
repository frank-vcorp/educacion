# Decisiones funcionales

Las decisiones confirmadas vigentes se conservan con sus IDs originales en `../fuentes/ENT-003_DECISIONES_MVP.md` y `../fuentes/E22_CIERRE_DISCOVERY.md` (D-FIN-1 a D-FIN-19). No se renumeraron durante la auditoría nocturna.

## DEC-20260820-01 — Entrevista inicial por alumno en MVP

- **Pregunta:** ¿La entrevista inicial debe formar parte del perfil del alumno?
- **Decisión:** Sí. Se incluye en el MVP, ligada al grupo y ciclo escolar, con una sección para respuestas del niño y otra para aportes de su familia.
- **Razón:** permite a la docente conocer contexto, intereses y emociones al inicio del ciclo y usarlo como referencia pedagógica.
- **Preguntas confirmadas:** se utilizará exactamente la plantilla visual enviada por Frank, sin cambiar, resumir, reordenar ni sustituir preguntas: ¿Cómo te llamas?; ¿Cuántos años tienes?; ¿Cuántos hermanos tienes? ¿Cómo se llaman?; ¿Cómo se llama tu papá?; ¿Con quién vives en tu casa?; ¿Cómo se llama tu mamá?; ¿Cuál es tu color Favorito?; ¿Tienes mascota? ¿Qué animal es? ¿Cómo se llama?; ¿Cuál es tu comida favorita?; ¿Cuáles son tus frutas favoritas?; ¿Cuál es tu película (caricatura) favorita?; ¿A que te gusta jugar? ¿Con quién?; ¿Qué te hace feliz?; ¿Qué te pone triste?; ¿Qué te hace enojar?; ¿Qué te da miedo?; Observaciones:; Nombre del Alumno:; Grado:; Grupo:; Fecha de aplicación.
- **Consecuencias:** requiere privacidad específica, acceso restringido, edición y registro de fecha; no se enviará a IA por defecto. La entrevista a madres/padres queda como flujo separado aún no definido; no se mezclará ni se inventarán preguntas adicionales.
- **Estado:** superseded por `DEC-20260820-05` el 2026-08-20. La decisión de incluir la entrevista permanece vigente; queda sustituido el cuestionario de 21 ítems usado como primera versión.
- **Confirmación:** Frank, 2026-08-20.

## DEC-20260820-02 — Privacidad y ciclo de vida de la entrevista inicial

- **Aviso:** se utiliza el aviso de privacidad existente antes de capturar la entrevista.
- **Visibilidad:** solo la docente responsable puede consultar y editar la entrevista; dirección no tiene acceso.
- **Retención:** se conserva mientras exista el ciclo escolar asociado y después se archiva.
- **Edición:** se edita en sitio; no se crean versiones visibles para la docente en esta fase.
- **Restricción IA:** la entrevista no se envía a proveedores de IA.
- **Estado:** confirmed.
- **Confirmación:** Frank, 2026-08-20.

## DEC-20260820-03 — IA contextualizada por modalidad

- **Decisión:** la IA del wizard debe considerar siempre la modalidad elegida (Proyecto Comunitario, Unidad Didáctica, ABJ, Rincones, Centros de Interés o Taller Crítico) al generar propuestas.
- **Aplicación:** la docente escribe el problema del contexto; la IA propone una versión estructurada, un propósito y ajustes razonables de inclusión. Cada propuesta se aplica mediante una acción explícita de la docente; no se autocompletan campos sin aceptación.
- **Contexto continuo:** desde que se captura el primer problema del contexto, el wizard conserva un contexto de trabajo ligado al borrador de la planeación hasta finalizarla. Ese contexto alimenta las siguientes sugerencias para mantener coherencia entre problema, propósito, modalidad, sesiones, bloques y ajustes.
- **Regla:** si cambia la modalidad o el problema, el sistema marca las propuestas previas como potencialmente desactualizadas y permite regenerarlas; no las sustituye silenciosamente.
- **Estado:** confirmed.
- **Confirmación:** Frank, 2026-08-20.

## DEC-20260820-04 — Entrevistas juntas en el perfil del alumno

- **Decisión:** la entrevista del niño y la entrevista familiar vivirán en el mismo lugar funcional: `Perfil del alumno → Entrevistas`.
- **Estructura:** serán dos secciones/pestañas claramente separadas, `Entrevista del niño` y `Entrevista familiar`; no se mezclan respuestas, registros ni permisos en una sola ficha.
- **Relación:** ambas quedan asociadas al mismo alumno, grupo y ciclo escolar para que la docente las consulte en conjunto.
- **Fuente familiar:** se usará como referencia literal `docx_extract/NUEVA ENTREVISTA.pdf`; no se cambiarán sus preguntas sin una nueva decisión.
- **Privacidad:** la ubicación conjunta no amplía permisos. La entrevista familiar conserva su propio contrato de consentimiento, visibilidad y retención, pendiente de definir.
- **Estado:** confirmed para ubicación y separación funcional.
- **Confirmación:** Frank, 2026-08-20.

## DEC-20260820-05 — Cuestionario infantil completo de entrevista inicial

- **Supersede:** la lista de 21 ítems de `DEC-20260820-01`.
- **Decisión:** el producto debe usar como fuente literal el documento completo `docx_extract/ENTREVISTA INICIAL.docx.pdf`, sin resumir, deduplicar, reordenar, corregir redacción ni eliminar secciones.
- **Bloques confirmados del documento:**
  1. **Entrevista inicial:** ¿Cómo te llamas?; ¿Cuántos años tienes?; ¿Cómo se llama tu mamá?; ¿Cómo se llama tu papá?; ¿Cuántos hermanos tienes?; ¿con quien vives en tu casa?; ¿tienes mascotas?; ¿Qué haces en casa cuando llegas de la escuela?; ¿a qué te gusta jugar?; ¿con quién juegas?; ¿Cuál es tu juguete favorito?; ¿te leen cuentos en casa?; ¿Quién?; ¿Cuál es tu cuento favorito?; ¿Qué te gusta ver en la televisión?; ¿tienes teléfono o Tablet?; ¿Qué ves ahí?; ¿te gusta venir a la escuela?; ¿Qué te gusta hacer en la escuela?; ¿Qué te pone alegre?; ¿Qué te pone triste?; ¿Qué te pone enojado?; ¿Qué te da miedo?.
  2. **Ambiente familiar y escuela:** Realiza un dibujo de cómo eres tú; Dibuja a tus mejores amigos en la escuela; ¿Cómo te llamas?; ¿Te gusta la escuela?; ¿Dónde vives?; ¿Qué te gusta hacer en la escuela?; ¿Quién vive contigo?; ¿Qué te desagrada de la escuela?; ¿Cuántos años tienes?; ¿Quiénes son tus mejores amigos en la escuela?; ¿Qué haces cuando estás en tu casa?; ¿Alguien te molesta en el salón?; ¿A qué te gusta jugar?; ¿Te agrada tu maestra?; ¿Quién es tu persona favorita en casa?; ¿Eres feliz en la escuela?.
  3. **Directorio de emergencia:** Números telefónicos en caso de emergencia; Nombre del padre; Nombre de la madre; Nombre de familiar y parentesco; Nombre de familiar y parentesco.
- **Regla de literalidad:** se conservan duplicados, capitalización, acentos y peculiaridades del documento fuente; las instrucciones de dibujo se representan como espacios de evidencia/dibujo, no como preguntas de texto.
- **Relación:** sigue ligada a alumno, grupo y ciclo escolar dentro de `Perfil del alumno → Entrevistas → Entrevista del niño`.
- **Privacidad:** mantiene las decisiones `DEC-20260820-02`; director sin acceso y exclusión de IA. El directorio de emergencia se trata como bloque sensible dentro de la entrevista, no como dato curricular.
- **Estado:** confirmed.
- **Confirmación:** Frank, 2026-08-20.
