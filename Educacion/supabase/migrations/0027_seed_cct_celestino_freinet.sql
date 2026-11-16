-- 0027_seed_cct_celestino_freinet.sql
-- Asegurar que el Jardín de Niños Celestino Freinet (CCT de prueba de la Maestra Lola)
-- esté registrado en las tablas cct y escuela para el flujo de onboarding y planeación.

insert into public.cct (
  clave,
  nombre,
  nivel,
  subnivel,
  turno,
  entidad_clave,
  entidad_nombre,
  municipio_clave,
  municipio_nombre,
  localidad_clave,
  sostenimiento,
  zona_tipo,
  pre_registro
) values (
  '22DJN0059R',
  'CELESTINO FREINET',
  'preescolar',
  'GENERAL',
  '1 - MATUTINO',
  '22',
  'QUERÉTARO',
  '014',
  'QUERÉTARO',
  '0001',
  'Público Federalizado',
  'urbana',
  false
)
on conflict (clave) do update set
  nombre = excluded.nombre,
  nivel = excluded.nivel,
  turno = excluded.turno,
  entidad_nombre = excluded.entidad_nombre,
  municipio_nombre = excluded.municipio_nombre;

insert into public.escuela (
  cct,
  nombre,
  zona_escolar
) values (
  '22DJN0059R',
  'JARDÍN DE NIÑOS CELESTINO FREINET',
  '07'
)
on conflict (cct) do update set
  nombre = excluded.nombre,
  zona_escolar = excluded.zona_escolar;
