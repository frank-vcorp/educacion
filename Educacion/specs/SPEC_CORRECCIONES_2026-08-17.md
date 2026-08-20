# SPEC-CORRECCIONES-2026-08-17 — Fixes UX/UI post-deploy MVP

**ID:** SPEC-CORRECCIONES-2026-08-17
**Autor:** INTEGRA
**Fecha:** 2026-08-17 22:50 UTC-6
**Para:** SOFIA (sesión 4)
**Prioridad:** ALTA — Frank está probando y reporta gaps

---

## ⚠️ VALIDACIÓN INTEGRA — 2026-08-18 00:30 UTC-6

**Origen:** INTEGRA-VALID-2026-08-18-01 (delegación de Kilo/orquestador).
**Alcance:** verificación post-implementación contra código real del repo.

### Estado real de implementación (verificado por lectura de código)

Los 7 issues C-1 a C-7 **YA ESTÁN IMPLEMENTADOS** en sesión 4:

| Issue | Estado | Archivo(s) verificados | Notas |
|-------|--------|------------------------|-------|
| C-1 `/perfil` | ✅ IMPLEMENTADO | `app/(app)/perfil/page.tsx` (146 líneas) + `EditarCCTForm` | Card + Badge + lookup escuela por CCT. Cumple P-PD3 (autocomplete CCT). |
| C-2 editar grupo | ✅ IMPLEMENTADO | `app/(app)/grupos/[id]/editar/page.tsx` (63 líneas) + `EditarGrupoForm` | Carga conteo de alumnos para advertencia (ver P2.1 abajo). |
| C-3 alumnos CRUD | ✅ IMPLEMENTADO | `app/(app)/alumnos/page.tsx` (83 líneas) + `AlumnosManager` + `services/alumnos/alumno-actions.ts` | EmptyState + Card + count visible. |
| C-4 header/nav | ✅ IMPLEMENTADO | `app/(app)/_components/app-header.tsx` (31 líneas) + `NavMenu` + `UserMenu` + `GrupoSelector` | Refactorizado en sub-componentes. Logo "NEM" + nav + selector grupo + user menu. |
| C-5 sugerencias IA | ⚠️ IMPLEMENTADO con gaps P-PD9 | `app/(app)/planeaciones/nueva/_components/sugerencias-ia.tsx` (50 líneas) + `sugerencias-data.ts` | Ver P1 abajo — violaciones P-PD9. |
| C-6 404 custom | ✅ IMPLEMENTADO | `app/not-found.tsx` (40 líneas) | Botones "Volver al Dashboard" + "Ir al inicio" + diseño NEM. |
| C-7 empty states | ✅ IMPLEMENTADO | `app/(app)/dashboard/page.tsx` (236 líneas, 6 EmptyState) | 3 empty states: sin grupo, sin planeaciones, sin recursos. |

### 🟡 P1 — Mejoras P-PD9 pendientes para C-5 (sugerencias IA estáticas)

`E20_PRINCIPIOS_DISENNO_PRODUCTO.md` P-PD9 define reglas duras para
sugerencias. La implementación actual de `sugerencias-ia.tsx` cumple
parcialmente:

| Regla P-PD9 | ¿Cumple? | Detalle |
|-------------|----------|---------|
| Mostrar sugerencia como texto alternativo | ✅ | Botones con texto completo. |
| Maestra hace clic para usar UNA sugerencia | ✅ | `onClick={() => onSelect(s)}` — requiere click explícito. |
| Campo siempre editable | ✅ | `onSelect` rellena pero el textarea padre permanece editable. |
| No autocompletar sin mostrar sugerencia | ✅ | Nunca autocompleta sin click. |
| **Disparador explícito** para mostrar sugerencias | ❌ | `sugerencias-ia.tsx` renderiza el panel SIEMPRE debajo del textarea, sin disparador. **Violación anti-pattern #7**: "Mostrar siempre sugerencias (debe haber un disparador explícito)". |
| **Botón descartar** todas las sugerencias | ❌ | No hay forma de ocultar/cerrar el panel. **Violación**: "La maestra puede descartar todas las sugerencias". |
| **Provenance / AuditBadge** (origen del texto) | ⚠️ Parcial | Tiene badge "Estático · sin IA" (transparencia ✓). Pero no marca `origen: 'ia_sugerencia'` en el campo al aceptar — el audit trail de P-PD9 no se aplica. **Justificación**: como es estática (no IA), el audit trail es menos crítico. Pero cuando F1 (IA real) llegue, deberá implementarse. |

