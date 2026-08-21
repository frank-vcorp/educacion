-- migrations_master.sql — concatenación de 0001..0016 (172 statements parseados OK con pglast)
-- Ejecutar con psql -f migrations_master.sql o desde Supabase SQL Editor.
-- NOTA: las funciones user_cct() e is_director() se crean ANTES de las policies que las usan.


-- ===== 0001_extensions.sql =====
-- 0001_extensions.sql
-- SPEC_TEC_02 §3 — extensiones requeridas
-- pgcrypto: gen_random_uuid() (Supabase ya lo trae, se instala por si no)
-- pg_trgm: búsqueda trigram para autocomplete CCT (L3-06)

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;


-- ===== 0002_catalogo_version.sql =====
-- 0002_catalogo_version.sql
-- SPEC_TEC_02 §5.1.1 — versionado del catálogo NEM con SHA256
-- PK text: codigo (alineado con Path A SQL)

create table if not exists catalogo_version (
    codigo              text primary key,                 -- 'PLAN_2022_ED_2025_FASE_2'
    nombre              text not null,                    -- 'Plan de Estudio 2022 — Fase 2 (Preescolar)'
    fecha_vigencia      date not null,                    -- '2025-08-01'
    fuente_dof          text not null,                    -- 'Acuerdo 14/08/22 + Anexo 06/08/23'
    fuente_sha256       text not null,                    -- hash del PDF/DOF origen (trazabilidad)
    fecha_carga         timestamptz not null default now(),
    cargado_por         text not null,                    -- 'agente + ID intervención'
    metadata            jsonb not null default '{}'::jsonb,
    activo              boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table catalogo_version is
  'Fuente de verdad del catálogo NEM cargado. Cada carga registra SHA256 del PDF/DOF origen para trazabilidad pedagógica (ADR-009).';


-- ===== 0003_campos_formativos_ejes_fases.sql =====
-- 0003_campos_formativos_ejes_fases.sql
-- SPEC_TEC_02 §5.1.2, §5.1.3, §5.1.4
-- 4 campos formativos, 7 ejes articuladores, 6 fases NEM
-- PKs text (Path A) — FKs text references

-- campo_formativo
create table if not exists campo_formativo (
    codigo              text primary key,                -- 'LENGUAJES', 'SABERES_PENSAMIENTO_CIENTIFICO', ...
    nombre              text not null,
    orden               int not null,
    descripcion         text not null,
    catalogo_version    text not null references catalogo_version(codigo),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table campo_formativo is
  '4 campos formativos NEM: Lenguajes, Saberes y Pensamiento Científico, Ética/Naturaleza/Sociedades, De lo Humano y lo Comunitario.';

-- eje_articulador
create table if not exists eje_articulador (
    codigo              text primary key,                -- 'INCLUSION', 'PENSAMIENTO_CRITICO', ...
    nombre              text not null,
    orden               int not null,
    descripcion         text not null,
    catalogo_version    text not null references catalogo_version(codigo),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table eje_articulador is
  '7 ejes articuladores oficiales del Plan 2022 §8.1. Modelar como entidad de primer nivel, no como string libre (SPEC §5).';

-- fase
create table if not exists fase (
    codigo              text primary key,                -- 'FASE_1' ... 'FASE_6'
    numero              int not null,
    nombre              text not null,
    rango_edad          text not null,
    catalogo_version    text not null references catalogo_version(codigo),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table fase is
  '6 fases NEM. Fase 1 (0-3 años) sin programa sintético oficial: etiquetar como extensión no oficial si se incluye (SPEC §5 advertencia).';


-- ===== 0004_pda_contenido_pda_por_campo_fase.sql =====
-- 0004_pda_contenido_pda_por_campo_fase.sql
-- SPEC_TEC_02 §5.1.5, §5.1.6, §5.1.7
-- contenido (4), pda (24), pda_por_campo_fase (24)

-- contenido
create table if not exists contenido (
    codigo              text primary key,                -- 'CONT-F2-LNG-001'
    texto               text not null,                   -- texto oficial del DOF
    campo_codigo        text not null references campo_formativo(codigo),
    fase_codigo         text not null references fase(codigo),
    fuente_dof_pagina   int,                             -- página del DOF/PDF origen
    catalogo_version    text not null references catalogo_version(codigo),
    requiere_revision_humana boolean not null default false,
    razon_revision      text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table contenido is
  'Contenidos del programa sintético NEM. 1 contenido por campo × fase en Fase 2 (4 contenidos total).';

-- pda
create table if not exists pda (
    codigo              text primary key,                -- 'PDA-F2-LNG-001'
    texto               text not null,                   -- texto oficial del DOF (no editable por docente)
    fuente_dof_pagina   int not null,                    -- página del DOF/PDF origen
    fuente_dof_sha      text not null,                   -- SHA256 del PDF origen (trazabilidad)
    grado               text not null,                   -- '1°', '2°', '3°'
    contenido_codigo    text not null references contenido(codigo),
    catalogo_version    text not null references catalogo_version(codigo),
    activo              boolean not null default true,
    requiere_revision_humana boolean not null default false,
    razon_revision      text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table pda is
  'PDA oficiales del DOF. Regla dura: la maestra NO puede crear PDA personalizados (P-PD2). 24 PDA en Fase 2 (6 por campo).';

-- pda_por_campo_fase
create table if not exists pda_por_campo_fase (
    pda_codigo          text not null references pda(codigo),
    fase_codigo         text not null references fase(codigo),
    campo_codigo        text not null references campo_formativo(codigo),
    primary key (pda_codigo, fase_codigo, campo_codigo),
    created_at          timestamptz not null default now()
);

comment on table pda_por_campo_fase is
  'Relación PDA ↔ campo formativo ↔ fase. Permite que un PDA aplique a múltiples combinaciones campo/fase (ej. para primaria/sec). 24 registros en Fase 2.';

-- Índices catálogo (sección 8)
create index if not exists idx_pda_contenido on pda(contenido_codigo);
create index if not exists idx_pda_grado on pda(grado);
create index if not exists idx_contenido_campo on contenido(campo_codigo);
create index if not exists idx_contenido_fase on contenido(fase_codigo);
create index if not exists idx_pda_por_campo_fase_campo on pda_por_campo_fase(campo_codigo);


-- ===== 0005_pda_ejes.sql =====
-- 0005_pda_ejes.sql
-- SPEC_TEC_02 §5.1.8 — pda_ejes (vacío inicialmente, se poblará después)
-- DM-01: recomendación (a) — dejar vacío, maestra selecciona ejes libremente al crear planeación

create table if not exists pda_ejes (
    pda_codigo          text not null references pda(codigo),
    eje_codigo          text not null references eje_articulador(codigo),
    primary key (pda_codigo, eje_codigo),
    created_at          timestamptz not null default now()
);

comment on table pda_ejes is
  'Asociación PDA ↔ ejes articuladores. NOTA: el catálogo JSON Fase 2 tiene pda_ejes vacío (0 registros). Decisión DP-08 en SPEC_01: dejar tabla vacía pero existente para futuras cargas. La maestra selecciona ejes al crear planeación (no depende de esta tabla).';


-- ===== 0006_referencias_conaliteg.sql =====
-- 0006_referencias_conaliteg.sql
-- SPEC_TEC_02 §5.1.9 — 19 referencias a libros CONALITEG
-- PK serial (alineado con §5.1.9); NO modifica a Path A

create table if not exists referencia_libro_conaliteg (
    id                          int primary key,             -- 1-19
    grado                       text not null,               -- '1° preescolar', 'Fase 2 completa'
    campo                       text not null,               -- 'Lenguajes', 'Transversal'
    titulo_libro                text not null,
    url_publica                 text not null,               -- https://libros.conaliteg.gob.mx/2024/K1MLL.htm
    isbn                        text,                         -- null en catálogo actual
    edicion                     text not null,               -- '2024-2025'
    fecha_acceso                date not null,
    notas                       text,
    no_verificada               boolean not null default false,
    requiere_revision_humana    boolean not null default false,
    tipo                        text not null check (tipo in ('alumnos','transversal')),
    formato                     text not null,               -- 'PDF+HTML'
    catalogo_version            text not null references catalogo_version(codigo),
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

comment on table referencia_libro_conaliteg is
  '19 referencias a libros CONALITEG Fase 2. La plataforma NO aloja contenido (solo referencia con ficha). Atribución: "Libro distribuido por CONALITEG, SEP. © Gobierno de México" (ADR-010).';

create index if not exists idx_referencia_conaliteg_grado on referencia_libro_conaliteg(grado);


-- ===== 0007_cct_escuela.sql =====
-- 0007_cct_escuela.sql
-- SPEC_TEC_02 §5.2 — Catálogo Nacional de CCT SEP + escuela enriquecida
-- Tablas sin RLS (catálogos del mundo, lectura por todos los tenants)

-- cct
create table if not exists cct (
    clave           text primary key,                       -- '22DJN0059R' (10 dígitos)
    nombre          text not null,
    nivel           text not null,                          -- 'preescolar','primaria','secundaria'
    subnivel        text,
    turno           text,                                   -- 'Matutino','Vespertino','Nocturno','Continuo'
    entidad_clave   text,                                   -- cve_ent INEGI (01-32)
    entidad_nombre   text,
    municipio_clave text,                                   -- cve_mun INEGI
    municipio_nombre text,
    localidad_clave text,
    sostenimiento   text,                                   -- 'Público Federalizado','Público Estatal','Privado'
    zona_tipo        text,                                  -- 'urbana','rural','indigena' (derivado por ETL)
    latitud          double precision,
    longitud         double precision,
    director_nombre  text,                                  -- si está en catálogo SEP
    director_celular text,                                 -- opcional, si conocido
    pre_registro    boolean not null default false,         -- true si fue agregado manualmente (CCT no en catálogo)
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table cct is
  'Catálogo Nacional de CCT SEP 2024 (CC-BY-4.0). 414MB CSV. ETL en build (6-10h-hombre). Zona rural/urbana/indígena derivada vía joins INEGI+CONAPO+INPI (E15).';

-- L3-06: Índices trigram para autocomplete en onboarding
create index if not exists idx_cct_nombre_trgm on cct using gin(nombre gin_trgm_ops);
create index if not exists idx_cct_municipio_trgm on cct using gin(municipio_nombre gin_trgm_ops);
create index if not exists idx_cct_clave_prefix on cct(clave text_pattern_ops);

-- escuela (1:1 con cct)
create table if not exists escuela (
    cct             text primary key references cct(clave),
    nombre          text not null,                          -- alias legible de cct.nombre
    direccion       text,
    telefono_secretaria text,
    zona_escolar    text,                                   -- zona supervisión
    sector_educativo text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table escuela is
  'Datos enriquecidos de la escuela. 1 escuela por CCT (relación 1:1 con cct).';


-- ===== 0008_docente_director_grupo_alumno.sql =====
-- 0008_docente_director_grupo_alumno.sql
-- SPEC_TEC_02 §5.3.1, §5.3.2, §5.3.3, §5.3.4
-- Tablas tenant — RLS se aplica en 0014_rls_policies.sql

-- docente
create table if not exists docente (
    id              uuid primary key references auth.users(id) on delete cascade,  -- = auth.uid()
    nombre          text not null,
    email           text not null unique,
    cct             text not null references cct(clave),
    escuela_id      text references escuela(cct),
    nivel           text not null check (nivel in ('preescolar','primaria','secundaria')),
    ciclo_escolar_actual text,                              -- '2025-2026'
    configuracion_m4 jsonb not null default '{}'::jsonb,    -- características ensamblables escuela (SPEC §3.6.M4)
    foto_url        text,
    ultimo_acceso   timestamptz,
    activo          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table docente is
  'Docente. id = auth.users.id (Supabase Auth). Multi-tenant por cct. Configuración M4 en jsonb.';

-- director
create table if not exists director (
    id              uuid primary key references auth.users(id) on delete cascade,  -- = auth.uid()
    nombre          text not null,
    celular         text not null,                         -- validado por OTP WhatsApp
    cct             text not null references cct(clave),
    otp_verificado  boolean not null default false,
    otp_solicitado_at timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table director is
  'Director. Registro voluntario (M5). OTP por WhatsApp al celular que la maestra usó para llegar. Prueba cruzada de identidad.';

-- grupo
create table if not exists grupo (
    id              uuid primary key default gen_random_uuid(),
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    ciclo_escolar   text not null,                         -- '2025-2026'
    grado           text not null,                         -- '1°','2°','3°'
    grupo           text not null,                         -- 'A','B','C'
    nivel           text not null check (nivel in ('preescolar','primaria','secundaria')),
    total_alumnos   int,
    activo          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (docente_id, ciclo_escolar, grado, grupo)
);

comment on table grupo is
  'Grupo del docente. Hasta 3 grupos por docente en MVP (D-FIN-16).';

-- alumno
create table if not exists alumno (
    id              uuid primary key default gen_random_uuid(),
    docente_id      uuid not null references docente(id) on delete cascade,
    grupo_id        uuid not null references grupo(id) on delete cascade,
    cct             text not null references cct(clave),
    nombre          text not null,
    grado           text not null,                         -- heredado del grupo
    ciclo_escolar   text not null,                         -- heredado del grupo
    activo          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table alumno is
  'Alumno. D-FIN-2: SÍ se incluyen nombres individuales en MVP. Solo nombre + grado + ciclo. SIN datos de salud, neurotipo, ni foto del niño. Captura requiere aceptación previa de aviso de privacidad (D-FIN-15).';

-- Índices hot (sección 8)
create index if not exists idx_grupo_docente on grupo(docente_id);
create index if not exists idx_alumno_docente on alumno(docente_id);
create index if not exists idx_alumno_grupo on alumno(grupo_id);
create index if not exists idx_grupo_cct on grupo(cct);
create index if not exists idx_alumno_cct on alumno(cct);


-- ===== 0009_aceptacion_aviso_privacidad.sql =====
-- 0009_aceptacion_aviso_privacidad.sql
-- SPEC_TEC_02 §5.3.5 — consentimiento LFPDPPP
-- Tabla INMUTABLE (solo INSERT, sin updated_at). NO se crea trigger set_updated_at.

create table if not exists aceptacion_aviso_privacidad (
    id              uuid primary key default gen_random_uuid(),
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    fecha_aceptacion timestamptz not null default now(),
    version_aviso   text not null,                         -- 'v1.0-2026-08-16'
    ip              inet,                                  -- opcional
    user_agent      text,                                   -- opcional
    created_at      timestamptz not null default now()
);

comment on table aceptacion_aviso_privacidad is
  'Aceptación del aviso de privacidad LFPDPPP. Obligatoria ANTES de capturar nombres de alumnos (D-FIN-15). Checkbox: "Confirmo que tengo consentimiento institucional para registrar datos de los alumnos a mi cargo".';


-- ===== 0010_planeacion_sesion_bloque.sql =====
-- 0010_planeacion_sesion_bloque.sql
-- SPEC_TEC_02 §5.3.6, §5.3.7, §5.3.8
-- Tablas tenant para Flujo A (planeación didáctica)

-- planeacion
create table if not exists planeacion (
    id                  uuid primary key default gen_random_uuid(),
    docente_id          uuid not null references docente(id) on delete cascade,
    grupo_id            uuid not null references grupo(id) on delete cascade,
    cct                 text not null references cct(clave),
    nombre              text not null,
    modalidad           text not null default 'proyecto_comunitario'
                        check (modalidad in ('proyecto_comunitario','unidad_didactica','abj','rincones','centros_interes','taller_critico')),
    problema_contexto   text not null,                      -- M2: pregunta detonadora (validado no-vacío)
    proposito           text,
    campos_formativos   text[] not null,                    -- códigos: {LENGUAJES, ...}
    ejes_articuladores  text[] not null default '{}',       -- códigos: {INCLUSION, ...}
    pdas                text[] not null,                    -- códigos PDA
    contenido_ref       text references contenido(codigo),
    producto_integrador text,                              -- obligatorio para exportar PDF
    ajustes_razonables  text,                              -- inclusión, ≥1 frase
    banco_palabras      text[] default '{}',                -- D-FIN-7
    periodo_tipo        text not null default 'rango_fechas'
                        check (periodo_tipo in ('rango_fechas','mensual','trimestral','semestral')),
    periodo_inicio      date not null,
    periodo_fin         date not null,
    estado              text not null default 'borrador'
                        check (estado in ('borrador','lista','entregada','archivada')),
    clonada_de          uuid references planeacion(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    check (periodo_fin >= periodo_inicio)
);

comment on table planeacion is
  'Planeación/proyecto del docente (Flujo A). Modalidad adaptativa. MVP: solo Proyecto Comunitario. campos_formativos ≥1, pdas ≥1, producto_integrador obligatorio para exportar.';

-- sesion
create table if not exists sesion (
    id              uuid primary key default gen_random_uuid(),
    planeacion_id   uuid not null references planeacion(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    numero          int not null,                          -- orden dentro de la planeación
    fase_interna    text not null check (fase_interna in ('inicio','desarrollo','cierre')),
    fecha           date,                                  -- asignada al calendarizar (Flujo B)
    duracion_min    int,
    ajustes_sesion  text,                                  -- D-FIN-9: plan B documentado, 200 chars
    estado          text not null default 'pendiente'
                    check (estado in ('pendiente','completa','cancelada')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (planeacion_id, numero)
);

comment on table sesion is
  'Sesión dentro de una planeación. fase_interna: inicio (≥1), desarrollo (≥2), cierre (≥1) para cumplir contrato NEM.';

-- bloque
create table if not exists bloque (
    id                  uuid primary key default gen_random_uuid(),
    sesion_id           uuid not null references sesion(id) on delete cascade,
    planeacion_id       uuid not null references planeacion(id) on delete cascade,
    docente_id          uuid not null references docente(id) on delete cascade,
    cct                 text not null references cct(clave),
    bloque_catalogo_id  text,
    tipo                text not null check (tipo in (
                        'apertura','desarrollo','practica','cierre',
                        'evaluacion','evaluacion_semanal','banco_palabras')),
    nivel_flexibilidad  text not null check (nivel_flexibilidad in ('cerrado','abierto','en_blanco')),
    contenido_textual   text,                              -- texto del bloque (editable si abierto/en_blanco)
    pda_ids             text[] not null default '{}',
    campos_formativos   text[] not null default '{}',
    ejes_articuladores  text[] not null default '{}',
    recursos_requeridos jsonb default '[]'::jsonb,         -- lista de {categoria, clave_busqueda, cantidad}
    duracion_min        int,
    orden               int not null,                      -- orden dentro de la sesión
    origen              text not null default 'maestra'
                        check (origen in ('maestra','ia_sugerencia','maestra_editado_de_ia','kit_template')),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table bloque is
  'Bloque arrastrado del catálogo M1 a una sesión. 3 niveles de flexibilidad (cerrado/abierto/en_blanco). origen: provenance del texto (P-PD9 audit trail). PDA SIEMPRE del catálogo (P-PD2).';

-- Índices hot (sección 8)
create index if not exists idx_planeacion_docente on planeacion(docente_id);
create index if not exists idx_planeacion_grupo on planeacion(grupo_id);
create index if not exists idx_sesion_planeacion on sesion(planeacion_id);
create index if not exists idx_sesion_docente on sesion(docente_id);
create index if not exists idx_bloque_sesion on bloque(sesion_id);
create index if not exists idx_bloque_planeacion on bloque(planeacion_id);
create index if not exists idx_planeacion_cct on planeacion(cct);
create index if not exists idx_sesion_cct on sesion(cct);
create index if not exists idx_bloque_cct on bloque(cct);


-- ===== 0011_evaluacion_alumno.sql =====
-- 0011_evaluacion_alumno.sql
-- SPEC_TEC_02 §5.3.9 — rúbrica 4 niveles semáforo (D-FIN-3)

create table if not exists evaluacion_alumno (
    id              uuid primary key default gen_random_uuid(),
    planeacion_id   uuid not null references planeacion(id) on delete cascade,
    sesion_id       uuid references sesion(id) on delete set null,
    alumno_id       uuid not null references alumno(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    nivel           int not null check (nivel between 1 and 4),  -- 1=🟢, 2=🟡, 3=🟠, 4=🔴
    pda_codigo      text references pda(codigo),
    observaciones   text,
    fecha           date not null default current_date,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table evaluacion_alumno is
  'Rúbrica visual por alumno (D-FIN-3). 4 niveles semáforo: 🟢 Logrado sin apoyo, 🟡 Logrado con apoyo, 🟠 Requiere apoyo constante, 🔴 No logrado.';

-- Índices
create index if not exists idx_eval_alumno_planeacion on evaluacion_alumno(planeacion_id);
create index if not exists idx_eval_alumno_alumno on evaluacion_alumno(alumno_id);
create index if not exists idx_eval_alumno_cct on evaluacion_alumno(cct);


-- ===== 0012_recurso_aula_sesion_recurso_recurso_skill.sql =====
-- 0012_recurso_aula_sesion_recurso_recurso_skill.sql
-- SPEC_TEC_02 §5.3.10, §5.3.11, §5.3.12
-- Inventario del aula + relación con sesiones + skills inferidos

-- recurso_aula
create table if not exists recurso_aula (
    id              uuid primary key default gen_random_uuid(),
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    nombre          text not null,
    categoria       text not null check (categoria in (
                    'manipulativos','impresos','sensoriales',
                    'simbolicos','musicales','plasticos','otro')),
    uso             text not null,                         -- "para qué lo usa" en palabras de la maestra (1-5 palabras)
    edad            text check (edad in ('3-4','4-5','5-6','todas')),
    cantidad        int not null default 1,
    foto_url        text,
    kit_origen      text,                                  -- null si manual, 'kit_preescolar_generico' si del template
    uso_fuente      text not null default 'maestra'
                    check (uso_fuente in ('maestra','ia_sugerida','maestra_editada_de_ia','kit_template')),
    activo          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table recurso_aula is
  'Inventario personal del aula (E21). 6 categorías pedagógicas canónicas. uso: campo clave para matching con bloques M1.';

-- sesion_recurso
create table if not exists sesion_recurso (
    sesion_id       uuid not null references sesion(id) on delete cascade,
    recurso_id      uuid not null references recurso_aula(id) on delete cascade,
    cct             text not null references cct(clave),
    cantidad_usada  int not null default 1,
    created_at      timestamptz not null default now(),
    primary key (sesion_id, recurso_id)
);

comment on table sesion_recurso is
  'Recursos del inventario asignados a sesiones. Permite detección de conflictos.';

-- recurso_skill (DIFERIDO a Fase 2 según DM-03 pero tabla creada para evitar migraciones futuras)
-- Maya: tabla creada vacía, el matching se hace por campo 'uso' en MVP
create table if not exists recurso_skill (
    recurso_id      uuid not null references recurso_aula(id) on delete cascade,
    habilidad       text not null,
    campo_formativo text,
    weight          double precision not null check (weight between 0 and 1),
    created_at      timestamptz not null default now(),
    primary key (recurso_id, habilidad)
);

comment on table recurso_skill is
  'Skills inferidos por el sistema (NO por la maestra) a partir del campo "uso" de recurso_aula. Algoritmo mini-NLP (diferido a Fase 2, DM-03).';

-- Índices
create index if not exists idx_recurso_aula_docente on recurso_aula(docente_id);


-- ===== 0013_entrega_bitacora_audit_idempotency.sql =====
-- 0013_entrega_bitacora_audit_idempotency.sql
-- SPEC_TEC_02 §5.3.13, §5.3.14, §5.3.16, §5.3.17
-- Entrega al director + bitácora post-clase + audit_log + idempotency_keys

-- entrega
create table if not exists entrega (
    id                      uuid primary key default gen_random_uuid(),
    planeacion_id           uuid not null references planeacion(id) on delete cascade,
    docente_id              uuid not null references docente(id) on delete cascade,
    director_id             uuid references director(id) on delete set null,
    cct                     text not null references cct(clave),
    version                 int not null,
    estado                  text not null default 'entregada'
                            check (estado in ('entregada','recibida','con_comentarios','archivada')),
    doc_pdf_url             text not null,
    doc_pdf_storage_path    text not null,                  -- ccts/{cct}/planeaciones/{id}/{version}.pdf
    pdf_sha256              text not null,
    fecha_creacion          timestamptz not null default now(),
    fecha_entrega           timestamptz,
    fecha_recibida          timestamptz,
    comentario_director     text,
    url_firmada_token       text not null unique,
    url_firmada_expira_at   timestamptz not null,
    director_celular        text,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

comment on table entrega is
  'Entrega de planeación al director (M5/D-FIN-5). URL firmada JWT permite al director abrir sin registro. Cada edición post-entrega genera nueva versión.';

-- bitacora
create table if not exists bitacora (
    id              uuid primary key default gen_random_uuid(),
    sesion_id       uuid not null references sesion(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    planeacion_id   uuid not null references planeacion(id) on delete cascade,
    cct             text not null references cct(clave),
    fecha           date not null default current_date,
    participacion_grupo int not null check (participacion_grupo between 1 and 5),
    actividad_mejor_bloque_id uuid references bloque(id),
    dificultades    text,
    evidencia_url   text,                                  -- foto del TRABAJO del niño (NO del niño)
    evidencia_storage_path text,
    sync_estado     text not null default 'sincronizada'
                    check (sync_estado in ('pendiente_sync','sincronizada','conflicto')),
    sync_origen_ts  timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table bitacora is
  'Bitácora post-clase (Flujo C). Objetivo <30s de captura. Participación 1-5 (slider). Foto del trabajo del niño (NO del niño). sync_estado para offline-first (ADR-008).';

-- audit_log (L2-NEW-04)
create table if not exists audit_log (
    id              uuid primary key default gen_random_uuid(),
    cct             text not null references cct(clave),
    docente_id      uuid references docente(id),
    endpoint        text not null,
    method          text not null check (method in ('GET','POST','PATCH','DELETE')),
    body_hash       text,
    response_status int,
    ip              inet,
    user_agent      text,
    created_at      timestamptz not null default now()
);

comment on table audit_log is
  'Log de auditoría inmutable (L2-08). RLS por CCT (docente ve sus acciones, director ve todas las de su CCT).';

-- idempotency_keys (L2-NEW-04)
create table if not exists idempotency_keys (
    cct             text not null references cct(clave),
    key             text not null,
    endpoint        text not null,
    response_hash   text,
    expires_at      timestamptz not null,
    created_at      timestamptz not null default now(),
    primary key (cct, key)
);

comment on table idempotency_keys is
  'Idempotency keys para evitar mutaciones duplicadas (L2-08). TTL 24h.';

-- Índices
create index if not exists idx_entrega_planeacion on entrega(planeacion_id);
create index if not exists idx_entrega_docente on entrega(docente_id);
create index if not exists idx_entrega_director on entrega(director_id);
create index if not exists idx_entrega_cct on entrega(cct);
create index if not exists idx_entrega_activas on entrega(docente_id) where estado <> 'archivada';
create index if not exists idx_bitacora_sesion on bitacora(sesion_id);
create index if not exists idx_bitacora_docente on bitacora(docente_id);
create index if not exists idx_bitacora_cct on bitacora(cct);
create index if not exists idx_audit_log_cct_created on audit_log(cct, created_at desc);
create index if not exists idx_audit_log_docente on audit_log(docente_id, created_at desc);
create index if not exists idx_idempotency_expires on idempotency_keys(expires_at);


-- ===== 0014_rls_policies.sql =====
-- 0014_rls_policies.sql
-- SPEC_TEC_02 §7 — Row-Level Security por CCT
-- Funciones helper (§7.1) + habilitar RLS + 25 policies (§7.3)

-- ============ §7.1 Funciones helper ============
-- Devuelve el CCT del usuario autenticado (docente o director).
create or replace function user_cct()
returns text language sql security definer stable as $$
  coalesce(
    (select cct from docente where id = auth.uid()),
    (select cct from director where id = auth.uid())
  );
$$;

-- Devuelve true si el usuario autenticado es director de su CCT.
create or replace function is_director()
returns boolean language sql security definer stable as $$
  exists (select 1 from director where id = auth.uid());
$$;

-- Habilitar RLS en todas las tablas tenant
alter table docente                         enable row level security;
alter table director                        enable row level security;
alter table grupo                           enable row level security;
alter table alumno                          enable row level security;
alter table aceptacion_aviso_privacidad     enable row level security;
alter table planeacion                      enable row level security;
alter table sesion                          enable row level security;
alter table bloque                          enable row level security;
alter table evaluacion_alumno               enable row level security;
alter table recurso_aula                    enable row level security;
alter table sesion_recurso                  enable row level security;
alter table recurso_skill                   enable row level security;
alter table entrega                         enable row level security;
alter table bitacora                        enable row level security;
alter table audit_log                       enable row level security;
alter table idempotency_keys                enable row level security;

-- ============ docente ============
create policy "docente_self_select" on docente
  for select using (id = auth.uid());
create policy "docente_self_insert" on docente
  for insert with check (id = auth.uid());
create policy "docente_self_update" on docente
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "director_see_docentes_cct" on docente
  for select using (cct = user_cct() and is_director());

-- ============ director ============
create policy "director_self" on director
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ============ grupo ============
create policy "grupo_docente_own" on grupo
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "grupo_director_cct" on grupo
  for select using (cct = user_cct() and is_director());

-- ============ alumno ============
create policy "alumno_docente_own" on alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "alumno_director_cct" on alumno
  for select using (cct = user_cct() and is_director());

-- ============ aceptacion_aviso_privacidad ============
create policy "aviso_docente_own" on aceptacion_aviso_privacidad
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "aviso_director_cct" on aceptacion_aviso_privacidad
  for select using (cct = user_cct() and is_director());

-- ============ planeacion ============
create policy "planeacion_docente_own" on planeacion
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "planeacion_director_cct" on planeacion
  for select using (cct = user_cct() and is_director());

-- ============ sesion ============
create policy "sesion_docente_own" on sesion
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "sesion_director_cct" on sesion
  for select using (cct = user_cct() and is_director());

-- ============ bloque ============
create policy "bloque_docente_own" on bloque
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "bloque_director_cct" on bloque
  for select using (cct = user_cct() and is_director());

-- ============ evaluacion_alumno ============
create policy "eval_docente_own" on evaluacion_alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "eval_director_cct" on evaluacion_alumno
  for select using (cct = user_cct() and is_director());

-- ============ recurso_aula ============
create policy "recurso_docente_own" on recurso_aula
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());

-- ============ sesion_recurso ============
create policy "sesion_recurso_docente" on sesion_recurso
  for all using (
    cct = user_cct() and exists (
      select 1 from sesion s where s.id = sesion_recurso.sesion_id and s.docente_id = auth.uid()
    )
  );
create policy "sesion_recurso_director" on sesion_recurso
  for select using (
    cct = user_cct() and is_director()
  );

-- ============ recurso_skill ============
create policy "recurso_skill_docente" on recurso_skill
  for all using (
    exists (
      select 1 from recurso_aula r where r.id = recurso_skill.recurso_id
      and r.docente_id = auth.uid() and r.cct = user_cct()
    )
  );

-- ============ entrega ============
create policy "entrega_docente_own" on entrega
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "entrega_director_cct" on entrega
  for select using (cct = user_cct() and is_director());

-- ============ bitacora ============
create policy "bitacora_docente_own" on bitacora
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "bitacora_director_cct" on bitacora
  for select using (cct = user_cct() and is_director());

-- ============ audit_log ============
create policy "audit_log_docente_own" on audit_log
  for select using (docente_id = auth.uid() and cct = user_cct());
create policy "audit_log_director_cct" on audit_log
  for select using (cct = user_cct() and is_director());

-- ===== 0021_audit_log_insert_rls.sql =====
-- 0021_audit_log_insert_rls.sql
-- ADR-20260820-01 (resolución P2-RLS de QA-20260819-05 §D).
-- Política RLS `for insert` restringida para `audit_log`. Ver artefacto
-- `supabase/migrations/0021_audit_log_insert_rls.sql` para la justificación
-- completa. Habilita el audit trail P-PD9 en runtime real sin servicio-role.
drop policy if exists "audit_log_docente_insert" on audit_log;
create policy "audit_log_docente_insert" on audit_log
  for insert to authenticated
  with check (docente_id = auth.uid() and cct = user_cct());

-- ============ idempotency_keys ============
create policy "idempotency_keys_docente_own" on idempotency_keys
  for all using (cct = user_cct());

-- ===== 0015_triggers_updated_at.sql =====
-- 0015_triggers_updated_at.sql
-- SPEC_TEC_02 §6.1 — función canónica + triggers para todas las tablas con updated_at
-- EXCEPTO aceptacion_aviso_privacidad (inmutable, solo INSERT, sin updated_at)

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Aplicar a cada tabla con updated_at
create trigger trg_docente_updated     before update on docente     for each row execute function set_updated_at();
create trigger trg_director_updated    before update on director    for each row execute function set_updated_at();
create trigger trg_grupo_updated       before update on grupo       for each row execute function set_updated_at();
create trigger trg_alumno_updated      before update on alumno      for each row execute function set_updated_at();
-- L2-NEW-05: NO se crea trigger trg_aceptacion_updated — la tabla aceptacion_aviso_privacidad es inmutable
create trigger trg_planeacion_updated  before update on planeacion  for each row execute function set_updated_at();
create trigger trg_sesion_updated      before update on sesion      for each row execute function set_updated_at();
create trigger trg_bloque_updated      before update on bloque      for each row execute function set_updated_at();
create trigger trg_evaluacion_updated  before update on evaluacion_alumno for each row execute function set_updated_at();
create trigger trg_recurso_aula_updated before update on recurso_aula for each row execute function set_updated_at();
create trigger trg_entrega_updated     before update on entrega     for each row execute function set_updated_at();
create trigger trg_bitacora_updated    before update on bitacora    for each row execute function set_updated_at();
create trigger trg_catalogo_version_updated before update on catalogo_version for each row execute function set_updated_at();
create trigger trg_campo_formativo_updated  before update on campo_formativo  for each row execute function set_updated_at();
create trigger trg_eje_articulador_updated  before update on eje_articulador  for each row execute function set_updated_at();
create trigger trg_fase_updated        before update on fase        for each row execute function set_updated_at();
create trigger trg_contenido_updated   before update on contenido   for each row execute function set_updated_at();
create trigger trg_pda_updated         before update on pda         for each row execute function set_updated_at();
create trigger trg_referencia_conaliteg_updated before update on referencia_libro_conaliteg for each row execute function set_updated_at();
create trigger trg_escuela_updated     before update on escuela     for each row execute function set_updated_at();
create trigger trg_cct_updated         before update on cct         for each row execute function set_updated_at();


-- ===== 0022_entrevista_inicial_alumno.sql =====
-- 0022_entrevista_inicial_alumno.sql
-- SPEC_TEC_09 (SPEC-20260820-09) + ADR-20260820-02. Tabla `entrevista_inicial_alumno`
-- + RLS docente + trigger updated_at + índices. Director sin acceso (B1).
-- ⚠️  ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`.
create table if not exists entrevista_inicial_alumno (
    id              uuid primary key default gen_random_uuid(),
    alumno_id       uuid not null references alumno(id) on delete cascade,
    grupo_id        uuid not null references grupo(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    ciclo_escolar   text not null,
    tipo_entrevista text not null default 'nino'
                    check (tipo_entrevista in ('nino')),
    respuestas      jsonb not null,
    fecha_aplicacion date not null,
    estado          text not null default 'borrador'
                    check (estado in ('borrador','completa','archivada')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (alumno_id, ciclo_escolar, tipo_entrevista)
);

create index if not exists idx_entrevista_alumno on entrevista_inicial_alumno(alumno_id);
create index if not exists idx_entrevista_docente on entrevista_inicial_alumno(docente_id);
create index if not exists idx_entrevista_grupo_ciclo on entrevista_inicial_alumno(grupo_id, ciclo_escolar);

-- Trigger updated_at — usa la función canónica definida en 0015_triggers_updated_at.sql.
create trigger trg_entrevista_updated before update on entrevista_inicial_alumno
  for each row execute function set_updated_at();

-- RLS habilitada + policy de docente (B1: director sin acceso, NO se crea policy de director).
alter table entrevista_inicial_alumno enable row level security;

drop policy if exists "entrevista_docente_own" on entrevista_inicial_alumno;
create policy "entrevista_docente_own" on entrevista_inicial_alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());


-- ===== 0023_entrevista_inicial_completa.sql =====
-- 0023_entrevista_inicial_completa.sql
-- SPEC_TEC_09 (SPEC-20260820-09) v2.1 + ADR-20260820-05 (D9-12 revisada, D9-13 resuelta Q1=0).
-- Migración ADITIVA sobre la tabla ya creada por 0022 (APLICADA, INMUTABLE).
-- ÚNICO CAMBIO: añadir la columna `directorio jsonb` (bloque 3, D9-11) con default (esqueleto literal
-- vacío) y `not null`. Se preserva el DDL/RLS/trigger/unique/índices de 0022.
-- DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1 RESUELTO (Q1=0): 0 filas remotas ⇒ sin transformación
-- ni backfill de `respuestas` v1→v2. Este archivo NO toca `respuestas`.
-- No se recrean policies, no se crea policy de director (B1), no se recrea trigger (AC-23, AC-24).
-- ⚠️  ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`.
alter table entrevista_inicial_alumno
  add column if not exists directorio jsonb not null
  default '{"titulo":"DIRECTORIO CELESTINO FREINET 24-25","subtitulo":"2° “A” Educadora: María Dolores Marín Pastrana","nombreAlumno":"","encabezadoTelefonos":"Números telefónicos en caso de emergencia","contactos":[{"orden":1,"etiqueta":"Nombre del padre","nombre":"","telefono":""},{"orden":2,"etiqueta":"Nombre de la madre","nombre":"","telefono":""},{"orden":3,"etiqueta":"Nombre de familiar y parentesco","nombre":"","telefono":""},{"orden":4,"etiqueta":"Nombre de familiar y parentesco","nombre":"","telefono":""}]}'::jsonb;


-- ===== 0016_seed_catalogo.sql =====
-- 0017_seed_catalogo.sql
-- SPEC_TEC_02 §10 — Seed completo del catálogo NEM Fase 2
-- 90 registros: 1+4+7+6+4+24+24+0+19+1

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
  (1,  '1° preescolar', 'Lenguajes',                       'Múltiples Lenguajes - 1° grado',                                'https://libros.conaliteg.gob.mx/2024/K1MLL.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (2,  '2° preescolar', 'Lenguajes',                       'Múltiples Lenguajes - 2° grado',                                'https://libros.conaliteg.gob.mx/2024/K2MLL.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (3,  '3° preescolar', 'Lenguajes',                       'Múltiples Lenguajes - 3° grado',                                'https://libros.conaliteg.gob.mx/2024/K3MLL.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (4,  '1° preescolar', 'Ética, Naturaleza y Sociedades',  'Láminas de diálogo con manifestaciones culturales y artísticas - 1° grado', 'https://libros.conaliteg.gob.mx/2024/K1LMC.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (5,  '2° preescolar', 'Ética, Naturaleza y Sociedades',  'Láminas de diálogo con manifestaciones culturales y artísticas - 2° grado', 'https://libros.conaliteg.gob.mx/2024/K2LMC.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (6,  '3° preescolar', 'Ética, Naturaleza y Sociedades',  'Láminas de diálogo con manifestaciones culturales y artísticas - 3° grado', 'https://libros.conaliteg.gob.mx/2024/K3LMC.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (7,  '1° preescolar', 'Saberes y Pensamiento Científico','Jugar e imaginar con mi material manipulable - 1° grado',       'https://libros.conaliteg.gob.mx/2024/K1JMM.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (8,  '2° preescolar', 'Saberes y Pensamiento Científico','Jugar e imaginar con mi material manipulable - 2° grado',       'https://libros.conaliteg.gob.mx/2024/K2JMM.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (9,  '3° preescolar', 'Saberes y Pensamiento Científico','Jugar e imaginar con mi material manipulable - 3° grado',       'https://libros.conaliteg.gob.mx/2024/K3JMM.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (10, '1° preescolar', 'De lo Humano y lo Comunitario',   'Mi Álbum - 1° grado',                                           'https://libros.conaliteg.gob.mx/2024/K1MAA.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (11, '2° preescolar', 'De lo Humano y lo Comunitario',   'Mi Álbum - 2° grado',                                           'https://libros.conaliteg.gob.mx/2024/K2MAA.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (12, '3° preescolar', 'De lo Humano y lo Comunitario',   'Mi Álbum - 3° grado',                                           'https://libros.conaliteg.gob.mx/2024/K3MAA.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (13, '1° preescolar', 'Lenguajes',                       'Explorar e imaginar con mi libro de Preescolar - 1° grado',     'https://libros.conaliteg.gob.mx/2024/K1ELI.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (14, '2° preescolar', 'Lenguajes',                       'Explorar e imaginar con mi libro de Preescolar - 2° grado',     'https://libros.conaliteg.gob.mx/2024/K2ELI.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (15, '3° preescolar', 'Lenguajes',                       'Explorar e imaginar con mi libro de Preescolar - 3° grado',     'https://libros.conaliteg.gob.mx/2024/K3ELI.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'alumnos', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (16, 'Fase 2 completa', 'Transversal', 'Crianza para la libertad. Libro para las familias. Fase 2',                      'https://libros.conaliteg.gob.mx/2024/KCLF.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (17, 'Fase 2 completa', 'Transversal', 'Un libro sin recetas para la maestra y el maestro. Fase 2',                      'https://libros.conaliteg.gob.mx/2024/KLRS.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (18, 'Fase 2 completa', 'Transversal', 'Modalidades de trabajo para la acción transformadora y el codiseño',             'https://libros.conaliteg.gob.mx/2024/KMTR.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2'),
  (19, 'Fase 2 completa', 'Transversal', 'Posibilidades de trabajo para la acción transformadora y el codiseño. Ficheros. Fase 2', 'https://libros.conaliteg.gob.mx/2024/KPTR.htm', null, '2024-2025', '2026-08-16', 'validado_portal_oficial', false, false, 'transversal', 'PDF+HTML', 'PLAN_2022_ED_2025_FASE_2')
on conflict (id) do nothing;

-- ============ 10.10 auditoria_carga (1) ============
insert into auditoria_carga (accion, observacion, autor, catalogo_version) values
  ('agregado', 'PDA extraídos del PDF nativo v2024 (InDesign, 80 páginas). Total: 24 PDA, 4 contenidos, 69/80 páginas con texto nativo (86.2%).', 'SOFIA extractor_v2024', 'PLAN_2022_ED_2025_FASE_2');

