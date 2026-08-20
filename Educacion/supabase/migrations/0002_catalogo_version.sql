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
