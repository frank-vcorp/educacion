"""
extractor.py — Extracción página a página del PDF maestro de Programas Sintéticos.

Estrategia en cascada (E14 §6.1):
  1. pdfplumber extrae texto nativo donde exista (5 páginas índice).
  2. PyMuPDF extrae imágenes página por página cuando no hay texto (PDF escaneado).
  3. OCR con tesseract si está disponible en el sistema (detección graceful).
  4. Si no hay OCR, las páginas escaneadas quedan marcadas como requiere_intervencion.

Reglas duras (E14):
  - No alucinar PDA: si el parser no encuentra, null + requiere_revision_humana=true
  - Cada PDA lleva fuente_dof_pagina (int) y fuente_dof_sha (sha256 del PDF)
  - CONALITEG = solo URL + metadatos, NUNCA contenido editorial
  - Sin IA generativa. Solo regex + heurísticas.
"""

import hashlib
import logging
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pdfplumber
import fitz  # PyMuPDF

from constants import (
    CATALOGO_VERSION,
    CAMPOS_FORMATIVOS,
    EJES_ARTICULADORES,
    FASES,
    CONALITEG_REFERENCES_PLACEHOLDER,
)

logger = logging.getLogger(__name__)

# === Regex robustas para detectar marcadores canónicos ===

# PDA suelen estar en formato "PDA1.", "PDA 1.", "PDA-F2-..." o como bullets.
# En el PDF escaneado no podemos parsearlos automáticamente; los marcamos como placeholders.
RE_PDA_HEADER = re.compile(r"\bPDA[\s\-\.]*(\d{1,3})", re.IGNORECASE)
RE_PDA_CODIGO = re.compile(r"\bPDA[-\s]?F(\d)[-\s]?([A-Z]{2,4})[-\s]?(\d{2,3})\b")

# Campos formativos detectados en el PDF
RE_CAMPO = {
    "LENGUAJES": re.compile(r"\bLenguajes\b", re.IGNORECASE),
    "SABERES_PENSAMIENTO_CIENTIFICO": re.compile(r"\bSaberes y Pensamiento Cient[íi]fico\b", re.IGNORECASE),
    "ETICA_NATURALEZA_SOCIEDADES": re.compile(r"\b[ÉE]tica,?\s*Naturaleza\s*y\s*Sociedades\b", re.IGNORECASE),
    "LO_HUMANO_LO_COMUNITARIO": re.compile(r"\bDe lo Humano y lo Comunitario\b", re.IGNORECASE),
}

# Ejes articuladores
RE_EJE = {
    "INCLUSION": re.compile(r"\bInclusi[óo]n\b", re.IGNORECASE),
    "PENSAMIENTO_CRITICO": re.compile(r"\bPensamiento cr[íi]tico\b", re.IGNORECASE),
    "INTERCULTURALIDAD_CRITICA": re.compile(r"\bInterculturalidad cr[íi]tica\b", re.IGNORECASE),
    "IGUALDAD_GENERO": re.compile(r"\bIgualdad de g[ée]nero\b", re.IGNORECASE),
    "VIDA_SALUDABLE": re.compile(r"\bVida saludable\b", re.IGNORECASE),
    "APROPIACION_CULTURAS_LECTURA": re.compile(r"\bApropiaci[óo]n de las culturas\b", re.IGNORECASE),
    "ARTES_EXPERIENCIAS_ESTETICAS": re.compile(r"\bArtes y experiencias est[ée]ticas\b", re.IGNORECASE),
}

# Marcadores de fase
RE_FASE_2 = re.compile(r"\bFase\s*2\b", re.IGNORECASE)
RE_PREESCOLAR = re.compile(r"\bPreescolar\b", re.IGNORECASE)


# === Dataclasses ===

