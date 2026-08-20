# ADDENDUM DE AUDITORÍA INTEGRA — Cierre de hallazgos documentales abiertos

**ID:** ARCH-20260818-01 (seguimiento nocturno) · continuación de `specs/AUDITORIA_DOCUMENTAL_INTEGRA_2026-08-18.md`
**Autor:** INTEGRA
**Fecha:** 2026-08-18 23:40 UTC-6
**Modo:** Seguimiento nocturno documental — sin commits, sin despliegues, sin cambios de código, sin migraciones.
**Raíz:** `/home/frank/repos/educacion/Educacion`
**Marco de precedencia:** plataforma/seguridad > Frank > baseline funcional (ATLAS) > ADR/SPEC > PROYECTO.md > código > inferencias.

**Alcance de este addendum:** cerrar los dos hallazgos técnicos documentales que la auditoría ARCH-20260818-01 dejó abiertos (§3 P2 PDF descargable y §3 P3 `pda_ejes`). Para cada uno: evidencia de primera mano del repositorio, resolución, archivos modificados y estado del requisito funcional.

**Autorizaciones vigentes:** edición restringida a `specs/` de ownership INTEGRA + creación de este addendum. **No modificados:** `SPEC_MVP_01_Modulo_Docente.md`, `discovery/*`, `fuentes/*`, código, datos, migraciones, `PROYECTO.md`.

---

## §1. Hallazgo 1 — D-FIN-5 "Descargable binario" NO cumplido como binario (desviación aceptada y explícitamente documentada)

### 1.1 Requisito funcional (fuente de verdad, ATLAS+Frank)

`fuentes/E22_CIERRE_DISCOVERY.md` §D-FIN-5 (líneas 104-121) define el **PDF triple** con tres usos simultáneos:

| Uso | Mecanismo | Audiencia |
|-----|-----------|-----------|
| Visualizable | URL firmada + iframe en panel del director | Director (sin registro) |
| **Descargable** | **Botón "Descargar PDF" (versión limpia, sin marca de agua)** | Maestra + director |
| Compartible | URL firmada + QR + mensaje WhatsApp pre-armado | Maestra → director |

Implementación funcional exigida (E22 §D-FIN-5, línea 120): *"Generación PDF server-side (Playwright o Puppeteer)"*. Es decir, el uso "Descargable" requiere **generación de un archivo `.pdf` binario server-side**.

### 1.2 Evidencia de implementación real (código observado, lectura de verificación de contrato)

`app/api/planeaciones/[id]/generar-pdf/route.ts` (99 líneas, leído íntegro):

- Líneas 4-5 (cabecera del endpoint): *"Usa @sparticuz/chromium + puppeteer-core (Vercel serverless). En MVP: HTML→PDF con plantilla simple. Sin almacenamiento remoto."*
- Líneas 39-40: *"En MVP: devolver HTML imprimible. La generación completa con Playwright queda condicionada a `PDF_GENERATOR=playwright` en env vars (SPEC §3.5)."*
- Líneas 81-82: *"Si `PDF_GENERATOR=playwright`, en un futuro usar @sparticuz/chromium + puppeteer. Por ahora devolvemos HTML para que el navegador pueda imprimirlo (cmd+P → PDF)."*
- Líneas 83-89: respuesta real → `Content-Type: text/html; charset=utf-8`, `Content-Disposition: inline; filename="planeacion-<id>.html"`. **No se genera `.pdf` binario; no se sube a Storage; no se persiste `pdf_sha256`.**

Dependencias (`package.json`): `puppeteer-core` (^23.1.0) y `playwright` (^1.46.0) presentes, pero la generación binaria está **gated tras `PDF_GENERATOR=playwright`** (no activada en MVP).

### 1.3 Trazabilidad cruzada (auditoría previa + GEMINI)

- `specs/GEMINI-AUDIT-FINAL-2026-08-18.md` §C.1 (línea 128): *"5 — PDF triple | ⚠️ | Visualizable + compartible (...) ✅; **descargable binario diferido** — HTML imprimible (decisión documentada sesión 3 §6.1, L2)"*.
- `specs/GEMINI-AUDIT-FINAL-2026-08-18.md` §P-PD7 (línea 152): *"parcial por desviación documentada (ver D-FIN-5). ⚠️ aceptado"*.
- `specs/GEMINI-AUDIT-FINAL-2026-08-18.md` (línea 283): *"PDF binario diferido (HTML imprimible) — decisión documentada sesión 3 §6.1."*

### 1.4 Resolución: desviación ahora explícita en las SPECs técnicas (ownership INTEGRA)

