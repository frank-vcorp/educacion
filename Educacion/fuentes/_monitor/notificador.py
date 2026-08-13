"""
notificador.py - Escritura a disco de alertas y resumen semanal (E11 §5)

El monitor NO envia push, NO envia email, NO notifica a usuarios.
Solo escribe artefactos locales (.md) que el founder lee cuando quiere.

Funciones exportadas:
  - escribir_alerta(datos_alerta, base_dir) -> ruta del .md creado
  - escribir_resumen_semanal(resumen, base_dir) -> ruta del .md creado
  - rotar_logs_si_necesario(base_dir, semanas_retencion) -> None
  - escribir_log_run(lineas, base_dir) -> ruta del log

Cada funcion es idempotente: si el archivo ya existe con el mismo
contenido, no duplica; si no existe, lo crea.
"""

from __future__ import annotations
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List


def _slug(texto: str) -> str:
    """Slug simple para nombres de archivo: minusculas, guiones."""
    import re
    s = texto.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = s.strip("_")
    return s[:80] or "sin_titulo"


def _timestamp() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")


def escribir_alerta(datos: Dict, base_dir: Path) -> Path:
    """Escribe un archivo .md de alerta en cambios_detectados/.

    datos esperados (claves):
      - fecha: str YYYY-MM-DD
      - timestamp: str UTC
      - fuente_id: str 'F1'..'F6'
      - fuente_nombre: str
      - url: str
      - severidad: 'ACTUAR' | 'REVISAR' | 'INFO'
      - emoji: '🔴' | '🟡' | '🟢'
      - titulo: str
      - hash_anterior: str
      - hash_nuevo: str
      - keywords: List[str]
      - extracto: str (primeras 500 palabras)
    """
    base_dir = Path(base_dir)
    carpeta = base_dir / "cambios_detectados"
    carpeta.mkdir(parents=True, exist_ok=True)

    sev = datos["severidad"].lower()
    fid = datos["fuente_id"]
    slug = _slug(datos.get("titulo", fid))
    nombre = f"{datos['fecha']}-{sev}-{fid}-{slug}.md"
    ruta = carpeta / nombre

    impacto_spec = _generar_impacto_spec(datos["fuente_id"], datos.get("keywords", []))

    contenido = f"""# {datos['emoji']} [{datos['severidad']}] — {datos.get('titulo', 'Deteccion automatica')}

**Fecha de deteccion:** {datos.get('timestamp', _timestamp())}
**Fuente:** {datos['fuente_id']} — {datos['fuente_nombre']}
**URL original:** {datos['url']}
**Hash anterior:** `{datos['hash_anterior']}`
**Hash nuevo:** `{datos['hash_nuevo']}`

## Severidad y razonamiento
- Keywords detectadas: {', '.join(f'`{k}`' for k in datos.get('keywords', [])) or '_(ninguna coincidencia de keywords; severidad por defecto)_'}
- Severidad asignada: **{datos['emoji']} {datos['severidad']}**
- Razonamiento: {_razonamiento(datos)}

## Extracto del cambio (primeras 500 palabras)

> {datos.get('extracto', '_(sin extracto disponible)_')}

## Impacto estimado en el SPEC MVP

{impacto_spec}

## Accion sugerida (checklist E10 §5)
- [ ] Leer el documento original completo
- [ ] Catalogar el cambio (¿afecta catalogo / calendario / compliance / CONALITEG / features?)
- [ ] Decidir respuesta (ver §3 E10)
- [ ] Asignar version al catalogo NEM (si aplica)
- [ ] Actualizar `fuentes/01_normativa_nem/` con el nuevo documento
- [ ] Actualizar `_log_descargas.md`
- [ ] Actualizar SPEC MVP con nueva version
- [ ] (Si compliance) Revisar aviso de privacidad

## Responsable sugerido
- Founder + catalogador si afecta NEM.
- Asesor legal si afecta LFPDPPP.
- Programador si solo afecta calendario/CONALITEG.

---
_Generado automaticamente por `monitor_normativo.py` (E11 §5.2)._
"""

    ruta.write_text(contenido, encoding="utf-8")
    return ruta


