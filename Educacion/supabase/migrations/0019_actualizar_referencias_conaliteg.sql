-- 0019_actualizar_referencias_conaliteg.sql
-- IMPL-20260818-07: URLs verificadas contra el catálogo oficial CONALITEG.

update referencia_libro_conaliteg
set
  url_publica = case id
    when 1 then 'https://libros.conaliteg.gob.mx/2025/K1MLA.htm'
    when 2 then 'https://libros.conaliteg.gob.mx/2025/K2MLA.htm'
    when 3 then 'https://libros.conaliteg.gob.mx/2025/K3MLA.htm'
    when 4 then 'https://libros.conaliteg.gob.mx/2025/K1LDG.htm'
    when 5 then 'https://libros.conaliteg.gob.mx/2025/K2LDG.htm'
    when 6 then 'https://libros.conaliteg.gob.mx/2025/K3LDG.htm'
    when 7 then 'https://libros.conaliteg.gob.mx/2025/K1LMA.htm'
    when 8 then 'https://libros.conaliteg.gob.mx/2025/K2LMA.htm'
    when 9 then 'https://libros.conaliteg.gob.mx/2025/K3LMA.htm'
    when 10 then 'https://libros.conaliteg.gob.mx/2023/K1MAA.htm'
    when 11 then 'https://libros.conaliteg.gob.mx/2023/K2MAA.htm'
    when 12 then 'https://libros.conaliteg.gob.mx/2023/K3MAA.htm'
    when 13 then 'https://libros.conaliteg.gob.mx/2025/K1LPA.htm'
    when 14 then 'https://libros.conaliteg.gob.mx/2025/K2LPA.htm'
    when 15 then 'https://libros.conaliteg.gob.mx/2025/K3LPA.htm'
    when 16 then 'https://libros.conaliteg.gob.mx/2025/K0CFA.htm'
    when 17 then 'https://libros.conaliteg.gob.mx/2025/K0LPM.htm'
    when 18 then 'https://libros.conaliteg.gob.mx/2025/K0MTM.htm'
    when 19 then 'https://libros.conaliteg.gob.mx/2025/K0TAM.htm'
  end,
  edicion = case when id between 10 and 12 then '2023-2024' else '2025-2026' end,
  fecha_acceso = date '2026-08-18',
  notas = case when id between 10 and 12 then 'referencia_historica_validada' else 'validado_portal_oficial' end
where id between 1 and 19;
