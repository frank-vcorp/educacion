/**
 * E2E: AC-28b — Flujo F2 "Ayuda a redactar" (SPEC_TEC_07 §11 AC-28).
 *
 * IMPL-20260820-01 — Spec DECLARADO NO EJECUTABLE en sandbox. Gate de
 * staging / producción. Ver e2e/ia-f1.spec.ts para notas detalladas.
 *
 * Aserciones funcionales del flujo (b) de SPEC_TEC_07 §11:
 *   1. Docente abre /planeaciones/[id].
 *   2. Bloque existente con texto_base.
 *   3. Pulsa "Ayuda a redactar (F2)".
 *   4. Aparece sugerencia visible **y NO autocompletada en el bloque**
 *      (P-PD9: la docente debe pulsar "Aceptar").
 *   5. "Aceptar" → updateBloque PATCH → bloque actualizado.
 *   6. audit_log: 1 fila POST (endpoint=planeaciones_help_redaccion) + 1
 *      fila PATCH (endpoint=update_bloque_post_ia).
 *
 * En sandbox: `test.skip(true, ...)` para mantener el spec en repo + ready
 * para staging.
 */
import { test, expect } from '@playwright/test';

const PLANEACION_ID = process.env.TEST_PLANEACION_ID ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BASE = '/';

test.describe('AC-28b — F2 E2E (NO EJECUTABLE en sandbox)', () => {
  test.skip(
    true,
    'NO EJECUTABLE en sandbox: requiere Supabase (local o staging) + AI_API_KEY real. Ejecutar en staging. Ver specs/IMPL-20260820-01_report.md §AC-28b.',
  );

  test('docente abre planeación, pide F2, verifica no-autocompletado, acepta', async ({ page }) => {
    await page.goto(`${BASE}planeaciones/${PLANEACION_ID}`);

    const bloqueInicial = page.getByTestId(/^bloque-/).first();
    const contenidoInicial = (await bloqueInicial.textContent()) ?? '';

    const f2Panel = page.getByTestId('ia-panel-F2').first();
    await f2Panel.getByTestId('ia-panel-F2-solicitar').click();

    await expect(f2Panel.getByTestId('ia-panel-F2-texto')).toBeVisible({ timeout: 30000 });

    // P-PD9: el bloque NO debe cambiar hasta "Aceptar".
    const contenidoTrasF2 = (await bloqueInicial.textContent()) ?? '';
    expect(contenidoTrasF2).toBe(contenidoInicial);

    await f2Panel.getByTestId('ia-panel-F2-aceptar').click();
    await expect(f2Panel.getByTestId('ia-panel-F2-accepted')).toBeVisible();
  });
});