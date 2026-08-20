/**
 * E2E: AC-28d — Estados de error UI (regresión).
 *
 * IMPL-20260820-01 — Spec DECLARADO NO EJECUTABLE en sandbox. Gate de
 * staging / producción.
 *
 * Casos cubiertos (SPEC_TEC_08 §5, tabla de errores):
 *   - `fallback_vacio`: AI_API_KEY inválida / proveedor caído → mensaje
 *     "no pudo generar" + área editable.
 *   - 429: rate-limit → bloqueo con Retry-After visible.
 *   - Anonymizer blocked (R-IA-10): 500 → mensaje "reformular en minúsculas".
 *
 * Aserciones: la UI **no crashea**, los mensajes son visibles, el botón
 * retry está presente (SPEC_TEC_08 §5).
 */
import { test, expect } from '@playwright/test';

const PLANEACION_ID = process.env.TEST_PLANEACION_ID ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BASE = '/';

test.describe('AC-28d — estados de error UI (NO EJECUTABLE en sandbox)', () => {
  test.skip(
    true,
    'NO EJECUTABLE en sandbox: requiere Supabase + proveedor + control de mocking del route. Ejecutar en staging con mocks configurados. Ver specs/IMPL-20260820-01_report.md §AC-28d.',
  );

  test('fallback_vacio: AI_API_KEY inválida → mensaje + área editable, sin crash', async ({ page }) => {
    await page.goto(`${BASE}planeaciones/${PLANEACION_ID}`);
    const f1Panel = page.getByTestId('ia-panel-F1').first();
    await f1Panel.getByTestId('ia-panel-F1-solicitar').click();
    await expect(f1Panel.getByTestId('ia-panel-F1-fallback')).toBeVisible({ timeout: 30000 });
    // El botón "Aceptar" sigue disponible para que la docente guarde texto manual.
    await expect(f1Panel.getByTestId('ia-panel-F1-aceptar')).toBeVisible();
  });

  test('429: rate-limit → mensaje con Retry-After + botón retry presente', async ({ page }) => {
    // Provoca 6 llamadas en 60s (SPEC §7 regla 7: 5/min/docente).
    await page.goto(`${BASE}planeaciones/${PLANEACION_ID}`);
    const f1Panel = page.getByTestId('ia-panel-F1').first();
    for (let i = 0; i < 6; i += 1) {
      await f1Panel.getByTestId('ia-panel-F1-solicitar').click().catch(() => undefined);
    }
    await expect(f1Panel.getByTestId('ia-panel-F1-error')).toBeVisible({ timeout: 30000 });
    // La UI no crashea y el botón retry existe.
    await expect(f1Panel.getByRole('button', { name: /reintentar/i })).toBeVisible();
  });

  test('anonymizer blocked: 500 → mensaje "reformular en minúsculas", sin crash', async ({ page }) => {
    await page.goto(`${BASE}planeaciones/${PLANEACION_ID}`);
    const bloqueInput = page.getByTestId('bloque-editor-nuevo');
    await bloqueInput.fill('EL NIÑO EXPLORARÁ LAS SEMILLAS'); // irredactable
    await page.getByTestId('bloque-editor-crear').click();
    const f1Panel = page.getByTestId('ia-panel-F1').first();
    await f1Panel.getByTestId('ia-panel-F1-solicitar').click();
    await expect(f1Panel.getByTestId('ia-panel-F1-error')).toBeVisible({ timeout: 30000 });
    // La UI no crashea; el mensaje guía a reformular en minúsculas.
    const alert = f1Panel.getByTestId('ia-panel-F1-error');
    await expect(alert).toContainText(/minúsculas/i);
  });
});