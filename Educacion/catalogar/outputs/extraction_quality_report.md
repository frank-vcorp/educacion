# Reporte de calidad — Extracción Fase 2 NEM

**Fecha:** 2026-08-13T04:35:40.995307+00:00
**PDF fuente:** `anexo_acuerdo_14_08_22_programas_sinteticos.pdf`
**SHA256:** `26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0`

## Métricas de cobertura

| Métrica | Valor |
|---|---|
| Páginas totales | 479 |
| Páginas con texto nativo (pdfplumber) | 5 |
| Páginas escaneadas (sin texto) | 474 |
| Páginas OCR exitoso | 0 |
| Páginas OCR fallido | 474 |
| Páginas sin procesar | 474 |
| **Cobertura textual estimada** | **1.0%** |

## Métricas de catálogo

| Métrica | Valor |
|---|---|
| PDA candidatos generados | 24 |
| PDA confirmados (texto + página) | 0 |
| PDA que requieren revisión humana | 24 |
| Contenidos detectados | 4 |
| Campos formativos detectados | 4 (LENGUAJES, SABERES_PENSAMIENTO_CIENTIFICO, ETICA_NATURALEZA_SOCIEDADES, LO_HUMANO_LO_COMUNITARIO) |
| Ejes articuladores detectados | 0 (ninguno) |

## Diagnóstico

⚠️ **Cobertura textual 1.0% — por debajo del umbral mínimo del 60%.**

Causa raíz: el PDF es un escaneo (479 páginas, solo 5 con texto nativo).
Sin OCR (tesseract) instalado en el sistema, la extracción automática
de PDA/contenidos queda limitada al índice y los marcadores detectados.

**Acción recomendada:**
1. Instalar tesseract: `sudo apt install tesseract-ocr tesseract-ocr-spa`
2. Volver a ejecutar `python3 catalogar_fase2.py extract`.
3. Si sigue habiendo huecos, ejecutar OCR externo con `ocrmypdf` y reintentar.
4. Como último recurso, el founder puede completar manualmente
   `catalogo_fase2_crudo.json` y marcar `requiere_revision_humana: false`.
