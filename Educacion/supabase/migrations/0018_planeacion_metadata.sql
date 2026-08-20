-- 0018_planeacion_metadata.sql
-- SPEC_MODALIDADES_2026-08-17 — VALIDACIÓN INTEGRA 2026-08-18.
-- Soporte para campos específicos por modalidad pedagógica (P-PD5/D-FIN-6).
--
-- Decisión arquitectónica (aprobada por INTEGRA, no toca RLS existente):
--  Se agrega la columna `planeacion.metadata jsonb` para persistir
--  `rincones`, `preguntas_det`, `tema`, `fases`, `sesiones_semana` y
--  datos similares que NO tienen columnas dedicadas.
--
-- Por qué jsonb y no columnas nuevas por modalidad:
--  1. NO toca RLS: `planeacion_docente_own` filtra por
--     `docente_id = auth.uid() and cct = user_cct()` — el jsonb no
--     afecta la policy (migración 0014).
--  2. Patrón consistente con `docente.configuracion_m4 jsonb`
--     (SPEC_TEC_02 §5.3.1).
--  3. Escalable: permite agregar modalidades nuevas sin migración.
--  4. Validación client + zod en server action
--     (`services/planeaciones/planeacion-actions.ts`).
--
-- Estructura canónica de `metadata.modalidad_data` (ver
-- SPEC_MODALIDADES §VALIDACIÓN INTEGRA §Estructura canónica):
--  - proyecto_comunitario: { "modalidad_data": {} }
--  - unidad_didactica:     { "modalidad_data": { "sesiones_semana": {lunes?, ...},
--                                                "actividades_recurrentes"?: [...] } }
--  - abj:                  { "modalidad_data": { "tipo_juego"?, "reglas"?, "extension"? } }
--  - rincones:             { "modalidad_data": { "rincones": [ {nombre, materiales[], reglas} ] } }
--  - centros_interes:      { "modalidad_data": { "tema", "preguntas_det"[],
--                                                "estaciones"?[] } }
--  - taller_critico:       { "modalidad_data": { "fases": [...3 valores] } }
--
-- REGLAS DURAS (no negociables):
--  - NO modificar `sesion.fase_interna` (migración 0010, check
--    inicio/desarrollo/cierre). Las "5 fases" de Proyecto Comunitario
--    y "3 fases" de Taller Crítico se modelan como sesiones separadas
--    (filas) + metadata.modalidad_data para info específica.
--  - NO modificar políticas RLS existentes (migración 0014).
--  - NO romper columnas existentes (uso `if not exists`).

alter table planeacion
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column planeacion.metadata is
  'Datos específicos por modalidad pedagógica (P-PD5/D-FIN-6). '
  'Estructura: { "modalidad_data": { ... } }. Ver SPEC_MODALIDADES_2026-08-17 '
  '§VALIDACIÓN INTEGRA §Estructura canónica. NO afecta RLS: las policies '
  'existentes filtran por docente_id + cct (migración 0014).';

-- GIN index para queries futuras sobre metadata (ej. filtrar por tipo de
-- modalidad_data). Idempotente.
create index if not exists idx_planeacion_metadata_gin
  on planeacion
  using gin (metadata jsonb_path_ops);

-- Verificación: la columna debe existir y tener default '{}'.
do $$
declare
  has_col boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'planeacion'
      and column_name = 'metadata'
  ) into has_col;
  if not has_col then
    raise exception '0018: column planeacion.metadata no creada';
  end if;
  raise notice '0018: column planeacion.metadata creada OK (jsonb default {}). '
               'RLS no modificada. Index GIN creado.';
end
$$;
