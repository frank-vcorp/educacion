-- 0021_audit_log_insert_rls.sql
-- ADR-20260820-01 (resolución P2-RLS de QA-20260819-05 §D).
-- Política RLS `for insert` restringida para `audit_log`, necesaria para que
-- los 8 call-sites de `auditPostIA` (3 routes IA + updateBloque +
-- updatePlaneacion + 3 call-sites residuales) y los 2 inserts PATCH persistan
-- filas en runtime real. Sin esta política, RLS default-deny rechaza todos
-- los inserts y el audit trail P-PD9 queda sólo como `console.error` (no
-- persistente). P-PD9 (IA sólo sugiere) y D-FIN-13 (server-side) preservados.
--
-- ⚠️  ARTEFACTO PENDIENTE DE APLICACIÓN — NO EJECUTAR `supabase db push`
--     Frank autoriza la aplicación cuando decida.
--
-- Contrato:
--   - `for insert` (NO `for all`): UPDATE/DELETE siguen default-deny.
--     `audit_log` es log inmutable (comment 0013:70); el helper `auditPostIA`
--     y los server actions NUNCA emiten UPDATE/DELETE sobre `audit_log`.
--   - `to authenticated`: sólo usuarios autenticados. `auth.uid()` es NULL
--     para anónimos → `docente_id = NULL` → false; defensa en profundidad.
--   - `with check (docente_id = auth.uid() and cct = user_cct())`: la fila
--     a insertar debe pertenecer al propio docente y al propio CCT.
--     Consistente con el patrón RLS por CCT vigente en `entrega`
--     (0014:129-131), `bitacora` (0014:136-138) y `ia_sugerencia`
--     (0020:48-50). El docente no puede insertar filas para otro `docente_id`
--     ni otro `cct`.
--   - El docente SÍ puede insertar metadatos de sus propias acciones
--     (`endpoint`, `method`, `body_hash`, `response_status`) — dentro del
--     `check (method in ('GET','POST','PATCH','DELETE'))` del schema
--     (0013:61) y la FK `cct → cct(clave)` (0013:58). No se introduce PII
--     ni canal al proveedor (`body_hash` es sha256 truncado 16 hex sobre
--     payload anonimizado, `audit-post.ts:112-114`).
--
-- Reversibilidad: `drop policy if exists "audit_log_docente_insert" on audit_log;`

drop policy if exists "audit_log_docente_insert" on audit_log;

create policy "audit_log_docente_insert" on audit_log
  for insert to authenticated
  with check (docente_id = auth.uid() and cct = user_cct());

comment on policy "audit_log_docente_insert" on audit_log is
  'INSERT restringido al propio docente y CCT (ADR-20260820-01). Habilita el audit trail P-PD9 en runtime real sin servicio-role. No abre UPDATE/DELETE (default-deny preservado; log inmutable per 0013:70). Riesgo residual aceptado: docente puede insertar metadatos falsos de sus propias acciones (mitigado por `bloque.origen` como fuente de verdad + cierre futuro via `ia_sugerencia` + trigger en 0020).';