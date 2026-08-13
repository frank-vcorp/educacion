# E14 — SPEC DE CATALOGACIÓN AUTÓNOMA FASE 2 (PREESCOLAR)

**Versión:** 0.1
**Fecha:** 2026-08-13
**Estado:** ESPECIFICACIÓN OPERATIVA (motor de catalogación, no de producto)
**Origen:** Discovery fundador (preguntar cómo tener los contenidos en la plataforma)
**Decisiones del founder que gobiernan este SPEC:**
- **Alcance MVP:** solo Fase 2 (preescolar)
- **Quién lo hace:** script autónomo + validación humana del founder
- **Modelo de datos:** relacional completo con referencia a libros CONALITEG
**Alineado a:** `SPEC_MVP_01_Modulo_Docente.md` §5 (Catálogo NEM), `E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md` (mantenimiento)

---

## 1. OBJETIVO

Producir, sin intervención humana continua, una **base de datos relacional canónica** de los contenidos oficiales NEM **Fase 2 (preescolar)** que pueda cargarse en Supabase y alimentar el constructor de proyectos de la plataforma.

**Output final:** un conjunto de tablas SQL + JSON canónico + reporte de auditoría humana.

---

## 2. ALCANCE EXPLÍCITO

| Entra | No entra |
|---|---|
| 4 campos formativos (nombres canónicos) | Fases 1, 3, 4, 5, 6 |
| 7 ejes articuladores (nombres canónicos) | Programa analítico contextual (depende del docente) |
| ~24-30 PDA de Fase 2 (texto oficial del DOF) | Material editorial CONALITEG (solo **referencias**) |
| Contenidos oficiales Fase 2 (texto del DOF) | Recursos didácticos privados / de pago |
| Referencias bibliográficas a libros de texto oficiales | Datos de alumnos, docentes específicos |
| Trazabilidad: cada PDA con su origen (DOF + página + SHA) | Versiones históricas (solo "última versión oficial vigente") |

---

## 3. FUENTES DE DATOS — DECLARADAS Y AUDITABLES

| # | Fuente | URL / Archivo en `fuentes/` | Uso |
|---|---|---|---|
| **F1** | Anexo Acuerdo 14/08/22 — Programas Sintéticos | `fuentes/01_normativa_nem/anexo_acuerdo_14_08_22_programas_sinteticos.pdf` (44 MB) | **PDF maestro**: contiene los PDA de Fase 2 con texto oficial. |
| **F2** | Plan de Estudio 2022 SEP (libro oficial) | `fuentes/01_normativa_nem/plan_estudio_2022_SEP_oficial.pdf` (3.2 MB, 200 pp) | Definiciones oficiales de campos formativos y ejes articuladores (descripciones canónicas). |
| **F3** | Acuerdo 14/08/22 + Acuerdo 06/08/23 | `fuentes/01_normativa_nem/acuerdo_14_08_22_plan_estudios_*.md` + `acuerdo_06_08_23_modificacion_*.md` | Contexto normativo (qué fase aplica, desde cuándo). |
| **F4** | CONALITEG — Catálogo público de libros | https://libros.conaliteg.gob.mx/ | URLs + metadatos de libros por grado. **NO se descarga el contenido editorial** (cumplimiento §3 anti-objetivo del SPEC). |
| **F5** | Dosificador de contenidos y PDA (referencia editorial, opcional) | Buscar en Editorial MD o similar; comparar cobertura; **no usar como fuente primaria ni redistribuir**. | Verificación cruzada. NO automática. |

**No se usan como fuente:** Kumu, Teachy, Planea IA, Scribd, blogs docentes, inteligencia artificial generativa sin validación humana. (Riesgo legal + riesgo de errores pedagógicos.)

---

