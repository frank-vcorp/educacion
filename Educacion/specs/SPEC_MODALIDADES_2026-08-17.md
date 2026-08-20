# SPEC-MODALIDADES-2026-08-17 — Agregar 5 modalidades NEM al wizard

**ID:** SPEC-MODALIDADES-2026-08-17
**Autor:** INTEGRA
**Fecha:** 2026-08-17 23:32 UTC-6
**Para:** SOFIA (sesión 5)
**Prioridad:** ALTA — Frank lo pidió explícitamente

---

## ⚠️ VALIDACIÓN INTEGRA — 2026-08-18 00:30 UTC-6

**Origen:** INTEGRA-VALID-2026-08-18-01 (delegación de Kilo/orquestador).
**Alcance:** verificación post-implementación contra código real del repo.

### Estado real de implementación (verificado por lectura de código)

Los 3 componentes del wizard + las 6 modalidades del selector + la validación
condicional en `planeacion-actions.ts` **YA ESTÁN IMPLEMENTADOS** en sesión 5:

| Archivo | Estado | Notas |
|---------|--------|-------|
| `app/(app)/planeaciones/nueva/_components/wizard-modalidad-selector.tsx` | ✅ IMPLEMENTADO (130 líneas) | Radio buttons + CheckCircle2 + aria correctos. Usa `<input type="radio">` nativo (alternativa válida a RadioGroup de shadcn). |
| `app/(app)/planeaciones/nueva/_components/wizard-banco-palabras.tsx` | ✅ IMPLEMENTADO (113 líneas) | Input + Badge chips + max 10 + sin duplicados + accesible. Cumple shadcn/ui. |
| `app/(app)/planeaciones/nueva/_components/wizard-calendario-semanal.tsx` | ✅ IMPLEMENTADO (247 líneas) | @dnd-kit correcto + fallback manual. **Pero** usa `window.prompt()` línea 129 — ver P1.3 abajo. |
| `services/planeaciones/planeacion-actions.ts` | ⚠️ IMPLEMENTADO CON GAP CRÍTICO | Ver P0 abajo. Solo persiste `modalidad` + compartidos + `banco_palabras`. |
| `app/(app)/planeaciones/nueva/page.tsx` | ✅ IMPLEMENTADO | Server component + `getServerSession` + carga catálogos. |
| `components/planeaciones/wizard-planeacion.tsx` | ✅ EXISTE | Wizard principal (no auditado en este turno). |

### 🔴 P0 — GAP CRÍTICO DE PERSISTENCIA (bloqueante funcional)

**Síntoma:** La afirmación de §Contexto "El schema SQL ya valida estas 6
modalidades en `planeacion.modalidad`. No necesitas cambiar BD" (línea 36) es
**FALSA para los campos extra**.

**Confirmación:** `services/planeaciones/planeacion-actions.ts:14-21` documenta
explícitamente la limitación:

```text
 *  La BD no tiene columnas para `rincones`, `preguntas_det`, `tema`, `fases` ni
 *  `sesiones` JSON. La SPEC dice "No necesitas cambiar BD" (solo el check
 *  constraint ya existe). Por lo tanto, esta server action valida la forma pero
 *  solo persiste `modalidad` + los campos compartidos + `banco_palabras` para
 *  `unidad_didactica`. El resto del wizard se valida client-side.
```

**Impacto funcional:** Cuando una maestra guarda una planeación con modalidad
`centros_interes`, los campos `tema` y `preguntas_det` que capturó en el wizard
**se pierden silenciosamente** al persistir. La planeación cargada después no
tendrá esa información. Lo mismo aplica a `rincones`, `materiales_por_rincón`,
y `sesiones L M M J V` (para Unidad Didáctica). Solo `banco_palabras` persiste
porque `planeacion.banco_palabras text[]` existe en schema (migración 0010).

**SOFIA reportó correctamente el gap** y aplicó un workaround defensivo. El
workaround evita errores pero NO resuelve el problema funcional: los datos
capturados se pierden. Esto es un **bug funcional silencioso**.

**Validación del schema (migración 0010 + SPEC_TEC_02 §5.3.6):**
- `planeacion.modalidad` ✓ existe con check de 6 valores.
- `planeacion.banco_palabras text[]` ✓ existe (D-FIN-7).
- `planeacion.metadata` ❌ NO existe como columna.
- `planeacion.tema` ❌ NO existe.
- `planeacion.preguntas_det` ❌ NO existe.
- `planeacion.rincones` ❌ NO existe.
- `sesion.fase_interna` ✓ existe pero solo permite 3 valores
  (`'inicio','desarrollo','cierre'`) — **NO soporta** las 5 fases de Proyecto
  Comunitario (Motivación → Diseño → Acción → Finalización → Evaluación).

