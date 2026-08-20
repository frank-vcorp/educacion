-- 0001_extensions.sql
-- SPEC_TEC_02 §3 — extensiones requeridas
-- pgcrypto: gen_random_uuid() (Supabase ya lo trae, se instala por si no)
-- pg_trgm: búsqueda trigram para autocomplete CCT (L3-06)

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