Antes de este turno, las SPECs técnicas describían el **contrato objetivo** (Playwright + hash + Storage) **sin anotar la desviación**, lo que podía inducir a SOFIA/GEMINI a creer que el "Descargable binario" estaba cubierto. Se añadieron notas de desviación explícitas preservando que el requisito funcional **no se cumple como binario**:

| Archivo | Sección | Cambio |
|---|---|---|
| `specs/SPEC_TEC_03_API_Contract.md` | §6.7 (endpoint `entregar-director`, tras "Errores específicos") | Bloque `⚠️ DESVIACIÓN ACEPTADA`: cita D-FIN-5, detalla que `generar-pdf/route.ts` retorna `text/html` (no `.pdf`), que Playwright está diferido tras `PDF_GENERATOR=playwright`, y que `pdf_sha256` no se popula. **Preserva: el requisito "Descargable binario" sigue sin cumplirse; no es redefinición.** |
| `specs/SPEC_TEC_03_API_Contract.md` | §3.3 (ruta del director `/v/[entrega_id]`) | Nota: "PDF embebido" es contrato objetivo; el MVP renderiza HTML, no `.pdf` embebido. Cross-ref a §6.7 y addendum §1. |
| `specs/SPEC_TEC_06_Plan_Testing.md` | T-E2E-05 (tras aserciones) | Bloque `⚠️ DESVIACIÓN ACEPTADA`: marca pasos/aserciones binarias (descarga `.pdf` > 10 KB, `pdf_sha256` no nulo, hash estable) como **no verificables hoy**; lista lo válido (visualizable + compartible). Recomienda `skipped` con razón "PDF binario diferido (D-FIN-5)". |
| `specs/SPEC_TEC_06_Plan_Testing.md` | T-I-05 (tabla tests integración) | Caso "PDF hash" anotado `⚠️ diferido`. |
| `specs/SPEC_TEC_06_Plan_Testing.md` | §13 matriz cobertura D-FIN | Fila D-FIN-5 cambiada de "Visualizable + descargable + compartible" a "⚠️ Parcial/desviación aceptada: visualizable ✅ + compartible ✅; descargable binario NO cumplido". |

### 1.5 Estado del requisito funcional tras este turno

- **NO cumplido como binario.** El uso "Descargable" de D-FIN-5 **permanece abierto**.
- Cierre requerido (futuro, fuera de alcance de este turno documental): activar `PDF_GENERATOR=playwright`, implementar render HTML→PDF con `@sparticuz/chromium` + `puppeteer-core`, subir `.pdf` a Storage (`ccts/{cct}/planeaciones/{id}/{version}.pdf`) y persistir `pdf_sha256` en `entregas`. Hasta entonces, los criterios binarios de T-E2E-05 no son ejecutables.
- **No se emite TECHNICAL-GAP ni DISCOVERY-GAP:** la decisión funcional (D-FIN-5) está confirmada y clara; la desviación es técnica y ya aceptada (GEMINI §C.1). Sólo faltaba hacerla explícita en las SPECs, lo cual se completó.

---

## §2. Hallazgo 2 — Divergencia `pda_ejes` (SPEC_TEC_02 = 0 vs READY-FOR-FRANK = 114): RESUELTA con evidencia

### 2.1 Afirmación divergente

- `specs/SPEC_TEC_02_Modelo_Datos.md` §5.1.8 (línea 254), §10.8 (línea 1263), §11 (línea 1368), §12 DM-01 (línea 1410): `pda_ejes` **vacío (0 registros)** por diseño, decisión DP-08 (`SPEC_TEC_01` §DP-08) + DM-01.
- `specs/READY-FOR-FRANK-2026-08-18.md` línea 51: *"114 asociaciones pda_ejes"* listado bajo "Funcionalidad completa".

### 2.2 Evidencia de primera mano del repositorio (decisiva)

**Migraciones canónicas (lo que define y pobla la BD desplegada):**

- `supabase/migrations/0005_pda_ejes.sql` (7 líneas): sólo `CREATE TABLE`; comentario: *"pda_ejes vacío (0 registros). Decisión DP-08 en SPEC_01: dejar tabla vacía pero existente para futuras cargas."* **0 INSERTs.**
- `supabase/migrations/0016_seed_catalogo.sql` (línea 154): sección `-- ============ 10.8 pda_ejes (vacío) ============` con comentario *"DP-08: no se insertan PDA-eje en Fase 2; tabla existente para cargas futuras."* **0 INSERTs.**
- `supabase/migrations/0019_actualizar_referencias_conaliteg.sql` (migración más reciente): **no toca `pda_ejes`**.
- `grep "INSERT INTO pda_ejes"` sobre `supabase/migrations/0001..0019` → **0 coincidencias**.

