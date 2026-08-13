# Índice de fuentes — Proyecto Educación NEM

> **Propósito:** Repositorio local de referencia con documentos oficiales y de mercado
> que alimentan el `SPEC_MVP_01_Modulo_Docente.md` de la plataforma NEM (México).
> **Fecha del lote:** 2026-08-13.
> **Origen del agente:** ATLAS M3.
> **Política:** este directorio es de **solo-lectura para la conversación**; no se modifica
> ningún archivo fuera de `fuentes/`.

## Estructura

```
fuentes/
├── 01_normativa_nem/          # SEP / DOF — Plan de Estudio NEM
├── 02_compliance/             # Leyes de protección de datos
├── 03_manuales_planeacion/    # CIFE — manuales oficiales de planeación por proyectos
├── 04_conaliteg/              # Política de uso de libros de texto gratuitos
├── 05_mercado_edtech/         # Snapshots Kumu, Planea IA NEM, Teachy
└── _log_descargas.md          # Trazabilidad de esta captura
```

## 0. Documentos operativos (transversal al proyecto)

| # | Carpeta / archivo | Tipo | Propósito |
|---|---|---|---|
| 0.1 | `E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md` | Especificación | Cadencia y protocolo de actualización de los documentos de `fuentes/` (cambios tipo A/B/C, alertas, checklist) |
| 0.2 | `E11_MONITOR_VIGILANCIA_NORMATIVA.md` | Especificación | Diseño del Monitor de Vigilancia: 6 fuentes núcleo, heurística de severidad INFO/REVISAR/ACTUAR, contrato de salida, modo cron semanal. Listo para implementar E13 cuando se decida. |
| 0.3 | `E14_CATALOGACION_AUTONOMA_FASE_2.md` | Especificación | Diseño del motor de catalogación autónoma para Fase 2 (preescolar). Pipeline de 4 capas: extracción PDF → validación humana → modelo relacional → carga en Supabase. Schema SQL objetivo definido. |
| 0.4 | `ENT-001_REVISION_EXHAUSTIVA.md` | Checkpoint | Revisión exhaustiva del SPEC MVP v0.8.1 + Encuesta v2 antes de entrega a Lola. 22 hallazgos: 6 Alta (bloqueante), 9 Media, 7 Baja. Plan de resolución incluido. |

## 1. Inventario de archivos descargados

| # | Carpeta | Archivo | Tipo | Fuente URL | Fecha descarga |
|---|---|---|---|---|---|
| 1 | 01_normativa_nem | `acuerdo_14_08_22_plan_estudios.html` | HTML | <https://sidof.segob.gob.mx/notas/docFuente/5661845> | 2026-08-13 |
| 2 | 01_normativa_nem | `acuerdo_14_08_22_plan_estudios_texto.md` | Markdown (derivado) | idem | 2026-08-13 |
| 3 | 01_normativa_nem | `acuerdo_06_08_23_modificacion.html` | HTML | <https://sidof.segob.gob.mx/notas/docFuente/5698663> | 2026-08-13 |
| 4 | 01_normativa_nem | `acuerdo_06_08_23_modificacion_texto.md` | Markdown (derivado) | idem | 2026-08-13 |
| 5 | 01_normativa_nem | `anexo_acuerdo_14_08_22_programas_sinteticos.pdf` | PDF (44 MB) | <https://www.dof.gob.mx/2023/SEP/ANEXO_ACUERDO_080823_FASES_2_A_6.pdf> | 2026-08-13 |
| 6 | 01_normativa_nem | `plan_estudio_2022_SEP_oficial.pdf` | PDF (3.2 MB, 200 pp) | <https://educacionbasica.sep.gob.mx/wp-content/uploads/2024/06/Plan-de-Estudio-ISBN-ELECTRONICO.pdf> | 2026-08-13 |
| 7 | 02_compliance | `LFPDPPP_2010_refer.pdf` | PDF (457 KB, 24 pp) | <https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf> | 2026-08-13 |
| 8 | 02_compliance | `LFPDPPP_2025_sintesis_ejecutiva.md` | Markdown (5.7 KB) | <https://www.hlc.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies> | 2026-08-13 |
| 9 | 03_manuales_planeacion | `manual_preescolar_planeacion.pdf` | PDF (3.6 MB, 86 pp) | <https://drive.google.com/file/d/1w55R8YRF9mXigy3uU-baglDsNGcD1JWM/view> | 2026-08-13 |
| 10 | 03_manuales_planeacion | `manual_primaria_telesecundaria_planeacion.pdf` | PDF (5.3 MB, 114 pp) | <https://drive.google.com/file/d/1tS-VahKv93ghWUtGWbNYI3EMzJnj1lUw/view> | 2026-08-13 |
| 11 | 04_conaliteg | `conaliteg_preguntas_frecuentes.md` | Markdown (4.6 KB) | <http://www.conaliteg.gob.mx/transparencia/transparencia_preguntas.php> | 2026-08-13 |
| 12 | 05_mercado_edtech | `kumu_landing_snapshot.md` | Markdown (3.0 KB) | <https://kumu.la/> | 2026-08-13 |
| 13 | 05_mercado_edtech | `planea_ia_nem_snapshot.md` | Markdown (2.7 KB) | <https://planeaianem.com/> | 2026-08-13 |
| 14 | 05_mercado_edtech | `teachy_snapshot.md` | Markdown (3.1 KB) | <https://teachy.ai/es> | 2026-08-13 |

