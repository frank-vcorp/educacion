# Hallazgos funcionales

## FND-20260818-01 — Baseline funcional desactualizado frente a decisiones confirmadas

- **Estado:** resolved
- **Severidad:** P0
- **Evidencia:** `SPEC_MVP_01_Modulo_Docente.md` v0.13 aún excluía alumnos y presentaba el stack como no decidido, pese a `ENT-003 D1` y `E22 D-FIN-2, D-FIN-11..19`.
- **Impacto:** podía inducir una implementación o revisión con alcance falso.
- **Resolución:** baseline actualizado a v0.14; decisiones confirmadas integradas y trazadas.
- **Artefactos afectados:** `SPEC_MVP_01_Modulo_Docente.md`, `specs/SPEC_TEC_01..06`.

## FND-20260818-02 — Clonado confirmado sin evidencia de implementación

- **Estado:** resolved
- **Severidad:** P2
- **Evidencia:** E22 D-FIN-17 confirma duplicar/clonar como parte del MVP; auditoría técnica `ARCH-20260818-01` reporta SPEC y pruebas planeadas, pero implementación ausente.
- **Impacto:** la cadena funcional→técnica quedó completa y la capacidad se verificó de forma independiente.
- **Resolución:** IMPL-20260819-01 implementó clonado; IMPL-20260819-02/03 cerraron atomicidad y rutas de error. QA-20260819-03 emitió PASS.
- **Artefactos afectados:** `specs/SPEC_TEC_02_Modelo_Datos.md`, `specs/SPEC_TEC_03_API_Contract.md`, `specs/QA-20260819-03.md`.

## FND-20260818-03 — Clasificación de recursos por habilidad sin alcance confirmado

- **Estado:** confirmed
- **Severidad:** P2
- **Evidencia:** E21 describe `recurso_skill`; DM-03 técnico propone diferir su algoritmo a Fase 2. No hay confirmación funcional de Frank que sustituya esa propuesta.
- **Impacto:** no debe implementarse el algoritmo ni declararse fuera del MVP hasta resolver el alcance.
- **Artefactos afectados:** `fuentes/E21_CATALOGO_RECURSOS_AULA.md`, `specs/SPEC_TEC_02_Modelo_Datos.md`.

## FND-20260818-04 — PDF binario descargable aún no materializado

- **Estado:** resolved
- **Severidad:** P2
- **Evidencia:** D-FIN-5 confirma un PDF visualizable, descargable y compartible; el endpoint actual entrega HTML imprimible, no archivo PDF binario. INTEGRA lo dejó trazado en `specs/SPEC_TEC_03_API_Contract.md`, `specs/SPEC_TEC_06_Plan_Testing.md` y `specs/AUDITORIA_INTEGRA_ADDENDUM_2026-08-18.md`.
- **Impacto:** el requisito funcional ya está implementado localmente y verificado con PDF binario, hash real y manejo seguro de fallo.
- **Resolución:** IMPL-20260819-01 implementó el binario; IMPL-20260819-02/03 cerraron lifecycle y determinismo de contenido. QA-20260819-03 emitió PASS.
- **Artefactos afectados:** D-FIN-5, `SPEC_TEC_03_API_Contract.md`, `SPEC_TEC_06_Plan_Testing.md`, `specs/QA-20260819-03.md`.

## FND-20260819-05 — Capacidades IA F1/F2/F3 especificadas sin evidencia de implementación