**Correcciones requeridas para C-5 (próxima sesión SOFIA):**

1. **Disparador explícito**: envolver `SugerenciasIA` en un componente
   colapsable. Mostrar un botón "💡 Ver sugerencias para tu contexto" que
   expande/contrae el panel. Estado local con `useState<boolean>(false)`.
2. **Botón descartar**: agregar botón "Cerrar" en el header del panel que
   colapsa el panel (mismo state local).
3. **Provenance**: cuando la maestra acepta una sugerencia, marcar el texto
   insertado con metadata `origen: 'ia_sugerencia'` en el store del wizard
   (`usePlaneacionStore`). Aunque ahora es estática, esto prepara el terreno
   para F1 (IA real) y cumple el patrón canónico `components/ia/AuditBadge.tsx`
   previsto en `SPEC_TEC_04 §3` (que aún no existe — ver P2.2).

**Alternativa arquitectónica (recomendada a futuro):** crear
`components/ia/SugerenciaPanel.tsx` reutilizable (canónico en SPEC_TEC_04 §3)
y migrar `sugerencias-ia.tsx` a usarlo. Esto da consistencia para F1, F2, F3,
F-IA1. **Para MVP NO es bloqueante** — la corrección inline (puntos 1-2) es
suficiente.

### 🟡 P2 — Mejoras menores (no bloqueantes)

#### P2.1 — C-2: comportamiento de "Eliminar grupo con alumnos"

La spec original decía "no permitir eliminar grupo con alumnos asignados
(opcional MVP)". El código actual (`EditarGrupoForm`, no leído en este turno)
recibe `totalAlumnosRegistrados` — la implementación del comportamiento real
debe verificarse. **Recomendación canónica:** bloquear eliminación con
mensaje claro `"Tienes N alumnos en este grupo. Muévelos a otro grupo o
elimínalos primero antes de borrar este grupo."` + ofrecer redirect a
`/alumnos`. NO usar `on delete cascade` silencioso — causa pérdida de datos
sin confirmación.

#### P2.2 — `components/ia/` vacío

`components/ia/` solo contiene `.gitkeep`. Los componentes canónicos
`SugerenciaPanel.tsx`, `SugerenciaChip.tsx`, `AuditBadge.tsx` previstos en
SPEC_TEC_04 §3 NO existen. La implementación actual de C-5 es inline en
`app/(app)/planeaciones/nueva/_components/sugerencias-ia.tsx` (alternativa
válida para MVP, ver P1 alternativa arriba).

#### P2.3 — Inconsistencia de paths API

Las secciones C-1, C-2, C-3 originales mencionaban `PATCH /api/docente/:id`,
`PATCH/DELETE /api/grupos/:id`, `GET/POST/PATCH/DELETE /api/alumnos`.
`SPEC_TEC_03_API_Contract.md` canónico usa `/api/v1/...` (versionado).

La implementación real **NO usa route handlers `/api/...`** sino **server
actions** en `services/<dominio>/<dominio>-actions.ts` (patrón Next.js
App Router, permitido por SPEC_TEC_04 §5.5). Esto es **consistente con el
código existente** y no requiere corrección. Las menciones a `/api/...` en
esta spec son informativas — la implementación real (server actions) es la
canónica para este proyecto. **No requiere acción de SOFIA.**

### Componentes shadcn/ui a verificar/instalar

La implementación actual YA usa: `button`, `badge`, `card`, `input`, `label`,
`dialog` (implícito en `EditarCCTForm`/`EditarGrupoForm`/`AlumnosManager`).

Verificar que existen antes de la próxima sesión:
- `components/ui/dialog.tsx` (si se va a corregir C-5 con Dialog colapsable)
- `components/ui/sheet.tsx` (mobile hamburger en `app-header` — verificar
  `NavMenu` para ver si ya usa Sheet o solo CSS)
- `components/ui/separator.tsx`, `components/ui/tooltip.tsx` (cosmético)

Si falta alguno: `pnpm dlx shadcn-ui@latest add <component>`.

### Resumen de acciones para SOFIA (próxima sesión)

1. **ALTA**: Corregir C-5 — agregar disparador explícito (botón colapsable)
   + botón descartar en `sugerencias-ia.tsx`. Ver P1 arriba.
2. **MEDIA**: Verificar comportamiento de "Eliminar grupo con alumnos" en
   `EditarGrupoForm` — confirmar bloqueo con mensaje claro (P2.1).
