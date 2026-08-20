/**
 * Endpoint F-IA1: sugerir campos formativos a partir del "uso" del recurso.
 * SPEC_TEC_03 §6.23 + E21 §3.3.1.
 * Algoritmo: keyword matching determinista (no se envía nada a MiniMax).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { sugerirCamposPorUso } from '@/services/recursos-aula/sugerir-uso';

const Body = z.object({
  recurso_id: z.string().uuid().optional(),
  uso: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  const { data: recurso, error: rerr } = await supabase
    .from('recurso_aula')
    .select('id, cct, docente_id')
    .eq('id', parsed.data.recurso_id ?? '')
    .maybeSingle();
  if (rerr) {
    return NextResponse.json({ error: rerr.message }, { status: 500 });
  }
  if (parsed.data.recurso_id && recurso?.docente_id !== session.docenteId) {
    return NextResponse.json({ error: 'NEM_AUTH_RLS_VIOLATION' }, { status: 403 });
  }

  const sugerencias = sugerirCamposPorUso(parsed.data.uso);
  return NextResponse.json({ data: { sugerencias } });
}