def _razonamiento(datos: Dict) -> str:
    sev = datos["severidad"]
    kws = datos.get("keywords", [])
    if sev == "ACTUAR":
        return "Reforma normativa mayor detectada (keywords de impacto alto)."
    if sev == "REVISAR":
        return "Cambio relacionado a operacion pedagogica o calendario."
    if sev == "INFO" and kws:
        return "Documento informativo sin impacto normativo directo."
    return "Sin keywords criticas; degradado a informativo por defecto."


def _generar_impacto_spec(fuente_id: str, keywords: List) -> str:
    """Tabla de impacto estimada en secciones del SPEC MVP."""
    impactos_por_fuente = {
        "F1": [
            ("§5 Catalogo NEM", "Posible actualizacion si cambiaron campos/ejes/PDA"),
            ("§3.5 Contrato Curricular", "Posible actualizacion si cambio estructura de planeacion"),
            ("§9 Riesgos compliance", "Revision si toca LFPDPPP"),
        ],
        "F2": [
            ("§5 Catalogo NEM", "ALTO — el Acuerdo 14/08/22 es el fundamento del Plan"),
            ("§3.5 Contrato Curricular", "ALTO — afecta estructura de planeacion"),
        ],
        "F3": [
            ("§5 Catalogo NEM", "ALTO — modificacion directa al Plan"),
            ("§3.5 Contrato Curricular", "ALTO — afecta estructura de planeacion"),
        ],
        "F4": [
            ("§6 Calendario / Operaciones", "Calendario escolar actualizado"),
            ("§3.5 Contrato Curricular", "Revisar si cambia sesiones del CTE"),
        ],
        "F5": [
            ("§9 Riesgos compliance", "CRITICO — reforma a LFPDPPP"),
            ("Aviso de Privacidad", "REQUIERE actualizacion"),
        ],
        "F6": [
            ("§5 Catalogo NEM", "Posible cambio en libros de texto vigentes"),
            ("PMC", "Revisar si hay nuevos materiales oficiales"),
        ],
    }
    filas = impactos_por_fuente.get(fuente_id, [
        ("General", "Revisar manualmente"),
    ])
    lineas = ["| Seccion | Impacto |", "|---|---|"]
    for sec, imp in filas:
        lineas.append(f"| {sec} | {imp} |")
    return "\n".join(lineas)