3. **MEDIA**: Verificar existencia de `dialog.tsx`, `sheet.tsx` en
   `components/ui/`. Instalar si faltan.
4. **BAJA (Fase 2)**: Crear `components/ia/SugerenciaPanel.tsx` canónico y
   migrar `sugerencias-ia.tsx` a usarlo. NO bloqueante para MVP.

### Gates para DONE de esta remediación

1. C-5 con disparador explícito + descartar → test manual: abrir wizard,
   escribir problema, verificar que el panel de sugerencias está colapsado
   por defecto, expandirlo, aceptar una sugerencia, descartar todas.
2. `pnpm typecheck && pnpm lint && pnpm build` PASS.
3. Smoke test: crear planeación completa (las 6 modalidades funcionan con
   sus estructuras diferenciadas — ver SPEC_MODALIDADES P0 para el gate
   paralelo de persistencia).

### Validación contra los 15 criterios (resumen ejecutivo)

| Criterio | Resultado | Nota |
|----------|-----------|------|
| A. Coherencia specs técnicas | ✅ + ⚠️ | Estructura carpetas OK. `planeacion.modalidad` check OK. Gap: campos extra no existen en BD (resuelto via migración 0018 en SPEC_MODALIDADES). |
| B. P-PD1 (85/15) | ✅ | Sugerencias son click-to-fill (selección), banco de palabras es escritura justificada (contexto único). |
| B. P-PD6 (4 niveles) | ✅ | C-5 y modalidades no tocan rúbrica. Mantiene. |
| B. P-PD8/P-PD9 (IA solo sugiere) | ⚠️ | C-5 cumple P-PD8 (no es IA). P-PD9: 2 violaciones (disparador, descartar) — ver P1. |
| C. Esquema BD | ❌ → ✅ con migración 0018 | SOFIA tenía razón: faltan columnas. Solución: `planeacion.metadata jsonb` (no toca RLS). |
| D. Componentes UI | ✅ | shadcn/ui usado correctamente. Verificar `dialog.tsx`, `sheet.tsx` existencia. |
| E. API contracts | ✅ | Server actions en `services/` canónicas. Validación condicional incompleta (ver SPEC_MODALIDADES P1.1). |
| F. Calendario semanal | ✅ + ⚠️ | Grid L M M J V OK. Persiste como filas en `sesion`. Anti-pattern `window.prompt` (P1.3 SPEC_MODALIDADES). |
| G. Modalidades condicionales | ✅ + ⚠️ | 6 estructuras diferenciadas claras. Adaptación wizard OK. Persistencia es el gap (P0 SPEC_MODALIDADES). |
| H. Edge cases | ❌ → ✅ | Cambio de modalidad no documentado — agregado en SPEC_MODALIDADES P1.2. |

---

## Contexto (original, sesión 4 — Kilo/orquestador)

SOFIA ya hizo 3 sesiones que implementaron el MVP completo (auth, onboarding 5 pasos, wizard 8 pasos, recursos, rúbrica, PDF, PWA, CONALITEG viewer, etc.). Deploy está en https://educacion-nem-mvp.vercel.app.

Frank está probando el flujo real como usuario y encontró **gaps de UX/UI** que no fueron detectados en las auditorías previas. Estos gaps no son bugs técnicos sino **funcionalidad incompleta** que asumimos existir pero no implementamos.

**REGLA DURA:** NO modifiques las specs técnicas. NO implementes IA real (F1 queda como sugerencia estática). NO commitees sin OK de Frank.

---

## Issues a resolver (7)

### C-1. Página `/perfil` con edición de CCT y datos del docente

**Severidad:** ALTA (Frank lo pidió explícitamente)
**Origen:** Frank quiso editar su CCT después de onboarding, no encontró la opción.

**Ruta:** `/perfil`
**Archivo:** `app/(app)/perfil/page.tsx` (NUEVO)

**Comportamiento esperado:**
- Server component que carga `getServerSession()` y los datos del docente
- Muestra:
  - Nombre completo
  - Email
  - CCT (con badge)
  - Nivel (preescolar/primaria/secundaria)
  - Escuela (lookup vía cct → escuela_id)
  - Estado activo/inactivo
  - Botón "Editar CCT" (abre form inline o modal)
- Form de edición:
  - Selector CCT con autocomplete (reutilizar lógica de onboarding)
  - Selector nivel
  - Botón "Guardar"
  - Validación server-side

**API endpoint necesario:** `PATCH /api/docente/:id` (server action o route handler)

**No incluir:**
- Cambio de password (Supabase Auth lo maneja por separado)
- Cambio de email
- Avatar/foto

