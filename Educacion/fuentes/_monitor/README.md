# Monitor de Vigilancia Normativa (E11)

Monitor local de las **6 fuentes núcleo** del proyecto educación: detecta
reformas en el Plan de Estudios NEM, LFPDPPP, Calendario Escolar y catálogo
CONALITEG. Sin cloud, sin API keys, sin IA. Solo Python + heurísticas de
keywords.

Especificación: `Educacion/fuentes/E11_MONITOR_VIGILANCIA_NORMATIVA.md`.

---

## TL;DR — Cómo ejecutarlo

```bash
# Una sola vez (modo canonico para cron)
python3 Educacion/fuentes/_monitor/monitor_normativo.py --once

# Ver ayuda
python3 Educacion/fuentes/_monitor/monitor_normativo.py --help
```

**Primera corrida:** pobla `estado.json` con los hashes actuales de las 6
fuentes. **No genera alertas** porque todavía no hay historial contra el
cual comparar (idempotencia P3 + P4 de E11).

**Corridas posteriores:** compara el hash actual contra el último conocido.
Si algo cambió → genera alerta en `cambios_detectados/` + entrada en el
resumen semanal.

---

## Requisitos

- Python 3.10+ (probado en 3.14)
- Dependencias: `requests`, `beautifulsoup4`, `python-dateutil`

```bash
pip install --user -r Educacion/fuentes/_monitor/requirements.txt
```

> Si tu sistema tiene PEP 668 activo (Debian, Ubuntu recientes), usa
> `pip install --user --break-system-packages ...` o un virtualenv.

---

## Estructura del módulo

```
Educacion/fuentes/_monitor/
├── monitor_normativo.py          # Script principal (entry-point)
├── severidad.py                  # Clasificador INFO/REVISAR/ACTUAR (E11 §4.1)
├── fingerprint.py                # Hash SHA-256 + extracción 500 palabras (E11 §4.2)
├── notificador.py                # Escritura a disco (alertas, resumen, log)
├── config.json                   # 6 fuentes vigiladas (URLs, keywords, timeouts)
├── estado.json                   # Estado persistente (se crea en 1ª corrida)
├── requirements.txt
├── README.md                     # Este archivo
├── runs/                         # Logs por corrida (rotación 8 semanas)
├── cambios_detectados/           # Alertas individuales (markdown)
└── cambios_resumen_semanal_*.md  # Resumen semanal agregado
```

---

## Modos de ejecución

| Modo | Comportamiento | Uso |
|---|---|---|
| `--once` (default) | Una corrida → termina | **Cron semanal** (modo canónico) |
| `--daemon` | Alias de `--once` en MVP | Reservado para loop continuo (futuro) |
| `--help` | Muestra ayuda | — |

### Cron semanal recomendado (E11 §6.2)

```cron
# Cada lunes 9:00 AM hora local
0 9 * * 1 cd /home/frank/repos/educacion && /usr/bin/python3 Educacion/fuentes/_monitor/monitor_normativo.py --once >> .monitor_cron.log 2>&1
```

Costo: 30-60 segundos CPU + < 5 MB de artefactos/semana sin cambios.

---

## Interpretar las alertas

Las alertas se escriben en `cambios_detectados/YYYY-MM-DD-{severidad}-F#-slug.md`.

Severidades (definidas en E11 §4.1):

| Emoji | Severidad | Acción |
|---|---|---|
| 🔴 | **ACTUAR** | Entrada BLOQUEANTE. Aplicar checklist E10 §5 inmediatamente. |
| 🟡 | **REVISAR** | Entrada en `cambios_pendientes.md`. Revisar cuando puedas. |
| 🟢 | **INFO** | Solo log. Sin acción requerida. |

**Resumen semanal:** `cambios_resumen_semanal_YYYY-MM-DD.md` siempre se
genera (incluso si no hay alertas). Léelo cuando hagas la revisión semanal.

---

## Cómo funciona el pipeline

```
fetch HTTP (UA identificable, 1 req/seg, respeta robots.txt)
   ↓
parse BeautifulSoup (extrae texto, descarta <script>/<style>)
   ↓
hash SHA-256 del HTML crudo (truncado si >500 KB)
   ↓
comparar vs último hash conocido (estado.json)
   ↓
si cambió → clasificar severidad (keywords, E11 §4.1)
   ↓
generar alerta .md en cambios_detectados/
   ↓
actualizar estado.json (nuevo hash, timestamp)
```

