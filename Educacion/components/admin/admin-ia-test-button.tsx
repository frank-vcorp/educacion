'use client';

import { useState } from 'react';
import { Loader2, Play, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestResult {
  ok: boolean;
  stage?: string;
  status?: number;
  endpoint?: string;
  model?: string;
  latencyMs?: number;
  message?: string;
  errorBody?: string;
  contentPreview?: string;
}

export function AdminIaTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/ia-test', { method: 'POST' });
      const data = (await res.json()) as TestResult;
      setResult(data);
    } catch (err) {
      setResult({
        ok: false,
        stage: 'client',
        message: err instanceof Error ? err.message : 'Error de red',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-3 border-t space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Envía una petición real de prueba al proveedor configurado.
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={runTest}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {loading ? 'Probando...' : 'Probar conexión IA'}
        </Button>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-3 text-xs space-y-1.5 ${
            result.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              {result.ok ? 'Conexión exitosa' : `Fallo (${result.stage ?? 'error'})`}
            </span>
            {typeof result.latencyMs === 'number' && (
              <span className="font-mono">{result.latencyMs} ms</span>
            )}
          </div>
          {result.endpoint && (
            <p className="font-mono text-[11px] break-all">
              Endpoint: {result.endpoint} (HTTP {result.status ?? '—'})
            </p>
          )}
          {result.message && <p>{result.message}</p>}
          {result.errorBody && (
            <pre className="bg-white/80 border rounded p-2 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
              {result.errorBody}
            </pre>
          )}
          {result.contentPreview && (
            <pre className="bg-white/80 border rounded p-2 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
              {result.contentPreview}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
