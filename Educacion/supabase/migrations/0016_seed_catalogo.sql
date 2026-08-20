-- 0016_seed_catalogo.sql
-- SPEC_TEC_02 §10 — Seed completo del catálogo NEM Fase 2
-- 90 registros: 1+4+7+6+4+24+24+0+19+1

-- ============ Tabla auditoria_carga (SPEC_TEC_02 §5.1.10) ============
-- Faltaba crear la tabla en migraciones previas; el insert de §10.10 la requiere.
create table if not exists auditoria_carga (
    id              uuid primary key default gen_random_uuid(),
    accion          text not null check (accion in ('agregado','modificado','eliminado','revision_humana')),
    observacion     text,
    autor           text not null,
    catalogo_version text not null references catalogo_version(codigo),
    created_at      timestamptz not null default now()
);

alter table auditoria_carga disable row level security;

-- ============ 10.1 catalogo_version ============
insert into catalogo_version (codigo, nombre, fecha_vigencia, fuente_dof, fuente_sha256, fecha_carga, cargado_por, metadata) values
  ('PLAN_2022_ED_2025_FASE_2', 'Plan de Estudio 2022 — Fase 2 (Preescolar)', '2025-08-01',
   'Acuerdo 14/08/22 + Anexo 06/08/23',
   'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702',
   '2026-08-16T04:34:22+00:00', 'SOFIA + IMPL-20260816-02',
   '{"metodo_extraccion":"nativo_pdfplumber_tablas","pdf_fuente":"programa_sintetico_fase2_v2024.pdf","pdf_naturaleza":"texto_nativo_indesign","intervencion_id":"IMPL-20260816-02","total_paginas_pdf":80,"cobertura_textual_pct":86.2}'::jsonb)
on conflict (codigo) do nothing;

-- ============ 10.2 campos_formativos (4) ============
insert into campo_formativo (codigo, nombre, orden, descripcion, catalogo_version) values
  ('LENGUAJES', 'Lenguajes', 1,
   'El campo formativo Lenguajes tiene como propósito que las niñas y los niños se apropien de las prácticas sociales del lenguaje para participar en la vida social, expresar ideas, emociones y construir significados. Involucra la lengua oral, la lengua escrita, las lenguas indígenas, las artes y los lenguajes visuales, sonoros y corporales.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('SABERES_PENSAMIENTO_CIENTIFICO', 'Saberes y Pensamiento Científico', 2,
   'Promueve que las niñas y los niños construyan explicaciones del mundo natural y social mediante la observación, la experimentación y el razonamiento. Involucra matemáticas, ciencias naturales y experimentales, y pensamiento crítico.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('ETICA_NATURALEZA_SOCIEDADES', 'Ética, Naturaleza y Sociedades', 3,
   'Aborda la relación entre las personas, la naturaleza y la sociedad desde una perspectiva ética. Promueve la reflexión sobre el entorno, el cuidado del ambiente, la convivencia y la responsabilidad social.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('LO_HUMANO_LO_COMUNITARIO', 'De lo Humano y lo Comunitario', 4,
   'Reconoce la identidad personal y colectiva como construcción social, y promueve el bienestar integral, la salud, la convivencia, la educación emocional y la formación para la vida en comunidad.',
   'PLAN_2022_ED_2025_FASE_2')
on conflict (codigo) do nothing;

