/**
 * Limpia respuestas de IA para mostrar solo la sugerencia útil a la docente.
 * El modelo a veces antepone razonamiento o meta-comentarios pese al prompt.
 */

const PREAMBLE_LINE =
  /^(?:claro|por supuesto|entendido|perfecto|aqu[ií] (?:est[aá]|tienes|va)|siguiente|texto (?:adaptado|propuesto|resultante)|sugerencia|respuesta)\b/i;

const REASONING_BLOCK =
  /\n\s*(?:razonamiento|reasoning|explicaci[oó]n|nota(?:\s+del\s+asistente)?|an[aá]lisis)\s*:\s*[\s\S]*/i;

/** Inicio típico de la prosa pedagógica en español (respuesta real). */
const SPANISH_ANSWER_START =
  /(?:^|\n\s*)(La docente|El docente|Los niños|Las niñas|La maestra|El maestro|El grupo|En el|Durante la|Se reúne|Se coloca|Se invita)/;

const ENGLISH_META_LINE =
  /^(The user |I need to|Let me |For rural|Draft:|That's about|Maximum length|Respond ONLY|Count characters|Original text|Adaptation should)/i;

const THINK_OPEN = '<' + 'think' + '>';
const THINK_CLOSE = '</' + 'think' + '>';

const THINKING_CLOSE_TAGS = ['</think>', '</thinking>', THINK_CLOSE] as const;

const THINKING_TAG_BLOCKS = [
  /<(?:redacted_thinking|thinking|think)[^>]*>[\s\S]*?<\/(?:redacted_thinking|thinking|think)>\s*/gi,
  /<redacted_thinking[^>]*>[\s\S]*?<\/thinking>\s*/gi,
  new RegExp(`${THINK_OPEN}[\\s\\S]*?${THINK_CLOSE}\\s*`, 'gi'),
] as const;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Toma el segmento después del último cierre de bloque de razonamiento. */
function extractAfterThinkingClose(text: string): string {
  let lastIdx = -1;
  let closeLen = 0;
  for (const close of THINKING_CLOSE_TAGS) {
    const idx = text.lastIndexOf(close);
    if (idx > lastIdx) {
      lastIdx = idx;
      closeLen = close.length;
    }
  }
  if (lastIdx >= 0) {
    return text.slice(lastIdx + closeLen).trim();
  }
  return text;
}

/** Si hay apertura sin cierre, intenta encontrar dónde empieza la prosa en español. */
function extractSpanishAnswerAfterOpenTag(text: string): string {
  const open = text.match(
    new RegExp(`<(?:redacted_thinking|thinking|think)[^>]*>|${THINK_OPEN}\\s*`, 'i'),
  );
  if (!open || open.index === undefined) return text;

  const afterOpen = text.slice(open.index + open[0].length);
  const match = afterOpen.match(SPANISH_ANSWER_START);
  if (match?.index !== undefined) {
    return afterOpen.slice(match.index).trim();
  }
  return text;
}

function stripEnglishMetaLines(text: string): string {
  const lines = text.split('\n');
  while (lines.length > 0) {
    const line = lines[0]?.trim() ?? '';
    if (!line) {
      lines.shift();
      continue;
    }
    if (
      ENGLISH_META_LINE.test(line) ||
      (/^[-*]\s/.test(line) && /[A-Za-z]{4,}/.test(line) && !/[áéíóúñüÁÉÍÓÚÑ]/i.test(line))
    ) {
      lines.shift();
      continue;
    }
    break;
  }
  return lines.join('\n').trim();
}

/** Quita envolturas markdown y preámbulos; conserva el cuerpo de la sugerencia. */
export function sanitizeIaProse(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = decodeHtmlEntities(raw.trim());
  if (text.length === 0) return '';

  text = extractAfterThinkingClose(text);

  for (const pattern of THINKING_TAG_BLOCKS) {
    text = text.replace(pattern, '').trim();
  }

  text = extractSpanishAnswerAfterOpenTag(text);
  text = stripEnglishMetaLines(text);

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
