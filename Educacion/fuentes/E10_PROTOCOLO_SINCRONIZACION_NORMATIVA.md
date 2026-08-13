# E10 — PROTOCOLO DE SINCRONIZACIÓN NORMATIVA

**Versión:** 0.1
**Fecha:** 2026-08-13
**Estado:** ESPECIFICACIÓN TRANSVERSAL (no es un módulo del producto; es infraestructura de mantenimiento normativo)
**Origen:** Discovery del fundador + investigación sobre cadencia real de cambios NEM/LFPDPPP/calendario escolar 2022-2026
**Alineado a:** `SPEC_MVP_01_Modulo_Docente.md` §5 (Catálogo NEM), §9 (Riesgos)

---

## 1. PREMISA

> Los documentos que sustentan la plataforma NEM **sí cambian**. Cambian con tres cadencias distintas (mayor / anual / menor), y cada cambio tiene impacto diferente sobre el producto. No puedes sincronizar diario, pero tampoco basta con anual.

**Decisión explícita:** tu app debe diseñarse desde el día 1 para que cada categoría de cambio se pueda absorber sin reescribir código. Esto es **infraestructura de mantenimiento**, no feature de usuario.

---

## 2. TIPOS DE CAMBIO Y CADENCIA REAL (datos verificados 2022-2026)

| Tipo | Frecuencia real | Ejemplos documentados | Impacto técnico |
|---|---|---|---|
| **A. Normativo mayor** | Cada 3-6 años (cambio sexenal, ley nueva) | Plan de Estudio 2022 (ago-2022), LFPDPPP 2025 (mar-2025), Reforma Senado (dic-2025) | Catálogo completo, contrato curricular, esquema de datos sensibles |
| **B. Operativo anual** | Cada año (antes del ciclo escolar) | Acuerdo 06/08/23 (modifica Plan), Acuerdo 18/06/25 (calendario 2025-2026), Programas Sintéticos | Calendario escolar, ajustes de catálogos, ajustes de proceso |
| **C. Ajuste menor** | Varias veces/año | Fases Intensivas CTE, ajustes por clima/Mundial, lineamientos operativos, comunicados | Fechas, recordatorios, micro-features |

---

## 3. CAPAS DE PRODUCTO Y SU CADENCIA DE SINCRONIZACIÓN

| Capa del producto | Cadencia mínima de revisión | Fuente primaria | Mecanismo |
|---|---|---|---|
| **Catálogo NEM** (campos, ejes, PDA, contenidos) | **Cada 12 meses** (agosto) + alerta inmediata si hay reforma mayor | DOF — Diario Oficial de la Federación | Pull anual + alerta rápida |
| **Calendario escolar** (días hábiles, festivos, CTE, vacaciones) | **Cada 12 meses** (junio-julio, antes del ciclo) | DOF + Acuerdo SEP anual | Pull anual |
| **Contrato curricular NEM** (§3.5 SPEC MVP) | **Cada 12-24 meses**, o ante reforma mayor | DOF + Manuales CIFE | Pull anual + revisión manual |
| **LFPDPPP + compliance** (aviso de privacidad, ARCO, base legal) | **Cada 6 meses** | DOF + lineamientos de la Secretaría Anticorrupción y Buen Gobierno | Pull trimestral + revisión jurídica |
| **Manuales de planeación CIFE** | **Cada 24 meses** o nueva edición | CIFE + SEP | Pull manual cuando publicaron nueva versión |
| **CONALITEG catálogo de libros** | **Cada 12 meses** (antes del ciclo escolar) | libros.conaliteg.gob.mx | Pull de URL y metadata, NO del contenido |
| **Snapshots de competencia** | **Cada 6-12 meses** | webs públicas de Kumu, Teachy, Planea IA NEM | Captura referencial, sin alerta |

---

## 4. SEÑALES DE ALERTA TEMPRANA (cómo saber ANTES que cambien)

Estas fuentes monitorean antes de que el cambio sea oficial. **No las automatices todo desde día 1**, pero tenlas fichadas para revisión manual periódica.

### 4.1. Alertas normativas (cambios tipo A — mayor)

| Fuente | Qué monitorizar | URL | Cadencia sugerida de revisión |
|---|---|---|---|
| DOF — Sección SEP | Acuerdos que contengan "Plan de Estudio", "NEM", "educación básica" | https://www.dof.gob.mx/ | Mensual |
| Boletín SEP | Comunicados oficiales | https://www.gob.mx/sep/ | Mensual |
| SEP blog | Anuncios preventivos | https://www.gob.mx/sep/articulos | Mensual |
| mley.mx (síntesis jurídica) | Cambios a LFPDPPP, leyes de protección de datos | https://mley.mx/LFPDPPP | Trimestral |
| Iniciativas en Congreso | Reformas en proceso | https://gaceta.diputados.gob.mx | Trimestral |

### 4.2. Alertas operativas (cambios tipo B — anual)

