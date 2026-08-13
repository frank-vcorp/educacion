# Planea IA NEM — Snapshot funcional (referencia competitiva)

> **Fuente:** <https://planeaianem.com/>
> **Captura local:** 2026-08-13
> **Autor/marca:** Profr. José Antonio Almazán Torres · Comunidad Docente Secundaria Hidalgo
> **Año declarado:** 2026

## Qué hace (descripción funcional)

Plataforma web orientada a **docentes de educación básica en México** que genera con IA, en
minutos, los artefactos administrativos centrales del modelo NEM:

- **Generador de Planeaciones** didácticas alineadas a NEM — exporta Word y PDF.
- **Programa de Mejora Continua (PMC)** — alineado a SEP 2024: diagnóstico por ámbitos,
  prioridades, objetivos, metas y acciones.
- **Programa Analítico** — contextualiza el programa sintético con el diagnóstico comunitario.
- **Generador de Actividades** — proyectos, Ejercicios Integradores de Aprendizaje y actividades
  por nivel cognitivo (Bloom).
- **Diagnóstico Comunitario** — encuestas, captura de resultados y análisis automáticos con IA.
- **Evaluación formativa** — rúbricas analíticas, listas de cotejo e instrumentos personalizados.
- **Asistente Pedagógico IA** — responde dudas sobre PDA, inclusión (TDAH/TEA), estrategias y NEM.

## Flujo declarado (3 pasos)

1. Seleccionar **grado y disciplina**.
2. La IA **genera** planeación/actividad/rúbrica en segundos.
3. **Descargar** en Word o PDF para imprimir o compartir con el grupo.

## Posicionamiento explícito

> *"Los contenidos generados por IA son sugerencias profesionales que el docente debe revisar y
> adaptar a su grupo, contexto y normativa institucional vigente."*
>
> — Aviso en la propia landing.

Es decir: **no reemplaza al docente**; ofrece un primer borrador que el docente debe editar.

## Comparación con el proyecto NEM (Educacion)

- Coincide con la plataforma NEM en que **genera con IA los artefactos** (planeaciones, programa
  analítico, PMC, evaluación). Es la **coincidencia funcional más cercana** del mercado
  identificado hasta ahora.
- El proyecto NEM añade explícitamente el **contrato curricular NEM** (§3.5 del
  `SPEC_MVP_01_Modulo_Docente.md`) y un **módulo administrativo-financiero-pedagógico del
  centro escolar**, no solo del docente individual.
- Avisa sobre revisión obligatoria del docente — esto reduce (no elimina) obligaciones regulatorias
  vinculadas a IA (LFPDPPP 2025, ver
  `02_compliance/LFPDPPP_2025_sintesis_ejecutiva.md`).

## Stack y datos visibles

- Frontend público estático-renderizado (imágenes servidas desde `__l5e/assets-v1/...`).
- Sistema de auth propio (`/auth`).
- Sección de **Comunidad Docente** y de **Precios** (`/precios`) — pricing no capturado en este
  snapshot.
- Páginas legales: `Términos`, `Privacidad`, `Reembolsos`.
