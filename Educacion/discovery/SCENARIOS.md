# Escenarios funcionales

## SCN-20260818-01 — Registro de alumnos condicionado por privacidad

**Dado** que una docente inicia su primer acceso, **cuando** rechaza el aviso de privacidad, **entonces** puede continuar con la plataforma pero no registrar nombres de alumnos.

## SCN-20260818-02 — Clonado a otro grupo

**Dado** que una docente tiene una planeación existente y más de un grupo, **cuando** la clona hacia un grupo destino, **entonces** obtiene la estructura, sesiones, bloques y recursos de la original, sin alumnos ni evaluaciones copiadas.

## SCN-20260818-03 — Entrega por WhatsApp

**Dado** que una docente entrega una planeación, **cuando** selecciona compartirla con dirección, **entonces** recibe una vista firmada y un mensaje de WhatsApp editable con el enlace para el director sin registro.

## SCN-20260820-04 — Entrevista inicial ligada al ciclo

**Dado** que una docente tiene un alumno dentro de un grupo y ciclo escolar, **cuando** abre su perfil y registra la entrevista inicial, **entonces** puede capturar por separado respuestas del niño y aportes de su familia, guardar la fecha de aplicación y editar la entrevista sin mezclarla con otro ciclo.

## SCN-20260820-05 — Entrevista protegida frente a IA

**Dado** que existe una entrevista inicial de un alumno, **cuando** la docente utiliza una función de IA para generar una propuesta de planeación, **entonces** la entrevista no se incluye en la información enviada al proveedor externo.

## SCN-20260820-06 — Contexto continuo por modalidad

**Dado** que la docente elige una modalidad y escribe el problema del contexto, **cuando** solicita apoyo de IA durante el wizard, **entonces** las propuestas consideran la modalidad activa y el contexto acumulado del borrador, y la docente puede aceptar por separado el problema estructurado, el propósito y los ajustes razonables.

## SCN-20260820-07 — Regeneración tras cambio de modalidad

**Dado** que existen propuestas IA aceptadas o pendientes, **cuando** la docente cambia la modalidad o el problema del contexto, **entonces** el sistema marca las propuestas dependientes como desactualizadas y ofrece regenerarlas sin borrar silenciosamente los textos aceptados.

## SCN-20260820-08 — Perfil con entrevistas relacionadas

**Dado** que una docente abre el perfil de un alumno, **cuando** entra a `Entrevistas`, **entonces** encuentra dos secciones separadas: `Entrevista del niño` y `Entrevista familiar`, ambas ligadas al mismo grupo y ciclo, sin mezclar sus respuestas.
