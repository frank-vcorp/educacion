/**
 * Test E2E: RLS cross-tenant (T-E2E-07 BLOQUEANTE).
 * SPEC_TEC_06 §3 + D-FIN-12.
 *
 * REQUIERE Supabase local corriendo (pnpm supabase start) y seed ejecutado.
 * Se excluye automáticamente si SUPABASE_TEST_URL no está definido.
 */
import { describe, it, expect } from 'vitest';

const SUPABASE_URL_A = process.env.SUPABASE_TEST_URL_CCT_A;
const SUPABASE_URL_B = process.env.SUPABASE_TEST_URL_CCT_B;

const skipIfNoSupabase = !SUPABASE_URL_A || !SUPABASE_URL_B ? describe.skip : describe;

skipIfNoSupabase('T-E2E-07 RLS cross-tenant (BLOQUEANTE)', () => {
  it('docente de CCT-A NO puede leer planeación de CCT-B', async () => {
    if (!SUPABASE_URL_A) return;
    const res = await fetch(`${SUPABASE_URL_A}/rest/v1/planeacion?select=*`, {
      headers: {
        apikey: process.env.SUPABASE_TEST_KEY_CCT_A ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_TEST_JWT_CCT_A ?? ''}`,
      },
    });
    const data = await res.json();
    // Todas las planeaciones devueltas deben ser del CCT-A
    for (const row of data) {
      expect(row.cct).not.toBe(process.env.SUPABASE_TEST_CCT_B);
    }
  });

  it('endpoint /api/v1/planeaciones/:id devuelve 403 para CCT ajeno', async () => {
    if (!SUPABASE_URL_A) return;
    // Asume que existe una planeacion con id conocido en CCT-B
    const targetId = process.env.SUPABASE_TEST_PLANEACION_B ?? '';
    const res = await fetch(`${SUPABASE_URL_A}/api/v1/planeaciones/${targetId}`, {
      headers: {
        cookie: `sb-access-token=${process.env.SUPABASE_TEST_JWT_CCT_A ?? ''}`,
      },
    });
    expect([403, 404]).toContain(res.status);
  });
});
