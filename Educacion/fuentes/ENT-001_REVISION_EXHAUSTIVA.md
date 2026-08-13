# ENT-001 Revisión Exhaustiva — Pre-Implementación

**Versión:** 0.1
**Fecha:** 2026-08-13
**Estado:** CHECKPOINT PRE-IMPLEMENTACIÓN
**Origen:** Decisión del founder (esta sesión): "demos la app a Lola para hacer una planeación real y ver inconsistencias". Antes de llegar a Lola, revisión exhaustiva del SPEC para detectar lo que se pueda detectar sin pruebas de campo.
**Alcance:** revisión del SPEC MVP v0.8.1, Encuesta v2 y entregables relacionados (E10, E11, E14, E15, E16).

---

## 1. RESUMEN EJECUTIVO

Se detectaron **22 problemas** que requieren resolverse antes de entregar a Lola:

| Severidad | Conteo | Acción |
|---|---|---|
| Alta (bloqueante) | 6 | Resolver antes de cualquier implementación |
| Media (revisar) | 9 | Resolver esta semana |
| Baja (limpieza) | 7 | Resolver cuando se toque esa sección |

**Tiempo estimado para resolver Alta:** 4-6 horas founder + 2-3 horas Atlas para verificación.

---

## 2. INCONSISTENCIAS INTERNAS DEL SPEC (I1-I10)

### I1 — Tiempo objetivo de planeación mensual inconsistente [ALTA]

**Dónde:**
- §1 Objetivo del MVP: "armar su planeación mensual arrastrando esas clases a un calendario" + "5 min" (interpretación implícita).
- §3 Flujo A tiempo objetivo: "< 15 min para un proyecto completo".
- §3 Flujo B tiempo objetivo: "< 5 min para calendarizar + exportar (sumado al Flujo A: ~20 min)".
- §7 Cierre criterio 2: "La misma maestra logra armar una planeación mensual en <5 min".

**Inconsistencia:** 5 min vs 15 min vs 20 min. Depende de qué se considera "planeación completa" (¿solo el proyecto? ¿proyecto + calendarización?).

**Resolución propuesta:** elegir UNA cifra canónica y aplicarla consistentemente. Recomendación: **"una planeación mensual completa = crear proyecto + calendarizar + exportar = 20 minutos"**, dividido en "Flujo A: 15 min" + "Flujo B: 5 min". Esto refleja las horas reales de trabajo y el contraste con "4-6 horas actuales".

---

### I2 — Catálogo NEM tiene DOS cifras distintas (§5 vs §3.6.M1) [ALTA]

**Dónde:**
- §5 Catálogo NEM: "~30 plantillas" (6 tipos × 3-5 plantillas cada uno).
- §3.6.M1 Tamaño del catálogo: "~150 bloques" (4 campos × 5 tipos × ~7 variantes + transversales).

**Inconsistencia:** diferencia 5×. No es complementariedad (no son dos catálogos distintos), es el mismo concepto con cifras distintas.

**Resolución propuesta:** el catálogo definitivo para Fase 2 (preescolar) es **~150 bloques curados**, no ~30. Reescribir §5 para alinearlo con §3.6.M1 y añadir las 6 variantes por bloque al inventario de tipos (Apertura / Desarrollo / Actividad práctica / Microlección / Evaluación formativa / Cierre reflexivo).

---

### I3 — §1 Objetivo del MVP habla de "crear una clase" (terminología vieja) [MEDIA]

**Dónde:**
- §1: "1. Crear una clase en menos de 5 minutos usando bloques pre-armados".
- §3 Flujo A: "Crear un proyecto o situación (NEM)".
- §4 Entidades: "se elimina Clase como entidad aislada. La unidad mínima ahora es Proyecto".

**Inconsistencia:** §1 quedó sin actualizar al cambio v0.3.

**Resolución propuesta:** reescribir §1 con vocabulario actualizado ("proyecto/situación" en vez de "clase"). Mantener §1 como resumen ejecutivo de lo que la maestra logrará hacer, alineado con §3.

