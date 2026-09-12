/**
 * Limpia respuestas de IA para mostrar solo la sugerencia útil a la docente.
 * El modelo a veces antepone razonamiento o meta-comentarios pese al prompt.
 */

const PREAMBLE_LINE =
  /^(?:claro|por supuesto|entendido|perfecto|aqu[ií] (?:est[aá]|tienes|va)|siguiente|texto (?:adaptado|propuesto|resultante)|sugerencia|respuesta)\b/i;

const REASONING_BLOCK =
  /\n\s*(?:razonamiento|reasoning|explicaci[oó]n|nota(?:\s+del\s+asistente)?|an[aá]lisis)\s*:\s*[\s\S]*/i;

/** Bloques XML de razonamiento interno del modelo. */
const THINKING_TAG_BLOCKS = [
  /<(?:redacted_thinking|thinking)[^>]*>[\s\S]*?<\/(?:redacted_thinking|thinking)>\s*/gi,
  /<redacted_thinking[^>]*>[\s\S]*?<\/thinking>\s*/gi,
] as const;

/** Quita envolturas markdown y preámbulos; conserva el cuerpo de la sugerencia. */
export function sanitizeIaProse(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();
  if (text.length === 0) return '';

  for (const pattern of THINKING_TAG_BLOCKS) {
    text = text.replace(pattern, '').trim();
  }

  const fence = text.match(/```(?:json|text|markdown)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  text = text.replace(REASONING_BLOCK, '').trim();
  text = text.replace(/\n\s*---+\s*\n[\s\S]*$/, '').trim();

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  while (lines.length > 1) {
    const first = lines[0];
    if (!first || first.length > 140 || !PREAMBLE_LINE.test(first)) break;
    lines.shift();
  }

  if (lines.length === 1) {
    const only = lines[0];
    if (!only) return '';
    const single = only.match(/^(?:texto|sugerencia|propuesta|resultado)\s*:\s*(.+)$/i);
    if (single?.[1]?.trim()) return single[1].trim();
  }

  if (lines.length > 1) {
    const labeled = lines.findIndex((l) =>
      /^(?:texto|sugerencia|propuesta|resultado)\s*:/i.test(l),
    );
    if (labeled >= 0) {
      const after = lines.slice(labeled).join('\n').replace(/^[^:]+:\s*/i, '').trim();
      if (after.length > 0) return after;
    }
  }

  return lines.join('\n').trim();
}
