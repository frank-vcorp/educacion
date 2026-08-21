/**
 * Unit: app/(app)/alumnos/entrevista-dialog-content — FIX-20260820-03.
 *
 * Regresión del crash de producción `/alumnos` (React error #482 = async
 * Client Component):
 *   - `EntrevistaDialogContent` es un Client Component NO async.
 *   - Carga la entrevista existente vía server action `getEntrevista`
 *     (invocable desde cliente) con estados loading / error / ready.
 *   - Sin `use()` ni await en render.
 *
 * Prueba de carga/modal:
 *   - Loading mientras la acción no resuelve.
 *   - Ready con entrevista existente → form pre-poblado.
 *   - Ready sin entrevista (data:null) → form vacío.
 *   - Error de la acción → estado de error con reintento funcional.
 *   - Integración con `AlumnosManager`: el botón "Entrevista" de la fila
 *     abre el modal y el resto de botones de alumnos sigue funcionando.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntrevistaDialogContent } from '@/app/(app)/alumnos/entrevista-dialog-content';
import { AlumnosManager } from '@/app/(app)/alumnos/alumnos-manager';
import {
  buildRespuestasVaciasV2,
  buildDirectorioVacio,
} from '@/types/entrevista';

// ============ Mocks de server actions ============

vi.mock('@/services/alumnos/entrevista-actions', () => ({
  getEntrevista: vi.fn(),
  upsertEntrevista: vi.fn(async () => ({ ok: true, id: 'mock-id' })),
  archivarEntrevista: vi.fn(async () => ({ ok: true, data: null })),
}));

vi.mock('@/services/alumnos/alumno-actions', () => ({
  createAlumno: vi.fn(async () => ({ ok: true, id: 'new-alumno-id' })),
  updateAlumno: vi.fn(async () => ({ ok: true })),
  deleteAlumno: vi.fn(async () => ({ ok: true })),
  bulkAddAlumnos: vi.fn(async () => ({ ok: true, count: 0 })),
}));

// ============ Fixtures ============

function filaEntrevistaExistente() {
  const respuestas = buildRespuestasVaciasV2({ nombreAlumno: 'Alumno Demo' });
  respuestas.entrevista_inicial.items = respuestas.entrevista_inicial.items.map(
    (it) => (it.orden === 1 ? { ...it, respuesta: 'Respuesta persistida' } : it),
  );
  return {
    id: 'entrevista-1',
    alumno_id: 'alumno-1',
    grupo_id: 'grupo-1',
    docente_id: 'docente-1',
    cct: 'CCT123',
    ciclo_escolar: '2025-2026',
    tipo_entrevista: 'nino' as const,
    respuestas,
    directorio: buildDirectorioVacio({ nombreAlumno: 'Alumno Demo' }),
    fecha_aplicacion: '2026-08-01',
    estado: 'borrador' as const,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  };
}

const PROPS_BASE = {
  alumnoId: 'alumno-1',
  alumnoNombre: 'Alumno Demo',
  alumnoGrado: '1°',
  avisoAceptado: true,
  onSaved: vi.fn(),
  onError: vi.fn(),
};

async function importGetEntrevista() {
  const { getEntrevista } = await import('@/services/alumnos/entrevista-actions');
  return getEntrevista as unknown as ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============ Regresión #482 ============

describe('EntrevistaDialogContent — regresión React error #482', () => {
  it('el componente NO es una función async (Client Component)', () => {
    expect(typeof EntrevistaDialogContent).toBe('function');
    expect((EntrevistaDialogContent as unknown as Function).constructor.name).not.toBe(
      'AsyncFunction',
    );
  });
});

// ============ Carga vía server action ============

describe('EntrevistaDialogContent — carga de la entrevista existente', () => {
  it('muestra el estado loading mientras getEntrevista no resuelve', async () => {
    const getEntrevista = await importGetEntrevista();
    let resolveAction!: (v: unknown) => void;
    getEntrevista.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    render(<EntrevistaDialogContent {...PROPS_BASE} />);
    expect(screen.getByTestId('entrevista-dialog-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('entrevista-form')).not.toBeInTheDocument();

    // Resuelve y transiciona a ready.
    resolveAction({ ok: true, data: null });
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-form')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('entrevista-dialog-loading')).not.toBeInTheDocument();
  });

  it('invoca getEntrevista con el alumnoId al montar', async () => {
    const getEntrevista = await importGetEntrevista();
    getEntrevista.mockResolvedValue({ ok: true, data: null });

    render(<EntrevistaDialogContent {...PROPS_BASE} />);
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-form')).toBeInTheDocument();
    });
    expect(getEntrevista).toHaveBeenCalledTimes(1);
    expect(getEntrevista).toHaveBeenCalledWith('alumno-1');
  });

  it('ready con entrevista existente: pre-pobla el form con la fila cargada', async () => {
    const getEntrevista = await importGetEntrevista();
    getEntrevista.mockResolvedValue({ ok: true, data: filaEntrevistaExistente() });

    render(<EntrevistaDialogContent {...PROPS_BASE} />);
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-form')).toBeInTheDocument();
    });

    // La respuesta persistida del ítem 1 se muestra en el input.
    const item1 = screen.getByTestId('entrevista-item-1');
    const input1 = within(item1).getByLabelText(/respuesta 1/i) as HTMLInputElement;
    expect(input1.value).toBe('Respuesta persistida');

    // La fecha de aplicación cargada se pre-pobla.
    const fecha = screen.getByLabelText(/fecha de aplicación/i) as HTMLInputElement;
    expect(fecha.value).toBe('2026-08-01');
  });

  it('ready sin entrevista (data:null): renderiza el form vacío', async () => {
    const getEntrevista = await importGetEntrevista();
    getEntrevista.mockResolvedValue({ ok: true, data: null });

    render(<EntrevistaDialogContent {...PROPS_BASE} />);
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-form')).toBeInTheDocument();
    });
    const item1 = screen.getByTestId('entrevista-item-1');
    const input1 = within(item1).getByLabelText(/respuesta 1/i) as HTMLInputElement;
    expect(input1.value).toBe('');
  });

  it('error de la acción: muestra estado de error y el reintento recarga', async () => {
    const user = userEvent.setup();
    const getEntrevista = await importGetEntrevista();
    getEntrevista
      .mockResolvedValueOnce({ ok: false, error: 'Alumno no encontrado' })
      .mockResolvedValueOnce({ ok: true, data: null });

    render(<EntrevistaDialogContent {...PROPS_BASE} />);

    await waitFor(() => {
      expect(screen.getByTestId('entrevista-dialog-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Alumno no encontrado')).toBeInTheDocument();
    expect(screen.queryByTestId('entrevista-form')).not.toBeInTheDocument();

    // Reintento: vuelve a invocar la acción y llega a ready.
    await user.click(screen.getByTestId('entrevista-dialog-reintentar'));
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-form')).toBeInTheDocument();
    });
    expect(getEntrevista).toHaveBeenCalledTimes(2);
  });

  it('excepción de red de la acción: estado de error controlado', async () => {
    const getEntrevista = await importGetEntrevista();
    getEntrevista.mockRejectedValue(new Error('network down'));

    render(<EntrevistaDialogContent {...PROPS_BASE} />);
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-dialog-error')).toBeInTheDocument();
    });
    expect(screen.getByText('No se pudo cargar la entrevista')).toBeInTheDocument();
  });

  it('gate A1: con aviso no aceptado el form carga deshabilitado con banner', async () => {
    const getEntrevista = await importGetEntrevista();
    getEntrevista.mockResolvedValue({ ok: true, data: null });

    render(<EntrevistaDialogContent {...PROPS_BASE} avisoAceptado={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-gate-aviso')).toBeInTheDocument();
    });
  });
});

// ============ Integración modal en AlumnosManager ============

describe('AlumnosManager — modal de entrevista y botones de alumnos', () => {
  const MANAGER_PROPS = {
    initialAlumnos: [
      { id: 'alumno-1', nombre: 'Ana Torres' },
      { id: 'alumno-2', nombre: 'Bruno Díaz' },
    ],
    grupo: { id: 'grupo-1', grado: '1°', grupo: 'A', ciclo_escolar: '2025-2026' },
    avisoAceptado: true,
  };

  it('el botón Entrevista de la fila abre el modal, muestra loading y luego el form', async () => {
    const user = userEvent.setup();
    const getEntrevista = await importGetEntrevista();
    getEntrevista.mockResolvedValue({ ok: true, data: null });

    render(<AlumnosManager {...MANAGER_PROPS} />);

    // El botón de entrevista por fila existe.
    const btn = screen.getByTestId('entrevista-button-alumno-1');
    await user.click(btn);

    // El modal abre con el título del alumno y pasa por loading.
    await waitFor(() => {
      expect(screen.getByText(/Entrevista inicial — Ana Torres/)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.queryByTestId('entrevista-dialog-loading') ??
          screen.queryByTestId('entrevista-form'),
      ).not.toBeNull();
    });

    // Resuelve la carga y el form queda dentro del modal.
    await waitFor(() => {
      expect(screen.getByTestId('entrevista-form')).toBeInTheDocument();
    });
    expect(getEntrevista).toHaveBeenCalledWith('alumno-1');
  });

  it('los demás botones de alumnos siguen funcionando (agregar/editar/eliminar)', async () => {
    const user = userEvent.setup();
    render(<AlumnosManager {...MANAGER_PROPS} />);

    // Agregar alumno abre su modal.
    await user.click(screen.getByRole('button', { name: /agregar alumno/i }));
    await waitFor(() => {
      expect(screen.getByText(/captura el nombre del alumno/i)).toBeInTheDocument();
    });
    await user.keyboard('{Escape}');

    // Agregar varios abre su modal.
    await user.click(screen.getByRole('button', { name: /agregar varios/i }));
    await waitFor(() => {
      expect(screen.getByText(/escribe un nombre por línea/i)).toBeInTheDocument();
    });
    await user.keyboard('{Escape}');

    // Editar de la fila 1 abre su modal con el nombre precargado.
    await user.click(screen.getByRole('button', { name: 'Editar Ana Torres' }));
    await waitFor(() => {
      expect(
        (screen.getByDisplayValue('Ana Torres') as HTMLInputElement).value,
      ).toBe('Ana Torres');
    });
    await user.keyboard('{Escape}');

    // Eliminar de la fila 2 abre la confirmación.
    await user.click(screen.getByRole('button', { name: 'Eliminar Bruno Díaz' }));
    await waitFor(() => {
      expect(screen.getByText(/¿Eliminar alumno\?/)).toBeInTheDocument();
    });
  });
});
