-- 0022_entrevista_inicial_alumno.sql
-- SPEC_TEC_09 (SPEC-20260820-09) + ADR-20260820-02.
-- Tabla `entrevista_inicial_alumno` para la entrevista inicial del niño (21 ítems
-- literales definidos en DEC-20260820-01; contrato zod espejo en el server action
-- `services/alumnos/entrevista-actions.ts`).
--
-- ⚠️  ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`
--     Frank autoriza la aplicación cuando decida (mismo patrón que 0020/0021).
--
-- Decisiones cerradas (DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD RESUELTO):
--   A1  Gate de captura = aviso existente (aceptacion_aviso_privacidad, D-FIN-15).
--   B1  Director SIN acceso (default-deny permanente). No se crea policy de director.
--   C1  Conservar durante el ciclo escolar activo.
--   C2  Archivar al finalizar el ciclo (estado='archivada'); no borrar.
--   D1  Edición in-place, sin versionado visible.
--   D9-05 No-envío a IA: ningún path de app/api/**/ia/*, services/ia/* ni
--         lib/ia/* lee esta tabla (verificación estática por grep, AC-8).
--
-- Reversibilidad: `drop table if exists entrevista_inicial_alumno cascade;`
-- no afecta datos de otras tablas.

-- ============ §5.1 Tabla ============
create table if not exists entrevista_inicial_alumno (
    id              uuid primary key default gen_random_uuid(),
    alumno_id       uuid not null references alumno(id) on delete cascade,
    grupo_id        uuid not null references grupo(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    ciclo_escolar   text not null,                         -- heredado del grupo al momento de crear
    tipo_entrevista text not null default 'nino'
                    check (tipo_entrevista in ('nino')),  -- 'familia' queda fuera (OQ-20260820-04)
    respuestas      jsonb not null,                        -- contrato §4.1 (21 ítems literales)
    fecha_aplicacion date not null,                       -- ítem 21 de la plantilla
    estado          text not null default 'borrador'
                    check (estado in ('borrador','completa','archivada')),  -- D9-07: 'archivada' al finalizar ciclo
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (alumno_id, ciclo_escolar, tipo_entrevista)    -- una entrevista del niño por alumno por ciclo (D9-03)
);

comment on table entrevista_inicial_alumno is
  'Entrevista inicial del niño (DEC-20260820-01). Ligada a alumno+grupo+ciclo. Cuestionario literal inmutable en respuestas jsonb (SPEC_TEC_09 §4). No se envía a IA por defecto (BR, SCN-20260820-05). Acceso restringido a la docente autorizada (RLS §8); el director NO tiene acceso por decisión funcional B1 (DISCOVERY-GAP-20260820-ENTREVISTA-PRIVACIDAD resuelto). Retención: conservar durante el ciclo + archivar al finalizar (C1+C2); no deleteEntrevista (§10).';

-- ============ §5.1 Índices hot ============
create index if not exists idx_entrevista_alumno on entrevista_inicial_alumno(alumno_id);
create index if not exists idx_entrevista_docente on entrevista_inicial_alumno(docente_id);
create index if not exists idx_entrevista_grupo_ciclo on entrevista_inicial_alumno(grupo_id, ciclo_escolar);

-- ============ §5.2 Trigger updated_at ============
-- Usa la función canónica `set_updated_at()` ya creada en 0015_triggers_updated_at.sql.
create trigger trg_entrevista_updated before update on entrevista_inicial_alumno
  for each row execute function set_updated_at();

-- ============ §8.1 RLS habilitada ============
alter table entrevista_inicial_alumno enable row level security;

-- ============ §8.2 Policy de docente (confirmada) ============
-- Patrón idéntico a `alumno_docente_own` (0014:61-63) y `eval_docente_own` (0014:96-98).
-- `for all` cubre SELECT/INSERT/UPDATE; DELETE queda cubierto por la policy
-- pero el server action no expone delete (§6 SPEC_TEC_09; retención C1+C2).
drop policy if exists "entrevista_docente_own" on entrevista_inicial_alumno;
create policy "entrevista_docente_own" on entrevista_inicial_alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());

-- ============ §8.3 Policy de director — NO SE CREA (decisión funcional B1) ============
-- Frank confirmó (DISCOVERY-GAP ítem B, 2026-08-20): solo la docente responsable
-- puede consultar/editar; el director NO tiene acceso. RLS default-deny
-- permanente. Si en el futuro Frank revierte B1, se crea la policy de director
-- (contrato reversible documentado en SPEC_TEC_09 §8.3 — no se incluye el
-- nombre literal de la policy en este archivo para que AC-5 verifique 0
-- coincidencias mediante `grep -n '<nombre policy>' supabase/migrations/0022...`).

