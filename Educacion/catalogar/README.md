# Catalogar Fase 2 NEM — `catalogar_fase2.py`

Implementación operativa del SPEC **E14 § Catálogo autónomo Fase 2 (preescolar)**.
Tres sub-comandos para extraer, modelar y auditar el catálogo NEM.

## TL;DR

```bash
# 1. Instalar dependencias
pip install --user -r requirements.txt

# 2. Extraer propuesta cruda desde el PDF maestro
python3 catalogar_fase2.py extract

# 3. Generar migración SQL (Supabase-ready)
python3 catalogar_fase2.py build-sql

# 4. Generar reporte de auditoría
python3 catalogar_fase2.py audit

# Outputs en outputs/
ls outputs/
#   catalogo_fase2_crudo.json        <- propuesta cruda (Capa 1)
#   extraction_log.md                <- log de extracción
#   extraction_quality_report.md     <- métricas de calidad
#   migrations/YYYY-MM-DD_catalogo_fase2.sql
#   AUDITORIA_catalogo_fase2_YYYY-MM-DD.md
```

## Modos

### `extract`
- Lee `fuentes/01_normativa_nem/anexo_acuerdo_14_08_22_programas_sinteticos.pdf`
- Calcula SHA256 del PDF (trazabilidad E14 §8.1)
- Extrae texto nativo (pdfplumber) + OCR si tesseract está disponible
- Detecta campos formativos, ejes articuladores, PDA con regex
- **Regla dura**: si no puede parsear, marca `requiere_revision_humana=true` con razón. NUNCA alucina contenido.
- Output: `outputs/catalogo_fase2_crudo.json`

### `build-sql`
- Lee `outputs/catalogo_fase2_crudo.json`
- Valida contra schema pydantic
- Genera `outputs/migrations/YYYY-MM-DD_catalogo_fase2.sql` (Supabase/Postgres-ready)
- DROP TABLE IF EXISTS al inicio (idempotencia)
- Inserts en orden topológico (catalogo_version → campos → ejes → fases → pda → relaciones)
- Aplicar: `psql -h ... -f outputs/migrations/YYYY-MM-DD_catalogo_fase2.sql`

### `audit`
- Lee el JSON (crudo o curado)
- Genera `outputs/AUDITORIA_catalogo_fase2_YYYY-MM-DD.md` (formato E14 §8.2)
- Lista explícita de PDA y referencias que requieren intervención humana

## Estructura de archivos

```
catalogar/
├── README.md                  <- este archivo
├── requirements.txt           <- dependencias exactas
├── catalogar_fase2.py         <- CLI principal (3 sub-comandos)
├── constants.py               <- datos canónicos Fase 2 (campos, ejes, fases)
├── schema.py                  <- modelos pydantic v2
├── extractor.py               <- lógica de extracción PDF
├── modelador.py               <- generador SQL
├── auditor.py                 <- generador reporte auditoría
├── tests/                     <- smoke tests
│   ├── test_schema.py
│   └── test_extractor.py
└── outputs/                   <- generado al ejecutar
    ├── catalogo_fase2_crudo.json
    ├── extraction_log.md
    ├── extraction_quality_report.md
    ├── migrations/
    │   └── YYYY-MM-DD_catalogo_fase2.sql
    └── AUDITORIA_catalogo_fase2_YYYY-MM-DD.md
```

## Hallazgo técnico importante (desviación del SPEC E14 §6.1)

El PDF maestro es un **escaneo** (Hewlett-Packard MFP, Adobe Acrobat 9.0 Paper Capture Plug-in):
- 479 páginas totales
- Solo 5 páginas (índice) tienen texto nativo extraíble con pdfplumber
- 474 páginas son imágenes escaneadas sin capa de texto

**Por tanto:**
- Sin OCR (tesseract), la extracción automática de PDA/contenidos es muy limitada.
- El script genera **placeholders honestos** marcados con `requiere_revision_humana=true`.
- Cada PDA placeholder tiene `texto: null`, `fuente_dof_pagina: null`, y una razón específica.

**Para activar OCR completo:**
```bash
sudo apt install tesseract-ocr tesseract-ocr-spa
python3 catalogar_fase2.py extract
```

El script detecta tesseract automáticamente. Si está, hace OCR página por página (lento: ~5-10 min).

## Convenciones del JSON (E14 §5)

- **Trazabilidad**: cada PDA lleva `fuente_dof_pagina` (int) y `fuente_dof_sha` (sha256 hex 64 chars).
- **CONALITEG = solo URL + metadatos**. NUNCA contenido editorial.
- **No alucinación**: si el parser no encuentra, `texto: null` + `requiere_revision_humana: true`.

## Validaciones

- Schema pydantic en `schema.py` (ejecuta al cargar JSON en `build-sql` y `audit`).
- Validación de longitud SHA256 (constraint SQL `length(fuente_sha256) = 64`).

## Próximos pasos (workflow del founder)

1. Ejecutar `extract` → revisar `extraction_quality_report.md`
2. Si cobertura < 60%: instalar tesseract y re-ejecutar.
3. Abrir `catalogo_fase2_crudo.json` y completar PDA/contenidos manualmente.
4. Marcar `requiere_revision_humana: false` en entradas curadas.
5. Ejecutar `build-sql` → revisar SQL.
6. Ejecutar `audit` → revisar reporte.
7. Aplicar migración en Supabase staging.

## Licencia y cumplimiento

- No se descarga contenido editorial de CONALITEG (cumple §3 anti-objetivo del SPEC E14).
- No se usa IA generativa para parsear PDA (cumple §11 del SPEC E14).
- Datos canónicos de campos/ejes/fases hardcodeados desde Plan 2022 SEP oficial.