## 4. ARQUITECTURA DEL SISTEMA DE CATALOGACIÓN

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 0 — INPUTS                                            │
│  (PDFs en fuentes/, URLs externas, conocimiento humano)     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1 — EXTRACCIÓN AUTOMÁTICA                            │
│  • pdfplumber/PyMuPDF extrae texto página a página          │
│  • Detecta cabeceras y patrones canónicos (regex + heuríst.) │
│  • Emite propuesta cruda: lista de PDA candidatos            │
│  Output: catalogo_fase2_crudo.json + extraction_log.md      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CAPA 2 — VALIDACIÓN HUMANA DEL FOUNDER                     │
│  • Founder abre el JSON en editor / spreadsheet              │
│  • Marca errores, completa huecos, agrega referencias        │
│  • Típicamente: 4-8 horas de revisión total                  │
│  Output: catalogo_fase2_curado.json (firmado)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3 — MODELADO RELACIONAL                               │
│  • Convierte JSON curado a esquema SQL normalizado            │
│  • Genera migraciones de Supabase                            │
│  • Valida integridad referencial                             │
│  Output: migrations/YYYYMMDD_catalogo_fase2.sql              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CAPA 4 — CARGA Y EXPOSICIÓN                                │
│  • Ejecuta migraciones en Supabase (test → prod)             │
│  • Puebla tablas reales                                      │
│  • Genera "tarjeta de auditoría" legible                     │
│  Output:                                          █          │
│    - DB cargada en Supabase                                  │
│    - AUDITORIA_catalogo_fase2_YYYY-MM-DD.md                  │
└─────────────────────────────────────────────────────────────┘
```

**Tiempo total estimado:** 16-24 h de founder real. La mayor parte de la extracción es automática.

---

## 5. ESQUEMA RELACIONAL (target)

### 5.1. Tablas núcleo

```sql
-- Versión del catálogo (para E10/E11 versionado)
catalogo_version (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,    -- 'PLAN_2022_ED_2025_FASE_2'
  nombre          TEXT NOT NULL,
  fecha_vigencia  DATE NOT NULL,
  fuente_dof      TEXT NOT NULL,           -- 'Acuerdo 14/08/22 + Anexo 06/08/23'
  fuente_sha256   TEXT NOT NULL,           -- SHA del PDF fuente
  fecha_carga     TIMESTAMP WITH TZ DEFAULT now(),
  cargado_por     TEXT,                    -- 'founder + script atlas'
  metadata        JSONB
)

-- Campos formativos (4 oficiales + posibles extensiones)
campo_formativo (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,    -- 'LENGUAJES'
  nombre          TEXT NOT NULL,
  descripcion     TEXT,                    -- texto oficial del Plan 2022
  orden           INT,
  catalogo_version_id INT REFERENCES catalogo_version(id)
)

-- Ejes articuladores (7 oficiales)
eje_articulador (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,    -- 'INCLUSION'
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  orden           INT,
  catalogo_version_id INT REFERENCES catalogo_version(id)
)

-- Fases (6 oficiales)
fase (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,    -- 'FASE_2'
  numero          INT NOT NULL,
  nombre          TEXT NOT NULL,           -- 'Preescolar'
  rango_edad      TEXT,                    -- '3-6 años'
  catalogo_version_id INT REFERENCES catalogo_version(id)
)

-- PDA: Procesos de Desarrollo de Aprendizaje
pda (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,    -- 'PDA-F2-LNG-001'
  texto           TEXT NOT NULL,
  catalogo_version_id INT REFERENCES catalogo_version(id),
  fuente_dof_pagina INT,                   -- página del PDF fuente
  fuente_dof_sha  TEXT,                    -- SHA del PDF en el momento de captura
  activo          BOOLEAN DEFAULT TRUE
)

-- Contenido oficial por campo × fase
contenido (
  id              SERIAL PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  texto           TEXT NOT NULL,
  fase_id         INT REFERENCES fase(id),
  campo_id        INT REFERENCES campo_formativo(id),
  catalogo_version_id INT REFERENCES catalogo_version(id)
)

-- Relaciones N:M
pda_por_campo_fase (
  pda_id          INT REFERENCES pda(id),
  fase_id         INT REFERENCES fase(id),
  campo_id        INT REFERENCES campo_formativo(id),
  PRIMARY KEY (pda_id, fase_id, campo_id)
)

pda_ejes (
  pda_id          INT REFERENCES pda(id),
  eje_id          INT REFERENCES eje_articulador(id),
  PRIMARY KEY (pda_id, eje_id)
)

-- Referencias a libros de texto CONALITEG (solo URL + metadatos, NO contenido)
referencia_libro_conaliteg (
  id              SERIAL PRIMARY KEY,
  grado           TEXT,                    -- '1° preescolar', '2° preescolar', '3° preescolar'
  campo           TEXT,                    -- 'Lenguajes' | 'Saberes...' | etc
  titulo_libro    TEXT,
  url_publica     TEXT NOT NULL,           -- URL canónica en libros.conaliteg.gob.mx
  isbn            TEXT,
  edicion         TEXT,                    -- '2024' | '2025'
  fecha_acceso    DATE,
  notas           TEXT,
  fase_id         INT REFERENCES fase(id),
  campo_id        INT REFERENCES campo_formativo(id)
)

