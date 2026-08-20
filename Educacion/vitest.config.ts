/**
 * Vitest config — unit + integration tests.
 * SPEC_TEC_06 §3 — cobertura objetivo: ≥80% lógica de negocio, ≥90% route handlers.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/helpers/vitest-setup.ts'],
    include: [
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
      'tests/smoke/**/*.{test,spec}.{ts,tsx}',
      'components/**/*.{test,spec}.{ts,tsx}',
      'lib/**/*.{test,spec}.{ts,tsx}',
      'services/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/',
      '.next/',
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'stores/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/**',
        'app/manifest.ts',
        'app/icon.tsx',
        'app/opengraph-image.tsx',
      ],
      thresholds: {
        // SPEC_TEC_06 §3.2: ≥80% lógica de negocio
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});
