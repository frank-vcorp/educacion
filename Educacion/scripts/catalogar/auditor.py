"""
auditor.py — Genera el reporte de auditoría markdown (formato E14 §8.2).
"""

from datetime import date, datetime
from pathlib import Path
from typing import Optional

from schema import CatalogoFase2


def generar_reporte_auditoria(
    catalogo: CatalogoFase2,
    pdf_sha256: str,
    fecha: Optional[str] = None,
    metodo_extraccion: str = None,
) -> str:
    """Genera el markdown del reporte de auditoría."""
    fecha = fecha or date.today().isoformat()
    cv = catalogo.catalogo_version

    # Conteos
    n_pdas = len(catalogo.pdas)
    n_pdas_ok = sum(1 for p in catalogo.pdas if not p.requiere_revision_humana and p.texto)
    n_pdas_rev = sum(1 for p in catalogo.pdas if p.requiere_revision_humana or not p.texto)
    n_contenidos = len(catalogo.contenidos)
    n_refs = len(catalogo.referencias_conaliteg)
    n_refs_ok = sum(1 for r in catalogo.referencias_conaliteg if r.url_publica and not r.requiere_revision_humana)
    n_auditoria = len(catalogo.auditoria_carga)

    # Cobertura por campo
    campos_con_pda = {}
    for rel in catalogo.pda_por_campo_fase:
        campo = rel.campo_codigo
        campos_con_pda.setdefault(campo, 0)
        campos_con_pda[campo] += 1

    # Mapa campo_codigo → nombre
    campos_map = {c.codigo: c.nombre for c in catalogo.campos_formativos}

    # Hallazgos dinámicos según el método de extracción
    hallazgos = _generar_hallazgos(metodo_extraccion, n_pdas, n_pdas_ok, n_pdas_rev)

    # PDF fuente: si el JSON apunta a uno distinto, reflejarlo
    pdf_fuente_label = "anexo_acuerdo_14_08_22_programas_sinteticos.pdf"
    pdf_fuente_path = catalogo.catalogo_version.metadata.get("pdf_fuente") if catalogo.catalogo_version.metadata else None
    if pdf_fuente_path and "/tmp/" in str(pdf_fuente_path):
        pdf_fuente_label = f"{Path(pdf_fuente_path).name} (PDF OCR-cacheado, slice Fase 2)"

    md = f"""# Auditoría del catálogo NEM — Fase 2

**Versión del catálogo:** {cv.codigo}
**Nombre:** {cv.nombre}
**Fecha de carga:** {fecha}
**PDF fuente:** {pdf_fuente_label}
**SHA256 PDF fuente:** `{pdf_sha256}`
**Fuente normativa:** {cv.fuente_dof}
**Método de extracción:** {metodo_extraccion or 'n/d'}

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| PDA cargados | {n_pdas} |
| PDA con texto confirmado | {n_pdas_ok} |
| PDA que requieren revisión humana | {n_pdas_rev} |
| PDA oficiales esperados | ~24-30 (E14 §5.2) |
| Contenidos cargados | {n_contenidos} |
| Referencias a libros CONALITEG | {n_refs} |
| Referencias CONALITEG con URL viva | {n_refs_ok} |
| Campos formativos | {len(catalogo.campos_formativos)} |
| Ejes articuladores | {len(catalogo.ejes_articuladores)} |
| Fases | {len(catalogo.fases)} |
| Entradas de auditoría | {n_auditoria} |

## Cobertura por campo formativo

| Campo | PDA asociados |
|---|---|
"""
    for codigo, nombre in campos_map.items():
        n = campos_con_pda.get(codigo, 0)
        md += f"| {nombre} | {n} |\n"

    md += f"""
## PDA que requieren intervención humana del founder

"""
    pdas_a_revisar = [p for p in catalogo.pdas if p.requiere_revision_humana or not p.texto]
    if pdas_a_revisar:
        md += f"Total: {(len(pdas_a_revisar))} PDA pendientes.\n\n"
        md += "| Código | Razón |\n|---|---|\n"
        for p in pdas_a_revisar:
            razon = p.razon_revision or "PDA sin texto (founder debe completar)"
            md += f"| `{p.codigo}` | {razon} |\n"
    else:
        md += "(ninguno — todos los PDA tienen texto confirmado)\n"

    md += """
## Referencias CONALITEG pendientes de verificación

"""
    refs_a_revisar = [r for r in catalogo.referencias_conaliteg if r.requiere_revision_humana or not r.url_publica]
    if refs_a_revisar:
        md += f"Total: {len(refs_a_revisar)} referencias pendientes.\n\n"
        md += "| Grado | Campo | URL | Notas |\n|---|---|---|---|\n"
        for r in refs_a_revisar:
            md += f"| {r.grado} | {r.campo} | {r.url_publica or '—'} | {r.notas or 'requiere_revision_humana'} |\n"
    else:
        md += "(ninguna — todas las referencias tienen URL verificada)\n"

    md += f"""
## Validación humana

- [ ] Todos los PDA revisados contra PDF fuente (muestreo 100% para MVP)
- [ ] Asignación de ejes articuladores curada
- [ ] Referencias CONALITEG verificadas (URLs vivas a fecha de carga)

## Limitaciones conocidas

- MVP cubre solo Fase 2 (preescolar); Fases 3-6 diferidas.
- No incluye casos especiales (educación indígena, multigrado, telesecundaria).
- Versión vigente única; sin histórico fino (E10 gestiona versionado si aplica).

## Hallazgos técnicos

{''.join(hallazgos)}

## Firmas

- Founder: Frank
- Fecha: {fecha}
- SHA256 del JSON curado: _(se calculará al firmar el JSON curado)_
"""
    return md