---

### C-2. Edición de grupo creado

**Severidad:** ALTA
**Origen:** Frank creó un grupo y notó que no puede editarlo después.

**Ruta:** `/grupos/[id]/editar` o `/dashboard?editGrupo=[id]`
**Archivos:**
- `app/(app)/grupos/[id]/editar/page.tsx` (NUEVO)
- O agregar modal en dashboard

**Comportamiento esperado:**
- Server component que carga el grupo
- Form prellenado con grado, grupo, ciclo_escolar, total_alumnos
- Botón "Guardar" + "Eliminar grupo"
- Validación: no permitir eliminar grupo con alumnos asignados (opcional MVP)

**API endpoint necesario:** `PATCH /api/grupos/:id` y `DELETE /api/grupos/:id`

**Server actions:** `app/(app)/grupos/actions.ts` con `updateGrupo()` y `deleteGrupo()`

---

### C-3. Lista de alumnos post-onboarding (agregar más)

**Severidad:** ALTA
**Origen:** Frank terminó paso 4 con N alumnos, no puede agregar más.

**Ruta:** `/alumnos` o `/grupos/[id]/alumnos`
**Archivos:**
- `app/(app)/alumnos/page.tsx` (NUEVO o MEJORAR onboarding/alumnos)
- Server actions en `services/alumnos/`

**Comportamiento esperado:**
- Lista de todos los alumnos del grupo activo (con búsqueda)
- Botón "Agregar alumno" (form inline o modal)
- Cada alumno tiene acciones: editar, eliminar
- Total de alumnos visible
- Empty state si no hay alumnos

**Componentes UI sugeridos:**
- `AlumnosTable` (tabla o lista)
- `AlumnoForm` (form para crear/editar)
- `EliminarAlumnoDialog` (confirmación)

**API endpoints necesarios:** `GET/POST/PATCH/DELETE /api/alumnos`

---

### C-4. Menú/navegación completo en header

**Severidad:** ALTA
**Origen:** Frank no encuentra cómo volver al inicio, no hay menú claro.

**Archivo:** `app/(app)/_components/app-header.tsx` (MODIFICAR)

**Comportamiento esperado:**
- Logo "NEM" → link a /dashboard
- Menú principal visible (desktop y mobile):
  - 🏠 Dashboard
  - 📚 Mis planeaciones
  - 👥 Alumnos
  - 📦 Recursos del aula
  - 📖 Biblioteca CONALITEG
  - 📋 Catálogo NEM (dropdown con: Campos / PDA / Bloques M1 / Libros)
- Indicador de grupo actual (1° A preescolar)
- Avatar/nombre del usuario → dropdown con:
  - Ver perfil
  - Configuración
  - Cerrar sesión
- Mobile: hamburger menu

