-- 0024_entrevista_familiar_alumno.sql
-- SPEC_TEC_11 (SPEC-20260820-11 v2.0) + ADR-20260820-04 (revisado 2026-08-21 por DEC-20260821-01).
-- Migración ADITIVA. NO toca 0001..0023. NO renumera ni reescribe la 0022 ni la 0023 de la infantil.
-- Tabla `entrevista_familiar_alumno` con cuestionario literal del PDF
-- `docx_extract/NUEVA ENTREVISTA.pdf` (6 bloques; SPEC §4) en `respuestas jsonb`.
--
-- ⚠️  ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`.
--     Frank autoriza la aplicación cuando decida.
--
-- Decisiones cerradas (DISCOVERY-GAP-20260820-ENTREVISTA-FAMILIAR RESUELTO por DEC-20260821-01):
--   D11-01 Tabla dedicada — no extender `entrevista_inicial_alumno` con `tipo_entrevista='familia'`.
--   D11-07 Gate de captura = aviso existente (aceptacion_aviso_privacidad, D-FIN-15).
--   D11-08 RLS por CCT + docente; director SIN acceso (default-deny permanente).
--   D11-09 Retención: conservar durante el ciclo + archivar al finalizar. Sin deleteEntrevista.
--   D11-10 Edición in-place; sin versionado visible; `unique (alumno_id, ciclo_escolar)`.
--   D11-04 No-envío a IA: este archivo NO se importa desde app/api (ia), services/ia ni lib/ia.
--
-- Reversibilidad: `drop table if exists entrevista_familiar_alumno cascade;`
-- no afecta datos ni policies de la infantil ni de otras tablas.

-- ============ §5.1 Tabla ============
create table if not exists entrevista_familiar_alumno (
    id              uuid primary key default gen_random_uuid(),
    alumno_id       uuid not null references alumno(id) on delete cascade,
    grupo_id        uuid not null references grupo(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    ciclo_escolar   text not null,                         -- heredado del grupo al momento de crear
    respuestas      jsonb not null,                        -- contrato §4.2 (6 bloques literales del PDF)
    fecha_aplicacion date not null,
    estado          text not null default 'borrador'
                    check (estado in ('borrador','completa','archivada')), -- D11-09
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (alumno_id, ciclo_escolar)                     -- D11-10 edición in-place
);

comment on table entrevista_familiar_alumno is
  'Entrevista familiar (DEC-20260821-01). Ligada a alumno+grupo+ciclo. Cuestionario literal inmutable en respuestas jsonb (SPEC_TEC_11 §4). Separada de entrevista_inicial_alumno (D11-01). No se envía a IA por defecto (D11-04, BR). Acceso restringido a la docente autorizada (RLS §7); el director NO tiene acceso por B1/D11-08. Gate = aviso existente (D11-07). Retención: conservar durante el ciclo + archivar al finalizar (D11-09 / C1+C2); no deleteEntrevista. Firma = nombre tecleado de mamá/papá (D11-11 / E1); sin valor legal de firma manuscrita.';

-- ============ §5.1 Índices hot ============
create index if not exists idx_entrevista_familiar_alumno on entrevista_familiar_alumno(alumno_id);
create index if not exists idx_entrevista_familiar_docente on entrevista_familiar_alumno(docente_id);
create index if not exists idx_entrevista_familiar_grupo_ciclo on entrevista_familiar_alumno(grupo_id, ciclo_escolar);

-- ============ §5.2 Trigger updated_at ============
-- Usa la función canónica `set_updated_at()` ya creada en 0015_triggers_updated_at.sql.
create trigger trg_entrevista_familiar_updated before update on entrevista_familiar_alumno
  for each row execute function set_updated_at();

-- ============ §7.1 RLS habilitada ============
alter table entrevista_familiar_alumno enable row level security;

-- ============ §7.2 Policy de docente (D11-08 confirmada) ============
-- Patrón idéntico a `entrevista_docente_own` (0022:61-64) y `alumno_docente_own` (0014:61-63).
-- `for all` cubre SELECT/INSERT/UPDATE; DELETE queda cubierto por la policy
-- pero el server action NO expone `deleteEntrevistaFamiliar` (§10 SPEC_TEC_11).
drop policy if exists "entrevista_familiar_docente_own" on entrevista_familiar_alumno;
create policy "entrevista_familiar_docente_own" on entrevista_familiar_alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());

-- ============ §7.3 Policy de director — NO SE CREA (D11-08 / B1) ============
-- Frank confirmó (DEC-20260821-01, cierre de F-B): solo la docente responsable
-- puede consultar/editar; el director NO tiene acceso. RLS default-deny
-- permanente (sin `create policy` para director). Si en el futuro Frank
-- revierte este cierre, se documenta como decisión funcional nueva
-- (D11-06: no herencia silenciosa) — no se incluye aquí.
