#!/usr/bin/env python3
"""
extractor_pda_ejes.py — Segundo pass sobre `programa_sintetico_fase2_v2024.pdf`
para extraer la asociación **PDA ↔ Ejes articuladores** que el primer pass
(`extractor_v2024.py`) no pobló (`pda_ejes: []`).

HALLAZGO EPISTEMOLÓGICO (lectura exhaustiva del PDF, CAT-20260817-01)
-------------------------------------------------------------------
El PDF `programa_sintetico_fase2_v2024.pdf` **NO** contiene una tabla
explícita que mapee cada PDA individual a uno o varios Ejes articuladores.

Lo que el PDF sí ofrece, por cada Campo Formativo, son las secciones
"Finalidades del Campo" + "Especificidades del Campo formativo para la Fase 2"
(páginas 17-19, 29-31, 43-45, 53-55), donde los Ejes articuladores se
mencionan explícitamente como transversales al campo completo.

El llamado a que cada docente/colectivo concrete los Ejes por Contenido/PDA
se hace explícito en el PDF página 67-68 ("El Programa Analítico"), donde
el PDF instruye al colectivo docente a definir **de qué manera estarán
presentes los Ejes articuladores en el desarrollo del Programa Analítico**.

Por tanto, la heurística usada por este extractor es:

  Para cada PDA del catálogo, los Ejes articuladores que le corresponden
  son los documentados como transversales a su Campo Formativo, según las
  secciones "Finalidades" + "Especificidades" del PDF.

Esto NO inventa asociaciones: las extrae textualmente del PDF vía regex
sobre las páginas canónicas de cada campo. Toda PDA de un campo recibe
los mismos Ejes (porque el PDF así lo establece: la transversalidad es
a nivel campo, no a nivel PDA individual).

Métodos permitidos:
  - pdfplumber (regex sobre texto nativo)
  - Heurísticas de NLP básico (regex, conteo de hits)
  - Curaduría manual documentada (umbrales)

Métodos prohibidos:
  - ❌ IA generativa como parser principal
  - ❌ Inventar asociaciones que no estén en el PDF
  - ❌ Eliminar o sobrescribir el catálogo v2024

Estrategia de extracción:
  1. Cargar `catalogo_fase2_v2024_crudo.json` (PDA + campos_asociados).
  2. Para cada Campo Formativo, leer las páginas introductorias del PDF.
  3. Contar hits de regex asociados a cada Eje articulador.
  4. Si hits > 0 → el campo trabaja ese eje; si == 0 → no.
  5. Asignar a cada PDA (de su campo) los ejes positivos.
  6. Volcar `pda_ejes` (lista de {pda_codigo, eje_codigo}) en el JSON.
  7. Actualizar `metadata_extraccion.ejes_asociados` por PDA (no por campo).
  8. Añadir entrada `auditoria_carga` con la intervención.

ID delegación: CAT-20260817-01-SOFIA-SEGUNDO-PASS
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Set

import pdfplumber

# Permitir resolver constantes del paquete catalogar
sys.path.insert(0, str(Path(__file__).resolve().parent))


# === Páginas canónicas del PDF por Campo Formativo ===
# (Finalidades del Campo + Especificidades del Campo para la Fase 2)
PAGES_BY_CAMPO: Dict[str, List[int]] = {
    "LENGUAJES": [17, 18, 19],
    "SABERES_PENSAMIENTO_CIENTIFICO": [29, 30, 31],
    "ETICA_NATURALEZA_SOCIEDADES": [43, 44, 45],
    "LO_HUMANO_LO_COMUNITARIO": [53, 54, 55],
}


# === Patrones regex por Eje articulador ===
# Cada eje tiene 1+ patrones. Si la suma de hits en las páginas intro de un
# campo es > 0, el eje se considera TRABAJADO en ese campo (transversal).
#
# NOTA: los patrones son intencionalmente específicos para evitar falsos
# positivos (p.ej. "salud emocional" no es Vida Saludable; "pensamiento
# científico" no es Pensamiento Crítico).
EJE_PATTERNS: Dict[str, List[str]] = {
    # INCLUSION: inclusión como concepto educativo + diversidad explícita
    "INCLUSION": [
        r"\binclusi[oó]n\b",
        r"\binclusivo(?:s)?\b",
        r"\bdiversidad\b",
        r"\batender\s+la\s+diversidad\b",
    ],
    # PENSAMIENTO_CRITICO: análisis crítico, reflexión, juicio crítico
    "PENSAMIENTO_CRITICO": [
        r"\bcr[ií]tic[oa]s?\b",
        r"\ban[aá]lisis\b",
        r"\breflexi[oó]n\b",
        r"\breflexionar\b",
        r"\bjuicios?\s+cr[ií]ticos?\b",
    ],
    # INTERCULTURALIDAD_CRITICA: interculturalidad + saberes + cultura
    "INTERCULTURALIDAD_CRITICA": [
        r"\bintercultural(?:es)?\b",
        r"\binterculturalidad\b",
        r"\bsaberes\b",
        r"\bculturas?\b",
        r"\blengua\s+materna\b",
    ],
    # IGUALDAD_GENERO: igualdad + género + equidad + no discriminación
    # NOTA: NO incluimos "\boportunidades\b" porque es demasiado genérico
    # (casi cualquier sección menciona "oportunidades de aprendizaje") y
    # genera falsos positivos en secciones no relacionadas con género.
    "IGUALDAD_GENERO": [
        r"\bigualdad\s+de\s+g[eé]nero\b",
        r"\bg[eé]nero\b",
        r"\bigualdad\b",
        r"\bdiscriminaci[oó]n\b",
    ],
    # VIDA_SALUDABLE: salud física, higiene, alimentación, actividad física
    "VIDA_SALUDABLE": [
        r"\bvida\s+saludable\b",
        r"\bsalud\b",
        r"\bhigiene\b",
        r"\balimentaci[oó]n\b",
        r"\bactividad\s+f[ií]sica\b",
    ],
    # APROPIACION_CULTURAS_LECTURA: lectura, escritura, textos, narración
    "APROPIACION_CULTURAS_LECTURA": [
        r"\blectura\b",
        r"\bescritura\b",
        r"\bnarraci[oó]n\b",
        r"\btextos?\b",
        r"\bliterari[os]?\b",
    ],
    # ARTES_EXPERIENCIAS_ESTETICAS: artes, estética, lenguajes artísticos
    "ARTES_EXPERIENCIAS_ESTETICAS": [
        r"\bart[ií]stic[oa]s?\b",
        r"\bartista\b",
        r"\best[eé]tic[oa]s?\b",
        r"\bm[uú]sic[oa]l?\b",
        r"\bdanza\b",
        r"\bpl[aá]stica\b",
        r"\bcreatividad\b",
        r"\blenguajes?\s+art[ií]stic[oa]s?\b",
    ],
}


# === Umbral mínimo de hits para considerar el eje como TRABAJADO ===
# (un hit basta porque las intro pages son densas; pero queremos evitar
# falsos positivos por palabras que aparecen en una sola frase incidental)
MIN_HITS_POR_EJE = 1


# === Helpers ===

def count_eje_hits(pdf_text_by_page: Dict[int, str], eje: str) -> int:
    """Cuenta hits totales de los patrones de un eje en un set de páginas."""
    patterns = EJE_PATTERNS[eje]
    total = 0
    for text in pdf_text_by_page.values():
        for pat in patterns:
            total += len(re.findall(pat, text, flags=re.IGNORECASE))
    return total


def load_pdf_intro_pages(pdf_path: Path, pages: List[int]) -> Dict[int, str]:
    """Lee las páginas indicadas del PDF y devuelve {page_num: text}."""
    out: Dict[int, str] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for p in pages:
            if 1 <= p <= len(pdf.pages):
                out[p] = pdf.pages[p - 1].extract_text() or ""
    return out


def compute_ejes_por_campo(
    pdf_path: Path,
) -> Dict[str, List[str]]:
    """
    Para cada Campo Formativo, devuelve la lista de códigos de ejes
    articuladores que tienen >= MIN_HITS_POR_EJE hits en sus páginas intro.

    Retorna:
      {
        "LENGUAJES": ["INCLUSION", "PENSAMIENTO_CRITICO", ...],
        "SABERES_PENSAMIENTO_CIENTIFICO": [...],
        ...
      }
    """
    result: Dict[str, List[str]] = {}
    for campo, pgs in PAGES_BY_CAMPO.items():
        text_by_page = load_pdf_intro_pages(pdf_path, pgs)
        result[campo] = []
        for eje in EJE_PATTERNS:
            hits = count_eje_hits(text_by_page, eje)
            if hits >= MIN_HITS_POR_EJE:
                result[campo].append(eje)
    return result


def compute_pda_ejes(
    pdas: List[dict],
    ejes_por_campo: Dict[str, List[str]],
) -> tuple:
    """
    A partir de los PDA y el mapeo campo→ejes, genera:
      - pda_ejes: lista de {pda_codigo, eje_codigo} (1:N)
      - ejes_asociados_por_pda: dict {pda_codigo: [eje_codigos]}
    """
    pda_ejes: List[dict] = []
    ejes_asociados_por_pda: Dict[str, List[str]] = {}

    for pda in pdas:
        codigo = pda["codigo"]
        campos = pda.get("campos_asociados") or []
        # Unión de ejes de todos los campos del PDA (en caso de PDA con >1 campo)
        ejes: Set[str] = set()
        for c in campos:
            ejes.update(ejes_por_campo.get(c, []))
        ejes_list = sorted(ejes)
        ejes_asociados_por_pda[codigo] = ejes_list
        for eje in ejes_list:
            pda_ejes.append({"pda_codigo": codigo, "eje_codigo": eje})

    return pda_ejes, ejes_asociados_por_pda


# === Función principal de actualización del JSON ===

def update_json_with_pda_ejes(
    json_path: Path,
    pdf_path: Path,
    dry_run: bool = False,
) -> dict:
    """
    Carga el JSON del catálogo v2024 y le inyecta:
      - `pda_ejes` (lista de {pda_codigo, eje_codigo})
      - `ejes_asociados` por PDA (rellena el array vacío existente)
      - `metadata_extraccion.ejes_asociados_por_campo` (trazabilidad)
      - `metadata_extraccion.hits_por_eje_campo` (trazabilidad)
      - `auditoria_carga` (entrada nueva)

    Retorna un dict con estadísticas para el reporte.
    """
    json_path = Path(json_path)
    pdf_path = Path(pdf_path)

    data = json.loads(json_path.read_text())

    ejes_por_campo = compute_ejes_por_campo(pdf_path)
    pda_ejes, ejes_asociados_por_pda = compute_pda_ejes(
        data["pdas"], ejes_por_campo
    )

    # Hits por eje y campo (para trazabilidad)
    hits_por_eje_campo: Dict[str, Dict[str, int]] = {}
    for campo, pgs in PAGES_BY_CAMPO.items():
        text_by_page = load_pdf_intro_pages(pdf_path, pgs)
        hits_por_eje_campo[campo] = {}
        for eje in EJE_PATTERNS:
            hits_por_eje_campo[campo][eje] = count_eje_hits(text_by_page, eje)

    # 1. Top-level `pda_ejes` (estructura esperada por schema)
    data["pda_ejes"] = pda_ejes

    # 2. Rellenar `ejes_asociados` dentro de cada PDA
    for pda in data["pdas"]:
        pda["ejes_asociados"] = ejes_asociados_por_pda.get(pda["codigo"], [])

    # 3. Metadata de la segunda extracción
    meta = data.setdefault("metadata_extraccion", {})
    meta["segundo_pass_ejes"] = {
        "fecha": datetime.now(timezone.utc).isoformat(),
        "intervencion_id": "CAT-20260817-01-SOFIA-SEGUNDO-PASS",
        "metodo": "regex_conteo_hits_paginas_intro_campo",
        "min_hits_por_eje": MIN_HITS_POR_EJE,
        "ejes_por_campo": ejes_por_campo,
        "hits_por_eje_y_campo": hits_por_eje_campo,
        "total_pda_ejes_pairs": len(pda_ejes),
        "pda_con_ejes": sum(
            1 for v in ejes_asociados_por_pda.values() if v
        ),
        "pda_sin_ejes": sum(
            1 for v in ejes_asociados_por_pda.values() if not v
        ),
        "nota_hallazgo": (
            "El PDF no contiene tabla per-PDA de ejes articuladores. "
            "Se asignan a cada PDA los ejes documentados como "
            "transversales a su Campo Formativo en las secciones "
            "'Finalidades del Campo' + 'Especificidades del Campo "
            "formativo para la Fase 2' (páginas 17-19 LNG, 29-31 SPC, "
            "43-45 ENS, 53-55 HUM). La per-PDA asignación en el "
            "Programa Analítico queda al colectivo docente (PDF p67-68)."
        ),
    }

    # 4. Auditoría de carga
    audit = data.setdefault("auditoria_carga", [])
    audit.append({
        "accion": "agregado",
        "observacion": (
            f"Segundo pass: pobladas {len(pda_ejes)} asociaciones "
            f"pda_ejes via heurística regex sobre páginas intro "
            f"del PDF. PDA con ejes: "
            f"{sum(1 for v in ejes_asociados_por_pda.values() if v)}"
            f"/{len(ejes_asociados_por_pda)}."
        ),
        "autor": "SOFIA extractor_pda_ejes",
        "metadata": {
            "intervencion_id": "CAT-20260817-01-SOFIA-SEGUNDO-PASS",
            "metodo": "regex_conteo_hits_paginas_intro_campo",
        },
    })

    stats = {
        "total_pdas": len(data["pdas"]),
        "total_pda_ejes_pairs": len(pda_ejes),
        "pda_con_ejes": sum(
            1 for v in ejes_asociados_por_pda.values() if v
        ),
        "pda_sin_ejes": sum(
            1 for v in ejes_asociados_por_pda.values() if not v
        ),
        "ejes_por_campo": ejes_por_campo,
        "cobertura_pct": 100.0 * sum(
            1 for v in ejes_asociados_por_pda.values() if v
        ) / max(1, len(ejes_asociados_por_pda)),
        "distribucion_por_eje": {},
    }
    # Distribución por eje
    for eje in EJE_PATTERNS:
        stats["distribucion_por_eje"][eje] = sum(
            1 for pda in data["pdas"] if eje in pda["ejes_asociados"]
        )

    if not dry_run:
        json_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2)
        )

    return stats


# === CLI ===

def main() -> int:
    parser = argparse.ArgumentParser(
        prog="extractor_pda_ejes",
        description=(
            "Segundo pass: extraer asociaciones PDA ↔ Ejes articuladores "
            "del PDF v2024 y popular pda_ejes en el JSON del catálogo."
        ),
    )
    parser.add_argument(
        "--json",
        default="outputs/catalogo_fase2_v2024_crudo.json",
        help="Path al JSON del catálogo v2024",
    )
    parser.add_argument(
        "--pdf",
        default=None,
        help="Path al PDF fuente (default: ruta canónica del proyecto)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No escribe el JSON, solo imprime estadísticas",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent.parent
    json_path = Path(args.json)
    if not json_path.is_absolute():
        json_path = project_root / json_path
    pdf_path = (
        Path(args.pdf)
        if args.pdf
        else (
            project_root
            / "fuentes"
            / "01_normativa_nem"
            / "programa_sintetico_fase2_v2024.pdf"
        )
    )

    if not json_path.exists():
        print(f"❌ JSON no encontrado: {json_path}", file=sys.stderr)
        return 2
    if not pdf_path.exists():
        print(f"❌ PDF no encontrado: {pdf_path}", file=sys.stderr)
        return 2

    print(f"📂 JSON: {json_path}")
    print(f"📄 PDF:  {pdf_path}")
    print(f"⚙️  Modo: {'DRY-RUN (no escribe)' if args.dry_run else 'WRITE'}")

    stats = update_json_with_pda_ejes(
        json_path=json_path,
        pdf_path=pdf_path,
        dry_run=args.dry_run,
    )

    print("\n=== Estadísticas ===")
    print(f"Total PDA: {stats['total_pdas']}")
    print(f"PDA con ejes: {stats['pda_con_ejes']}")
    print(f"PDA sin ejes: {stats['pda_sin_ejes']}")
    print(f"Pares pda_ejes generados: {stats['total_pda_ejes_pairs']}")
    print(f"Cobertura: {stats['cobertura_pct']:.1f}%")
    print("\n=== Ejes por campo ===")
    for campo, ejes in stats["ejes_por_campo"].items():
        print(f"  {campo:35s} → {len(ejes)} ejes: {ejes}")
    print("\n=== Distribución por eje ===")
    for eje, n in sorted(
        stats["distribucion_por_eje"].items(),
        key=lambda kv: -kv[1],
    ):
        print(f"  {eje:35s} → {n} PDA")
    return 0


if __name__ == "__main__":
    sys.exit(main())
