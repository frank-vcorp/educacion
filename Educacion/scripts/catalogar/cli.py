#!/usr/bin/env python3
"""
catalogar_fase2.py — CLI principal para catalogar Fase 2 NEM (preescolar).

Sub-comandos:
  extract     Extrae propuesta cruda desde el PDF maestro.
  build-sql   Genera migración SQL desde JSON curado.
  audit       Genera reporte de auditoría markdown.

Uso:
  python3 catalogar_fase2.py extract
  python3 catalogar_fase2.py build-sql --input outputs/catalogo_fase2_crudo.json
  python3 catalogar_fase2.py audit    [--input outputs/catalogo_fase2_crudo.json]

Implementación del SPEC E14 (catálogo autónomo Fase 2).
"""

import argparse
import hashlib
import json
import logging
import sys
from datetime import date
from pathlib import Path

from pydantic import ValidationError

from constants import (
    CATALOGO_VERSION,
    CAMPOS_FORMATIVOS,
    EJES_ARTICULADORES,
    FASES,
)
from schema import CatalogoFase2
from extractor import Extractor
from modelador import guardar_migracion
from auditor import guardar_auditoria

# === Rutas canónicas del proyecto ===
#
# Layout esperado:
#   Educacion/
#   ├── fuentes/01_normativa_nem/anexo_acuerdo_14_08_22_programas_sinteticos.pdf
#   └── scripts/
#       ├── catalogar_fase2.py     (entry-point, wrapper sobre el paquete)
#       └── catalogar/             (paquete)
#             ├── cli.py
#             ├── extractor.py
#             ├── ...
#             └── outputs/         (resultados por defecto)
#
# __file__ = .../scripts/catalogar/cli.py
#   parent           = .../scripts/catalogar/
#   parent.parent    = .../scripts/
#   parent.parent.parent = .../Educacion/

PROJECT_ROOT = Path(__file__).parent.parent.parent
DEFAULT_PDF = PROJECT_ROOT / "fuentes" / "01_normativa_nem" / "anexo_acuerdo_14_08_22_programas_sinteticos.pdf"
OUTPUTS_DIR = Path(__file__).parent / "outputs"


# === Setup logging ===

def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


# === Modo extract ===

def cmd_extract(args) -> int:
    pdf_path = Path(args.pdf) if args.pdf else DEFAULT_PDF
    if not pdf_path.exists():
        print(f"❌ PDF no encontrado: {pdf_path}", file=sys.stderr)
        return 2

    out_dir = Path(args.output_dir) if args.output_dir else OUTPUTS_DIR
    print(f"📄 PDF fuente: {pdf_path}")
    print(f"📁 Outputs en: {out_dir}")

    use_ocr = not args.no_ocr
    prefer_ocrmypdf = not args.no_ocrmypdf
    ocr_timeout = args.ocr_timeout

    extractor = Extractor(
        pdf_path,
        out_dir,
        use_ocr=use_ocr,
        prefer_ocrmypdf=prefer_ocrmypdf,
        ocr_timeout_seg=ocr_timeout,
        max_pages=args.max_pages,
    )
    if args.force_ocr:
        # Borrar cache para forzar re-OCR
        cache_dir = out_dir / "ocr_cache"
        if cache_dir.exists():
            import shutil
            for f in cache_dir.glob("*.ocr.pdf"):
                f.unlink()
            extractor._log(f"Cache OCR eliminado (--force-ocr): {cache_dir}")

    catalogo_dict = extractor.extract()

    # Validar contra schema (best-effort: warnings, no abort)
    try:
        CatalogoFase2.model_validate(catalogo_dict)
        print("✓ Validación pydantic: PASS")
    except ValidationError as e:
        print(f"⚠️  Validación pydantic con advertencias (no fatal): {e.error_count()} errores")
        for err in e.errors()[:10]:
            print(f"   - {err['loc']}: {err['msg']}")

    print("\n✓ Extracción completa:")
    print(f"   PDA candidatos: {extractor.stats.candidatos_pda}")
    print(f"   PDA que requieren revisión: {extractor.stats.pda_requieren_revision}")
    cobertura = (
        100.0 * extractor.stats.paginas_con_texto_nativo / extractor.stats.total_paginas
        if extractor.stats.total_paginas else 0.0
    )
    print(f"   Cobertura textual: {cobertura:.1f}%")
    print(f"   Outputs en: {out_dir}/")
    print(f"      - catalogo_fase2_crudo.json")
    print(f"      - extraction_log.md")
    print(f"      - extraction_quality_report.md")
    return 0


# === Modo build-sql ===

