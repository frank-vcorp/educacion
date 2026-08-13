# E11 — SPEC DEL MÓDULO MONITOR DE VIGILANCIA NORMATIVA

**Versión:** 0.1
**Fecha:** 2026-08-13
**Estado:** ESPECIFICACIÓN OPERATIVA (módulo de mantenimiento, no de producto)
**Origen:** Discovery fundador (esta sesión) + E10 (`E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md`)
**Alineado a:** `SPEC_MVP_01_Modulo_Docente.md` (sincronización normativa); `E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md` (cadencia y checklist)
**Alcance MVP acordado:** núcleo normativo (NEM + LFPDPPP + Calendario Escolar + CONALITEG)
**Ejecución MVP acordada:** cron semanal (lunes)

---

## 1. PROPÓSITO

> **El Monitor NO entrega noticias a usuarios. Entrega al founder un "diff accionable" de cuándo algo cambió en el núcleo normativo que sostiene la plataforma, con severidad etiquetada y referencia a la sección del SPEC MVP que impacta.**

Es la **capa operativa** del E10. Mientras E10 define *cuándo y cómo reaccionar*; E11 define *cómo enterarte de que pasó algo*.

---

## 2. PRINCIPIOS DE DISEÑO

| # | Principio |
|---|---|
| P1 | **Servir al founder, no a usuarios.** El monitor produce artefactos locales para consumo humano del founder/equipo. No hay UI, no hay endpoints públicos. |
| P2 | **Cero costo de operación.** Sin cloud, sin SaaS, sin dependencias pagas. Python estándar + librerías triviales. |
| P3 | **Determinista y reproducible.** El mismo estado de fuentes → mismos artefactos. Hash de cada recurso vigilado. |
| P4 | **Idempotente.** Correr el monitor dos veces seguidas no duplica alertas si nada cambió. |
| P5 | **Auditable.** Cada corrida queda registrada: fecha, fuentes consultadas, hashes previos/nuevos, alertas producidas. |
| P6 | **Falla silenciosa, no falla ruidosa.** Si una fuente está caída, registra y sigue. No rompe el lote. |
| P7 | **Heurístico, no IA.** Las clasificaciones de severidad se hacen con keywords. IA entra solo cuando el catálogo de fuentes crezca. |
| P8 | **Respeto al origen.** Rate limiting (1 req/seg), respeto a robots.txt, user-agent identificable, no scraping agresivo. |

---

## 3. ALCANCE MVP — 6 FUENTES NÚCLEO

Solo el núcleo normativo. Decisión explícita del founder. Extensiones futuras vía E12.

### 3.1. Fuentes a vigilar

| # | Fuente | URL canónica | Qué se busca | Tipo de cambio esperado |
|---|---|---|---|---|
| **F1** | DOF — Sección Poder Ejecutivo / SEP | https://www.dof.gob.mx/ | Acuerdos con keywords `Plan de Estudio`, `NEM`, `educación preescolar, primaria`, `LFPDPPP`, `calendario escolar` | A, B |
| **F2** | Acuerdo 14/08/22 (Plan Estudios) | https://sidof.segob.gob.mx/notas/docFuente/5661845 | Vigencia + reformas | A |
| **F3** | Acuerdo 06/08/23 (modificación) | https://sidof.segob.gob.mx/notas/docFuente/5698663 | Vigencia + reformas | A |
| **F4** | planeacion.sep.gob.mx — Calendario | https://www.planeacion.sep.gob.mx/CalendarioEscolar.aspx | Calendario Escolar del próximo ciclo | B |
| **F5** | mley.mx — LFPDPPP | https://mley.mx/LFPDPPP | Última reforma, articulado vigente | A |
| **F6** | CONALITEG catálogo | https://libros.conaliteg.gob.mx/ | Catálogo público vigente, nuevos libros | C |

**Total: 6 fuentes. Margen de error tolerable: vigilar ~10-15 min/semana de tiempo humano cuando hay alerta.**

### 3.2. Lo que NO se vigila en MVP

Explícitamente fuera del alcance:

- Manuales CIFE (cambian cada ~24 meses, vigilance manual basta).
- Comunicados sin valor normativo (boletines rutinarios SEP).
- Mercado edtech (Kumu/Teachy/Planea IA — captura referencial manual cada 6-12 meses).
- Reforma educativa general (cambios al Art. 3°, leyes de educación salvo las que toquen datos personales).
- Otros países (las referencias internacionales vienen solo si México decide alinearse).