---

### I4 — Mensaje pre-armado de WhatsApp promete futuro incierto [MEDIA]

**Dónde:**
- §3.6.M5 mensaje pre-armado: "Si quieres registrarte en la plataforma para recibir las próximas planeaciones de tus maestros sin que te las manden por aquí..."

**Inconsistencia:** el mensaje vende "recibir las próximas" pero el SPEC no define explícitamente que el director registrado reciba futuras entregas automáticamente. §3.6.M5 anti-features dice "NO tenemos flujo de aprobación formal". El "recibir" es ambiguo.

**Resolución propuesta:** reformular el mensaje a: "Si quieres registrarte en la plataforma para abrir un panel donde verás todas las planeaciones que te manden tus maestros en un solo lugar, sin que se pierdan en WhatsApp". La promesa es **recepción centralizada**, no **alertas proactivas** (que son Fase 2).

---

### I5 — Datos personales del director no documentados en LFPDPPP [MEDIA]

**Dónde:**
- §3.6.M5 autenticación del director: OTP por WhatsApp al celular que la maestra declara.
- E4 Compliance LFPDPPP 2025: marcado como pendiente.

**Inconsistencia:** el celular del director ES dato personal bajo LFPDPPP 2025. Tratarlo requiere aviso de privacidad + base legal. Sin E4 cerrado, esto queda en limbo.

**Resolución propuesta:** añadir una nota explícita en §3.6.M5 que diga "**Bloqueador latente:** requiere E4 cerrado antes de habilitar M5 en producción. Para pruebas internas con Lola, basta con aceptación verbal informal". O bien: priorizar E4 antes de M5.

---

### I6 — T13 "MVP con variante urbana CDMX" contradice persona 1 (Lola rural) [ALTA]

**Dónde:**
- §2 Persona 1 "Lola": maestra de preescolar (no queda explícita la zona, pero por su origen rural implícito en historial).
- §3.6.M4 T13: "el MVP arranca con 1 variante por bloque (la versión urbana CDMX estándar)".

**Inconsistencia:** el caso arquetipo (Lola) no se sirve con la única variante de MVP.

**Resolución propuesta:** clarificar la zona de Lola en §2 (ej: "rural-preescolar típico del centro de México") y diseñar T13 para que la variante inicial sea, alternativamente: (a) urbana genérica como baseline, (b) rural genérica que cubre mejor el caso arquetipo, (c) parametrizable para que tía Lola elija su variante. Recomendación: T13 debe producir **2 variantes mínimas** (urbana + rural genérica) desde el día 1, no solo 1.

---

### I7 — M3 funcionalidad "Planificar mes completo" contradice anti-feature [ALTA]

**Dónde:**
- §3.6.M3 funcionalidad 4: "Botón 'Planificar mes completo' — genera esqueleto basado en banco de zona + catálogo de bloques + calendario escolar + pendientes del mes anterior".
- §3.6.M3 anti-features: "NO llena días automáticamente sin OK de la maestra".

**Inconsistencia:** la función dice "genera esqueleto", la anti-feature prohíbe "llenar días sin OK". La diferencia no está explicada.

**Resolución propuesta:** precisar. El botón "Planificar mes completo" **propone un esqueleto (estructura vacía con fechas tentativas)**, NO llena con contenido. La maestra debe confirmar/rechazar bloque por bloque. El "rellenar" no ocurre en MVP. Reformular para que se entienda.

---

### I8 — "Avisos al director" sin canal definido [MEDIA]

**Dónde:**
- §3.6.M5 T20: "MVP: NO [notificaciones al director]".
- §3.6.M5 beneficios: "Recibe avisos cuando un maestro sube una planeación nueva (opt-in)".

**Inconsistencia:** si T20 dice NO y los beneficios ofrecen avisos, ¿cómo llegan esos avisos al director?

