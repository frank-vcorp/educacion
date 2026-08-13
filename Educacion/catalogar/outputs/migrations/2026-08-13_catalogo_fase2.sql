-- ============================================================
-- Migración: catálogo Fase 2 NEM (Supabase/Postgres)
-- Generado por: catalogar_fase2.py v0.1
-- Fecha: 2026-08-13T06:36:09
-- Versión catálogo: PLAN_2022_ED_2025_FASE_2
-- PDF fuente SHA256: 26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0
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


-- ============================================================
-- Datos
-- ============================================================

-- catalogo_version (1 fila)
INSERT INTO catalogo_version (codigo, nombre, fecha_vigencia, fuente_dof, fuente_sha256, cargado_por, metadata)
VALUES ('PLAN_2022_ED_2025_FASE_2', 'Plan de Estudio 2022 — Fase 2 (Preescolar)', '2025-08-01', 'Acuerdo 14/08/22 + Anexo 06/08/23', '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', 'atlas + founder', '{}');

-- campo_formativo (4 filas)
INSERT INTO campo_formativo (codigo, nombre, descripcion, orden, catalogo_version_id) VALUES
  ('LENGUAJES', 'Lenguajes', 'El campo formativo Lenguajes tiene como propósito que las niñas y los niños se apropien de las prácticas sociales del lenguaje para participar en la vida social, expresar ideas, emociones y construir significados. Involucra la lengua oral, la lengua escrita, las lenguas indígenas, las artes y los lenguajes visuales, sonoros y corporales.', 1, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('SABERES_PENSAMIENTO_CIENTIFICO', 'Saberes y Pensamiento Científico', 'Promueve que las niñas y los niños construyan explicaciones del mundo natural y social mediante la observación, la experimentación y el razonamiento. Involucra matemáticas, ciencias naturales y experimentales, y pensamiento crítico.', 2, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('ETICA_NATURALEZA_SOCIEDADES', 'Ética, Naturaleza y Sociedades', 'Aborda la relación entre las personas, la naturaleza y la sociedad desde una perspectiva ética. Promueve la reflexión sobre el entorno, el cuidado del ambiente, la convivencia y la responsabilidad social.', 3, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('LO_HUMANO_LO_COMUNITARIO', 'De lo Humano y lo Comunitario', 'Reconoce la identidad personal y colectiva como construcción social, y promueve el bienestar integral, la salud, la convivencia, la educación emocional y la formación para la vida en comunidad.', 4, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'));

-- eje_articulador (7 filas)
INSERT INTO eje_articulador (codigo, nombre, descripcion, orden, catalogo_version_id) VALUES
  ('INCLUSION', 'Inclusión', 'Parte del reconocimiento de que cada persona tiene capacidades, ritmos y estilos de aprendizaje distintos, y de que el sistema educativo debe generar las condiciones para que todos participen y aprendan.', 1, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('PENSAMIENTO_CRITICO', 'Pensamiento crítico', 'Implica el ejercicio de un análisis reflexivo y argumentado sobre los hechos, las ideas y los problemas, para tomar decisiones informadas y responsables.', 2, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('INTERCULTURALIDAD_CRITICA', 'Interculturalidad crítica', 'Reconoce la diversidad cultural del país y promueve el diálogo entre saberes, cosmovisiones y prácticas sociales para construir relaciones equitativas.', 3, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('IGUALDAD_GENERO', 'Igualdad de género', 'Promueve condiciones equitativas entre mujeres y hombres, e impulsa el reconocimiento de los derechos humanos y la no discriminación.', 4, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('VIDA_SALUDABLE', 'Vida saludable', 'Favorece el desarrollo integral mediante el cuidado del cuerpo, la alimentación, la actividad física y el bienestar emocional.', 5, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('APROPIACION_CULTURAS_LECTURA', 'Apropiación de las culturas a través de la lectura y la escritura', 'Reconoce la lectura y la escritura como prácticas sociales y culturales que permiten a las personas participar en la vida pública y en el ejercicio de la ciudadanía.', 6, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('ARTES_EXPERIENCIAS_ESTETICAS', 'Artes y experiencias estéticas', 'Promueve el acercamiento a las manifestaciones artísticas y la valoración de las experiencias estéticas como parte del desarrollo humano.', 7, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'));

-- fase (6 filas)
INSERT INTO fase (codigo, numero, nombre, rango_edad, catalogo_version_id) VALUES
  ('FASE_1', 1, 'Inicial', '0-3 años', (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('FASE_2', 2, 'Preescolar', '3-6 años', (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('FASE_3', 3, 'Primaria (1°-3°)', '6-9 años', (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('FASE_4', 4, 'Primaria (4°-6°)', '9-12 años', (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('FASE_5', 5, 'Secundaria (1°-3°)', '12-15 años', (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('FASE_6', 6, 'Medio Superior', '15-18 años', (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'));

-- pda (24 filas — PDA con texto NULL requieren revisión humana)
INSERT INTO pda (codigo, texto, catalogo_version_id, fuente_dof_pagina, fuente_dof_sha, activo) VALUES
  ('PDA-F2-LNG-001', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-LNG-002', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-LNG-003', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-LNG-004', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-LNG-005', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-LNG-006', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-SPC-001', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-SPC-002', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-SPC-003', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-SPC-004', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-SPC-005', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-SPC-006', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-ENS-001', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-ENS-002', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-ENS-003', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-ENS-004', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-ENS-005', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-ENS-006', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-HUM-001', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-HUM-002', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-HUM-003', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-HUM-004', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-HUM-005', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE),
  ('PDA-F2-HUM-006', NULL, (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, '26cb8947c08961ee4e1736dd99f8f317c4f549237bb157820db0447565b24fe0', TRUE);

-- contenido (4 filas)
INSERT INTO contenido (codigo, texto, fase_id, campo_id, catalogo_version_id) VALUES
  ('CONT-F2-LNG-001', NULL, (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = NULL), (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('CONT-F2-SPC-002', NULL, (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = NULL), (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('CONT-F2-ENS-003', NULL, (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = NULL), (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2')),
  ('CONT-F2-HUM-004', NULL, (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = NULL), (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'));

-- pda_por_campo_fase (24 filas)
INSERT INTO pda_por_campo_fase (pda_id, fase_id, campo_id) VALUES
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-LNG-001'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LENGUAJES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-LNG-002'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LENGUAJES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-LNG-003'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LENGUAJES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-LNG-004'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LENGUAJES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-LNG-005'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LENGUAJES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-LNG-006'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LENGUAJES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-SPC-001'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'SABERES_PENSAMIENTO_CIENTIFICO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-SPC-002'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'SABERES_PENSAMIENTO_CIENTIFICO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-SPC-003'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'SABERES_PENSAMIENTO_CIENTIFICO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-SPC-004'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'SABERES_PENSAMIENTO_CIENTIFICO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-SPC-005'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'SABERES_PENSAMIENTO_CIENTIFICO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-SPC-006'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'SABERES_PENSAMIENTO_CIENTIFICO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-ENS-001'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'ETICA_NATURALEZA_SOCIEDADES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-ENS-002'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'ETICA_NATURALEZA_SOCIEDADES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-ENS-003'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'ETICA_NATURALEZA_SOCIEDADES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-ENS-004'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'ETICA_NATURALEZA_SOCIEDADES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-ENS-005'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'ETICA_NATURALEZA_SOCIEDADES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-ENS-006'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'ETICA_NATURALEZA_SOCIEDADES')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-HUM-001'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LO_HUMANO_LO_COMUNITARIO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-HUM-002'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LO_HUMANO_LO_COMUNITARIO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-HUM-003'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LO_HUMANO_LO_COMUNITARIO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-HUM-004'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LO_HUMANO_LO_COMUNITARIO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-HUM-005'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LO_HUMANO_LO_COMUNITARIO')),
  ((SELECT id FROM pda WHERE codigo = 'PDA-F2-HUM-006'), (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE codigo = 'LO_HUMANO_LO_COMUNITARIO'));

-- referencia_libro_conaliteg (12 filas — placeholders para founder)
INSERT INTO referencia_libro_conaliteg (grado, campo, titulo_libro, url_publica, isbn, edicion, fecha_acceso, notas, fase_id, campo_id) VALUES
  ('1° preescolar', 'Lenguajes', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Lenguajes')),
  ('1° preescolar', 'Saberes y Pensamiento Científico', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Saberes y Pensamiento Científico')),
  ('1° preescolar', 'Ética, Naturaleza y Sociedades', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Ética, Naturaleza y Sociedades')),
  ('1° preescolar', 'De lo Humano y lo Comunitario', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'De lo Humano y lo Comunitario')),
  ('2° preescolar', 'Lenguajes', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Lenguajes')),
  ('2° preescolar', 'Saberes y Pensamiento Científico', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Saberes y Pensamiento Científico')),
  ('2° preescolar', 'Ética, Naturaleza y Sociedades', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Ética, Naturaleza y Sociedades')),
  ('2° preescolar', 'De lo Humano y lo Comunitario', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'De lo Humano y lo Comunitario')),
  ('3° preescolar', 'Lenguajes', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Lenguajes')),
  ('3° preescolar', 'Saberes y Pensamiento Científico', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Saberes y Pensamiento Científico')),
  ('3° preescolar', 'Ética, Naturaleza y Sociedades', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'Ética, Naturaleza y Sociedades')),
  ('3° preescolar', 'De lo Humano y lo Comunitario', NULL, NULL, NULL, '2024', NULL, 'requiere_revision_humana: pendiente verificación CONALITEG', (SELECT id FROM fase WHERE codigo = 'FASE_2'), (SELECT id FROM campo_formativo WHERE nombre = 'De lo Humano y lo Comunitario'));

-- auditoria_carga (1 filas)
INSERT INTO auditoria_carga (fecha, catalogo_version_id, pda_id, accion, observacion, autor) VALUES
  (now(), (SELECT id FROM catalogo_version WHERE codigo = 'PLAN_2022_ED_2025_FASE_2'), NULL, 'agregado', 'PDA placeholder generado por extracción automática con OCR limitado o PDF escaneado', 'atlas-script');


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