- **Estado:** resolved
- **Severidad:** P1
- **Evidencia:** el baseline y `SPEC_TEC_03_API_Contract.md` describen F1 (variantes de bloque), F2 (ayuda de redacción) y F3 (pulido de PDF), pero el repositorio solo contiene el endpoint F-IA1 de recursos de aula. Ese endpoint usa coincidencia determinista de palabras clave y declara explícitamente que no llama a MiniMax. No existen rutas ni servicios para F1/F2/F3; `AI_API_KEY` permanece vacía en el ejemplo de configuración.
- **Impacto:** antes de IMPL-20260819-04 la capa IA no estaba disponible; el uso real requería además UI, RLS y configuración operativa.
- **Resolución:** F1/F2/F3 implementadas en IMPL-20260819-04/05 y UI habilitada en IMPL-20260820-01. QA-20260819-05 y QA-20260820-01 emitieron `PASS_WITH_WARNINGS`; migraciones 0018–0021 aplicadas en Supabase y producción desplegada. La prueba autenticada completa con Tía Lola queda pendiente de ejecución humana.
- **Artefactos afectados:** `SPEC_MVP_01_Modulo_Docente.md` §3.7, `specs/SPEC_TEC_03_API_Contract.md`, `specs/SPEC_TEC_07_Capa_IA.md`, `specs/SPEC_TEC_08_UI_IA_F1F2F3.md`.

## FND-20260820-06 — Entrevista inicial individual requiere ampliación del perfil del alumno

- **Estado:** confirmed
- **Severidad:** P1
- **Evidencia:** Tía Lola solicita registrar al inicio del ciclo una entrevista breve por cada niño y, potencialmente, otra con sus madres/padres. La plantilla compartida incluye nombre, edad, hermanos y nombres, convivencia en casa, nombres de padre/madre, mascota, preferencias de color/comida/frutas/juego/caricatura, emociones, observaciones, nombre del alumno, grado, grupo y fecha de aplicación.
- **Impacto:** el perfil actual del alumno no cubre contexto familiar, intereses, emociones ni fecha/versionado de entrevista. Son datos de menores y de terceros; no deben agregarse como campos libres sin definir finalidad, consentimiento, visibilidad, retención y límites de uso.
- **Decisión:** incorporar una sección separada `Entrevista inicial` dentro del perfil del alumno, ligada al grupo y ciclo escolar, con fecha de aplicación y estado; separar entrevista del niño y aportes de familia, mantenerla editable y evitar que sus datos se envíen a IA por defecto. Referencia: `DEC-20260820-01`.
- **Alcance confirmado:** la entrevista del niño debe reproducir literalmente la plantilla visual enviada por Frank; no se permite alterar sus preguntas. La entrevista familiar queda fuera de este contrato hasta nuevo discovery.
- **Privacidad resuelta:** aviso existente, solo docente, retención mientras exista el ciclo con archivo posterior y edición en sitio. Referencia: `DEC-20260820-02`.

## FND-20260820-07 — IA no está conectada al contexto inicial del wizard

- **Estado:** resolved
- **Severidad:** P1
- **Evidencia:** la pantalla `Nueva planeación` muestra `ESTÁTICO · SIN IA`; `sugerencias-ia.tsx` usa `getSugerencias(nivel)` con textos hardcodeados y no llama a MiniMax. Las rutas F1/F2/F3 existentes están en la vista de una planeación ya creada y no están conectadas al paso inicial `Problema del contexto`.
- **Necesidad confirmada por Frank:** la docente escribe el problema del contexto y la IA debe devolver propuestas mejor estructuradas para ese problema, además de una propuesta de propósito y ajustes razonables de inclusión.
- **Impacto:** la integración actual no entrega el valor principal esperado en el momento más importante del flujo; la etiqueta estática comunica correctamente la implementación actual, pero no satisface la expectativa de IA contextual.
- **Resolución funcional:** la IA deberá considerar modalidad y contexto acumulado del borrador; propondrá problema estructurado, propósito y ajustes razonables, que se aplicarán con aceptación explícita por campo. Referencia: `DEC-20260820-03`.
- **Artefactos afectados:** wizard de planeación, F1/F2/F3, `SPEC_MVP_01_Modulo_Docente.md` §3.7, `SPEC_TEC_07_Capa_IA.md`, `SPEC_TEC_08_UI_IA_F1F2F3.md`.

