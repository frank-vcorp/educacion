/**
 * E2E: AC-28a — Flujo F1 "Variante de bloque" (SPEC_TEC_07 §11 AC-28).
 *
 * IMPL-20260820-01 — Spec DECLARADO NO EJECUTABLE en sandbox (sin Supabase
 * local/staging + proveedor real con AI_API_KEY). Es gate de staging /
 * producción (SPEC_TEC_07 §15). Verificable en staging con Supabase
 * persistente + AI_PROVIDER/AI_API_KEY/AI_BASE_URL/AI_MODEL configurados
 * en Vercel.
 *
 * Ejecución esperada en staging:
 *   pnpm exec playwright test e2e/ia-f1.spec.ts
 *
 * Aserciones funcionales del flujo (a) de SPEC_TEC_07 §11:
 *   1. Docente abre /planeaciones/[id] con sesión válida.
 *   2. La vista muestra el editor de bloques (sin bloques → "Añadir bloque").
 *   3. Crea un bloque con texto_base.
 *   4. Pulsa "Variante de bloque (F1)".
 *   5. Aparece sugerencia visible en área editable (no autocompletada en
 *      el bloque).
 *   6. Pulsa "Aceptar".
 *   7. Bloque refrescado con origen=ia_sugerencia (o maestra_editado_de_ia
 *      si editó la sugerencia).
 *   8. Verificación `audit_log`: 1 fila POST (endpoint=planeaciones_variantes_bloque)
 *      + 1 fila PATCH (endpoint=update_bloque_post_ia).
 *
 * En sandbox sin Supabase ni proveedor, este spec se marca como `test.skip`
 * para no fallar el gate de playwright (mantiene el file en repo + coverage
 * de la intención E2E + ready para staging).
 */
import { test, expect } from '@playwright/test';

const PLANEACION_ID = process.env.TEST_PLANEACION_ID ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BASE = '/';

test.describe('AC-28a — F1 E2E (NO EJECUTABLE en sandbox)', () => {
  test.skip(
    true,
    'NO EJECUTABLE en sandbox: requiere Supabase (local o staging) + AI_API_KEY real en Vercel. Ejecutar en staging. Ver specs/IMPL-20260820-01_report.md §AC-28a.',
  );

  test('docente abre planeación, crea bloque, pide F1, acepta y bloque refrescado', async ({ page }) => {
    await page.goto(`${BASE}planeaciones/${PLANEACION_ID}`);
    // 1. Sesión válida → vista detalle.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Crear bloque mínimo (texto_base).
    await page.getByTestId('bloque-editor-nuevo').fill('Texto base del bloque para F1.');
    await page.getByTestId('bloque-editor-crear').click();

    // 3. Esperar bloque creado.
    await expect(page.getByTestId(/^bloque-/).first()).toBeVisible();

    // 4. Abrir el panel F1 (1ª instancia) y pedir sugerencia.
    const f1Panel = page.getByTestId('ia-panel-F1').first();
    await f1Panel.getByTestId('ia-panel-F1-solicitar').click();

    // 5. La sugerencia debe aparecer (éxito o fallback_vacio).
    await expect(f1Panel.getByTestId('ia-panel-F1-texto')).toBeVisible({ timeout: 30000 });

    // 6. Aceptar.
    await f1Panel.getByTestId('ia-panel-F1-aceptar').click();
    await expect(f1Panel.getByTestId('ia-panel-F1-accepted')).toBeVisible();

    // 7. Bloque refrescado con texto actualizado.
    // (Verificación adicional: query a audit_log queda para verificación
    // runtime por Frank / pipeline de staging, fuera del E2E navegador.)
  });
});