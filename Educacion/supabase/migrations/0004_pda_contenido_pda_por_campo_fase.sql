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