**Mejoras al componente actual:**
- Agregar links de navegación principales
- Agregar dropdown de usuario
- Mantener consistencia con design system (verde NEM #1F8A4C)

---

### C-5. F1 — Sugerencias IA en wizard paso 2 (sin IA externa)

**Severidad:** MEDIA
**Origen:** Frank esperaba ver sugerencias IA en el campo "problema del contexto" del wizard.

**Archivo:** `app/(app)/planeaciones/nueva/_components/wizard-problema.tsx` (NUEVO o MODIFICAR)

**IMPORTANTE:** Frank NO tiene `AI_API_KEY` configurada. **NO implementes llamadas a MiniMax**. Solo agregamos **sugerencias estáticas** hardcodeadas.

**Comportamiento esperado:**
- Después del textarea "problema del contexto", mostrar un panel "💡 Sugerencias para tu contexto"
- 3-4 sugerencias hardcodeadas por nivel (preescolar/primaria/secundaria)
- Click en sugerencia → rellena el textarea
- Las sugerencias son contextualmente relevantes (ej: para preescolar: "Los niños botan basura en el patio...", "Mis alumnos tienen conflictos al compartir...")

**NO incluir:**
- Llamadas a MiniMax M3
- Streaming de respuestas
- Cache
- PII anonymization (no hay llamada externa)

**Estructura de sugerencias (preescolar):**
```typescript
const SUGERENCIAS_PREESCOLAR = [
  "Los niños botan basura en el patio y no la clasifican para reciclar.",
  "Mis alumnos tienen conflictos al compartir juguetes durante el recreo.",
  "Algunos niños no reconocen las emociones básicas (alegría, tristeza, enojo).",
  "Las familias no conocen cómo apoyar el aprendizaje en casa.",
  "Los niños no identifican figuras geométricas básicas en su entorno.",
];
```

**Componente:**
```typescript
'use client';
import { useState } from 'react';
import { SUGERENCIAS_PREESCOLAR } from './sugerencias';

export function SugerenciasIA({ nivel, onSelect }: ...) {
  const sugerencias = nivel === 'preescolar' ? SUGERENCIAS_PREESCOLAR : SUGERENCIAS_OTROS;
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">💡 Sugerencias para tu contexto</p>
      <p className="text-xs text-muted-foreground">Click para usar</p>
      <ul className="mt-3 space-y-2">
        {sugerencias.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className="text-left w-full rounded-md border bg-card p-3 text-sm hover:bg-accent"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### C-6. Página 404 custom

**Severidad:** BAJA
**Origen:** Cuando Frank accedió a `/perfil` que no existe, vio el 404 default de Next.js.

**Archivos:**
- `app/not-found.tsx` (NUEVO)
- O `app/(app)/not-found.tsx`

**Comportamiento esperado:**
- Diseño consistente con la app (verde NEM)
- Mensaje: "Página no encontrada"
- Botón grande: "Volver al Dashboard" → link a /dashboard
- Botón secundario: "Ir al inicio" → link a /

---

### C-7. Empty states mejorados en dashboard

**Severidad:** MEDIA
**Origen:** Frank vio el dashboard vacío sin guía clara de qué hacer.

**Archivo:** `app/(app)/dashboard/page.tsx` (MODIFICAR)

**Comportamiento esperado:**
- Cuando `planeaciones.length === 0`:
  - Mensaje: "Aún no tienes planeaciones"
  - Botón grande: "+ Crear primera planeación" → /planeaciones/nueva
  - Tip: "Te tomará menos de 15 minutos"
- Cuando `recursos.length === 0`:
  - Mensaje: "Aún no has agregado recursos a tu aula"
  - Botón: "Agregar primer recurso" → /recursos-aula
- Cuando `grupo === null`:
  - Mensaje: "Configura tu grupo para empezar"
  - Botón: "Crear grupo" → /onboarding/grupo

---

## Orden de implementación

1. **C-4 Menú/navegación** (sin esto nada más se ve bien)
2. **C-7 Empty states** (mejora UX inmediato)
3. **C-1 Página /perfil** (Frank lo pidió)
4. **C-3 Gestión de alumnos** (Frank lo pidió)
5. **C-2 Edición de grupo** (Frank lo pidió)
6. **C-5 Sugerencias IA estáticas** (mejora UX wizard)
7. **C-6 Página 404 custom** (cosmético)

## Validación de cada issue

Para cada issue:
1. Implementar
2. Verificar con `pnpm typecheck && pnpm lint && pnpm build`
3. Agregar test mínimo si aplica
4. Re-deployar a Vercel con `vercel deploy --prod --yes`
5. Verificar con curl que la ruta responde HTTP 200

## Restricciones (CRÍTICO)

- ❌ NO modifiques archivos en `Educacion/specs/SPEC_TEC_*.md`
- ❌ NO implementes llamadas a MiniMax ni a ninguna IA externa
- ❌ NO commitees sin OK explícito de Frank
- ❌ NO borres archivos de Frank
- ❌ NO uses secrets en logs
- ❌ NO hagas deploy a producción sin que T-E2E-07 RLS pase (si lo ejecutas)

## Entregables

Al final, reporta con:

1. **Reporte de cambios** `Educacion/specs/IMPL-20260817-04_report.md` con:
   - Lista de archivos creados/modificados
   - Build status (typecheck, lint, build)
   - Tests pasando
   - Deploy exitoso (URL)
2. **Screenshots de las nuevas vistas** (opcional pero útil)
3. **Issues encontrados** durante implementación
4. **Decisiones** que requieren OK de Frank (si hay)

## Estimación de tiempo

- C-4 (menú): 30 min
- C-7 (empty states): 20 min
- C-1 (/perfil): 45 min
- C-3 (alumnos): 60 min
- C-2 (edición grupo): 30 min
- C-5 (sugerencias estáticas): 20 min
- C-6 (404 custom): 15 min
- Deploy + tests: 20 min
- **Total: ~3-4 horas**

---

**ID delegación:** SOFIA-IMPL-MVP-2026-08-17-SESION-4

**Esta es una sesión de CORRECCIONES UX, no de feature nueva. Mantén el código simple y consistente con el estilo existente.**