@dataclass
class ExtractionStats:
    """Métricas de la extracción para el quality report."""
    total_paginas: int = 0
    paginas_con_texto_nativo: int = 0
    paginas_escaneadas: int = 0
    paginas_ocr_exitoso: int = 0
    paginas_ocr_fallido: int = 0
    paginas_sin_procesar: int = 0
    total_caracteres_texto: int = 0
    candidatos_pda: int = 0
    pda_confirmados: int = 0
    pda_requieren_revision: int = 0
    contenidos_detectados: int = 0
    campos_detectados: List[str] = field(default_factory=list)
    ejes_detectados: List[str] = field(default_factory=list)
    requiere_intervencion: List[Dict] = field(default_factory=list)
    advertencias: List[str] = field(default_factory=list)


# === Helpers ===

def sha256_archivo(path: Path) -> str:
    """SHA256 hex del archivo (streaming, no carga en memoria)."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def tesseract_disponible() -> bool:
    """Detecta si tesseract OCR está en el sistema."""
    return shutil.which("tesseract") is not None


def ocr_imagen_pymupdf(page: "fitz.Page", dpi: int = 200) -> Optional[str]:
    """
    Renderiza página a imagen y aplica OCR con tesseract si está disponible.
    Retorna None si tesseract no está (degradación elegante).
    """
    if not tesseract_disponible():
        return None
    try:
        # Renderizar página a imagen (pixmap)
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        # Guardar temporalmente para tesseract (más simple que pytesseract)
        tmp = Path("/tmp/_ocr_page.png")
        tmp.write_bytes(img_bytes)
        result = subprocess.run(
            ["tesseract", str(tmp), "-", "-l", "spa"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        tmp.unlink(missing_ok=True)
        if result.returncode == 0:
            return result.stdout
    except subprocess.TimeoutExpired:
        logger.warning("OCR timeout en página")
    except Exception as e:
        logger.warning(f"OCR error: {e}")
    return None


# === Clase principal ===

class Extractor:
    """Orquesta extracción híbrida del PDF maestro de Programas Sintéticos."""

    def __init__(self, pdf_path: Path, output_dir: Path):
        self.pdf_path = Path(pdf_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.sha256 = sha256_archivo(self.pdf_path)
        self.stats = ExtractionStats()
        self.log_lines: List[str] = []
        self.anomalias: List[str] = []

    # --- Logging helpers ---

    def _log(self, msg: str) -> None:
        logger.info(msg)
        self.log_lines.append(msg)

    def _warn(self, msg: str) -> None:
        logger.warning(msg)
        self.log_lines.append(f"⚠️  {msg}")
        self.stats.advertencias.append(msg)

    def _requiere_intervencion(self, pag: int, motivo: str) -> None:
        entry = {"pagina": pag, "motivo": motivo}
        self.stats.requiere_intervencion.append(entry)
        self._warn(f"PAG {pag}: {motivo}")

    # --- Extracción principal ---

    def extract(self) -> Dict:
        """
        Ejecuta el pipeline completo de extracción.
        Retorna el dict del catálogo crudo (PDA candidatos, contenidos, refs CONALITEG).
        """
        self._log(f"INICIO EXTRACCIÓN: {self.pdf_path}")
        self._log(f"SHA256 PDF: {self.sha256}")
        self._log(f"Tesseract OCR disponible: {tesseract_disponible()}")

        # 1. Inventario de páginas con pdfplumber (texto nativo)
        native_text_by_page: Dict[int, str] = {}
        with pdfplumber.open(str(self.pdf_path)) as pdf:
            self.stats.total_paginas = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                txt = page.extract_text() or ""
                if len(txt.strip()) > 50:
                    native_text_by_page[i + 1] = txt
        self.stats.paginas_con_texto_nativo = len(native_text_by_page)
        self._log(f"Páginas totales: {self.stats.total_paginas}")
        self._log(f"Páginas con texto nativo: {self.stats.paginas_con_texto_nativo}")

        # 2. Detectar Fase 2 en texto nativo
        fase_2_pages = self._detectar_paginas_fase_2(native_text_by_page)
        self._log(f"Páginas con marcador Fase 2 en texto nativo: {fase_2_pages}")

        # 3. Detectar campos formativos en texto nativo
        campos_en_texto = self._detectar_campos(native_text_by_page)
        self.stats.campos_detectados = list(campos_en_texto.keys())
        self._log(f"Campos formativos detectados: {self.stats.campos_detectados}")

        # 4. Detectar ejes articuladores
        ejes_en_texto = self._detectar_ejes(native_text_by_page)
        self.stats.ejes_detectados = list(ejes_en_texto.keys())
        self._log(f"Ejes articuladores detectados: {self.stats.ejes_detectados}")

        # 5. Para páginas escaneadas sin texto: intentar OCR o marcar
        ocr_text_by_page: Dict[int, str] = {}
        if not tesseract_disponible():
            # PDF escaneado + sin OCR = no podemos parsear PDA automáticamente
            self._warn("=" * 60)
            self._warn("PDF ESCANEADO SIN OCR DISPONIBLE")
            self._warn(f"  Páginas escaneadas: {self.stats.total_paginas - self.stats.paginas_con_texto_nativo}")
            self._warn("  Solo se procesaron las páginas con texto nativo (índice).")
            self._warn("  PDA/contenidos quedan como requiere_revision_humana=True.")
            self._warn("  ACCIÓN REQUERIDA: instalar tesseract (apt install tesseract-ocr tesseract-ocr-spa)")
            self._warn("  o ejecutar OCR externo sobre el PDF y volver a correr este script.")
            self._warn("=" * 60)
            self.stats.paginas_escaneadas = self.stats.total_paginas - self.stats.paginas_con_texto_nativo
            self.stats.paginas_ocr_fallido = self.stats.paginas_escaneadas
            self.stats.paginas_sin_procesar = self.stats.paginas_escaneadas
        else:
            # OCR por página (lento pero funciona)
            with fitz.open(str(self.pdf_path)) as pdf:
                for i, page in enumerate(pdf):
                    pag = i + 1
                    if pag in native_text_by_page:
                        continue
                    txt = ocr_imagen_pymupdf(page)
                    if txt and len(txt.strip()) > 50:
                        ocr_text_by_page[pag] = txt
                        self.stats.paginas_ocr_exitoso += 1
                    else:
                        self.stats.paginas_ocr_fallido += 1
                        self._requiere_intervencion(pag, "OCR no produjo texto útil")

        # 6. Combinar todo el texto disponible
        all_text = {**native_text_by_page, **ocr_text_by_page}

        # 7. Generar propuesta cruda de PDA (placeholders honestos)
        pdas_crudos = self._generar_pdas_crudos(campos_en_texto, ocr_text_by_page, native_text_by_page)
        self.stats.candidatos_pda = len(pdas_crudos)
        self.stats.pda_requieren_revision = sum(1 for p in pdas_crudos if p["requiere_revision_humana"])
        self.stats.pda_confirmados = sum(1 for p in pdas_crudos if not p["requiere_revision_humana"])

        # 8. Generar placeholders de contenidos (1 por campo si no se pudo extraer)
        contenidos = self._generar_contenidos(campos_en_texto, all_text)
        self.stats.contenidos_detectados = len(contenidos)

        # 9. Referencias CONALITEG (placeholders, founder llena)
        referencias = CONALITEG_REFERENCES_PLACEHOLDER

        # 10. Construir catálogo crudo completo
        catalogo_crudo = {
            "metadata_extraccion": {
                "fecha": self._now_iso(),
                "script_version": "catalogar_fase2.py v0.1",
                "pdf_fuente": str(self.pdf_path),
                "pdf_sha256": self.sha256,
                "total_paginas_pdf": self.stats.total_paginas,
                "pdfplumber_exito": True,
                "pymupdf_disponible": True,
                "tesseract_disponible": tesseract_disponible(),
                "metodo_extraccion_texto": (
                    "nativo+ocr" if tesseract_disponible() else "nativo_solo_pdf_escaneado_sin_ocr"
                ),
            },
            "catalogo_version": {
                **CATALOGO_VERSION,
                "fuente_sha256": self.sha256,
                "fecha_carga": self._now_iso(),
                "cargado_por": "atlas + founder",
            },
            "campos_formativos": CAMPOS_FORMATIVOS,
            "ejes_articuladores": EJES_ARTICULADORES,
            "fases": FASES,
            "pdas": pdas_crudos,
            "contenidos": contenidos,
            "pda_por_campo_fase": [
                {
                    "pda_codigo": p["codigo"],
                    "fase_codigo": "FASE_2",
                    "campo_codigo": campo_codigo,
                }
                for p in pdas_crudos
                for campo_codigo in p.get("campos_asociados", [])
            ],
            "pda_ejes": [
                {"pda_codigo": p["codigo"], "eje_codigo": eje}
                for p in pdas_crudos
                for eje in p.get("ejes_asociados", [])
            ],
            "referencias_conaliteg": referencias,
            "auditoria_carga": [
                {
                    "accion": "agregado",
                    "observacion": "PDA placeholder generado por extracción automática con OCR limitado o PDF escaneado",
                    "autor": "atlas-script",
                }
            ],
        }

        # 11. Persistir outputs
        self._guardar_outputs(catalogo_crudo)
        return catalogo_crudo

    # --- Detectores ---

    def _detectar_paginas_fase_2(self, text_by_page: Dict[int, str]) -> List[int]:
        return [p for p, t in text_by_page.items() if RE_FASE_2.search(t) or RE_PREESCOLAR.search(t)]

    def _detectar_campos(self, text_by_page: Dict[int, str]) -> Dict[str, List[int]]:
        result = {k: [] for k in RE_CAMPO}
        for pag, txt in text_by_page.items():
            for codigo, regex in RE_CAMPO.items():
                if regex.search(txt):
                    result[codigo].append(pag)
        # Solo incluir los que aparecen al menos una vez
        return {k: v for k, v in result.items() if v}

    def _detectar_ejes(self, text_by_page: Dict[int, str]) -> Dict[str, List[int]]:
        result = {k: [] for k in RE_EJE}
        for pag, txt in text_by_page.items():
            for codigo, regex in RE_EJE.items():
                if regex.search(txt):
                    result[codigo].append(pag)
        return {k: v for k, v in result.items() if v}

    # --- Generadores de propuesta cruda ---

    def _generar_pdas_crudos(
        self,
        campos_en_texto: Dict[str, List[int]],
        ocr_text_by_page: Dict[int, str],
        native_text_by_page: Dict[int, str],
    ) -> List[Dict]:
        """
        Genera la propuesta de PDA para Fase 2.
        Si hay OCR/texto nativo con headers PDA, los extrae; si no, genera placeholders honestos.
        """
        all_text = {**native_text_by_page, **ocr_text_by_page}
        pdas = []
        contador_por_campo: Dict[str, int] = {}

        # Buscar headers PDA explícitos en texto combinado
        headers_encontrados = []
        for pag, txt in all_text.items():
            for m in RE_PDA_HEADER.finditer(txt):
                headers_encontrados.append({"pagina": pag, "match": m.group(0), "numero": m.group(1)})

        # Si no hay texto nativo de PDA (caso PDF escaneado), generar placeholders
        # por cada campo detectado, asumiendo 6-8 PDA por campo (estimación E14 §5.2)
        campos_disponibles = list(campos_en_texto.keys()) or list(RE_CAMPO.keys())

        if not headers_encontrados and not ocr_text_by_page:
            # Caso: PDF escaneado sin OCR disponible
            self._warn("No se pudo extraer texto de PDA (PDF escaneado, sin OCR).")
            self._warn("Generando placeholders por campo para que el founder complete.")
            for campo_codigo in campos_disponibles:
                # Estimar ~6-8 PDA por campo (E14 §5.2: ~24-30 PDA totales / 4 campos)
                for i in range(1, 7):
                    contador_por_campo[campo_codigo] = contador_por_campo.get(campo_codigo, 0) + 1
                    codigo = f"PDA-F2-{self._siglas_campo(campo_codigo)}-{i:03d}"
                    pdas.append({
                        "codigo": codigo,
                        "texto": None,
                        "fuente_dof_pagina": None,
                        "fuente_dof_sha": self.sha256,
                        "activo": True,
                        "requiere_revision_humana": True,
                        "razon_revision": "PDA no extraíble automáticamente: PDF escaneado, sin OCR. Founder debe completar texto y página.",
                        "campos_asociados": [campo_codigo],
                        "ejes_asociados": [],
                    })
                    self.stats.pda_requieren_revision += 1
        else:
            # Caso: hay algo de texto (OCR parcial). Extraer lo que se pueda.
            for h in headers_encontrados[:30]:  # cap defensivo
                num = h["numero"]
                # Intentar asociar al campo según la página anterior
                campo_codigo = self._inferir_campo_en_pagina(h["pagina"], all_text)
                if campo_codigo is None:
                    continue
                contador_por_campo[campo_codigo] = contador_por_campo.get(campo_codigo, 0) + 1
                codigo = f"PDA-F2-{self._siglas_campo(campo_codigo)}-{contador_por_campo[campo_codigo]:03d}"
                pdas.append({
                    "codigo": codigo,
                    "texto": f"[PDA {num} detectado en pág. {h['pagina']} — texto a verificar contra PDF]",
                    "fuente_dof_pagina": h["pagina"],
                    "fuente_dof_sha": self.sha256,
                    "activo": True,
                    "requiere_revision_humana": True,
                    "razon_revision": "PDA extraído por regex; founder debe validar texto completo contra PDF.",
                    "campos_asociados": [campo_codigo],
                    "ejes_asociados": [],
                })

        return pdas

    def _inferir_campo_en_pagina(self, pag: int, all_text: Dict[int, str]) -> Optional[str]:
        """Mira hacia atrás hasta 3 páginas para inferir a qué campo pertenece."""
        for back in range(0, 4):
            check_pag = pag - back
            if check_pag in all_text:
                txt = all_text[check_pag]
                for codigo, regex in RE_CAMPO.items():
                    if regex.search(txt):
                        return codigo
        return None

    def _siglas_campo(self, codigo: str) -> str:
        return {
            "LENGUAJES": "LNG",
            "SABERES_PENSAMIENTO_CIENTIFICO": "SPC",
            "ETICA_NATURALEZA_SOCIEDADES": "ENS",
            "LO_HUMANO_LO_COMUNITARIO": "HUM",
        }.get(codigo, codigo[:3].upper())

    def _generar_contenidos(
        self,
        campos_en_texto: Dict[str, List[int]],
        all_text: Dict[int, str],
    ) -> List[Dict]:
        """
        Genera placeholders de contenidos: 1 por campo detectado (los textos
        específicos quedan como requiere_revision_humana).
        """
        contenidos = []
        contador = 0
        for campo_codigo in campos_en_texto or RE_CAMPO:
            contador += 1
            contenidos.append({
                "codigo": f"CONT-F2-{self._siglas_campo(campo_codigo)}-{contador:03d}",
                "texto": None,
                "campo_codigo": campo_codigo,
                "fase_codigo": "FASE_2",
                "fuente_dof_pagina": campos_en_texto.get(campo_codigo, [None])[0],
                "requiere_revision_humana": True,
                "razon_revision": "Contenido no extraíble: PDF escaneado. Founder debe listar contenidos específicos del campo.",
            })
        return contenidos

    # --- Output ---

    def _guardar_outputs(self, catalogo: Dict) -> None:
        import json
        out_json = self.output_dir / "catalogo_fase2_crudo.json"
        out_json.write_text(json.dumps(catalogo, indent=2, ensure_ascii=False))
        self._log(f"Guardado: {out_json}")

        out_log = self.output_dir / "extraction_log.md"
        out_log.write_text(self._render_log_md())
        self._log(f"Guardado: {out_log}")

        out_quality = self.output_dir / "extraction_quality_report.md"
        out_quality.write_text(self._render_quality_md())
        self._log(f"Guardado: {out_quality}")

    def _render_log_md(self) -> str:
        lines = [
            "# Log de extracción — Fase 2 NEM",
            "",
            f"**Fecha:** {self._now_iso()}",
            f"**PDF fuente:** `{self.pdf_path.name}`",
            f"**SHA256:** `{self.sha256}`",
            f"**Script:** catalogar_fase2.py v0.1",
            "",
            "## Traza de ejecución",
            "",
        ]
        lines.extend(f"- {l}" for l in self.log_lines)
        lines.extend([
            "",
            "## Páginas que requieren intervención humana",
            "",
        ])
        if self.stats.requiere_intervencion:
            for r in self.stats.requiere_intervencion:
                lines.append(f"- **Pág. {r['pagina']}**: {r['motivo']}")
        else:
            lines.append("- (ninguna — extracción completa)")
        lines.extend(["", "## Advertencias", ""])
        if self.stats.advertencias:
            for a in self.stats.advertencias:
                lines.append(f"- {a}")
        else:
            lines.append("- (ninguna)")
        return "\n".join(lines) + "\n"

    def _render_quality_md(self) -> str:
        cobertura = (
            100.0 * self.stats.paginas_con_texto_nativo / self.stats.total_paginas
            if self.stats.total_paginas else 0.0
        )
        lines = [
            "# Reporte de calidad — Extracción Fase 2 NEM",
            "",
            f"**Fecha:** {self._now_iso()}",
            f"**PDF fuente:** `{self.pdf_path.name}`",
            f"**SHA256:** `{self.sha256}`",
            "",
            "## Métricas de cobertura",
            "",
            "| Métrica | Valor |",
            "|---|---|",
            f"| Páginas totales | {self.stats.total_paginas} |",
            f"| Páginas con texto nativo (pdfplumber) | {self.stats.paginas_con_texto_nativo} |",
            f"| Páginas escaneadas (sin texto) | {self.stats.paginas_escaneadas} |",
            f"| Páginas OCR exitoso | {self.stats.paginas_ocr_exitoso} |",
            f"| Páginas OCR fallido | {self.stats.paginas_ocr_fallido} |",
            f"| Páginas sin procesar | {self.stats.paginas_sin_procesar} |",
            f"| **Cobertura textual estimada** | **{cobertura:.1f}%** |",
            "",
            "## Métricas de catálogo",
            "",
            "| Métrica | Valor |",
            "|---|---|",
            f"| PDA candidatos generados | {self.stats.candidatos_pda} |",
            f"| PDA confirmados (texto + página) | {self.stats.pda_confirmados} |",
            f"| PDA que requieren revisión humana | {self.stats.pda_requieren_revision} |",
            f"| Contenidos detectados | {self.stats.contenidos_detectados} |",
            f"| Campos formativos detectados | {len(self.stats.campos_detectados)} ({', '.join(self.stats.campos_detectados) or 'ninguno'}) |",
            f"| Ejes articuladores detectados | {len(self.stats.ejes_detectados)} ({', '.join(self.stats.ejes_detectados) or 'ninguno'}) |",
            "",
            "## Diagnóstico",
            "",
        ]
        if cobertura < 60:
            lines.extend([
                f"⚠️ **Cobertura textual {cobertura:.1f}% — por debajo del umbral mínimo del 60%.**",
                "",
                "Causa raíz: el PDF es un escaneo (479 páginas, solo 5 con texto nativo).",
                "Sin OCR (tesseract) instalado en el sistema, la extracción automática",
                "de PDA/contenidos queda limitada al índice y los marcadores detectados.",
                "",
                "**Acción recomendada:**",
                "1. Instalar tesseract: `sudo apt install tesseract-ocr tesseract-ocr-spa`",
                "2. Volver a ejecutar `python3 catalogar_fase2.py extract`.",
                "3. Si sigue habiendo huecos, ejecutar OCR externo con `ocrmypdf` y reintentar.",
                "4. Como último recurso, el founder puede completar manualmente",
                "   `catalogo_fase2_crudo.json` y marcar `requiere_revision_humana: false`.",
            ])
        else:
            lines.append(f"✓ Cobertura textual aceptable ({cobertura:.1f}% ≥ 60%).")
        return "\n".join(lines) + "\n"

    @staticmethod
    def _now_iso() -> str:
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