def cmd_build_sql(args) -> int:
    input_path = Path(args.input) if args.input else OUTPUTS_DIR / "catalogo_fase2_crudo.json"
    if not input_path.exists():
        print(f"❌ JSON de entrada no encontrado: {input_path}", file=sys.stderr)
        return 2

    out_dir = Path(args.output_dir) if args.output_dir else OUTPUTS_DIR

    print(f"📥 Cargando: {input_path}")
    data = json.loads(input_path.read_text())

    # Si no tiene IDs asignados, los asignamos nosotros (modo skeleton)
    # Para CatalogoFase2, los IDs son opcionales.
    try:
        catalogo = CatalogoFase2.model_validate(data)
    except ValidationError as e:
        print(f"❌ JSON no válido contra schema: {e}", file=sys.stderr)
        return 3

    out_sql = guardar_migracion(catalogo, out_dir, fecha=args.fecha or date.today().isoformat())
    print(f"✓ SQL generado: {out_sql}")
    print(f"   Tablas: 10 (catalogo_version, campo_formativo, eje_articulador, fase, pda, contenido, ...)")
    print(f"   PDA insertados: {len(catalogo.pdas)}")
    print(f"   Aplicar en Supabase con: psql -f {out_sql}")
    return 0


# === Modo audit ===

def cmd_audit(args) -> int:
    input_path = Path(args.input) if args.input else OUTPUTS_DIR / "catalogo_fase2_crudo.json"
    if not input_path.exists():
        print(f"❌ JSON de entrada no encontrado: {input_path}", file=sys.stderr)
        return 2

    out_dir = Path(args.output_dir) if args.output_dir else OUTPUTS_DIR

    print(f"📥 Cargando: {input_path}")
    data = json.loads(input_path.read_text())

    try:
        catalogo = CatalogoFase2.model_validate(data)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

    sha_pdf = data.get("metadata_extraccion", {}).get("pdf_sha256", "")
    if not sha_pdf:
        # fallback: recalcular
        if DEFAULT_PDF.exists():
            h = hashlib.sha256()
            with open(DEFAULT_PDF, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    h.update(chunk)
            sha_pdf = h.hexdigest()
        else:
            sha_pdf = "DESCONOCIDO"

    out_audit = guardar_auditoria(
        catalogo,
        out_dir,
        sha_pdf,
        fecha=args.fecha or date.today().isoformat(),
        metodo_extraccion=data.get("metadata_extraccion", {}).get("metodo_extraccion_texto"),
    )
    print(f"✓ Auditoría generada: {out_audit}")
    print(f"   PDA con texto confirmado: {sum(1 for p in catalogo.pdas if p.texto and not p.requiere_revision_humana)}")
    print(f"   PDA pendientes revisión: {sum(1 for p in catalogo.pdas if p.requiere_revision_humana or not p.texto)}")
    return 0


# === CLI principal ===

def main() -> int:
    parser = argparse.ArgumentParser(
        prog="catalogar_fase2",
        description="Catalogador autónomo NEM Fase 2 (preescolar) — SPEC E14",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Logging debug")
    sub = parser.add_subparsers(dest="cmd", required=True)

    # extract
    p_extract = sub.add_parser("extract", help="Extraer propuesta cruda desde PDF")
    p_extract.add_argument("--pdf", type=str, help="Ruta al PDF maestro (default: canónica)")
    p_extract.add_argument("--output-dir", type=str, help="Directorio de salida (default: outputs/)")
    p_extract.add_argument("--no-ocr", action="store_true",
                           help="Deshabilita OCR (solo texto nativo; rápido pero cobertura baja)")
    p_extract.add_argument("--no-ocrmypdf", action="store_true",
                           help="No usar ocrmypdf pre-OCR (cae a per-page tesseract)")
    p_extract.add_argument("--force-ocr", action="store_true",
                           help="Fuerza re-OCR aunque exista cache")
    p_extract.add_argument("--ocr-timeout", type=int, default=1800,
                           help="Timeout en segundos para ocrmypdf (default: 1800 = 30min)")
    p_extract.add_argument("--max-pages", type=int, default=None,
                           help="Límite de páginas a extraer (útil para Fase 2: ~100). "
                                "Sobre el límite se omite OCR (placeholders honestos).")

    # build-sql
    p_sql = sub.add_parser("build-sql", help="Generar migración SQL desde JSON curado")
    p_sql.add_argument("--input", type=str, help="JSON curado (default: outputs/catalogo_fase2_crudo.json)")
    p_sql.add_argument("--output-dir", type=str, help="Directorio de salida (default: outputs/)")
    p_sql.add_argument("--fecha", type=str, help="Fecha para nombre archivo (YYYY-MM-DD)")

    # audit
    p_audit = sub.add_parser("audit", help="Generar reporte de auditoría")
    p_audit.add_argument("--input", type=str, help="JSON (default: outputs/catalogo_fase2_crudo.json)")
    p_audit.add_argument("--output-dir", type=str, help="Directorio de salida (default: outputs/)")
    p_audit.add_argument("--fecha", type=str, help="Fecha para nombre archivo (YYYY-MM-DD)")

    args = parser.parse_args()
    setup_logging(args.verbose)

    if args.cmd == "extract":
        return cmd_extract(args)
    elif args.cmd == "build-sql":
        return cmd_build_sql(args)
    elif args.cmd == "audit":
        return cmd_audit(args)
    return 1


if __name__ == "__main__":
    sys.exit(main())