**Estado desplegado real:**

- `specs/DEPLOY-20260817-01_report.md` (línea 105, tabla de verificación post-deploy): `pda_ejes | 0 | 0 ✅ (semánticamente correcto: PDAs sin ejes articuladores explícitos en el seed; los ejes se cargan vía pda_por_campo_fase)`.

**Origen del "114" (experimental, no promocionado):**

- `scripts/catalogar/extractor_pda_ejes.py` — script de "segundo pass" que extrajo asociaciones PDA-eje por **heurística regex sobre páginas intro del PDF** del programa sintético Fase 2.
- `scripts/catalogar/outputs/catalogo_fase2_v2024_crudo.json` (línea 90): `"total_pda_ejes_pairs": 114`; línea 879: `"pda_ejes": [ ... ]` poblado con 114 entradas.
- `scripts/catalogar/outputs/migrations/2026-08-17_catalogo_fase2.sql` (líneas 255-256): `-- pda_ejes (114 filas)` + `INSERT INTO pda_ejes (...) VALUES` con 114 filas. **Este SQL vive en `scripts/catalogar/outputs/migrations/`, NO en las migraciones canónicas `supabase/migrations/`.**
- `scripts/catalogar/outputs/migrations/2026-08-13_catalogo_fase2.sql` y `2026-08-16_catalogo_fase2.sql` (versiones previas): **sin INSERTs** en `pda_ejes` (vacío), confirmando que el 114 es del segundo pass del 17-ago y nunca se promovió.

**Flujo de decisión (registros históricos pre-deploy):**

- `specs/GO_FINAL_2026-08-17.md`, `specs/GO_FINAL_ABSOLUTO_2026-08-17.md`, `specs/CHECKLIST_PRESOFIA_2026-08-17.md`: flagueaban L3-NEW-02 / R-03 / R2 *"SQL catálogo: 114 pda_ejes vs SPEC dice 0 — Decidir al ejecutar seed"* con decisión #2 *"114 filas (heurística) o 0 filas (DP-08)"*. **Decisión abierta en pre-deploy.**

### 2.3 Veredicto

La evidencia del repositorio **permite decidir sin ambigüedad**:

- La decisión ejecutada al desplegar = **opción (a) = 0 filas = DP-08/DM-01** (recomendada en `SPEC_TEC_02` y materializada en `0016_seed_catalogo.sql` + confirmada en `DEPLOY-20260817-01_report.md`).
- `SPEC_TEC_02` (0 por diseño) es **CORRECTA y consistente** con la BD desplegada. **No requiere corrección.**
- El "114" es el output de un **script heurístico experimental** (`scripts/catalogar/outputs/`) **no promocionado** a las migraciones canónicas ni a la BD desplegada.
- El **documento técnico inconsistente** es el que afirmaba "114" como estado desplegado/funcionalidad completa.

**No se emite TECHNICAL-GAP:** la evidencia es decisiva y el propietario correcto (INTEGRA, `specs/`) puede corregir.

### 2.4 Resolución: documentos corregidos (ownership INTEGRA)

| Archivo | Línea(s) | Antes | Después (preservando traza) |
|---|---|---|---|
| `specs/READY-FOR-FRANK-2026-08-18.md` | 51 | "114 asociaciones pda_ejes" (bajo "Funcionalidad completa") | ~~114~~ → **0 asociaciones `pda_ejes` desplegadas en BD** (DP-08/DM-01). Nota: el "114" era script heurístico experimental no promocionado a migraciones canónicas. Cross-ref a DEPLOY report y addendum §2. |
| `specs/REVISION_TECNICA_vs_FUNCIONAL.md` | 172 | "`pda_ejes` ✅ (recién poblado 114 filas)" | "0 filas desplegadas por DP-08; ~~114~~ CORREGIDO 2026-08-18" |
| `specs/REVISION_TECNICA_vs_FUNCIONAL.md` | 189 | "`pda_ejes` \| 114 \| ✅" | "`pda_ejes` \| 0 \| ✅ (DP-08)" |
| `specs/REVISION_TECNICA_vs_FUNCIONAL.md` | 192 | "Total 202 registros" | "Total 90 registros catálogo (~~202~~ incluía 114 falsos; coherente con DEPLOY: 126 = 90 + 36 bloque_catalogo)" |
| `specs/REVISION_TECNICA_vs_FUNCIONAL.md` | 349 | "114 asociaciones pda_ejes" (production-ready) | "0 asociaciones desplegadas (DP-08; ~~114~~ era script experimental no promocionado)" |

