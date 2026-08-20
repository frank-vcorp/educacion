# Catalogar Fase 2 NEM — `catalogar_fase2.py`

Implementación operativa del SPEC **E14 § Catálogo autónomo Fase 2 (preescolar)**.
Tres sub-comandos para extraer, modelar y auditar el catálogo NEM.

## TL;DR

```bash
# 1. (Opcional) instalar dependencias si hace falta
pip install --user -r requirements.txt

# 2a. Modo rápido — solo texto nativo (CE1 < 5 min, cobertura ~1%)
python3 catalogar_fase2.py extract --no-ocr

# 2b. Modo alta cobertura — pre-OCR con ocrmypdf (~5-10 min una vez, cacheado)
python3 catalogar_fase2.py extract

# 3. Generar migración SQL (Supabase-ready)
python3 catalogar_fase2.py build-sql

# 4. Generar reporte de auditoría
python3 catalogar_fase2.py audit
```

Todos los outputs van a `catalogar/outputs/`:

```
catalogar/outputs/
├── catalogo_fase2_crudo.json             # propuesta cruda (Capa 1)
├── extraction_log.md                     # log de extracción
├── extraction_quality_report.md          # métricas de cobertura
├── migrations/
│   └── YYYY-MM-DD_catalogo_fase2.sql     # SQL para Supabase
├── ocr_cache/                            # cache de PDFs OCR (auto-generado)
│   └── <sha256>.ocr.pdf
└── AUDITORIA_catalogo_fase2_YYYY-MM-DD.md
```

## Modos

### `extract` — Extraer propuesta cruda

```bash
python3 catalogar_fase2.py extract [opciones]
```

| Flag | Default | Descripción |
|---|---|---|
| `--pdf PATH` | canónica | PDF maestro |
| `--output-dir DIR` | `catalogar/outputs/` | directorio de salida |
| `--no-ocr` | false | desactiva OCR (solo texto nativo) |
| `--no-ocrmypdf` | false | no usar ocrmypdf (cae a per-page tesseract, más lento) |
| `--force-ocr` | false | borra cache OCR y re-OCR desde cero |
| `--ocr-timeout SEC` | 1800 | timeout ocrmypdf en segundos |
| `--max-pages N` | None | limita páginas a procesar (útil para Fase 2: ~100) |
| `-v, --verbose` | false | logging debug |

**Estrategia de extracción (cascada):**

1. Texto nativo con pdfplumber (instantáneo, solo páginas con capa de texto).
2. Pre-OCR con ocrmypdf (rápido, multihilo, cacheado por SHA256 del PDF).
3. OCR página a página con tesseract (fallback).
4. Si todo falla: placeholders honestos marcados para revisión humana.

**Regla dura:** no alucinar PDA. Si no se encuentra, `texto: null` + `requiere_revision_humana: true`.

### `build-sql` — Generar migración SQL

```bash
python3 catalogar_fase2.py build-sql --input catalogo/outputs/catalogo_fase2_crudo.json
```

- Valida el JSON contra schema pydantic v2.
- Genera `catalogar/outputs/migrations/YYYY-MM-DD_catalogo_fase2.sql` (Supabase/Postgres).
- DROP TABLE IF EXISTS al inicio (idempotencia).
- Inserts en orden topológico (catalogo_version → campos → ejes → fases → pda → relaciones).
- Aplicar: `psql -h ... -f catalogar/outputs/migrations/YYYY-MM-DD_catalogo_fase2.sql`

### `audit` — Generar reporte de auditoría

```bash
python3 catalogar_fase2.py audit
```

- Genera `catalogar/outputs/AUDITORIA_catalogo_fase2_YYYY-MM-DD.md` (formato E14 §8.2).
- Lista explícita de PDA y referencias que requieren intervención humana.
- Hallazgos dinámicos según el método de extracción real.

## Estructura del paquete

```
scripts/
├── catalogar_fase2.py     # entry point (wrapper)
├── catalogar/             # paquete
│   ├── __init__.py
│   ├── cli.py             # CLI argparse
│   ├── constants.py       # datos canónicos Fase 2 (campos, ejes, fases)
│   ├── schema.py          # modelos pydantic v2
│   ├── extractor.py       # extracción PDF (nativo + ocrmypdf + tesseract)
│   ├── modelador.py       # generador SQL (Supabase/Postgres)
│   ├── auditor.py         # generador reporte auditoría
│   ├── requirements.txt
│   ├── tests/
│   │   ├── test_extractor.py
│   │   └── test_schema.py
│   └── outputs/           # generado al ejecutar
│       ├── ...
```

## Hallazgos técnicos importantes

1. **El PDF maestro es un escaneo** (Hewlett-Packard MFP, Adobe Acrobat 9.0 Paper Capture Plug-in):
   - 479 páginas totales, 5 fases (Fase 2 a 6).
   - Solo 5 páginas (índice) tienen texto nativo extraíble con pdfplumber.
   - 474 páginas son imágenes escaneadas sin capa de texto.

2. **OCR ya está disponible en el entorno** (tesseract 5.5.0 + ocrmypdf 17.10.0 instalados).
   - Pre-OCR con ocrmypdf tarda ~5-10 min para el PDF completo; se cachea por SHA256.
   - Ejecuciones posteriores sobre el cache son instantáneas.

3. **Fase 2 ocupa las primeras ~100 páginas** del PDF. Para una extracción dirigida:
   ```bash
   # Pre-OCR solo del slice Fase 2 (páginas 6-100, ahorra ~80% del tiempo):
   python3 -c "import fitz; src=fitz.open('fuentes/.../anexo.pdf'); dst=fitz.open(); \
     dst.insert_pdf(src, from_page=5, to_page=99); dst.save('/tmp/fase2.pdf')"
   TMPDIR=/home/frank/tmp/ ocrmypdf -l spa --jobs 4 --skip-text --quiet \
     /tmp/fase2.pdf /tmp/fase2_ocr.pdf
   python3 catalogar_fase2.py extract --pdf /tmp/fase2_ocr.pdf --no-ocr
   ```

## Convenciones del JSON (E14 §5)

- **Trazabilidad**: cada PDA lleva `fuente_dof_pagina` (int) y `fuente_dof_sha` (sha256 hex 64 chars).
- **CONALITEG = solo URL + metadatos**. NUNCA contenido editorial.
- **No alucinación**: si el parser no encuentra, `texto: null` + `requiere_revision_humana: true`.

## Validaciones

- Schema pydantic en `catalogar/schema.py` (ejecuta al cargar JSON en `build-sql` y `audit`).
- Validación de longitud SHA256 (constraint SQL `length(fuente_sha256) = 64`).
- SQL validado con `pglast` (parser oficial de Postgres vía libpg_query).

## Pruebas

```bash
cd catalogar/
python3 tests/test_extractor.py     # smoke tests de regex y entorno
python3 tests/test_schema.py        # validación de modelos pydantic
```

## Cumplimiento

- ✗ No se descarga contenido editorial de CONALITEG (cumple §3 anti-objetivo del SPEC E14).
- ✗ No se usa IA generativa para parsear PDA (cumple §11 del SPEC E14).
- ✓ Datos canónicos de campos/ejes/fases hardcodeados desde Plan 2022 SEP oficial.
- ✓ SHA256 del PDF fuente en cada registro de catálogo.
- ✓ SQL con constraints de integridad referencial (FK CASCADE).