### 3.3. Razones de la restricción

El founder está solo. **Más fuentes = más ruido = menos atención a las importantes**. El MVP del monitor debe responder "¿cambió algo que me importa?" con alta precisión, no "averiguar todo lo que pasa en educación". Si en 12 meses la señal es buena y necesita más, se extiende.

---

## 4. CLASIFICACIÓN DE SEVERIDAD (heurística)

### 4.1. Palabras clave por nivel

| Severidad | Keywords (case-insensitive) | Acción |
|---|---|---|
| **🔴 ACTUAR** | `Plan de Estudio`, `LFPDPPP`, `Ley Federal de Protección de Datos`, `Ley General de Protección de Datos`, `INAI`, `Secretaría Anticorrupción`, `Artículo 3°`, `educación básica obligatoria`, `Plan y Programas de Estudio`, `reforma educativa`, `modifica el diverso` | Entrada BLOQUEANTE en `cambios_pendientes.md` + email/notify al founder (futuro) + checklist E10 §5 |
| **🟡 REVISAR** | `calendario escolar`, `reingreso`, `Consejo Técnico Escolar`, `CTE`, `Fase Intensiva`, `programa sintético`, `libros de texto`, `CONALITEG`, `Programa de Mejora Continua`, `PMC`, `programa analítico`, `ejes articuladores`, `campos formativos` | Entrada REVISAR en `cambios_pendientes.md` sin alerta inmediata |
| **🟢 INFO** | `boletín`, `comunicado`, `convocatoria`, `for`, `ceremonia`, `evento`, `conmemoración` | Solo log en `_monitor_run.log` |

### 4.2. Algoritmo de clasificación

Para cada documento nuevo detectado:

1. Calcular hash del contenido completo.
2. Si coincide con el último hash conocido → descartar.
3. Tokenizar título + primeras 500 palabras del cuerpo.
4. Si matchea **cualquier keyword de ACTUAR** → severidad 🔴.
5. Else si matchea **alguna keyword de REVISAR** → severidad 🟡.
6. Else → severidad 🟢.
7. **Si el documento menciona múltiples keywords** de severidades distintas, gana la más alta (🔴 > 🟡 > 🟢).

### 4.3. Falsos positivos explícitos a evitar

- "Conmemoración del N EM" en noticia cultural → caería en 🟢 si solo se busca "NEM".
- **Mitigación:** las keywords de ACTUAR son **frases multi-palabra** (`Plan de Estudio`, `LFPDPPP`, etc.), no siglas sueltas. Esto reduce falsos positivos >90%.

---

## 5. CONTRATO DE SALIDA — QUÉ PRODUCE EL MONITOR

### 5.1. Artefactos en disco

Todo en `fuentes/_monitor/`:

```
fuentes/_monitor/
├── config.json                    # Lista de fuentes vigiladas
├── estado.json                    # Último hash conocido por fuente + última corrida
├── runs/
│   └── YYYY-MM-DD-HHMM_run.log    # Log de cada corrida
├── cambios_detectados/
│   ├── YYYY-MM-DD-actuar-F2-plan_de_estudio.md
│   ├── YYYY-MM-DD-revisar-F4-calendario_2027_2028.md
│   └── ...
└── cambios_resumen_semanal_YYYY-MM-DD.md   # Resumen agregado los lunes
```

### 5.2. Estructura de cada alerta (archivo `.md`)

```markdown
# 🚨 [severidad] — [título corto de la detección]

**Fecha de detección:** 2026-08-13 09:14 UTC
**Fuente:** F# — [nombre_corto]
**URL original:** [URL canónica]
**Hash anterior:** `sha256:abc...`
**Hash nuevo:** `sha256:def...`

## Severidad y razonamiento
- Keywords detectadas: `Plan de Estudio`, `modifica el diverso`
- Severidad asignada: **🔴 ACTUAR**
- Razonamiento: Reforma normativa mayor

## Extracto del cambio (primeras 500 palabras)
> [extracto del HTML/PDF parseado]

## Impacto estimado en el SPEC MVP
| Sección | Impacto |
|---|---|
| §5 Catálogo NEM | ⚠️ Requiere actualización si cambiaron campos/ejes/PDA |
| §3.5 Contrato Curricular | ⚠️ Requiere actualización si cambió estructura de planeación |
| §9 Riesgos compliance | ⚠️ Requiere revisión si toca LFPDPPP |

## Acción sugerida (checklist E10 §5)
- [ ] Leer el documento original completo
- [ ] Catalogar el cambio (¿afecta catálogo / calendario / compliance / CONALITEG / features?)
- [ ] Decidir respuesta (ver §3 E10)
- [ ] Asignar versión al catálogo NEM (si aplica)
- [ ] Actualizar `fuentes/01_normativa_nem/` con el nuevo documento
- [ ] Actualizar `_log_descargas.md`
- [ ] Actualizar SPEC MVP con nueva versión
- [ ] (Si compliance) Revisar aviso de privacidad

## Responsable sugerido
- Founder + catalogador si afecta NEM.
- Asesor legal si afecta LFPDPPP.
- Programador si solo afecta calendario/CONALITEG.
```

