-- 0013_entrega_bitacora_audit_idempotency.sql
-- SPEC_TEC_02 §5.3.13, §5.3.14, §5.3.16, §5.3.17
-- Entrega al director + bitácora post-clase + audit_log + idempotency_keys

-- entrega
create table if not exists entrega (
    id                      uuid primary key default gen_random_uuid(),
    planeacion_id           uuid not null references planeacion(id) on delete cascade,
    docente_id              uuid not null references docente(id) on delete cascade,
    director_id             uuid references director(id) on delete set null,
    cct                     text not null references cct(clave),
    version                 int not null,
    estado                  text not null default 'entregada'
                            check (estado in ('entregada','recibida','con_comentarios','archivada')),
    doc_pdf_url             text not null,
    doc_pdf_storage_path    text not null,                  -- ccts/{cct}/planeaciones/{id}/{version}.pdf
    pdf_sha256              text not null,
    fecha_creacion          timestamptz not null default now(),
    fecha_entrega           timestamptz,
    fecha_recibida          timestamptz,
    comentario_director     text,
    url_firmada_token       text not null unique,
    url_firmada_expira_at   timestamptz not null,
    director_celular        text,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

comment on table entrega is
  'Entrega de planeación al director (M5/D-FIN-5). URL firmada JWT permite al director abrir sin registro. Cada edición post-entrega genera nueva versión.';

-- bitacora
create table if not exists bitacora (
    id              uuid primary key default gen_random_uuid(),
    sesion_id       uuid not null references sesion(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    planeacion_id   uuid not null references planeacion(id) on delete cascade,
    cct             text not null references cct(clave),
    fecha           date not null default current_date,
    participacion_grupo int not null check (participacion_grupo between 1 and 5),
    actividad_mejor_bloque_id uuid references bloque(id),
    dificultades    text,
    evidencia_url   text,                                  -- foto del TRABAJO del niño (NO del niño)
    evidencia_storage_path text,
    sync_estado     text not null default 'sincronizada'
                    check (sync_estado in ('pendiente_sync','sincronizada','conflicto')),
    sync_origen_ts  timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table bitacora is
  'Bitácora post-clase (Flujo C). Objetivo <30s de captura. Participación 1-5 (slider). Foto del trabajo del niño (NO del niño). sync_estado para offline-first (ADR-008).';

-- audit_log (L2-NEW-04)
create table if not exists audit_log (
    id              uuid primary key default gen_random_uuid(),
    cct             text not null references cct(clave),
    docente_id      uuid references docente(id),
    endpoint        text not null,
    method          text not null check (method in ('GET','POST','PATCH','DELETE')),
    body_hash       text,
    response_status int,
    ip              inet,
    user_agent      text,
    created_at      timestamptz not null default now()
);

comment on table audit_log is
  'Log de auditoría inmutable (L2-08). RLS por CCT (docente ve sus acciones, director ve todas las de su CCT).';

-- idempotency_keys (L2-NEW-04)
create table if not exists idempotency_keys (
    cct             text not null references cct(clave),
    key             text not null,
    endpoint        text not null,
    response_hash   text,
    expires_at      timestamptz not null,
    created_at      timestamptz not null default now(),
    primary key (cct, key)
);

comment on table idempotency_keys is
  'Idempotency keys para evitar mutaciones duplicadas (L2-08). TTL 24h.';

-- Índices
create index if not exists idx_entrega_planeacion on entrega(planeacion_id);
create index if not exists idx_entrega_docente on entrega(docente_id);
create index if not exists idx_entrega_director on entrega(director_id);
create index if not exists idx_entrega_cct on entrega(cct);
create index if not exists idx_entrega_activas on entrega(docente_id) where estado <> 'archivada';
create index if not exists idx_bitacora_sesion on bitacora(sesion_id);
create index if not exists idx_bitacora_docente on bitacora(docente_id);
create index if not exists idx_bitacora_cct on bitacora(cct);
create index if not exists idx_audit_log_cct_created on audit_log(cct, created_at desc);
create index if not exists idx_audit_log_docente on audit_log(docente_id, created_at desc);
create index if not exists idx_idempotency_expires on idempotency_keys(expires_at);
