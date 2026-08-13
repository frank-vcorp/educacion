"""
modelador.py — Convierte JSON curado a migraciones SQL para Supabase.

Genera un archivo SQL idempotente que:
  - Crea las 8 tablas del esquema E14 §5.1
  - Crea índices donde aplican (FKs + columnas consultadas)
  - Inserta los datos del JSON curado en el orden correcto (respetando FKs)
  - Usa SERIAL PK (Supabase/Postgres estándar)
  - Es seguro de re-ejecutar (DROP IF EXISTS antes de CREATE)

Restricción dura:
  - No descargar NUNCA contenido editorial de CONALITEG.
  - Solo metadatos + URLs (regla E14 §3 y §11).
"""

import json
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional

from schema import CatalogoFase2


# === Plantillas SQL ===

SQL_HEADER = """-- ============================================================
-- Migración: catálogo Fase 2 NEM (Supabase/Postgres)
-- Generado por: catalogar_fase2.py v0.1
-- Fecha: {fecha}
-- Versión catálogo: {catalogo_codigo}
-- PDF fuente SHA256: {pdf_sha256}
-- ============================================================
--
-- CONVENCIONES:
--   * SERIAL PKs (Supabase estándar)
--   * DROP TABLE IF EXISTS ... CASCADE al inicio (idempotencia)
--   * Inserts en orden topológico (catalogo_version → dependencias)
--   * CONALITEG = solo URL + metadatos, NUNCA contenido editorial
--
-- ============================================================

BEGIN;

"""

SQL_DROP = """
DROP TABLE IF EXISTS auditoria_carga CASCADE;
DROP TABLE IF EXISTS pda_ejes CASCADE;
DROP TABLE IF EXISTS pda_por_campo_fase CASCADE;
DROP TABLE IF EXISTS referencia_libro_conaliteg CASCADE;
DROP TABLE IF EXISTS contenido CASCADE;
DROP TABLE IF EXISTS pda CASCADE;
DROP TABLE IF EXISTS eje_articulador CASCADE;
DROP TABLE IF EXISTS campo_formativo CASCADE;
DROP TABLE IF EXISTS fase CASCADE;
DROP TABLE IF EXISTS catalogo_version CASCADE;
"""

