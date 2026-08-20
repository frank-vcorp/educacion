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
