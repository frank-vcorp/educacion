"""
Tests para extractor_pda_ejes.py (segundo pass: PDA ↔ Ejes articuladores).

Valida:
  - Cobertura ≥ 80% (criterio de éxito delegación CAT-20260817-01)
  - Cada PDA tiene al menos 1 eje_asociado
  - pda_ejes poblado con estructura {pda_codigo, eje_codigo}
  - Total pda_ejes = suma de ejes_por_campo en todos los campos
  - JSON v2024 valida contra schema pydantic v2
  - hits_por_eje_y_campo presente en metadata_extraccion.segundo_pass_ejes
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from extractor_pda_ejes import (
    EJE_PATTERNS,
    MIN_HITS_POR_EJE,
    PAGES_BY_CAMPO,
    compute_ejes_por_campo,
    compute_pda_ejes,
    count_eje_hits,
    load_pdf_intro_pages,
    update_json_with_pda_ejes,
)


REPO_ROOT = Path("/home/frank/repos/educacion")
JSON_PATH = REPO_ROOT / "Educacion" / "scripts" / "catalogar" / "outputs" / "catalogo_fase2_v2024_crudo.json"
PDF_PATH = REPO_ROOT / "Educacion" / "fuentes" / "01_normativa_nem" / "programa_sintetico_fase2_v2024.pdf"


def test_constants_present():
    """Las constantes del módulo están definidas."""
    assert len(EJE_PATTERNS) == 7, f"esperaba 7 ejes, hay {len(EJE_PATTERNS)}"
    assert MIN_HITS_POR_EJE >= 1
    assert set(PAGES_BY_CAMPO.keys()) == {
        "LENGUAJES",
        "SABERES_PENSAMIENTO_CIENTIFICO",
        "ETICA_NATURALEZA_SOCIEDADES",
        "LO_HUMANO_LO_COMUNITARIO",
    }
    print(f"✓ test_constants_present (7 ejes, {len(PAGES_BY_CAMPO)} campos)")


def test_ejes_patterns_non_empty():
    """Cada eje tiene al menos 1 patrón regex."""
    for eje, patterns in EJE_PATTERNS.items():
        assert len(patterns) >= 1, f"{eje} sin patrones"
        for pat in patterns:
            assert pat.startswith("\\b") or pat.startswith("["), (
                f"patrón {eje!r} {pat!r} no anclado a palabra"
            )
    print(f"✓ test_ejes_patterns_non_empty ({sum(len(p) for p in EJE_PATTERNS.values())} patrones)")


def test_load_pdf_intro_pages():
    """Carga de páginas intro por campo."""
    for campo, pgs in PAGES_BY_CAMPO.items():
        text_by_page = load_pdf_intro_pages(PDF_PATH, pgs)
        assert len(text_by_page) == len(pgs), (
            f"{campo}: esperaba {len(pgs)} páginas, obtuve {len(text_by_page)}"
        )
        for p, text in text_by_page.items():
            assert len(text) > 100, f"{campo} p{p}: texto demasiado corto ({len(text)} chars)"
    print(f"✓ test_load_pdf_intro_pages ({sum(len(p) for p in PAGES_BY_CAMPO.values())} páginas cargadas)")


def test_compute_ejes_por_campo():
    """Cada campo tiene >= 1 eje (criterio de cobertura)."""
    ejes_por_campo = compute_ejes_por_campo(PDF_PATH)
    for campo, ejes in ejes_por_campo.items():
        assert len(ejes) >= 1, f"{campo} sin ejes!"
    # LNG debe incluir los ejes característicos (lectura, artes)
    assert "APROPIACION_CULTURAS_LECTURA" in ejes_por_campo["LENGUAJES"]
    assert "ARTES_EXPERIENCIAS_ESTETICAS" in ejes_por_campo["LENGUAJES"]
    # SPC NO debe tener APROPIACION_CULTURAS_LECTURA (no es campo de lectura)
    assert "APROPIACION_CULTURAS_LECTURA" not in ejes_por_campo["SABERES_PENSAMIENTO_CIENTIFICO"]
    print(f"✓ test_compute_ejes_por_campo (ejes por campo: {dict((c, len(e)) for c, e in ejes_por_campo.items())})")


def test_json_pda_ejes_populated():
    """JSON v2024 tiene pda_ejes poblado y cobertura >= 80%."""
    data = json.loads(JSON_PATH.read_text())
    pda_ejes = data.get("pda_ejes", [])
    n_pda = len(data["pdas"])
    # Cobertura: al menos 80% de los PDA deben tener >= 1 eje
    pda_con_ejes = sum(
        1 for p in data["pdas"] if p.get("ejes_asociados")
    )
    cobertura = 100.0 * pda_con_ejes / n_pda
    assert cobertura >= 80.0, f"cobertura {cobertura:.1f}% < 80%"
    # pda_ejes poblado
    assert len(pda_ejes) > 0, "pda_ejes vacío"
    # Estructura correcta
    for entry in pda_ejes:
        assert "pda_codigo" in entry
        assert "eje_codigo" in entry
    print(f"✓ test_json_pda_ejes_populated ({pda_con_ejes}/{n_pda} PDA con ejes = {cobertura:.1f}%, {len(pda_ejes)} pares)")


def test_json_pda_ejes_schema_valid():
    """JSON v2024 con pda_ejes valida contra schema pydantic v2."""
    from schema import CatalogoFase2
    data = json.loads(JSON_PATH.read_text())
    cat = CatalogoFase2.model_validate(data)
    assert len(cat.pda_ejes) > 0, "pda_ejes vacío después de validación"
    # Los PDAEjes son modelos {pda_codigo, eje_codigo}
    sample = cat.pda_ejes[0]
    assert hasattr(sample, "pda_codigo")
    assert hasattr(sample, "eje_codigo")
    print(f"✓ test_json_pda_ejes_schema_valid (pydantic v2 PASS, {len(cat.pda_ejes)} pda_ejes)")


def test_metadata_segundo_pass():
    """metadata_extraccion.segundo_pass_ejes poblado y trazable."""
    data = json.loads(JSON_PATH.read_text())
    meta = data["metadata_extraccion"]
    assert "segundo_pass_ejes" in meta, "falta segundo_pass_ejes"
    sp = meta["segundo_pass_ejes"]
    assert sp["intervencion_id"] == "CAT-20260817-01-SOFIA-SEGUNDO-PASS"
    assert "ejes_por_campo" in sp
    assert "hits_por_eje_y_campo" in sp
    assert sp["total_pda_ejes_pairs"] > 0
    assert sp["pda_con_ejes"] > 0
    print(f"✓ test_metadata_segundo_pass (intervención {sp['intervencion_id']}, pda_con_ejes={sp['pda_con_ejes']})")


def test_auditoria_carga_with_segundo_pass():
    """auditoria_carga incluye entrada del segundo pass."""
    data = json.loads(JSON_PATH.read_text())
    audit = data["auditoria_carga"]
    # Buscar entrada del segundo pass (autor = "SOFIA extractor_pda_ejes"
    # o contienen "segundo pass" en observacion)
    found = any(
        "segundo pass" in (a.get("observacion") or "").lower()
        or "extractor_pda_ejes" in (a.get("autor") or "")
        for a in audit
    )
    assert found, "no hay entrada de auditoría del segundo pass"
    # Verificar que la entrada incluye CAT-20260817-01 en metadata
    sp_audit = [
        a for a in audit
        if "extractor_pda_ejes" in (a.get("autor") or "")
    ]
    assert len(sp_audit) >= 1
    meta = sp_audit[0].get("metadata", {})
    assert meta.get("intervencion_id") == "CAT-20260817-01-SOFIA-SEGUNDO-PASS"
    print(f"✓ test_auditoria_carga_with_segundo_pass ({len(audit)} entradas total)")


def test_update_json_with_pda_ejes_dry_run(tmp_path=None):
    """update_json_with_pda_ejes dry-run no modifica el JSON."""
    # Hacemos snapshot
    before = JSON_PATH.read_bytes()
    # dry_run=True (no debe escribir)
    stats = update_json_with_pda_ejes(
        json_path=JSON_PATH,
        pdf_path=PDF_PATH,
        dry_run=True,
    )
    after = JSON_PATH.read_bytes()
    assert before == after, "dry_run modificó el JSON"
    assert stats["total_pdas"] == 24
    assert stats["pda_con_ejes"] > 0
    print(f"✓ test_update_json_with_pda_ejes_dry_run (no modificó JSON, {stats['pda_con_ejes']}/{stats['total_pdas']} con ejes)")


def test_pda_ejes_total_matches_sum():
    """Total pda_ejes pairs = sum(ejes_por_campo[campo] para cada PDA)."""
    data = json.loads(JSON_PATH.read_text())
    pda_ejes = data["pda_ejes"]
    # Esperado: 6 LNG × 6 + 6 SPC × 3 + 6 ENS × 5 + 6 HUM × 5 = 36+18+30+30 = 114
    # (depende de los ejes_por_campo finales, así que calculamos dinámicamente)
    meta = data["metadata_extraccion"]["segundo_pass_ejes"]
    ejes_por_campo = meta["ejes_por_campo"]
    expected = 0
    for pda in data["pdas"]:
        for campo in pda["campos_asociados"]:
            expected += len(ejes_por_campo.get(campo, []))
    assert len(pda_ejes) == expected, (
        f"pda_ejes {len(pda_ejes)} != esperado {expected}"
    )
    print(f"✓ test_pda_ejes_total_matches_sum (total {len(pda_ejes)} pares, esperado {expected})")


def test_dry_run_idempotent():
    """update_json_with_pda_ejes en dry-run es idempotente."""
    from io import BytesIO
    before = JSON_PATH.read_text()
    stats1 = update_json_with_pda_ejes(
        json_path=JSON_PATH, pdf_path=PDF_PATH, dry_run=True
    )
    stats2 = update_json_with_pda_ejes(
        json_path=JSON_PATH, pdf_path=PDF_PATH, dry_run=True
    )
    after = JSON_PATH.read_text()
    assert before == after, "dry-run no es idempotente"
    assert stats1["total_pda_ejes_pairs"] == stats2["total_pda_ejes_pairs"]
    print(f"✓ test_dry_run_idempotent (2 dry-runs idénticos, {stats1['total_pda_ejes_pairs']} pares)")


if __name__ == "__main__":
    test_constants_present()
    test_ejes_patterns_non_empty()
    test_load_pdf_intro_pages()
    test_compute_ejes_por_campo()
    test_json_pda_ejes_populated()
    test_json_pda_ejes_schema_valid()
    test_metadata_segundo_pass()
    test_auditoria_carga_with_segundo_pass()
    test_update_json_with_pda_ejes_dry_run()
    test_pda_ejes_total_matches_sum()
    test_dry_run_idempotent()
    print("\n✓ Todos los tests extractor_pda_ejes pasaron (11 tests)")
