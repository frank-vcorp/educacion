/**
 * E2E: AC-17 — Flujo F0 IA contextualizada en el paso inicial del wizard.
 *
 * SPEC_TEC_10 §11 + IMPL-20260820-06.
 *
 * DECLARADO NO EJECUTABLE en sandbox (sin Supabase local + AI_API_KEY real).
 * Es gate de staging/producción. Verificable en staging con:
 *  - Supabase persistente
 *  - AI_PROVIDER/AI_API_KEY/AI_BASE_URL/AI_MODEL configurados en Vercel.
 *
 * Aserciones del flujo:
 *   1. Docente abre /planeaciones/nueva.
 *   2. Elige modalidad (rincones).
 *   3. Escribe problema del contexto.
 *   4. Pulsa "Pedir sugerencia".
 *   5. Aparece panel con 3 propuestas (problema/propósito/ajustes).
 *   6. Pulsa "Usar esta propuesta" en problema → campo rellenado.
 *   7. Pulsa "Usar esta propuesta" en propósito → campo rellenado.
 *   8. Cambia modalidad → propuestas pendientes marcadas desactualizadas;
 *      problema y propósito aceptados permanecen.
 *   9. "Guardar planeación" persiste con los valores aceptados.
 */
import { test, expect } from '@playwright/test';

const BASE = '/';

test.describe('AC-17 — F0 E2E (NO EJECUTABLE en sandbox)', () => {
  test.skip(
    true,
    'NO EJECUTABLE en sandbox: requiere Supabase (local o staging) + AI_API_KEY real en Vercel. Ejecutar en staging. Ver specs/IMPL-20260820-06_report.md §AC-17.',
  );

  test('docente abre wizard, elige modalidad, pide F0, acepta problema y propósito, cambia modalidad, propuestas se desactualizan y guardan', async ({ page }) => {
    await page.goto(`${BASE}planeaciones/nueva`);

    // 1. Sesión válida → wizard.
    await expect(page.getByRole('heading', { name: /modalidad/i }).first()).toBeVisible();

    // 2. Elegir modalidad rincones.
    await page.getByRole('button', { name: /rincones/i }).click();

    // 3. Avanzar a Contexto y escribir problema.
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.getByLabel(/problema del contexto/i).fill('A los niños les cuesta compartir en el patio');

    // 4. Pedir sugerencia.
    await page.getByTestId('ia-panel-f0-solicitar').click();

    // 5. Aparecen los 3 bloques.
    await expect(page.getByTestId('ia-panel-f0-bloque-problema')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('ia-panel-f0-bloque-proposito')).toBeVisible();
    await expect(page.getByTestId('ia-panel-f0-bloque-ajustes')).toBeVisible();

    // 6-7. Aceptar problema y propósito.
    await page.getByTestId('ia-panel-f0-usar-problema').click();
    await page.getByTestId('ia-panel-f0-usar-proposito').click();

    // 8. Cambiar modalidad → badge desactualizada.
    await page.getByRole('button', { name: /^atrás$/i }).click();
    await page.getByRole('button', { name: /abj/i }).click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByTestId('ia-panel-f0-desactualizada')).toBeVisible();

    // 9. Guardar planeación.
    await page.getByLabel(/nombre de la planeación/i).fill('Cuidamos el agua');
    await page.getByLabel(/inicio del periodo/i).fill('2026-08-21');
    await page.getByLabel(/fin del periodo/i).fill('2026-08-25');
    await page.getByRole('button', { name: /guardar planeación/i }).click();
    await expect(page).toHaveURL(/\/planeaciones\/[a-f0-9-]+/);
  });
});