Reglas operativas clave (E11 §2):

- **P3 Determinista:** mismo estado de fuentes → mismos artefactos.
- **P4 Idempotente:** correr dos veces sin cambios no duplica alertas.
- **P6 Falla silenciosa:** si una fuente cae, registra y sigue.
- **P8 Respeto al origen:** 1 req/seg, robots.txt, UA identificable
  (`Mozilla/5.0 (Atlas-Monitor/0.1; +https://github.com/frank/...)`).

---

## Qué hace la primera corrida

1. Lee `config.json` con las 6 fuentes.
2. Descarga cada una (respetando rate-limit).
3. Calcula SHA-256 de cada HTML.
4. **Como `estado.json` no existe o no tiene hashes previos** → inicializa
   los hashes actuales y **no alerta nada**.
5. Genera `estado.json`, `runs/<ts>_run.log` y
   `cambios_resumen_semanal_<fecha>.md` (con 0 alertas).

**Esto es correcto y esperado.** No significa que el monitor esté roto;
significa que no hay contra qué comparar todavía. La señal real empieza
en la corrida #2.

> Truco para validar el pipeline sin esperar un cambio real:
> editar manualmente un hash en `estado.json` (cambiar 1 caracter) y volver
> a correr `--once`. Debería generar una alerta (severidad según las
> keywords del HTML real de esa fuente).

---

## Qué vigilar en las fuentes (heurística)

| Fuente | Qué buscar | Severidad típica si cambia |
|---|---|---|
| **F1** DOF | Acuerdos con `Plan de Estudio`, `NEM`, `LFPDPPP` | 🔴 / 🟡 |
| **F2** Acuerdo 14/08/22 | Vigencia, reformas | 🔴 (casi siempre) |
| **F3** Acuerdo 06/08/23 | Vigencia, reformas | 🔴 (casi siempre) |
| **F4** Calendario SEP | Calendario del próximo ciclo | 🟡 |
| **F5** LFPDPPP | Última reforma, articulado | 🔴 |
| **F6** CONALITEG | Catálogo, nuevos libros | 🟡 |

La tabla completa de keywords está en `severidad.py` (literal E11 §4.1).

---

## Mantenimiento

### Rotación de logs

`runs/*.log` se rota automáticamente a 8 semanas (E11 §6.3). Se ejecuta
al inicio de cada corrida.

### Añadir una fuente nueva

1. Añadir entrada en `config.json` (id, nombre, URL, tipo, keywords).
2. Correr `--once`. En la primera corrida, se inicializa el hash (sin alerta).
3. En corridas posteriores, cualquier cambio se detectará.

### Afinar keywords

Editar `severidad.py` — los arrays `KEYWORDS_*` son literales de E11 §4.1.
Tras modificar, probar:
```bash
python3 Educacion/fuentes/_monitor/severidad.py
```

---

## Troubleshooting

**"Falta librería X":** `pip install --user --break-system-packages -r requirements.txt`

**El monitor tarda >60s:** revisar `runs/<ts>_run.log`. Causas probables:
red lenta, fuente caída, HTML >500 KB. Las fallas no rompen la corrida.

**El hash es estable pero quiero forzar re-alerta:** borrar la entrada
de esa fuente en `estado.json` o cambiar el hash guardado.

**Quiero resetear todo:** borrar `estado.json`. La próxima corrida lo
recrea inicializado.

**Falsos positivos con "N EM":** mitigado por E11 §4.3 — las keywords de
ACTUAR son frases multi-palabra, no siglas sueltas. Si aparecen falsos
positivos, añadir el patrón a una lista de exclusión (TODO futuro).

---

## Lo que NO hace este monitor

- ❌ No envía notificaciones push/email (P1: artefactos locales).
- ❌ No hace diff semántico (E11 §9: diff carácter a carácter basta).
- ❌ No parsea PDFs (regla: si Content-Type es `application/pdf`, se omite).
- ❌ No usa IA para clasificar (P7: heurísticas de keywords).
- ❌ No tiene UI (P1: solo artefactos locales).

---

## Referencias

- E11 SPEC completa: `Educacion/fuentes/E11_MONITOR_VIGILANCIA_NORMATIVA.md`
- E10 Protocolo conceptual: `Educacion/fuentes/E10_PROTOCOLO_SINCRONIZACION_NORMATIVA.md`
- SPEC MVP Módulo Docente: `Educacion/SPEC_MVP_01_Modulo_Docente.md`