**Conclusión técnica:** La afirmación de SOFIA en sesión 5 es **CORRECTA**.
Requiere acción arquitectónica.

### Solución arquitectónica (aprobada por INTEGRA, no toca RLS existente)

**Migración 0018 — `planeacion.metadata jsonb`** (la crea SOFIA, no INTEGRA):

```sql
-- 0018_planeacion_metadata.sql
-- SPEC_MODALIDADES_2026-08-17 VALIDACIÓN INTEGRA — soporte de campos por modalidad
alter table planeacion
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column planeacion.metadata is
  'Datos específicos por modalidad pedagógica (P-PD5/D-FIN-6). '
  'Estructura: { "modalidad_data": { ... } }. Ver SPEC_MODALIDADES §metadata. '
  'NO afecta RLS: las policies existentes filtran por docente_id + cct.';
```

**Estructura canónica de `metadata.modalidad_data`** (contrato para SOFIA):

```jsonc
// Proyecto Comunitario — no requiere metadata extra (usa sesiones existentes)
{ "modalidad_data": {} }

// Unidad Didáctica — sesiones L M M J V + actividades recurrentes
{
  "modalidad_data": {
    "sesiones_semana": {
      "lunes": "Título sesión lunes",          // string, opcional
      "martes": "...", "miercoles": "...",
      "jueves": "...", "viernes": "..."
    },
    "actividades_recurrentes": [               // D-FIN-8 (opcional, MVP opcional)
      { "dia": "lunes", "titulo": "Escribir fecha", "recurrente": true }
    ]
  }
}

// Rincones — lista + materiales + reglas
{
  "modalidad_data": {
    "rincones": [
      { "nombre": "Rincón de lectura", "materiales": ["Libros", "Cojines"], "reglas": "..." }
    ]
  }
}

// Centros de Interés — tema + preguntas detonadoras + estaciones
{
  "modalidad_data": {
    "tema": "Los animales de mi comunidad",
    "preguntas_det": ["¿Qué animales conocemos?", "¿Dónde viven?"],
    "estaciones": ["Exploración", "Clasificación", "Creación"]
  }
}

// Taller Crítico — 3 fases internas (mapea a sesiones)
{ "modalidad_data": { "fases": ["reflexion", "produccion", "socializacion"] } }

// ABJ — 3 momentos (mapea a sesiones con fase_interna existente)
{ "modalidad_data": { "tipo_juego": "simbólico", "reglas": "...", "extension": "..." } }
```

**Por qué `metadata jsonb` y no columnas nuevas por modalidad:**
1. **No toca RLS existente**: `planeacion_docente_own` filtra por
   `docente_id = auth.uid() and cct = user_cct()` — el jsonb no afecta la policy.
   Cumple la regla dura "NO modifiques reglas de RLS existentes".
2. **Patrón consistente**: `docente.configuracion_m4 jsonb` ya usa jsonb para
   datos flexibles en el mismo schema (SPEC_TEC_02 §5.3.1).
3. **Escalable**: permite agregar modalidades nuevas sin migración.
4. **Validación client-side + zod en server action**: la estructura JSON se
   valida con zod en `planeacion-actions.ts` (espejo del schema).

**No se altera `sesion.fase_interna`**: la columna existe con 3 valores
(`inicio`/`desarrollo`/`cierre`). Las "5 fases" de Proyecto Comunitario y
"3 fases" de Taller Crítico se modelan como sesiones separadas (filas) con
`numero` 1..5 y `fase_interna` mapeado a la categoría pedagógica genérica.
Modificar el check constraint de `fase_interna` sería destructivo (DROP+CREATE
constraint) y arriesga datos existentes — fuera de alcance.

### 🟡 P1 — Mejoras pendientes (no bloqueantes, prioridad alta)

#### P1.1 — Validaciones condicionales faltantes en server actions

`planeacion-actions.ts:60-85` solo implementa validación condicional para
`unidad_didactica` y deja `null` (pasa) para `rincones`, `centros_interes`,
`abj`, `taller_critico`. La SPEC original §Validación por modalidad tabla
exige validar todos. SOFIA debe completar:

| Modalidad | Validación requerida (con metadata) |
|-----------|-------------------------------------|
| `unidad_didactica` | `banco_palabras` ≥1 (ya implementado) + `metadata.modalidad_data.sesiones_semana` ≥1 día |
| `rincones` | `metadata.modalidad_data.rincones` ≥2, cada uno con `nombre` no vacío |
| `centros_interes` | `metadata.modalidad_data.tema` no vacío + `preguntas_det` ≥1 |
| `abj` | (opcional) `metadata.modalidad_data.tipo_juego` no vacío si se captura |
| `taller_critico` | `metadata.modalidad_data.fases` = 3 valores |
| `proyecto_comunitario` | (existente) `producto_integrador` requerido para exportar |

Firma del esquema zod sugerida para `metadata` (la implementa SOFIA):

```ts
const MetadataSchema = z.object({
  modalidad_data: z.record(z.unknown()).default({})
}).optional();
```

Mensajes de error claros para la maestra (en español, sin jerga técnica):

- `'Unidad Didáctica necesita al menos un día con sesión (L M M J V)'`
- `'Rincones necesita al menos 2 rincones con nombre'`
- `'Centros de Interés necesita un tema y al menos una pregunta detonadora'`
- `'Taller Crítico necesita 3 fases definidas'`

#### P1.2 — Edge case: cambio de modalidad a mitad del wizard

La SPEC original NO documenta este caso. Comportamiento requerido (lo implementa
SOFIA en `components/planeaciones/wizard-planeacion.tsx`):

1. Cuando la maestra cambia de modalidad después de haber capturado datos
   específicos (ej. estaba en `centros_interes` con `tema` capturado, cambia a
   `rincones`):
   - **NO** preservar automáticamente los campos específicos de la modalidad
     anterior (causa confusión: `tema` no aplica a `rincones`).
   - Mostrar confirmación: `"Al cambiar a [Nueva modalidad], se perderán los
     datos específicos de [Modalidad anterior] (tema, preguntas, etc.). Los
     campos comunes (problema, campos formativos, PDA) se conservan. ¿Continuar?"`.
   - Al confirmar: limpiar `metadata.modalidad_data` (vaciar objeto, no eliminar
     la columna). Mantener `problema_contexto`, `campos_formativos`, `pdas`,
     `ejes_articuladores`, `periodo_inicio/fin`.
2. Opcional (MVP puede omitir): preservar `metadata.modalidad_data` de la
   modalidad anterior en `metadata._historico_modalidades[]` para restaurar si
   la maestra vuelve. **Recomendación para MVP: NO implementar** — la
   confirmación es suficiente y reduce complejidad.

#### P1.3 — Anti-pattern UX en `wizard-calendario-semanal.tsx`

`wizard-calendario-semanal.tsx:129` usa `window.prompt()` para capturar el título
de la sesión al hacer click en "+ Asignar sesión". Esto es un anti-pattern P-UX
(bloquea el flujo, no es accesible, no se ve bien en mobile).

**Corrección requerida:** reemplazar por un `Dialog` de shadcn/ui con un `Input`
y botones "Asignar" / "Cancelar". El componente `Dialog` ya está en
`components/ui/dialog.tsx` (verificar existencia; si no, instalar con
`pnpm dlx shadcn-ui@latest add dialog`).

Alternativa más simple: usar un `Input` inline dentro de la celda (toggle
visible al hacer click en "+ Asignar sesión"). Es más simple y mantiene el flujo.

### Componentes shadcn/ui a verificar/instalar

La implementación actual YA usa: `button`, `badge`, `card`, `input`, `label`.
Antes de la próxima sesión SOFIA debe verificar que existen:
- `components/ui/dialog.tsx` (para P1.3 — reemplazo de `window.prompt`)
- `components/ui/radio-group.tsx` (opcional — el código actual usa radio nativo, válido)
- `components/ui/sheet.tsx` (para mobile hamburger menu en `app-header` si no se usa)

Si falta alguno: `pnpm dlx shadcn-ui@latest add <component>`.

### Resumen de acciones para SOFIA (próxima sesión)

1. **CRÍTICO**: Crear migración `0018_planeacion_metadata.sql` (DDL arriba).
2. **CRÍTICO**: Modificar `planeacion-actions.ts` para persistir
   `metadata: data.metadata ?? {}` en el insert (línea 134 aprox.) y
   completar validaciones condicionales (P1.1).