-- ============ 10.3 ejes_articuladores (7) ============
insert into eje_articulador (codigo, nombre, orden, descripcion, catalogo_version) values
  ('INCLUSION', 'Inclusión', 1,
   'Parte del reconocimiento de que cada persona tiene capacidades, ritmos y estilos de aprendizaje distintos, y de que el sistema educativo debe generar las condiciones para que todos participen y aprendan.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('PENSAMIENTO_CRITICO', 'Pensamiento crítico', 2,
   'Implica el ejercicio de un análisis reflexivo y argumentado sobre los hechos, las ideas y los problemas, para tomar decisiones informadas y responsables.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('INTERCULTURALIDAD_CRITICA', 'Interculturalidad crítica', 3,
   'Reconoce la diversidad cultural del país y promueve el diálogo entre saberes, cosmovisiones y prácticas sociales para construir relaciones equitativas.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('IGUALDAD_GENERO', 'Igualdad de género', 4,
   'Promueve condiciones equitativas entre mujeres y hombres, e impulsa el reconocimiento de los derechos humanos y la no discriminación.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('VIDA_SALUDABLE', 'Vida saludable', 5,
   'Favorece el desarrollo integral mediante el cuidado del cuerpo, la alimentación, la actividad física y el bienestar emocional.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('APROPIACION_CULTURAS_LECTURA', 'Apropiación de las culturas a través de la lectura y la escritura', 6,
   'Reconoce la lectura y la escritura como prácticas sociales y culturales que permiten a las personas participar en la vida pública y en el ejercicio de la ciudadanía.',
   'PLAN_2022_ED_2025_FASE_2'),
  ('ARTES_EXPERIENCIAS_ESTETICAS', 'Artes y experiencias estéticas', 7,
   'Promueve el acercamiento a las manifestaciones artísticas y la valoración de las experiencias estéticas como parte del desarrollo humano.',
   'PLAN_2022_ED_2025_FASE_2')
on conflict (codigo) do nothing;

-- ============ 10.4 fases (6) ============
insert into fase (codigo, numero, nombre, rango_edad, catalogo_version) values
  ('FASE_1', 1, 'Inicial', '0-3 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_2', 2, 'Preescolar', '3-6 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_3', 3, 'Primaria (1°-3°)', '6-9 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_4', 4, 'Primaria (4°-6°)', '9-12 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_5', 5, 'Secundaria (1°-3°)', '12-15 años', 'PLAN_2022_ED_2025_FASE_2'),
  ('FASE_6', 6, 'Medio Superior', '15-18 años', 'PLAN_2022_ED_2025_FASE_2')
on conflict (codigo) do nothing;

-- ============ 10.5 contenidos (4) ============
insert into contenido (codigo, texto, campo_codigo, fase_codigo, fuente_dof_pagina, catalogo_version, requiere_revision_humana) values
  ('CONT-F2-LNG-001',
   'Comunicación oral de necesidades, emociones, gustos, ideas y saberes, a través de los diversos lenguajes, desde una perspectiva comunitaria.',
   'LENGUAJES', 'FASE_2', 20, 'PLAN_2022_ED_2025_FASE_2', false),
  ('CONT-F2-SPC-001',
   'Exploración de la diversidad natural que existe en la comunidad y en otros lugares.',
   'SABERES_PENSAMIENTO_CIENTIFICO', 'FASE_2', 32, 'PLAN_2022_ED_2025_FASE_2', false),
  ('CONT-F2-ENS-001',
   'Interacción, cuidado, conservación y regeneración de la naturaleza, que favorece la construcción de una conciencia socioambiental.',
   'ETICA_NATURALEZA_SOCIEDADES', 'FASE_2', 46, 'PLAN_2022_ED_2025_FASE_2', false),
  ('CONT-F2-HUM-001',
   'Construcción de la identidad personal a partir de su pertenencia a un territorio, su origen étnico, cultural y lingüístico, y la interacción con personas cercanas.',
   'LO_HUMANO_LO_COMUNITARIO', 'FASE_2', 56, 'PLAN_2022_ED_2025_FASE_2', false)
on conflict (codigo) do nothing;

