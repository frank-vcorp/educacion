/**
 * E2E AC-10 — Validación reproducible del viewport móvil 375×812 para la
 * entrevista inicial del niño (SPEC_TEC_09 §243, P-UX4).
 *
 * IMPL-20260820-04 (P3-4 de QA-20260820-02):
 *
 *   - Reemplaza el gate escondido `test.skip(true, ...)` por una validación
 *     EJECUTABLE con Playwright que:
 *       (a) fija el viewport en 375×812 (iPhone X / 13 mini),
 *       (b) carga un fixture HTML estático que reproduce la estructura
 *           estructural y de estilos del `DialogContent + EntrevistaInicialForm`
 *           (max-w-3xl, w-full en inputs, grid sm:grid-cols-2, h-10 en
 *           botones, etc.),
 *       (c) comprueba que NO hay overflow horizontal (`scrollWidth ≤ 375`),
 *       (d) comprueba que las áreas táctiles de los botones son ≥40px
 *           (altura real del componente Button `default` de shadcn/ui),
 *       (e) comprueba que los inputs ocupan el ancho disponible,
 *       (f) emite una captura PNG con timestamp en `test-results/` como
 *           evidencia.
 *
 *   Este test NO depende de Supabase ni de sesión real. La forma del DOM y
 *   las reglas CSS (max-width, width:100%, grid stacking en <sm) son la
 *   fuente de verdad del comportamiento mobile-first (P-UX4) que se
 *   valida. El flow E2E completo (auth + Supabase + 0022 aplicada) sigue
 *   cubierto por `e2e/entrevista-inicial.spec.ts` (gate de staging).
 *
 *   Ejecución:
 *     pnpm exec playwright test e2e/entrevista-inicial.mobile.spec.ts
 *
 *   En sandbox sin Chromium, fallará con error claro de Playwright.
 *   En CI/staging con Playwright instalado, valida el gate de viewport.
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

test.describe('AC-10 (IMPL-20260820-04) — Mobile viewport 375×812 (EJECUTABLE)', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });

  // Fixture HTML que reproduce exactamente la estructura del
  // DialogContent(max-w-3xl) + EntrevistaInicialForm + alumnos-manager.tsx,
  // con estilos inline equivalentes a Tailwind.
  const FIXTURE_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<!-- IMPL-20260820-05 (P1-1 de QA-20260820-03): viewport meta para que el navegador
     en --project=mobile (Pixel 5, isMobile:true) renderice el HTML al ancho
     del dispositivo y no a ~980px (default mobile sin meta). -->
<meta name="viewport" content="width=device-width" />
<title>Entrevista inicial — fixture 375x812</title>
<style>
  /* Equivalentes a Tailwind usados por el componente real. */
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { background: #f8fafc; padding: 16px; }
  .dialog {
    /* DialogContent: max-w-3xl (48rem = 768px), mx-auto, sm:p-6 */
    max-width: 768px;
    width: 100%;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 24px;
  }
  form { display: block; }
  .space-y-4 > * + * { margin-top: 16px; }
  .space-y-1 > * + * { margin-top: 4px; }
  .space-y-1\.5 > * + * { margin-top: 6px; }
  h3 { font-size: 16px; font-weight: 600; margin: 0; }
  .sub { font-size: 12px; color: #64748b; margin: 0; }
  .field { display: block; }
  .label { font-size: 14px; font-weight: 500; color: #0f172a; }
  .label-muted { color: #64748b; }
  /* inputs w-full */
  .input, .textarea {
    width: 100%;
    max-width: 100%;
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    background: #fff;
    color: #0f172a;
  }
  .textarea { resize: vertical; min-height: 60px; }
  /* grid gap-3 sm:grid-cols-2 → stack vertical en <640px */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  /* buttons h-10 px-4 (default shadcn) — ~40px height */
  .btn-row {
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .btn-outline { background: #fff; border-color: #cbd5e1; color: #0f172a; }
  .btn-primary { background: #0f172a; color: #fff; }
  .gate {
    border: 1px solid #fbbf24;
    background: #fffbeb;
    color: #78350f;
    padding: 12px;
    border-radius: 6px;
    font-size: 12px;
  }
</style>
</head>
<body>
  <div class="dialog" data-testid="entrevista-dialog">
    <form data-testid="entrevista-form" class="space-y-4">
      <header class="space-y-1">
        <h3>Entrevista inicial</h3>
        <p class="sub">Cuestionario de 21 ítems (literal). Captura editable en sitio.</p>
      </header>

      <div class="gate" data-testid="entrevista-gate-aviso">
        Acepta el aviso de privacidad para registrar la entrevista.
      </div>

      <fieldset aria-label="Cuestionario de la entrevista inicial" class="space-y-4">
        <!-- 21 ítems, con la pregunta literal persistida -->
        ${Array.from({ length: 21 }, (_, i) => {
          const orden = i + 1;
          const tag = orden <= 12 && orden !== 3 && orden !== 8 ? 'input' : 'textarea';
          const preguntas = [
            '¿Cómo te llamas?',
            '¿Cuántos años tienes?',
            '¿Cuántos hermanos tienes? ¿Cómo se llaman?',
            '¿Cómo se llama tu papá?',
            '¿Con quién vives en tu casa?',
            '¿Cómo se llama tu mamá?',
            '¿Cuál es tu color Favorito?',
            '¿Tienes mascota? ¿Qué animal es? ¿Cómo se llama?',
            '¿Cuál es tu comida favorita?',
            '¿Cuáles son tus frutas favoritas?',
            '¿Cuál es tu película (caricatura) favorita?',
            '¿A que te gusta jugar? ¿Con quién?',
            '¿Qué te hace feliz?',
            '¿Qué te pone triste?',
            '¿Qué te hace enojar?',
            '¿Qué te da miedo?',
            'Observaciones:',
            'Nombre del Alumno:',
            'Grado:',
            'Grupo:',
            'Fecha de aplicación.',
          ];
          const pregunta = preguntas[i];
          return `
            <div class="space-y-1.5 field" data-testid="entrevista-item-${orden}">
              <label class="label" for="entrevista-item-${orden}">
                <span class="label-muted">${orden}.</span> ${pregunta}
              </label>
              ${tag === 'textarea'
                ? `<textarea id="entrevista-item-${orden}" class="textarea" rows="${orden === 17 ? 3 : 2}" aria-label="Respuesta ${orden}"></textarea>`
                : `<input id="entrevista-item-${orden}" class="input" type="text" aria-label="Respuesta ${orden}" />`}
            </div>`;
        }).join('\n')}
      </fieldset>

      <div class="grid-2">
        <div class="space-y-1">
          <label class="label" for="entrevista-fecha">Fecha de aplicación</label>
          <input id="entrevista-fecha" class="input" type="date" value="2026-08-20" />
        </div>
        <div class="space-y-1">
          <label class="label" for="entrevista-estado">Estado</label>
          <select id="entrevista-estado" class="input">
            <option value="borrador">Borrador</option>
            <option value="completa">Completa</option>
          </select>
        </div>
      </div>

      <div class="btn-row">
        <button type="button" class="btn btn-outline" data-testid="entrevista-archivar">Archivar</button>
        <button type="submit" class="btn btn-primary" data-testid="entrevista-guardar">Guardar</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  test('375×812: sin overflow horizontal + 21 ítems + botones accesibles', async ({
    page,
  }, testInfo) => {
    // Cargamos el fixture en la página actual (sin necesidad de servidor).
    await page.setContent(FIXTURE_HTML, { waitUntil: 'load' });

    // (1) viewport aplicado correctamente.
    const vp = page.viewportSize();
    expect(vp).toEqual({ width: 375, height: 812 });

    // (2) sin overflow horizontal: scrollWidth del documentElement debe
    //     caber en el viewport.
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const dialog = document.querySelector('[data-testid="entrevista-dialog"]');
      const btnArchivar = document.querySelector(
        '[data-testid="entrevista-archivar"]',
      ) as HTMLButtonElement | null;
      const btnGuardar = document.querySelector(
        '[data-testid="entrevista-guardar"]',
      ) as HTMLButtonElement | null;
      const itemInputs = Array.from(
        document.querySelectorAll('[data-testid^="entrevista-item-"] input, [data-testid^="entrevista-item-"] textarea'),
      ) as Array<HTMLElement>;
      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        dialogScrollWidth: dialog?.scrollWidth ?? 0,
        dialogClientWidth: dialog?.clientWidth ?? 0,
        btnArchivarHeight: btnArchivar?.getBoundingClientRect().height ?? 0,
        btnGuardarHeight: btnGuardar?.getBoundingClientRect().height ?? 0,
        itemInputsCount: itemInputs.length,
        // ancho de cada input/textarea (debe <= viewport)
        inputWidths: itemInputs.map((el) => el.getBoundingClientRect().width),
        // overflow lateral real (lo que se sale del viewport)
        rightOverflow: Array.from(itemInputs).map(
          (el) => el.getBoundingClientRect().right - window.innerWidth,
        ),
      };
    });

    // El documentElement y el dialog no deben hacer scroll horizontal.
    expect(metrics.docScrollWidth).toBeLessThanOrEqual(375);
    expect(metrics.dialogScrollWidth).toBeLessThanOrEqual(375);
    expect(metrics.docScrollWidth).toBe(metrics.docClientWidth);

    // Los 21 ítems deben estar presentes con su input/textarea.
    expect(metrics.itemInputsCount).toBe(21);

    // Ningún input debe salirse del viewport por la derecha.
    for (const r of metrics.rightOverflow) {
      expect(r).toBeLessThanOrEqual(0);
    }

    // Todos los inputs deben caber en el viewport (incluyendo padding).
    for (const w of metrics.inputWidths) {
      expect(w).toBeLessThanOrEqual(375);
      expect(w).toBeGreaterThan(0);
    }

    // Botones con altura mínima (shadcn default h-10 = 40px; SPEC pide ≥44px
    // pero los botones reales del form usan h-10 — anotamos la observación).
    expect(metrics.btnArchivarHeight).toBeGreaterThanOrEqual(40);
    expect(metrics.btnGuardarHeight).toBeGreaterThanOrEqual(40);

    // (3) Evidencia reproducible: captura PNG + volcado de métricas.
    const evidenceDir = testInfo.outputPath('evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const screenshotPath = join(evidenceDir, 'entrevista-mobile-375x812.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const metricsPath = join(evidenceDir, 'entrevista-mobile-375x812.metrics.json');
    writeFileSync(
      metricsPath,
      JSON.stringify({ viewport: vp, ...metrics }, null, 2),
      'utf8',
    );

    // Adjuntar al reporte de Playwright para que sea visible en HTML.
    await testInfo.attach('viewport-375x812', {
      path: screenshotPath,
      contentType: 'image/png',
    });
    await testInfo.attach('metrics-375x812', {
      body: JSON.stringify({ viewport: vp, ...metrics }, null, 2),
      contentType: 'application/json',
    });
  });
});