3. **CRÍTICO**: Modificar `wizard-planeacion.tsx` para enviar `metadata` en
   el payload del submit, con estructura `modalidad_data` por modalidad.
4. **ALTA**: Reemplazar `window.prompt()` en `wizard-calendario-semanal.tsx`
   por Dialog o Input inline (P1.3).
5. **ALTA**: Implementar confirmación de cambio de modalidad en
   `wizard-planeacion.tsx` (P1.2).
6. **VALIDACIÓN**: `pnpm typecheck && pnpm lint && pnpm build` + smoke test
   de las 6 modalidades (curl POST a `/planeaciones/nueva` con cada modalidad
   y verificar que `metadata.modalidad_data` se persiste en BD).

### Gates para DONE de esta remediación

1. Migración 0018 aplicada en Supabase (local + staging).
2. `planeacion.metadata jsonb` aparece en `\d planeacion` (verificación psql).
3. Crear planeación con cada una de las 6 modalidades y verificar que
   `metadata.modalidad_data` se persiste con los campos esperados (curl o
   Supabase Studio).
4. Cambiar de `centros_interes` a `rincones` a mitad del wizard → confirmación
   aparece → `metadata.modalidad_data` queda vacío tras cambio.
5. `typecheck && lint && build` PASS.
6. GEMINI audit (recomendado: contrato público `planeacion.metadata` cambia,
   though RLS no se toca — clasificar como riesgo medio, no crítico).

---

## Contexto (original, sesión 5 — Kilo/orquestador)

El wizard de creación de planeación actualmente solo soporta **proyecto_comunitario** como modalidad. Frank está probando y quiere ver las otras 5 modalidades NEM disponibles: Unidad Didáctica, ABJ, Rincones, Centros de Interés, Taller Crítico.

Esta spec implementa las 5 modalidades restantes con sus estructuras diferenciadas, según E22 §3 y las características pedagógicas de cada una.

**REGLA DURA:** NO modifiques `Educacion/specs/SPEC_TEC_*.md`. NO implementes IA real. NO commitees sin OK de Frank.

---

## Modalidades a implementar (5 nuevas + 1 ya existente)

| # | Modalidad | E22 Ref | Estructura diferenciada |
|---|-----------|---------|------------------------|
| 1 | `proyecto_comunitario` | D-FIN-1 (ya existe) | 5 fases: Motivación → Diseño → Acción → Finalización → Evaluación |
| 2 | `unidad_didactica` | D-FIN-7 (banco palabras + sesiones) | Banco palabras + calendario L M M J V + actividades recurrentes |
| 3 | `abj` | D-FIN-1 (modalidad 3) | Inicio juego → Desarrollo → Cierre/reflexión |
| 4 | `rincones` | D-FIN-1 (modalidad 4) | Lista de rincones + materiales por rincón + reglas |
| 5 | `centros_interes` | D-FIN-1 (modalidad 5) | Tema + preguntas detonadoras + estaciones |
| 6 | `taller_critico` | D-FIN-1 (modalidad 6) | Reflexión → Producción → Socialización |

**El schema SQL ya valida estas 6 modalidades en `planeacion.modalidad`:**
```sql
check (modalidad in ('proyecto_comunitario','unidad_didactica','abj','rincones','centros_interes','taller_critico'))
```