### 5.3. Estructura del resumen semanal

Archivo `cambios_resumen_semanal_YYYY-MM-DD.md`:

```markdown
# Resumen semanal — 2026-08-13

**Fuentes consultadas:** 6/6
**Cambios detectados:** 2
**Actuar:** 1  •  **Revisar:** 1  •  **Info:** 0

## 🔴 ACTUAR (1)
- `2026-08-13-actuar-F2-*.md` — [título] — [acción mínima]

## 🟡 REVISAR (1)
- `2026-08-13-revisar-F4-*.md` — [título]

## 🟢 INFO (0)

## Estado por fuente
| Fuente | Última modificación detectada | Hash actual |
|---|---|---|
| F1 DOF | 2026-08-12 | sha256:... |
| F2 Acuerdo 14/08/22 | 2022-08-19 (vigente, sin cambios) | sha256:... |
| F3 Acuerdo 06/08/23 | 2023-08-15 (vigente, sin cambios) | sha256:... |
| F4 Calendario escolar | 2025-06-09 (Acuerdo 18/06/25) | sha256:... |
| F5 LFPDPPP | 2025-11-14 (última reforma) | sha256:... |
| F6 CONALITEG | 2026-08-01 (catálogo escolar) | sha256:... |

## Próximas vigilancias críticas
- **Agosto 2027:** nuevo ciclo escolar 2027-2028 → revisar calendario y catálogo CONALITEG.
- **Marzo 2026:** vencen 90 días desde DOF 20-mar-2025 para reglamentos LFPDPPP.
```

---

## 6. OPERACIÓN — MODO CRON SEMANAL

### 6.1. Comando de ejecución

```bash
python3 monitor_normativo.py [--once | --daemon]
```

- **Modo por defecto:** `--daemon` (corre una vez y termina, ideal para cron).
- `--once`: idéntico al anterior, alias explícito.
- `--daemon`: reservado para futuro, no usado en MVP (loop continuo).

### 6.2. Configuración como cron

```cron
# Ejecutar el monitor cada lunes a las 9:00 AM hora local
0 9 * * 1 cd /home/frank/repos/educacion && /usr/bin/python3 Educacion/fuentes/_monitor/monitor_normativo.py --once >> .monitor_cron.log 2>&1
```

**Costo:** 1 ejecución semanal, ~30-60 segundos de tiempo de CPU, < 5 MB de artefactos generados por semana sin cambios.

### 6.3. Retención de artefactos

| Artefacto | Retención | Razón |
|---|---|---|
| `estado.json` | Indefinido | Estado persistente |
| `runs/*.log` | **8 semanas** (rotación) | Histórico de fallas, suficiente para auditar |
| `cambios_detectados/*.md` | **Indefinido** mientras alerta esté pendiente; **1 año** después de marcada como resuelta | Trazabilidad de cambios aplicados |
| `cambios_resumen_semanal_*.md` | **Indefinido** (doc histórico del proyecto) | Memoria institucional |

### 6.4. Operación de "marcar como resuelta"

El founder, cuando aplica un cambio, mueve el archivo `cambios_detectados/*.md` a `cambios_resueltos/AAAA-MM-DD-[severidad]-[slug].md` con anotación de qué se hizo. Esto:

- Lo saca del "resumen semanal pendiente".
- Lo preserva para auditoría posterior.
- Permite medir tiempo entre detección y aplicación.

---

## 7. CRITERIOS DE ÉXITO DEL MONITOR (E11 MVP)

