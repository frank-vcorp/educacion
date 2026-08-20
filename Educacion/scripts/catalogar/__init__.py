"""Paquete catalogar: motor de catalogación NEM Fase 2 (preescolar).

Implementación operativa del SPEC E14 (Catalogación Autónoma Fase 2).

Sub-módulos:
  - constants   datos canónicos Fase 2 (campos, ejes, fases, placeholders CONALITEG)
  - schema      modelos pydantic v2 para validar el JSON
  - extractor   extracción PDF multi-capa (nativo + ocrmypdf + tesseract)
  - modelador   generador SQL para Supabase
  - auditor     generador reporte de auditoría markdown
  - cli         entry-point CLI (argparse, sub-comandos extract/build-sql/audit)
"""

__version__ = "0.3.0"