| Fuente | Qué monitorizar | URL | Cadencia sugerida |
|---|---|---|---|
| planeacion.sep.gob.mx | Calendario escolar del siguiente ciclo | https://www.planeacion.sep.gob.mx/CalendarioEscolar.aspx | Junio-julio (pre-ciclo) |
| educacionbasica.sep.gob.mx | Manuales, guías, programas analíticos | https://educacionbasica.sep.gob.mx/ | Mensual en periodo pre-ciclo |
| Boletín SEP "Fase Intensiva CTE" | Cambios operativos trimestrales | https://www.gob.mx/sep/ | Trimestral |

### 4.3. Alertas comunitarias (señal temprana blanda)

| Fuente | Tipo | Cadencia |
|---|---|---|
| Grupos docentes Facebook/WhatsApp | Maestros avisan "van a cambiar X" antes que el DOF | Pasiva, solo escuchar |
| Editorial MD, Magisterial, blogs docentes | Editoriales y blogs detectan primero los cambios prácticos | Mensual |

---

## 5. CHECKLIST DE SINCRONIZACIÓN (operativo)

**Cada vez que se detecte un cambio potencial** (sea A, B o C), se ejecuta este flujo:

### Paso 1 — Identificar el cambio
- [ ] Título y fecha del acuerdo/boletín/ley/noticia
- [ ] Categoría (A / B / C) → define prioridad
- [ ] URL canónica (preferentemente DOF)

### Paso 2 — Evaluar impacto en el producto
- [ ] ¿Afecta el **catálogo NEM**? (campos, ejes, PDA, contenidos)
- [ ] ¿Afecta el **calendario escolar**? (días hábiles, festivos)
- [ ] ¿Afecta el **contrato curricular**? (§3.5 del SPEC)
- [ ] ¿Afecta la **base legal de compliance**? (LFPDPPP, INAI/Secretaría Anticorrupción)
- [ ] ¿Afecta **CONALITEG**? (URL, ficha bibliográfica)
- [ ] ¿Afecta **features del producto**? (UX, validación, alertas)

### Paso 3 — Decidir la respuesta
| Impacto | Respuesta | Quién | Tiempo estimado |
|---|---|---|---|
| Catálogo NEM cambió | Cargar nueva versión del catálogo, versionar (v2.0, v3.0) | Founder + catalogador | 8-16 h |
| Calendario escolar cambió | Actualizar tabla de festivos en base de datos | Programador | 2-4 h |
| Contrato curricular cambió | Actualizar validaciones del PDF exportador | Founder + programador | 4-8 h |
| Compliance cambió | Revisar aviso de privacidad, ARCO, consent flow | Asesor legal | 8-16 h |
| CONALITEG cambió enlaces | Re-apuntar URLs, no descargar contenido | Programador | 1-2 h |
| Feature nueva obligatoria | Diseñar + implementar + tests | INTEGRA → SOFIA | 40-200 h |

### Paso 4 — Versionar y publicar
- [ ] Asignar nueva versión del catálogo NEM (v1 → v2, etc.).
- [ ] Actualizar `fuentes/01_normativa_nem/` con el nuevo documento.
- [ ] Actualizar `_log_descargas.md` con la fecha y motivo del cambio.
- [ ] Actualizar `SPEC_MVP_01_Modulo_Docente.md` §5 con la versión vigente.
- [ ] Si afecta compliance, actualizar `fuentes/02_compliance/`.
- [ ] Comunicar a usuarios activos si el cambio es visible (banner, correo).

---

## 6. AUTOMATIZACIÓN MÍNIMA VIABLE (sin sobre-ingeniería)

**No construyas más de esto.** El resto es trabajo manual estructurado.

### 6.1. Lo que SÍ automatizar desde día 1

| Automatización | Costo | Beneficio |
|---|---|---|
| **Hash de archivos descargados** (sha256 de cada PDF/HTML en `fuentes/`) | Trivial (un script) | Detección automática de cambios en re-descarga |
| **Diff-friendly storage** (commits por cada lote de descarga) | Trivial (git) | Histórico auditable de qué cambió |
| **Fecha de "vigente desde"** en metadata de cada archivo | Trivial | Saber de un vistazo qué tan antigua es la info |
| **Alerta RSS/email** del DOF sección SEP | Gratis (configurar) | Detección pasiva mensual |

### 6.2. Lo que NO automatizar todavía

- Parseo automático de PDFs del DOF (frágil y caro; mejor revisión manual).
- Búsqueda semántica entre versiones (innecesario hasta tener 5+ versiones).
- ML sobre cambios (absurdo a esta escala).
- Comparación campo-por-campo entre planes (manual es más confiable).

---

## 7. INTEGRACIÓN CON EL SPEC MVP

Esto se conecta con el `SPEC_MVP_01_Modulo_Docente.md` así:

### 7.1. Modelo de datos (impacto)

