/**
 * Texto del aviso de privacidad LFPDPPP 2025.
 * SPEC_TEC_04 D-FIN-15. Es el documento que firma el docente.
 * Adaptado para educación preescolar (LFPDPPP Arts. 8, 17, 26, 27).
 */
export const AVISO_PRIVACIDAD_VERSION = 'v1.0-2026-08-16';

export const AVISO_PRIVACIDAD_TEXTO = `
# Aviso de Privacidad — Plataforma NEM

Última actualización: 16 de agosto de 2026.

## 1. Responsable del tratamiento de datos personales

**NEM Plataforma S.A. de C.V.** (en lo sucesivo "NEM"), con domicilio en Ciudad de México, México, es responsable del tratamiento de los datos personales que se recaban a través de la Plataforma NEM, en cumplimiento de la **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)** y su Reglamento.

## 2. Datos personales que recabamos

Para prestar el servicio de planeación didáctica, recabamos las siguientes categorías de datos:

a) **Datos del docente (titular):** nombre completo, correo electrónico institucional, CCT de la escuela, nivel educativo, ciclo escolar, fotografía opcional.

b) **Datos de los alumnos (terceros):** nombre completo, grado, ciclo escolar. **NO recabamos** datos sensibles como: estado de salud, fotografía del alumno, origen étnico detallado, neurotipo, situación familiar, ni datos biométricos.

c) **Datos de operación de la plataforma:** registros de auditoría inmutables (timestamp, endpoint, IP, user-agent), bitácora post-clase (participación grupal, dificultades, evidencia del trabajo).

## 3. Finalidades del tratamiento

### Finalidades primarias (necesarias para el servicio)

1. Identificar al docente y verificar su perfil institucional.
2. Permitir la creación, edición y exportación de planeaciones didácticas.
3. Facilitar la entrega de planeaciones al director de la escuela mediante URL firmada.
4. Generar la rúbrica de evaluación por alumno (niveles de logro).
5. Mantener la bitácora post-clase y el inventario de recursos del aula.

### Finalidades secundarias (no necesarias para el servicio)

6. Analítica de uso agregada y anónima para mejorar la plataforma.
7. Soporte técnico y comunicación de cambios del servicio.

**Si no desea que sus datos sean tratados para las finalidades secundarias, puede oponerse escribiéndonos a privacidad@nem-plataforma.mx dentro de los 5 días hábiles posteriores a la aceptación de este aviso.**

## 4. Consentimiento del titular para datos de terceros

Para registrar nombres de alumnos, **el docente declara que cuenta con consentimiento institucional** de la dirección de la escuela y, cuando aplique, de los padres de familia, conforme al Art. 8 de la LFPDPPP. La Plataforma NEM no recaba datos sensibles de menores de edad.

## 5. Transferencias de datos

Sus datos personales NO son transferidos a terceros sin su consentimiento, salvo en los casos previstos por el Art. 37 de la LFPDPPP (cumplimiento de autoridad, fusión, etc.).

**Los datos de operación NO se comparten con:**
- Proveedores de inteligencia artificial con fines de entrenamiento.
- Personas físicas o morales con fines de marketing.

## 6. Medidas de seguridad

NEM implementa las siguientes medidas:

- **Cifrado en tránsito:** TLS 1.3 para todas las comunicaciones.
- **Cifrado en reposo:** Row-Level Security (RLS) por CCT en PostgreSQL/Supabase.
- **Aislamiento multi-tenant:** cada docente solo ve los datos de su CCT.
- **Auditoría:** log inmutable de mutaciones (audit_log) con retención de 12 meses.
- **Sin almacenamiento de contenido CONALITEG:** la plataforma solo enlaza a libros oficiales.

## 7. Derechos ARCO

Usted tiene derecho a conocer qué datos personales tenemos, para qué los utilizamos y las condiciones del uso que les damos (**Acceso**). Asimismo, es su derecho solicitar la corrección de su información personal (**Rectificación**), que la eliminemos de nuestros registros (**Cancelación**) u oponerse al uso de sus datos personales para fines específicos (**Oposición**).

Para ejercer cualquiera de estos derechos, envíe una solicitud a **privacidad@nem-plataforma.mx** con:
- Nombre del titular y correo de contacto.
- Documento que acredite identidad (INE/IFE, pasaporte).
- Descripción clara y precisa del derecho a ejercer.

**Tiempo de respuesta:** 20 días hábiles conforme al Art. 32 LFPDPPP.

## 8. Cambios al aviso de privacidad

Cualquier modificación al presente aviso se notificará al docente con al menos 15 días naturales de anticipación, mediante correo electrónico y dentro de la plataforma.

## 9. Aceptación

Al marcar la casilla de aceptación y hacer clic en "Aceptar", el docente declara:

a) Que ha leído, comprende y acepta los términos del presente Aviso de Privacidad.
b) Que **cuenta con consentimiento institucional** para registrar los datos de los alumnos a su cargo.
c) Que la información que registre en la plataforma es veraz y se utilizará exclusivamente con fines pedagógicos.

**Versión del aviso:** ${AVISO_PRIVACIDAD_VERSION}
`;

export const AVISO_CONSENTIMIENTO_CHECKBOX =
  'Confirmo que tengo consentimiento institucional para registrar datos de los alumnos a mi cargo';
