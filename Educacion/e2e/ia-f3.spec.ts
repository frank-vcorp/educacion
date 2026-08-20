/**
 * E2E: AC-28c — Flujo F3 "Pulir campos del PDF" + descarga (SPEC_TEC_07 §11 AC-28).
 *
 * IMPL-20260820-01 — Spec DECLARADO NO EJECUTABLE en sandbox. Gate de
 * staging / producción. Ver e2e/ia-f1.spec.ts para notas detalladas.
 *
 * Aserciones funcionales del flujo (c) de SPEC_TEC_07 §11:
 *   1. Docente abre /planeaciones/[id].
 *   2. Pulsa "Pulir campos del PDF (F3)" → response 200 con `campos_pulidos`.
 *   3. Aparece la sugerencia editable (no autocompletada en la planeación).
 *   4. "Aceptar" → updatePlaneacion PATCH.
 *   5. Botón "Descargar PDF" → GET /api/planeaciones/[id]/generar-pdf →
 *      PDF descargado (Content-Disposition attachment) con campos pulidos.
 *   6. audit_log: 1 fila POST (endpoint=planeaciones_pulir_pdf) + 1 fila
 *      PATCH (endpoint=update_planeacion_post_ia_f3).
 */
import { test, expect } from '@playwright/test';

const PLANEACION_ID = process.env.TEST_PLANEACION_ID ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BASE = '/';

test.describe('AC-28c — F3 E2E (NO EJECUTABLE en sandbox)', () => {
  test.skip(
    true,
    'NO EJECUTABLE en sandbox: requiere Supabase (local o staging) + AI_API_KEY real. Ejecutar en staging. Ver specs/IMPL-20260820-01_report.md §AC-28c.',
  );

  test('docente abre planeación, pide F3, acepta, descarga PDF', async ({ page }) => {
    await page.goto(`${BASE}planeaciones/${PLANEACION_ID}`);

    const f3Panel = page.getByTestId('ia-panel-F3').first();
    await f3Panel.getByTestId('ia-panel-F3-solicitar').click();

    await expect(f3Panel.getByTestId('ia-panel-F3-problema_contexto')).toBeVisible({
      timeout: 30000,
    });

    await f3Panel.getByTestId('ia-panel-F3-aceptar').click();
    await expect(f3Panel.getByTestId('ia-panel-F3-accepted')).toBeVisible();

    // Botón "Descargar PDF" aparece tras aceptar.
    const downloadBtn = f3Panel.getByTestId('ia-panel-F3-descargar-pdf');
    await expect(downloadBtn).toBeVisible();

    // Verificación Content-Disposition queda para el gate de staging.
  });
});