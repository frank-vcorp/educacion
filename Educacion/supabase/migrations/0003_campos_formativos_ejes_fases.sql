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
