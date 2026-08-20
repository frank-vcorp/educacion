/**
 * Playwright config — E2E tests para NEM Plataforma.
 * SPEC_TEC_06 §4 — solo Chromium on-merge (T-E2E-01..07).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3000';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  // IMPL-20260820-02 (QA-20260820-01 §D P3-B): los specs E2E viven en ./e2e/
  // (no en ./tests/e2e/, que está vacío). Cambio mínimo de testDir para que
  // `pnpm exec playwright test e2e/ia-f1.spec.ts --list` los descubra.
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // T-E2E-01: viewport 360x640 usable
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: /mobile\.(spec|test)\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: Number(PORT),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