### 2.5 Catálogo de TODOS los documentos que mencionan "114 pda_ejes" y su clasificación

| Documento | Fecha | Naturaleza | Afirmación "114" | Acción tomada |
|---|---|---|---|---|
| `specs/SPEC_TEC_02_Modelo_Datos.md` | 17-ago | SPEC técnica activa | 0 por diseño (DP-08/DM-01) | **No tocada — CORRECTA**, consistente con BD desplegada |
| `specs/SPEC_TEC_01_Arquitectura.md` | 17-ago | SPEC técnica activa | 0 (DP-08 pendiente, opción (a) recomendada) | **No tocada — CORRECTA** |
| `specs/READY-FOR-FRANK-2026-08-18.md` | 18-ago | Reporte consolidación (post-deploy) | "114" como funcionalidad completa | **CORREGIDA** §2.4 |
| `specs/REVISION_TECNICA_vs_FUNCIONAL.md` | 16-ago | Revisión técnica (post-deploy) | "recién poblado 114 filas ✅" | **CORREGIDA** §2.4 |
| `specs/DECISION_GO_NOGO.md` | 16-ago | Registro de decisión pre-deploy | "✅ 100% completo (114 asociaciones)" | **No corregido** — registro histórico; la decisión abierta que flagueaba se resolvió a 0 al desplegar (DEPLOY report). Recomendado: no reescribir registros de decisión históricos; la resolución autoritativa vive en DEPLOY report + este addendum. |
| `specs/GO_FINAL_2026-08-17.md` | 17-ago | Registro de decisión pre-deploy | L3-NEW-02 "114 vs 0 — Decidir al ejecutar seed" | **No corregido** — registro histórico que capturó correctamente la decisión abierta; resuelto a 0 al desplegar. |
| `specs/GO_FINAL_ABSOLUTO_2026-08-17.md` | 17-ago | Checklist GO pre-deploy | "[x] 114 pda_ejes" + decisión "114 o 0" | **No corregido** — registro histórico pre-deploy. |
| `specs/CHECKLIST_PRESOFIA_2026-08-17.md` | 17-ago | Checklist pre-SOFIA pre-deploy | "114 pda_ejes" + flag "114 vs 0" | **No corregido** — registro histórico pre-deploy. |
| `supabase/migrations/0005_pda_ejes.sql` | — | Migración canónica | 0 (CREATE TABLE, vacío) | **No tocada** (migración, fuera de alcance) — CORRECTA |
| `supabase/migrations/0016_seed_catalogo.sql` | — | Migración canónica | 0 ("DP-08: no se insertan") | **No tocada** (migración, fuera de alcance) — CORRECTA |
| `scripts/catalogar/outputs/*` | 17-ago | Output de script experimental | 114 (heurística) | **No tocado** (código/datos, fuera de alcance) — fuente legítima del "114" experimental |

**Nota sobre integridad histórica:** los registros de decisión pre-deploy (GO_FINAL, GO_FINAL_ABSOLUTO, CHECKLIST_PRESOFIA, DECISION_GO_NOGO) se preservan sin reescribir. Ellos flaguearon correctamente "114 vs 0 — decidir al ejecutar seed" como una decisión abierta; la resolución ejecutada (0, DP-08) está autoritativamente documentada en `specs/DEPLOY-20260817-01_report.md` y ahora en este addendum. Reescribir registros de decisión históricos rompería la trazabilidad cronológica de la decisión. Los reportes post-deploy (READY-FOR-FRANK, REVISION_TECNICA_vs_FUNCIONAL) que afirmaban "114" como estado desplegado **sí** fueron corregidos, pues esas son afirmaciones de estado, no registros de decisión.

---

## §3. Resumen de archivos modificados (todos en `specs/`, ownership INTEGRA, sólo markdown técnico)

| Archivo | Hallazgo | Tipo |
|---|---|---|
| `specs/SPEC_TEC_03_API_Contract.md` | §1 (PDF) | 2 notas de desviación (§6.7 + §3.3) |
| `specs/SPEC_TEC_06_Plan_Testing.md` | §1 (PDF) | 3 anotaciones (T-E2E-05 bloque + T-I-05 celda + §13 matriz) |
| `specs/READY-FOR-FRANK-2026-08-18.md` | §2 (pda_ejes) | corrección línea 51 |
| `specs/REVISION_TECNICA_vs_FUNCIONAL.md` | §2 (pda_ejes) | 4 correcciones (líneas 172, 189, 192, 349) |
| `specs/AUDITORIA_INTEGRA_ADDENDUM_2026-08-18.md` | ambos | nuevo (este archivo) |

