/**
 * Unit tests — `app/(app)/dashboard/page.tsx` (FIX-20260823-01).
 *
 * Verifica la redirección del dashboard según el estado de la sesión:
 *
 *  - Sin sesión → `/login` (intacto).
 *  - Sesión autenticada SIN fila `docente` → `/onboarding/cct`
 *    (FIX: antes redirigía erróneamente a `/login`, lo que combinando
 *    con el middleware (auth user + auth route → /dashboard)
 *    producía un bucle login↔dashboard).
 *
 * Estos tests no tocan Supabase ni planeaciones/recursos porque el
 * redirect debe ocurrir ANTES de cualquier query — por eso mockeamos
 * `@/services/planeaciones/planeacion-actions`,
 * `@/services/recursos-aula/recurso-actions` y
 * `@/lib/supabase/server` y afirmamos que NO se llaman.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capturadores de redirect.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`__redirect:${url}__`);
});
let getServerSessionResult: unknown = null;

const listPlaneacionesMock = vi.fn();
const listRecursosMock = vi.fn();
const fromMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(async () => getServerSessionResult),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (...args: unknown[]) => {
      fromMock(...args);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

vi.mock('@/services/planeaciones/planeacion-actions', () => ({
  listPlaneaciones: (...args: unknown[]) => {
    listPlaneacionesMock(...args);
    return Promise.resolve({ items: [], nextCursor: null });
  },
}));

vi.mock('@/services/recursos-aula/recurso-actions', () => ({
  listRecursos: (...args: unknown[]) => {
    listRecursosMock(...args);
    return Promise.resolve({ items: [], nextCursor: null });
  },
}));

// Después de los mocks para no romper el hoisting.
import DashboardPage from '@/app/(app)/dashboard/page';

beforeEach(() => {
  redirectMock.mockClear();
  listPlaneacionesMock.mockClear();
  listRecursosMock.mockClear();
  fromMock.mockClear();
});

describe('dashboard/page.tsx — redirección (FIX-20260823-01)', () => {
  it('sin sesión → redirige a /login', async () => {
    getServerSessionResult = null;
    await expect(DashboardPage()).rejects.toThrow('__redirect:/login__');
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('autenticado SIN docenteId → redirige a /onboarding/cct (FIX)', async () => {
    // FIX-20260823-01: antes redirigía a /login. Ahora va a
    // /onboarding/cct para que saveCCT cree la fila docente.
    getServerSessionResult = {
      user: { id: 'user-1' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    await expect(DashboardPage()).rejects.toThrow(
      '__redirect:/onboarding/cct__',
    );
    expect(redirectMock).toHaveBeenCalledWith('/onboarding/cct');
  });

  it('autenticado SIN docenteId NO redirige a /login (anti-loop)', async () => {
    getServerSessionResult = {
      user: { id: 'user-2' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    try {
      await DashboardPage();
    } catch {
      // ignorar throw de redirect mock
    }
    const calledUrls = redirectMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).not.toContain('/login');
    expect(calledUrls).toContain('/onboarding/cct');
  });

  it('autenticado SIN docenteId NO consulta planeaciones/recursos (FIX efficiency)', async () => {
    // Tras el redirect temprano, no debe invocarse el servicio de
    // planeaciones ni el de recursos — antes, el redirect ocurría
    // después y consumía queries.
    getServerSessionResult = {
      user: { id: 'user-3' },
      docenteId: null,
      cct: null,
      hasAcceptedAviso: false,
      hasGrupoActivo: false,
    };
    try {
      await DashboardPage();
    } catch {
      // ignorar throw de redirect mock
    }
    expect(listPlaneacionesMock).not.toHaveBeenCalled();
    expect(listRecursosMock).not.toHaveBeenCalled();
  });

  it('autenticado CON docenteId NO redirige (puede renderizar)', async () => {
    getServerSessionResult = {
      user: { id: 'user-4' },
      docenteId: 'docente-uuid-4',
      cct: '22DJN0059R',
      hasAcceptedAviso: true,
      hasGrupoActivo: true,
    };
    // Renderiza sin lanzar (JSX válido).
    const node = await DashboardPage();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(node).toBeTruthy();
    // Las queries sí se invocan cuando hay docente.
    expect(listPlaneacionesMock).toHaveBeenCalledWith('docente-uuid-4');
    expect(listRecursosMock).toHaveBeenCalledWith('docente-uuid-4');
  });
});
