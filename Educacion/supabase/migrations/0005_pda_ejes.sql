-- 0005_pda_ejes.sql
-- SPEC_TEC_02 §5.1.8 — pda_ejes (vacío inicialmente, se poblará después)
-- DM-01: recomendación (a) — dejar vacío, maestra selecciona ejes libremente al crear planeación

create table if not exists pda_ejes (
    pda_codigo          text not null references pda(codigo),
    eje_codigo          text not null references eje_articulador(codigo),
    primary key (pda_codigo, eje_codigo),
    created_at          timestamptz not null default now()
);

comment on table pda_ejes is
  'Asociación PDA ↔ ejes articuladores. NOTA: el catálogo JSON Fase 2 tiene pda_ejes vacío (0 registros). Decisión DP-08 en SPEC_01: dejar tabla vacía pero existente para futuras cargas. La maestra selecciona ejes al crear planeación (no depende de esta tabla).';
