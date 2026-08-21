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
import { render, screen, within, waitFor } from '@testing-library/react';
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

  it('AC-UX: gate de aviso muestra banner cuando NO está aceptado', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} avisoAceptado={false} />);
    expect(screen.getByTestId('entrevista-gate-aviso')).toBeInTheDocument();
    // Bloque 1 visible por defecto: el fieldset debe estar deshabilitado.
    expect(
      screen.getByRole('group', { name: /bloque 1 — entrevista inicial/i }),
    ).toBeDisabled();

    // Bloques 2 y 3 están ocultos (hidden) por el stepper; verificamos
    // su estado navegando al paso correspondiente y comprobando el
    // atributo `disabled` del fieldset (los `getByRole` excluyen
    // elementos con `hidden`/`aria-hidden=true`, por eso usamos testid).
    await user.click(screen.getByTestId('entrevista-stepper-step-2'));
    expect(
      screen.getByTestId('entrevista-bloque-2'),
    ).toHaveAttribute('disabled');

    await user.click(screen.getByTestId('entrevista-stepper-step-3'));
    expect(
      screen.getByTestId('entrevista-bloque-3'),
    ).toHaveAttribute('disabled');
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
    // Navega al paso 2 (bloque 2) para que la celda sea visible/interactuable.
    await user.click(screen.getByTestId('entrevista-stepper-step-2'));
    const celda3 = screen.getByTestId('entrevista-celda-3');
    const textarea = within(celda3).getByLabelText(/respuesta celda 3/i);
    await user.type(textarea, 'Me llamo Demo');
    expect((textarea as HTMLTextAreaElement).value).toBe('Me llamo Demo');
  });

  it('AC-UX: editar nombre y teléfono del contacto 1 del directorio actualiza el estado interno', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    // Navega al paso 3 (directorio) para que el contacto sea visible/interactuable.
    await user.click(screen.getByTestId('entrevista-stepper-step-3'));
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
    // El botón Archivar vive en el footer (siempre visible), no requiere
    // navegación de paso para localizarlo.
    const btn = screen.getByTestId('entrevista-archivar');
    await user.click(btn);
    expect(archivarEntrevista).toHaveBeenCalledWith('alumno-1');
  });

  it('AC-25: guardar envía upsertEntrevista con respuestas + directorio', async () => {
    const user = userEvent.setup();
    const { upsertEntrevista } = await import('@/services/alumnos/entrevista-actions');
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    // Paso 1 — editar ítem 1.
    const item1 = screen.getByTestId('entrevista-item-1');
    await user.type(within(item1).getByLabelText(/respuesta 1/i), 'Demo');

    // Paso 3 — editar contacto 1.
    await user.click(screen.getByTestId('entrevista-stepper-step-3'));
    const c1 = screen.getByTestId('directorio-contacto-1');
    await user.type(within(c1).getByLabelText(/^nombre/i), 'Padre Demo');

    // El botón Guardar vive en el footer (siempre visible).
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

// =====================================================================
// IMPL-20260821-01 — UX del modal: stepper 1/2/3, Anterior/Siguiente,
// scroll al inicio, persistencia y footer accesible.
// =====================================================================

describe('EntrevistaInicialForm — IMPL-20260821-01 (stepper UX)', () => {
  beforeEach(() => {
    // sessionStorage limpio entre tests.
    if (typeof window !== 'undefined') window.sessionStorage.clear();
  });

  it('arranca en el paso 1 con aria-current="step" sólo en el primer botón', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const step1 = screen.getByTestId('entrevista-stepper-step-1');
    const step2 = screen.getByTestId('entrevista-stepper-step-2');
    const step3 = screen.getByTestId('entrevista-stepper-step-3');
    expect(step1).toHaveAttribute('aria-current', 'step');
    expect(step2).not.toHaveAttribute('aria-current');
    expect(step3).not.toHaveAttribute('aria-current');
    expect(step1).toHaveAttribute('data-active', 'true');
    expect(step2).toHaveAttribute('data-active', 'false');
  });

  it('renderiza el nav del stepper con el aria-label correcto', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    expect(
      screen.getByRole('navigation', { name: /pasos de la entrevista/i }),
    ).toBeInTheDocument();
  });

  it('Siguiente avanza al paso 2 y Anterior retrocede al paso 1', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    await user.click(screen.getByTestId('entrevista-stepper-next'));
    expect(screen.getByTestId('entrevista-stepper-step-2')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTestId('entrevista-bloque-1')).toHaveAttribute('hidden');
    expect(screen.getByTestId('entrevista-bloque-2')).not.toHaveAttribute('hidden');

    await user.click(screen.getByTestId('entrevista-stepper-prev'));
    expect(screen.getByTestId('entrevista-stepper-step-1')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTestId('entrevista-bloque-1')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('entrevista-bloque-2')).toHaveAttribute('hidden');
  });

  it('Anterior está deshabilitado en el paso 1 y Siguiente en el paso 3', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    expect(screen.getByTestId('entrevista-stepper-prev')).toBeDisabled();
    expect(screen.getByTestId('entrevista-stepper-next')).not.toBeDisabled();

    await user.click(screen.getByTestId('entrevista-stepper-step-3'));
    expect(screen.getByTestId('entrevista-stepper-next')).toBeDisabled();
    expect(screen.getByTestId('entrevista-stepper-prev')).not.toBeDisabled();
  });

  it('click en un botón del stepper salta directo al paso y oculta los demás bloques', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    await user.click(screen.getByTestId('entrevista-stepper-step-3'));
    expect(screen.getByTestId('entrevista-bloque-1')).toHaveAttribute('hidden');
    expect(screen.getByTestId('entrevista-bloque-2')).toHaveAttribute('hidden');
    expect(screen.getByTestId('entrevista-bloque-3')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('entrevista-stepper-step-3')).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('el estado (respuestas) persiste entre pasos: editar en paso 1 sigue en paso 3', async () => {
    const user = userEvent.setup();
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    const item1 = screen.getByTestId('entrevista-item-1');
    await user.type(within(item1).getByLabelText(/respuesta 1/i), 'Demo');

    // Navega a paso 2 y vuelve a paso 1.
    await user.click(screen.getByTestId('entrevista-stepper-step-2'));
    await user.click(screen.getByTestId('entrevista-stepper-step-1'));
    const input1 = within(screen.getByTestId('entrevista-item-1')).getByLabelText(
      /respuesta 1/i,
    ) as HTMLInputElement;
    expect(input1.value).toBe('Demo');
  });

  it('el footer accesible está siempre visible (sticky en el flujo del form)', () => {
    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const footer = screen.getByTestId('entrevista-footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute('role', 'group');
    expect(footer).toHaveAttribute('aria-label', expect.stringMatching(/navegación/i));
    // Guardar y Archivar son accesibles desde cualquier paso (viven en el footer).
    expect(screen.getByTestId('entrevista-guardar')).toBeInTheDocument();
    expect(screen.getByTestId('entrevista-archivar')).toBeInTheDocument();
  });

  it('persiste un borrador en sessionStorage por alumnoId y lo limpia tras guardar', async () => {
    const user = userEvent.setup();
    const { upsertEntrevista } = await import('@/services/alumnos/entrevista-actions');
    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    // Captura algo en paso 1.
    const item1 = screen.getByTestId('entrevista-item-1');
    await user.type(within(item1).getByLabelText(/respuesta 1/i), 'Borrador');

    // El sessionStorage guarda el borrador por alumno.
    const raw = window.sessionStorage.getItem('entrevista:nino:v1:alumno-1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as {
      respuestas: { entrevista_inicial: { items: Array<{ orden: number; respuesta: string }> } };
    };
    const item = parsed.respuestas.entrevista_inicial.items.find((it) => it.orden === 1);
    expect(item?.respuesta).toBe('Borrador');

    // Guarda: el sessionStorage se limpia.
    await user.click(screen.getByTestId('entrevista-guardar'));
    await waitFor(() => {
      expect(window.sessionStorage.getItem('entrevista:nino:v1:alumno-1')).toBeNull();
    });
    expect(upsertEntrevista).toHaveBeenCalledTimes(1);
  });

  it('hidrata desde sessionStorage si NO hay `initial` (entrevista aún no persistida)', async () => {
    // Sembramos un borrador antes de montar.
    const draft = {
      respuestas: {
        entrevista_inicial: {
          items: ENTREVISTA_BLOQUE1.map((q) => ({
            orden: q.orden,
            pregunta: q.pregunta,
            respuesta: q.orden === 1 ? 'Pre-cargado' : '',
          })),
        },
        ambiente_familiar_escuela: {
          encabezado: {
            lineaInstitucion: 'JARDIN DE NIÑOS “CELESTINO FREINET”',
            titulo: 'ENTEVISTA AL ALUMNO',
            fecha: '2026-08-21',
            nombreAlumno: 'Alumno Demo',
          },
          celdas: [],
        },
      },
      directorio: null,
      fechaAplicacion: '2026-08-21',
      estado: 'borrador',
    };
    window.sessionStorage.setItem(
      'entrevista:nino:v1:alumno-1',
      JSON.stringify(draft),
    );

    render(<EntrevistaInicialForm {...PROPS_BASE} />);
    const item1 = screen.getByTestId('entrevista-item-1');
    // La hidratación ocurre en useEffect tras el primer render.
    await waitFor(() => {
      const input1 = within(item1).getByLabelText(/respuesta 1/i) as HTMLInputElement;
      expect(input1.value).toBe('Pre-cargado');
    });
  });

  it('scroll al inicio: al cambiar de paso, hace scrollTop=0 en el contenedor', async () => {
    const user = userEvent.setup();
    // Mock del contenedor scrollable del modal.
    const scrollable = document.createElement('div');
    scrollable.setAttribute('data-testid', 'entrevista-dialog-body');
    scrollable.scrollTop = 200;
    document.body.appendChild(scrollable);

    render(<EntrevistaInicialForm {...PROPS_BASE} />);

    await user.click(screen.getByTestId('entrevista-stepper-next'));

    // Tras el cambio de paso, el contenedor debe volver al tope.
    await waitFor(() => {
      expect(scrollable.scrollTop).toBe(0);
    });

    document.body.removeChild(scrollable);
  });
});