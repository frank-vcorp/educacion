# ENT-003 — Confirmación de Decisiones MVP (Alumnos, Onboarding, PDF Dual, Catálogos)

**ID:** ENT-003-DECISIONES-MVP
**Fecha:** 2026-08-15
**Origen:** Decisiones del founder en sesión de trabajo
**Estado:** CONFIRMADO — pendiente integrar a `SPEC_MVP_01_Modulo_Docente.md`

---

## D1 — Alumnos: SÍ se incluyen nombres individuales

**Decisión:** revertir §4 línea 554 del SPEC ("Sin datos de alumnos en MVP. Cero").

**Justificación:** El pain point #1 de Tía Lola es "no recuerdo qué tema di con X niño" (6/8 maestras de la encuesta). Sin nombres, este dolor NO se resuelve. Legal se aborda después (LFPDPPP 2025 art. 8 consentimiento expreso).

**Cambios concretos:**

| Concepto | Antes | Ahora |
|----------|-------|-------|
| Datos de alumnos | Cero en MVP | Nombres + nivel de logro + observaciones cortas |
| Seguimiento individual | No | Sí, vía rúbrica de 4 niveles (🟢🟡🟠🔴) |
| Datos de salud / neurotipo | No | NO (sigue fuera) |
| Fotografías de alumnos | No | NO (reforma Senado 26-dic-2025) |
| Bitácora con foto | Sí, del trabajo del niño | Igual (no del niño mismo) |

**Entidades nuevas:**
- `Alumno { id, docente_id, nombre, grado, grupo, activo, created_at }`
- `EvaluacionAlumno { id, planeacion_id, alumno_id, nivel (1-4), observaciones, fecha }`

**Compliance LFPDPPP 2025 (diferido a fase legal, NO bloqueante MVP):**
- Aviso de privacidad mencionará tratamiento de nombres de menores
- Consentimiento expreso de padres/tutores al inicio (formulario digital simple)
- Base legal: art. 8 consentimiento o art. 10 excepción educativa

**Criterio de cierre MVP:**
- Tía Lola puede registrar lista de alumnos de su grupo (captura manual o import CSV).
- Puede evaluar con un drag-drop a nivel visual.
- Puede consultar historial cronológico por alumno.

---

## D2 — Onboarding: flujo paso a paso para alta de Tía Lola

**Decisión:** Definir onboarding paso a paso, no más de 5 pantallas.

**Flujo confirmado:**

```
┌─────────────────────────────────────────────────────────────┐
│ PANTALLA 1: Registro                                         │
├─────────────────────────────────────────────────────────────┤
│ "Crea tu cuenta"                                            │
│ [Nombre completo de la maestra__________________]           │
│ [Email________________________]                             │
│ [Contraseña_________][👁]                                   │
│ [Confirmar contraseña_________]                             │
│                                                             │
│ [Crear cuenta →]                                            │
│                                                             │
│ ¿Ya tienes cuenta? Inicia sesión                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PANTALLA 2: CCT de tu escuela (autocomplete)               │
├─────────────────────────────────────────────────────────────┤
│ "Ingresa la CCT de tu escuela (la tienes en tu credencial)" │
│ [22DJN0059R________________________] [Buscar]              │
│                                                             │
│ Resultado (autocompletado del catálogo SEP E15):           │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Jardín de Niños Celestino Freinet                │       │
│  │ CCT: 22DJN0059R · Aguascalientes · Zona urbana   │       │
│  │ Turno: Matutino                                  │       │
│  │ Director: (pendiente de carga o no registrado)   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                             │
│ [Confirmar y continuar →]                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PANTALLA 3: Tu grupo (este ciclo escolar)                   │
├─────────────────────────────────────────────────────────────┤
│ "Dinos sobre tu grupo de este ciclo"                        │
│ ( ) Preescolar ( ) Primaria ( ) Secundaria                  │
│ Grado: [1°] [2°] [3°] (si preescolar)                      │
│ Grupo: [A____]                                              │
│ # aproximado de alumnos: [___]                              │
│                                                             │
│ [Continuar →]                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PANTALLA 4: Lista de alumnos (opcional)                    │
├─────────────────────────────────────────────────────────────┤
│ "Agrega los nombres de tus alumnos" (puedes hacerlo después)│
│                                                             │
│ [+ Agregar uno por uno]   [📥 Importar CSV]                │
│                                                             │
│ 1. [María López_______________]                            │
│ 2. [José Pérez________________]                            │
│ 3. [Ana García________________]                            │
│ 4. [+ Agregar otro]                                         │
│                                                             │
│ [Saltar por ahora] [Continuar →]                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PANTALLA 5: Bienvenida (un solo hint contextual)           │
├─────────────────────────────────────────────────────────────┤
│ "¡Listo! Tu primera planeación toma 15 min con bloques"    │
│                                                             │
│ [💡 Tip: Cuando estés en el calendario, mantén              │
│  presionado un bloque del banco para arrastrarlo]           │
│                                                             │
│ [Ir a mis planeaciones →]                                   │
└─────────────────────────────────────────────────────────────┘
```

