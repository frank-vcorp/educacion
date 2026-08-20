# E21 — Catálogo de Recursos Personales del Aula

**Versión:** 0.1
**Fecha:** 2026-08-16
**Estado:** ESPECIFICACIÓN OPERATIVA (nueva feature para MVP)
**Origen:** Decisión del founder en sesión 2026-08-15 — "que la maestra pueda cargar un catálogo de recursos que tiene en su aula para arrastrar"
**Alineado a:** `SPEC_MVP_01_Modulo_Docente.md` §3.6.M1 (bloques) + §3.6.M4 (características escuela) + E20 P-PD1 (85/15)

---

## 1. PROBLEMA

La maestra llega a su salón y tiene **recursos físicos limitados** (tijeras, botellas recicladas, frascos, cuentos, instrumentos musicales, etc.). Estos recursos:

- **Cambian por aula** (cada salón tiene juegos diferentes)
- **Cambian por ciclo** (se rompen, se agregan, se pierden)
- **Hoy NO los tiene disponibles para arrastrar** — debe escribirlos en cada planeación
- **Limitando qué bloques puede usar** (si un bloque requiere "frasco" y no tiene, ¿lo adapta o lo salta?)

**Pain point derivado:** "¿qué materiales tengo?" es una pregunta que se responde mentalmente cada vez que se planea. La maestra **no sabe con certeza** hasta que abre el cajón.

**Hipótesis:** si la maestra tiene un **catálogo personal de recursos** precargado, la planeación fluye más rápido y los bloques sugieren automáticamente los recursos compatibles.

---

## 2. OBJETIVO

Que la maestra pueda:

1. **Capturar una vez** el inventario de su aula (al inicio del ciclo o inicio de planeación).
2. **Arrastrar recursos** desde su inventario al diseñar sesiones.
3. **Ver sugerencias automáticas** de recursos compatibles con cada bloque.
4. **Reusar el mismo recurso** en múltiples sesiones sin reescribir.
5. **Detectar conflictos** (ej. si planeó usar el único frasco el lunes y el miércoles).

---

## 3. FLUJO DE ALTA

### 3.1. Onboarding (parte de M4)

Durante el Paso 4 del onboarding (ENT-003 D2), después de capturar alumnos, agregar:

```
┌─────────────────────────────────────────────────────────────┐
│ PANTALLA 4.5: Tu inventario de aula (opcional)             │
├─────────────────────────────────────────────────────────────┤
│ "¿Qué recursos tienes en tu salón?" (puedes hacerlo después)│
│                                                             │
│ [Cargar kit preescolar genérico] ← catálogo predefinido    │
│ [+ Agregar uno por uno]   [📥 Importar CSV]                │
│                                                             │
│ Tu inventario (8):                                          │
│ ┌──────────────────────────────────────────────┐            │
│ │ 📦 Frasco de cristal grande (1)             │ [✏️][🗑] │
│ │ 🖍️ Caja de colores (5)                      │ [✏️][🗑] │
│ │ 🎵 Instrumentos musicales: maracas (3)       │ [✏️][🗑] │
│ │ 📚 Cuento "cuando estoy celoso" Trace Moroney │ [✏️][🗑] │
│ │ 🍶 Botellas de plástico vacías (10)         │ [✏️][🗑] │
│ │ 📎 Tijeras escolares (8)                    │ [✏️][🗑] │
│ │ 🎨 Pegamento blanco (3)                     │ [✏️][🗑] │
│ │ 🪣 Cubeta de plástico (2)                   │ [✏️][🗑] │
│ └──────────────────────────────────────────────┘            │
│                                                             │
│ [Saltar por ahora] [Continuar →]                            │
└─────────────────────────────────────────────────────────────┘
```

**Nota:** el botón "Cargar kit preescolar genérico" es clave para P-PD1 (no escribir desde cero).

---

### 3.2. Kit preescolar genérico (precargado)