-- Auditoría humana (inmutable, append-only)
auditoria_carga (
  id              SERIAL PRIMARY KEY,
  fecha           TIMESTAMP WITH TZ DEFAULT now(),
  catalogo_version_id INT REFERENCES catalogo_version(id),
  pda_id          INT REFERENCES pda(id),
  accion          TEXT,                    -- 'revisado' | 'corregido' | 'agregado' | 'marcado_inactivo'
  observacion     TEXT,
  autor           TEXT                     -- 'founder'
)
```

### 5.2. Volumen esperado (Fase 2)

| Tabla | Registros esperados |
|---|---|
| `campo_formativo` | 4 |
| `eje_articulador` | 7 |
| `fase` | 6 totales, pero solo 1 cargado para preescolar MVP |
| `pda` Fase 2 | ~24-30 (estimado del PDF Programas Sintéticos) |
| `contenido` Fase 2 | ~30-50 (4 campos × ~10 contenidos cada uno) |
| `referencia_libro_conaliteg` Fase 2 | ~8-12 libros por nivel preescolar (3 niveles × 4 campos) |
| **Total carga automática** | ~100-150 registros totales |

Esto es **manejable a mano** si el parser falla en algo: el founder puede corregir manualmente en el JSON curado.

---

## 6. SISTEMA DE EXTRACCIÓN AUTOMÁTICA — DISEÑO

### 6.1. Stack técnico propuesto

| Componente | Recomendación | Por qué |
|---|---|---|
| **Parser PDF** | `pdfplumber` (Python, estable, texto + tablas) o `PyMuPDF` (más rápido, menos preciso en tablas) | Probados, sin API keys |
| **Detección de patrones** | Regex robustas + heurísticas por palabras clave | Suficiente para 1 PDF |
| **Orquestador** | Script Python autocontenido (`catalogar_fase2.py`) | Sin dependencias cloud |
| **Validación** | `pydantic` para validar JSON curado contra schema | Falla rápido si está mal |
| **Auditoría** | Logs estructurados + diff vs versión previa | Trazabilidad E10/E11 |

**Nota:** no propongo LLM/IA generativa para la extracción. Razones: (a) errores silenciosos difíciles de auditar, (b) la estructura del PDF es regular y se puede parsear con regex, (c) queremos trazabilidad al DOF original, no a una "interpretación plausible" del LLM.

Si en algún punto el PDF tiene tablas mal parseadas y vale la pena gastar USD 5 en una llamada a GPT-4 con function-calling, se hace **una sola vez** con validación humana del output.

### 6.2. Estructura del script `catalogar_fase2.py`

Tres comandos:

```bash
# Modo 1: extraer propuesta cruda (automático, ~5 min)
python catalogar_fase2.py extract

# Modo 2: generar SQL desde JSON curado (automático, ~30 s)
python catalogar_fase2.py build-sql --input catalogo_fase2_curado.json

