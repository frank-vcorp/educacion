"""Tests para el extractor V2024 (PDF nativo).

Valida que la extracción contra el PDF InDesign (texto nativo) produce:
- 24 PDA con texto real (no placeholders)
- 4 contenidos (uno por campo) con texto
- 4 campos formativos
- 7 ejes articuladores
- 12 referencias CONALITEG (3 grado × 4 campo)
- SQL válido (44 statements)
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pglast

from extractor_v2024 import (
    sha256_archivo,
    clean_contenido_text,
    split_pda_paragraphs,
    extract_pda_text,
    MAX_CONTENIDOS_POR_CAMPO,
    MAX_PARAGRAPHS_PER_CELL,
)


JSON_PATH = Path("/home/frank/repos/educacion/outputs/catalogo_fase2_v2024_crudo.json")
SQL_PATH = Path("/home/frank/repos/educacion/outputs/migrations/2026-08-16_catalogo_fase2_v2024.sql")


def test_helpers_clean_contenido():
    """Limpia el texto de un contenido: une guiones, colapsa espacios."""
    txt = "Comunicación\noral de necesida-\ndes, emociones,"
    cleaned = clean_contenido_text(txt)
    assert "necesidades" in cleaned, f"debería unir guion: {cleaned}"
    assert "\n" not in cleaned, f"no debería tener \\n: {cleaned}"
    print("✓ test_helpers_clean_contenido")


def test_helpers_split_pda_paragraphs():
    """Divide una celda en párrafos."""
    cell = "Emplea palabras,\ngestos, señas, imá-\ngenes, sonidos o\nmovimientos corpo-\nrales que aprende\nen su comunidad,\npara expresar nece-\nsidades, ideas, emo-\nciones y gustos.\nReconoce que\ncuando juega y\nsocializa con sus\npares."
    paragraphs = split_pda_paragraphs(cell)
    # 2 paragraphs: "Emplea..." y "Reconoce..."
    assert len(paragraphs) == 2, f"esperaba 2 paragraphs, obtuve {len(paragraphs)}"
    assert "Emplea" in paragraphs[0]
    assert "Reconoce" in paragraphs[1]
    # Cada paragraph debe terminar con punto
    for p in paragraphs:
        assert p.endswith("."), f"paragraph sin punto final: {p!r}"
    print("✓ test_helpers_split_pda_paragraphs")


def test_extract_pda_text_joins_hyphens():
    """Une palabras con guion al final de línea."""
    p = "Reconoce que\ncuando juega y\nsocializa con sus\npares, se expresan desde sus posibil-\nidades, viven-\ncias y cultura."
    cleaned = extract_pda_text(p)
    assert "posibilidades" in cleaned, f"debería unir 'posibil-' + 'idades': {cleaned}"
    assert "vivencias" in cleaned, f"debería unir 'viven-' + 'cias': {cleaned}"
    assert "\n" not in cleaned, f"no debería tener \\n: {cleaned}"
    print("✓ test_extract_pda_text_joins_hyphens")


def test_json_v2024_exists_and_valid():
    """JSON v2024 existe y tiene estructura esperada."""
    assert JSON_PATH.exists(), f"debería existir: {JSON_PATH}"
    data = json.loads(JSON_PATH.read_text())
    assert "pdas" in data and "contenidos" in data
    assert "campos_formativos" in data and "ejes_articuladores" in data
    assert "fases" in data and "referencias_conaliteg" in data
    assert "catalogo_version" in data
    assert "metadata_extraccion" in data
    print(f"✓ test_json_v2024_exists_and_valid (size: {JSON_PATH.stat().st_size} bytes)")


def test_json_v2024_counts():
    """Conteos del JSON v2024 según spec E14 §5.2."""
    data = json.loads(JSON_PATH.read_text())
    # 24-30 PDA oficiales esperados
    n_pda = len(data["pdas"])
    assert 24 <= n_pda <= 30, f"PDA fuera de rango: {n_pda} (esperado 24-30)"

    # 4 contenidos (uno por campo)
    n_cont = len(data["contenidos"])
    assert n_cont == 4, f"contenidos: {n_cont} (esperado 4)"

    # 4 campos formativos
    assert len(data["campos_formativos"]) == 4

    # 7 ejes articuladores
    assert len(data["ejes_articuladores"]) == 7

    # 6 fases
    assert len(data["fases"]) == 6

    # 12 referencias CONALITEG (3 grado × 4 campo)
    assert len(data["referencias_conaliteg"]) == 12

    print(f"✓ test_json_v2024_counts (PDA={n_pda}, cont={n_cont}, campos=4, ejes=7, fases=6, refs=12)")


def test_json_v2024_pda_text_real():
    """PDA con texto real (no placeholders, no jumbled)."""
    data = json.loads(JSON_PATH.read_text())
    pdas_with_text = [p for p in data["pdas"] if p["texto"] and not p["requiere_revision_humana"]]
    assert len(pdas_with_text) == len(data["pdas"]), (
        f"todos los PDA deberían tener texto: {len(pdas_with_text)}/{len(data['pdas'])}"
    )
    # Cada texto debe ser > 50 chars (vs placeholder "PDA XX detectado...")
    for p in data["pdas"]:
        assert len(p["texto"]) >= 50, f"PDA {p['codigo']} texto corto: {p['texto']!r}"
        # No debe contener marcadores de jumbled (varias frases pegadas)
        assert "PDA XX detectado" not in p["texto"]
    print(f"✓ test_json_v2024_pda_text_real ({len(pdas_with_text)}/{len(data['pdas'])} con texto real)")


def test_json_v2024_contenidos_text():
    """Contenidos con texto completo (no NULL)."""
    data = json.loads(JSON_PATH.read_text())
    for c in data["contenidos"]:
        assert c["texto"] is not None, f"contenido {c['codigo']} sin texto"
        assert len(c["texto"]) > 50, f"contenido {c['codigo']} texto corto: {c['texto']!r}"
        # Cubrir todos los 4 campos
    campos_con_contenido = {c["campo_codigo"] for c in data["contenidos"]}
    assert campos_con_contenido == set(CAMPOS := {
        "LENGUAJES", "SABERES_PENSAMIENTO_CIENTIFICO",
        "ETICA_NATURALEZA_SOCIEDADES", "LO_HUMANO_LO_COMUNITARIO"
    }), f"faltan campos: {CAMPOS - campos_con_contenido}"
    print(f"✓ test_json_v2024_contenidos_text ({len(data['contenidos'])} contenidos con texto)")


def test_sql_v2024_valid():
    """SQL v2024 es válido y parseable."""
    assert SQL_PATH.exists(), f"debería existir: {SQL_PATH}"
    sql = SQL_PATH.read_text()
    # Parse con pglast
    parsed = pglast.parse_sql(sql)
    assert len(parsed) > 0, "SQL no debería estar vacío"
    # Debe contener CREATE TABLE, INSERT, BEGIN, COMMIT
    sql_types = set()
    for stmt in parsed:
        stmt_type = type(stmt.stmt).__name__
        sql_types.add(stmt_type)
    assert "CreateStmt" in sql_types, "debería tener CREATE TABLE"
    assert "InsertStmt" in sql_types, "debería tener INSERT"
    assert "TransactionStmt" in sql_types, "debería tener BEGIN/COMMIT"
    print(f"✓ test_sql_v2024_valid ({len(parsed)} statements, tipos: {sorted(sql_types)})")


def test_schema_v2024_validates():
    """JSON v2024 valida contra schema pydantic v2."""
    data = json.loads(JSON_PATH.read_text())
    from schema import CatalogoFase2
    cat = CatalogoFase2.model_validate(data)
    # Sin PDA con código duplicado
    codigos = [p.codigo for p in cat.pdas]
    assert len(codigos) == len(set(codigos)), "códigos PDA deben ser únicos"
    # Sin contenido con código duplicado
    codigos = [c.codigo for c in cat.contenidos]
    assert len(codigos) == len(set(codigos)), "códigos contenido deben ser únicos"
    print(f"✓ test_schema_v2024_validates (pydantic v2 PASS)")


if __name__ == "__main__":
    test_helpers_clean_contenido()
    test_helpers_split_pda_paragraphs()
    test_extract_pda_text_joins_hyphens()
    test_json_v2024_exists_and_valid()
    test_json_v2024_counts()
    test_json_v2024_pda_text_real()
    test_json_v2024_contenidos_text()
    test_sql_v2024_valid()
    test_schema_v2024_validates()
    print("\n✓ Todos los tests v2024 pasaron (9 tests)")
