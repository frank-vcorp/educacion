#!/usr/bin/env python3
"""
build_viewer.py — Genera un HTML standalone con el JSON del catálogo embebido.

Uso:
  python3 build_viewer.py --json catalogo_fase2_crudo.json --output viewer_con_datos.html

El resultado es un solo archivo HTML que Frank puede:
  - Descargar (doble clic)
  - Abrir localmente
  - Compartir por email
  - Sin necesidad de servidor
"""
import argparse
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Embeber JSON en viewer HTML")
    parser.add_argument("--json", required=True, help="Path al JSON del catálogo")
    parser.add_argument("--output", required=True, help="Path al HTML de salida")
    parser.add_argument("--template", default="viewer.html", help="Path al template HTML")
    args = parser.parse_args()

    json_path = Path(args.json)
    html_path = Path(args.output)
    template_path = Path(args.template)

    if not json_path.exists():
        print(f"❌ JSON no encontrado: {json_path}", file=sys.stderr)
        return 1

    if not template_path.exists():
        print(f"❌ Template HTML no encontrado: {template_path}", file=sys.stderr)
        return 1

    print(f"📂 Cargando JSON: {json_path}")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"✅ JSON cargado: {len(data.get('pdas', data.get('pda', [])))} PDA, {len(data.get('campos_formativos', []))} campos")

    print(f"📄 Cargando template: {template_path}")
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()

    json_str = json.dumps(data, ensure_ascii=False, indent=2)

    # Embed el JSON como variable JS justo antes del </script>
    # El viewer actual carga el JSON via FileReader, no via variable.
    # Necesitamos modificar el viewer para que soporte ambos modos.
    inject = f"""
<script>
window.__CATALOG_DATA__ = {json_str};
</script>
</body>
</html>
"""
    html = template.replace("</body>\n</html>", inject)

    # Modificar el viewer: si existe el script, cambiar el dropZone listener para auto-load
    auto_load_script = """
<script>
window.addEventListener('DOMContentLoaded', () => {
  if (window.__CATALOG_DATA__) {
    data = window.__CATALOG_DATA__;

    content.style.display = 'block';
    dropZone.style.display = 'none';
    render();

    const banner = document.createElement('div');
    banner.style.cssText = 'background:#1F8A4C;color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;';
    banner.innerHTML = '✅ <strong>Catálogo embebido:</strong> ' + (data.pdas?.length || data.pda?.length || 0) + ' PDA, ' + (data.campos_formativos?.length || 0) + ' campos, ' + (data.referencias_conaliteg?.length || 0) + ' refs CONALITEG. ' +
      '<a href="../../fuentes/01_normativa_nem/anexo_acuerdo_14_08_22_programas_sinteticos.pdf" target="_blank" style="color:#fff;text-decoration:underline;margin-left:8px;font-weight:700;">📂 Abrir PDF fuente</a>' +
      '<a href="javascript:location.reload()" style="color:#fff;text-decoration:underline;margin-left:8px;">Recargar</a>';
    document.querySelector('.container').insertBefore(banner, document.querySelector('.stats'));
  }
});
</script>
"""
    html = html.replace("</body>\n</html>", auto_load_script + "</body>\n</html>")

    print(f"💾 Escribiendo: {html_path}")
    html_path.write_text(html, encoding="utf-8")

    size_kb = html_path.stat().st_size / 1024
    print(f"✅ Generado: {html_path} ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