**Resolución propuesta:** declarar el canal. En MVP, los "avisos" serían: (a) email cuando el director se registra dando su correo (no OTP, sino opt-in de notificación), (b) nada push/in-app en MVP. Si el director no da email, no hay avisos (debe entrar a su panel a ver). Reformular beneficios como "Tu panel está actualizado; entérate cuando lo abras, sin spam".

---

### I9 — "Referencias a CONALITEG" sin definir cómo aparecen en bloque [BAJA]

**Dónde:**
- §1 Anti-objetivo: "No aloja contenido de CONALITEG".
- §4 entidad Bloque: "recursos_embebidos opcional (URL, NO contenido CONALITEG)".

**Inconsistencia:** si no se aloja contenido, ¿cómo se referencia? ¿Texto "consultar libro X página Y"? ¿URL externa al PDF alojado en CONALITEG? ¿Miniatura del libro?

**Resolución propuesta:** crear §3.6.M1.5 (sub-sección) "Protocolo de referencias bibliográficas CONALITEG" con la regla concreta. Sugerencia: "(a) texto del bloque menciona el libro por nombre completo, (b) NO se incrusta contenido editorial, (c) link externo a libros.conaliteg.gob.mx si la URL es pública, (d) si no, solo mención textual sin link".

---

### I10 — "CCT no es dato personal" es legalmente cuestionable [ALTA]

**Dónde:**
- §3.6.M2 privacidad: "La CCT no es dato personal (es identificador público SEP)".

**Inconsistencia:** la CCT, aislada, puede no ser dato personal. Pero CCT + nombre de docente + celular de WhatsApp ya triangulan identidad → es **dato semi-personal** que requiere base legal (LFPDPPP 2025 art. 8 para consentimiento expreso o art. 10 para excepciones).

**Resolución propuesta:** corregir. La CCT es identificador público, pero combinada con nombre del docente y celular SÍ es dato personal bajo tratamiento. El aviso de privacidad E4 debe cubrirlo. Reformular §3.6.M2: "La CCT sola no es dato personal; combinada con el resto del perfil del docente, sí. Base legal: consentimiento expreso del docente al registrarse."

---

## 3. HUECOS ESTRUCTURALES (H1-H8)

### H1 — Criterios de cierre no cubren M2-M5 [MEDIA]

**Dónde:** §7 Criterios de cierre del MVP.

**Problema:** solo valida M1 (crear clase, planeación, bitácora, exportar PDF). No hay criterios para validar M2-M5 en uso real.

**Resolución propuesta:** añadir criterios por cada mejora:
- M2: "Una maestra con CCT en catálogo CCT-zona MEX-001 ve al menos 1 sugerencia contextual de su zona al crear proyecto;".
- M3: "El calendario de una maestra con 5 planeaciones muestra código de colores correctamente en las 4 categorías".
- M4: "Una maestra con 'luz intermitente' configurada NO ve bloques que requieren proyector en el banco principal".
- M5: "Una maestra entrega una planeación, comparte la URL por WhatsApp, y el director puede marcarla como recibida sin registrarse".

---

### H2 — Multi-tenant no documentado en stack [MEDIA]

**Dónde:** §6 Plataforma y Stack.

**Problema:** Supabase + multi-tenant por escuela no está explícito. RLS policies necesarias pero no mencionadas.

**Resolución propuesta:** añadir a §6: "Multi-tenant: cada escuela es un tenant lógico. RLS policies a nivel de Supabase para aislar datos entre escuelas. Director y docentes comparten datos dentro del mismo CCT."

---

### H3 — §4 entidades no reflejan nuevos campos de M5 [MEDIA]

**Dónde:** §4 vs §3.6.M5.

**Problema:** §4 menciona entidad `Entrega` con campos básicos, pero §3.6.M5 introduce `url_firmada_token`, `url_firmada_expira_at`, `estado`, `version`, `director_celular` que no aparecen en §4.

**Resolución propuesta:** actualizar §4 entidad Entrega con los nuevos campos. También añadir entidad `ComentarioDirectorPreRegistro` para comentarios pre-registro.

---

### H4 — Bitácora con foto no abordada en LFPDPPP [ALTA]

