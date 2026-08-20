"""
constants.py — Datos canónicos oficiales Fase 2 NEM
Fuentes: E14 §5.1 (modelo relacional) + Plan de Estudio 2022 SEP (descripciones oficiales).
Estos datos son CONSTANTES y se hardcodean; no se extraen del PDF escaneado.

Si la SEP publica una nueva edición del Plan 2022, actualizar aquí y versionar
catalogo_version en la BD (E10 protocolo de sincronización normativa).
"""

# Versión canónica del catálogo (E14 §5.1)
CATALOGO_VERSION = {
    "codigo": "PLAN_2022_ED_2025_FASE_2",
    "nombre": "Plan de Estudio 2022 — Fase 2 (Preescolar)",
    "fecha_vigencia": "2025-08-01",
    "fuente_dof": "Acuerdo 14/08/22 + Anexo 06/08/23",
}

# Ejes articuladores (7 oficiales del Plan 2022 SEP)
EJES_ARTICULADORES = [
    {"codigo": "INCLUSION", "nombre": "Inclusión", "orden": 1,
     "descripcion": "Parte del reconocimiento de que cada persona tiene capacidades, ritmos y estilos de aprendizaje distintos, y de que el sistema educativo debe generar las condiciones para que todos participen y aprendan."},
    {"codigo": "PENSAMIENTO_CRITICO", "nombre": "Pensamiento crítico", "orden": 2,
     "descripcion": "Implica el ejercicio de un análisis reflexivo y argumentado sobre los hechos, las ideas y los problemas, para tomar decisiones informadas y responsables."},
    {"codigo": "INTERCULTURALIDAD_CRITICA", "nombre": "Interculturalidad crítica", "orden": 3,
     "descripcion": "Reconoce la diversidad cultural del país y promueve el diálogo entre saberes, cosmovisiones y prácticas sociales para construir relaciones equitativas."},
    {"codigo": "IGUALDAD_GENERO", "nombre": "Igualdad de género", "orden": 4,
     "descripcion": "Promueve condiciones equitativas entre mujeres y hombres, e impulsa el reconocimiento de los derechos humanos y la no discriminación."},
    {"codigo": "VIDA_SALUDABLE", "nombre": "Vida saludable", "orden": 5,
     "descripcion": "Favorece el desarrollo integral mediante el cuidado del cuerpo, la alimentación, la actividad física y el bienestar emocional."},
    {"codigo": "APROPIACION_CULTURAS_LECTURA", "nombre": "Apropiación de las culturas a través de la lectura y la escritura", "orden": 6,
     "descripcion": "Reconoce la lectura y la escritura como prácticas sociales y culturales que permiten a las personas participar en la vida pública y en el ejercicio de la ciudadanía."},
    {"codigo": "ARTES_EXPERIENCIAS_ESTETICAS", "nombre": "Artes y experiencias estéticas", "orden": 7,
     "descripcion": "Promueve el acercamiento a las manifestaciones artísticas y la valoración de las experiencias estéticas como parte del desarrollo humano."},
]

# Campos formativos (4 oficiales de Fase 2)
CAMPOS_FORMATIVOS = [
    {"codigo": "LENGUAJES", "nombre": "Lenguajes", "orden": 1,
     "descripcion": "El campo formativo Lenguajes tiene como propósito que las niñas y los niños se apropien de las prácticas sociales del lenguaje para participar en la vida social, expresar ideas, emociones y construir significados. Involucra la lengua oral, la lengua escrita, las lenguas indígenas, las artes y los lenguajes visuales, sonoros y corporales."},
    {"codigo": "SABERES_PENSAMIENTO_CIENTIFICO", "nombre": "Saberes y Pensamiento Científico", "orden": 2,
     "descripcion": "Promueve que las niñas y los niños construyan explicaciones del mundo natural y social mediante la observación, la experimentación y el razonamiento. Involucra matemáticas, ciencias naturales y experimentales, y pensamiento crítico."},
    {"codigo": "ETICA_NATURALEZA_SOCIEDADES", "nombre": "Ética, Naturaleza y Sociedades", "orden": 3,
     "descripcion": "Aborda la relación entre las personas, la naturaleza y la sociedad desde una perspectiva ética. Promueve la reflexión sobre el entorno, el cuidado del ambiente, la convivencia y la responsabilidad social."},
    {"codigo": "LO_HUMANO_LO_COMUNITARIO", "nombre": "De lo Humano y lo Comunitario", "orden": 4,
     "descripcion": "Reconoce la identidad personal y colectiva como construcción social, y promueve el bienestar integral, la salud, la convivencia, la educación emocional y la formación para la vida en comunidad."},
]

# Fases (Plan 2022 SEP, 6 oficiales; solo Fase 2 en este MVP)
FASES = [
    {"codigo": "FASE_1", "numero": 1, "nombre": "Inicial", "rango_edad": "0-3 años"},
    {"codigo": "FASE_2", "numero": 2, "nombre": "Preescolar", "rango_edad": "3-6 años"},
    {"codigo": "FASE_3", "numero": 3, "nombre": "Primaria (1°-3°)", "rango_edad": "6-9 años"},
    {"codigo": "FASE_4", "numero": 4, "nombre": "Primaria (4°-6°)", "rango_edad": "9-12 años"},
    {"codigo": "FASE_5", "numero": 5, "nombre": "Secundaria (1°-3°)", "rango_edad": "12-15 años"},
    {"codigo": "FASE_6", "numero": 6, "nombre": "Medio Superior", "rango_edad": "15-18 años"},
]

# Referencias CONALITEG — vacías por regla del SPEC E14 §3: "NO se descarga el contenido editorial".
# El founder completará manualmente las URLs después de la Capa 2.
# Estructura mínima (placeholder) por campo × nivel preescolar:
CONALITEG_REFERENCES_PLACEHOLDER = [
    # Se generan 3 niveles × 4 campos = 12 placeholders vacíos para Fase 2
    {"grado": "1° preescolar", "campo": "Lenguajes", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "1° preescolar", "campo": "Saberes y Pensamiento Científico", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "1° preescolar", "campo": "Ética, Naturaleza y Sociedades", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "1° preescolar", "campo": "De lo Humano y lo Comunitario", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "2° preescolar", "campo": "Lenguajes", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "2° preescolar", "campo": "Saberes y Pensamiento Científico", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "2° preescolar", "campo": "Ética, Naturaleza y Sociedades", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "2° preescolar", "campo": "De lo Humano y lo Comunitario", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "3° preescolar", "campo": "Lenguajes", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "3° preescolar", "campo": "Saberes y Pensamiento Científico", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "3° preescolar", "campo": "Ética, Naturaleza y Sociedades", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
    {"grado": "3° preescolar", "campo": "De lo Humano y lo Comunitario", "titulo_libro": None, "url_publica": None, "isbn": None, "edicion": "2024", "notas": "requiere_revision_humana: pendiente verificación CONALITEG"},
]
