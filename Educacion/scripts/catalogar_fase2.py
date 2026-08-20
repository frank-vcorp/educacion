#!/usr/bin/env python3
"""
catalogar_fase2.py — CLI de entrada para catalogar Fase 2 NEM (preescolar).

Wrapper delgado sobre el paquete `catalogar/` (mismo directorio padre).
Implementa los tres modos del SPEC E14 §6.2:

  extract     Extrae propuesta cruda desde el PDF maestro.
  build-sql   Genera migración SQL desde JSON curado.
  audit       Genera reporte de auditoría markdown.

Uso:
  python3 catalogar_fase2.py extract
  python3 catalogar_fase2.py build-sql --input outputs/catalogo_fase2_crudo.json
  python3 catalogar_fase2.py audit    [--input outputs/catalogo_fase2_crudo.json]

Opciones globales:
  -v, --verbose   Logging debug.

La implementación real vive en el paquete `catalogar/`:
  - catalogar/constants.py   datos canónicos Fase 2 (campos, ejes, fases)
  - catalogar/extractor.py   extracción PDF (nativo + ocrmypdf + tesseract)
  - catalogar/modelador.py   generador SQL (Supabase/Postgres)
  - catalogar/auditor.py     generador reporte auditoría
  - catalogar/schema.py      modelos pydantic v2
"""

import sys
from pathlib import Path

# Permitir ejecutar como `python3 catalogar_fase2.py` desde scripts/
# sin necesidad de instalar el paquete.
_PKG_DIR = Path(__file__).parent / "catalogar"
if str(_PKG_DIR) not in sys.path:
    sys.path.insert(0, str(_PKG_DIR))

# Importa y re-exporta la función `main` del módulo CLI del paquete.
from cli import main  # type: ignore  # noqa: E402


if __name__ == "__main__":
    sys.exit(main())
