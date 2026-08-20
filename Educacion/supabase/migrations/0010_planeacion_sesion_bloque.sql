-- 0010_planeacion_sesion_bloque.sql
-- SPEC_TEC_02 §5.3.6, §5.3.7, §5.3.8
-- Tablas tenant para Flujo A (planeación didáctica)

-- planeacion
create table if not exists planeacion (
    id                  uuid primary key default gen_random_uuid(),
    docente_id          uuid not null references docente(id) on delete cascade,
    grupo_id            uuid not null references grupo(id) on delete cascade,
    cct                 text not null references cct(clave),
    nombre              text not null,
    modalidad           text not null default 'proyecto_comunitario'
                        check (modalidad in ('proyecto_comunitario','unidad_didactica','abj','rincones','centros_interes','taller_critico')),
    problema_contexto   text not null,                      -- M2: pregunta detonadora (validado no-vacío)
    proposito           text,
    campos_formativos   text[] not null,                    -- códigos: {LENGUAJES, ...}
    ejes_articuladores  text[] not null default '{}',       -- códigos: {INCLUSION, ...}
    pdas                text[] not null,                    -- códigos PDA
    contenido_ref       text references contenido(codigo),
    producto_integrador text,                              -- obligatorio para exportar PDF
    ajustes_razonables  text,                              -- inclusión, ≥1 frase
    banco_palabras      text[] default '{}',                -- D-FIN-7
    periodo_tipo        text not null default 'rango_fechas'
                        check (periodo_tipo in ('rango_fechas','mensual','trimestral','semestral')),
    periodo_inicio      date not null,
    periodo_fin         date not null,
    estado              text not null default 'borrador'
                        check (estado in ('borrador','lista','entregada','archivada')),
    clonada_de          uuid references planeacion(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    check (periodo_fin >= periodo_inicio)
);

comment on table planeacion is
  'Planeación/proyecto del docente (Flujo A). Modalidad adaptativa. MVP: solo Proyecto Comunitario. campos_formativos ≥1, pdas ≥1, producto_integrador obligatorio para exportar.';

-- sesion
create table if not exists sesion (
    id              uuid primary key default gen_random_uuid(),
    planeacion_id   uuid not null references planeacion(id) on delete cascade,
    docente_id      uuid not null references docente(id) on delete cascade,
    cct             text not null references cct(clave),
    numero          int not null,                          -- orden dentro de la planeación
    fase_interna    text not null check (fase_interna in ('inicio','desarrollo','cierre')),
    fecha           date,                                  -- asignada al calendarizar (Flujo B)
    duracion_min    int,
    ajustes_sesion  text,                                  -- D-FIN-9: plan B documentado, 200 chars
    estado          text not null default 'pendiente'
                    check (estado in ('pendiente','completa','cancelada')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (planeacion_id, numero)
);

comment on table sesion is
  'Sesión dentro de una planeación. fase_interna: inicio (≥1), desarrollo (≥2), cierre (≥1) para cumplir contrato NEM.';

-- bloque
create table if not exists bloque (
    id                  uuid primary key default gen_random_uuid(),
    sesion_id           uuid not null references sesion(id) on delete cascade,
    planeacion_id       uuid not null references planeacion(id) on delete cascade,
    docente_id          uuid not null references docente(id) on delete cascade,
    cct                 text not null references cct(clave),
    bloque_catalogo_id  text,
    tipo                text not null check (tipo in (
                        'apertura','desarrollo','practica','cierre',
                        'evaluacion','evaluacion_semanal','banco_palabras')),
    nivel_flexibilidad  text not null check (nivel_flexibilidad in ('cerrado','abierto','en_blanco')),
    contenido_textual   text,                              -- texto del bloque (editable si abierto/en_blanco)
    pda_ids             text[] not null default '{}',
    campos_formativos   text[] not null default '{}',
    ejes_articuladores  text[] not null default '{}',
    recursos_requeridos jsonb default '[]'::jsonb,         -- lista de {categoria, clave_busqueda, cantidad}
    duracion_min        int,
    orden               int not null,                      -- orden dentro de la sesión
    origen              text not null default 'maestra'
                        check (origen in ('maestra','ia_sugerencia','maestra_editado_de_ia','kit_template')),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table bloque is
  'Bloque arrastrado del catálogo M1 a una sesión. 3 niveles de flexibilidad (cerrado/abierto/en_blanco). origen: provenance del texto (P-PD9 audit trail). PDA SIEMPRE del catálogo (P-PD2).';

-- Índices hot (sección 8)
create index if not exists idx_planeacion_docente on planeacion(docente_id);
create index if not exists idx_planeacion_grupo on planeacion(grupo_id);
create index if not exists idx_sesion_planeacion on sesion(planeacion_id);
create index if not exists idx_sesion_docente on sesion(docente_id);
create index if not exists idx_bloque_sesion on bloque(sesion_id);
create index if not exists idx_bloque_planeacion on bloque(planeacion_id);
create index if not exists idx_planeacion_cct on planeacion(cct);
create index if not exists idx_sesion_cct on sesion(cct);
create index if not exists idx_bloque_cct on bloque(cct);