**Dónde:** §3 Flujo C paso 2: "Evidencia (foto opcional desde cámara)".

**Problema:** la foto puede incluir menores. Si la maestra sube una foto del trabajo de los niños sin consentimiento expreso de los padres, **viola la reforma Senado 26-dic-2025**. El SPEC §1 dice "sin alumnos" pero la foto ES del alumno.

**Resolución propuesta:** clarificar el flujo. Opciones: (a) la foto es solo del material/trabajo del niño, no del niño mismo; (b) la foto ofusca rostros automáticamente con IA local; (c) la foto NO está permitida en MVP, solo texto. Decisión recomendada: opción (a) — "fotos solo del trabajo, no del niño". Documentar en §3 Flujo C.

---

### H5 — T13 contradice persona 1 (M4) [ALTA — duplicada con I6]

Ya cubierta. Ver I6.

---

### H6 — Encuesta §1 no permite "ya no soy maestra" [BAJA]

**Dónde:** Encuesta §1 pregunta 1.1.

**Problema:** tía Lola actualmente SÍ es maestra, pero la pregunta no tiene escape para personas en transición o jubiladas (importante si tu discovery se extiende a más perfiles).

**Resolución propuesta:** añadir opción "[ ] Ya no doy clases, pero las di durante X años".

---

### H7 — Encuesta 6.3 vs 6.4: lógica condicional ausente [BAJA]

**Dónde:** Encuesta §6.

**Problema:** si la maestra respondió 6.3 "no, todo lo cubre la escuela", la pregunta 6.4 "¿la pagarías tú de tu bolsa?" suena absurda.

**Resolución propuesta:** añadir nota "(si respondiste 'no paga nada' arriba, esta pregunta es opcional)" o usar lógica condicional en formato entrevista (no rígida).

---

### H8 — No hay encuesta para director activo [MEDIA]

**Dónde:** Encuesta general.

**Problema:** cuando entrevistes a un director ACTIVO (no a tía Lola en su rol de ex-directora), necesitarás preguntas distintas. La encuesta §8 está redactada para que tía Lola recuerde su época como directora, no para directores en ejercicio.

**Resolución propuesta:** crear `Encuesta_Director_Activo.md` (análoga a la de Lola pero para alguien que es director HOY). Preguntas: tamaño actual de escuela, dolores actuales, herramientas digitales actuales, voluntad de pago desde su rol, comparativa con prácticas manuales.

---

## 4. SOLAPAMIENTOS CON ENTREGABLES DERIVADOS (S1-S3)

### S1 — E6 depende de §4 entidades, pero §4 está desfasado [ALTA]

**Problema:** si E6 (modelo de datos formal) se ejecuta hoy con base en §4 v0.8.1, queda obsoleto cuando se cierre I3, I5, H3.

**Resolución propuesta:** E6 se ejecuta DESPUÉS de cerrar Alta. Bloqueador para E6.

---

### S2 — E15 (CCT→zona) bloquea M2 sin plan B [MEDIA]

**Problema:** §3.6.M2 asume catálogo CCT→zona. Atlas está investigando en `ct-research-cct-zona`. Si termina sin encontrar dataset público, M2 queda sin banco contextual, solo caja blanca.

**Resolución propuesta:** documentar el Plan B en §3.6.M2: "Si no existe dataset público, M2 opera con: (a) la maestra selecciona manualmente su zona entre 4-5 opciones, (b) la app curará un banco de 50 CCTs founder-friendly manualmente en 1-2 semanas."

---

### S3 — E3 y E14 son el mismo entregable [MEDIA]

**Problema:** E3 "Catálogo NEM digitalizado (40-80h)" y E14 "Catalogación Autónoma Fase 2" son el MISMO trabajo.

**Resolución propuesta:** §8 fusiona E3+E14 en un único E3/E14. Borrar uno de los dos.

---

## 5. MEJORAS DE REDACCIÓN (R1-R3) [BAJA]