-- ============ 10.6 pdas (24) ============
insert into pda (codigo, texto, fuente_dof_pagina, fuente_dof_sha, grado, contenido_codigo, catalogo_version, activo, requiere_revision_humana) values
  -- Lenguajes (6)
  ('PDA-F2-LNG-001', 'Emplea palabras, gestos, señas, imágenes, sonidos o movimientos corporales que aprende en su comunidad, para expresar necesidades, ideas, emociones y gustos que reflejan su forma de interpretar y actuar en el mundo.', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-LNG-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-LNG-002', 'Reconoce que cuando juega y socializa con sus pares, se expresan desde sus posibilidades, vivencias y cultura.', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-LNG-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-LNG-003', 'Manifiesta oralmente y de manera clara necesidades, emociones, gustos, preferencias e ideas, que construye en la convivencia diaria, y se da a entender apoyándose de distintos lenguajes.', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-LNG-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-LNG-004', 'Escucha con atención a sus pares y espera su turno para hablar.', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-LNG-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-LNG-005', 'De manera oral, expresa ideas completas sobre necesidades, vivencias, emociones, gustos, preferencias y saberes a distintas personas, combinando los lenguajes.', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-LNG-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-LNG-006', 'Comprende, al interactuar con las demás personas, que existen diversas formas de comunicarse.', 20, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-LNG-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  -- Saberes y Pensamiento Científico (6)
  ('PDA-F2-SPC-001', 'Usa sus sentidos para percibir en su entorno cercano, plantas que le llaman la atención y describe características tales como: olor, color, forma, textura o tamaño, si tienen hojas, flores o frutos.', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-SPC-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-SPC-002', 'Socializa lo que sabe sobre su entorno natural y hace nuevos descubrimientos con sus pares.', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-SPC-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-SPC-003', 'Observa y describe en su lengua materna, animales de su entorno: cómo son, cómo crecen, dónde viven, qué comen, los cuidados que necesitan y otros aspectos que le causan curiosidad.', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-SPC-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-SPC-004', 'Amplía su conocimiento acerca de las plantas: su proceso de crecimiento, lo que necesitan para vivir, los lugares donde crecen, entre otros.', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-SPC-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-SPC-005', 'Distingue algunas características del entorno natural: plantas, animales, cuerpos de agua, clima, entre otras.', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-SPC-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-SPC-006', 'Se apoya en recursos impresos y digitales como fotografías, imágenes o videos para profundizar en sus conocimientos acerca de la diversidad de la naturaleza en su comunidad y otras regiones.', 32, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-SPC-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  -- Ética, Naturaleza y Sociedades (6)
  ('PDA-F2-ENS-001', 'Convive con su entorno natural, con plantas y animales; expresa lo que percibe y disfruta acerca de ellos.', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-ENS-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-ENS-002', 'Manifiesta actitudes de cuidado y empatía hacia los seres vivos y evita modificar sus condiciones naturales de vida al interactuar con ellos.', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-ENS-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-ENS-003', 'Se relaciona con la naturaleza y considera la importancia de sus elementos para la vida (aire, sol, agua y suelo).', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-ENS-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-ENS-004', 'Aprecia la diversidad de características de los seres vivos y no vivos que hay en la naturaleza y sugiere formas de cuidarlos y preservarlos.', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-ENS-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-ENS-005', 'Interactúa con respeto y empatía en la naturaleza, e identifica algunos elementos y cuidados que necesitan los seres vivos.', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-ENS-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-ENS-006', 'Manifiesta interés por cuidar a la naturaleza y encuentra formas creativas de resolver problemas socioambientales de su comunidad, como la contaminación, la deforestación, el cambio climático, el deshielo o la sobreexplotación de los recursos naturales.', 46, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-ENS-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  -- De lo Humano y lo Comunitario (6)
  ('PDA-F2-HUM-001', 'Descubre gustos, preferencias, posibilidades motrices y afectivas, en juegos y actividades que contribuyan al conocimiento de sí, en un ambiente que considere la diversidad.', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-HUM-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-HUM-002', 'Describe cómo es físicamente, identifica sus rasgos familiares y se acepta como es.', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '1°', 'CONT-F2-HUM-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-HUM-003', 'Reconoce algunos rasgos de su identidad, dice cómo es físicamente, qué se le facilita, qué se le dificulta, qué le gusta, qué no le gusta, y los expresa en su lengua materna o con otros lenguajes.', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-HUM-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-HUM-004', 'Distingue semejanzas y diferencias con las demás personas, a partir de distintos rasgos de identidad como su nombre, características físicas, formas de vestir, hablar, alimentarse, entre otros.', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '2°', 'CONT-F2-HUM-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-HUM-005', 'Identifica que la lengua que habla, las costumbres familiares y el lugar donde vive contribuyen a la formación de su identidad y pertenencia a una comunidad en la que participa y colabora.', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-HUM-001', 'PLAN_2022_ED_2025_FASE_2', true, false),
  ('PDA-F2-HUM-006', 'Aprecia las características y cualidades propias, así como las de sus pares y de otras personas.', 56, 'f981c30ea9619f5841f4729a6f697951e035eff78c1e1042d02d0d5d663c8702', '3°', 'CONT-F2-HUM-001', 'PLAN_2022_ED_2025_FASE_2', true, false)
on conflict (codigo) do nothing;

-- ============ 10.7 pda_por_campo_fase (24) ============
insert into pda_por_campo_fase (pda_codigo, fase_codigo, campo_codigo) values
  ('PDA-F2-LNG-001','FASE_2','LENGUAJES'),
  ('PDA-F2-LNG-002','FASE_2','LENGUAJES'),
  ('PDA-F2-LNG-003','FASE_2','LENGUAJES'),
  ('PDA-F2-LNG-004','FASE_2','LENGUAJES'),
  ('PDA-F2-LNG-005','FASE_2','LENGUAJES'),
  ('PDA-F2-LNG-006','FASE_2','LENGUAJES'),
  ('PDA-F2-SPC-001','FASE_2','SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-002','FASE_2','SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-003','FASE_2','SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-004','FASE_2','SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-005','FASE_2','SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-SPC-006','FASE_2','SABERES_PENSAMIENTO_CIENTIFICO'),
  ('PDA-F2-ENS-001','FASE_2','ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-002','FASE_2','ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-003','FASE_2','ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-004','FASE_2','ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-005','FASE_2','ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-ENS-006','FASE_2','ETICA_NATURALEZA_SOCIEDADES'),
  ('PDA-F2-HUM-001','FASE_2','LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-002','FASE_2','LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-003','FASE_2','LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-004','FASE_2','LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-005','FASE_2','LO_HUMANO_LO_COMUNITARIO'),
  ('PDA-F2-HUM-006','FASE_2','LO_HUMANO_LO_COMUNITARIO')
on conflict (pda_codigo, fase_codigo, campo_codigo) do nothing;

-- ============ 10.8 pda_ejes (vacío) ============
-- DP-08: no se insertan PDA-eje en Fase 2; tabla existente para cargas futuras.

-- ============ 10.9 referencias_conaliteg (19) ============
insert into referencia_libro_conaliteg (id, grado, campo, titulo_libro, url_publica, isbn, edicion, fecha_acceso, notas, no_verificada, requiere_revision_humana, tipo, formato, catalogo_version) values
  (1,  '1° preescolar', 'Lenguajes',                       'Múltiples lenguajes - 1° grado',                                'https://libros.conaliteg.gob.mx/2025/K1MLA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (2,  '2° preescolar', 'Lenguajes',                       'Múltiples lenguajes - 2° grado',                                'https://libros.conaliteg.gob.mx/2025/K2MLA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (3,  '3° preescolar', 'Lenguajes',                       'Múltiples lenguajes - 3° grado',                                'https://libros.conaliteg.gob.mx/2025/K3MLA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (4,  '1° preescolar', 'Ética, Naturaleza y Sociedades',  'Láminas de diálogo con manifestaciones culturales y artísticas - 1° grado', 'https://libros.conaliteg.gob.mx/2025/K1LDG.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (5,  '2° preescolar', 'Ética, Naturaleza y Sociedades',  'Láminas de diálogo con manifestaciones culturales y artísticas - 2° grado', 'https://libros.conaliteg.gob.mx/2025/K2LDG.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (6,  '3° preescolar', 'Ética, Naturaleza y Sociedades',  'Láminas de diálogo con manifestaciones culturales y artísticas - 3° grado', 'https://libros.conaliteg.gob.mx/2025/K3LDG.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (7,  '1° preescolar', 'Saberes y Pensamiento Científico','Jugar e imaginar con mi material manipulable de Preescolar - 1° grado', 'https://libros.conaliteg.gob.mx/2025/K1LMA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (8,  '2° preescolar', 'Saberes y Pensamiento Científico','Jugar e imaginar con mi material manipulable de Preescolar - 2° grado', 'https://libros.conaliteg.gob.mx/2025/K2LMA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (9,  '3° preescolar', 'Saberes y Pensamiento Científico','Jugar e imaginar con mi material manipulable de Preescolar - 3° grado', 'https://libros.conaliteg.gob.mx/2025/K3LMA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (10, '1° preescolar', 'De lo Humano y lo Comunitario',   'Mi Álbum - 1° grado',                                           'https://libros.conaliteg.gob.mx/2023/K1MAA.htm', null, '2023-2024', '2026-08-18', 'referencia_historica_validada', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (11, '2° preescolar', 'De lo Humano y lo Comunitario',   'Mi Álbum - 2° grado',                                           'https://libros.conaliteg.gob.mx/2023/K2MAA.htm', null, '2023-2024', '2026-08-18', 'referencia_historica_validada', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (12, '3° preescolar', 'De lo Humano y lo Comunitario',   'Mi Álbum - 3° grado',                                           'https://libros.conaliteg.gob.mx/2023/K3MAA.htm', null, '2023-2024', '2026-08-18', 'referencia_historica_validada', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (13, '1° preescolar', 'Lenguajes',                       'Explorar e imaginar con mi libro de Preescolar - 1° grado',     'https://libros.conaliteg.gob.mx/2025/K1LPA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (14, '2° preescolar', 'Lenguajes',                       'Explorar e imaginar con mi libro de Preescolar - 2° grado',     'https://libros.conaliteg.gob.mx/2025/K2LPA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (15, '3° preescolar', 'Lenguajes',                       'Explorar e imaginar con mi libro de Preescolar - 3° grado',     'https://libros.conaliteg.gob.mx/2025/K3LPA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (16, 'Fase 2 completa', 'Transversal', 'Crianza para la libertad. Libro para las familias. Fase 2',                      'https://libros.conaliteg.gob.mx/2025/K0CFA.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (17, 'Fase 2 completa', 'Transversal', 'Un libro sin recetas para la maestra y el maestro. Fase 2',                      'https://libros.conaliteg.gob.mx/2025/K0LPM.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (18, 'Fase 2 completa', 'Transversal', 'Modalidades de trabajo para la acción transformadora y el codiseño',             'https://libros.conaliteg.gob.mx/2025/K0MTM.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (19, 'Fase 2 completa', 'Transversal', 'Posibilidades de trabajo para la acción transformadora y el codiseño. Ficheros. Fase 2', 'https://libros.conaliteg.gob.mx/2025/K0TAM.htm', null, '2025-2026', '2026-08-18', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2')
on conflict (id) do nothing;

-- ============ 10.10 auditoria_carga (1) ============
insert into auditoria_carga (accion, observacion, autor, catalogo_version) values
  ('agregado', 'PDA extraídos del PDF nativo v2024 (InDesign, 80 páginas). Total: 24 PDA, 4 contenidos, 69/80 páginas con texto nativo (86.2%).', 'SOFIA extractor_v2024', 'PLAN_2022_ED_2025_FASE_2');
