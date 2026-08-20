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
