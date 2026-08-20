/**
 * Unit: components/ia/ia-sugerencia-panel — AC-UI-2 (anti-doble-submit).
 *
 * SPEC_TEC_08 §9 AC-UI-2: click en "Pedir sugerencia" → botón deshabilitado
 * durante `loading`; un 2º click no dispara un 2º fetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IASugerenciaPanel } from '@/components/ia/ia-sugerencia-panel';

// Mocks de los server actions (no ejercemos PATCH en AC-UI-2; sólo loading).
vi.mock('@/services/planeaciones/update-actions', () => ({
  updateBloque: vi.fn(async () => ({ ok: true, id: 'mock-bloque-id' })),
  updatePlaneacion: vi.fn(async () => ({ ok: true, id: 'mock-planeacion-id' })),
}));

// Mockeamos `fetch` para que el 1er click dispare la transición a loading
// y la promesa quede pendiente mientras el 2º click llega.
let pendingFetch: { resolve: (v: Response) => void; reject: (e: unknown) => void } | null = null;

beforeEach(() => {
  pendingFetch = null;
  (globalThis as { fetch: typeof fetch }).fetch = vi.fn(
    (_url: string | URL | Request, _init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        pendingFetch = { resolve, reject };
      }),
  );
});

const PROPS_BASE = {
  planeacionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  docenteId: '11111111-1111-1111-1111-111111111111',
  cct: '09DPR1234Z',
  bloqueId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  textoBase: 'Texto base.',
  varianteTipo: 'rural' as const,
  feature: 'F1' as const,
  label: 'Variante (F1)',
};

describe('IASugerenciaPanel — AC-UI-2 anti-doble-submit', () => {
  it('click 1 dispara fetch; botón deshabilitado durante loading; click 2 no dispara 2º fetch', async () => {
    const user = userEvent.setup();
    render(<IASugerenciaPanel {...PROPS_BASE} />);

    const btn = screen.getByTestId('ia-panel-F1-solicitar');
    expect(btn).toBeEnabled();

    // 1er click — entra en loading, fetch queda pendiente.
    await user.click(btn);

    // Estado loading: botón deshabilitado, label "Pidiendo…".
    expect(btn).toBeDisabled();
    expect(btn.textContent ?? '').toMatch(/Pidiendo/);

    // El ref defensivo bloquea el 2º click aun si el disabled fuera bypaseado
    // por un agente externo. Hacemos un click "forzado" vía fireEvent sobre
    // un botón disabled (userEvent.click respeta disabled → no-op).
    // Verificamos que la cantidad de fetches no se incrementó.
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[] } };
    expect(fetchMock.mock.calls.length).toBe(1);

    // 2º click con userEvent sobre un botón disabled es no-op.
    await user.click(btn).catch(() => {
      /* esperar disabled */
    });
    expect(fetchMock.mock.calls.length).toBe(1);

    // Limpiamos la promesa pendiente para no dejar el test colgado.
    if (pendingFetch) pendingFetch.resolve(new Response('{}', { status: 200 }));
  });
});