# Modo 3: generar auditoría (automático, ~30 s)
python catalogar_fase2.py audit --output AUDITORIA_catalogo_fase2_YYYY-MM-DD.md
```

### 6.3. Output esperado del modo `extract`

- **`catalogo_fase2_crudo.json`** — propuesta de PDA y contenidos con su posición en el PDF.
- **`extraction_log.md`** — log de páginas procesadas, regex matches, anomalías.
- **`extraction_quality_report.md`** — métricas: % páginas parseadas, % tablas detectadas, huecos identificados.

**El founder revisa el JSON crudo + el quality report.** Si la calidad es >85%, valida; si es <85%, ajusta el script o interviene manualmente.

---

## 7. VALIDACIÓN HUMANA — QUÉ HACE EL FOUNDER

**Tiempo esperado:** 4-8 horas reales (no automáticas). Son estas tareas:

| # | Tarea | Quién | Tiempo |
|---|---|---|---|
| 1 | Leer `extraction_quality_report.md` y entender qué se extrajo | Founder | 15 min |
| 2 | Abrir `catalogo_fase2_crudo.json` en VS Code o Google Sheets | Founder | 5 min |
| 3 | Revisar nombres de PDA (¿son los oficiales? ¿faltan? ¿sobran?) | Founder | 60 min |
| 4 | Validar texto de cada PDA contra el PDF (muestreo aleatorio 20%) | Founder | 60 min |
| 5 | Completar referencias CONALITEG manualmente (1-2 libros por campo) | Founder | 60 min |
| 6 | Editar metadata (fechas, descripciones, ejes asociados) | Founder | 60 min |
| 7 | Marcar entradas ambiguas en log de auditoría | Founder | 30 min |
| 8 | Firmar el JSON curado (con SHA + fecha) → listo para Capa 3 | Founder | 5 min |

**Materiales que necesita tener a mano:**
- El PDF abierto en una pestaña.
- El JSON crudo abierto en otra.
- Una hoja de cálculo o editor con búsqueda rápida.
- Referencia: el Plan 2022 SEP oficial (`fuentes/01_normativa_nem/plan_estudio_2022_SEP_oficial.pdf`) para validar descripciones.

---

## 8. AUDITORÍA Y TRAZABILIDAD

### 8.1. Lo que el sistema debe poder responder

Cuando alguien pregunte "¿de dónde viene este PDA en tu app?", debe poder responderse:

1. **¿Cuál es la fuente original?** → DOF, Acuerdo 14/08/22 + Anexo 06/08/23, página X del PDF.
2. **¿Cuándo se cargó?** → fecha + quién.
3. **¿Ha cambiado desde entonces?** → histórico de versiones de catálogo.
4. **¿Fue revisado por humano?** → sí/no + quién.

### 8.2. Reporte de auditoría (auto-generado)

`AUDITORIA_catalogo_fase2_YYYY-MM-DD.md`:

```markdown
# Auditoría del catálogo NEM — Fase 2

**Versión del catálogo:** PLAN_2022_ED_2025_FASE_2
**Fecha de carga:** 2026-08-13
**PDF fuente:** anexo_acuerdo_14_08_22_programas_sinteticos.pdf
**SHA256 PDF fuente:** abc123def456...

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| PDA cargados | 27 |
| PDA oficiales esperados | ~24-30 (✓ dentro de rango) |
| Contenidos por campo | ... |
| Referencias a libros CONALITEG | 9 libros |
| Tiempo total de carga | ~6 h founder + 5 min script |

## Cobertura por campo formativo

| Campo | PDA cargados | Contenidos | Cobertura estimada |
|---|---|---|---|
| Lenguajes | 7 | 12 | ✓ |
| Saberes y Pensamiento Científico | 6 | 10 | ✓ |
| Ética, Naturaleza y Sociedades | 5 | 9 | ✓ |
| De lo Humano y lo Comunitario | 9 | 14 | ✓ |

## Validación humana

- ✓ Todos los PDA revisados contra PDF fuente (muestreo 100% para MVP).
- ✓ Asignación de ejes articuladores curada.
- ✓ 9 referencias CONALITEG verificadas (URLs vivas a fecha de carga).

## Limitaciones conocidas

- No incluye casos especiales (educación indígena, multigrado, telesecundaria) en este MVP.
- Versión de Fase 2 únicamente; las Fases 3-6 se añadirán en versiones posteriores.

## Firmas