## FND-20260820-08 — Entrevista familiar recibida como fuente de producto

- **Estado:** confirmed
- **Severidad:** P1
- **Evidencia:** Frank entregó `docx_extract/NUEVA ENTREVISTA.pdf`, titulado “Cuestionario a padres de familia”. Incluye datos del alumno, fecha de nacimiento, información de mamá/papá (nombre, teléfono, edad, estudios, ocupación y horario), situación legal y convivencia, patria potestad, hábitos familiares, tecnología, televisión, colaboración en casa, actividades extraescolares, límites, dificultades de aprendizaje, expectativas del ciclo, expectativas de la maestra y compromiso familiar, además de firmas.
- **Impacto:** amplía el alcance de la entrevista infantil hacia datos personales de familiares y potencialmente datos sensibles del menor. No debe mezclarse con `entrevista_inicial_alumno` ni enviarse a IA sin contrato específico de finalidad, consentimiento, visibilidad, retención y control de acceso.
- **Fuente:** `docx_extract/NUEVA ENTREVISTA.pdf` y texto parseado recibido el 2026-08-20.
- **Resolución parcial:** Frank confirmó que debe vivir junto a la entrevista del niño dentro de `Perfil del alumno → Entrevistas`, como sección separada y asociada al mismo alumno/grupo/ciclo. La fuente se conserva literal. Su contrato de privacidad, permisos y retención sigue pendiente; no se implementa captura todavía.

## FND-20260820-09 — La entrevista infantil implementada no contiene el documento completo

- **Estado:** confirmed
- **Severidad:** P1
- **Evidencia:** la implementación actual usa la primera versión de 21 preguntas; Frank entregó `docx_extract/ENTREVISTA INICIAL.docx.pdf`, de tres páginas, que agrega preguntas, dibujos de ambiente familiar/escuela y un directorio de emergencia.
- **Impacto:** la entrevista desplegada no representa el instrumento que Tía Lola usa realmente; faltan preguntas sobre cuentos, televisión/dispositivos, escuela, amigos, maestra, felicidad, dibujos y contactos de emergencia. También existen preguntas repetidas en el documento y deben conservarse.
- **Resolución funcional:** `DEC-20260820-05` supersede el cuestionario anterior y exige actualizarlo literalmente. Requiere nueva SPEC/implementación y QA; la entrevista familiar permanece separada.

## FND-20260820-10 — Variables IA de producción están vacías

- **Estado:** confirmed
- **Severidad:** P1
- **Evidencia:** la pantalla F0 responde `origen: FALLBACK_VACIO`. `vercel env ls production` muestra las variables `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` y `AI_TIMEOUT_MS`, pero `vercel env pull --environment production` devuelve valores vacíos (`""`) para ellas. El cliente IA está diseñado para degradar exactamente a `fallback_vacio` cuando falta API key, base URL o modelo.
- **Impacto:** la integración F0 está desplegada, pero no puede llamar a MiniMax; la docente recibe campos vacíos y el aviso de fallback.
- **Resolución pendiente:** Frank debe cargar valores no vacíos en el entorno Production de Vercel y redeployar. No se solicitan ni se registran secretos en chat.

## FND-20260820-11 — Exportaciones objeto en módulos `use server` provocaban 500

- **Estado:** resolved
- **Severidad:** P1
- **Evidencia:** Vercel reportó `A "use server" file can only export async functions, found object` en `/alumnos`; el patrón existía en `entrevista-actions.ts` y `update-actions.ts`.
- **Resolución:** FIX-20260820-01/02 eliminó exportaciones runtime no válidas, añadió regresiones y se desplegó commit `8cb1767`. Build, suite y reproducción runtime post-fix pasaron.
- **Artefactos afectados:** `E22_CIERRE_DISCOVERY.md`, `SPEC_MVP_01_Modulo_Docente.md`, perfil de alumno, aviso de privacidad y escenarios de onboarding/seguimiento.
