"""
severidad.py - Clasificador de severidad por keywords (E11 §4)

Implementa la heuristica de severidad descrita en E11 §4.1 y §4.2.
Sin IA. Solo keywords case-insensitive. La coincidencia gana por la
severidad mas alta encontrada (ACTUAR > REVISAR > INFO).
"""

from __future__ import annotations
from typing import Dict, List, Tuple


# Tabla literal de E11 §4.1
KEYWORDS_ACTUAR: List[str] = [
    "Plan de Estudio",
    "LFPDPPP",
    "Ley Federal de Proteccion de Datos",
    "Ley General de Proteccion de Datos",
    "INAI",
    "Secretaria Anticorrupcion",
    "Articulo 3",  # Sin grado para matchear "Articulo 3°"
    "educacion basica obligatoria",
    "Plan y Programas de Estudio",
    "reforma educativa",
    "modifica el diverso",
]

KEYWORDS_REVISAR: List[str] = [
    "calendario escolar",
    "reingreso",
    "Consejo Tecnico Escolar",
    "CTE",
    "Fase Intensiva",
    "programa sintetico",
    "libros de texto",
    "CONALITEG",
    "Programa de Mejora Continua",
    "PMC",
    "programa analitico",
    "ejes articuladores",
    "campos formativos",
]

KEYWORDS_INFO: List[str] = [
    "boletin",
    "comunicado",
    "convocatoria",
    "foro",
    "ceremonia",
    "evento",
    "conmemoracion",
]


# Jerarquia (mayor a menor)
NIVELES = [
    ("ACTUAR", "🔴", KEYWORDS_ACTUAR),
    ("REVISAR", "🟡", KEYWORDS_REVISAR),
    ("INFO", "🟢", KEYWORDS_INFO),
]


def _normalizar(texto: str) -> str:
    """Normaliza acentos/ñ y baja a minusculas para matching robusto.

    E11 §4.3 advierte contra falsos positivos por 'N EM' vs 'NEM'.
    Nuestras keywords son frases multi-palabra, no siglas sueltas, pero
    normalizamos acentos para no perder coincidencias por tildes.
    """
    if not texto:
        return ""
    reemplazos = str.maketrans({
        "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
        "Á": "a", "É": "e", "Í": "i", "Ó": "o", "Ú": "u",
        "ñ": "n", "Ñ": "n",
        "°": "",
    })
    return texto.lower().translate(reemplazos)


def clasificar(texto: str) -> Tuple[str, str, List[str]]:
    """Devuelve (severidad, emoji, keywords_coincidentes).

    severidad es una de: "ACTUAR", "REVISAR", "INFO".
    Si no hay coincidencia, devuelve ("INFO", "🟢", []) — degradacion
    segura: cualquier documento sin keywords conocidas se loguea pero
    no genera alerta bloqueante.
    """
    texto_norm = _normalizar(texto)

    for nombre, emoji, keywords in NIVELES:
        coincidencias: List[str] = []
        for kw in keywords:
            kw_norm = _normalizar(kw)
            if kw_norm in texto_norm:
                coincidencias.append(kw)
        if coincidencias:
            return nombre, emoji, coincidencias

    return "INFO", "🟢", []


def resumen_clasificacion(texto: str) -> Dict[str, object]:
    """Version serializable del resultado de clasificar()."""
    sev, emoji, kws = clasificar(texto)
    return {
        "severidad": sev,
        "emoji": emoji,
        "keywords_detectadas": kws,
        "es_alerta": sev in ("ACTUAR", "REVISAR"),
    }


if __name__ == "__main__":
    # Pruebas rapidas (no exhaustivas, sanity check)
    casos = [
        ("Se reforma el Plan de Estudio de educacion basica obligatoria", "ACTUAR"),
        ("Publican el calendario escolar 2027-2028", "REVISAR"),
        ("Boletin de prensa: ceremonia de inicio de ciclo", "INFO"),
        ("Reunion del CTE sin cambios normativos", "REVISAR"),
        ("Texto neutro sin palabras clave relevantes", "INFO"),
    ]
    for texto, esperado in casos:
        sev, emoji, kws = clasificar(texto)
        ok = "OK " if sev == esperado else "FAIL"
        print(f"[{ok}] esperado={esperado}  obtuvo={sev}  emoji={emoji}  kws={kws}")
