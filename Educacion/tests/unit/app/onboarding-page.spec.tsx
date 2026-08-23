/**
 * Unit tests — `app/(app)/onboarding/page.tsx` (FIX-20260822-01).
 *
 * Verifica la redirección según el estado de la sesión:
 *
 *  - Sin sesión autenticada → `/login?redirect=/onboarding` (sin cambios).
 *  - Sesión autenticada SIN fila en `docente` → `/onboarding/cct`
 *    (FIX: antes redirigía erróneamente a `/registro`, impidiendo crear
 *    la fila docente porque `saveCCT` es lo primero que la persiste).
 *  - Sesión autenticada CON fila en `docente` → `/onboarding/cct`
 *    (sin cambios, comportamiento previo).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capturamos la redirección para inspeccionar el destino.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`__redirect:${url}__`);
});
let getServerSessionResult: unknown = null;

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(async () => getServerSessionResult),
}));

import OnboardingPaso1 from '@/app/(app)/onboarding/page';

beforeEach(() => {
  redirectMock.mockClear();
});

describe('onboarding/page.tsx — redirección (FIX-20260822-01)', () => {
  it('sin sesión → redirige a /login?redirect=/onboarding', async () => {
    getServerSessionResult = null;
    await expect(OnboardingPaso1()).rejects.toThrow(
      '__redirect:/login?redirect=/onboarding__',
    );
    expect(redirectMock).toHaveBeenCalledWith('/login?redirect=/onboarding');
  });

  it('autenticado SIN docenteId → redirige a /onboarding/cct (FIX)', async () => {
    // FIX-20260822-01: antes redirigía a /registro. Ahora a /onboarding/cct
    // para que saveCCT pueda crear la fila docente.
    getServerSessionResult = {
      user: { id: 'user-1' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    await expect(OnboardingPaso1()).rejects.toThrow('__redirect:/onboarding/cct__');
    expect(redirectMock).toHaveBeenCalledWith('/onboarding/cct');
  });

  it('autenticado CON docenteId → redirige a /onboarding/cct', async () => {
    getServerSessionResult = {
      user: { id: 'user-2' },
      docenteId: 'docente-uuid-2',
      cct: '22DJN0059R',
      hasAcceptedAviso: true,
      hasGrupoActivo: true,
    };
    await expect(OnboardingPaso1()).rejects.toThrow('__redirect:/onboarding/cct__');
    expect(redirectMock).toHaveBeenCalledWith('/onboarding/cct');
  });

  it('autenticado SIN docenteId NUNCA redirige a /registro (FIX)', async () => {
    getServerSessionResult = {
      user: { id: 'user-3' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    try {
      await OnboardingPaso1();
    } catch {
      // ignorar el throw del redirect mock
    }
    const calledUrls = redirectMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).not.toContain('/registro');
    expect(calledUrls).toContain('/onboarding/cct');
  });
});