**Total: 5 pantallas máximo. Sin tutoriales largos (P-UX9).**

**Validación:** una pregunta por pantalla (P-UX1).

**Datos que se repiten → catálogos:**
- CCT → viene del catálogo SEP (E15 dataset público)
- Escuela → se autocompleta al elegir CCT
- Director → se autocompleta al elegir CCT (si existe); sino se captura después
- Alumnos → captura única al inicio del ciclo, editables durante el año

**Datos que NO se repiten (solo del docente):**
- Email (login)
- Contraseña (hash)
- Nombre completo
- Datos del grupo actual (puede cambiar cada ciclo)

---

## D3 — PDF: visualizable + descargable + compartible

**Decisión:** El PDF de la planeación es **triple**:

1. **Visualizable en plataforma** (panel del director sin registro)
   - URL firmada única
   - Embebido en iframe
   - Marca de agua sutil "Vista de director"

2. **Descargable**
   - Botón "Descargar PDF" en vista del director y de la maestra
   - Formato NEM completo (cumple §3.5 Contrato Curricular)
   - Sin marca de agua (versión oficial)

3. **Compartible**
   - Botón "Copiar link"
   - Botón "Compartir por WhatsApp" (mensaje pre-armado, editable)
   - QR descargable
   - URL firmada con expiración 30 días (configurable)

**Implementación:**

```
Plataforma                          Director
┌──────────────┐     ┌─────────────────────┐
│ Vista previa │     │ URL firmada         │
│ del PDF      │────→│ https://app/        │
│ (embebido)   │     │     v/abc123?token  │
└──────────────┘     │     =xyz789         │
                     └─────────────────────┘
                              │
                  ┌───────────┼───────────┐
                  ▼           ▼           ▼
              [Ver]      [Descargar]  [Compartir]
              (embebido)  (.pdf)       (URL/QR/WhatsApp)
```

**Cumple:**
- §3.5 Contrato Curricular NEM (secciones obligatorias)
- §3.6.M5 arquitectura cerrada
- Doble uso: digital (visualizar) + analógico (imprimir)

**Diferenciación vs Kumu:** Kumu solo exporta PDF descargable. Nuestra plataforma ofrece además URL firmada para visualización sin registro.

---

## D4 — Catálogos y datos que se repiten

**Decisión:** Todos los datos "del mundo" (CCT, escuelas, planes) vienen de catálogos externos. Solo los datos "del docente" (perfil, planeaciones, alumnos) son captura.

**Catálogos externos (carga automática):**