def escribir_resumen_semanal(resumen: Dict, base_dir: Path) -> Path:
    """Escribe el resumen semanal agregado.

    resumen esperado (claves):
      - fecha: str YYYY-MM-DD
      - fuentes_consultadas_ok: int
      - fuentes_consultadas_total: int
      - alertas: List[Dict] con claves titulo, severidad, emoji, ruta, fuente_id
      - estado_por_fuente: Dict[fuente_id, Dict] con hash, ultima_modificacion_detectada
    """
    base_dir = Path(base_dir)
    carpeta = base_dir
    carpeta.mkdir(parents=True, exist_ok=True)

    nombre = f"cambios_resumen_semanal_{resumen['fecha']}.md"
    ruta = carpeta / nombre

    alertas = resumen.get("alertas", [])
    actuar = [a for a in alertas if a["severidad"] == "ACTUAR"]
    revisar = [a for a in alertas if a["severidad"] == "REVISAR"]
    info = [a for a in alertas if a["severidad"] == "INFO"]

    lineas = [
        f"# Resumen semanal — {resumen['fecha']}",
        "",
        f"**Fuentes consultadas:** {resumen['fuentes_consultadas_ok']}/{resumen['fuentes_consultadas_total']}",
        f"**Cambios detectados:** {len(alertas)}",
        f"**Actuar:** {len(actuar)}  •  **Revisar:** {len(revisar)}  •  **Info:** {len(info)}",
        "",
        f"## 🔴 ACTUAR ({len(actuar)})",
    ]
    if actuar:
        for a in actuar:
            lineas.append(f"- `{Path(a['ruta']).name}` — {a['titulo']}")
    else:
        lineas.append("- _(ninguno)_")

    lineas += ["", f"## 🟡 REVISAR ({len(revisar)})"]
    if revisar:
        for a in revisar:
            lineas.append(f"- `{Path(a['ruta']).name}` — {a['titulo']}")
    else:
        lineas.append("- _(ninguno)_")

    lineas += ["", f"## 🟢 INFO ({len(info)})"]
    if info:
        for a in info:
            lineas.append(f"- `{Path(a['ruta']).name}` — {a['titulo']}")
    else:
        lineas.append("- _(ninguno)_")

    lineas += [
        "",
        "## Estado por fuente",
        "| Fuente | Ultima modificacion detectada | Hash actual |",
        "|---|---|---|",
    ]
    for fid, info_f in sorted(resumen.get("estado_por_fuente", {}).items()):
        ult = info_f.get("ultima_modificacion", "—")
        h = info_f.get("hash", "—")
        lineas.append(f"| {fid} {info_f.get('nombre', '')} | {ult} | `{h[:32]}...` |")

    lineas += [
        "",
        "## Proximas vigilancias criticas",
        "- **Agosto 2027:** nuevo ciclo escolar 2027-2028 -> revisar calendario y catalogo CONALITEG.",
        "- **Marzo 2026:** vencen 90 dias desde DOF 20-mar-2025 para reglamentos LFPDPPP.",
        "",
        "---",
        "_Generado automaticamente por `monitor_normativo.py`._",
    ]

    ruta.write_text("\n".join(lineas), encoding="utf-8")
    return ruta


def escribir_log_run(lineas: List[str], base_dir: Path) -> Path:
    """Escribe el log de corrida. Una corrida = un archivo."""
    base_dir = Path(base_dir)
    carpeta = base_dir / "runs"
    carpeta.mkdir(parents=True, exist_ok=True)

    ts = datetime.utcnow().strftime("%Y-%m-%d-%H%M")
    ruta = carpeta / f"{ts}_run.log"
    ruta.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    return ruta


def rotar_logs_si_necesario(base_dir: Path, semanas_retencion: int = 8) -> int:
    """Borra logs con mas de N semanas. Devuelve cantidad borrada."""
    carpeta = base_dir / "runs"
    if not carpeta.exists():
        return 0
    cutoff = datetime.utcnow().timestamp() - (semanas_retencion * 7 * 24 * 3600)
    borrados = 0
    for f in carpeta.glob("*_run.log"):
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
                borrados += 1
        except OSError:
            pass
    return borrados


if __name__ == "__main__":
    # Sanity check
    base = Path("/tmp/kilo/_monitor_test")
    base.mkdir(parents=True, exist_ok=True)
    r = escribir_alerta({
        "fecha": "2026-08-13",
        "timestamp": "2026-08-13 09:14 UTC",
        "fuente_id": "F2",
        "fuente_nombre": "Acuerdo 14/08/22",
        "url": "https://sidof.segob.gob.mx/notas/docFuente/5661845",
        "severidad": "ACTUAR",
        "emoji": "🔴",
        "titulo": "Reforma al Plan de Estudio",
        "hash_anterior": "sha256:abc",
        "hash_nuevo": "sha256:def",
        "keywords": ["Plan de Estudio", "modifica el diverso"],
        "extracto": "El presente Acuerdo modifica...",
    }, base)
    print(f"alerta escrita: {r}")

    rs = escribir_resumen_semanal({
        "fecha": "2026-08-13",
        "fuentes_consultadas_ok": 6,
        "fuentes_consultadas_total": 6,
        "alertas": [],
        "estado_por_fuente": {},
    }, base)
    print(f"resumen escrito: {rs}")

    rl = escribir_log_run(["hola", "mundo"], base)
    print(f"log escrito: {rl}")
