-- 0023_entrevista_inicial_completa.sql
-- SPEC_TEC_09 (SPEC-20260820-09) v2.1 + ADR-20260820-05 (D9-12 revisada, D9-13 resuelta Q1=0).
-- Migración ADITIVA sobre la tabla ya creada por 0022 (APLICADA, INMUTABLE).
-- ÚNICO CAMBIO: añadir la columna `directorio jsonb` (bloque 3, D9-11) con default (esqueleto literal
-- vacío) y `not null`. Se preserva el DDL/RLS/trigger/unique/índices de 0022.
-- DISCOVERY-GAP-20260820-ENTREVISTA-DATOS-V1 RESUELTO (Q1=0): 0 filas remotas ⇒ sin transformación
-- ni backfill de `respuestas` v1→v2. Este archivo NO toca `respuestas`.
-- No se recrean policies, no se crea policy de director (B1), no se recrea trigger (AC-23, AC-24).
-- ⚠️  ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`.
-- Frank autoriza la aplicación cuando decida.

-- Columna aditiva del directorio (esqueleto literal vacío; 0 filas existentes ⇒ sin backfill de filas):
alter table entrevista_inicial_alumno
  add column if not exists directorio jsonb not null
  default '{"titulo":"DIRECTORIO CELESTINO FREINET 24-25","subtitulo":"2° “A” Educadora: María Dolores Marín Pastrana","nombreAlumno":"","encabezadoTelefonos":"Números telefónicos en caso de emergencia","contactos":[{"orden":1,"etiqueta":"Nombre del padre","nombre":"","telefono":""},{"orden":2,"etiqueta":"Nombre de la madre","nombre":"","telefono":""},{"orden":3,"etiqueta":"Nombre de familiar y parentesco","nombre":"","telefono":""},{"orden":4,"etiqueta":"Nombre de familiar y parentesco","nombre":"","telefono":""}]}'::jsonb;