## 2. Pendientes y motivos

| Documento | Estado | Motivo |
|---|---|---|
| **Texto oficial LFPDPPP 2025 (DOF, 20-mar-2025)** | ⚠️ Sólo síntesis | No se localizó URL canónica del DOF en el alcance entregado. La síntesis de HLC es fuente secundaria y no reemplaza el articulado oficial. Si Frank necesita precisión jurídica, descargar publicación del 20/03/2025 directamente del DOF. |

Resto: **sin pendientes**.

## 3. Cómo navegar

- Si buscas **la norma NEM**: abre `01_normativa_nem/`. Los dos acuerdos están en HTML crudo
  (oficial) y `.md` (legible). Los programas sintéticos de las fases 2 a 6 están en el anexo PDF.
- Si buscas **regulatorio de datos**: ve a `02_compliance/`. Compara `LFPDPPP_2010_refer.pdf` con
  `LFPDPPP_2025_sintesis_ejecutiva.md`.
- Si quieres **aprender a planear por proyectos**: `03_manuales_planeacion/` tiene los manuales
  oficiales CIFE por nivel.
- Si necesitas **política editorial** o entender por qué no se debe alojar libros CONALITEG:
  `04_conaliteg/conaliteg_preguntas_frecuentes.md`.
- Para **análisis de mercado** frente a Kumu, Planea IA y Teachy, ve a `05_mercado_edtech/`.
- Para **trazabilidad** del lote, leer `_log_descargas.md`.

## 4. Cómo se vincula con el proyecto (`SPEC_MVP_01_Modulo_Docente.md`)

| Documento (en `fuentes/`) | Alimenta sección del SPEC |
|---|---|
| Acuerdo 14/08/22 + Anexo (`01_normativa_nem/acuerdo_14_08_22_*.{html,md}`, `anexo_acuerdo_14_08_22_programas_sinteticos.pdf`) | **§5 Catálogo NEM** — campos formativos, ejes articuladores, fases. |
| Plan de Estudio 2022 SEP oficial (`01_normativa_nem/plan_estudio_2022_SEP_oficial.pdf`) | **§5 Catálogo NEM** — base curricular completa. |
| Acuerdo 06/08/23 (`01_normativa_nem/acuerdo_06_08_23_modificacion.{html,md}`) | **§5.2** —vigencia y ajustes posteriores al Plan 2022. |
| Manual CIFE preescolar (`03_manuales_planeacion/manual_preescolar_planeacion.pdf`) | **§3 Flujos** (preescolar) y **§3.5 Contrato Curricular NEM**. |
| Manual CIFE primaria/telesecundaria (`03_manuales_planeacion/manual_primaria_telesecundaria_planeacion.pdf`) | **§3 Flujos** (primaria y telesecundaria) y **§3.5 Contrato Curricular NEM**. |
| LFPDPPP 2025 (`02_compliance/LFPDPPP_2025_sintesis_ejecutiva.md`) | **§9 Riesgos** — privacidad, decisiones automatizadas, aviso de privacidad, ARCO. |
| LFPDPPP 2010 (`02_compliance/LFPDPPP_2010_refer.pdf`) | **§9 Riesgos** — referencia histórica de la norma abrogada. |
| CONALITEG FAQ (`04_conaliteg/conaliteg_preguntas_frecuentes.md`) | **§3 Anti-objetivo** — no almacenar ni redistribuir el contenido editorial CONALITEG. Catálogo público <https://libros.conaliteg.gob.mx/> debe enlazarse externamente. |
| Kumu snapshot (`05_mercado_edtech/kumu_landing_snapshot.md`) | **§9 Riesgos (competencia)** — referencia primaria/secundaria con biblioteca editorial. |
| Planea IA NEM snapshot (`05_mercado_edtech/planea_ia_nem_snapshot.md`) | **§9 Riesgos (competencia)** — competidor más cercano: artefactos administrativos NEM con IA. |
| Teachy snapshot (`05_mercado_edtech/teachy_snapshot.md`) | **§9 Riesgos (competencia)** — ecosistema horizontal con libros de texto personalizados (Studio). |

## 5. Convenciones del repositorio

- **`_log_descargas.md`**: trazabilidad operativa. Si Frank reabre la sesión y el lote ya pasó,
  este archivo es la fuente de verdad sobre qué se descargó, desde dónde y con qué incidencias.
- **HTML crudo** se conserva (no se borra) cuando existe una `.md` derivada: hay herramientas
  que pueden querer leerlo en el futuro para parsear estructura legal exacta.
- **Markdown** generado a partir de webfetch está marcado como *snapshot*, no como fuente
  primaria. Si se requiere cita legal precisa, ir al PDF original.
- **No** se aloja contenido editorial CONALITEG en este repositorio (consistente con el
  anti-objetivo de §3).

## 6. Trabajo no realizado (out-of-scope de este lote)

- No se descargó el DOF canónico de LFPDPPP 2025 (no localizado en alcance).
- No se descargaron versiones PDF/oficiales de los manuales CIFE desde un canal distinto a Google
  Drive (el canal funcionó, no fue necesario).
- No se generaron embeddings ni índices de búsqueda dentro de `fuentes/`.
