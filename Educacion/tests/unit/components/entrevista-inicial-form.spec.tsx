/**
 * Unit: components/alumnos/entrevista-inicial-form — SPEC_TEC_09 §7 (v2).
 *
 * IMPL-20260820-08 — AC-UI:
 *  - Renderiza los 3 bloques del documento literal en orden:
 *      (1) Entrevista inicial: 23 ítems en orden literal.
 *      (2) Ambiente Familiar / Escuela: 16 celdas (2 instrucciones de dibujo como
 *          carga de imagen + 14 preguntas en 2 columnas).
 *      (3) Directorio de emergencia: 4 contactos con etiqueta literal + nombre
 *          + teléfono.
 *  - El texto de la pregunta/instrucción/etiqueta NO es editable.
 *  - Encabezado del directorio y de bloque 2 son `const` literales (no editables).
 *  - Botones deshabilitados durante la transición (anti-doble-submit).
 *  - Si la docente NO aceptó el aviso, se muestra el gate y se bloquea el form.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntrevistaInicialForm } from '@/components/alumnos/entrevista-inicial-form';
import {
  ENTREVISTA_BLOQUE1,
  ENTREVISTA_BLOQUE2_CELDAS,
  ENTREVISTA_BLOQUE2_ENCABEZADO,
  ENTREVISTA_BLOQUE2_DIBUJOS,
  ENTREVISTA_BLOQUE2_PREGUNTAS,
  DIRECTORIO_ENCABEZADO,
  DIRECTORIO_ETIQUETAS,
} from '@/types/entrevista';

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

describe('EntrevistaInicialForm — AC-12..AC-27 (UI)', () => {
  it('AC-12, AC-13: renderiza los 23 ítems del bloque 1 en orden literal', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    // Cada ítem del bloque 1 debe estar presente con su número y el texto literal.
    for (const q of ENTREVISTA_BLOQUE1) {
      const item = screen.getByTestId(`entrevista-item-${q.orden}`);
      expect(within(item).getByText(new RegExp(escapeRegex(q.pregunta)))).toBeInTheDocument();
    }
  });

  it('AC-12: el orden de los ítems del bloque 1 en el DOM es ascendente 1..23', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const items = screen.getAllByTestId(/^entrevista-item-[0-9]+$/);
    expect(items).toHaveLength(23);
    items.forEach((node, i) => {
      expect(node.getAttribute('data-testid')).toBe(`entrevista-item-${i + 1}`);
    });
  });

  it('AC-13: el texto de la pregunta del bloque 1 NO es editable (no es input/textarea)', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    for (const q of ENTREVISTA_BLOQUE1) {
      const item = screen.getByTestId(`entrevista-item-${q.orden}`);
      const labels = within(item).getAllByText(new RegExp(escapeRegex(q.pregunta)));
      // Sólo el Label contiene el texto, no un input/textarea con ese texto.
      labels.forEach((el) => {
        expect(el.tagName.toLowerCase()).not.toBe('input');
        expect(el.tagName.toLowerCase()).not.toBe('textarea');
      });
    }
  });

  it('AC-14: bloque 2 — las 16 celdas en orden 1..16, con 2 instrucciones de dibujo y 14 preguntas', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const celdas = ENTREVISTA_BLOQUE2_CELDAS;
    expect(celdas).toHaveLength(16);
    expect(ENTREVISTA_BLOQUE2_DIBUJOS).toBe(2);
    expect(ENTREVISTA_BLOQUE2_PREGUNTAS).toBe(14);

    for (const c of celdas) {
      const node = screen.getByTestId(`entrevista-celda-${c.orden}`);
      expect(node).toBeInTheDocument();
    }
  });

  it('AC-18: las 2 celdas de dibujo muestran el control de carga de imagen (no textarea de texto)', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const dibujoCeldas = ENTREVISTA_BLOQUE2_CELDAS.filter((c) => c.tipo === 'dibujo');
    expect(dibujoCeldas).toHaveLength(2);
    for (const c of dibujoCeldas) {
      const node = screen.getByTestId(`entrevista-celda-${c.orden}`);
      if (c.tipo === 'dibujo') {
        // La instrucción literal se muestra en el DOM.
        expect(within(node).getByText(c.instruccion)).toBeInTheDocument();
        // El control de carga de imagen (input file) está presente.
        const fileInput = node.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
      }
    }
  });

  it('AC-14: encabezado del bloque 2 muestra los textos literales "const"', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    expect(screen.getByText(ENTREVISTA_BLOQUE2_ENCABEZADO.lineaInstitucion)).toBeInTheDocument();
    expect(screen.getByText(ENTREVISTA_BLOQUE2_ENCABEZADO.titulo)).toBeInTheDocument();
  });

  it('AC-15, AC-20: bloque 3 — los 4 contactos del directorio con etiquetas literales', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    expect(DIRECTORIO_ETIQUETAS).toHaveLength(4);
    for (const e of DIRECTORIO_ETIQUETAS) {
      const node = screen.getByTestId(`directorio-contacto-${e.orden}`);
      expect(within(node).getByText(e.etiqueta)).toBeInTheDocument();
    }
  });

  it('AC-15: encabezado del directorio con textos literales "const"', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    expect(screen.getByText(DIRECTORIO_ENCABEZADO.titulo)).toBeInTheDocument();
    expect(screen.getByText(DIRECTORIO_ENCABEZADO.subtitulo)).toBeInTheDocument();
    // El encabezado de teléfonos aparece una sola vez (en el bloque 3) y se
    // referencia como label de cada contacto (4 veces). Usamos getAllByText.
    expect(
      screen.getAllByText(DIRECTORIO_ENCABEZADO.encabezadoTelefonos).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('AC-UX: gate de aviso muestra banner cuando NO está aceptado', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} avisoAceptado={false} />);
    expect(screen.getByTestId('entrevista-gate-aviso')).toBeInTheDocument();
    // Los tres fieldsets deben estar deshabilitados.
    expect(
      screen.getByRole('group', { name: /bloque 1 — entrevista inicial/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('group', { name: /bloque 2 — ambiente familiar y escuela/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('group', { name: /bloque 3 — directorio de emergencia/i }),
    ).toBeDisabled();
  });

  it('AC-UX: editar respuesta del ítem 1 del bloque 1 actualiza el estado interno', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const item1 = screen.getByTestId('entrevista-item-1');
    const input1 = within(item1).getByLabelText(/respuesta 1/i);
    await user.type(input1, 'Demo');
    expect((input1 as HTMLInputElement).value).toBe('Demo');
  });

  it('AC-UX: editar respuesta de la celda 3 (bloque 2 pregunta) actualiza el estado interno', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const celda3 = screen.getByTestId('entrevista-celda-3');
    const textarea = within(celda3).getByLabelText(/respuesta celda 3/i);
    await user.type(textarea, 'Me llamo Demo');
    expect((textarea as HTMLTextAreaElement).value).toBe('Me llamo Demo');
  });

  it('AC-UX: editar nombre y teléfono del contacto 1 del directorio actualiza el estado interno', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const c1 = screen.getByTestId('directorio-contacto-1');
    const nombre = within(c1).getByLabelText(/^nombre/i) as HTMLInputElement;
    await user.type(nombre, 'Padre Demo');
    expect(nombre.value).toBe('Padre Demo');

    const tel = within(c1).getByLabelText(/teléfono/i) as HTMLInputElement;
    await user.type(tel, '555-1234');
    expect(tel.value).toBe('555-1234');
  });

  it('AC-UX: archivar entrevista invoca la server action', async () => {
    const user = userEvent.setup();
    const { archivarEntrevista } = await import('@/services/alumnos/entrevista-actions');
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const btn = screen.getByTestId('entrevista-archivar');
    await user.click(btn);
    expect(archivarEntrevista).toHaveBeenCalledWith('alumno-1');
  });

  it('AC-25: guardar envía upsertEntrevista con respuestas + directorio', async () => {
    const user = userEvent.setup();
    const { upsertEntrevista } = await import('@/services/alumnos/entrevista-actions');
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    const item1 = screen.getByTestId('entrevista-item-1');
    await user.type(within(item1).getByLabelText(/respuesta 1/i), 'Demo');

    const c1 = screen.getByTestId('directorio-contacto-1');
    await user.type(within(c1).getByLabelText(/^nombre/i), 'Padre Demo');

    await user.click(screen.getByTestId('entrevista-guardar'));

    expect(upsertEntrevista).toHaveBeenCalledTimes(1);
    const args = (upsertEntrevista as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]![0] as {
      alumnoId: string;
      respuestas: unknown;
      directorio: unknown;
    };
    expect(args.alumnoId).toBe('alumno-1');
    expect(args.respuestas).toBeDefined();
    expect(args.directorio).toBeDefined();
  });
});

// ============ Utils ============
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}