def _generar_hallazgos(metodo: str, n_total: int, n_ok: int, n_rev: int) -> list:
    """Genera el bloque de hallazgos según el método de extracción."""
    if not metodo:
        return [
            "- Extracción ejecutada sin un método identificable en metadata. "
            "Verifica que el JSON proviene de `catalogar_fase2.py extract`.\n"
        ]
    if metodo == "nativo_solo":
        return [
            "- **Modo: texto nativo únicamente** (sin OCR). El PDF maestro de Programas Sintéticos "
            "es un escaneo (Hewlett-Packard MFP, Adobe Acrobat 9.0 Paper Capture Plug-in). "
            "Solo las páginas 1-5 (índice) tienen capa de texto extraíble.\n",
            "- **Decisión**: el script generó placeholders honestos marcados con "
            "`requiere_revision_humana=true` para que el founder complete el texto.\n",
            "- **Próximo paso**: ejecutar el modo `extract` con OCR (tesseract o ocrmypdf instalados) "
            "para mejorar la cobertura.\n",
        ]
    if metodo == "nativo+ocrmypdf_cache":
        return [
            "- **Modo: nativo + ocrmypdf pre-OCR cacheado**. El PDF completo fue pre-OCRado una vez "
            "y el resultado se cacheó por SHA256 en `outputs/ocr_cache/`. Las ejecuciones posteriores "
            "son instantáneas.\n",
            "- **Trazabilidad**: el SHA256 del PDF fuente se preserva en `catalogo_version.fuente_sha256` "
            "y en cada PDA con `fuente_dof_sha`.\n",
        ]
    if metodo == "nativo+ocr_tesseract_por_pagina":
        return [
            "- **Modo: nativo + tesseract OCR página por página** (sin ocrmypdf). Más lento que "
            "ocrmypdf cacheado; el script prefiere ocrmypdf cuando está disponible.\n",
            "- **Recomendación**: instalar `ocrmypdf` para acelerar ~5x con paralelismo.\n",
        ]
    return [f"- Método de extracción: `{metodo}`.\n"]


def guardar_auditoria(
    catalogo: CatalogoFase2,
    output_dir: Path,
    pdf_sha256: str,
    fecha: Optional[str] = None,
    metodo_extraccion: Optional[str] = None,
) -> Path:
    fecha = fecha or date.today().isoformat()
    out_file = Path(output_dir) / f"AUDITORIA_catalogo_fase2_{fecha}.md"
    out_file.write_text(generar_reporte_auditoria(catalogo, pdf_sha256, fecha, metodo_extraccion))
    return out_file
