-- 0020_ia_trazabilidad.sql
-- SPEC_TEC_07 §6.2 + ADR-20260819-02 Decisión 3 (cierre total).
-- Tabla `ia_sugerencia` para trazabilidad rica de sugerencias IA:
--   - request_hash (cache key)
--   - texto_propuesto vs texto_aceptado
--   - aceptada / rechazada con timestamps
--   - origen ('ia'|'cache'|'fallback_vacio'), proveedor, model, latency_ms
--   - error_code opcional (p.ej. NEM_IA_VARIANTE_VIOLA_ESTRUCTURA)
--
-- ⚠️  ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`
--     Frank autoriza la aplicación cuando decida.
--
-- Mientras no se aplica, la trazabilidad opera vía:
--   - bloque.origen ∈ ('maestra','ia_sugerencia','maestra_editado_de_ia','kit_template')
--   - audit_log (POST F1/F2/F3 + PATCH bloque/planeacion)
-- (SPEC_TEC_07 §6.1, suficiente para prueba con Tía Lola).

create table if not exists ia_sugerencia (
    id              uuid primary key default gen_random_uuid(),
    docente_id      uuid not null references docente(id) on delete cascade,
    planeacion_id   uuid references planeacion(id) on delete cascade,
    bloque_id      uuid references bloque(id) on delete set null,
    feature        text not null check (feature in ('F1','F2','F3','F_IA1')),
    request_hash    text not null,
    texto_propuesto text not null,
    texto_aceptado  text,
    aceptada        boolean not null default false,
    aceptada_at     timestamptz,
    rechazada_at    timestamptz,
    origen          text not null check (origen in ('ia','cache','fallback_vacio')),
    proveedor       text,                                     -- AI_PROVIDER efectivo (NO la key)
    model           text,                                     -- AI_MODEL efectivo
    latency_ms      int,
    error_code      text,
    created_at      timestamptz not null default now()
);

comment on table ia_sugerencia is
  'Trazabilidad de sugerencias IA (F1/F2/F3/F-IA1). Cierre total de Decisión 3 ADR-20260819-02. NO APLICADO en este turno (Frank autoriza `supabase db push`).';

-- RLS: docente sólo ve sus sugerencias.
alter table ia_sugerencia enable row level security;

drop policy if exists ia_sugerencia_select_own on ia_sugerencia;
create policy ia_sugerencia_select_own on ia_sugerencia
    for select using (docente_id = auth.uid());

drop policy if exists ia_sugerencia_insert_own on ia_sugerencia;
create policy ia_sugerencia_insert_own on ia_sugerencia
    for insert with check (docente_id = auth.uid());

drop policy if exists ia_sugerencia_update_own on ia_sugerencia;
create policy ia_sugerencia_update_own on ia_sugerencia
    for update using (docente_id = auth.uid());

-- Índice para cache lookup y reportes.
create index if not exists idx_ia_sugerencia_docente_feature_hash
    on ia_sugerencia(docente_id, feature, request_hash);

create index if not exists idx_ia_sugerencia_planeacion
    on ia_sugerencia(planeacion_id);

create index if not exists idx_ia_sugerencia_created
    on ia_sugerencia(created_at desc);