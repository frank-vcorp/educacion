/**
 * Mock del proveedor IA OpenAI-compatible (helper de tests).
 * Sustituye al cliente IA real con respuestas deterministas, sin tocar
 * `fetch` global. Compatible con cualquier `AI_PROVIDER` (el nombre es
 * histórico).
 *
 * Uso:
 *   import { mockIaClient, setNextResponse } from '../helpers/mock-minimax';
 *   const client = mockIaClient();
 *   setNextResponse({ text: 'variante rural', origen: 'ia' });
 *   const r = await client.chat([...]);
 */
import type { IaClient, IaChatMessage, IaChatOptions, IaChatResult } from '@/services/ia/types';

interface MockState {
  responses: IaChatResult[];
  callCount: number;
  /** Si está definido, la siguiente llamada arroja este error. */
  nextError?: Error;
}

const state: MockState = {
  responses: [],
  callCount: 0,
  nextError: undefined,
};

export function __resetMockIa(): void {
  state.responses = [];
  state.callCount = 0;
  state.nextError = undefined;
}

export function setNextResponse(r: Partial<IaChatResult>): void {
  state.responses.push({
    text: r.text ?? '',
    origen: r.origen ?? 'ia',
    latencyMs: r.latencyMs ?? 1,
    provider: r.provider,
    model: r.model,
  });
}

export function setNextError(err: Error): void {
  state.nextError = err;
}

export function getIaCallCount(): number {
  return state.callCount;
}

export function mockIaClient(): IaClient {
  return {
    async chat(_messages: IaChatMessage[], _opts?: IaChatOptions): Promise<IaChatResult> {
      state.callCount += 1;
      if (state.nextError) {
        const e = state.nextError;
        state.nextError = undefined;
        throw e;
      }
      const next = state.responses.shift();
      return (
        next ?? {
          text: '',
          origen: 'fallback_vacio',
          latencyMs: 0,
        }
      );
    },
  };
}

/**
 * Configura el cliente IA global del módulo `services/ia/client` para
 * devolver respuestas pre-cargadas. Útil cuando el route handler crea
 * el cliente internamente en lugar de inyectarlo.
 *
 * Estrategia: stub `process.env.AI_API_KEY` a vacío para forzar
 * `fallback_vacio`, o mantenerlo y dejar pasar al `fetch` mockeado.
 *
 * Este helper NO mockea el módulo cliente; lo hace `mockIaClient()` arriba.
 * Para mockear el fetch real de producción:
 */
export function stubGlobalFetch(handler: typeof fetch): void {
  const original = globalThis.fetch;
  (globalThis as { fetch: typeof fetch }).fetch = handler;
  return (() => {
    (globalThis as { fetch: typeof fetch }).fetch = original;
  }) as unknown as void;
}