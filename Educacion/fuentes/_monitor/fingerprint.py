"""
fingerprint.py - Hash + extraccion de primeras 500 palabras (E11 §4.2)

Funciones puras, sin estado, sin IO. Reciben bytes/str y devuelven
resultados deterministas. Esto facilita testing y reproducible (P3).
"""

from __future__ import annotations
import hashlib
import re
from typing import Tuple


# Tope de extraccion por seguridad (E11 §5.2: 'primeras 500 palabras').
MAX_PALABRAS = 500

# Tope de HTML crudo antes de hashear (defensa contra sitios gobierno
# pesados: regla practica del proyecto = 500 KB max).
MAX_HTML_HASH_BYTES = 500 * 1024


def calcular_hash(contenido: bytes | str) -> str:
    """SHA-256 hex del contenido. Si el HTML > MAX_HTML_HASH_BYTES,
    hashea solo los primeros bytes (con prefijo de advertencia para
    que hashes de contenido truncado sean distinguibles)."""
    if isinstance(contenido, str):
        contenido = contenido.encode("utf-8", errors="replace")

    if len(contenido) > MAX_HTML_HASH_BYTES:
        prefijo = b"[TRUNCADO-500KB]"
        contenido = prefijo + contenido[:MAX_HTML_HASH_BYTES]

    return "sha256:" + hashlib.sha256(contenido).hexdigest()


def extraer_primeras_palabras(html_o_texto: str, max_palabras: int = MAX_PALABRAS) -> str:
    """Extrae las primeras N palabras del HTML ya plano.

    Estrategia: regex simple sobre tokens [A-Za-z0-9áéíóúñÁÉÍÓÚÑüÜ]+.
    Esto NO preserva estructura, solo sirve para mostrar al founder un
    extracto legible del cambio detectado (E11 §5.2). Para un diff real
    usa el HTML completo + `git diff` o similar fuera del monitor.
    """
    if not html_o_texto:
        return ""

    tokens = re.findall(r"[A-Za-z0-9áéíóúñÁÉÍÓÚÑüÜ]+", html_o_texto)
    palabras = tokens[:max_palabras]
    return " ".join(palabras)


def html_a_texto(html: str) -> str:
    """Convierte HTML a texto plano removiendo tags. Best-effort.

    Implementado aqui (no en notificador) para mantener fingerprint.py
    como modulo de funciones puras. El parser real lo usamos en
    monitor_normativo.py con BeautifulSoup; esta funcion es fallback
    rapido o para tests sin dependencias.
    """
    if not html:
        return ""
    # Eliminar scripts/estilos primero
    html = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    # Reemplazar tags por espacios
    html = re.sub(r"<[^>]+>", " ", html)
    # Decodificar entidades HTML mas comunes
    reemplazos = {
        "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&#39;": "'", "&aacute;": "a", "&eacute;": "e",
        "&iacute;": "i", "&oacute;": "o", "&uacute;": "u", "&ntilde;": "n",
    }
    for entidad, char in reemplazos.items():
        html = html.replace(entidad, char)
    # Colapsar espacios
    html = re.sub(r"\s+", " ", html).strip()
    return html


def procesar_html(html_crudo: str) -> Tuple[str, str]:
    """Pipeline completo: HTML crudo -> (hash, primeras_500_palabras_texto).

    Devuelve tupla con:
      - hash sha256 prefijado del HTML (posiblemente truncado).
      - extracto de las primeras 500 palabras en texto plano.
    """
    if html_crudo is None:
        return calcular_hash(b""), ""
    texto_plano = html_a_texto(html_crudo)
    return calcular_hash(html_crudo), extraer_primeras_palabras(texto_plano)


if __name__ == "__main__":
    # Smoke test
    html_ejemplo = """
    <html><head><title>Acuerdo</title></head>
    <body><script>alert('x')</script>
    <h1>Se reforma el Plan de Estudio de educacion basica</h1>
    <p>El presente Acuerdo tiene por objeto modificar el Plan de Estudio...</p>
    </body></html>
    """
    h, txt = procesar_html(html_ejemplo)
    print(f"hash: {h}")
    print(f"primeras palabras: {txt[:200]}")
