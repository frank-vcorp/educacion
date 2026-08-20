# Reporte INTEGRA — Validación de specs de correcciones y modalidades

**ID:** INTEGRA-VALID-2026-08-18-01
**Origen:** INTEGRA (delegación de Kilo/orquestador)
**Fecha:** 2026-08-18 00:45 UTC-6
**Estado:** VALIDACIÓN COMPLETADA — specs corregidas, listas para SOFIA

---

## Origen: INTEGRA
## ARCH/SPEC:
- `Educacion/specs/SPEC_CORRECCIONES_2026-08-17.md` (validada + corregida)
- `Educacion/specs/SPEC_MODALIDADES_2026-08-17.md` (validada + corregida)

## Fuente funcional:
- `Educacion/fuentes/E22_CIERRE_DISCOVERY.md` (D-FIN-1 a D-FIN-19)
- `Educacion/fuentes/E20_PRINCIPIOS_DISENNO_PRODUCTO.md` (P-PD1 a P-PD9)
- `Educacion/specs/SPEC_TEC_01..06.md` (source-of-truth, no modificadas)
- `Educacion/specs/GO_FINAL_ABSOLUTO_2026-08-17.md`

## Estado anterior → recomendado:
- SPEC_CORRECCIONES: `ESPECIFICACIÓN` → `ESPECIFICACIÓN VALIDADA` (con correcciones inline)
- SPEC_MODALIDADES: `ESPECIFICACIÓN` → `ESPECIFICACIÓN VALIDADA` (con correcciones inline + bloque P0)

## Decisiones técnicas:

1. **Migración 0018 — `planeacion.metadata jsonb`** (la crea SOFIA, no INTEGRA):
   ```sql
   alter table planeacion add column if not exists metadata jsonb not null default '{}'::jsonb;
   ```
   - NO toca reglas RLS existentes (`planeacion_docente_own` filtra por `docente_id + cct`).
   - Patrón consistente con `docente.configuracion_m4 jsonb`.
   - Permite persistir `rincones`, `preguntas_det`, `tema`, `fases`, `sesiones_semana` para las 6 modalidades.
   - Se valida con zod en `planeacion-actions.ts` (estructura `modalidad_data` por modalidad).

2. **No alterar `sesion.fase_interna`**: el check existente (`inicio/desarrollo/cierre`) se mantiene. Las 5 fases de Proyecto Comunitario y 3 fases de Taller Crítico se modelan como filas separadas en `sesion` (con `numero` 1..5) + `metadata.modalidad_data` para info específica. DROP+CREATE constraint sería destructivo y arriesga datos existentes.

3. **P-PD9 cumplimiento parcial en C-5**: las sugerencias estáticas cumplen 5 de 7 reglas P-PD9. Las 2 pendientes (disparador explícito, botón descartar) se corrigen inline en `sugerencias-ia.tsx` — no requieren crear `components/ia/SugerenciaPanel.tsx` canónico (diferido a Fase 2).

4. **Server actions canónicas, no route handlers `/api/`**: el código existente usa server actions en `services/<dominio>/` (patrón Next.js App Router, permitido por SPEC_TEC_04 §5.5). Las menciones a `/api/...` en SPEC_CORRECCIONES son informativas, no requieren acción.

## Issues encontrados (resumen ejecutivo):

### 🔴 P0 — BLOQUEANTE FUNCIONAL
- **SPEC_MODALIDADES afirmaba "No necesitas cambiar BD" — FALSO.** Confirmado por código en `services/planeaciones/planeacion-actions.ts:14-21`. Los campos `rincones`, `preguntas_det`, `tema`, `fases`, `sesiones L M M J V` NO se persisten — se pierden silenciosamente al guardar. **Resuelto**: migración 0018 + estructura `metadata.modalidad_data` documentada en la spec corregida.

### 🟡 P1 — ALTA PRIORIDAD (no bloqueante)
- **C-5 sugerencias IA**: 2 violaciones P-PD9 — falta disparador explícito (panel se muestra siempre) y falta botón descartar. Documentado con correcciones inline en SPEC_CORRECCIONES.
- **wizard-calendario-semanal.tsx:129**: usa `window.prompt()` — anti-pattern P-UX. Reemplazar por `Dialog` (ya existe en `components/ui/dialog.tsx`) o Input inline. Documentado en SPEC_MODALIDADES.
- **Server actions validación condicional incompleta**: `planeacion-actions.ts:60-85` solo valida `unidad_didactica`. Faltan `centros_interes`, `taller_critico`, `abj`. Documentado con esquema zod completo en SPEC_MODALIDADES.
- **Edge case no documentado**: cambio de modalidad a mitad del wizard. Documentado con comportamiento requerido (confirmación + limpiar `metadata.modalidad_data`) en SPEC_MODALIDADES.

### 🟢 P2 — MENORES (no requieren acción inmediata)
- `components/ia/` solo tiene `.gitkeep` — los componentes canónicos `SugerenciaPanel.tsx`, `AuditBadge.tsx` no existen. Diferido a Fase 2.
- C-1 a C-7 marcados como "NUEVO" en specs pero YA ESTÁN IMPLEMENTADOS. Specs actualizadas con estado real.
- Menciones a `/api/docente/:id`, `/api/grupos/:id` en SPEC_CORRECCIONES sin versión — el código usa server actions en `services/`, no route handlers. No requiere acción.

## Cambios aplicados:

### `Educacion/specs/SPEC_MODALIDADES_2026-08-17.md`
1. ✅ Sección "VALIDACIÓN INTEGRA — 2026-08-18" agregada al inicio (estado real, gap P0, solución migración 0018 con DDL, estructura `metadata.modalidad_data` para las 6 modalidades, P1.1 validaciones, P1.2 edge case, P1.3 anti-pattern, gates DONE).
2. ✅ Corregida afirmación "No necesitas cambiar BD" → ahora dice que es FALSA para campos extra y referencia la migración 0018.
3. ✅ Sección "Server actions" reescrita con esquema zod canónico (camelCase real) + validación condicional completa para las 6 modalidades + ejemplo de insert con `metadata`.

### `Educacion/specs/SPEC_CORRECCIONES_2026-08-17.md`
1. ✅ Sección "VALIDACIÓN INTEGRA — 2026-08-18" agregada al inicio (estado real C-1 a C-7 IMPLEMENTADOS, gaps P-PD9 para C-5, P2 menores, resumen 15 criterios, gates DONE).

### Componentes shadcn/ui verificados existentes
`badge, button, card, checkbox, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, tabs, textarea` — todos presentes en `components/ui/`. NO se requieren instalaciones nuevas para las correcciones P1.

## Resultados SOFIA:
N/A — esta es una validación INTEGRA post-implementación sesión 4 y 5. SOFIA implementó; INTEGRA valida.

## Dictámenes FIX:
N/A — no se invocó DEBY (no hay bug técnico reproducible con causa raíz desconocida; el gap P0 es un problema de spec que dice "no cambies BD" cuando sí se requiere, no un bug de implementación).

## Veredicto QA:
N/A — no se invocó GEMINI en este turno. **Recomendación**: cuando SOFIA ejecute la migración 0018 + persistencia de `metadata`, invocar GEMINI (cambio de contrato público `planeacion.metadata` — clasificar como riesgo MEDIO, no crítico, porque RLS no se toca). Ver SPEC_MODALIDADES §Gates DONE punto 6.

## Gates:
- ✅ Validación completada contra los 15 criterios solicitados.
- ✅ Specs corregidas inline (preservando el contenido original de Kilo bajo "Contexto (original)").
- ✅ No se modificó `SPEC_TEC_*.md` (source-of-truth intacto).
- ✅ No se escribió código (regla anti-código §11 respetada — solo markdown specs + reporte).
- ✅ No se modificaron reglas RLS existentes (la migración 0018 propuesta NO toca policies).
- ✅ No se cambió el stack acordado (Next.js + Supabase + Vercel + @dnd-kit + PWA intacto).
- ⏳ Pendiente: SOFIA ejecute migración 0018 + correcciones P1 (próxima sesión).
- ⏳ Pendiente: GEMINI audite post-remediación (recomendado, no bloqueante para MVP actual).

## Riesgos:
1. **Riesgo MEDIO**: si SOFIA NO ejecuta la migración 0018 antes de la próxima sesión de pruebas con Frank, las planeaciones con modalidades ≠ `proyecto_comunitario` perderán datos silenciosamente. Frank puede no notarlo inmediatamente, pero el bug está latente.
2. **Riesgo BAJO**: las correcciones P1 (P-PD9, `window.prompt`) no rompen funcionalidad existente — son mejoras de UX.
3. **Riesgo BAJO**: la migración 0018 NO toca RLS — no hay riesgo de seguridad o aislamiento multi-tenant.

## Archivos propios actualizados:
- `Educacion/specs/SPEC_MODALIDADES_2026-08-17.md` (editado)
- `Educacion/specs/SPEC_CORRECCIONES_2026-08-17.md` (editado)
- `Educacion/specs/IMPL-20260818-VALID-01_report.md` (este reporte, NUEVO)

## Pregunta o autorización pendiente:
Ninguna. Las decisiones técnicas (migración 0018, no alterar `sesion.fase_interna`, correcciones P-PD9 inline) están dentro de la autoridad de INTEGRA y no requieren aprobación de Frank para ser especificadas. **La ejecución de la migración 0018 sí requiere OK de Frank** (acción destructiva: alter table) — SOFIA debe pedir aprobación antes de aplicar en staging/producción. En local dev puede aplicarla sin aprobación.

## Próximo paso:
Derivar a SOFIA (próxima sesión) con SPEC-HANDOFF que incluya:
1. Crear migración `0018_planeacion_metadata.sql` (DDL en SPEC_MODALIDADES §VALIDACIÓN).
2. Modificar `services/planeaciones/planeacion-actions.ts` (insert con `metadata` + validación condicional completa).
3. Modificar `components/planeaciones/wizard-planeacion.tsx` (enviar `metadata.modalidad_data` en submit + confirmación cambio modalidad).
4. Reemplazar `window.prompt` en `wizard-calendario-semanal.tsx:129` por `Dialog` o Input inline.
5. Corregir `sugerencias-ia.tsx` (disparador colapsable + botón descartar).
6. Verificar `EditarGrupoForm` bloquea eliminación con alumnos (P2.1).
7. `pnpm typecheck && pnpm lint && pnpm build` PASS.
8. Smoke test 6 modalidades (curl POST, verificar `metadata.modalidad_data` persiste).
9. Invocar GEMINI para auditoría post-remediación (riesgo MEDIO por contrato `planeacion.metadata`).

— **INTEGRA, 2026-08-18 00:45 UTC-6**
