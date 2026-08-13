#!/usr/bin/env python3
"""
monitor_normativo.py - Monitor de Vigilancia Normativa (E11 MVP)

Vigila 6 fuentes del nucleo normativo del proyecto educacion:
  F1 DOF    F2 Acuerdo 14/08/22    F3 Acuerdo 06/08/23
  F4 Calendario Escolar    F5 LFPDPPP    F6 CONALITEG

Modos:
  --once    Ejecuta una corrida, registra hashes y alertas, termina.
            Es el modo canonico para cron (E11 §6.1).
  --daemon  Alias de --once en MVP (E11 §6.1).
  --help    Muestra esta ayuda.

Salidas (todo dentro de fuentes/_monitor/):
  estado.json                              Estado persistente por fuente
  runs/YYYY-MM-DD-HHMM_run.log             Log de cada corrida
  cambios_detectados/YYYY-MM-DD-*.md       Alertas individuales (si las hay)
  cambios_resumen_semanal_YYYY-MM-DD.md    Resumen semanal agregado

Uso:
  python3 monitor_normativo.py --once
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import requests
except ImportError:
    print("ERROR: falta libreria 'requests'. pip install --user requests", file=sys.stderr)
    sys.exit(2)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: falta libreria 'beautifulsoup4'. pip install --user beautifulsoup4", file=sys.stderr)
    sys.exit(2)

# Modulos locales
from severidad import clasificar, resumen_clasificacion
from fingerprint import calcular_hash, extraer_primeras_palabras, html_a_texto
from notificador import (
    escribir_alerta,
    escribir_log_run,
    escribir_resumen_semanal,
    rotar_logs_si_necesario,
)


# Rutas canonicas (este archivo vive en fuentes/_monitor/)
BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
ESTADO_PATH = BASE_DIR / "estado.json"


def cargar_config() -> Dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def cargar_estado() -> Dict:
    """Carga estado.json. Si no existe, devuelve estado inicial vacio."""
    if ESTADO_PATH.exists():
        with open(ESTADO_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "version": "0.1",
        "ultima_corrida": None,
        "fuentes": {},  # fuente_id -> {hash, ultima_deteccion, ultima_corrida_ok}
    }


def guardar_estado(estado: Dict) -> None:
    """Guarda estado.json de forma atomica (escritura en .tmp + rename)."""
    tmp = ESTADO_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(estado, f, indent=2, ensure_ascii=False)
    tmp.replace(ESTADO_PATH)


def respetar_robots_txt(sesion: requests.Session, url: str, user_agent: str) -> bool:
    """Consulta robots.txt de la URL objetivo. Devuelve True si scraping OK.

    Best-effort: si falla la consulta, NO bloqueamos (fail-open) pero
    dejamos nota en el log. Esto refleja P8 (respeto al origen) sin
    hacer al monitor fragil ante servidores caidos.
    """
    try:
        from urllib.parse import urlparse, urljoin
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception:
        # Si no se puede consultar, asumimos OK (no somos agresivos).
        return True


def fetch_fuente(fuente: Dict, config: Dict, log: List[str]) -> Optional[Dict]:
    """Descarga una fuente. Devuelve dict con datos parseados o None si fallo.

    Devuelve: {html_crudo, texto_plano, hash, status_code, content_type, bytes}
    o None si la peticion fallo.
    """
    url = fuente["url"]
    user_agent = config.get("user_agent", "Atlas-Monitor/0.1")
    timeout = config.get("timeout_segundos", 30)

    log.append(f"  [FETCH] {fuente['id']} {fuente['nombre']} -> {url}")

    # 1) Respeto a robots.txt
    if not respetar_robots_txt(requests.Session(), url, user_agent):
        log.append(f"  [SKIP] {fuente['id']} bloqueado por robots.txt")
        return None

    # 2) Peticion HTTP
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
    except requests.RequestException as e:
        log.append(f"  [ERROR] {fuente['id']} fallo de red: {e}")
        return None

    # 3) Validar Content-Type (rechazar PDF segun regla)
    ctype = resp.headers.get("Content-Type", "").lower()
    if "application/pdf" in ctype:
        log.append(f"  [SKIP] {fuente['id']} Content-Type=application/pdf; se omite (regla E11).")
        return None

    if resp.status_code >= 400:
        log.append(f"  [ERROR] {fuente['id']} HTTP {resp.status_code}")
        return None

    contenido_bytes = resp.content
    if not contenido_bytes:
        log.append(f"  [WARN] {fuente['id']} respuesta vacia (0 bytes)")
        return None

    # 4) Truncar HTML > 500KB antes de hashear (defensa + consistencia de hash)
    max_bytes = config.get("max_bytes_antes_truncar", 500 * 1024)
    fue_truncado = False
    if len(contenido_bytes) > max_bytes:
        log.append(f"  [WARN] {fuente['id']} HTML >{max_bytes}B ({len(contenido_bytes)}); truncado para hash.")
        contenido_bytes_hash = contenido_bytes[:max_bytes]
        fue_truncado = True
    else:
        contenido_bytes_hash = contenido_bytes

    # 5) Decodificar
    encoding = resp.encoding or "utf-8"
    try:
        html_crudo = contenido_bytes.decode(encoding, errors="replace")
    except LookupError:
        html_crudo = contenido_bytes.decode("utf-8", errors="replace")

    # 6) Parsear con BeautifulSoup y extraer texto
    try:
        soup = BeautifulSoup(html_crudo, "html.parser")
        # Quitar scripts/estilos (defensa)
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        texto_plano = soup.get_text(separator=" ", strip=True)
    except Exception as e:
        log.append(f"  [WARN] {fuente['id']} fallo parsing BeautifulSoup: {e}")
        texto_plano = html_a_texto(html_crudo)

    # 7) Hash sobre contenido crudo (truncado si corresponde)
    hash_nuevo = calcular_hash(contenido_bytes_hash)
    log.append(f"  [OK] {fuente['id']} {len(contenido_bytes)}B hash={hash_nuevo[:24]}... truncado={fue_truncado}")

    return {
        "html_crudo": html_crudo,
        "texto_plano": texto_plano,
        "hash": hash_nuevo,
        "status_code": resp.status_code,
        "content_type": ctype,
        "bytes": len(contenido_bytes),
        "truncado": fue_truncado,
        "final_url": resp.url,
    }


def detectar_cambio(fuente: Dict, datos_fetch: Dict, estado_fuente: Dict) -> Tuple[bool, str, str]:
    """Compara hash nuevo vs hash previo.

    Devuelve (cambio_detectado, hash_anterior, hash_nuevo).

    Reglas:
      - Si no hay hash previo (primera corrida) -> NO es cambio.
        Se inicializa con el hash actual. La primera corrida nunca alerta.
      - Si hash previo == hash nuevo -> NO es cambio.
      - Si difieren -> SI es cambio.
    """
    hash_nuevo = datos_fetch["hash"]
    hash_anterior = estado_fuente.get("hash")
    if hash_anterior is None:
        return False, "", hash_nuevo
    return (hash_anterior != hash_nuevo), hash_anterior, hash_nuevo


def generar_titulo_cambio(fuente: Dict, datos_fetch: Dict) -> str:
    """Genera un titulo legible a partir del contenido.

    Heuristica: primera frase con keywords de interes, o el <title>, o
    fallback 'Cambio en {nombre}'.
    """
    soup = BeautifulSoup(datos_fetch["html_crudo"], "html.parser")
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""
    if title and len(title) > 10:
        return title[:120]
    # Primera frase del texto plano (limite 120 chars)
    texto = datos_fetch.get("texto_plano", "")
    m = re.search(r"[^.]{10,200}\.", texto)
    if m:
        return m.group(0).strip()[:120]
    return f"Cambio en {fuente['nombre']}"


def procesar_fuente(fuente: Dict, config: Dict, estado: Dict, log: List[str]) -> Optional[Dict]:
    """Procesa una fuente: fetch + diff + clasifica + alerta opcional.

    Devuelve dict con datos de alerta si se genero, o None si no.
    Actualiza `estado` in-place.
    """
    fid = fuente["id"]
    estado_fuente = estado["fuentes"].setdefault(fid, {
        "nombre": fuente["nombre"],
        "url": fuente["url"],
        "hash": None,
        "primera_corrida": None,
        "ultima_deteccion": None,
        "ultima_corrida_ok": None,
    })

    # 1) Fetch
    datos = fetch_fuente(fuente, config, log)
    if datos is None:
        # Falla no rompe el lote (P6)
        return None

    estado_fuente["ultima_corrida_ok"] = datetime.now(timezone.utc).isoformat()

    # 2) Diff
    cambio, hash_ant, hash_nuevo = detectar_cambio(fuente, datos, estado_fuente)
    titulo = generar_titulo_cambio(fuente, datos)

    if not cambio:
        # Sin cambio: actualizar hash si era primera corrida
        if estado_fuente.get("hash") is None:
            estado_fuente["hash"] = hash_nuevo
            estado_fuente["primera_corrida"] = datetime.now(timezone.utc).isoformat()
            log.append(f"  [INIT] {fid} hash inicial registrado (sin alerta).")
        else:
            log.append(f"  [NOOP] {fid} sin cambios detectados.")
        return None

    # 3) Hay cambio: clasificar severidad
    muestra = titulo + "\n" + datos["texto_plano"][:5000]
    cls = resumen_clasificacion(muestra)
    log.append(f"  [CAMBIO] {fid} severidad={cls['severidad']} kws={cls['keywords_detectadas']}")

    # 4) Generar alerta (escribir .md)
    fecha = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    extracto = extraer_primeras_palabras(datos["texto_plano"])

    datos_alerta = {
        "fecha": fecha,
        "timestamp": timestamp,
        "fuente_id": fid,
        "fuente_nombre": fuente["nombre"],
        "url": fuente["url"],
        "severidad": cls["severidad"],
        "emoji": cls["emoji"],
        "titulo": titulo,
        "hash_anterior": hash_ant,
        "hash_nuevo": hash_nuevo,
        "keywords": cls["keywords_detectadas"],
        "extracto": extracto,
    }
    ruta_alerta = escribir_alerta(datos_alerta, BASE_DIR)
    log.append(f"  [ALERTA] {fid} -> {ruta_alerta.name}")

    # 5) Actualizar estado
    estado_fuente["hash"] = hash_nuevo
    estado_fuente["ultima_deteccion"] = timestamp

    return {
        "titulo": titulo,
        "severidad": cls["severidad"],
        "emoji": cls["emoji"],
        "ruta": str(ruta_alerta),
        "fuente_id": fid,
    }


def ejecutar_corrida(config: Dict, log: List[str]) -> Dict:
    """Ejecuta una corrida completa. Devuelve resumen para el weekly."""
    log.append(f"=== Corrida iniciada {datetime.now(timezone.utc).isoformat()} ===")
    log.append(f"Config: {len(config['fuentes'])} fuentes, rate={config.get('rate_limit_segundos',1.0)}s")

    estado = cargar_estado()
    rate = config.get("rate_limit_segundos", 1.0)
    alertas: List[Dict] = []
    ok_count = 0
    fail_count = 0

    for i, fuente in enumerate(config["fuentes"]):
        try:
            alerta = procesar_fuente(fuente, config, estado, log)
            if alerta:
                alertas.append(alerta)
                # Cambio se considera "OK" para el contador (lo leimos bien)
                ok_count += 1
            else:
                # OK = no fallo de red (puede ser no-op o init)
                if fuente["id"] in estado["fuentes"] and estado["fuentes"][fuente["id"]].get("ultima_corrida_ok"):
                    ok_count += 1
                else:
                    fail_count += 1
        except Exception as e:
            log.append(f"  [EXCEPTION] {fuente['id']} {type(e).__name__}: {e}")
            fail_count += 1

        # Rate limit entre fuentes (no tras la ultima)
        if i < len(config["fuentes"]) - 1:
            time.sleep(rate)

    estado["ultima_corrida"] = datetime.now(timezone.utc).isoformat()
    guardar_estado(estado)

    log.append(f"=== Corrida finalizada: {ok_count} OK, {fail_count} fallidas, {len(alertas)} alertas ===")

    # Construir resumen para weekly
    estado_por_fuente = {}
    for fid, info in estado["fuentes"].items():
        hash_val = info.get("hash")
        estado_por_fuente[fid] = {
            "nombre": info.get("nombre", ""),
            "hash": hash_val if hash_val else "—",
            "ultima_modificacion": info.get("ultima_deteccion") or info.get("primera_corrida") or "—",
        }

    return {
        "fecha": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "fuentes_consultadas_ok": ok_count,
        "fuentes_consultadas_total": len(config["fuentes"]),
        "alertas": alertas,
        "estado_por_fuente": estado_por_fuente,
    }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Monitor de Vigilancia Normativa (E11 MVP).",
        epilog="Modos: --once ejecuta una corrida y termina (modo cron).",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--once", action="store_true", default=True,
                       help="(default) Ejecuta una sola corrida y termina.")
    group.add_argument("--daemon", action="store_true",
                       help="Alias de --once en MVP (loop continuo reservado para futuro).")
    args = parser.parse_args(argv)

    config = cargar_config()
    log: List[str] = []

    # Rotar logs viejos (silencioso; el conteo va al log de la corrida)
    semanas = config.get("max_log_retention_semanas", 8)
    borrados = rotar_logs_si_necesario(BASE_DIR, semanas)
    if borrados:
        log.append(f"[ROTACION] {borrados} logs antiguos borrados (> {semanas} semanas).")

    resumen = ejecutar_corrida(config, log)

    # Escribir log de corrida
    ruta_log = escribir_log_run(log, BASE_DIR)

    # Escribir resumen semanal (siempre, aunque no haya alertas)
    ruta_resumen = escribir_resumen_semanal(resumen, BASE_DIR)

    # Salida consola (para cron)
    print(f"[OK] Monitor corrido. Log: {ruta_log}")
    print(f"[OK] Resumen semanal: {ruta_resumen}")
    if resumen["alertas"]:
        print(f"[ALERTA] {len(resumen['alertas'])} cambios detectados. Ver {BASE_DIR/'cambios_detectados'}.")
    else:
        print("[INFO] Sin cambios detectados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
