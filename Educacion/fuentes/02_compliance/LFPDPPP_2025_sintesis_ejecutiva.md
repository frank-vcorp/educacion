# LFPDPPP 2025 — Síntesis Ejecutiva (vigente)

> **Origen del dato:** Hogan Lovells Cadwalader (hlc.com), publicación del 25 de marzo de 2025:
> <https://www.hlc.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies>
>
> **Fecha de captura local:** 2026-08-13
>
> **Nota:** No se identificó enlace directo al DOF en el alcance de la descarga. Esta síntesis ejecutiva
> NO reemplaza la lectura del texto oficial en el DOF si se requiere precisión jurídica. Se incluye también
> el documento PDF histórico de la ley 2010 (`LFPDPPP_2010_refer.pdf`) para comparación.

---

## 1. Identificación de la nueva ley

- **Nombre oficial:** Ley Federal de Protección de Datos Personales en Posesión de los Particulares (**LFPDPPP 2025**).
- **Publicación en DOF:** 20 de marzo de 2025.
- **Entrada en vigor:** 21 de marzo de 2025.
- **Efecto:** Abroga la ley homónima publicada en 2010.
- **Autoridad resultante:** Secretaría Anticorrupción y Buen Gobierno, en sustitución del INAI (extinto).
- **Trámites pendientes:** Los procedimientos iniciados ante el INAI antes de la entrada en vigor se
  sustanciarán conforme a la normativa vigente al momento de su inicio, pero ahora atendidos por la
  Secretaría Anticorrupción y Buen Gobierno.

## 2. Cambios clave (resumen operativo)

1. **Definición de responsable ampliada** — incluye expresamente a los **encargados** del tratamiento,
   no solo a quien toma decisiones. Cualquier persona física/moral que trate datos personales queda
   alcanzada.
2. **Aviso de privacidad integral** — debe detallar **qué datos** se tratan (incluidos los sensibles),
   distinguir finalidades **con consentimiento vs. sin consentimiento**; se elimina la obligación de
   listar transferencias (aunque se recomienda mantenerlo por alineamiento con RGPD UE).
3. **Aviso de privacidad simplificado** — debe incluir identidad/domicilio del responsable, datos
   tratados (con mención de sensibles), finalidades con/sin consentimiento, medios para limitar uso
   o divulgación y referencia al aviso integral.
4. **Fuente de acceso público redefinida** — solo lo será aquella base de datos consultable públicamente
   sin impedimento normativo; se excluye información obtenida ilícitamente.
5. **Excepciones al consentimiento ampliadas** — basta cualquier **disposición jurídica válida**
   (legal, reglamentaria o administrativa) para tratar datos sin consentimiento del titular.
6. **Plazo de conservación formalizado** — los datos deben suprimirse **solo después de cumplido el
   plazo y previo bloqueo**.
7. **Confidencialidad reforzada** — obligación de controles para empleados, encargados y terceros,
   que subsiste aun terminada la relación jurídica.
8. **Derecho de acceso ampliado** — el titular debe conocer también condiciones y generalidades del
   tratamiento, disponibles en el aviso de privacidad.
9. **Derecho de rectificación ampliado** — incluye datos **no actualizados**, además de inexactos o
   incompletos.
10. **Oposición reforzada** — nueva causa: tratamiento automatizado con efectos jurídicos adversos o
    que afecte significativamente derechos del titular (salvo obligación legal).
11. **Requisitos formales ARCO** — indicar el derecho específico y distinguir identidad del titular vs.
    representación legal de tercero.
12. **Procedimientos ARCO con mayor detalle** — lineamientos formales de presentación, atención y
    validación, con certeza jurídica reforzada.

## 3. Implicaciones operativas para la plataforma NEM

Aplica a cualquier módulo que trate datos de **docentes, alumnos, tutores o comunidad escolar**:

- Diseñar/revisar el **aviso de privacidad** de la plataforma distinguiendo finalidades con/sin
  consentimiento y declarando si existen tratamientos automatizados que produzcan efectos jurídicos
  o significativos.
- Si el módulo de IA hace **scoring, evaluación o agrupación** que afecta decisiones sobre el docente
  o alumno, evaluar la obligación de:
  - Permitir **revisión humana**.
  - Explicar la **lógica básica** del tratamiento.
  - Implementar **plazo de conservación + supresión tras bloqueo**.
- Actualizar contratos con proveedores (encargados) que traten datos personales en nombre de la
  plataforma (LLM, almacenamiento, analytics).
- Considerar el registro de **tratamientos automatizados de alto impacto** ante la autoridad
  competente, si se materializa la tendencia regulatoria anunciada para IA en México
  (ver `LFPDPPP_2025_sintesis_ejecutiva.md` y reportes secundarios de línea `regulacion-ia-mexico-ley-2026`).

## 4. Riesgos abiertos pendientes

- **Texto oficial DOF:** No capturado en este lote (no se localizó URL canónica en el alcance).
  Frank: si se requiere precisión jurídica, descargar la publicación del 20/03/2025 desde el DOF.
- **Criterios secundarios:** La nota de Hogan Lovells no incluye el articulado; la numeración exacta
  de artículos y la vigencia de reglamentos secundarios (Lineamientos de Aviso de Privacidad,
  Parámetros de Transferencias, etc.) debe consultarse en el DOF.

## 5. Contacto académico de la fuente

Autores referenciados en la publicación HLC:
- Guillermo Larrea — Socio, Hogan Lovells Cadwalader, Ciudad de México.
- Federico de Noriega Olea — Socio.
- Ana Rumualdo — Asociada.
- Alexa Victoria Villagómez Chávez — Asociada Junior.

## 6. Fuentes citadas en este documento

- <https://www.hlc.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies>
- <https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf> (versión histórica 2010, archivada localmente).