- Founder: Frank
- Fecha: 2026-08-13
- SHA256 del JSON curado: [será calculado]
```

---

## 9. POLÍTICA DE ERRORES Y DECISIONES HUMANAS

| Tipo de situación | Política |
|---|---|
| El parser no detecta un PDA | Founder lo agrega a mano en JSON curado, marcándolo como "agregado_manual: true" |
| El parser detecta un PDA falso positivo | Founder lo elimina y registra razón en `auditoria_carga` |
| Texto del PDA ambiguo (2 versiones en el PDF) | Founder elige la versión más reciente del DOF; se anota en auditoría |
| Eje articulador faltante | Founder verifica contra los 7 canónicos; si no encaja, se marca "eje_no_oficial" y se documenta |
| CONALITEG URL caída al cargar | Founder lo marca `url_estado: 'caida'`, no bloquea la carga |
| Conflicto entre Plan 2022 edición 2025 vs original 2022 | Prevalecer la edición vigente (E10) |

---

## 10. CRITERIOS DE ÉXITO DE E14

| # | Criterio |
|---|---|
| CE1 | Existe el script `catalogar_fase2.py` ejecutable en menos de 5 min para extraer. |
| CE2 | El JSON crudo cubre ≥85% de los PDA esperados para Fase 2. |
| CE3 | El JSON curado tiene 100% de cobertura de campos formativos, ejes y PDA Fase 2. |
| CE4 | El SQL generado pasa las migraciones de Supabase sin errores. |
| CE5 | El reporte de auditoría se genera automáticamente y tía Lola puede leerlo y validarlo. |
| CE6 | La base queda respaldada en git con SHA trazable al PDF fuente. |
| CE7 | Tía Lola puede abrir la app, ver los PDA como opciones reales y armar una clase real con ellos. |

---

## 11. LO QUE EXPLÍCITAMENTE NO HACEMOS EN E14

- ❌ **No scrapeamos** sitios como `conocetuslibros.sep.gob.mx` automáticamente. Es zona gris legal, y el PDF del DOF es fuente más confiable.
- ❌ **No usamos IA generativa** como parser principal. Solo si en algún caso aislado el regex falla y queda como excepción auditada.
- ❌ **No alojamos contenido editorial CONALITEG**, solo URLs y metadatos.
- ❌ **No modelamos las Fases 3-6** todavía. Después.
- ❌ **No modelamos el Programa Analítico** (depende del contexto de cada escuela; es trabajo del director/docente, no del catálogo).
- ❌ **No gestionamos versionado histórico fino.** Solo guardamos la versión vigente. Histórico opcional después.

---

## 12. INVERSIÓN TOTAL

| Rol | Horas | Cuándo |
|---|---|---|
| Diseño E14 (este SPEC) | ✅ hecho | 2026-08-13 |
| Implementación del script `catalogar_fase2.py` | 8-12 h programador o agente | Esta semana |
| Extracción cruda inicial | 5 min (automatizado) | Al ejecutar script |
| Validación humana founder | 4-8 h | 1-2 días focused |
| Carga en Supabase + verificación | 2-4 h programador | Misma semana |
| **Total founder real** | **~6-12 horas reales** | **1-2 semanas** |

---

## 13. ENTREGABLES DERIVADOS

| # | Entregable | Estado | Dependencia |
|---|---|---|---|
| E14 | **Este SPEC** | ✅ hecho | — |
| E14.1 | Script `catalogar_fase2.py` | Pendiente | E14 |
| E14.2 | Catálogo curado Fase 2 (JSON + SQL + auditoría) | Pendiente | E14.1 + validación founder |
| E14.3 | Catálogo Fases 3-6 | Diferido a v0.6 catálogo | Patrón replicado |
| E14.4 | Programa Analítico (relacionado pero fuera de catálogo NEM) | Diferido | — |

---

## 14. CHECKLIST PARA ARRANCAR

- [x] Aprobar este SPEC.
- [ ] Confirmar que el alcance es solo Fase 2.
- [ ] Confirmar que el modelo relacional es completo con CONALITEG.
- [ ] Confirmar stack técnico (Python + pdfplumber + pydantic).
- [ ] Decidir quién implementa el script (Atlas vs. SOFIA vs. founder directo).
- [ ] Asignar slots de tiempo de validación humana (4-8 h continuas).

---

## 15. RELACIÓN CON OTROS ENTREGABLES

| Entregable | Vinculación |
|---|---|
| `SPEC_MVP_01_Modulo_Docente.md` §5 Catálogo NEM | E14 es la implementación operativa de §5 |
| `E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md` | E14 alimenta `catalogo_version` con cada carga formal |
| `E11_MONITOR_VIGILANCIA_NORMATIVA.md` | E11 detecta cuándo hay que re-ejecutar E14 |
| `fuentes/01_normativa_nem/` | Los PDFs fuente de E14 viven aquí |

---

## 16. SOBRE HERMES — Nota operativa

Hermes no está disponible como `subagent_type` en mi entorno actual. Si quieres orquestar la implementación con Hermes, puedo:

- **Opción A:** entregarte este SPEC y dejar que Hermes (donde sea que viva) lo ejecute.
- **Opción B:** yo delego la implementación a `atlas` o a `integra` (los agentes disponibles) sin tocar código, solo entregando instrucciones.
- **Opción C:** te entrego un mini-prompt listo para que pegues en Hermes y arranque.

**Antes de avanzar necesito saber cuál prefieres.**

---

**Fin de E14.**
