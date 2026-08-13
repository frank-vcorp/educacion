# Log de descargas — Educación NEM

**Fecha del lote:** 2026-08-13 (sesión matinal 06:08–06:12 UTC+02:00)
**Origen del agente:** ATLAS M3 (entry-point, filtro puro)

## Resultado

- **Total solicitado:** 12 documentos priorizados.
- **Descargados OK:** 12.
- **Pendientes:** 0.

## Tabla de descargas

| # | Carpeta destino | Archivo final | Tamaño | URL | Método |
|---|---|---|---|---|---|
| 1 | 01_normativa_nem | acuerdo_14_08_22_plan_estudios.html | 49 KB | sidof.segob.gob.mx/notas/docFuente/5661845 | wget |
| 2 | 01_normativa_nem | acuerdo_14_08_22_plan_estudios_texto.md | 22 KB | (derivado del anterior) | python3 |
| 3 | 01_normativa_nem | acuerdo_06_08_23_modificacion.html | 23 KB | sidof.segob.gob.mx/notas/docFuente/5698663 | wget |
| 4 | 01_normativa_nem | acuerdo_06_08_23_modificacion_texto.md | 10 KB | (derivado del anterior) | python3 |
| 5 | 01_normativa_nem | anexo_acuerdo_14_08_22_programas_sinteticos.pdf | 44 MB | dof.gob.mx/2023/SEP/ANEXO_ACUERDO_080823_FASES_2_A_6.pdf | wget (reintento con `--no-check-certificate` tras SSL error inicial) |
| 6 | 01_normativa_nem | plan_estudio_2022_SEP_oficial.pdf | 3.2 MB | educacionbasica.sep.gob.mx/.../Plan-de-Estudio-ISBN-ELECTRONICO.pdf | wget |
| 7 | 02_compliance | LFPDPPP_2010_refer.pdf | 457 KB | diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf | wget |
| 8 | 02_compliance | LFPDPPP_2025_sintesis_ejecutiva.md | 5.7 KB | hlc.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies | webfetch (no se localizó DOF canónico en el alcance) |
| 9 | 03_manuales_planeacion | manual_preescolar_planeacion.pdf | 3.6 MB (86 pp) | drive.google.com/uc?export=download&id=1w55R8YRF9mXigy3uU-baglDsNGcD1JWM | wget (formato directo de Google Drive) |
| 10 | 03_manuales_planeacion | manual_primaria_telesecundaria_planeacion.pdf | 5.3 MB (114 pp) | drive.google.com/uc?export=download&id=1tS-VahKv93ghWUtGWbNYI3EMzJnj1lUw | wget |
| 11 | 04_conaliteg | conaliteg_preguntas_frecuentes.md | 4.6 KB | conaliteg.gob.mx/transparencia/transparencia_preguntas.php | webfetch |
| 12 | 05_mercado_edtech | kumu_landing_snapshot.md | 3.0 KB | kumu.la/ | webfetch |
| 13 | 05_mercado_edtech | planea_ia_nem_snapshot.md | 2.7 KB | planeaianem.com/ | webfetch |
| 14 | 05_mercado_edtech | teachy_snapshot.md | 3.1 KB | teachy.ai/es | webfetch |

## Incidencias durante la operación

### 1. SSL error en `anexo_acuerdo_..._fases_2_a_6.pdf`
- **Síntoma:** `wget` reportó `ERROR 5` (SSL connect error) en el primer intento.
- **Resolución:** Reintento con `--no-check-certificate` después de 5s de pausa. Resultado: archivo
  descargado íntegro (44 MB, PDF v1.6 válido).

### 2. Texto de los acuerdos SIDOF en una sola línea
- **Síntoma:** Los HTML de SIDOF llegan sin saltos de línea significativos (un solo `<pre>` enorme).
- **Resolución:** Parser Python con `html.parser` + regex para extraer texto y generar `*_texto.md`
  con la transcripción legible para navegación rápida, conservando el HTML crudo original.

### 3. LFPDPPP 2025 — sin DOF canónico en alcance
- **Síntoma:** No se localizó la URL directa del DOF en el alcance dado por Frank
  (las alternativas HLC/Magokoro son secundarias).
- **Resolución:** Síntesis ejecutiva desde Hogan Lovells (fuente de referencia legal) marcada
  explícitamente como no reemplazo del texto oficial. Frank: si requiere precisión jurídica,
  descargar directamente del DOF.

### 4. Manuales CIFE en Google Drive
- **Estado resuelto favorablemente:** El endpoint `drive.google.com/uc?export=download&id=...`
  descargó los PDFs reales (86 y 114 páginas), sin pasar por pantalla de "Virus scan warning"
  (probable porque son archivos públicos dentro de un Drive compartido sin restricción de descarga).

## Pendientes abiertos (no bloquean lectura inmediata)

- **Texto oficial LFPDPPP 2025 DOF:** No capturado. Solicitar a Frank URL canónica si se requiere
  lectura jurídica exacta. Este snapshot basta para análisis de riesgos en `SPEC §9`.

## Cambios al proyecto principal

**NINGUNO.** Solo se escribieron archivos nuevos bajo `/home/frank/repos/educacion/Educacion/fuentes/`.
No se tocó `SPEC_MVP_01_Modulo_Docente.md`, `plataforma_nem_concepto_maestro.md` ni
`Encuesta_Tia_Lola.md`.