La entidad `CatalogoNEM` ya menciona versionado. Esto se hace explícito:

```
CatalogoNEM {
  version: "Plan 2022 ed. 2025",     // string semántico
  edicion: 2025,
  publicado_en_dof: "2022-08-19",
  ultima_revision: "2026-08-13",     // ISO date de cuándo se validó manualmente
  campos: [...],
  ejes: [...],
  pdas: [...]
}
```

Cada docente usa **una versión fija** del catálogo al crear un nuevo proyecto (inmutable). Pero la app puede sugerir: *"Hay una versión más reciente del Plan, ¿quieres usarla para tus próximos proyectos? Manteniendo la actual para los ya creados."*

### 7.2. Catálogo versionado: implicaciones prácticas

- **No hay migración forzada.** Un docente que en agosto-2023 creó proyectos con PDA de la versión A, los ve igual en 2026 aunque la versión B sea la actual.
- **Sí hay sugerencia contextual.** Al crear un proyecto nuevo, la app muestra: *"Versión actual: Plan 2022 ed. 2025. Cambios respecto a la versión con la que trabajas: [diff resumido]. Aplicar nueva versión a próximos proyectos."*
- **Bitácora de compat.** El `usuario_vio_version` se guarda en cada proyecto.

### 7.3. Riesgos cubiertos (impacto §9 del SPEC)

| Riesgo del SPEC | Cómo lo cubre E10 |
|---|---|
| **Riesgo #5 — Catálogo NEM desactualizado** | §3 cadencia + §4 alertas + §5 checklist |
| **Riesgo #2 — Reforma LFPDPPP 2025** | §3 cadencia compliance cada 6 meses |
| **Riesgo Kumu (competencia)** | §3 cadencia snapshots 6-12 meses |

---

## 8. GESTIÓN DE EMERGENCIA: ESCENARIO "¿ENTRÓ REFORMA MAYOR ESTA NOCHE?"

Para el caso en que se publique una reforma grande (cambio A) sin previo aviso:

1. **Día 0 (reforma publicada):** detección pasiva por RSS del DOF.
2. **Día 1-3:** founder lee el acuerdo, hace checklist §5 Paso 2 de impacto.
3. **Día 4-7:** catalogador actualiza manual (si aplica a campos/ejes/PDA).
4. **Día 8-10:** programador hace cambio mínimo (carga nueva versión, sin migraciones forzosas).
5. **Día 11-14:** anuncio a usuarios activos, banner en app.
6. **Día 30:** revisión de feedback, ajustes finos.

**Tiempo total:** 14-30 días. Compatible con mantenimiento operativo de un founder solo o con 1 programador.

---

## 9. RECOMENDACIÓN PRAGMÁTICA

**Para MVP:** no implementes un sistema automático de versionado. Haz lo siguiente:

1. Mantén `fuentes/` actualizado a mano con cadencia anual (agosto, antes del ciclo).
2. Asigna manualmente la versión vigente al catálogo.
3. Comprométete a revisar el DOF mensual (15 min), no diario.
4. Cuando empieces a tener 100+ usuarios activos, considera RSS automatizado del DOF.

**Para Fase 2 (cuando tengas tracción):** invierte en versionado automático del catálogo + alerta push a usuarios cuando hay cambio normativo mayor.

---

## 10. CHECKLIST PARA EMPEZAR (esta semana)

- [ ] Etiquetar cada archivo de `fuentes/` con "fecha de vigencia conocida" en metadata.
- [ ] Crear `CatalogoNEM_version` en el SPEC MVP con valor "Plan 2022 ed. 2025".
- [ ] Hacer commit inicial de `fuentes/` en git (trazabilidad histórica).
- [ ] Apuntarse a alerta RSS del DOF (15 min setup).
- [ ] Configurar recordatorio en calendario: cada **agosto**, revisar Plan de Estudio.
- [ ] Configurar recordatorio en calendario: cada **junio-julio**, revisar calendario escolar.

---

## 11. RELACIÓN CON OTROS ENTREGABLES

| Entregable | Vinculación |
|---|---|
| `SPEC_MVP_01_Modulo_Docente.md` §5 (Catálogo NEM) | Este doc define cómo se mantiene §5 |
| `SPEC_MVP_01_Modulo_Docente.md` §9 (Riesgos) | Este doc mitiga riesgos #2 y #5 |
| `E4 Compliance LFPDPPP` (pendiente) | Este doc define cadencia de revisión de compliance |
| `E3 Catálogo NEM digitalizado` (pendiente) | Catálogo debe incluir `version`, `edicion`, `ultima_revision` |
| `E6 Modelo de datos formal` (pendiente) | Debe modelar `CatalogoNEM` con campos de este doc §7.1 |

---

**Fin de E10.**

Próxima acción sugerida: ejecutar §10 (checklist para empezar) en las próximas 48 horas, antes de tocar el código del MVP.
