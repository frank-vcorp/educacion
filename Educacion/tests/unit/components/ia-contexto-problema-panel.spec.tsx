/**
 * Unit: components/ia/ia-contexto-problema-panel — AC-12 a AC-16.
 *
 * SPEC_TEC_10 §11 — IMPL-20260820-06.
 *  - AC-12: botón deshabilitado sin problema.
 *  - AC-13: fetch con body correcto + anti-doble-submit.
 *  - AC-14 (P-PD9): ningún onApply* automático; aplicar problema no afecta otros.
 *  - AC-15 (invalidación): cambiar modalidad → badge + Regenerar; aceptados NO se borran.
 *  - AC-16 (no invalidación por propósito): cambiar sólo propósito → no desactualiza.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IAContextoProblemaPanel } from '@/components/ia/ia-contexto-problema-panel';

let pendingFetch: { resolve: (v: Response) => void; reject: (e: unknown) => void } | null =
  null;

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
  modalidad: 'rincones',
  problemaContexto: 'a los niños les cuesta compartir',
  proposito: '',
  ajustesRazonables: '',
  nivel: 'preescolar' as const,
  onApplyProblema: vi.fn(),
  onApplyProposito: vi.fn(),
  onApplyAjustes: vi.fn(),
};

function setupFetchOk(body: unknown) {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  fetchMock.mockImplementation(async () =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
}

describe('IAContextoProblemaPanel — AC-12..AC-16', () => {
  // AC-12
  it('AC-12: con problemaContexto vacío, el botón "Pedir sugerencia" está deshabilitado', () => {
    render(
      <IAContextoProblemaPanel
        {...PROPS_BASE}
        problemaContexto=""
      />,
    );
    const btn = screen.getByTestId('ia-panel-f0-solicitar');
    expect(btn).toBeDisabled();
  });

  // AC-13: fetch correcto + anti-doble-submit
  it('AC-13: click dispara fetch con body conteniendo modalidad y problema; 2º click bloqueado', async () => {
    const user = userEvent.setup();
    render(<IAContextoProblemaPanel {...PROPS_BASE} />);

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const captured: { resolve: ((v: Response) => void) | null } = { resolve: null };
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          captured.resolve = resolve;
        }),
    );

    const btn = screen.getByTestId('ia-panel-f0-solicitar');
    expect(btn).toBeEnabled();

    await user.click(btn);
    expect(btn).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 2º click (forzado) sobre botón disabled es no-op.
    await user.click(btn).catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Verificamos el body enviado.
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(init?.body ?? '{}'));
    expect(body.modalidad).toBe('rincones');
    expect(body.problema_contexto).toBe('a los niños les cuesta compartir');
    expect(body.nivel).toBe('preescolar');

    const resolver = captured.resolve;
    if (resolver) {
      resolver(
        new Response(
          JSON.stringify({
            data: {
              problema_estructurado: 'Pregunta detonadora.',
              proposito: 'Propósito.',
              ajustes_razonables: 'Ajustes.',
              origen: 'ia',
            },
          }),
          { status: 200 },
        ),
      );
    }
  });

  // AC-14: no autocompletar (P-PD9)
  it('AC-14: al recibir respuesta, ningún onApply* se llama automáticamente', async () => {
    const user = userEvent.setup();
    const onApplyProblema = vi.fn();
    const onApplyProposito = vi.fn();
    const onApplyAjustes = vi.fn();
    render(
      <IAContextoProblemaPanel
        {...PROPS_BASE}
        onApplyProblema={onApplyProblema}
        onApplyProposito={onApplyProposito}
        onApplyAjustes={onApplyAjustes}
      />,
    );
    setupFetchOk({
      data: {
        problema_estructurado: 'P',
        proposito: 'R',
        ajustes_razonables: 'A',
        origen: 'ia',
      },
    });

    const btn = screen.getByTestId('ia-panel-f0-solicitar');
    await user.click(btn);

    // Esperar a que la promesa del fetch se resuelva.
    await act(async () => {
      await Promise.resolve();
    });

    expect(onApplyProblema).not.toHaveBeenCalled();
    expect(onApplyProposito).not.toHaveBeenCalled();
    expect(onApplyAjustes).not.toHaveBeenCalled();
  });

  // AC-14: aplicar problema no afecta los otros
  it('AC-14: pulsar "Usar esta propuesta" en bloque problema sólo invoca onApplyProblema', async () => {
    const user = userEvent.setup();
    const onApplyProblema = vi.fn();
    const onApplyProposito = vi.fn();
    const onApplyAjustes = vi.fn();
    render(
      <IAContextoProblemaPanel
        {...PROPS_BASE}
        onApplyProblema={onApplyProblema}
        onApplyProposito={onApplyProposito}
        onApplyAjustes={onApplyAjustes}
      />,
    );
    setupFetchOk({
      data: {
        problema_estructurado: 'Pregunta clara.',
        proposito: 'Propósito.',
        ajustes_razonables: 'Ajustes.',
        origen: 'ia',
      },
    });
    await user.click(screen.getByTestId('ia-panel-f0-solicitar'));
    await act(async () => {
      await Promise.resolve();
    });

    await user.click(screen.getByTestId('ia-panel-f0-usar-problema'));
    expect(onApplyProblema).toHaveBeenCalledWith('Pregunta clara.');
    expect(onApplyProposito).not.toHaveBeenCalled();
    expect(onApplyAjustes).not.toHaveBeenCalled();
  });

  // AC-15: cambiar modalidad tras generar → badge + Regenerar; aceptados NO se borran
  it('AC-15: cambiar modalidad tras generar → badge desactualizada + botón Regenerar; onApply* ya aceptados no se revierten', async () => {
    const user = userEvent.setup();
    const onApplyProblema = vi.fn();
    const onApplyProposito = vi.fn();
    const onApplyAjustes = vi.fn();

    const { rerender } = render(
      <IAContextoProblemaPanel
        {...PROPS_BASE}
        modalidad="rincones"
        onApplyProblema={onApplyProblema}
        onApplyProposito={onApplyProposito}
        onApplyAjustes={onApplyAjustes}
      />,
    );
    setupFetchOk({
      data: {
        problema_estructurado: 'Pregunta clara.',
        proposito: 'Propósito.',
        ajustes_razonables: 'Ajustes.',
        origen: 'ia',
      },
    });
    await user.click(screen.getByTestId('ia-panel-f0-solicitar'));
    await act(async () => {
      await Promise.resolve();
    });

    // Aceptar problema y propósito.
    await user.click(screen.getByTestId('ia-panel-f0-usar-problema'));
    await user.click(screen.getByTestId('ia-panel-f0-usar-proposito'));
    expect(onApplyProblema).toHaveBeenCalledTimes(1);
    expect(onApplyProposito).toHaveBeenCalledTimes(1);

    // Cambiar modalidad → debe aparecer badge + botón Regenerar.
    rerender(
      <IAContextoProblemaPanel
        {...PROPS_BASE}
        modalidad="abj"
        onApplyProblema={onApplyProblema}
        onApplyProposito={onApplyProposito}
        onApplyAjustes={onApplyAjustes}
      />,
    );

    expect(screen.getByTestId('ia-panel-f0-desactualizada')).toBeInTheDocument();
    expect(screen.getByTestId('ia-panel-f0-regenerar')).toBeInTheDocument();
    // Aceptados previos no se borran.
    expect(screen.getByTestId('ia-panel-f0-aceptado-problema')).toBeInTheDocument();
    expect(screen.getByTestId('ia-panel-f0-aceptado-proposito')).toBeInTheDocument();

    // onApply* ya aceptados no se vuelven a invocar automáticamente.
    expect(onApplyProblema).toHaveBeenCalledTimes(1);
    expect(onApplyProposito).toHaveBeenCalledTimes(1);
  });

  // AC-15b: cambiar problema_contexto tras generar → badge + Regenerar.
  it('AC-15b: cambiar problema_contexto tras generar → badge desactualizada', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<IAContextoProblemaPanel {...PROPS_BASE} />);
    setupFetchOk({
      data: {
        problema_estructurado: 'P',
        proposito: 'R',
        ajustes_razonables: 'A',
        origen: 'ia',
      },
    });
    await user.click(screen.getByTestId('ia-panel-f0-solicitar'));
    await act(async () => {
      await Promise.resolve();
    });

    rerender(<IAContextoProblemaPanel {...PROPS_BASE} problemaContexto="Texto nuevo" />);

    expect(screen.getByTestId('ia-panel-f0-desactualizada')).toBeInTheDocument();
    expect(screen.getByTestId('ia-panel-f0-regenerar')).toBeInTheDocument();
  });

  // AC-16: cambiar sólo propósito no invalida
  it('AC-16: cambiar sólo proposito tras generar → NO aparece badge desactualizada', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<IAContextoProblemaPanel {...PROPS_BASE} proposito="" />);
    setupFetchOk({
      data: {
        problema_estructurado: 'P',
        proposito: 'R',
        ajustes_razonables: 'A',
        origen: 'ia',
      },
    });
    await user.click(screen.getByTestId('ia-panel-f0-solicitar'));
    await act(async () => {
      await Promise.resolve();
    });

    rerender(<IAContextoProblemaPanel {...PROPS_BASE} proposito="Nuevo propósito" />);
    expect(screen.queryByTestId('ia-panel-f0-desactualizada')).toBeNull();
    expect(screen.queryByTestId('ia-panel-f0-regenerar')).toBeNull();
  });

  // AC-16b: cambiar sólo ajustes_razonables no invalida
  it('AC-16b: cambiar sólo ajustesRazonables → NO aparece badge desactualizada', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <IAContextoProblemaPanel {...PROPS_BASE} ajustesRazonables="" />,
    );
    setupFetchOk({
      data: {
        problema_estructurado: 'P',
        proposito: 'R',
        ajustes_razonables: 'A',
        origen: 'ia',
      },
    });
    await user.click(screen.getByTestId('ia-panel-f0-solicitar'));
    await act(async () => {
      await Promise.resolve();
    });

    rerender(
      <IAContextoProblemaPanel {...PROPS_BASE} ajustesRazonables="Nuevos ajustes" />,
    );
    expect(screen.queryByTestId('ia-panel-f0-desactualizada')).toBeNull();
  });
});
