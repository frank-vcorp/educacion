import { NextResponse } from 'next/server';
import { requireSuperuserSession } from '@/lib/auth/require-superuser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST() {
  await requireSuperuserSession();

  const apiKey = (process.env.AI_API_KEY ?? '').trim();
  const baseUrl = (process.env.AI_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '');
  const model = (process.env.AI_MODEL ?? '').trim();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? '25000') || 25000;

  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({
      ok: false,
      stage: 'env',
      message: 'Faltan variables de entorno de IA en el servidor.',
      hasApiKey: Boolean(apiKey),
      baseUrl: baseUrl || null,
      model: model || null,
    });
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 25000));

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Responde SOLO con JSON válido: {"ok":true}' },
          { role: 'user', content: 'Prueba de conexión' },
        ],
        temperature: 0.2,
        max_tokens: 200,
        stream: false,
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - start;
    const rawBody = await res.text();

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        stage: 'http',
        status: res.status,
        endpoint,
        model,
        latencyMs,
        errorBody: rawBody.slice(0, 600),
      });
    }

    let contentPreview = rawBody.slice(0, 400);
    try {
      const parsed = JSON.parse(rawBody) as {
        choices?: Array<{ message?: { content?: string } }>;
        base_resp?: { status_code?: number; status_msg?: string };
      };
      if (parsed.base_resp && parsed.base_resp.status_code && parsed.base_resp.status_code !== 0) {
        return NextResponse.json({
          ok: false,
          stage: 'provider_error',
          status: res.status,
          endpoint,
          model,
          latencyMs,
          errorBody: JSON.stringify(parsed.base_resp),
        });
      }
      contentPreview = parsed.choices?.[0]?.message?.content ?? rawBody.slice(0, 400);
    } catch {
      // keep rawBody preview
    }

    return NextResponse.json({
      ok: true,
      status: res.status,
      endpoint,
      model,
      latencyMs,
      contentPreview: String(contentPreview).slice(0, 400),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: 'exception',
      endpoint,
      model,
      latencyMs: Date.now() - start,
      message: err instanceof Error ? `${err.name}: ${err.message}` : 'Error desconocido',
    });
  } finally {
    clearTimeout(timer);
  }
}
