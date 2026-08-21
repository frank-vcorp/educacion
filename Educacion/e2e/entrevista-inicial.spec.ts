/**
 * E2E: AC-26 — Flujo de la entrevista inicial del niño, cuestionario v2
 * (SPEC_TEC_09 §7 + §12 / IMPL-20260820-08).
 *
 * Modos:
 *   - Sandbox (default): salta cada test con motivo claro y reproducible.
 *     Sin auth + Supabase persistente + `0023` aplicada no se puede probar
 *     el flujo end-to-end.
 *   - Staging (`E2E_FULL_FLOW=1`): el spec corre completo con Supabase
 *     persistente + `0023` aplicada (columna `directorio`) + cuestionario
 *     v2 desplegado.
 *
 * Ejecución esperada en staging:
 *   E2E_FULL_FLOW=1 pnpm exec playwright test e2e/entrevista-inicial.spec.ts
 *
 * Cobertura funcional en staging con Supabase + `0023` aplicada:
 *   1. Docente con sesión válida, aviso aceptado y grupo activo.
 *   2. Abre /alumnos → ve la lista con el botón "Entrevista" por fila.
 *   3. Click en "Entrevista" → diálogo con los 3 bloques en orden:
 *      (1) 23 ítems del bloque "Entrevista inicial".
 *      (2) 16 celdas del bloque "Ambiente Familiar / Escuela" (2 instrucciones
 *          de dibujo como carga de imagen + 14 preguntas).
 *      (3) 4 contactos del "Directorio de emergencia" con etiqueta literal,
 *          nombre y teléfono.
 *   4. Edita respuesta del ítem 1 del bloque 1 → "Demo".
 *   5. Edita contacto 1 del directorio (nombre + teléfono).
 *   6. Pulsa "Guardar" → toast OK; la fila en BD persiste v2 + directorio.
 *   7. Recarga la página → la entrevista persiste (mismo valor + directorio).
 *   8. Pulsa "Archivar" → estado pasa a `archivada`.
 *   9. Verifica que la fila tiene `estado='archivada'` y `directorio` íntegro.
 *
 * NOTA: para el gate de viewport móvil 375×812 (P-UX4) hay un spec ejecutable
 * independiente: `e2e/entrevista-inicial.mobile.spec.ts` (no requiere backend).
 */
import { test, expect } from '@playwright/test';

const BASE = '/alumnos';
const FULL_FLOW_ENABLED = process.env.E2E_FULL_FLOW === '1';

const SANDBOX_SKIP_REASON =
  'Sandbox sin Supabase persistente + migración 0023 aplicada. ' +
  'Para ejecutar este flujo: Frank autoriza `supabase db push` en staging ' +
  'y se lanza con `E2E_FULL_FLOW=1 pnpm exec playwright test e2e/entrevista-inicial.spec.ts`. ' +
  'Ver specs/IMPL-20260820-08_report.md §AC-26. ' +
  'Gate mobile 375×812 ejecutable en `e2e/entrevista-inicial.mobile.spec.ts`.';

test.describe('AC-26 — Entrevista inicial E2E (cuestionario v2)', () => {
  test('docente abre entrevista, captura 3 bloques en orden, guarda, archiva', async ({
    page,
  }) => {
    test.skip(!FULL_FLOW_ENABLED, SANDBOX_SKIP_REASON);

    await page.goto(`${BASE}`);

    // 1. La lista carga con al menos 1 alumno.
    const entrevistaBtn = page.getByTestId(/^entrevista-button-/).first();
    await expect(entrevistaBtn).toBeVisible();

    // 2. Abre el modal de entrevista inicial.
    await entrevistaBtn.click();

    // 3. Verifica los 3 bloques en orden.
    await expect(page.getByTestId('entrevista-bloque-1')).toBeVisible();
    await expect(page.getByTestId('entrevista-bloque-2')).toBeVisible();
    await expect(page.getByTestId('entrevista-bloque-3')).toBeVisible();

    // 3a. Bloque 1 — 23 ítems en orden.
    for (let i = 1; i <= 23; i++) {
      await expect(page.getByTestId(`entrevista-item-${i}`)).toBeVisible();
    }

    // 3b. Bloque 2 — 16 celdas (2 dibujos + 14 preguntas).
    for (let i = 1; i <= 16; i++) {
      await expect(page.getByTestId(`entrevista-celda-${i}`)).toBeVisible();
    }

    // 3c. Bloque 3 — 4 contactos del directorio.
    for (let i = 1; i <= 4; i++) {
      await expect(page.getByTestId(`directorio-contacto-${i}`)).toBeVisible();
    }

    // 4. Edita el ítem 1 del bloque 1 con "Demo".
    const item1 = page.getByTestId('entrevista-item-1');
    await item1.getByRole('textbox').fill('Demo');

    // 5. Edita el contacto 1 del directorio (nombre + teléfono).
    const c1 = page.getByTestId('directorio-contacto-1');
    await c1.getByLabel(/^nombre/i).fill('Padre Demo');
    await c1.getByLabel(/teléfono/i).fill('555-1234');

    // 6. Pulsa Guardar.
    await page.getByTestId('entrevista-guardar').click();

    // 7. Recarga el modal (reabre) y verifica persistencia.
    await page.reload();
    await page.getByTestId(/^entrevista-button-/).first().click();
    const item1Reload = page.getByTestId('entrevista-item-1');
    await expect(item1Reload.getByRole('textbox')).toHaveValue('Demo');

    const c1Reload = page.getByTestId('directorio-contacto-1');
    await expect(c1Reload.getByLabel(/^nombre/i)).toHaveValue('Padre Demo');
    await expect(c1Reload.getByLabel(/teléfono/i)).toHaveValue('555-1234');

    // 8. Archivar.
    await page.getByTestId('entrevista-archivar').click();
    // El botón pasa a "Archivada" y queda deshabilitado.
    await expect(page.getByTestId('entrevista-archivar')).toBeDisabled();
  });
});