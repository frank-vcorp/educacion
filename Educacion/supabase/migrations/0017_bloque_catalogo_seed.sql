-- 0017_bloque_catalogo_seed.sql
-- SPEC_TEC_02 §5.1.11 — bloque_catalogo (catálogo M1) D-FIN-1
-- 30-50 bloques MVP atados a PDA oficiales, 6 tipos, 3 niveles de flexibilidad.

-- ============ bloque_catalogo (tabla) ============
create table if not exists bloque_catalogo (
    id                          uuid primary key default gen_random_uuid(),
    codigo                      text unique not null,                 -- 'BLQ-F2-LNG-001'
    nombre                      text not null,
    descripcion                 text,
    tipo                        text not null check (tipo in (
                                'apertura','desarrollo','practica','cierre',
                                'evaluacion','evaluacion_semanal','banco_palabras')),
    nivel_flexibilidad          text not null check (nivel_flexibilidad in (
                                'cerrado','abierto','en_blanco')),
    contenido_textual           text,                                 -- texto del bloque (editable si abierto/en_blanco)
    pda_ids                     text[] not null default '{}',
    campos_formativos           text[] not null default '{}',
    ejes_articuladores          text[] not null default '{}',
    recursos_requeridos         jsonb default '[]'::jsonb,           -- [{categoria, clave_busqueda, cantidad}]
    modalidades_compatibles     text[] not null default '{proyecto_comunitario}',
    duracion_min                int,
    catalogo_version            text not null references catalogo_version(codigo),
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

comment on table bloque_catalogo is
  'Catálogo M1 de bloques arrastrables (D-FIN-1). 3 niveles: cerrado (texto fijo), abierto (maestra edita), en_blanco (estructura + maestra escribe). 6 tipos pedagógicos.';

create index if not exists idx_bloque_catalogo_tipo on bloque_catalogo(tipo);
create index if not exists idx_bloque_catalogo_campos on bloque_catalogo using gin (campos_formativos);
create index if not exists idx_bloque_catalogo_pdas on bloque_catalogo using gin (pda_ids);

-- ============ SEED: 36 bloques MVP atados a PDA ============
-- Distribución: 4 campos × 9 bloques (1 apertura + 5 desarrollo + 2 práctica + 1 cierre)
-- Niveles: 50% cerrado, 35% abierto, 15% en_blanco

insert into bloque_catalogo (codigo, nombre, descripcion, tipo, nivel_flexibilidad, contenido_textual, pda_ids, campos_formativos, ejes_articuladores, recursos_requeridos, modalidades_compatibles, duracion_min, catalogo_version) values

-- ====== LENGUAJES (9 bloques) ======
('BLQ-F2-LNG-001', 'Ronda de inicio: ¿qué escuchamos hoy?',
  'Activación auditiva y conversación grupal sobre sonidos del entorno.',
  'apertura', 'cerrado',
  'La docente invita al grupo a sentarse en círculo. Cierra los ojos y pregunta: "¿Qué sonidos escuchamos ahora?". Después de 30 segundos, cada niña/niño comparte qué escuchó. La docente anota 3-4 palabras en el pizarrón.',
  array['PDA-F2-LNG-001'], array['LENGUAJES'], array['INCLUSION','APROPIACION_CULTURAS_LECTURA'],
  '[{"categoria":"sensoriales","clave_busqueda":"audifonos","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-002', 'Narración colectiva de un cuento semilla',
  'Lectura en voz alta con participation grupal.',
  'desarrollo', 'abierto',
  'La docente lee el cuento "[TÍTULO]" pausing en momentos clave. Pregunta: "¿Qué crees que pasará después?". Las niñas/niños proponen finales. Se construye una versión colectiva.',
  array['PDA-F2-LNG-002'], array['LENGUAJES'], array['PENSAMIENTO_CRITICO','APROPIACION_CULTURAS_LECTURA'],
  '[{"categoria":"impresos","clave_busqueda":"cuento","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-003', 'Dramatización de personajes',
  'Asignación y ensayo de roles del cuento.',
  'desarrollo', 'abierto',
  'Se asignan personajes a las niñas/niños (1-2 por rol). Cada equipo prepara su personaje con el apoyo de la docente. Ensayo general de 10 minutos.',
  array['PDA-F2-LNG-002','PDA-F2-LNG-003'], array['LENGUAJES'], array['INCLUSION','ARTES_EXPERIENCIAS_ESTETICAS'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 25, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-004', 'Dibujo del personaje favorito',
  'Representación gráfica individual.',
  'practica', 'cerrado',
  'Cada niña/niño dibuja su personaje favorito del cuento. La docente circula, pregunta "¿por qué te gusta?" y anota la respuesta al lado del dibujo.',
  array['PDA-F2-LNG-004'], array['LENGUAJES'], array['ARTES_EXPERIENCIAS_ESTETICAS'],
  '[{"categoria":"plasticos","clave_busqueda":"colores","cantidad":20}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-005', 'Escribir el nombre del personaje',
  'Práctica de escritura emergente.',
  'practica', 'en_blanco',
  'La docente escribe el modelo del nombre del personaje en el pizarrón. Cada niña/niño intenta copiarlo en su hoja.',
  array['PDA-F2-LNG-004'], array['LENGUAJES'], array['APROPIACION_CULTURAS_LECTURA'],
  '[{"categoria":"impresos","clave_busqueda":"hojas","cantidad":20},{"categoria":"plasticos","clave_busqueda":"lapiz","cantidad":20}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-006', 'Canción temática del cuento',
  'Melodía repetitiva para fijar vocabulario.',
  'desarrollo', 'cerrado',
  'Se enseña la canción "[TÍTULO DE CANCIÓN]" vinculada al cuento. Se repite 3 veces. Se invita a las niñas/niños a proponer movimientos.',
  array['PDA-F2-LNG-003'], array['LENGUAJES'], array['ARTES_EXPERIENCIAS_ESTETICAS','INCLUSION'],
  '[{"categoria":"musicales","clave_busqueda":"instrumentos","cantidad":5}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-007', 'Círculo de cierre: lo que aprendí',
  'Reflexión grupal.',
  'cierre', 'abierto',
  'En círculo, cada niña/niño comparte una palabra o frase corta sobre lo aprendido. La docente conecta las ideas con el PDA trabajado.',
  array['PDA-F2-LNG-001','PDA-F2-LNG-002'], array['LENGUAJES'], array['PENSAMIENTO_CRITICO'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-008', 'Registro en bitácora del grupo',
  'Documentación visual.',
  'practica', 'en_blanco',
  'La docente dicta y las niñas/niños "escriben" (con dibujo o pseudografía) en su bitácora individual qué hicieron hoy.',
  array['PDA-F2-LNG-004'], array['LENGUAJES'], array['APROPIACION_CULTURAS_LECTURA'],
  '[{"categoria":"impresos","clave_busqueda":"bitacora","cantidad":20}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-LNG-009', 'Evaluación semanal de lengua',
  'Rúbrica semanal.',
  'evaluacion_semanal', 'cerrado',
  'La docente observa a cada niña/niño durante actividades de lengua de la semana y registra nivel (🟢 � 🟠 🔴) usando la rúbrica del proyecto.',
  array['PDA-F2-LNG-001'], array['LENGUAJES'], array['INCLUSION'],
  '[]'::jsonb,
  array['proyecto_comunitario'], 30, 'PLAN_2022_ED_2025_FASE_2'),

-- ====== SABERES Y PENSAMIENTO CIENTÍFICO (9 bloques) ======
('BLQ-F2-SPC-001', 'Observación del entorno natural',
  'Activación sensorial con elementos naturales.',
  'apertura', 'cerrado',
  'La docente coloca en el centro del círculo 3-4 objetos naturales (piedra, hoja, flor, rama). Pregunta: "¿Qué ven? ¿Qué sienten?". Las niñas/niños exploran con los 5 sentidos (sin oler ni saborear objetos no seguros).',
  array['PDA-F2-SPC-001'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['PENSAMIENTO_CRITICO','VIDA_SALUDABLE'],
  '[{"categoria":"manipulativos","clave_busqueda":"objetos_naturales","cantidad":4}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-002', 'Conteo y clasificación',
  'Actividad matemática con material concreto.',
  'desarrollo', 'abierto',
  'Con semillas, tapas o botones, las niñas/niños forman grupos de [CANTIDAD]. Después clasifican por color/tamaño. La docente introduce el número y la operación básica.',
  array['PDA-F2-SPC-002'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['PENSAMIENTO_CRITICO'],
  '[{"categoria":"manipulativos","clave_busqueda":"semillas","cantidad":50}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-003', 'Experimento: ¿qué flota?',
  'Hipótesis y experimentación.',
  'desarrollo', 'abierto',
  'La docente muestra 4 objetos y pregunta: "¿Cuál creen que flota?". Las niñas/niños votan. Después prueban en una tina con agua. Anotan resultados con dibujo.',
  array['PDA-F2-SPC-003'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['PENSAMIENTO_CRITICO'],
  '[{"categoria":"manipulativos","clave_busqueda":"tina","cantidad":1},{"categoria":"manipulativos","clave_busqueda":"objetos","cantidad":4}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 25, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-004', 'Patrones con bloques',
  'Continuación de secuencias.',
  'desarrollo', 'cerrado',
  'La docente muestra una secuencia (rojo-azul-rojo-azul-?) y pide continuarla. Aumenta dificultad progresivamente (formas, tamaños).',
  array['PDA-F2-SPC-002'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['PENSAMIENTO_CRITICO'],
  '[{"categoria":"manipulativos","clave_busqueda":"bloques","cantidad":30}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-005', 'Medición con el cuerpo',
  'Comparación de longitudes.',
  'practica', 'abierto',
  'Las niñas/niños miden objetos del aula usando manos, pies y palmas. La docente introduce términos: "más largo", "más corto", "igual".',
  array['PDA-F2-SPC-002'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['PENSAMIENTO_CRITICO'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-006', 'Dibujo del experimento',
  'Registro gráfico de resultados.',
  'practica', 'en_blanco',
  'Cada niña/niño dibuja lo que observó en el experimento. La docente circula y pregunta "¿qué pasó?".',
  array['PDA-F2-SPC-003'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['ARTES_EXPERIENCIAS_ESTETICAS'],
  '[{"categoria":"plasticos","clave_busqueda":"colores","cantidad":20}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-007', 'Figura geométrica del día',
  'Identificación en el entorno.',
  'desarrollo', 'cerrado',
  'La docente presenta la figura "[FIGURA]". Las niñas/niños buscan objetos del aula con esa forma. Se registra en una tabla colectiva.',
  array['PDA-F2-SPC-002'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['PENSAMIENTO_CRITICO'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-008', 'Cierre: ¿qué aprendimos?',
  'Reflexión grupal.',
  'cierre', 'abierto',
  'En círculo, cada niña/niño dice algo que aprendió sobre [TEMA]. La docente anota las ideas en un papelógrafo para exhibir en el salón.',
  array['PDA-F2-SPC-001'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['PENSAMIENTO_CRITICO'],
  '[{"categoria":"impresos","clave_busqueda":"papelografo","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-SPC-009', 'Evaluación semanal de pensamiento científico',
  'Rúbrica semanal.',
  'evaluacion_semanal', 'cerrado',
  'Observación y registro de nivel 🟢🟡�🔴 para cada niña/niño durante las actividades de la semana.',
  array['PDA-F2-SPC-001'], array['SABERES_PENSAMIENTO_CIENTIFICO'], array['INCLUSION'],
  '[]'::jsonb,
  array['proyecto_comunitario'], 30, 'PLAN_2022_ED_2025_FASE_2'),

-- ====== ÉTICA, NATURALEZA Y SOCIEDADES (9 bloques) ======
('BLQ-F2-ENS-001', 'Asamblea: ¿cómo nos sentimos hoy?',
  'Bienestar emocional grupal.',
  'apertura', 'cerrado',
  'En círculo, cada niña/niño comparte cómo se siente hoy usando las tarjetas de emociones. La docente valida y pregunta "¿qué crees que te hizo sentir así?".',
  array['PDA-F2-ENS-001'], array['ETICA_NATURALEZA_SOCIEDADES'], array['INCLUSION','VIDA_SALUDABLE','IGUALDAD_GENERO'],
  '[{"categoria":"simbolicos","clave_busqueda":"emociones","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-002', 'Cuidado del entorno: recorrido por la escuela',
  'Conciencia ambiental.',
  'desarrollo', 'abierto',
  'Salida al patio o jardín. Las niñas/niños observan y registran (con foto o dibujo) un elemento natural que quieran cuidar. Se dialoga sobre por qué es importante.',
  array['PDA-F2-ENS-002'], array['ETICA_NATURALEZA_SOCIEDADES'], array['VIDA_SALUDABLE','INTERCULTURALIDAD_CRITICA'],
  '[{"categoria":"plasticos","clave_busqueda":"cuaderno","cantidad":1}]'::jsonb,
  array['proyecto_comunitario'], 30, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-003', 'Diálogo sobre la convivencia',
  'Resolución de conflictos.',
  'desarrollo', 'abierto',
  'La docente presenta una situación hipotética ("dos niñas quieren el mismo juguete"). El grupo propone soluciones. Se llega a un acuerdo colectivo.',
  array['PDA-F2-ENS-003'], array['ETICA_NATURALEZA_SOCIEDADES'], array['IGUALDAD_GENERO','PENSAMIENTO_CRITICO'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-004', 'Rincón de la calma',
  'Regulación emocional.',
  'practica', 'cerrado',
  'Se presenta el "rincón de la calma" del salón. Cada niña/niño conoce los materiales (mantas, cojines, botella de la calma) y puede usarlo cuando lo necesite.',
  array['PDA-F2-ENS-001'], array['ETICA_NATURALEZA_SOCIEDADES'], array['VIDA_SALUDABLE','INCLUSION'],
  '[{"categoria":"sensoriales","clave_busqueda":"cojines","cantidad":4},{"categoria":"sensoriales","clave_busqueda":"botella_calma","cantidad":2}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-005', 'Reflexión sobre igualdad',
  'Identificación de estereotipos.',
  'desarrollo', 'abierto',
  'La docente lee un cuento con personajes que rompen estereotipos de género. Se dialoga: "¿qué te pareció? ¿por qué?".',
  array['PDA-F2-ENS-003'], array['ETICA_NATURALEZA_SOCIEDADES'], array['IGUALDAD_GENERO','INTERCULTURALIDAD_CRITICA'],
  '[{"categoria":"impresos","clave_busqueda":"cuento","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-006', 'Cartel coletivo del cuidado',
  'Producción colectiva.',
  'practica', 'en_blanco',
  'En equipos, las niñas/niños crean un cartel sobre cómo cuidar [ELEMENTO: agua/plantas/juguetes]. Se exhiben en el salón.',
  array['PDA-F2-ENS-002'], array['ETICA_NATURALEZA_SOCIEDADES'], array['ARTES_EXPERIENCIAS_ESTETICAS','VIDA_SALUDABLE'],
  '[{"categoria":"plasticos","clave_busqueda":"cartulina","cantidad":4},{"categoria":"plasticos","clave_busqueda":"colores","cantidad":12}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 25, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-007', 'Cuentacuentos de la tradición',
  'Transmisión cultural.',
  'desarrollo', 'cerrado',
  'La docente narra un cuento de la tradición oral de la comunidad (previamente acordado con familias). Se invita a una abuela/abuelo a compartirlo.',
  array['PDA-F2-ENS-003'], array['ETICA_NATURALEZA_SOCIEDADES'], array['INTERCULTURALIDAD_CRITICA','APROPIACION_CULTURAS_LECTURA'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-008', 'Círculo de cierre: acuerdos del grupo',
  'Construcción de normas.',
  'cierre', 'abierto',
  'Se dialoga sobre cómo nos sentimos esta semana. Se reconstruyen o ajustan los acuerdos del grupo. Se documenta con dibujo.',
  array['PDA-F2-ENS-001','PDA-F2-ENS-003'], array['ETICA_NATURALEZA_SOCIEDADES'], array['INCLUSION','IGUALDAD_GENERO'],
  '[{"categoria":"impresos","clave_busqueda":"papel","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-ENS-009', 'Evaluación semanal socio-emocional',
  'Rúbrica semanal.',
  'evaluacion_semanal', 'cerrado',
  'La docente observa y registra nivel 🟢🟡�🔴 en cada niña/niño considerando los PDA socio-emocionales.',
  array['PDA-F2-ENS-001'], array['ETICA_NATURALEZA_SOCIEDADES'], array['INCLUSION'],
  '[]'::jsonb,
  array['proyecto_comunitario'], 30, 'PLAN_2022_ED_2025_FASE_2'),

-- ====== DE LO HUMANO Y LO COMUNITARIO (9 bloques) ======
('BLQ-F2-HCO-001', 'Buenos días personalizado',
  'Reconocimiento individual.',
  'apertura', 'cerrado',
  'La docente saluda a cada niña/niño por su nombre al entrar. Pregunta: "¿cómo amaneciste?". 2-3 minutos por niña/niño.',
  array['PDA-F2-HCO-001'], array['LO_HUMANO_LO_COMUNITARIO'], array['INCLUSION','VIDA_SALUDABLE'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-002', 'Juego cooperativo',
  'Construcción de comunidad.',
  'desarrollo', 'abierto',
  'Se propone un juego donde el grupo debe coordinarse para lograr un objetivo común (ej. mover una pelota sin usar manos). Se rota la responsabilidad.',
  array['PDA-F2-HCO-002'], array['LO_HUMANO_LO_COMUNITARIO'], array['INCLUSION','IGUALDAD_GENERO'],
  '[{"categoria":"musicales","clave_busqueda":"pelota","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-003', 'Reconocimiento del cuerpo',
  'Identidad y autoconocimiento.',
  'desarrollo', 'abierto',
  'Frente a un espejo o en parejas, las niñas/niños identifican y nombran partes de su cuerpo. Se respeta el pudor con opciones de participación.',
  array['PDA-F2-HCO-001'], array['LO_HUMANO_LO_COMUNITARIO'], array['VIDA_SALUDABLE'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-004', 'Mis sabores favoritos',
  'Identidad cultural y alimentaria.',
  'desarrollo', 'cerrado',
  'En pequeños grupos, las niñas/niños comparten qué alimentos les gustan de su casa. La docente pregunta "¿quién lo cocina?" para reconocer cuidadores.',
  array['PDA-F2-HCO-003'], array['LO_HUMANO_LO_COMUNITARIO'], array['VIDA_SALUDABLE','INTERCULTURALIDAD_CRITICA'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-005', 'Autorretrato',
  'Representación de identidad.',
  'practica', 'en_blanco',
  'Cada niña/niño se dibuja a sí mismo. La docente circula, pregunta "¿qué te gusta de ti?" y anota respuestas.',
  array['PDA-F2-HCO-001'], array['LO_HUMANO_LO_COMUNITARIO'], array['ARTES_EXPERIENCIAS_ESTETICAS'],
  '[{"categoria":"plasticos","clave_busqueda":"colores","cantidad":20},{"categoria":"impresos","clave_busqueda":"hojas","cantidad":20}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-006', 'Cuento motor: mi cuerpo se mueve',
  'Expresión corporal.',
  'desarrollo', 'cerrado',
  'La docente narra un cuento donde el cuerpo es protagonista. Las niñas/niños realizan los movimientos sugeridos (saltar, girar, estirarse).',
  array['PDA-F2-HCO-002'], array['LO_HUMANO_LO_COMUNITARIO'], array['VIDA_SALUDABLE','ARTES_EXPERIENCIAS_ESTETICAS'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 15, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-007', 'Familia y comunidad',
  'Vínculos y referentes.',
  'desarrollo', 'abierto',
  'Las niñas/niños comparten quién vive con ellas/ellos. La docente dibuja un "árbol familiar" colectivo respetando diversidad de configuraciones.',
  array['PDA-F2-HCO-003'], array['LO_HUMANO_LO_COMUNITARIO'], array['INTERCULTURALIDAD_CRITICA','INCLUSION','IGUALDAD_GENERO'],
  '[{"categoria":"impresos","clave_busqueda":"papelografo","cantidad":1}]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 20, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-008', 'Cierre: lo que me llevo',
  'Reflexión personal.',
  'cierre', 'en_blanco',
  'Cada niña/niño dice una palabra o frase corta que se lleva del día. La docente registra en el pizarrón.',
  array['PDA-F2-HCO-001','PDA-F2-HCO-002'], array['LO_HUMANO_LO_COMUNITARIO'], array['PENSAMIENTO_CRITICO'],
  '[]'::jsonb,
  array['proyecto_comunitario','unidad_didactica'], 10, 'PLAN_2022_ED_2025_FASE_2'),

('BLQ-F2-HCO-009', 'Evaluación semanal humana-comunitaria',
  'Rúbrica semanal.',
  'evaluacion_semanal', 'cerrado',
  'Observación y registro de nivel 🟢🟡🟠🔴 para cada niña/niño considerando los PDA de lo humano y comunitario.',
  array['PDA-F2-HCO-001'], array['LO_HUMANO_LO_COMUNITARIO'], array['INCLUSION'],
  '[]'::jsonb,
  array['proyecto_comunitario'], 30, 'PLAN_2022_ED_2025_FASE_2')

on conflict (codigo) do nothing;
