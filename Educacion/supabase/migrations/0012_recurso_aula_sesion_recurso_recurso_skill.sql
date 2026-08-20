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