| Catálogo | Fuente | Tamaño | Estado |
|----------|--------|--------|--------|
| **CCT → escuela** | Catálogo Nacional SEP 2024 (CC-BY-4.0) | 414 MB CSV | ✅ E15 cerrado |
| **4 campos formativos** | DOF Acuerdo 14/08/22 | 4 registros | ✅ |
| **7 ejes articuladores** | DOF Plan 2022 §8.1 | 7 registros | ✅ |
| **~24-30 PDA Fase 2** | DOF Programas Sintéticos | ~30 registros | 🔄 E14 en desarrollo |
| **Contenidos preescolar** | DOF Programas Sintéticos | ~50 registros | 🔄 E14 en desarrollo |
| **Libros CONALITEG** | Catálogo público SEP | ~10 registros | ✅ Referencia, no contenido |

**Datos del docente (captura única):**

| Dato | Cuándo | Editable |
|------|--------|----------|
| Nombre | Registro | Una vez |
| Email | Registro | Siempre |
| Contraseña | Registro | Siempre |
| CCT escuela actual | Onboarding | Cada ciclo (cambio de escuela) |
| Grado/grupo/total alumnos | Onboarding por ciclo | Siempre |
| Lista de alumnos | Onboarding o después | Durante el ciclo |
| Configuración M4 (características escuela) | Primera planeación | Siempre |

**Datos de planeación (creación continua):**

| Dato | Origen | Frecuencia |
|------|--------|-----------|
| Proyectos/unidades | Creación de la maestra | 2-4/mes |
| Bloques arrastrados | Catálogo M1 | Al crear |
| Sesiones | Calendario | Al calendarizar |
| Evaluaciones por alumno | Captura post-clase | 1-2/semana |
| Entregas al director | Generación PDF + URL firmada | 1-4/mes |

**Anti-duplicación:**
- CCT siempre viene del catálogo (autocompletar)
- Escuela, nivel, turno: autocompletados al elegir CCT
- PDA y contenidos: del catálogo E14
- Ejes articuladores: del catálogo fijo
- Maestros NO pueden crear PDA personalizados (regla dura)
- Maestros SÍ pueden crear bloques personalizados (su banco personal, no se mezcla con catálogo general)

---

## Resumen de cambios al SPEC principal

| § | Cambio | Tipo |
|---|--------|------|
| §1 | Actualizar "Sin alumnos ni padres..." → incluir alumnos | Texto |
| §2 Persona 1 (Lola) | Agregar: "tiene 18-25 niños que conoce por nombre" | Texto |
| §3.5 | Sin cambios (Contrato Curricular sigue vigente) | - |
| §3.6 M5 | Confirmar visualizable + descargable + compartible | Refuerzo |
| §3.7 Política MiniMax | Siguen vigentes (CERO datos de alumnos a IA) | Sin cambios |
| §4 Entidades | Agregar `Alumno` y `EvaluacionAlumno` | Nuevas entidades |
| §4 línea 554 | REVERTIR: borrar "Sin datos de alumnos en MVP. Cero" | Cambio crítico |
| §6 Auth | Mantener email + password | Sin cambios |
| §6.2 Multi-tenant | Mantener RLS por CCT | Sin cambios |
| **NUEVO §8** | Onboarding paso a paso (5 pantallas) | Sección nueva |
| **NUEVO §9** | PDF triple (visualizable/descargable/compartible) | Sección nueva |
| §10 Riesgos | Agregar: "Compliance LFPDPPP para datos de alumnos — fase legal post-MVP" | Nuevo riesgo |

**Total cambios:** 9 modificaciones + 2 secciones nuevas. Estimado: ~4h de redacción e integración.

---

## Próximos pasos

1. ✅ Documento ENT-003 creado (este archivo)
2. ⏳ Founder valida las 4 decisiones (D1-D4)
3. ⏳ Integrar cambios al SPEC principal (estimado 4h)
4. ⏳ Actualizar backlog del proyecto
5. ⏳ Documentar exclusión de alumnos en aviso de privacidad (E4) cuando se defina legal

---

**Fin del documento ENT-003.**