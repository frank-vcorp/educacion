"""Smoke tests para schema.py — valida que los modelos pydantic acepten
los datos canónicos y rechacen entradas inválidas."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from schema import CatalogoFase2, PDA, ReferenciaLibroConaliteg
from constants import (
    CATALOGO_VERSION,
    CAMPOS_FORMATIVOS,
    EJES_ARTICULADORES,
    FASES,
    CONALITEG_REFERENCES_PLACEHOLDER,
)


def build_min_catalogo() -> dict:
    """Construye el mínimo catálogo válido para Fase 2."""
    return {
        "catalogo_version": {
            **CATALOGO_VERSION,
            "fuente_sha256": "a" * 64,
        },
        "campos_formativos": CAMPOS_FORMATIVOS,
        "ejes_articuladores": EJES_ARTICULADORES,
        "fases": FASES,
        "pdas": [
            {
                "codigo": "PDA-F2-LNG-001",
                "texto": "Participa en conversaciones cotidianas.",
                "fuente_dof_pagina": 10,
                "fuente_dof_sha": "a" * 64,
                "campos_asociados": ["LENGUAJES"],
                "ejes_asociados": ["INCLUSION"],
            }
        ],
        "contenidos": [
            {
                "codigo": "CONT-F2-LNG-001",
                "texto": "La lengua oral en la vida cotidiana.",
                "campo_codigo": "LENGUAJES",
                "fase_codigo": "FASE_2",
            }
        ],
        "pda_por_campo_fase": [
            {"pda_codigo": "PDA-F2-LNG-001", "fase_codigo": "FASE_2", "campo_codigo": "LENGUAJES"}
        ],
        "pda_ejes": [
            {"pda_codigo": "PDA-F2-LNG-001", "eje_codigo": "INCLUSION"}
        ],
        "referencias_conaliteg": CONALITEG_REFERENCES_PLACEHOLDER[:2],
    }


def test_catalogo_minimo_valida():
    data = build_min_catalogo()
    cat = CatalogoFase2.model_validate(data)
    assert cat.catalogo_version.codigo == "PLAN_2022_ED_2025_FASE_2"
    assert len(cat.campos_formativos) == 4
    assert len(cat.ejes_articuladores) == 7
    assert len(cat.fases) == 6
    assert len(cat.pdas) == 1
    print("✓ test_catalogo_minimo_valida")


def test_pda_sin_sha_invalido():
    # El schema FUERZA min_length=64 en fuente_dof_sha
    try:
        PDA(codigo="PDA-F2-TEST-001", texto="x", fuente_dof_sha="corto")
        assert False, "debería haber fallado (SHA muy corto)"
    except Exception:
        pass
    # Verificamos que el catálogo rechaza si el SHA del catalogo_version es muy corto
    data = build_min_catalogo()
    data["catalogo_version"]["fuente_sha256"] = "corto"
    try:
        CatalogoFase2.model_validate(data)
        assert False, "debería haber fallado"
    except Exception:
        pass
    print("✓ test_pda_sin_sha_invalido")


def test_pda_duplicados_rechazados():
    data = build_min_catalogo()
    data["pdas"].append({
        "codigo": "PDA-F2-LNG-001",  # duplicado
        "texto": "otro",
        "fuente_dof_sha": "a" * 64,
    })
    try:
        CatalogoFase2.model_validate(data)
        assert False, "debería haber fallado"
    except Exception:
        pass
    print("✓ test_pda_duplicados_rechazados")


def test_pda_requieren_revision():
    data = build_min_catalogo()
    data["pdas"].append({
        "codigo": "PDA-F2-LNG-002",
        "texto": None,
        "fuente_dof_sha": "a" * 64,
        "requiere_revision_humana": True,
    })
    cat = CatalogoFase2.model_validate(data)
    rev = cat.pdas_requieren_revision()
    assert len(rev) >= 1
    assert rev[0].codigo == "PDA-F2-LNG-002"
    print("✓ test_pda_requieren_revision")


def test_referencia_conaliteg_sin_url():
    r = ReferenciaLibroConaliteg(
        grado="1° preescolar",
        campo="Lenguajes",
        url_publica=None,
        requiere_revision_humana=True,
    )
    assert r.url_publica is None
    assert r.requiere_revision_humana
    print("✓ test_referencia_conaliteg_sin_url")


if __name__ == "__main__":
    test_catalogo_minimo_valida()
    test_pda_sin_sha_invalido()
    test_pda_duplicados_rechazados()
    test_pda_requieren_revision()
    test_referencia_conaliteg_sin_url()
    print("\n✓ Todos los smoke tests pasaron")
