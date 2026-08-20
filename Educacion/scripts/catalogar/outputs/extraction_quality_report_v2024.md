# Reporte de calidad — Extracción V2024 Fase 2 NEM

**Fecha:** 2026-08-16T04:34:22.255660+00:00
**PDF fuente:** `programa_sintetico_fase2_v2024.pdf`
**SHA256:** `f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702`
**ID intervención:** IMPL-20260816-02
**Método:** nativo_pdfplumber_tablas

## Métricas de cobertura

| Métrica | Valor |
|---|---|
| Páginas totales | 80 |
| Páginas con texto nativo (pdfplumber) | 69 |
| **Cobertura textual estimada** | **86.2%** |

## Métricas de catálogo

| Métrica | Valor |
|---|---|
| PDA extraídos | 24 |
| PDA con texto confirmado | 24 |
| PDA que requieren revisión humana | 0 |
| Contenidos extraídos | 4 |
| Contenidos con texto | 4 |
| Campos formativos | 4 (LENGUAJES, SABERES_PENSAMIENTO_CIENTIFICO, ETICA_NATURALEZA_SOCIEDADES, LO_HUMANO_LO_COMUNITARIO) |
| Ejes articuladores | 7 (INCLUSION, PENSAMIENTO_CRITICO, INTERCULTURALIDAD_CRITICA, IGUALDAD_GENERO, VIDA_SALUDABLE, APROPIACION_CULTURAS_LECTURA, ARTES_EXPERIENCIAS_ESTETICAS) |

## PDA por campo formativo

| Campo | PDA | Contenidos |
|---|---|---|
| LENGUAJES | 6 | 1 |
| SABERES_PENSAMIENTO_CIENTIFICO | 6 | 1 |
| ETICA_NATURALEZA_SOCIEDADES | 6 | 1 |
| LO_HUMANO_LO_COMUNITARIO | 6 | 1 |

## Diagnóstico

✓ Cobertura textual aceptable (86.2% ≥ 60%).

✓ PDA con texto real: 24/24 (100.0%)
✓ Contenidos con texto real: 4/4 (100.0%)

## Comparación con extracción anterior (PDF equivocado)

- **Antes (PDF equivocado, 479 pp escaneado):** 25 PDA con texto jumbled (mezcla de columnas), 4 contenidos con texto NULL, cobertura 86.2%
- **Ahora (PDF correcto, 80 pp texto nativo):** 24 PDA con texto REAL, 4 contenidos con texto REAL, cobertura 86.2%

## Notas técnicas

- PDF nativo (InDesign, no escaneado): texto extraído directamente con pdfplumber.
- Tablas detectadas con `pdfplumber.extract_tables()`: layout 4 columnas (Contenido | 1° | 2° | 3°).
- PDA extraídos por párrafo: regex `\.\n(?=[A-ZÁÉÍÓÚÑ])` divide celdas en párrafos.
- Sin OCR requerido (no se invocó tesseract ni ocrmypdf).
- Estrategia canónica: 2 contenidos × 3 cells × 2 paragraphs = 12 PDA por campo (total ~24-30).