SQL_TABLES = """
-- ============================================================
-- Tablas núcleo (E14 §5.1)
-- ============================================================

CREATE TABLE catalogo_version (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  nombre          TEXT NOT NULL,
  fecha_vigencia  DATE NOT NULL,
  fuente_dof      TEXT NOT NULL,
  fuente_sha256   TEXT NOT NULL CHECK (length(fuente_sha256) = 64),
  fecha_carga     TIMESTAMP WITH TZ DEFAULT now(),
  cargado_por     TEXT,
  metadata        JSONB
);
CREATE INDEX idx_catalogo_version_codigo ON catalogo_version(codigo);

CREATE TABLE campo_formativo (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  orden           INT,
  catalogo_version_id INT REFERENCES catalogo_version(id) ON DELETE CASCADE
);
CREATE INDEX idx_campo_formativo_codigo ON campo_formativo(codigo);

CREATE TABLE eje_articulador (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  orden           INT,
  catalogo_version_id INT REFERENCES catalogo_version(id) ON DELETE CASCADE
);
CREATE INDEX idx_eje_articulador_codigo ON eje_articulador(codigo);

CREATE TABLE fase (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  numero          INT NOT NULL,
  nombre          TEXT NOT NULL,
  rango_edad      TEXT,
  catalogo_version_id INT REFERENCES catalogo_version(id) ON DELETE CASCADE
);
CREATE INDEX idx_fase_codigo ON fase(codigo);

CREATE TABLE pda (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  texto           TEXT,
  catalogo_version_id INT REFERENCES catalogo_version(id) ON DELETE CASCADE,
  fuente_dof_pagina INT,
  fuente_dof_sha  TEXT CHECK (length(fuente_dof_sha) = 64),
  activo          BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_pda_codigo ON pda(codigo);
CREATE INDEX idx_pda_activo ON pda(activo) WHERE activo = TRUE;

CREATE TABLE contenido (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  texto           TEXT,
  fase_id         INT REFERENCES fase(id) ON DELETE CASCADE,
  campo_id        INT REFERENCES campo_formativo(id) ON DELETE CASCADE,
  catalogo_version_id INT REFERENCES catalogo_version(id) ON DELETE CASCADE
);
CREATE INDEX idx_contenido_codigo ON contenido(codigo);
CREATE INDEX idx_contenido_fase_campo ON contenido(fase_id, campo_id);

-- Relaciones N:M

CREATE TABLE pda_por_campo_fase (
  pda_id          INT REFERENCES pda(id) ON DELETE CASCADE,
  fase_id         INT REFERENCES fase(id) ON DELETE CASCADE,
  campo_id        INT REFERENCES campo_formativo(id) ON DELETE CASCADE,
  PRIMARY KEY (pda_id, fase_id, campo_id)
);
CREATE INDEX idx_pda_por_campo_fase_campo ON pda_por_campo_fase(campo_id);

CREATE TABLE pda_ejes (
  pda_id          INT REFERENCES pda(id) ON DELETE CASCADE,
  eje_id          INT REFERENCES eje_articulador(id) ON DELETE CASCADE,
  PRIMARY KEY (pda_id, eje_id)
);
CREATE INDEX idx_pda_ejes_eje ON pda_ejes(eje_id);

CREATE TABLE referencia_libro_conaliteg (
  id              SERIAL PRIMARY KEY,
  grado           TEXT NOT NULL,
  campo           TEXT NOT NULL,
  titulo_libro    TEXT,
  url_publica     TEXT,
  isbn            TEXT,
  edicion         TEXT,
  fecha_acceso    DATE,
  notas           TEXT,
  fase_id         INT REFERENCES fase(id) ON DELETE CASCADE,
  campo_id        INT REFERENCES campo_formativo(id) ON DELETE CASCADE
);
CREATE INDEX idx_ref_conaliteg_grado_campo ON referencia_libro_conaliteg(grado, campo);
CREATE INDEX idx_ref_conaliteg_url ON referencia_libro_conaliteg(url_publica);

CREATE TABLE auditoria_carga (
  id              SERIAL PRIMARY KEY,
  fecha           TIMESTAMP WITH TZ DEFAULT now(),
  catalogo_version_id INT REFERENCES catalogo_version(id),
  pda_id          INT REFERENCES pda(id),
  accion          TEXT NOT NULL CHECK (accion IN ('revisado', 'corregido', 'agregado', 'marcado_inactivo')),
  observacion     TEXT,
  autor           TEXT
);
CREATE INDEX idx_auditoria_fecha ON auditoria_carga(fecha DESC);

"""

SQL_FOOTER = """
COMMIT;

-- ============================================================
-- Verificación rápida post-carga:
--   SELECT 'catalogo_version' AS tabla, COUNT(*) FROM catalogo_version
--   UNION ALL SELECT 'campo_formativo', COUNT(*) FROM campo_formativo
--   UNION ALL SELECT 'eje_articulador', COUNT(*) FROM eje_articulador
--   UNION ALL SELECT 'fase', COUNT(*) FROM fase
--   UNION ALL SELECT 'pda', COUNT(*) FROM pda
--   UNION ALL SELECT 'contenido', COUNT(*) FROM contenido
--   UNION ALL SELECT 'pda_por_campo_fase', COUNT(*) FROM pda_por_campo_fase
--   UNION ALL SELECT 'pda_ejes', COUNT(*) FROM pda_ejes
--   UNION ALL SELECT 'referencia_libro_conaliteg', COUNT(*) FROM referencia_libro_conaliteg
--   UNION ALL SELECT 'auditoria_carga', COUNT(*) FROM auditoria_carga;
-- ============================================================
"""


# === Helpers de escape ===

