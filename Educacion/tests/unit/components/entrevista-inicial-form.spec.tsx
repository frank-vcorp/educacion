/**
 * Unit: components/alumnos/entrevista-inicial-form — SPEC_TEC_09 §7.
 *
 * IMPL-20260820-03 — AC-UI:
 *  - Renderiza los 21 ítems en orden literal (AC-7, AC-9 spec).
 *  - El texto de la pregunta NO es editable.
 *  - Botones deshabilitados durante la transición (anti-doble-submit).
 *  - Si la docente NO aceptó el aviso, se muestra el gate y se bloquea el form.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntrevistaInicialForm } from '@/components/alumnos/entrevista-inicial-form';
import { ENTREVISTA_CUESTIONARIO } from '@/types/entrevista';

// Mock server actions
vi.mock('@/services/alumnos/entrevista-actions', () => ({
  upsertEntrevista: vi.fn(async () => ({ ok: true, id: 'mock-id' })),
  archivarEntrevista: vi.fn(async () => ({ ok: true, data: null })),
}));

const PROPS_BASE = {
  alumno: { id: 'alumno-1', nombre: 'Alumno Demo', grado: '1°' },
  grupo: {
    id: 'grupo-1',
    grado: '1°',
    grupo: 'A',
    ciclo_escolar: '2025-2026',
  },
  avisoAceptado: true,
  onSaved: vi.fn(),
  onError: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EntrevistaInicialForm — AC-7, AC-9 (UI)', () => {
  it('AC-7: renderiza los 21 ítems en orden literal', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    // Cada ítem debe estar presente con su número y el texto literal.
    for (const q of ENTREVISTA_CUESTIONARIO) {
      const item = screen.getByTestId(`entrevista-item-${q.orden}`);
      // El texto de la pregunta aparece en el Label del ítem.
      expect(within(item).getByText(new RegExp(escapeRegex(q.pregunta)))).toBeInTheDocument();
    }
  });

  it('AC-7: el orden de los ítems en el DOM es ascendente 1..21', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const items = screen.getAllByTestId(/^entrevista-item-/);
    expect(items).toHaveLength(21);
    items.forEach((node, i) => {
      expect(node.getAttribute('data-testid')).toBe(`entrevista-item-${i + 1}`);
    });
  });

  it('AC-7: el texto de la pregunta NO es editable (no es input/textarea)', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    for (const q of ENTREVISTA_CUESTIONARIO) {
      const item = screen.getByTestId(`entrevista-item-${q.orden}`);
      // Label que contiene la pregunta — no debe ser input/textarea en sí.
      const labels = within(item).getAllByText(new RegExp(escapeRegex(q.pregunta)));
      // Sólo el Label contiene el texto, no un input.
      labels.forEach((el) => {
        expect(el.tagName.toLowerCase()).not.toBe('input');
        expect(el.tagName.toLowerCase()).not.toBe('textarea');
      });
    }
  });

  it('AC-UX: gate de aviso muestra banner cuando NO está aceptado', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} avisoAceptado={false} />);
    expect(screen.getByTestId('entrevista-gate-aviso')).toBeInTheDocument();
    // El fieldset debe estar deshabilitado.
    const fieldset = screen.getByRole('group', { name: /cuestionario/i });
    expect(fieldset).toBeDisabled();
  });

  it('AC-UX: ítems 18-21 se pre-pueblan con datos del alumno/grupo', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    // ítem 18 — Nombre del Alumno
    const item18 = screen.getByTestId('entrevista-item-18');
    const input18 = within(item18).getByLabelText(/respuesta 18/i) as HTMLInputElement;
    expect(input18.value).toBe('Alumno Demo');

    // ítem 19 — Grado
    const item19 = screen.getByTestId('entrevista-item-19');
    const input19 = within(item19).getByLabelText(/respuesta 19/i) as HTMLInputElement;
    expect(input19.value).toBe('1°');

    // ítem 20 — Grupo
    const item20 = screen.getByTestId('entrevista-item-20');
    const input20 = within(item20).getByLabelText(/respuesta 20/i) as HTMLInputElement;
    expect(input20.value).toBe('A');

    // ítem 21 — Fecha de aplicación (pre-poblado con hoy)
    const item21 = screen.getByTestId('entrevista-item-21');
    const input21 = within(item21).getByLabelText(/respuesta 21/i) as HTMLInputElement;
    expect(input21.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('P3-2: ítem 19 (Grado) cae a grupo.grado si alumno.grado está vacío', () => {
    // Replica el escenario real: la query de /alumnos NO selecciona `grado`
    // del alumno (sólo id, nombre, created_at). Sin este fallback, el ítem 19
    // queda vacío y la docente lo llena a mano.
    render(
      <EntrevistaInicialForm
        {...PROPS_BASE}
        alumno={{ id: 'alumno-1', nombre: 'Alumno Demo', grado: '' }}
        grupo={{ ...PROPS_BASE.grupo, grado: '2°' }}
      />,
    );
    const item19 = screen.getByTestId('entrevista-item-19');
    const input19 = within(item19).getByLabelText(/respuesta 19/i) as HTMLInputElement;
    expect(input19.value).toBe('2°');
  });

  it('AC-UX: editar respuesta del ítem 7 actualiza el estado interno', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const item7 = screen.getByTestId('entrevista-item-7');
    const input7 = within(item7).getByLabelText(/respuesta 7/i);
    await user.type(input7, 'Azul');
    expect((input7 as HTMLInputElement).value).toBe('Azul');
  });

  it('AC-UX: archivar entrevista invoca la server action', async () => {
    const user = userEvent.setup();
    const { archivarEntrevista } = await import('@/services/alumnos/entrevista-actions');
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const btn = screen.getByTestId('entrevista-archivar');
    await user.click(btn);
    expect(archivarEntrevista).toHaveBeenCalledWith('alumno-1');
  });
});

// ============ Utils ============
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
