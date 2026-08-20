-- ============================================================
-- Migración: catálogo Fase 2 NEM (Supabase/Postgres)
-- Generado por: catalogar_fase2.py v0.2 (Path A)
-- Fecha: 2026-08-17T14:30:49
-- Versión catálogo: PLAN_2022_ED_2025_FASE_2
-- PDF fuente SHA256: f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702
-- ============================================================
--
-- CONVENCIONES (Path A — alineado con SPEC_TEC_02 §5):
--   * 8 tablas catálogo: codigo TEXT PRIMARY KEY + FKs por codigo (text references).
--   * 2 tablas misceláneas (referencia_libro_conaliteg, auditoria_carga):
--     mantienen id (int/serial) por diseño en §5.1.9 y §5.1.10.
--   * DROP TABLE IF EXISTS ... CASCADE al inicio (idempotencia).
--   * Inserts en orden topológico (catalogo_version → dependencias).
--   * CONALITEG = solo URL + metadatos, NUNCA contenido editorial.
--
-- DELTA PENDIENTE (no incluido en este seed de Path A):
--   SPEC_TEC_02 §5 agrega columnas no presentes en el JSON actual:
--     - pda: grado (NOT NULL), contenido_codigo (NOT NULL FK texto)
--     - contenido: requiere_revision_humana, razon_revision
--     - referencia_libro_conaliteg: no_verificada, tipo, formato
--     - auditoria_carga: cambio completo (uuid, sin pda_id)
--   Migración alineada: ver SPEC_TEC_02 §11 (issues L3-NEW-01..03).
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
-- Tablas núcleo (E14 §5.1, Path A — PKs text)
-- ============================================================

-- 1. catalogo_version: PK = codigo (text)
CREATE TABLE catalogo_version (
  codigo              TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  fecha_vigencia      DATE NOT NULL,
  fuente_dof          TEXT NOT NULL,
  fuente_sha256       TEXT NOT NULL CHECK (length(fuente_sha256) = 64),
  fecha_carga         TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cargado_por         TEXT,
  metadata            JSONB
);

-- 2. campo_formativo: PK = codigo (text); FK a catalogo_version por codigo
CREATE TABLE campo_formativo (
  codigo              TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  descripcion         TEXT,
  orden               INT,
  catalogo_version_id TEXT REFERENCES catalogo_version(codigo) ON DELETE CASCADE
);
CREATE INDEX idx_campo_formativo_codigo ON campo_formativo(codigo);

-- 3. eje_articulador: PK = codigo (text); FK a catalogo_version por codigo
CREATE TABLE eje_articulador (
  codigo              TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  descripcion         TEXT,
  orden               INT,
  catalogo_version_id TEXT REFERENCES catalogo_version(codigo) ON DELETE CASCADE
);
CREATE INDEX idx_eje_articulador_codigo ON eje_articulador(codigo);

-- 4. fase: PK = codigo (text); FK a catalogo_version por codigo
CREATE TABLE fase (
  codigo              TEXT PRIMARY KEY,
  numero              INT NOT NULL,
  nombre              TEXT NOT NULL,
  rango_edad          TEXT,
  catalogo_version_id TEXT REFERENCES catalogo_version(codigo) ON DELETE CASCADE
);
CREATE INDEX idx_fase_codigo ON fase(codigo);