| # | Criterio | Métrica |
|---|---|---|
| CE1 | Detecta reformas mayores reales sin falsos positivos severos | Recall ≥ 90% en reformas 2022-2026 probadas |
| CE2 | No genera más de 1 falso positivo 🟢 por semana | Tasa semanal FP 🟢 ≤ 1 |
| CE3 | Corre en menos de 60 segundos en una conexión normal | Wall time ≤ 60s |
| CE4 | No consume más de 50 MB de artefactos por mes sin alertas reales | Acumulado mensual |
| CE5 | Genera al menos 1 alerta 🟡 o 🔴 real durante un ciclo escolar completo (agosto-julio) | ≥ 1 detección de cambio tipo A/B en el ciclo |
| CE6 | Genera resumen semanal útil que el founder efectivamente lee (no spam) | Tasa de "resúmenes sin alertas" consecutivas ≤ 4 (es decir, no más de 1 mes sin nada relevante) |

---

## 8. INVERSIÓN REQUERIDA

| Rol | Horas estimadas (one-shot) | Después |
|---|---|---|
| Founder (definir config) | 2 h | 0 |
| Programador (script MVP) | 8-12 h | 2 h/año de mantenimiento |
| Catalogador (curar URLs y keywords) | 4 h | 1 h/año |
| **Total** | **14-18 h** | **3 h/año** |

**Costo recurrente:** $0 (sin cloud, sin API keys, sin SaaS).

---

## 9. LO QUE EXPLÍCITAMENTE NO CONSTRUIMOS EN E11 MVP

- ❌ **Interfaz de usuario** del monitor (no es producto, no necesita UI).
- ❌ **Notificaciones push** al founder (founder decide cuándo lee el resumen; las alertas son locales).
- ❌ **Diff semántico** entre versiones de documentos (diff carácter a carácter basta para tu volumen).
- ❌ **IA para clasificar severidad** (las heurísticas son suficientes y más auditables).
- ❌ **Scraping de PDFs sin parseo robusto** (solo HTML fácil de extraer; PDFs se notifican pero no se parsean).
- ❌ **Integración con el producto** (no afecta a usuarios finales hasta que tengas base instalada).

---

## 10. CUANDO ESCALAR MÁS ALLÁ DEL MVP

| Trigger | Acción |
|---|---|
| **Monitoreas >30 fuentes** | Replantear: vale la pena pasar a SaaS (tipo RSS aggregator + Diffbot) o script sigue siendo suficiente. |
| **Tienes 100+ usuarios activos** | Considerar notificar usuarios cuando cambia el catálogo (separar Monitor personal del Monitor de producto). |
| **Reformas ocurren cada <6 meses** | Vale la pena invertir en IA para clasificar (mejor recall que keywords). |
| **Tienes producto con versionado por usuario** | Separar el "Catálogo personal" (cada docente con su versión) del "Catálogo global" (lo que el monitor detecta). |

---

## 11. ENTREGABLES DERIVADOS (futuros)

| # | Entregable | Dependencia |
|---|---|---|
| **E12** | Lista priorizada de fuentes adicionales (CIFE, manuales, etc.) | E11 MVP en producción |
| **E13** | Implementación del script (Python) | E11 |
| **E14** | Runbook de operación (qué hacer cuando salta 🔴) | E11 + E10 |
| **E15** | Integración con producto (notificar usuarios) | Producto con base instalada |

---

## 12. CHECKLIST PARA ARRANCAR E11

Pre-implementación (decisiones del founder):

- [x] Aprobar este SPEC (E11) — hecho en esta sesión.
- [ ] Confirmar las 6 fuentes núcleo (F1-F6) como correctas.
- [ ] Confirmar keywords de severidad (si quieres afinar).
- [ ] Confirmar cron semanal lunes 9:00 AM hora local.

**Próximo paso lógico:** E13 (script Python funcional) cuando estés listo para invertir 8-12 horas de programación.

---

## 13. RELACIÓN CON OTROS ENTREGABLES

| Entregable | Vinculación |
|---|---|
| `E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md` | E11 es la implementación operativa; E10 es el protocolo conceptual |
| `SPEC_MVP_01_Modulo_Docente.md` §9 (Riesgos normativos) | E11 mitiga riesgos #2 y #5 mediante detección temprana |
| `fuentes/01_normativa_nem/` y `02_compliance/` | E11 produce artefactos que se archivan en estas carpetas |

---

**Fin de E11.**