Una **plantilla predefinida** organizada por **categorías pedagógicas** (no por tipo de material). La maestra puede aceptar con 1 click la categoría completa o activar selectivamente.

**Taxonomía pedagógica curada por founder (2026-08-16):**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎒 KIT PREESCOLAR GENÉRICO (≈30 items en 6 categorías)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▌🧮 MATERIALES MANIPULATIVOS Y LÓGICO-MATEMÁTICOS
  ├─ 🧱 Bloques de construcción
  ├─ 🧩 Juguetes encajables y embonables
  ├─ 🧩 Puzzles y rompecabezas de pocas piezas
  ├─ 🔢 Contadores, fichas y ábacos sencillos
  └─ 📐 Figuras geométricas de madera o plástico

▌📖 RECURSOS IMPRESOS Y VISUALES
  ├─ 📚 Cuentos ilustrados y libros de literatura infantil
  ├─ 🖼️ Láminas, carteles y pósteres murales
  ├─ 🎴 Tarjetas de vocabulary (flashcards)
  └─ 📅 Calendarios y gráficos del clima diarios

▌🖐️ MATERIALES SENSORIALES Y DE PSICOMOTRICIDAD
  ├─ 🧪 Mesas de experimentación (agua, arena o semillas)
  ├─ ⚽ Pelotas, aros y túneles de tela
  ├─ 🧱 Bloques de espuma suave para escalar o saltar
  └─ ✋ Materiales con distintas texturas y sonidos

▌🎭 JUEGOS SIMBÓLICOS Y DE EXPRESIÓN
  ├─ 👗 Disfraces, telas y accesorios de rol
  ├─ 🍳 Cocinitas de juguete, alimentos de plástico y menaje
  └─ 👶 Muñecos, cunas y carritos

▌🥁 INSTRUMENTOS MUSICALES DE PERCUSIÓN MENOR
  ├─ 🥚 Maracas
  ├─ 🪘 Panderetas
  └─ 🎵 Otros (triángulo, claves, pandero)

▌🎨 MATERIALES PLÁSTICOS Y RECICLADOS
  ├─ 🖌️ Pinturas no tóxicas, crayones gruesos y plastilina
  ├─ 📜 Papeles de diferentes texturas y colores
  └─ ♻️ Materiales reciclados (botellas, tapas, tubos)