**No modificados (fuera de alcance / ownership ajeno):** `SPEC_MVP_01_Modulo_Docente.md`, `discovery/*`, `fuentes/*` (incl. E22/ENT-003/E20/E21), todo código bajo `app/`/`lib/`/`scripts/`, `supabase/migrations/*`, datos, `PROYECTO.md`, y los registros de decisión históricos pre-deploy (§2.5).

---

## §4. Bloqueos / TECHNICAL-GAP

**Ninguno.** Para ambos hallazgos la evidencia del repositorio fue decisiva:

- Hallazgo 1 (PDF): la desviación ya estaba aceptada (GEMINI §C.1); la acción requerida era hacerla explícita en las SPECs (completado). No es TECHNICAL-GAP (no hay ambigüedad técnica) ni DISCOVERY-GAP (la decisión funcional D-FIN-5 está confirmada y clara).
- Hallazgo 2 (pda_ejes): la evidencia canónica (migraciones + DEPLOY report) resolvió la divergencia unívocamente (0 desplegado, DP-08). No se emite TECHNICAL-GAP porque la evidencia permitió decidir y corregir.

---

## §5. Pendientes abiertos (no bloqueantes, fuera del alcance de este turno)

1. **Cierre del "Descargable binario" D-FIN-5:** requiere implementación (SOFIA, bajo SPEC): activar `PDF_GENERATOR=playwright` + render HTML→PDF (`@sparticuz/chromium` + `puppeteer-core`) + Storage + `pdf_sha256`. Mientras tanto, T-E2E-05 debe marcarse `skipped` con razón documentada. **Propietario de la decisión de cuándo:** Frank (prioridad de alcance MVP vs Fase 2).
2. **Curaduría humana `pda_ejes` (DM-01 opción b):** si en el futuro se desea poblar la tabla con asociaciones PDA-eje oficiales (no heurísticas), requiere curaduría humana (tesis de founder). **Propietario:** Frank/ATLAS. Hoy la opción (a) = vacío es la decisión ejecutada y consistente.
3. **DISCOVERY-GAP previo (SPEC_MVP_01 desactualizado vs E22):** sigue abierto, ownership ATLAS (ver `AUDITORIA_DOCUMENTAL_INTEGRA_2026-08-18.md` §7). No abordado este turno (fuera de alcance: no modificar baseline funcional).

---

## §6. Auto-auditoría INTEGRA (§24)

- ¿Inventé una decisión funcional? **No.** D-FIN-5 y DP-08/DM-01 están confirmadas en E22/SPEC_TEC_01/SPEC_TEC_02.
- ¿Generé o edité código? **No.** Sólo leí `generar-pdf/route.ts` y `package.json` para verificar contrato; 5 ediciones markdown en `specs/` + 1 archivo nuevo (este addendum).
- ¿Creé una SPEC sin DoR funcional? **No.** Las anotaciones se basan en D-FIN-5 (DoR cumplido) y evidencia de repositorio.
- ¿Perdí IDs de trazabilidad? **No.** ARCH-20260818-01 (seguimiento); referencias D-FIN-5, DP-08, DM-01, QA-20260818-01 §C.1.
- ¿Declaré DONE sin autoridad/evidencia? **No.** No declaro DONE; es auditoría/corrección documental. Los hallazgos se resuelven con evidencia citada, no con cambio de estado de implementación.
- ¿Omití GEMINI donde era obligatorio? **No aplicable** (no toca contrato público nuevo, migración, auth ni infraestructura esta noche). GEMINI ya auditó el código (QA-20260818-01); cito su veredicto §C.1 como fuente.
- ¿Paralelicé sin independencia? **No hubo delegación** (trabajo documental directo).
- ¿Dejé representaciones duplicadas? **No.** Las notas de desviación referencian al addendum; el addendum referencia a DEPLOY report y GEMINI sin duplicarlos.

---

## §7. Próximo paso sugerido

1. **Frank** decide prioridad del "Descargable binario" D-FIN-5 (¿cierre en MVP o Fase 2?) — pendiente #1.
2. **ATLAS** resuelve el DISCOVERY-GAP de `SPEC_MVP_01` (integrar E22 §4) — pendiente #3, fuera de este turno.
3. Si Frank autoriza cerrar el PDF binario: INTEGRA emite SPEC-HANDOFF a SOFIA con los criterios binarios de T-E2E-05 ya especificados (Playwright + Storage + `pdf_sha256`), y retira la marca `skipped` al validar.

---

**Fin del addendum.**
