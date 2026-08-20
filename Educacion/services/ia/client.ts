/**
 * Cliente IA server-side para F1/F2/F3 (SPEC_TEC_07 §4.2).
 *
 * - Lee `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_PROVIDER`
 *   vía `process.env` (server-only). NUNCA hardcodea proveedor.
 * - Formato OpenAI-compatible: POST {AI_BASE_URL}/chat/completions.
 * - Si `AI_API_KEY` está vacía → `origen: 'fallback_vacio'` (no llama al proveedor).
 * - Si el proveedor cae / timeout / error de red → `origen: 'fallback_vacio'`
 *   (Decisión 5 ADR-20260819-02: degradación graceful, sin retries).
 * - NO loggea PII ni `AI_API_KEY`. Confía en que el caller aplicó
 *   `anonymizeRequest` antes de invocar (SPEC §7 regla 3).
 * - Inyectable: `createIaClient({ fetchImpl, ... })` permite tests sin tocar
 *   `fetch` global (paralelo al patrón `PdfRenderer` en `lib/pdf/generate.ts`).
 */
import type { IaChatMessage, IaChatOptions, IaChatResult } from './types';

const DEFAULT_TIMEOUT_MS = 8000;

export interface IaClientConfig {
  /** Override de `fetch` (test). Default: `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  /** Override de timer/AbortController (test). */
  setTimeoutImpl?: typeof setTimeout;
  clearTimeoutImpl?: typeof clearTimeout;
  AbortControllerImpl?: typeof AbortController;
}

function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isIaConfigured(): boolean {
  const key = process.env.AI_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

/**
 * Cliente IA principal. Función de alto nivel: dado un set de mensajes
 * (ya anonimizados), devuelve `{ text, origen, latencyMs }`.
 *
 * Política:
 *  - Sin `AI_API_KEY` → fallback_vacio inmediato.
 *  - Sin `AI_MODEL` → fallback_vacio (no adivinar modelo).
 *  - Sin `AI_BASE_URL` → fallback_vacio (no adivinar endpoint).
 *  - Timeout vía `AbortController` → fallback_vacio.
 *  - Cualquier error de red / HTTP no-2xx → fallback_vacio.
 *  - 0 retries (Decisión 2 + 5 ADR-20260819-02).
 */
export async function iaChat(
  messages: IaChatMessage[],
  opts: IaChatOptions = {},
  config: IaClientConfig = {},
): Promise<IaChatResult> {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const setTimeoutImpl = config.setTimeoutImpl ?? setTimeout;
  const clearTimeoutImpl = config.clearTimeoutImpl ?? clearTimeout;
  const AbortControllerImpl = config.AbortControllerImpl ?? globalThis.AbortController;

  const start = Date.now();

  if (!isIaConfigured()) {
    return { text: '', origen: 'fallback_vacio', latencyMs: 0 };
  }

  const baseUrl = (process.env.AI_BASE_URL ?? '').replace(/\/+$/, '');
  const model = process.env.AI_MODEL ?? '';
  const apiKey = process.env.AI_API_KEY ?? '';
  if (!baseUrl || !model) {
    return { text: '', origen: 'fallback_vacio', latencyMs: Date.now() - start };
  }

  const timeoutMs = opts.timeoutMs ?? readEnvNumber('AI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
  const temperature = opts.temperature ?? 0.4;
  const maxTokens = opts.maxTokens ?? 800;

  const controller = new AbortControllerImpl();
  const timer = setTimeoutImpl(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { text: '', origen: 'fallback_vacio', latencyMs: Date.now() - start };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? '';
    return {
      text: typeof text === 'string' ? text : '',
      origen: 'ia',
      latencyMs: Date.now() - start,
      provider: process.env.AI_PROVIDER,
      model,
    };
  } catch {
    return { text: '', origen: 'fallback_vacio', latencyMs: Date.now() - start };
  } finally {
    clearTimeoutImpl(timer);
  }
}

/**
 * Factory para tests: devuelve un objeto inyectable con la misma firma
 * que `iaChat`. Los tests pueden construir mocks de manera tipada.
 */
export interface IaClient {
  chat(
    messages: IaChatMessage[],
    opts?: IaChatOptions,
  ): Promise<IaChatResult>;
}

export function createIaClient(config: IaClientConfig = {}): IaClient {
  return {
    chat: (messages, opts) => iaChat(messages, opts, config),
  };
}