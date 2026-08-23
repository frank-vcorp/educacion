/**
 * Unit tests — `app/(app)/onboarding/_components/onboarding-shell.tsx`
 * (FIX-20260823-01).
 *
 * Verifica que el shell de onboarding:
 *  - Bloquea la entrada sólo cuando NO hay sesión (no cuando falta
 *    `docenteId`).
 *  - Renderiza el paso 2 (CCT) cuando el usuario está autenticado pero
 *    aún no tiene fila en `docente` (caso típico post-confirmación de
 *    email con magic link). Antes redirigía erróneamente a `/login`,
 *    generando el bucle login↔dashboard. Ahora `ctx.docenteId` se
 *    llena con `session.user.id` y la ausencia de fila `docente` no
 *    impide renderizar el picker.
 *  - No se auto-redirige a `/onboarding/cct` cuando ya se está
 *    renderizando ese mismo paso (auto-redirect bug previo a 3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// Capturadores de redirect.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`__redirect:${url}__`);
});

let getServerSessionResult: unknown = null;
type Row = Record<string, unknown>;
let docenteRow: Row | null = null;
let grupoRows: Row[] = [];

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(async () => getServerSessionResult),
}));

// Mock del cliente Supabase server-side: devolvemos sólo las dos
// queries que el shell ejecuta contra `docente` y `grupo`.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'docente') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: docenteRow, error: null }),
            }),
          }),
        };
      }
      if (table === 'grupo') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: grupoRows, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { OnboardingShell } from '@/app/(app)/onboarding/_components/onboarding-shell';

beforeEach(() => {
  redirectMock.mockClear();
  docenteRow = null;
  grupoRows = [];
});

describe('onboarding-shell — FIX-20260823-01', () => {
  it('sin sesión → redirige a /login?redirect=/onboarding', async () => {
    getServerSessionResult = null;
    await expect(OnboardingShell({ paso: 2, children: () => null })).rejects.toThrow(
      '__redirect:/login?redirect=/onboarding__',
    );
    expect(redirectMock).toHaveBeenCalledWith('/login?redirect=/onboarding');
  });

  it('sesión autenticada SIN docente renderiza paso 2 (CCT) sin redirect', async () => {
    getServerSessionResult = {
      user: { id: 'user-1' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    docenteRow = null;
    grupoRows = [];

    // No debe lanzar; debe devolver JSX renderizable.
    const node = await OnboardingShell({
      paso: 2,
      children: () => null,
    });

    const html = renderToStaticMarkup(node);
    expect(html).toContain('Paso 2 de 5');
    expect(html).toContain('CCT');
    // El shell no debe haber llamado redirect().
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('sesión sin docente NUNCA redirige a /login (FIX anti-loop)', async () => {
    getServerSessionResult = {
      user: { id: 'user-2' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    docenteRow = null;
    grupoRows = [];

    try {
      await OnboardingShell({ paso: 2, children: () => null });
    } catch {
      // cualquier throw que no sea redirect es inesperado, pero
      // toleramos para inspeccionar las redirecciones.
    }
    const calledUrls = redirectMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).not.toContain('/login');
    expect(calledUrls).not.toContain('/login?redirect=/onboarding');
    expect(calledUrls).not.toContain('/registro');
  });

  it('ctx.docenteId usa session.user.id como docenteId contextual', async () => {
    getServerSessionResult = {
      user: { id: 'user-contextual-uuid' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    docenteRow = null;
    grupoRows = [];

    let captured: { docenteId: string } | null = null;
    await OnboardingShell({
      paso: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: (ctx: any) => {
        captured = ctx;
        return null;
      },
    });
    expect(captured).not.toBeNull();
    expect(captured!.docenteId).toBe('user-contextual-uuid');
  });

  it('paso 2 con cct vacío NO se auto-redirige (FIX)', async () => {
    // Antes: `if (paso >= 2 && !docente?.cct) redirect('/onboarding/cct')`
    // provocaba auto-bucle cuando se renderizaba el propio picker.
    getServerSessionResult = {
      user: { id: 'user-3' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    docenteRow = { id: 'user-3', cct: '', nivel: 'preescolar' };

    const node = await OnboardingShell({
      paso: 2,
      children: () => null,
    });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(node)).toContain('Paso 2 de 5');
  });

  it('paso 3 SIN cct guardado redirige a /onboarding/cct (defensa intacta)', async () => {
    getServerSessionResult = {
      user: { id: 'user-4' },
      docenteId: 'docente-uuid-4',
      cct: null,
      hasAcceptedAviso: true,
      hasGrupoActivo: false,
    };
    docenteRow = { id: 'user-4', cct: null, nivel: 'preescolar' };

    await expect(OnboardingShell({ paso: 3, children: () => null })).rejects.toThrow(
      '__redirect:/onboarding/cct__',
    );
    expect(redirectMock).toHaveBeenCalledWith('/onboarding/cct');
  });
});
