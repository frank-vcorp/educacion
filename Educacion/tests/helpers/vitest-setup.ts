/**
 * Vitest setup — jest-dom matchers, mocks globales.
 * SPEC_TEC_06 §3: unit + integration tests con cobertura.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom no implementa ResizeObserver (necesario para Radix Select/Tabs).
// IMPL-20260821-05 — los form components usan @radix-ui (incluye
// `useSize` que requiere ResizeObserver). Polyfill mínimo antes de los tests.
if (typeof window !== 'undefined' && typeof (window as unknown as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  (window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
}

// Cleanup automático después de cada test (RTL).
// Limpiamos también `sessionStorage` para evitar contaminación entre tests
// del IMPL-20260821-01 (la entrevista usa sessionStorage como borrador
// temporal por alumnoId).
afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') window.sessionStorage.clear();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) =>
    // eslint-disable-next-line @next/next/no-img-element
    ({ type: 'img', props: { src, alt, ...props } }) as unknown,
}));

// Variables de entorno para tests
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.AI_API_KEY ||= 'test-ai-key';
process.env.AI_PROVIDER ||= 'minimax';
process.env.AI_BASE_URL ||= 'https://api.example.test/v1';
process.env.AI_MODEL ||= 'test-model';
process.env.AI_TIMEOUT_MS ||= '8000';
process.env.AI_RATE_LIMIT_BACKEND ||= 'memory';
process.env.AI_RATE_LIMIT ||= '5';
process.env.JWT_SECRET ||= 'test-jwt-secret-32-chars-minimum-for-tests';
