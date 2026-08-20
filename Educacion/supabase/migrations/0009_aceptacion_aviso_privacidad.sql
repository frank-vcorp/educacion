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