### R1 — §1 "Sin login social complejo" no es medible
Reformular a: "Sin OAuth social. Auth: email + contraseña, con OTP por email opcional."

### R2 — M3 botón "Planificar mes completo" requiere clarificación
Ver I7.

### R3 — §6 Stack no especifica versiones ni restricciones
Añadir: "Next.js 15.x, Supabase plan Free Tier (suficiente para MVP), Hosting Vercel plan Hobby."

---

## 6. CONFIRMACIONES DE CONSISTENCIA (lo que SÍ está bien)

- §3.6.M2 ↔ §3 Flujo A paso 3: CCT-zona → Empezar por tu realidad, bien encadenados.
- §3.6.M3 ↔ §3 Flujo B pasos 2-5: Calendario, código de colores, sugerencias, interruptor. Bien.
- §3.6.M4 ↔ §3 Flujo A: Posicionado al inicio.
- §3.6.M5 ↔ §3 Flujo D: Coherente en acciones (marcar/recibida), pero Flujo D no refleja aún la URL firmada. (Ver I3 versión Flujo D).
- Encuesta §8 D1-D20 ↔ lo que E2 necesita: bien diseñado.

---

## 7. PLAN DE RESOLUCIÓN

### Antes de entregar a Lola — bloqueante (Alta)

| # | Acción | Quién | Tiempo |
|---|---|---|---|
| I1 | Unificar cifras de tiempo objetivo | Founder | 15 min |
| I2 | Alinear §5 catálogo (30 → 150) | Founder | 10 min |
| I5 | Notificar bloqueador E4 M5 / decidir prioridad | Founder | 5 min |
| I6 | T13: 2 variantes mínimas en MVP | Founder | 30 min |
| I7 | Reescribir funcionalidad 4 M3 (esqueleto vs llenar) | Founder | 15 min |
| I10 | Corregir "CCT no es dato personal" | Founder | 10 min |
| H4 | Decidir política de fotos de bitácora | Founder | 20 min |

**Total bloqueante:** ~2 horas.

### Esta semana (Media)

| # | Acción | Quién | Tiempo |
|---|---|---|---|
| I3 | Actualizar §1 a terminología Proyecto | Founder | 15 min |
| I4 | Reformular mensaje WhatsApp M5 | Founder | 10 min |
| I8 | Definir canal de "avisos" director | Founder | 15 min |
| H1 | Añadir criterios de cierre M2-M5 | Founder | 30 min |
| H2 | Documentar multi-tenant en §6 | Founder | 10 min |
| H3 | Actualizar §4 entidad Entrega con campos M5 | Founder | 20 min |
| H8 | Crear Encuesta_Director_Activo.md | Founder | 45 min |
| S1 | Bloquear E6 hasta cerrar Alta | Founder | 5 min |
| S2 | Documentar Plan B M2 | Founder | 10 min |
| S3 | Fusionar E3+E14 en entregables | Founder | 5 min |

**Total esta semana:** ~3.5 horas fundador.

### Cuando se toque la sección (Baja)

R1, R2, R3 son limpieza que se hace cuando se edite cada sección por otra razón.

---

## 8. DECISIONES QUE NECESITAN AL FOUNDER

1. **¿Resolver bloqueantes (Alta) ahora mismo o esperar?**
2. **¿E4 (Compliance) salta prioridad por I5?**
3. **¿Política de fotos de bitácora (H4): trabajo sí / niños no?**
4. **¿T13 con 2 variantes o 1 variante?**
5. **Sobre el plan de MiniMax:** ¿hay otro agente corriendo este proyecto desde otro entorno? Si sí, ¿cómo se sincronizan las decisiones?

---

## 9. RELACIÓN CON OTROS ENTREGABLES

- Este documento es **checkpoint pre-Lola**. Tras resolver Alta, se actualiza el SPEC a v0.9 y se entrega a Lola para validación con encuesta.
- Los hallazgos alimentan el siguiente ciclo de discovery + implementación.

---

**Fin de ENT-001 Revisión Exhaustiva.**
