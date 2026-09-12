-- Momento NEM y observación por actividad (formato Word / workbook preescolar).
alter table bloque
  add column if not exists momento text,
  add column if not exists observacion text;

comment on column bloque.momento is
  'Momento pedagógico (contacto, identificacion, accion, motivacion, etc.) para workbook.';
comment on column bloque.observacion is
  'Observación / evidencias de la actividad (columna Word de Lolita).';
