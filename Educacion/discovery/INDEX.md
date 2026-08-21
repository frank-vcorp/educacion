# Índice de discovery funcional

**Versión:** 1.0 · **Fecha:** 2026-08-18 · **Estado:** `conditionally_ready`

## Fuente funcional vigente

- `../SPEC_MVP_01_Modulo_Docente.md` v0.14 — baseline funcional del Módulo Docente MVP.
- `../fuentes/ENT-003_DECISIONES_MVP.md` y `../fuentes/E22_CIERRE_DISCOVERY.md` — decisiones confirmadas que el baseline consolida.
- `../fuentes/E20_PRINCIPIOS_DISENNO_PRODUCTO.md` y `../fuentes/E21_CATALOGO_RECURSOS_AULA.md` — principios y complemento funcional.

## Checkpoint

`FND-20260818-01`: auditoría nocturna de consistencia producto ↔ SPEC técnica. INTEGRA cerró tres incoherencias de documentación técnica bajo `ARCH-20260818-01`; ATLAS consolidó las decisiones funcionales confirmadas en el baseline v0.14.

## Bloqueadores y preguntas

- `FND-20260818-03` — la decisión DM-03 sobre `recurso_skill` sigue pendiente de Frank.
- `FND-20260820-06` — entrevista inicial por alumno confirmada para MVP; falta cerrar el cuestionario, privacidad, retención y diseño funcional antes de implementación.
- `FND-20260820-07` — la IA aún no está conectada al problema del contexto del wizard; falta definir aplicación de propuestas.
- `FND-20260820-08` — recibida entrevista familiar con datos de menor y familiares; falta confirmar incorporación y contrato de privacidad.
- `FND-20260820-09` — la entrevista infantil desplegada usa una versión incompleta; debe actualizarse al PDF de tres páginas recibido.
- `FND-20260820-10` — F0 cae en fallback porque las variables IA de Production están vacías.
- `FND-20260820-11` — 500 runtime de server actions corregido y desplegado en `8cb1767`.

## Readiness para INTEGRA

`conditionally_ready`: la ubicación conjunta de entrevistas está confirmada, pero la entrevista infantil requiere actualización técnica al documento completo `DEC-20260820-05`. La integración IA del contexto está lista para SPEC. Permanecen `OQ-20260820-06`, `OQ-20260820-07` (privacidad familiar) y `recurso_skill` como asuntos abiertos.
