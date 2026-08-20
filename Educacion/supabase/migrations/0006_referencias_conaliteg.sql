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