```

**Total: ~30 items pre-cargados en 6 categorías pedagógicas.**

**Por qué esta categorización funciona:**

| Beneficio | Detalle |
|-----------|---------|
| **Alineada con modalidades NEM** | Cada categoría conecta con un campo formativo |
| **Alineada con rincones de aprendizaje** | Cada categoría puede ser un rincón físico |
| **Filtrable por campo formativo** | Sistema sugiere la categoría según el bloque |
| **Visualizable como mapa** | La maestra ve de un vistazo qué tiene |
| **Editable selectivamente** | Marca/desmarca categorías, no items individuales |

**Acción de la maestra:**

```
┌────────────────────────────────────────────────┐
│ "Cargar kit preescolar genérico"                │
│                                                │
│ [☑ Seleccionar todo]                            │
│                                                │
│ ☑ 🧮 Manipulativos y lógico-matemáticos (4)   │
│ ☑ 📖 Impresos y visuales (4)                  │
│ ☑ 🖐️ Sensoriales y psicomotricidad (4)       │
│ ☑ 🎭 Juegos simbólicos y de expresión (3)     │
│ ☑ 🥁 Instrumentos musicales (2)               │
│ ☑ 🎨 Plásticos y reciclados (3)               │
│                                                │
│ Total: 20 items. [Cancelar] [Cargar selección] │
└────────────────────────────────────────────────┘
```

La maestra puede:
- Aceptar todas las categorías (1 click)
- Desmarcar las que no aplican (ej. no tiene backyard de arena)
- Agregar/eliminar items específicos después

---

### 3.3. Captura manual

**Pantalla "Agregar recurso":**

```
┌─────────────────────────────────────────────────────────────┐
│ Agregar recurso al inventario                              │
├─────────────────────────────────────────────────────────────┤
│ Nombre: [_______________________________]                  │
│                                                             │
│ Categoría pedagógica: [▼ Seleccionar]                     │
│   ○ 🧮 Manipulativos y lógico-matemáticos                 │
│   ○ 📖 Impresos y visuales                                │
│   ○ 🖐️ Sensoriales y psicomotricidad                     │
│   ○ 🎭 Juegos simbólicos y de expresión                   │
│   ○ 🥁 Instrumentos musicales de percusión menor         │
│   ○ 🎨 Plásticos y reciclados                             │
│   ○ Otro                                                   │
│                                                             │
│ ¿Para qué lo usas? (campo clave)                          │
│ [Ej: "Para el frasco de la calma", "Para musicalizar     │
│  cuentos", "Para clasificar por colores"_______]           │
│                                                             │
│ Edad: [▼ 3-4 / 4-5 / 5-6 / todas]                        │
│                                                             │
│ Cantidad: [___] (cuántos tiene)                            │
│                                                             │
│ Foto (opcional): [📷 Tomar foto]                           │
│                                                             │
│ [Cancelar] [Guardar]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Por qué el campo "uso" es el más importante:**

La maestra **ya sabe** para qué usa cada recurso. No necesita aprender taxonomía. Solo escribe 1-5 palabras con su uso real:

| Recurso | Uso típico (lo que escribe la maestra) |
|---------|---------------------------------------|
| Frasco de cristal grande | "para el frasco de la calma" |
| Maracas | "para musicalizar cuentos" |
| Cuentos Trace Moroney | "para hablar de emociones" |
| Bloques de madera | "para clasificar por colores" |
| Mesa de agua | "para experimentar con flotación" |
| Pintura digital | "para hacer murales colectivos" |
| Plastilina | "para modelar emociones" |

**El sistema usa este campo como source-of-truth para sugerencias.**

---

### 3.3.1. Auto-sugerido de uso por IA (F-IA1)

Para reducir la carga de escritura (P-PD1), la IA (MiniMax) puede **sugerir el uso** basándose en:

| Input | Lo que la IA sugiere |
|-------|----------------------|
| `nombre` + `categoría` | 1-3 usos típicos pedagógicamente válidos |
| `nombre` solo | Inferencia basada en conocimiento pedagógico |
| `uso escrito por la maestra` | (no aplica, ya está) |

**Ejemplo de interacción:**

```
┌─────────────────────────────────────────────────────────────┐
│ Inventario › Frasco de cristal grande (Sensoriales)         │
├─────────────────────────────────────────────────────────────┤
│ Nombre: Frasco de cristal grande                            │
│ Categoría: 🖐️ Sensoriales                                  │
│                                                             │
│ ¿Para qué lo usas? (campo clave)                          │
│ [_____________________________________________]              │
│                                                             │
│ 💡 Sugerencias de MiniMax (clic para usar):                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▸ para el frasco de la calma                            │ │
│ │ ▸ para observar el movimiento de partículas            │ │
│ │ ▸ para experimentar con mezclas de colores             │ │
│ │ ▸ para mostrar cómo se asientan los líquidos           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Cancelar] [Guardar]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Diagrama de decisión:**

```
┌──────────────────────────────┐
│ Maestra crea/agrega recurso  │
└──────────────┬───────────────┘
               │
               ▼
        ┌──────────────┐
        │ ¿Escribió uso?│
        └──┬─────────┬──┘
       Sí │         │ No
          ▼         ▼
    ┌─────────┐  ┌──────────────────┐
    │ Guardar │  │ Llamar a MiniMax │
    │ directo │  │ con nombre+cat   │
    └─────────┘  └─────────┬────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ ¿MiniMax responde? │
                  └────┬────────────┬───┘
                 Sí │            │ No
                    ▼            ▼
            ┌──────────────┐  ┌──────────────┐
            │ Mostrar 3-4  │  │ Dejar vacío, │
            │ sugerencias  │  │ maestra      │
            │ como chips   │  │ decide       │
            └──────────────┘  └──────────────┘
```

**Prompt a MiniMax (anonimizado):**

```
[Sistema]
Eres un asistente pedagógico para educación preescolar mexicana.
Sugiere 3-4 usos típicos para el siguiente recurso en el aula.
Los usos deben ser frases cortas (3-6 palabras) en lenguaje natural de maestra.

[Usuario]
Recurso: Frasco de cristal grande
Categoría: Sensoriales y psicomotricidad

[Assistant]
- para el frasco de la calma
- para observar el movimiento de partículas
- para experimentar con mezclas de colores
- para mostrar cómo se asientan los líquidos
```

**Política de datos hacia MiniMax (F-IA1):**

| Dato | Permitido | Bloqueado |
|------|-----------|-----------|
| Nombre del recurso | ✅ Sí | |
| Categoría pedagógica | ✅ Sí | |
| Edad recomendada | ✅ Sí | |
| Datos de la maestra (nombre, CCT) | NO ❌ | No sale del backend |
| Datos de alumnos | **REGLA DURA** | Nunca |
| Centro escolar | NO ❌ | No necesario para esta feature |

**Reglas anti-alucinación:**
- Si MiniMax no sabe, devuelve lista vacía (no inventa).
- Las sugerencias son **referencia**, no verdad. La maestra puede ignorar.
- El sistema **NUNCA** autocompleta sin que la maestra vea la sugerencia.

**Cache de sugerencias:**
- Mismo par (nombre, categoría) → misma respuesta cacheada por 30 días.
- Ahorra costos en el kit preescolar genérico (40 items se cachean 1 vez).

---

### 3.4. Importar CSV

**Formato CSV:**

```csv
nombre,categoria,cantidad,notas
"Frasco de cristal grande","material_fisico",1,"Para frasco de la calma"
"Caja de colores","material_fisico",5,"Marca Crayola"
"Maracas","instrumento_musical",3,"Hechas de semilla"
"Cuento cuando estoy celoso","cuento",1,"Trae María del grupo B"
```

**Plantilla descargable:** la maestra puede bajar un CSV vacío con headers para llenarlo en Excel y luego subirlo.

---

## 4. UX: USO EN PLANEACIÓN

### 4.1. Vista de sesión con recursos disponibles

Al diseñar una sesión (Pasos 12-16 del walkthrough), agregar al banco lateral con **categorías pedagógicas plegables**:

```
┌──────────────────────────────┐
│ Banco de bloques (M1)        │
│                              │
│ ▼ 🎭 Apertura (3)            │
│ ...                          │
│                              │
│ 🎒 MI INVENTARIO (20)  ← NUEVO│
│                              │
│ ▼ 🧮 Manipulativos (4)      │
│   🧱 Bloques (1)            │
│   🧩 Encajables (1)         │
│   🔢 Contadores (1)         │
│   📐 Figuras geom. (1)      │
│                              │
│ ▼ 📖 Impresos y visuales (4)│
│   📚 "Cuando estoy celoso"  │
│   🖼️ Láminas (5)            │
│   🎴 Flashcards (1 set)     │
│   📅 Calendario del clima    │
│                              │
│ ▼ 🖐️ Sensoriales (4)        │
│   🧪 Mesa de agua           │
│   ⚽ Pelotas (3)             │
│   🧱 Espuma suave           │
│   ✋ Texturas y sonidos     │
│                              │
│ ▼ 🎭 Simbólicos (3)         │
│   👗 Disfraces (1 set)      │
│   🍳 Cocinita               │
│   👶 Muñecos (2)            │
│                              │
│ ▼ 🥁 Percusión menor (2)    │
│   🥚 Maracas (3)            │
│   🪘 Pandereta (1)          │
│                              │
│ ▼ 🎨 Plásticos y reciclados │
│   🖌️ Pinturas (3)          │
│   📜 Papeles de colores     │
│   ♻️ Botellas (10)          │
│                              │
│ ▼ 📚 Recursos sugeridos (12) │
│   (los del catálogo M1)      │
└──────────────────────────────┘
```

**Cada categoría se puede colapsar/expandir** para no saturar la pantalla (P-UX1 una pregunta por pantalla).

### 4.2. Sugerencias automáticas al arrastrar bloque

Cuando la maestra arrastra un bloque al lienzo, el sistema busca en el inventario cuyo campo `uso` coincida semánticamente con lo que pide el bloque:

```
┌────────────────────────────────────────────────────────────┐
│ Has arrastrado: "Frasco de la calma"                       │
│                                                            │
│ 💡 Tu inventario tiene:                                   │
│                                                            │
│  🥇 PERFECTO (match 95%)                                   │
│    📦 Frasco de cristal grande (1)                        │
│    "para el frasco de la calma"  ← uso escrito por la      │
│                                     maestra que coincide │
│                                                            │
│  🥈 ALTERNATIVO (match 60%)                                │
│    🍶 Botella de plástico vacía (10)                       │
│    "para experimentar con mezclas"  ← uso distinto          │
│                                          pero categoría OK │
│                                                            │
│  ❌ NO SUGERIDO                                            │
│    🔢 Ábaco (no matchea con "frasco" ni "calma")          │
│                                                            │
│ [✓ Usar el perfecto] [✏️ Editar match] [Ignorar]          │
└────────────────────────────────────────────────────────────┘
```

**Algoritmo de matching (basado en uso):**

```
┌─────────────────────────────────────────────────────────────┐
│ Score = (uso × 0.6) + (categoria × 0.3) + (edad × 0.1)    │
│                                                             │
│ Score ≥ 0.8 → 🥇 PERFECTO (verde)                          │
│ Score 0.5-0.8 → 🥈 ALTERNATIVO (amarillo)                  │
│ Score < 0.5 → ❌ NO SUGERIDO (no aparece)                  │
│                                                             │
│ Edad incompatible (ej. 3-4 con material 5-6) → siempre 0  │
└─────────────────────────────────────────────────────────────┘
```

**El match se basa en lo que la maestra escribió como uso.** Si escribe "para el frasco de la calma", eso matchea con bloques que pidan "frasco" + "calma". Simple y directo.

### 4.3. Vista de sesión con recursos marcados

```
┌────────────────────────────────────────┐
│ Sesión 1: "Emociones con frasco"      │
│ L 12 de enero                          │
├────────────────────────────────────────┤
│ ☐ Momento 1: Kori el monstruo (10min) │
│   Recursos: -                          │
│                                        │
│ ☐ Momento 2: Frasco de la calma (15min)│
│   📦 Frasco de cristal grande (1/1) ✓ │ ← usado
│   🖍️ Colores (5/5) ✓                 │
│                                        │
│ ☐ Momento 3: Reflexión (5min)         │
│   Recursos: -                          │
└────────────────────────────────────────┘
```

### 4.4. Detección de conflictos

Si la maestra intenta usar el mismo recurso único en dos sesiones del mismo día:

```
⚠️ Conflicto: "Frasco de cristal grande" se usa en:
   - Sesión 1 (L 12, 9:00-10:00)
   - Sesión 4 (L 12, 14:00-15:00)
   
   Solo tienes 1 unidad. ¿Ajustar?
   [Mover a sesión 4] [Ignorar]
```

---

## 5. MODELO DE DATOS

```sql
-- Recursos del inventario de la maestra
recurso_aula (
  id              SERIAL PRIMARY KEY,
  docente_id      INT REFERENCES docente(id),
  nombre          TEXT NOT NULL,
  categoria       TEXT,    -- 6 categorías pedagógicas ver §3.2
  uso             TEXT NOT NULL, -- "para qué lo usa" en palabras de la maestra (1-5 palabras)
  edad            TEXT,    -- '3-4' | '4-5' | '5-6' | 'todas'
  cantidad        INT DEFAULT 1,
  foto_url        TEXT,
  -- Metadata de origen
  kit_origen      TEXT,    -- NULL si manual, 'kit_preescolar_generico' si del template
  uso_fuente      TEXT,    -- 'maestra' | 'ia_sugerida' | 'maestra_editada_de_ia' | 'kit_template'
  created_at      TIMESTAMP WITH TZ DEFAULT now(),
  updated_at      TIMESTAMP WITH TZ DEFAULT now(),
  activo          BOOLEAN DEFAULT TRUE
)

-- Recursos usados en sesiones (N:M)
sesion_recurso (
  sesion_id       INT REFERENCES sesion(id),
  recurso_id      INT REFERENCES recurso_aula(id),
  cantidad_usada  INT DEFAULT 1,
  PRIMARY KEY (sesion_id, recurso_id)
)
```

**El campo `uso_fuente` permite:**
- Auditar cuántas maestras aceptan sugerencias de IA vs escriben su propia versión.
- Medir la calidad de las sugerencias vs uso real.
- Mejorar el prompt con el tiempo.

**Simplicidad intencional:** solo 6 campos en la captura. La maestra no aprende taxonomía, solo escribe cómo usa el recurso en sus propias palabras.

**El sistema enriquece automáticamente** con su propio análisis:

| Lo que la maestra escribe | Lo que el sistema infiere |
|---------------------------|---------------------------|
| `uso = "para el frasco de la calma"` | Match con bloques que pidan "frasco" + "calma" |
| `uso = "para musicalizar cuentos"` | Match con bloques de 📖 Impresos que tengan actividad musical |
| `uso = "para clasificar por colores"` | Match con bloques de 🧮 Manipulativos con PDA de clasificación |

---

## 5.1. SKILL DEL RECURSO (lo que el sistema sabe)

```sql
-- Inferido por el sistema, no por la maestra
recurso_skill (
  recurso_id      INT REFERENCES recurso_aula(id),
  habilidad       TEXT,    -- 'motricidad_fina', 'conteo', 'regulacion_emocional', etc.
  campo_formativo TEXT,    -- campo NEM asociado
  weight          FLOAT,   -- 0-1, qué tan seguro está el sistema
  PRIMARY KEY (recurso_id, habilidad)
)
```

**Catálogo de habilidades canónicas (15 base MVP):**

| Código | Habilidad | Campo formativo NEM |
|--------|-----------|---------------------|
| `motricidad_fina` | Motricidad fina | De lo Humano y Comunitario |
| `motricidad_gruesa` | Motricidad gruesa | De lo Humano y Comunitario |
| `conteo_numeros` | Conteo / números | Saberes y Pensamiento Científico |
| `clasificacion` | Clasificación / seriación | Saberes y Pensamiento Científico |
| `expresion_oral` | Expresión oral | Lenguajes |
| `lectoescritura` | Lectoescritura | Lenguajes |
| `regulacion_emocional` | Regulación emocional | De lo Humano y Comunitario |
| `convivencia` | Convivencia / empatía | De lo Humano y Comunitario |
| `creatividad` | Creatividad | Lenguajes |
| `resolucion_problemas` | Resolución de problemas | Saberes y Pensamiento Científico |
| `expresion_corporal` | Expresión corporal | Lenguajes |
| `exploracion_sensorial` | Exploración sensorial | De lo Humano y Comunitario |
| `musica_ritmo` | Música y ritmo | Lenguajes |
| `naturaleza_observacion` | Observación de la naturaleza | Ética, Naturaleza y Sociedades |
| `sustentabilidad` | Educación ambiental | Ética, Naturaleza y Sociedades |

**Algoritmo de inferencia (mini-NLP):**

```
Input: "para el frasco de la calma"
  ↓
Tokenización: [frasco, calma]
  ↓
Match con catálogo:
  - "frasco" → 🖐️ Sensoriales (de la categoría)
  - "calma" → habilidad "regulacion_emocional"
  ↓
Output:
  - categoria: sensoriales (confianza 0.95)
  - skill: regulacion_emocional (confianza 0.85)
```

**El sistema NO pregunta a la maestra** las habilidades. Las infiere de su texto natural.

**Las 6 categorías pedagógicas canónicas:**

| Código | Categoría | Emoji |
|--------|-----------|-------|
| `manipulativos` | Manipulativos y lógico-matemáticos | 🧮 |
| `impresos` | Impresos y visuales | 📖 |
| `sensoriales` | Sensoriales y psicomotricidad | 🖐️ |
| `simbólicos` | Juegos simbólicos y de expresión | 🎭 |
| `musicales` | Instrumentos musicales de percusión menor | 🥁 |
| `plasticos` | Plásticos y reciclados | 🎨 |

**Mapping a campos formativos NEM:**

| Categoría pedagógica | Campos queprimarily favorecen |
|----------------------|-------------------------------|
| Manipulativos | Saberes y Pensamiento Científico |
| Impresos/visuales | Lenguajes |
| Sensoriales | De lo Humano y Comunitario |
| Simbólicos | De lo Humano y Comunitario + Lenguajes |
| Musicales | Lenguajes (artístico) |
| Plásticos/reciclados | Lenguajes + Ética (sustentabilidad) |

**Esta conexión se usa para sugerir bloques M1** cuando la maestra tiene pocos recursos en una categoría.

---

## 6. INTEGRACIÓN CON EL SISTEMA EXISTENTE

### 6.1. Bloques del catálogo M1

Cada bloque del catálogo curado debe tener `recursos_requeridos` (lista de tipos o nombres clave). Ejemplo:

```json
{
  "bloque_id": "F2-SyPC-002-FrascoCalma",
  "nombre": "El frasco de la calma",
  "tipo": "actividad_practica",
  "pda_ids": ["PDA-F2-DHUC-007"],
  "campos_formativos": ["de_lo_humano_y_comunitario"],
  "recursos_requeridos": [
    { "categoria": "material_fisico", "clave_busqueda": "frasco", "cantidad": 1 },
    { "categoria": "material_fisico", "clave_busqueda": "escarcha/glitter", "cantidad": 1 }
  ]
}
```

El sistema, al arrastrar el bloque, busca recursos en el inventario de la maestra que matcheen.

### 6.2. Características M4 (configuración escuela)

Ya existe en §3.6.M4 del SPEC la pregunta "Recursos disponibles: Materiales (reciclados / comprados / donados / limitados / abundantes)". El catálogo personal **refina** esa categoría agregada a nivel item.

### 6.3. Offline-first

Como todos los datos del docente, el inventario se guarda en **IndexedDB local**. Sincroniza cuando haya red.

---

## 7. ANTI-FEATURES

❌ **NO usamos códigos de barras** en MVP. Sobre-complica y pocos salones tienen escáner.

❌ **NO sincronizamos con proveedores externos** (ej. Mercado Libre). No es marketplace.

❌ **NO prestamos recursos entre maestras** en MVP. Cada quien tiene su inventario.

❌ **NO llevamos control de "se rompió"** durante el ciclo. La maestra actualiza manualmente.

❌ **NO escaneamos la sala con cámara** para detectar recursos. Es ciencia ficción para MVP.

---

## 8. CRITERIOS DE CIERRE

| # | Criterio |
|---|----------|
| CE1 | La maestra puede aceptar el "kit preescolar genérico" con 1 click (40 items cargados) |
| CE2 | La maestra puede agregar/editar/borrar recursos manualmente |
| CE3 | La maestra puede importar CSV de inventario |
| CE4 | Al arrastrar un bloque, el sistema sugiere recursos compatibles del inventario |
| CE5 | La maestra puede vincular un recurso a una sesión con 1 click |
| CE6 | El sistema detecta conflictos de recursos únicos en el mismo día |
| CE7 | El inventario es editable durante todo el ciclo |
| CE8 | El inventario sincroniza offline → online |

---

## 9. ESFUERZO ESTIMADO

| Componente | Horas |
|------------|-------|
| Modelo de datos + migraciones | 1h |
| UI de alta (manual + CSV) | 4h |
| Kit preescolar genérico (40 items) | 2h (curación) |
| Integración con bloques M1 (recursos_requeridos) | 3h |
| Sugerencias automáticas al arrastrar bloque | 4h |
| Detección de conflictos | 2h |
| Offline-first sync | 2h |
| **Total** | **~18h** |

---

## 10. RELACIÓN CON OTROS DOCUMENTOS

| Documento | Vinculación |
|-----------|-------------|
| E20 P-PD1 (85/15) | E21 reduce escritura al máximo (catálogo arrastrable) |
| E20 P-PD3 (datos del mundo) | E21 es la "excepción" — el inventario es DEL mundo físico de la maestra, no del mundo digital |
| E14 Catalogación | E21 se alimenta del catálogo M1 (bloques con recursos_requeridos) |
| E17 UX P-PD1 | E21 convierte el inventario en un "banco" lateral, análogo al banco de bloques |
| §3.6.M1 M1 bloques | E21 extiende M1 con la dimensión "recursos del aula" |
| §3.6.M4 M4 configuración | E21 refina M4 a nivel item |

---

## 11. PRÓXIMOS PASOS

1. ✅ Documento E21 creado.
2. ✅ F-IA1 (auto-sugerido de uso por IA) integrado.
3. ⏳ INTEGRA validar y agregar al backlog.
4. ⏳ Curar el kit preescolar genérico (30 items en 6 categorías) — trabajo del founder.
5. ⏳ Cuando E14 esté completo, agregar `recursos_requeridos` a bloques del catálogo M1.
6. ⏳ Implementar en MVP.

---

## 12. RESUMEN EJECUTIVO

**Esta funcionalidad ofrece:**

1. **Inventario personal de la maestra** organizado en 6 categorías pedagógicas.
2. **Kit preescolar genérico precargado** (30 items, 1 click).
3. **Captura por nombre + uso** (solo 3-5 palabras sobre cómo lo usa).
4. **Auto-sugerido de uso por IA** (F-IA1) — la maestra acepta o sobrescribe.
5. **Matching semántico** entre lo que pide el bloque y el uso que la maestra escribió.
6. **Detección de conflictos** cuando un recurso único se usa 2 veces el mismo día.

**Cumplimiento de principios E20:**

| Principio | Cumplimiento |
|-----------|--------------|
| P-PD1 (85/15) | ✅ Inventario arrastrable + IA sugiere el uso |
| P-PD3 (datos del mundo) | ✅ Recurso del MUNDO físico de la maestra |
| P-PD6 (4 niveles visual) | ✅ Sugerencias con score visual (🥇🥈❌) |
| P-PD8 (IA adaptador) | ✅ F-IA1 sugiere uso, no inventa estructura |

**Anti-patterns evitados:**
- ❌ Pedir a la maestra que escriba descripción técnica
- ❌ Pedir que clasifique por habilidad/taxonomía
- ❌ Mostrar lista plana sin categorías
- ❌ Sugerir sin contexto del bloque

---

**Fin del documento E21.**