⚠️ **CORRECCIÓN INTEGRA 2026-08-18:** La afirmación original "No necesitas
cambiar BD" es **FALSA** para los campos extra (`rincones`, `preguntas_det`,
`tema`, `fases`, `sesiones L M M J V`). El check constraint de `modalidad` sí
existe, pero NO hay columnas para esos datos específicos por modalidad.
**Requiere migración 0018 con `planeacion.metadata jsonb`** — ver sección
VALIDACIÓN INTEGRA arriba para el DDL completo y la estructura `modalidad_data`.
La afirmación de SOFIA en sesión 5 ("no hay columnas para rincones,
preguntas_det, tema, fases ni sesiones") es **CORRECTA** y está confirmada
por lectura del schema (migración 0010 + SPEC_TEC_02 §5.3.6).

---

## Archivos a crear/modificar

### NUEVO: `app/(app)/planeaciones/nueva/_components/wizard-modalidad-selector.tsx`

Componente client que muestra los 6 radio buttons con descripciones de cada modalidad. Click en cada uno actualiza el state del wizard.

```typescript
'use client';
const MODALIDADES = [
  { value: 'proyecto_comunitario', label: 'Proyecto Comunitario', desc: 'Responde a un problema real de la comunidad. 5 fases.', duracion: '2-6 semanas' },
  { value: 'unidad_didactica', label: 'Unidad Didáctica', desc: 'Tema estructurado con banco de palabras y sesiones L M M J V.', duracion: '1-4 semanas' },
  { value: 'abj', label: 'Aprendizaje Basado en Juego', desc: 'Aprendizaje a través del juego. 3 momentos.', duracion: '1-2 semanas' },
  { value: 'rincones', label: 'Rincones de Aprendizaje', desc: 'Estaciones paralelas con materiales específicos.', duracion: '1 semana' },
  { value: 'centros_interes', label: 'Centros de Interés', desc: 'Tema + preguntas detonadoras + estaciones.', duracion: '1 semana' },
  { value: 'taller_critico', label: 'Taller Crítico', desc: 'Reflexión → Producción → Socialización.', duracion: '1 semana' },
];
```

### MODIFICAR: `app/(app)/planeaciones/nueva/page.tsx`

- Cambiar el paso 1 (modalidad) para usar el nuevo componente
- Pasar la modalidad seleccionada al resto del wizard

### MODIFICAR: `app/(app)/planeaciones/nueva/_components/wizard-planeacion.tsx`

El wizard debe adaptar su estructura según la modalidad elegida:

```
Si modalidad === 'unidad_didactica':
  - Mostrar paso "Banco de palabras" (campo text[] de hasta 10 palabras)
  - Mostrar calendario L M M J V en lugar de días consecutivos
  - Agregar paso "Actividades recurrentes paralelas" (opcional)

Si modalidad === 'abj':
  - Renombrar paso "Desarrollo" a "Desarrollo del juego"
  - Reducir a 3 momentos en lugar de 5

Si modalidad === 'rincones':
  - Agregar paso "Lista de rincones" (array de strings)
  - Agregar paso "Materiales por rincón" (JSON por rincón)

Si modalidad === 'centros_interes':
  - Agregar paso "Tema del centro"
  - Agregar paso "Preguntas detonadoras" (array de strings)

Si modalidad === 'taller_critico':
  - Renombrar paso "Reflexión inicial"
  - Simplificar a 3 fases
```

### NUEVO: `app/(app)/planeaciones/nueva/_components/wizard-banco-palabras.tsx`

Para Unidad Didáctica:
- Input que acepta texto separado por comas
- Convierte a array y guarda en `planeacion.banco_palabras text[]`
- Máximo 10 palabras
- Vista previa como chips

### NUEVO: `app/(app)/planeaciones/nueva/_components/wizard-calendario-semanal.tsx`

Para Unidad Didáctica:
- Grid L M M J V (5 días)
- Cada día puede tener una sesión
- Drop de bloques M1 a cada día
- Total máximo: 5 sesiones (1 por día)

### MODIFICAR: `services/planeaciones/planeacion-actions.ts`

- En `createPlaneacion()`, validar que:
  - `modalidad === 'unidad_didactica'` → requerir `banco_palabras` (≥1 palabra)
  - `modalidad === 'rincones'` → requerir `rincones` (≥2)
  - etc.

---

## Server actions (modificaciones)

⚠️ **CORRECCIÓN INTEGRA 2026-08-18:** El código original de esta sección
referenciaba `data.banco_palabras` y `data.rincones` como campos top-level.
El código real en `services/planeaciones/planeacion-actions.ts` usa
**camelCase** (`data.bancoPalabras`) y **no tiene** `data.rincones` (los
rincones van en `data.metadata.modalidad_data.rincones` post-migración 0018).

### `createPlaneacion()` - Validación condicional

**Esquema zod canónico (post-migración 0018):**

```typescript
// BaseSchema (existente, mantener)
bancoPalabras: z.array(z.string()).default([]),

// NUEVO campo metadata (agregar a BaseSchema)
metadata: z.object({
  modalidad_data: z.record(z.unknown()).default({}),
}).default({}),
```

**Validación condicional completa (reemplaza la versión parcial actual
en `planeacion-actions.ts:60-85`):**

```typescript
function validarModalidad(data: z.infer<typeof BaseSchema>): string | null {
  const md = data.metadata?.modalidad_data ?? {};

  switch (data.modalidad) {
    case 'unidad_didactica':
      if (!data.bancoPalabras || data.bancoPalabras.length === 0) {
        return 'Unidad Didáctica requiere banco de palabras (≥1 palabra)';
      }
      if (data.bancoPalabras.length > 10) {
        return 'Banco de palabras máximo 10';
      }
      const sesionesSemana = md.sesiones_semana as Record<string, string> | undefined;
      if (!sesionesSemana || Object.keys(sesionesSemana).length === 0) {
        return 'Unidad Didáctica necesita al menos un día con sesión (L M M J V)';
      }
      return null;

    case 'rincones': {
      const rincones = Array.isArray(md.rincones) ? md.rincones : [];
      if (rincones.length < 2) {
        return 'Rincones requiere al menos 2 rincones con nombre';
      }
      const sinNombre = rincones.filter((r: any) => !r?.nombre || String(r.nombre).trim() === '');
      if (sinNombre.length > 0) {
        return 'Cada rincón debe tener un nombre';
      }
      return null;
    }

    case 'centros_interes': {
      const tema = md.tema as string | undefined;
      const preguntas = Array.isArray(md.preguntas_det) ? md.preguntas_det : [];
      if (!tema || tema.trim().length < 3) {
        return 'Centros de Interés necesita un tema (≥3 caracteres)';
      }
      if (preguntas.length < 1) {
        return 'Centros de Interés necesita al menos una pregunta detonadora';
      }
      return null;
    }

    case 'taller_critico': {
      const fases = Array.isArray(md.fases) ? md.fases : [];
      if (fases.length !== 3) {
        return 'Taller Crítico necesita 3 fases (reflexión, producción, socialización)';
      }
      return null;
    }

    case 'abj':
    case 'proyecto_comunitario':
    default:
      return null;
  }
}
```

**Insert a Supabase (con metadata post-migración 0018):**

```typescript
const { data: row, error } = await supabase
  .from('planeacion')
  .insert({
    // ...campos existentes...
    banco_palabras: data.bancoPalabras,
    metadata: { modalidad_data: data.metadata?.modalidad_data ?? {} },  // NUEVO
    // ...resto...
  })
  .select('id')
  .single();
```

---

## Validación por modalidad

| Modalidad | Validación específica | Campos requeridos extra |
|-----------|----------------------|--------------------------|
| `proyecto_comunitario` | (existente) | producto_integrador |
| `unidad_didactica` | nueva | banco_palabras, sesiones L M M J V |
| `abj` | nueva | sesiones (3 momentos) |
| `rincones` | nueva | rincones array, materiales por rincón |
| `centros_interes` | nueva | tema, preguntas_det array |
| `taller_critico` | nueva | sesiones (3 fases) |

---

## Orden de implementación

1. **`wizard-modalidad-selector.tsx`** (NUEVO) - los 6 radio buttons
2. **`wizard-banco-palabras.tsx`** (NUEVO) - input con chips
3. **`wizard-calendario-semanal.tsx`** (NUEVO) - grid L M M J V
4. **Modificar `wizard-planeacion.tsx`** - estructura condicional por modalidad
5. **Modificar `planeacion-actions.ts`** - validación condicional
6. **Re-deploy**

---

## Estimación de tiempo

- Modalidad selector: 20 min
- Banco de palabras: 15 min
- Calendario semanal: 30 min
- Modificar wizard existente: 45 min
- Validación server actions: 15 min
- Build + tests + deploy: 20 min
- **Total: ~2.5 horas**

---

## Restricciones (CRÍTICO)

- ❌ NO modifiques `Educacion/specs/SPEC_TEC_*.md`
- ❌ NO implementes IA real (las 6 sugerencias estáticas de C-5 son suficientes)
- ❌ NO commitees sin OK de Frank
- ❌ NO borres archivos
- ❌ NO uses secrets hardcoded
- ❌ NO alojes contenido CONALITEG
- ❌ NO uses react-dnd legacy (usa @dnd-kit)

---

## Entregables

Al final, reporta con:

1. **Reporte** `Educacion/specs/IMPL-20260817-05_report.md` con:
   - Lista de archivos creados/modificados
   - Build status (typecheck, lint, build, tests)
   - Deploy exitoso (URL)
   - Decisiones internas tomadas
2. **Verificación end-to-end** de las 6 modalidades con curl o similar
3. **Screenshots** del nuevo selector de modalidad (opcional)

---

**ID delegación:** SOFIA-IMPL-MVP-2026-08-17-SESION-5

**Son las 23:32. Esta sesión es CRÍTICA porque Frank está descubriendo gaps del MVP. Mantén el código simple y consistente con el estilo existente.**