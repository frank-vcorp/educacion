import { describe, it, expect, beforeEach } from 'vitest';
import {
  iaChat,
  createIaClient,
  type IaClientConfig,
} from '@/services/ia/client';

describe('services/ia/client — fetch nativo OpenAI-compatible', () => {
  beforeEach(() => {
    process.env.AI_API_KEY = 'test-ai-key';
    process.env.AI_BASE_URL = 'https://api.example.test/v1';
    process.env.AI_MODEL = 'test-model';
    process.env.AI_PROVIDER = 'test-provider';
  });

  function makeFetchOk(body: unknown): typeof fetch {
    return (async (_url: Request | string | URL, init?: RequestInit) => {
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      // Note: signal/init are intentionally unused in this mock signature to
      // match the loose typing we expose.
      void init;
    }) as unknown as typeof fetch;
  }

  it('envía Authorization Bearer y {model, messages, stream:false}', async () => {
    let captured: { url: string; headers: HeadersInit; body: unknown } | null = null;
    const fetchImpl: typeof fetch = async (url, init) => {
      captured = {
        url: String(url),
        headers: (init?.headers ?? {}) as Headers,
        body: JSON.parse(String(init?.body ?? '{}')),
      };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'hola rural' } }] }),
        { status: 200 },
      );
    };
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat(
      [
        { role: 'system', content: 'S' },
        { role: 'user', content: 'U' },
      ],
      {},
      cfg,
    );
    expect(r.origen).toBe('ia');
    expect(r.text).toBe('hola rural');
    expect(captured!.url).toBe('https://api.example.test/v1/chat/completions');
    expect((captured!.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-ai-key',
    );
    expect(captured!.body).toMatchObject({
      model: 'test-model',
      stream: false,
    });
    expect((captured!.body as { messages: unknown[] }).messages).toHaveLength(2);
  });

  it('sin AI_API_KEY → fallback_vacio sin llamar al proveedor', async () => {
    process.env.AI_API_KEY = '';
    const fetchImpl = (() => {
      throw new Error('fetch no debió llamarse');
    }) as unknown as typeof fetch;
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat(
      [{ role: 'user', content: 'x' }],
      {},
      cfg,
    );
    expect(r.origen).toBe('fallback_vacio');
    expect(r.text).toBe('');
  });

  it('HTTP 5xx del proveedor → fallback_vacio', async () => {
    const fetchImpl = (async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat([{ role: 'user', content: 'x' }], {}, cfg);
    expect(r.origen).toBe('fallback_vacio');
  });

  it('HTTP 401 del proveedor → fallback_vacio (no 5xx)', async () => {
    const fetchImpl = (async () => new Response('unauth', { status: 401 })) as unknown as typeof fetch;
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat([{ role: 'user', content: 'x' }], {}, cfg);
    expect(r.origen).toBe('fallback_vacio');
  });

  it('fetch que rechaza (red caída) → fallback_vacio', async () => {
    const fetchImpl = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat([{ role: 'user', content: 'x' }], {}, cfg);
    expect(r.origen).toBe('fallback_vacio');
  });

  it('timeout (AbortController) → fallback_vacio', async () => {
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        // Si el signal ya está abortado al invocarse, rechaza de inmediato.
        if (init?.signal?.aborted) {
          reject(new Error('aborted'));
          return;
        }
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }) as unknown as typeof fetch;
    const cfg: IaClientConfig = {
      fetchImpl,
      setTimeoutImpl: ((cb: () => void, _ms?: number) => {
        cb();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as unknown as typeof setTimeout,
    };
    const r = await iaChat(
      [{ role: 'user', content: 'x' }],
      { timeoutMs: 1 },
      cfg,
    );
    expect(r.origen).toBe('fallback_vacio');
  }, 1000);

  it('respuesta sin choices[0].message.content → text vacío pero origen=ia', async () => {
    const fetchImpl = makeFetchOk({ choices: [{}] });
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat([{ role: 'user', content: 'x' }], {}, cfg);
    expect(r.origen).toBe('ia');
    expect(r.text).toBe('');
  });

  it('sin AI_BASE_URL → fallback_vacio (no adivina endpoint)', async () => {
    process.env.AI_BASE_URL = '';
    const fetchImpl = (async () => {
      throw new Error('fetch no debió llamarse');
    }) as unknown as typeof fetch;
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat([{ role: 'user', content: 'x' }], {}, cfg);
    expect(r.origen).toBe('fallback_vacio');
  });

  it('sin AI_MODEL → fallback_vacio (no adivina modelo)', async () => {
    process.env.AI_MODEL = '';
    const fetchImpl = (async () => {
      throw new Error('fetch no debió llamarse');
    }) as unknown as typeof fetch;
    const cfg: IaClientConfig = { fetchImpl };
    const r = await iaChat([{ role: 'user', content: 'x' }], {}, cfg);
    expect(r.origen).toBe('fallback_vacio');
  });

  it('createIaClient envuelve iaChat con la config inyectada', async () => {
    let called = 0;
    const fetchImpl = (async () => {
      called += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'x' } }] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const client = createIaClient({ fetchImpl });
    const r = await client.chat([{ role: 'user', content: 'x' }]);
    expect(called).toBe(1);
    expect(r.text).toBe('x');
    expect(r.origen).toBe('ia');
  });

  it('AI_TIMEOUT_MS=2000 → usa 2000ms como default', async () => {
    process.env.AI_TIMEOUT_MS = '2000';
    let capturedTimeout: ReturnType<typeof setTimeout> | null = null;
    const setTimeoutImpl = ((cb: () => void, ms?: number) => {
      capturedTimeout = setTimeout(cb, ms ?? 0);
      return capturedTimeout;
    }) as unknown as typeof setTimeout;
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
      })) as unknown as typeof fetch;
    const cfg: IaClientConfig = { fetchImpl, setTimeoutImpl };
    await iaChat([{ role: 'user', content: 'x' }], {}, cfg);
    expect(capturedTimeout).not.toBeNull();
  });
});