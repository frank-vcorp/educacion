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