-- 5. pda: PK = codigo (text); FK a catalogo_version por codigo
CREATE TABLE pda (
  codigo              TEXT PRIMARY KEY,
  texto               TEXT,
  catalogo_version_id TEXT REFERENCES catalogo_version(codigo) ON DELETE CASCADE,
  fuente_dof_pagina   INT,
  fuente_dof_sha      TEXT CHECK (length(fuente_dof_sha) = 64),
  activo              BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_pda_codigo ON pda(codigo);
CREATE INDEX idx_pda_activo ON pda(activo) WHERE activo = TRUE;

-- 6. contenido: PK = codigo (text); FKs por codigo
CREATE TABLE contenido (
  codigo              TEXT PRIMARY KEY,
  texto               TEXT,
  fase_codigo         TEXT REFERENCES fase(codigo) ON DELETE CASCADE,
  campo_codigo        TEXT REFERENCES campo_formativo(codigo) ON DELETE CASCADE,
  catalogo_version_id TEXT REFERENCES catalogo_version(codigo) ON DELETE CASCADE
);
CREATE INDEX idx_contenido_codigo ON contenido(codigo);
CREATE INDEX idx_contenido_fase_campo ON contenido(fase_codigo, campo_codigo);

-- Relaciones N:M — PKs compuestas por codigos (text)

CREATE TABLE pda_por_campo_fase (
  pda_codigo          TEXT REFERENCES pda(codigo) ON DELETE CASCADE,
  fase_codigo         TEXT REFERENCES fase(codigo) ON DELETE CASCADE,
  campo_codigo        TEXT REFERENCES campo_formativo(codigo) ON DELETE CASCADE,
  PRIMARY KEY (pda_codigo, fase_codigo, campo_codigo)
);
CREATE INDEX idx_pda_por_campo_fase_campo ON pda_por_campo_fase(campo_codigo);

CREATE TABLE pda_ejes (
  pda_codigo          TEXT REFERENCES pda(codigo) ON DELETE CASCADE,
  eje_codigo          TEXT REFERENCES eje_articulador(codigo) ON DELETE CASCADE,
  PRIMARY KEY (pda_codigo, eje_codigo)
);
CREATE INDEX idx_pda_ejes_eje ON pda_ejes(eje_codigo);

-- Tablas misceláneas (alineadas con SPEC_TEC_02 §5.1.9 y §5.1.10).
-- referencia_libro_conaliteg: PK propia (id int), FK solo a catalogo_version por codigo.
-- auditoria_carga: PK propia (id serial legacy), FKs por codigo (text).
-- NOTA: §5.1.10 define auditoria_carga con id uuid; aquí se conserva id SERIAL
-- por compatibilidad con el seed actual. Migración a uuid queda en issue L3.

CREATE TABLE referencia_libro_conaliteg (
  id                  SERIAL PRIMARY KEY,
  grado               TEXT NOT NULL,
  campo               TEXT NOT NULL,
  titulo_libro        TEXT,
  url_publica         TEXT,
  isbn                TEXT,
  edicion             TEXT,
  fecha_acceso        DATE,
  notas               TEXT,
  catalogo_version_id TEXT REFERENCES catalogo_version(codigo)
);
CREATE INDEX idx_ref_conaliteg_grado_campo ON referencia_libro_conaliteg(grado, campo);
CREATE INDEX idx_ref_conaliteg_url ON referencia_libro_conaliteg(url_publica);

CREATE TABLE auditoria_carga (
  id                  SERIAL PRIMARY KEY,
  fecha               TIMESTAMP WITH TIME ZONE DEFAULT now(),
  catalogo_version_id TEXT REFERENCES catalogo_version(codigo),
  pda_id              TEXT REFERENCES pda(codigo),
  accion              TEXT NOT NULL CHECK (accion IN ('revisado', 'corregido', 'agregado', 'marcado_inactivo')),
  observacion         TEXT,
  autor               TEXT
);
CREATE INDEX idx_auditoria_fecha ON auditoria_carga(fecha DESC);


-- ============================================================
-- Datos
-- ============================================================

-- catalogo_version (1 fila)
INSERT INTO catalogo_version (codigo, nombre, fecha_vigencia, fuente_dof, fuente_sha256, cargado_por, metadata)
VALUES ('PLAN_2022_ED_2025_FASE_2', 'Plan de Estudio 2022 — Fase 2 (Preescolar)', '2025-08-01', 'Acuerdo 14/08/22 + Anexo 06/08/23', 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', 'SOFIA + IMPL-20260816-02', '{"metodo_extraccion": "nativo_pdfplumber_tablas", "pdf_fuente": "/home/frank/repos/educacion/Educacion/fuentes/01_normativa_nem/programa_sintetico_fase2_v2024.pdf", "pdf_naturaleza": "texto_nativo_indesign", "intervencion_id": "IMPL-20260816-02"}');

-- campo_formativo (4 filas)
INSERT INTO campo_formativo (codigo, nombre, descripcion, orden, catalogo_version_id) VALUES
  ('LENGUAJES', 'Lenguajes', 'El campo formativo Lenguajes tiene como propósito que las niñas y los niños se apropien de las prácticas sociales del lenguaje para participar en la vida social, expresar ideas, emociones y construir significados. Involucra la lengua oral, la lengua escrita, las lenguas indígenas, las artes y los lenguajes visuales, sonoros y corporales.', 1, 'PLAN_2022_ED_2025_FASE_2'),
  ('SABERES_PENSAMIENTO_CIENTIFICO', 'Saberes y Pensamiento Científico', 'Promueve que las niñas y los niños construyan explicaciones del mundo natural y social mediante la observación, la experimentación y el razonamiento. Involucra matemáticas, ciencias naturales y experimentales, y pensamiento crítico.', 2, 'PLAN_2022_ED_2025_FASE_2'),
  ('ETICA_NATURALEZA_SOCIEDADES', 'Ética, Naturaleza y Sociedades', 'Aborda la relación entre las personas, la naturaleza y la sociedad desde una perspectiva ética. Promueve la reflexión sobre el entorno, el cuidado del ambiente, la convivencia y la responsabilidad social.', 3, 'PLAN_2022_ED_2025_FASE_2'),
  ('LO_HUMANO_LO_COMUNITARIO', 'De lo Humano y lo Comunitario', 'Reconoce la identidad personal y colectiva como construcción social, y promueve el bienestar integral, la salud, la convivencia, la educación emocional y la formación para la vida en comunidad.', 4, 'PLAN_2022_ED_2025_FASE_2');

-- eje_articulador (7 filas)
INSERT INTO eje_articulador (codigo, nombre, descripcion, orden, catalogo_version_id) VALUES
  ('INCLUSION', 'Inclusión', 'Parte del reconocimiento de que cada persona tiene capacidades, ritmos y estilos de aprendizaje distintos, y de que el sistema educativo debe generar las condiciones para que todos participen y aprendan.', 1, 'PLAN_2022_ED_2025_FASE_2'),
  ('PENSAMIENTO_CRITICO', 'Pensamiento crítico', 'Implica el ejercicio de un análisis reflexivo y argumentado sobre los hechos, las ideas y los problemas, para tomar decisiones informadas y responsables.', 2, 'PLAN_2022_ED_2025_FASE_2'),
  ('INTERCULTURALIDAD_CRITICA', 'Interculturalidad crítica', 'Reconoce la diversidad cultural del país y promueve el diálogo entre saberes, cosmovisiones y prácticas sociales para construir relaciones equitativas.', 3, 'PLAN_2022_ED_2025_FASE_2'),
  ('IGUALDAD_GENERO', 'Igualdad de género', 'Promueve condiciones equitativas entre mujeres y hombres, e impulsa el reconocimiento de los derechos humanos y la no discriminación.', 4, 'PLAN_2022_ED_2025_FASE_2'),
  ('VIDA_SALUDABLE', 'Vida saludable', 'Favorece el desarrollo integral mediante el cuidado del cuerpo, la alimentación, la actividad física y el bienestar emocional.', 5, 'PLAN_2022_ED_2025_FASE_2'),
  ('APROPIACION_CULTURAS_LECTURA', 'Apropiación de las culturas a través de la lectura y la escritura', 'Reconoce la lectura y la escritura como prácticas sociales y culturales que permiten a las personas participar en la vida pública y en el ejercicio de la ciudadanía.', 6, 'PLAN_2022_ED_2025_FASE_2'),
  ('ARTES_EXPERIENCIAS_ESTETICAS', 'Artes y experiencias estéticas', 'Promueve el acercamiento a las manifestaciones artísticas y la valoración de las experiencias estéticas como parte del desarrollo humano.', 7, 'PLAN_2022_ED_2025_FASE_2');

-- fase (6 filas)
INSERT INTO fase (codigo, numero, nombre, rango_edad, catalogo_version_id) VALUES
  ('FASE_1', 1, 'Inicial', '0-3 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_2', 2, 'Preescolar', '3-6 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_3', 3, 'Primaria (1°-3°)', '6-9 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_4', 4, 'Primaria (4°-6°)', '9-12 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_5', 5, 'Secundaria (1°-3°)', '12-15 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_6', 6, 'Medio Superior', '15-18 años', 'PLAN_2022_ED_2025_FASE_2');

-- pda (24 filas — PDA con texto NULL requieren revisión humana)
INSERT INTO pda (codigo, texto, catalogo_version_id, fuente_dof_pagina, fuente_dof_sha, activo) VALUES
  ('PDA-F2-LNG-001', 'Emplea palabras, gestos, señas, imágenes, sonidos o movimientos corporales que aprende en su comunidad, para expresar necesidades, ideas, emociones y gustos que reflejan su forma de interpretar y actuar en el mundo.', 'PLAN_2022_ED_2025_FASE_2', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-LNG-002', 'Reconoce que cuando juega y socializa con sus pares, se expresan desde sus posibilidades, vivencias y cultura.', 'PLAN_2022_ED_2025_FASE_2', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-LNG-003', 'Manifiesta oralmente y de manera clara necesidades, emociones, gustos, preferencias e ideas, que construye en la convivencia diaria, y se da a entender apoyándose de distintos lenguajes.', 'PLAN_2022_ED_2025_FASE_2', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-LNG-004', 'Escucha con atención a sus pares y espera su turno para hablar.', 'PLAN_2022_ED_2025_FASE_2', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-LNG-005', 'De manera oral, expresa ideas completas sobre necesidades, vivencias, emociones, gustos, preferencias y saberes a distintas personas, combinando los lenguajes.', 'PLAN_2022_ED_2025_FASE_2', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-LNG-006', 'Comprende, al interactuar con las demás personas, que existen diversas formas de comunicarse.', 'PLAN_2022_ED_2025_FASE_2', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-SPC-001', 'Usa sus sentidos para percibir en su entorno cercano, plantas que le llaman la atención y describe características tales como: olor, color, forma, textura o tamaño, si tienen hojas, flores o frutos.', 'PLAN_2022_ED_2025_FASE_2', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-SPC-002', 'Socializa lo que sabe sobre su entorno natural y hace nuevos descubrimientos con sus pares.', 'PLAN_2022_ED_2025_FASE_2', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-SPC-003', 'Observa y describe en su lengua materna, animales de su entorno: cómo son, cómo crecen, dónde viven, qué comen, los cuidados que necesitan y otros aspectos que le causan curiosidad.', 'PLAN_2022_ED_2025_FASE_2', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-SPC-004', 'Amplía su conocimiento acerca de las plantas: su proceso de crecimiento, lo que necesitan para vivir, los lugares donde crecen, entre otros.', 'PLAN_2022_ED_2025_FASE_2', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-SPC-005', 'Distingue algunas características del entorno natural: plantas, animales, cuerpos de agua, clima, entre otras.', 'PLAN_2022_ED_2025_FASE_2', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-SPC-006', 'Se apoya en recursos impresos y digitales como fotografías, imágenes o videos para profundizar en sus conocimientos acerca de la diversidad de la naturaleza en su comunidad y otras regiones.', 'PLAN_2022_ED_2025_FASE_2', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-ENS-001', 'Convive con su entorno natural, con plantas y animales; expresa lo que percibe y disfruta acerca de ellos.', 'PLAN_2022_ED_2025_FASE_2', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-ENS-002', 'Manifiesta actitudes de cuidado y empatía hacia los seres vivos y evita modificar sus condiciones naturales de vida al interactuar con ellos.', 'PLAN_2022_ED_2025_FASE_2', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-ENS-003', 'Se relaciona con la naturaleza y considera la importancia de sus elementos para la vida (aire, sol, agua y suelo).', 'PLAN_2022_ED_2025_FASE_2', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-ENS-004', 'Aprecia la diversidad de características de los seres vivos y no vivos que hay en la naturaleza y sugiere formas de cuidarlos y preservarlos.', 'PLAN_2022_ED_2025_FASE_2', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-ENS-005', 'Interactúa con respeto y empatía en la naturaleza, e identifica algunos elementos y cuidados que necesitan los seres vivos.', 'PLAN_2022_ED_2025_FASE_2', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-ENS-006', 'Manifiesta interés por cuidar a la naturaleza y encuentra formas creativas de resolver problemas socioambientales de su comunidad, como la contaminación, la deforestación, el cambio climático, el deshielo o la sobreexplotación de los recursos naturales.', 'PLAN_2022_ED_2025_FASE_2', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-HUM-001', 'Descubre gustos, preferencias, posibilidades motrices y afectivas, en juegos y actividades que contribuyan al conocimiento de sí, en un ambiente que considere la diversidad.', 'PLAN_2022_ED_2025_FASE_2', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-HUM-002', 'Describe cómo es físicamente, identifica sus rasgos familiares y se acepta como es.', 'PLAN_2022_ED_2025_FASE_2', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-HUM-003', 'Reconoce algunos rasgos de su identidad, dice cómo es físicamente, qué se le facilita, qué se le dificulta, qué le gusta, qué no le gusta, y los expresa en su lengua materna o con otros lenguajes.', 'PLAN_2022_ED_2025_FASE_2', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-HUM-004', 'Distingue semejanzas y diferencias con las demás personas, a partir de distintos rasgos de identidad como su nombre, características físicas, formas de vestir, hablar, alimentarse, entre otros.', 'PLAN_2022_ED_2025_FASE_2', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-HUM-005', 'Identifica que la lengua que habla, las costumbres familiares y el lugar donde vive contribuyen a la formación de su identidad y pertenencia a una comunidad en la que participa y colabora.', 'PLAN_2022_ED_2025_FASE_2', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE),
  ('PDA-F2-HUM-006', 'Aprecia las características y cualidades propias, así como las de sus pares y de otras personas.', 'PLAN_2022_ED_2025_FASE_2', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', TRUE);

-- contenido (4 filas)
INSERT INTO contenido (codigo, texto, fase_codigo, campo_codigo, catalogo_version_id) VALUES
  ('CONT-F2-LNG-001', 'Comunicación oral de necesidades, emociones, gustos, ideas y saberes, a través de los diversos lenguajes, desde una perspectiva comunitaria.', 'FASE_2', 'LENGUAJES', 'PLAN_2022_ED_2025_FASE_2'),
  ('CONT-F2-SPC-001', 'Exploración de la diversidad natural que existe en la comunidad y en otros lugares.', 'FASE_2', 'SABERES_PENSAMIENTO_CIENTIFICO', 'PLAN_2022_ED_2025_FASE_2'),
  ('CONT-F2-ENS-001', 'Interacción, cuidado, conservación y regeneración de la naturaleza, que favorece la construcción de una conciencia socioambiental.', 'FASE_2', 'ETICA_NATURALEZA_SOCIEDADES', 'PLAN_2022_ED_2025_FASE_2'),
  ('CONT-F2-HUM-001', 'Construcción de la identidad personal a partir de su pertenencia a un territorio, su origen étnico, cultural y lingüístico, y la interacción con personas cercanas.', 'FASE_2', 'LO_HUMANO_LO_COMUNITARIO', 'PLAN_2022_ED_2025_FASE_2');

-- pda_por_campo_fase (24 filas)
INSERT INTO pda_por_campo_fase (pda_codigo, fase_codigo, campo_codigo) VALUES
  ('PDA-F2-LNG-001', 'FASE_2', 'LENGUAJES'),
  ('PDA-F2-LNG-002', 'FASE_2', 'LENGUAJES'),
  ('PDA-F2-LNG-003', 'FASE_2', 'LENGUAJES'),
  ('PDA-F2-LNG-004', 'FASE_2', 'LENGUAJES'),
  ('PDA-F2-LNG-005', 'FASE_2', 'LENGUAJES'),
  ('PDA-F2-LNG-006', 'FASE_2', 'LENGUAJES'),
  ('PDA-F2-SPC-001', 'FASE_2', 'SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-002', 'FASE_2', 'SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-003', 'FASE_2', 'SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-004', 'FASE_2', 'SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-005', 'FASE_2', 'SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-006', 'FASE_2', 'SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-ENS-001', 'FASE_2', 'ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-002', 'FASE_2', 'ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-003', 'FASE_2', 'ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-004', 'FASE_2', 'ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-005', 'FASE_2', 'ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-006', 'FASE_2', 'ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-HUM-001', 'FASE_2', 'LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-002', 'FASE_2', 'LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-003', 'FASE_2', 'LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-004', 'FASE_2', 'LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-005', 'FASE_2', 'LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-006', 'FASE_2', 'LO_HUMANO_LO_COMUNITARIO');

-- pda_ejes (114 filas)
INSERT INTO pda_ejes (pda_codigo, eje_codigo) VALUES
  ('PDA-F2-LNG-001', 'APROPIACION_CULTURAS_LECTURA'),
  ('PDA-F2-LNG-001', 'ARTES_EXPERIENCIAS_ESTETICAS'),
  ('PDA-F2-LNG-001', 'IGUALDAD_GENERO'),
  ('PDA-F2-LNG-001', 'INCLUSION'),
  ('PDA-F2-LNG-001', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-LNG-001', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-LNG-002', 'APROPIACION_CULTURAS_LECTURA'),
  ('PDA-F2-LNG-002', 'ARTES_EXPERIENCIAS_ESTETICAS'),
  ('PDA-F2-LNG-002', 'IGUALDAD_GENERO'),
  ('PDA-F2-LNG-002', 'INCLUSION'),
  ('PDA-F2-LNG-002', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-LNG-002', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-LNG-003', 'APROPIACION_CULTURAS_LECTURA'),
  ('PDA-F2-LNG-003', 'ARTES_EXPERIENCIAS_ESTETICAS'),
  ('PDA-F2-LNG-003', 'IGUALDAD_GENERO'),
  ('PDA-F2-LNG-003', 'INCLUSION'),
  ('PDA-F2-LNG-003', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-LNG-003', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-LNG-004', 'APROPIACION_CULTURAS_LECTURA'),
  ('PDA-F2-LNG-004', 'ARTES_EXPERIENCIAS_ESTETICAS'),
  ('PDA-F2-LNG-004', 'IGUALDAD_GENERO'),
  ('PDA-F2-LNG-004', 'INCLUSION'),
  ('PDA-F2-LNG-004', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-LNG-004', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-LNG-005', 'APROPIACION_CULTURAS_LECTURA'),
  ('PDA-F2-LNG-005', 'ARTES_EXPERIENCIAS_ESTETICAS'),
  ('PDA-F2-LNG-005', 'IGUALDAD_GENERO'),
  ('PDA-F2-LNG-005', 'INCLUSION'),
  ('PDA-F2-LNG-005', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-LNG-005', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-LNG-006', 'APROPIACION_CULTURAS_LECTURA'),
  ('PDA-F2-LNG-006', 'ARTES_EXPERIENCIAS_ESTETICAS'),
  ('PDA-F2-LNG-006', 'IGUALDAD_GENERO'),
  ('PDA-F2-LNG-006', 'INCLUSION'),
  ('PDA-F2-LNG-006', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-LNG-006', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-SPC-001', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-SPC-001', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-SPC-001', 'VIDA_SALUDABLE'),
  ('PDA-F2-SPC-002', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-SPC-002', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-SPC-002', 'VIDA_SALUDABLE'),
  ('PDA-F2-SPC-003', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-SPC-003', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-SPC-003', 'VIDA_SALUDABLE'),
  ('PDA-F2-SPC-004', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-SPC-004', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-SPC-004', 'VIDA_SALUDABLE'),
  ('PDA-F2-SPC-005', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-SPC-005', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-SPC-005', 'VIDA_SALUDABLE'),
  ('PDA-F2-SPC-006', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-SPC-006', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-SPC-006', 'VIDA_SALUDABLE'),
  ('PDA-F2-ENS-001', 'IGUALDAD_GENERO'),
  ('PDA-F2-ENS-001', 'INCLUSION'),
  ('PDA-F2-ENS-001', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-ENS-001', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-ENS-001', 'VIDA_SALUDABLE'),
  ('PDA-F2-ENS-002', 'IGUALDAD_GENERO'),
  ('PDA-F2-ENS-002', 'INCLUSION'),
  ('PDA-F2-ENS-002', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-ENS-002', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-ENS-002', 'VIDA_SALUDABLE'),
  ('PDA-F2-ENS-003', 'IGUALDAD_GENERO'),
  ('PDA-F2-ENS-003', 'INCLUSION'),
  ('PDA-F2-ENS-003', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-ENS-003', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-ENS-003', 'VIDA_SALUDABLE'),
  ('PDA-F2-ENS-004', 'IGUALDAD_GENERO'),
  ('PDA-F2-ENS-004', 'INCLUSION'),
  ('PDA-F2-ENS-004', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-ENS-004', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-ENS-004', 'VIDA_SALUDABLE'),
  ('PDA-F2-ENS-005', 'IGUALDAD_GENERO'),
  ('PDA-F2-ENS-005', 'INCLUSION'),
  ('PDA-F2-ENS-005', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-ENS-005', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-ENS-005', 'VIDA_SALUDABLE'),
  ('PDA-F2-ENS-006', 'IGUALDAD_GENERO'),
  ('PDA-F2-ENS-006', 'INCLUSION'),
  ('PDA-F2-ENS-006', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-ENS-006', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-ENS-006', 'VIDA_SALUDABLE'),
  ('PDA-F2-HUM-001', 'IGUALDAD_GENERO'),
  ('PDA-F2-HUM-001', 'INCLUSION'),
  ('PDA-F2-HUM-001', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-HUM-001', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-HUM-001', 'VIDA_SALUDABLE'),
  ('PDA-F2-HUM-002', 'IGUALDAD_GENERO'),
  ('PDA-F2-HUM-002', 'INCLUSION'),
  ('PDA-F2-HUM-002', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-HUM-002', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-HUM-002', 'VIDA_SALUDABLE'),
  ('PDA-F2-HUM-003', 'IGUALDAD_GENERO'),
  ('PDA-F2-HUM-003', 'INCLUSION'),
  ('PDA-F2-HUM-003', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-HUM-003', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-HUM-003', 'VIDA_SALUDABLE'),
  ('PDA-F2-HUM-004', 'IGUALDAD_GENERO'),
  ('PDA-F2-HUM-004', 'INCLUSION'),
  ('PDA-F2-HUM-004', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-HUM-004', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-HUM-004', 'VIDA_SALUDABLE'),
  ('PDA-F2-HUM-005', 'IGUALDAD_GENERO'),
  ('PDA-F2-HUM-005', 'INCLUSION'),
  ('PDA-F2-HUM-005', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-HUM-005', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-HUM-005', 'VIDA_SALUDABLE'),
  ('PDA-F2-HUM-006', 'IGUALDAD_GENERO'),
  ('PDA-F2-HUM-006', 'INCLUSION'),
  ('PDA-F2-HUM-006', 'INTERCULTURALIDAD_CRITICA'),
  ('PDA-F2-HUM-006', 'PENSAMIENTO_CRITICO'),
  ('PDA-F2-HUM-006', 'VIDA_SALUDABLE');

-- referencia_libro_conaliteg (19 filas — placeholders para founder)
INSERT INTO referencia_libro_conaliteg (grado, campo, titulo_libro, url_publica, isbn, edicion, fecha_acceso, notas, catalogo_version_id) VALUES
  ('1° preescolar', 'Lenguajes', 'Múltiples Lenguajes - 1° grado', 'https://libros.conaliteg.gob.mx/2024/K1MLL.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('2° preescolar', 'Lenguajes', 'Múltiples Lenguajes - 2° grado', 'https://libros.conaliteg.gob.mx/2024/K2MLL.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('3° preescolar', 'Lenguajes', 'Múltiples Lenguajes - 3° grado', 'https://libros.conaliteg.gob.mx/2024/K3MLL.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('1° preescolar', 'Ética, Naturaleza y Sociedades', 'Láminas de diálogo con manifestaciones culturales y artísticas - 1° grado', 'https://libros.conaliteg.gob.mx/2024/K1LMC.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('2° preescolar', 'Ética, Naturaleza y Sociedades', 'Láminas de diálogo con manifestaciones culturales y artísticas - 2° grado', 'https://libros.conaliteg.gob.mx/2024/K2LMC.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('3° preescolar', 'Ética, Naturaleza y Sociedades', 'Láminas de diálogo con manifestaciones culturales y artísticas - 3° grado', 'https://libros.conaliteg.gob.mx/2024/K3LMC.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('1° preescolar', 'Saberes y Pensamiento Científico', 'Jugar e imaginar con mi material manipulable - 1° grado', 'https://libros.conaliteg.gob.mx/2024/K1JMM.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('2° preescolar', 'Saberes y Pensamiento Científico', 'Jugar e imaginar con mi material manipulable - 2° grado', 'https://libros.conaliteg.gob.mx/2024/K2JMM.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('3° preescolar', 'Saberes y Pensamiento Científico', 'Jugar e imaginar con mi material manipulable - 3° grado', 'https://libros.conaliteg.gob.mx/2024/K3JMM.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('1° preescolar', 'De lo Humano y lo Comunitario', 'Mi Álbum - 1° grado', 'https://libros.conaliteg.gob.mx/2024/K1MAA.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('2° preescolar', 'De lo Humano y lo Comunitario', 'Mi Álbum - 2° grado', 'https://libros.conaliteg.gob.mx/2024/K2MAA.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('3° preescolar', 'De lo Humano y lo Comunitario', 'Mi Álbum - 3° grado', 'https://libros.conaliteg.gob.mx/2024/K3MAA.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('1° preescolar', 'Lenguajes', 'Explorar e imaginar con mi libro de Preescolar - 1° grado', 'https://libros.conaliteg.gob.mx/2024/K1ELI.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('2° preescolar', 'Lenguajes', 'Explorar e imaginar con mi libro de Preescolar - 2° grado', 'https://libros.conaliteg.gob.mx/2024/K2ELI.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('3° preescolar', 'Lenguajes', 'Explorar e imaginar con mi libro de Preescolar - 3° grado', 'https://libros.conaliteg.gob.mx/2024/K3ELI.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('Fase 2 completa', 'Transversal', 'Crianza para la libertad. Libro para las familias. Fase 2', 'https://libros.conaliteg.gob.mx/2024/KCLF.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('Fase 2 completa', 'Transversal', 'Un libro sin recetas para la maestra y el maestro. Fase 2', 'https://libros.conaliteg.gob.mx/2024/KLRS.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('Fase 2 completa', 'Transversal', 'Modalidades de trabajo para la acción transformadora y el codiseño', 'https://libros.conaliteg.gob.mx/2024/KMTR.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2'),
  ('Fase 2 completa', 'Transversal', 'Posibilidades de trabajo para la acción transformadora y el codiseño. Ficheros. Fase 2', 'https://libros.conaliteg.gob.mx/2024/KPTR.htm', NULL, '2024-2025', '2026-08-16', 'validado_portal_oficial', 'PLAN_2022_ED_2025_FASE_2');

-- auditoria_carga (2 filas)
INSERT INTO auditoria_carga (fecha, catalogo_version_id, pda_id, accion, observacion, autor) VALUES
  (now(), 'PLAN_2022_ED_2025_FASE_2', NULL, 'agregado', 'PDA extraídos del PDF nativo v2024 (InDesign, 80 páginas). Total: 24 PDA, 4 contenidos, 69/80 páginas con texto nativo (86.2%).', 'SOFIA extractor_v2024'),
  (now(), 'PLAN_2022_ED_2025_FASE_2', NULL, 'agregado', 'Segundo pass: pobladas 114 asociaciones pda_ejes via heurística regex sobre páginas intro del PDF. PDA con ejes: 24/24.', 'SOFIA extractor_pda_ejes');


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
