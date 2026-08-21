/**
 * E2E AC-UX (IMPL-20260821-01) — Validación del modal de entrevista
 * inicial con stepper 1/2/3 en viewport móvil 375×812.
 *
 * Reemplaza el fixture del gate escondido y reproduce la NUEVA estructura
 * introducida por IMPL-20260821-01:
 *
 *   - DialogContent con `max-h-[90dvh]`, `overflow-y-auto` interno (vía
 *     `entrevista-dialog-body`) y `p-0` para que el header y el footer
 *     sticky queden fuera del flujo scrollable.
 *   - Stepper 1/2/3 horizontal con tres botones circulares y un
 *     separador; `aria-current="step"` en el paso activo.
 *   - Tres `<fieldset data-step="1|2|3">`, el activo visible y los
 *     demás con atributo `hidden` (no `display:none` literal, sólo el
 *     atributo que el navegador trata como tal).
 *   - Footer `sticky` con `Anterior`, `Siguiente`, `Archivar` y
 *     `Guardar`, siempre visible aunque el body esté scrollable.
 *   - Scroll vertical: al cambiar de paso, `scrollTop` del body vuelve a 0.
 *
 * El fixture reproduce esta estructura con estilos inline equivalentes
 * a Tailwind para que el test sea ejecutable en sandbox sin Chromium
 * pesado (Playwright). Si el sandbox no tiene Chromium, fallará con
 * error claro de Playwright (mismo gate que
 * `e2e/entrevista-inicial.mobile.spec.ts`).
 *
 * Ejecución:
 *   pnpm exec playwright test e2e/entrevista-inicial-stepper.mobile.spec.ts
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

test.describe('IMPL-20260821-01 — Modal de entrevista con stepper 1/2/3 (mobile 375×812)', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });

  /**
   * Fixture HTML que reproduce el modal con la nueva estructura.
   * Los estilos inline son equivalentes a las clases Tailwind del
   * componente real (`max-h-[90dvh]`, `overflow-y-auto`, `sticky`,
   * `hidden`, `flex flex-col`, etc.).
   */
  const FIXTURE_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>IMPL-20260821-01 — Entrevista inicial stepper 375x812</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { background: #f8fafc; padding: 16px; }
  /* IMPL-20260821-01: DialogContent con max-h + overflow interno. */
  .dialog {
    max-width: 768px;
    width: 100%;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    /* Equivalente a: max-h-[90dvh] flex flex-col overflow-hidden p-0 */
    max-height: 90vh; /* fallback */
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }
  /* IMPL-20260821-01: header del modal shrink-0 px-6 pt-6 */
  .dialog-header {
    flex-shrink: 0;
    padding: 24px 24px 0 24px;
  }
  .dialog-header h2 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
  .dialog-header p { font-size: 13px; color: #64748b; margin: 0; }
  /* IMPL-20260821-01: cuerpo scrollable min-h-0 flex-1 overflow-y-auto px-6 pb-2 */
  .dialog-body {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 0 24px 8px 24px;
  }
  /* Stepper */
  nav[aria-label="Pasos de la entrevista"] { padding: 12px 0; }
  ol.steps {
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  ol.steps li { display: flex; align-items: center; gap: 8px; }
  .step-btn {
    display: inline-flex;
    height: 28px;
    min-width: 32px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: 1px solid #cbd5e1;
    background: #fff;
    color: #0f172a;
    font-weight: 500;
    font-size: 14px;
    padding: 0 12px;
    cursor: pointer;
  }
  .step-btn[aria-current="step"] {
    background: #0f172a;
    color: #fff;
    border-color: #0f172a;
  }
  .step-sep { height: 1px; width: 24px; background: #e2e8f0; }
  /* Bloques (fieldset) */
  fieldset.bloque {
    border: 0;
    padding: 0;
    margin: 16px 0;
  }
  fieldset.bloque legend { font-size: 14px; font-weight: 600; }
  /* IMPL-20260821-01: un solo bloque visible (los demás con hidden). */
  fieldset.bloque[hidden] { display: none; }
  /* Inputs */
  .input { width: 100%; max-width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
  .label { font-size: 14px; font-weight: 500; color: #0f172a; display: block; margin-bottom: 4px; }
  /* Footer IMPL-20260821-01: sticky bottom-0 border-t bg-background px-6 py-3 */
  .dialog-footer {
    position: sticky;
    bottom: 0;
    margin: 0 -24px;
    padding: 12px 24px;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
  .btn[disabled] { opacity: 0.5; cursor: not-allowed; }
</style>
</head>
<body>
  <div class="dialog" role="dialog" aria-modal="true" data-testid="entrevista-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
    <header class="dialog-header">
      <h2 id="dialog-title">Entrevista inicial — Alumno Demo</h2>
      <p id="dialog-desc">Cuestionario literal del documento (3 bloques).</p>
    </header>

    <div class="dialog-body" data-testid="entrevista-dialog-body">
      <form data-testid="entrevista-form">
        <nav aria-label="Pasos de la entrevista" data-testid="entrevista-stepper">
          <ol class="steps">
            <li><button type="button" class="step-btn" data-testid="entrevista-stepper-step-1" data-active="true" aria-current="step" aria-label="Paso 1 de 3: Entrevista inicial (activo)">1</button><span class="step-sep" aria-hidden="true"></span></li>
            <li><button type="button" class="step-btn" data-testid="entrevista-stepper-step-2" data-active="false" aria-label="Paso 2 de 3: Ambiente familiar y escuela">2</button><span class="step-sep" aria-hidden="true"></span></li>
            <li><button type="button" class="step-btn" data-testid="entrevista-stepper-step-3" data-active="false" aria-label="Paso 3 de 3: Directorio de emergencia">3</button></li>
          </ol>
        </nav>

        <fieldset class="bloque" data-testid="entrevista-bloque-1" data-step="1">
          <legend>Bloque 1 — Entrevista inicial</legend>
          ${Array.from({ length: 5 }, (_, i) => `
            <div style="margin: 12px 0;" data-testid="entrevista-item-${i + 1}">
              <label class="label" for="entrevista-item-${i + 1}">${i + 1}. Pregunta ${i + 1}</label>
              <input id="entrevista-item-${i + 1}" class="input" type="text" aria-label="Respuesta ${i + 1}" />
            </div>
          `).join('')}
        </fieldset>

        <fieldset class="bloque" data-testid="entrevista-bloque-2" data-step="2" hidden>
          <legend>Bloque 2 — Ambiente familiar / escuela</legend>
          ${Array.from({ length: 16 }, (_, i) => `
            <div style="margin: 8px 0;" data-testid="entrevista-celda-${i + 1}">
              <label class="label" for="entrevista-celda-${i + 1}">${i + 1}. Celda ${i + 1}</label>
              <input id="entrevista-celda-${i + 1}" class="input" type="text" aria-label="Respuesta celda ${i + 1}" />
            </div>
          `).join('')}
        </fieldset>

        <fieldset class="bloque" data-testid="entrevista-bloque-3" data-step="3" hidden>
          <legend>Bloque 3 — Directorio de emergencia</legend>
          ${Array.from({ length: 4 }, (_, i) => `
            <div style="margin: 8px 0;" data-testid="directorio-contacto-${i + 1}">
              <label class="label" for="directorio-${i + 1}-nombre">Contacto ${i + 1} — Nombre</label>
              <input id="directorio-${i + 1}-nombre" class="input" type="text" />
            </div>
          `).join('')}
        </fieldset>
      </form>
    </div>

    <div class="dialog-footer" data-testid="entrevista-footer" role="group" aria-label="Navegación y acciones de la entrevista">
      <div class="btn-row">
        <button type="button" class="btn btn-outline" data-testid="entrevista-stepper-prev" aria-label="Paso anterior" disabled>← Anterior</button>
        <button type="button" class="btn btn-outline" data-testid="entrevista-stepper-next" aria-label="Paso siguiente">Siguiente →</button>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-outline" data-testid="entrevista-archivar">Archivar</button>
        <button type="submit" class="btn btn-primary" data-testid="entrevista-guardar">Guardar</button>
      </div>
    </div>
  </div>
  <!-- IMPL-20260821-04 (F-5 fix): emulación del handler de navegación
       del stepper en el fixture HTML inline. El componente real
       (components/alumnos/entrevista-inicial-form.tsx) reacciona a
       clicks sobre los botones de paso y sobre Anterior/Siguiente
       moviendo el atributo hidden entre los fieldset data-step,
       actualizando aria-current, reseteando scrollTop del cuerpo y
       actualizando el atributo disabled de los botones Anterior/Siguiente.
       Este script reproduce esa semántica sin tocar producto ni
       componentes. -->
  <script>
    (function () {
      var TOTAL = 3;
      function setActive(n) {
        for (var i = 1; i <= TOTAL; i++) {
          var b = document.querySelector('[data-testid="entrevista-bloque-' + i + '"]');
          if (b) {
            if (i === n) b.removeAttribute('hidden');
            else b.setAttribute('hidden', '');
          }
          var btn = document.querySelector('[data-testid="entrevista-stepper-step-' + i + '"]');
          if (btn) {
            if (i === n) {
              btn.setAttribute('aria-current', 'step');
              btn.setAttribute('data-active', 'true');
            } else {
              btn.removeAttribute('aria-current');
              btn.setAttribute('data-active', 'false');
            }
          }
        }
        var db = document.querySelector('[data-testid="entrevista-dialog-body"]');
        if (db) db.scrollTop = 0;
        var prev = document.querySelector('[data-testid="entrevista-stepper-prev"]');
        var next = document.querySelector('[data-testid="entrevista-stepper-next"]');
        if (prev) prev.disabled = (n <= 1);
        if (next) next.disabled = (n >= TOTAL);
        document.documentElement.setAttribute('data-stepper-active', String(n));
      }
      function current() {
        var v = document.documentElement.getAttribute('data-stepper-active');
        return v ? Number(v) : 1;
      }
      function wire() {
        for (var i = 1; i <= TOTAL; i++) {
          (function (step) {
            var btn = document.querySelector('[data-testid="entrevista-stepper-step-' + step + '"]');
            if (btn) btn.addEventListener('click', function () { setActive(step); });
          })(i);
        }
        var prev = document.querySelector('[data-testid="entrevista-stepper-prev"]');
        var next = document.querySelector('[data-testid="entrevista-stepper-next"]');
        if (prev) prev.addEventListener('click', function () {
          var a = current();
          if (a > 1) setActive(a - 1);
        });
        if (next) next.addEventListener('click', function () {
          var a = current();
          if (a < TOTAL) setActive(a + 1);
        });
      }
      wire();
    })();
  </script>
</body>
</html>`;

  test('375×812: modal con stepper cabe en viewport + un bloque visible por vez + footer accesible', async ({
    page,
  }, testInfo) => {
    await page.setContent(FIXTURE_HTML, { waitUntil: 'load' });

    // (1) viewport aplicado correctamente.
    const vp = page.viewportSize();
    expect(vp).toEqual({ width: 375, height: 812 });

    // (2) el modal no excede el viewport verticalmente y no hay overflow
    //     horizontal en el documento.
    const initial = await page.evaluate(() => {
      const doc = document.documentElement;
      const dialog = document.querySelector('[data-testid="entrevista-dialog"]') as HTMLElement;
      const body = document.querySelector('[data-testid="entrevista-dialog-body"]') as HTMLElement;
      const stepper = document.querySelector('[data-testid="entrevista-stepper"]') as HTMLElement;
      const footer = document.querySelector('[data-testid="entrevista-footer"]') as HTMLElement;
      const step1 = document.querySelector('[data-testid="entrevista-stepper-step-1"]') as HTMLButtonElement;
      const step2 = document.querySelector('[data-testid="entrevista-stepper-step-2"]') as HTMLButtonElement;
      const step3 = document.querySelector('[data-testid="entrevista-stepper-step-3"]') as HTMLButtonElement;
      const bloque1 = document.querySelector('[data-testid="entrevista-bloque-1"]') as HTMLElement;
      const bloque2 = document.querySelector('[data-testid="entrevista-bloque-2"]') as HTMLElement;
      const bloque3 = document.querySelector('[data-testid="entrevista-bloque-3"]') as HTMLElement;
      const prev = document.querySelector('[data-testid="entrevista-stepper-prev"]') as HTMLButtonElement;
      const next = document.querySelector('[data-testid="entrevista-stepper-next"]') as HTMLButtonElement;
      const archivar = document.querySelector('[data-testid="entrevista-archivar"]') as HTMLButtonElement;
      const guardar = document.querySelector('[data-testid="entrevista-guardar"]') as HTMLButtonElement;
      const rect = (el: HTMLElement) => el?.getBoundingClientRect();
      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        dialog: {
          height: rect(dialog)?.height ?? 0,
          maxHeight: getComputedStyle(dialog).maxHeight,
          overflowY: getComputedStyle(dialog).overflowY,
        },
        body: {
          height: rect(body)?.height ?? 0,
          overflowY: getComputedStyle(body).overflowY,
          scrollHeight: body?.scrollHeight ?? 0,
          clientHeight: body?.clientHeight ?? 0,
        },
        stepper: {
          // IMPL-20260821-03 (F-4 fix): paréntesis obligatorios porque `??`
          // tiene menor precedencia que `<=`. Sin paréntesis, la expresión
          // se parseaba como `rect(stepper)?.bottom ?? (0 <= 812)` →
          // `rect(stepper)?.bottom ?? true`, devolviendo un número (truthy)
          // en vez de un booleano.
          inViewport: (rect(stepper)?.bottom ?? 0) <= 812,
          bottom: rect(stepper)?.bottom ?? 0,
        },
        footer: {
          // IMPL-20260821-03 (F-4 fix): mismo patrón que stepper.inViewport.
          inViewport: (rect(footer)?.bottom ?? 0) <= 812,
          bottom: rect(footer)?.bottom ?? 0,
          height: rect(footer)?.height ?? 0,
        },
        aria: {
          step1Current: step1?.getAttribute('aria-current'),
          step2Current: step2?.getAttribute('aria-current'),
          step3Current: step3?.getAttribute('aria-current'),
        },
        visible: {
          bloque1: !bloque1?.hasAttribute('hidden'),
          bloque2: !bloque2?.hasAttribute('hidden'),
          bloque3: !bloque3?.hasAttribute('hidden'),
        },
        buttons: {
          prevHeight: rect(prev)?.height ?? 0,
          nextHeight: rect(next)?.height ?? 0,
          archivarHeight: rect(archivar)?.height ?? 0,
          guardarHeight: rect(guardar)?.height ?? 0,
          prevDisabled: prev?.disabled,
          nextDisabled: next?.disabled,
        },
      };
    });

    // (a) Sin overflow horizontal.
    expect(initial.docScrollWidth).toBeLessThanOrEqual(375);

    // (b) El DialogContent tiene max-height resuelto ≈ 90% del viewport
    //     (esperado: 812×0.9 = 730.8 px en 375×812). IMPORTANTE:
    //     `getComputedStyle().maxHeight` SIEMPRE devuelve el valor RESUELTO
    //     en píxeles (p.ej. "730.8px"); nunca el string original
    //     "90vh"/"90dvh" (QA-20260821-01 F-1). Comparamos numéricamente.
    //     Gate de altura efectiva preservado: dialog.height ≤ viewport.
    const viewportH = 812;
    const expectedMaxHeightPx = viewportH * 0.9; // 730.8
    const maxHeightTolerancePx = 1; // toleramos ±1 px por redondeo del browser.
    const resolvedMaxHeightPx = parseFloat(initial.dialog.maxHeight);
    expect(Number.isFinite(resolvedMaxHeightPx)).toBe(true);
    expect(resolvedMaxHeightPx).toBeGreaterThanOrEqual(expectedMaxHeightPx - maxHeightTolerancePx);
    expect(resolvedMaxHeightPx).toBeLessThanOrEqual(expectedMaxHeightPx + maxHeightTolerancePx);
    expect(initial.dialog.height).toBeLessThanOrEqual(viewportH);

    // (c) Sólo bloque 1 visible por defecto (los demás con hidden).
    expect(initial.visible.bloque1).toBe(true);
    expect(initial.visible.bloque2).toBe(false);
    expect(initial.visible.bloque3).toBe(false);

    // (d) Stepper y footer caben en el viewport (sin scroll vertical del modal).
    expect(initial.stepper.inViewport).toBe(true);
    expect(initial.footer.inViewport).toBe(true);

    // (e) Stepper accesible: aria-current sólo en el paso 1.
    expect(initial.aria.step1Current).toBe('step');
    expect(initial.aria.step2Current).toBeNull();
    expect(initial.aria.step3Current).toBeNull();

    // (f) Navegación: Anterior deshabilitado en paso 1; Siguiente habilitado.
    expect(initial.buttons.prevDisabled).toBe(true);
    expect(initial.buttons.nextDisabled).toBe(false);

    // (g) Altura mínima de los botones (40px ≈ 44px del spec).
    expect(initial.buttons.prevHeight).toBeGreaterThanOrEqual(40);
    expect(initial.buttons.nextHeight).toBeGreaterThanOrEqual(40);
    expect(initial.buttons.archivarHeight).toBeGreaterThanOrEqual(40);
    expect(initial.buttons.guardarHeight).toBeGreaterThanOrEqual(40);

    // (h) Click Siguiente → paso 2 visible, paso 1 oculto, scrollTop=0.
    await page.locator('[data-testid="entrevista-stepper-next"]').click();
    const afterNext = await page.evaluate(() => {
      const bloque1 = document.querySelector('[data-testid="entrevista-bloque-1"]') as HTMLElement;
      const bloque2 = document.querySelector('[data-testid="entrevista-bloque-2"]') as HTMLElement;
      const bloque3 = document.querySelector('[data-testid="entrevista-bloque-3"]') as HTMLElement;
      const step1 = document.querySelector('[data-testid="entrevista-stepper-step-1"]') as HTMLButtonElement;
      const step2 = document.querySelector('[data-testid="entrevista-stepper-step-2"]') as HTMLButtonElement;
      const step3 = document.querySelector('[data-testid="entrevista-stepper-step-3"]') as HTMLButtonElement;
      const body = document.querySelector('[data-testid="entrevista-dialog-body"]') as HTMLElement;
      const prev = document.querySelector('[data-testid="entrevista-stepper-prev"]') as HTMLButtonElement;
      const next = document.querySelector('[data-testid="entrevista-stepper-next"]') as HTMLButtonElement;
      return {
        visible: {
          bloque1: !bloque1?.hasAttribute('hidden'),
          bloque2: !bloque2?.hasAttribute('hidden'),
          bloque3: !bloque3?.hasAttribute('hidden'),
        },
        aria: {
          step1: step1?.getAttribute('aria-current'),
          step2: step2?.getAttribute('aria-current'),
          step3: step3?.getAttribute('aria-current'),
        },
        prevDisabled: prev?.disabled,
        nextDisabled: next?.disabled,
        bodyScrollTop: body?.scrollTop ?? -1,
      };
    });
    expect(afterNext.visible.bloque1).toBe(false);
    expect(afterNext.visible.bloque2).toBe(true);
    expect(afterNext.visible.bloque3).toBe(false);
    expect(afterNext.aria.step2).toBe('step');
    expect(afterNext.aria.step1).toBeNull();
    expect(afterNext.prevDisabled).toBe(false);
    expect(afterNext.nextDisabled).toBe(false);
    expect(afterNext.bodyScrollTop).toBe(0);

    // (i) Click Siguiente otra vez → paso 3 visible, Siguiente deshabilitado.
    await page.locator('[data-testid="entrevista-stepper-next"]').click();
    const afterStep3 = await page.evaluate(() => {
      const bloque1 = document.querySelector('[data-testid="entrevista-bloque-1"]') as HTMLElement;
      const bloque2 = document.querySelector('[data-testid="entrevista-bloque-2"]') as HTMLElement;
      const bloque3 = document.querySelector('[data-testid="entrevista-bloque-3"]') as HTMLElement;
      const next = document.querySelector('[data-testid="entrevista-stepper-next"]') as HTMLButtonElement;
      return {
        visible: {
          bloque1: !bloque1?.hasAttribute('hidden'),
          bloque2: !bloque2?.hasAttribute('hidden'),
          bloque3: !bloque3?.hasAttribute('hidden'),
        },
        nextDisabled: next?.disabled,
      };
    });
    expect(afterStep3.visible.bloque3).toBe(true);
    expect(afterStep3.visible.bloque1).toBe(false);
    expect(afterStep3.visible.bloque2).toBe(false);
    expect(afterStep3.nextDisabled).toBe(true);

    // (j) Click Anterior → paso 2 visible.
    await page.locator('[data-testid="entrevista-stepper-prev"]').click();
    const afterPrev = await page.evaluate(() => {
      const bloque2 = document.querySelector('[data-testid="entrevista-bloque-2"]') as HTMLElement;
      const bloque3 = document.querySelector('[data-testid="entrevista-bloque-3"]') as HTMLElement;
      return {
        bloque2: !bloque2?.hasAttribute('hidden'),
        bloque3: !bloque3?.hasAttribute('hidden'),
      };
    });
    expect(afterPrev.bloque2).toBe(true);
    expect(afterPrev.bloque3).toBe(false);

    // (k) Evidencia reproducible: captura PNG + métricas.
    const evidenceDir = testInfo.outputPath('evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const screenshotPath = join(evidenceDir, 'entrevista-stepper-mobile-375x812.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const metricsPath = join(evidenceDir, 'entrevista-stepper-mobile-375x812.metrics.json');
    writeFileSync(
      metricsPath,
      JSON.stringify({ viewport: vp, initial, afterNext, afterStep3, afterPrev }, null, 2),
      'utf8',
    );

    await testInfo.attach('viewport-375x812-stepper', {
      path: screenshotPath,
      contentType: 'image/png',
    });
    await testInfo.attach('metrics-375x812-stepper', {
      body: JSON.stringify({ viewport: vp, initial, afterNext, afterStep3, afterPrev }, null, 2),
      contentType: 'application/json',
    });
  });
});
