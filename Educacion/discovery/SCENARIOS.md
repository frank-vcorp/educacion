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
