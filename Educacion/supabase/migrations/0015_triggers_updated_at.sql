-- 0015_triggers_updated_at.sql
-- SPEC_TEC_02 §6.1 — función canónica + triggers para todas las tablas con updated_at
-- EXCEPTO aceptacion_aviso_privacidad (inmutable, solo INSERT, sin updated_at)

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Aplicar a cada tabla con updated_at
create trigger trg_docente_updated     before update on docente     for each row execute function set_updated_at();
create trigger trg_director_updated    before update on director    for each row execute function set_updated_at();
create trigger trg_grupo_updated       before update on grupo       for each row execute function set_updated_at();
create trigger trg_alumno_updated      before update on alumno      for each row execute function set_updated_at();
-- L2-NEW-05: NO se crea trigger trg_aceptacion_updated — la tabla aceptacion_aviso_privacidad es inmutable
create trigger trg_planeacion_updated  before update on planeacion  for each row execute function set_updated_at();
create trigger trg_sesion_updated      before update on sesion      for each row execute function set_updated_at();
create trigger trg_bloque_updated      before update on bloque      for each row execute function set_updated_at();
create trigger trg_evaluacion_updated  before update on evaluacion_alumno for each row execute function set_updated_at();
create trigger trg_recurso_aula_updated before update on recurso_aula for each row execute function set_updated_at();
create trigger trg_entrega_updated     before update on entrega     for each row execute function set_updated_at();
create trigger trg_bitacora_updated    before update on bitacora    for each row execute function set_updated_at();
create trigger trg_catalogo_version_updated before update on catalogo_version for each row execute function set_updated_at();
create trigger trg_campo_formativo_updated  before update on campo_formativo  for each row execute function set_updated_at();
create trigger trg_eje_articulador_updated  before update on eje_articulador  for each row execute function set_updated_at();
create trigger trg_fase_updated        before update on fase        for each row execute function set_updated_at();
create trigger trg_contenido_updated   before update on contenido   for each row execute function set_updated_at();
create trigger trg_pda_updated         before update on pda         for each row execute function set_updated_at();
create trigger trg_referencia_conaliteg_updated before update on referencia_libro_conaliteg for each row execute function set_updated_at();
create trigger trg_escuela_updated     before update on escuela     for each row execute function set_updated_at();
create trigger trg_cct_updated         before update on cct         for each row execute function set_updated_at();
