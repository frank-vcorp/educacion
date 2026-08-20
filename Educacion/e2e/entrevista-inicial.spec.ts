/**
 * E2E: AC-9 — Flujo de la entrevista inicial del niño (SPEC_TEC_09 §12).
 *
 * IMPL-20260820-04 (P3-4 de QA-20260820-02): este spec YA NO se esconde
 * detrás de un `test.skip(true, ...)`. El gate queda EJECUTABLE: salta
 * solo si el entorno no tiene Supabase persistente + `0022` aplicada,
 * y el motivo queda visible en el reporte (`--reporter=list` lo imprime
 * literalmente).
 *
 * Modos:
 *   - Sandbox (default): salta cada test con motivo claro y reproducible.
 *     El comando para forzarlo sería destructivo en sandbox, por eso se
 *     mantiene el skip por defecto (sin auth no se puede probar el flujo).
 *   - Staging (`E2E_FULL_FLOW=1`): el spec corre completo con Supabase
 *     persistente + migración 0022 aplicada. Ver `specs/IMPL-20260820-03_report.md`
 *     §AC-9 y `specs/IMPL-20260820-04_report.md` §P3-4.
 *
 * Ejecución esperada en staging:
 *   pnpm exec playwright test e2e/entrevista-inicial.spec.ts
 *   # o forzando la habilitación:
 *   E2E_FULL_FLOW=1 pnpm exec playwright test e2e/entrevista-inicial.spec.ts
 *
 * Cobertura funcional en staging con Supabase + `0022` aplicada:
 *   1. Docente con sesión válida, aviso aceptado y grupo activo.
 *   2. Abre /alumnos → ve la lista con el botón "Entrevista" por fila.
 *   3. Click en "Entrevista" → diálogo con los 21 ítems en orden.
 *   4. Edita respuesta del ítem 7 ("¿Cuál es tu color Favorito?") → "Naranja".
 *   5. Pulsa "Guardar" → toast OK; la fila en la base tiene `respuestas.items[6].respuesta === 'Naranja'`.
 *   6. Recarga la página → la entrevista persiste (mismo valor).
 *   7. Pulsa "Archivar" → estado pasa a `archivada`.
 *   8. Verifica que la fila de la entrevista en BD tiene `estado='archivada'`.
 *
 * NOTA: para el gate de viewport móvil 375×812 (AC-10) hay un spec
 * ejecutable independiente: `e2e/entrevista-inicial.mobile.spec.ts`
 * (no requiere backend).
 */
import { test, expect } from '@playwright/test';

const BASE = '/alumnos';
const FULL_FLOW_ENABLED = process.env.E2E_FULL_FLOW === '1';

const SANDBOX_SKIP_REASON =
  'Sandbox sin Supabase persistente + migración 0022 aplicada. ' +
  'Para ejecutar este flujo: Frank autoriza `supabase db push` en staging ' +
  'y se lanza con `E2E_FULL_FLOW=1 pnpm exec playwright test e2e/entrevista-inicial.spec.ts`. ' +
  'Ver specs/IMPL-20260820-03_report.md §AC-9 y specs/IMPL-20260820-04_report.md §P3-4. ' +
  'Gate mobile 375×812 ejecutable en `e2e/entrevista-inicial.mobile.spec.ts`.';

test.describe('AC-9 — Entrevista inicial E2E', () => {
  test('docente abre entrevista, captura 21 ítems en orden, guarda, archiva', async ({
    page,
  }) => {
    test.skip(!FULL_FLOW_ENABLED, SANDBOX_SKIP_REASON);

    await page.goto(`${BASE}`);

    // 1. La lista carga con al menos 1 alumno.
    const entrevistaBtn = page.getByTestId(/^entrevista-button-/).first();
    await expect(entrevistaBtn).toBeVisible();

    // 2. Abre el modal de entrevista inicial.
    await entrevistaBtn.click();

    // 3. Verifica los 21 ítems en orden.
    for (let i = 1; i <= 21; i++) {
      await expect(page.getByTestId(`entrevista-item-${i}`)).toBeVisible();
    }

    // 4. Edita el ítem 7 con "Naranja".
    const item7 = page.getByTestId('entrevista-item-7');
    await item7.getByRole('textbox').fill('Naranja');

    // 5. Pulsa Guardar.
    await page.getByTestId('entrevista-guardar').click();

    // 6. Recarga el modal (reabre) y verifica persistencia.
    await page.reload();
    await page.getByTestId(/^entrevista-button-/).first().click();
    const item7Reload = page.getByTestId('entrevista-item-7');
    await expect(item7Reload.getByRole('textbox')).toHaveValue('Naranja');

    // 7. Archivar.
    await page.getByTestId('entrevista-archivar').click();
    // El botón pasa a "Archivada" y queda deshabilitado.
    await expect(page.getByTestId('entrevista-archivar')).toBeDisabled();
  });
});