def sql_escape(value) -> str:
    """Escapa un valor Python a literal SQL seguro."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (date, datetime)):
        if isinstance(value, datetime):
            return f"'{value.isoformat()}'"
        return f"'{value.isoformat()}'"
    # string — escape comillas simples y backslash
    s = str(value).replace("\\", "\\\\").replace("'", "''")
    return f"'{s}'"


def sql_list(values: List) -> str:
    return ", ".join(sql_escape(v) for v in values)


# === Generador principal ===

class GeneradorSQL:
    """Convierte un CatalogoFase2 (validado) en un script SQL completo."""

    def __init__(self, catalogo: CatalogoFase2):
        self.catalogo = catalogo

    def generar(self) -> str:
        parts = [
            SQL_HEADER.format(
                fecha=datetime.now().isoformat(timespec="seconds"),
                catalogo_codigo=self.catalogo.catalogo_version.codigo,
                pdf_sha256=self.catalogo.catalogo_version.fuente_sha256,
            ),
            SQL_DROP,
            SQL_TABLES,
            "\n-- ============================================================\n",
            "-- Datos\n",
            "-- ============================================================\n\n",
        ]
        parts.extend([
            self._insert_catalogo_version(),
            self._insert_campos(),
            self._insert_ejes(),
            self._insert_fases(),
            self._insert_pdas(),
            self._insert_contenidos(),
            self._insert_pda_por_campo_fase(),
            self._insert_pda_ejes(),
            self._insert_referencias_conaliteg(),
            self._insert_auditoria(),
            SQL_FOOTER,
        ])
        return "".join(parts)

    # --- Inserts ---

    def _insert_catalogo_version(self) -> str:
        cv = self.catalogo.catalogo_version
        meta_json = json.dumps(cv.metadata or {}, ensure_ascii=False)
        return (
            "-- catalogo_version (1 fila)\n"
            "INSERT INTO catalogo_version (codigo, nombre, fecha_vigencia, fuente_dof, fuente_sha256, cargado_por, metadata)\n"
            f"VALUES ({sql_escape(cv.codigo)}, {sql_escape(cv.nombre)}, {sql_escape(cv.fecha_vigencia)}, "
            f"{sql_escape(cv.fuente_dof)}, {sql_escape(cv.fuente_sha256)}, {sql_escape(cv.cargado_por)}, "
            f"{sql_escape(meta_json)});\n\n"
        )

    def _insert_campos(self) -> str:
        if not self.catalogo.campos_formativos:
            return ""
        rows = []
        for c in self.catalogo.campos_formativos:
            rows.append(
                f"  ({sql_escape(c.codigo)}, {sql_escape(c.nombre)}, "
                f"{sql_escape(c.descripcion)}, {sql_escape(c.orden)}, "
                f"(SELECT id FROM catalogo_version WHERE codigo = {sql_escape(self.catalogo.catalogo_version.codigo)}))"
            )
        return (
            f"-- campo_formativo ({len(rows)} filas)\n"
            "INSERT INTO campo_formativo (codigo, nombre, descripcion, orden, catalogo_version_id) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_ejes(self) -> str:
        if not self.catalogo.ejes_articuladores:
            return ""
        rows = []
        for e in self.catalogo.ejes_articuladores:
            rows.append(
                f"  ({sql_escape(e.codigo)}, {sql_escape(e.nombre)}, "
                f"{sql_escape(e.descripcion)}, {sql_escape(e.orden)}, "
                f"(SELECT id FROM catalogo_version WHERE codigo = {sql_escape(self.catalogo.catalogo_version.codigo)}))"
            )
        return (
            f"-- eje_articulador ({len(rows)} filas)\n"
            "INSERT INTO eje_articulador (codigo, nombre, descripcion, orden, catalogo_version_id) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_fases(self) -> str:
        if not self.catalogo.fases:
            return ""
        rows = []
        for f in self.catalogo.fases:
            rows.append(
                f"  ({sql_escape(f.codigo)}, {sql_escape(f.numero)}, "
                f"{sql_escape(f.nombre)}, {sql_escape(f.rango_edad)}, "
                f"(SELECT id FROM catalogo_version WHERE codigo = {sql_escape(self.catalogo.catalogo_version.codigo)}))"
            )
        return (
            f"-- fase ({len(rows)} filas)\n"
            "INSERT INTO fase (codigo, numero, nombre, rango_edad, catalogo_version_id) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_pdas(self) -> str:
        if not self.catalogo.pdas:
            return ""
        rows = []
        for p in self.catalogo.pdas:
            # Si requiere_revision y texto=None, insertamos con texto NULL pero mantenemos codigo/pagina
            rows.append(
                f"  ({sql_escape(p.codigo)}, {sql_escape(p.texto)}, "
                f"(SELECT id FROM catalogo_version WHERE codigo = {sql_escape(self.catalogo.catalogo_version.codigo)}), "
                f"{sql_escape(p.fuente_dof_pagina)}, {sql_escape(p.fuente_dof_sha)}, {sql_escape(p.activo)})"
            )
        return (
            f"-- pda ({len(rows)} filas — PDA con texto NULL requieren revisión humana)\n"
            "INSERT INTO pda (codigo, texto, catalogo_version_id, fuente_dof_pagina, fuente_dof_sha, activo) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_contenidos(self) -> str:
        if not self.catalogo.contenidos:
            return ""
        rows = []
        for c in self.catalogo.contenidos:
            # Resolver fase_id y campo_id por código (no por id)
            fase_subq = f"(SELECT id FROM fase WHERE codigo = {sql_escape(c.fase_codigo if hasattr(c, 'fase_codigo') else 'FASE_2')})"
            campo_subq = f"(SELECT id FROM campo_formativo WHERE codigo = {sql_escape(c.campo_codigo if hasattr(c, 'campo_codigo') else None)})"
            rows.append(
                f"  ({sql_escape(c.codigo)}, {sql_escape(c.texto)}, "
                f"{fase_subq}, {campo_subq}, "
                f"(SELECT id FROM catalogo_version WHERE codigo = {sql_escape(self.catalogo.catalogo_version.codigo)}))"
            )
        return (
            f"-- contenido ({len(rows)} filas)\n"
            "INSERT INTO contenido (codigo, texto, fase_id, campo_id, catalogo_version_id) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_pda_por_campo_fase(self) -> str:
        if not self.catalogo.pda_por_campo_fase:
            return ""
        rows = []
        for r in self.catalogo.pda_por_campo_fase:
            rows.append(
                f"  ((SELECT id FROM pda WHERE codigo = {sql_escape(r.pda_codigo)}), "
                f"(SELECT id FROM fase WHERE codigo = {sql_escape(r.fase_codigo)}), "
                f"(SELECT id FROM campo_formativo WHERE codigo = {sql_escape(r.campo_codigo)}))"
            )
        return (
            f"-- pda_por_campo_fase ({len(rows)} filas)\n"
            "INSERT INTO pda_por_campo_fase (pda_id, fase_id, campo_id) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_pda_ejes(self) -> str:
        if not self.catalogo.pda_ejes:
            return ""
        rows = []
        for r in self.catalogo.pda_ejes:
            rows.append(
                f"  ((SELECT id FROM pda WHERE codigo = {sql_escape(r.pda_codigo)}), "
                f"(SELECT id FROM eje_articulador WHERE codigo = {sql_escape(r.eje_codigo)}))"
            )
        return (
            f"-- pda_ejes ({len(rows)} filas)\n"
            "INSERT INTO pda_ejes (pda_id, eje_id) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_referencias_conaliteg(self) -> str:
        if not self.catalogo.referencias_conaliteg:
            return ""
        rows = []
        for r in self.catalogo.referencias_conaliteg:
            rows.append(
                f"  ({sql_escape(r.grado)}, {sql_escape(r.campo)}, "
                f"{sql_escape(r.titulo_libro)}, {sql_escape(r.url_publica)}, "
                f"{sql_escape(r.isbn)}, {sql_escape(r.edicion)}, {sql_escape(r.fecha_acceso)}, "
                f"{sql_escape(r.notas)}, "
                f"(SELECT id FROM fase WHERE codigo = 'FASE_2'), "
                f"(SELECT id FROM campo_formativo WHERE nombre = {sql_escape(r.campo)}))"
            )
        return (
            f"-- referencia_libro_conaliteg ({len(rows)} filas — placeholders para founder)\n"
            "INSERT INTO referencia_libro_conaliteg (grado, campo, titulo_libro, url_publica, isbn, edicion, fecha_acceso, notas, fase_id, campo_id) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )

    def _insert_auditoria(self) -> str:
        if not self.catalogo.auditoria_carga:
            return ""
        rows = []
        for a in self.catalogo.auditoria_carga:
            pda_subq = f"(SELECT id FROM pda WHERE codigo = {sql_escape(a.pda_codigo)})" if a.pda_codigo else "NULL"
            rows.append(
                f"  (now(), "
                f"(SELECT id FROM catalogo_version WHERE codigo = {sql_escape(self.catalogo.catalogo_version.codigo)}), "
                f"{pda_subq}, "
                f"{sql_escape(a.accion)}, {sql_escape(a.observacion)}, {sql_escape(a.autor)})"
            )
        return (
            f"-- auditoria_carga ({len(rows)} filas)\n"
            "INSERT INTO auditoria_carga (fecha, catalogo_version_id, pda_id, accion, observacion, autor) VALUES\n"
            + ",\n".join(rows) + ";\n\n"
        )


def guardar_migracion(catalogo: CatalogoFase2, output_dir: Path, fecha: Optional[str] = None) -> Path:
    """Genera y guarda la migración SQL."""
    fecha = fecha or date.today().isoformat()
    out_dir = Path(output_dir) / "migrations"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{fecha}_catalogo_fase2.sql"
    gen = GeneradorSQL(catalogo)
    out_file.write_text(gen.generar())
    return out_file
