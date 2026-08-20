-- 0014_rls_policies.sql
-- SPEC_TEC_02 §7 — Row-Level Security por CCT
-- Funciones helper (§7.1) + habilitar RLS + 25 policies (§7.3)

-- ============ §7.1 Funciones helper ============
-- Devuelve el CCT del usuario autenticado (docente o director).
create or replace function user_cct()
returns text language sql security definer stable as $$
  select coalesce(
    (select cct from docente where id = auth.uid()),
    (select cct from director where id = auth.uid())
  );
$$;

-- Devuelve true si el usuario autenticado es director de su CCT.
create or replace function is_director()
returns boolean language sql security definer stable as $$
  select exists (select 1 from director where id = auth.uid());
$$;

-- Habilitar RLS en todas las tablas tenant
alter table docente                         enable row level security;
alter table director                        enable row level security;
alter table grupo                           enable row level security;
alter table alumno                          enable row level security;
alter table aceptacion_aviso_privacidad     enable row level security;
alter table planeacion                      enable row level security;
alter table sesion                          enable row level security;
alter table bloque                          enable row level security;
alter table evaluacion_alumno               enable row level security;
alter table recurso_aula                    enable row level security;
alter table sesion_recurso                  enable row level security;
alter table recurso_skill                   enable row level security;
alter table entrega                         enable row level security;
alter table bitacora                        enable row level security;
alter table audit_log                       enable row level security;
alter table idempotency_keys                enable row level security;

-- ============ docente ============
create policy "docente_self_select" on docente
  for select using (id = auth.uid());
create policy "docente_self_insert" on docente
  for insert with check (id = auth.uid());
create policy "docente_self_update" on docente
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "director_see_docentes_cct" on docente
  for select using (cct = user_cct() and is_director());

-- ============ director ============
create policy "director_self" on director
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ============ grupo ============
create policy "grupo_docente_own" on grupo
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "grupo_director_cct" on grupo
  for select using (cct = user_cct() and is_director());

-- ============ alumno ============
create policy "alumno_docente_own" on alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "alumno_director_cct" on alumno
  for select using (cct = user_cct() and is_director());

-- ============ aceptacion_aviso_privacidad ============
create policy "aviso_docente_own" on aceptacion_aviso_privacidad
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "aviso_director_cct" on aceptacion_aviso_privacidad
  for select using (cct = user_cct() and is_director());

-- ============ planeacion ============
create policy "planeacion_docente_own" on planeacion
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "planeacion_director_cct" on planeacion
  for select using (cct = user_cct() and is_director());

-- ============ sesion ============
create policy "sesion_docente_own" on sesion
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "sesion_director_cct" on sesion
  for select using (cct = user_cct() and is_director());

-- ============ bloque ============
create policy "bloque_docente_own" on bloque
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "bloque_director_cct" on bloque
  for select using (cct = user_cct() and is_director());

-- ============ evaluacion_alumno ============
create policy "eval_docente_own" on evaluacion_alumno
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "eval_director_cct" on evaluacion_alumno
  for select using (cct = user_cct() and is_director());

-- ============ recurso_aula ============
create policy "recurso_docente_own" on recurso_aula
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());

-- ============ sesion_recurso ============
create policy "sesion_recurso_docente" on sesion_recurso
  for all using (
    cct = user_cct() and exists (
      select 1 from sesion s where s.id = sesion_recurso.sesion_id and s.docente_id = auth.uid()
    )
  );
create policy "sesion_recurso_director" on sesion_recurso
  for select using (
    cct = user_cct() and is_director()
  );

-- ============ recurso_skill ============
create policy "recurso_skill_docente" on recurso_skill
  for all using (
    exists (
      select 1 from recurso_aula r where r.id = recurso_skill.recurso_id
      and r.docente_id = auth.uid() and r.cct = user_cct()
    )
  );

-- ============ entrega ============
create policy "entrega_docente_own" on entrega
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "entrega_director_cct" on entrega
  for select using (cct = user_cct() and is_director());

-- ============ bitacora ============
create policy "bitacora_docente_own" on bitacora
  for all using (docente_id = auth.uid() and cct = user_cct())
  with check (docente_id = auth.uid() and cct = user_cct());
create policy "bitacora_director_cct" on bitacora
  for select using (cct = user_cct() and is_director());

-- ============ audit_log ============
create policy "audit_log_docente_own" on audit_log
  for select using (docente_id = auth.uid() and cct = user_cct());
create policy "audit_log_director_cct" on audit_log
  for select using (cct = user_cct() and is_director());

-- ============ idempotency_keys ============
create policy "idempotency_keys_docente_own" on idempotency_keys
  for all using (cct = user_cct());
