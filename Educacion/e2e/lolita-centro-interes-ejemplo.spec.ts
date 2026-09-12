/**
 * E2E demo: crea en la UI la planeación ejemplo de Lolita (Centro de interés
 * "Colorín colorante") basada en Educacion/formatos/lolita/centro de interés.txt
 *
 * Ejecución contra producción:
 *   E2E_BASE_URL=https://educacion-nem-mvp.vercel.app \
 *   pnpm exec playwright test e2e/lolita-centro-interes-ejemplo.spec.ts
 *
 * Auth: E2E_EMAIL + E2E_PASSWORD, o magic link vía SUPABASE_SERVICE_ROLE_KEY.
 */
import { test, expect } from '@playwright/test';
import { loginDocente } from './helpers/login-docente';
import { LOLITA_CENTRO_INTERES } from './fixtures/lolita-centro-interes-data';

const ENABLED = process.env.E2E_LOLITA_DEMO === '1' || process.env.E2E_BASE_URL;

test.describe('Planeación ejemplo Lolita — Centro de interés', () => {
  test('wizard + actividades del calendario (Colorín colorante)', async ({ page, baseURL }) => {
    test.skip(!ENABLED, 'Define E2E_LOLITA_DEMO=1 o E2E_BASE_URL para ejecutar este demo.');

    const email = await loginDocente(page, baseURL!);
    await page.goto('/planeaciones/nueva');
    await expect(page.getByText(/Paso 1 de/i)).toBeVisible();

    // Paso 1 — Modalidad
    await page.getByRole('radio', { name: 'Centros de Interés' }).check();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Paso 2 — Alcance del proyecto
    await page.getByRole('button', { name: /Por fechas \(proyecto\)/i }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Paso 3 — Contexto
    const d = LOLITA_CENTRO_INTERES;
    await page.locator('#nombre').fill(d.nombre);
    await page.locator('#problema').fill(d.problemaContexto);
    await page.locator('#proposito').fill(d.proposito);
    await page.locator('#ajustes').fill(d.ajustesRazonables);
    await page.locator('#inicio').fill(d.periodoInicio);
    await page.locator('#fin').fill(d.periodoFin);
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Paso 3 — Tema del centro
    await page.locator('#tema').fill(d.temaCentro);
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Paso 4 — Preguntas detonadoras
    const preguntaInput = page.getByPlaceholder(/qué pasaría si/i);
    for (const p of d.preguntasDet) {
      await preguntaInput.fill(p);
      await preguntaInput.press('Enter');
    }
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Paso 5 — Campos formativos
    await page.getByRole('button', { name: d.campoFormativo }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Paso 6 — PDA
    for (const pda of d.pdas) {
      await page.getByRole('button', { name: pda }).click();
    }
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // Paso 7 — Revisión y guardar
    await expect(page.getByText(d.nombre)).toBeVisible();
    await page.getByRole('button', { name: 'Guardar planeación' }).click();

    await page.waitForURL(/\/planeaciones\/[0-9a-f-]+/, { timeout: 45_000 });
    const planeacionUrl = page.url();
    const planeacionId = planeacionUrl.match(/\/planeaciones\/([0-9a-f-]+)/)?.[1];
    expect(planeacionId).toBeTruthy();

    await expect(page.getByTestId('planeacion-nueva-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('actividades-editor')).toBeVisible();

    // Actividades del catálogo M1 (observación + experimento)
    for (const codigo of d.catalogoBloques) {
      const agregar = page.getByTestId(`catalogo-agregar-${codigo}`);
      if (await agregar.isVisible({ timeout: 5000 }).catch(() => false)) {
        await agregar.click();
        await page.waitForTimeout(800);
      }
    }

    // Actividades propias del calendario L–V de Lolita
    for (const actividad of d.actividadesCalendario) {
      await page.getByTestId('bloque-editor-nuevo').fill(actividad);
      await page.getByTestId('bloque-editor-crear').click();
      await expect(page.getByText(actividad.slice(0, 40), { exact: false })).toBeVisible({
        timeout: 15_000,
      });
    }

    const bloques = page.getByTestId(/^bloque-/);
    await expect(bloques.first()).toBeVisible();
    expect(await bloques.count()).toBeGreaterThanOrEqual(d.actividadesCalendario.length);

    // eslint-disable-next-line no-console
    console.log('\n✅ Planeación ejemplo Lolita creada');
    // eslint-disable-next-line no-console
    console.log(`   Docente: ${email}`);
    // eslint-disable-next-line no-console
    console.log(`   URL: ${planeacionUrl.split('?')[0]}\n`);

    await page.screenshot({
      path: 'test-results/lolita-centro-interes-ejemplo.png',
      fullPage: true,
    });
  });
});
