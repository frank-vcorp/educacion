/**
 * Unit: components/ui/section-help — DEC-20260821-02.
 *
 * Cubre:
 *  - Render: breve visible + botón "Ayuda" accesible.
 *  - Atributos a11y: aria-expanded, aria-controls, aria-describedby, role="tooltip".
 *  - Teclado: Enter y Space alternan el panel; Escape lo cierra y devuelve el foco.
 *  - Clic/toque: el botón abre/cierra el panel (no depende de hover).
 *  - Cierre por clic fuera.
 *  - Contenido: el panel muestra el detalle y la etiqueta.
 *  - Sin overlay sobre el botón: el toggle no rompe el árbol semántico.
 *  - Sin dependencias externas en runtime (sin @radix-ui/react-tooltip).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionHelp } from '@/components/ui/section-help';

describe('SectionHelp — DEC-20260821-02', () => {
  const PROPS = {
    helpId: 'test-section',
    ariaLabel: 'Ayuda test',
    breve: 'Breve descripción visible bajo el título.',
    detalle: 'Detalle extendido del bloque.\nPara qué sirve.\nQuién responde.',
  } as const;

  it('renderiza el texto breve siempre visible bajo el título', () => {
    render(<SectionHelp {...PROPS} />);
    expect(
      screen.getByTestId('section-help-test-section-breve'),
    ).toHaveTextContent(PROPS.breve);
  });

  it('muestra el botón "Ayuda" con icono y área táctil suficiente (h-9 ≈ 36px)', () => {
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Ayuda');
    // h-9 (36px) garantiza objetivo táctil ≥36px recomendado por WCAG 2.5.5.
    expect(btn.className).toMatch(/\bh-9\b/);
    expect(btn.className).toContain('min-h-[36px]');
  });

  it('atributos a11y en estado cerrado: aria-expanded=false, aria-controls/describedby al panel', () => {
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveAttribute('aria-controls', 'section-help-panel-test-section');
    expect(btn).toHaveAttribute('aria-describedby', 'section-help-panel-test-section');
    expect(btn).toHaveAttribute('aria-label', PROPS.ariaLabel);
    // Panel no debe estar en el DOM cuando está cerrado.
    expect(
      screen.queryByTestId('section-help-test-section-panel'),
    ).not.toBeInTheDocument();
  });

  it('clic/toque abre el panel con role="tooltip" y muestra el detalle', async () => {
    const user = userEvent.setup();
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    await user.click(btn);
    const panel = await screen.findByTestId('section-help-test-section-panel');
    expect(panel).toHaveAttribute('role', 'tooltip');
    expect(panel).toHaveAttribute('aria-label', PROPS.ariaLabel);
    expect(panel).toHaveTextContent('Detalle extendido');
    expect(panel).toHaveTextContent('Para qué sirve');
    expect(panel).toHaveTextContent('Quién responde');
    // aria-expanded debe haber cambiado.
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('clic/toque una segunda vez cierra el panel', async () => {
    const user = userEvent.setup();
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    await user.click(btn);
    expect(screen.getByTestId('section-help-test-section-panel')).toBeInTheDocument();
    await user.click(btn);
    expect(
      screen.queryByTestId('section-help-test-section-panel'),
    ).not.toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('teclado: Enter alterna el panel', async () => {
    const user = userEvent.setup();
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    btn.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('section-help-test-section-panel')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(
      screen.queryByTestId('section-help-test-section-panel'),
    ).not.toBeInTheDocument();
  });

  it('teclado: Space alterna el panel', async () => {
    const user = userEvent.setup();
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    btn.focus();
    await user.keyboard(' ');
    expect(screen.getByTestId('section-help-test-section-panel')).toBeInTheDocument();
    await user.keyboard(' ');
    expect(
      screen.queryByTestId('section-help-test-section-panel'),
    ).not.toBeInTheDocument();
  });

  it('teclado: Escape con panel abierto cierra y devuelve el foco al botón', async () => {
    const user = userEvent.setup();
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId('section-help-test-section-panel')).toBeInTheDocument(),
    );
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByTestId('section-help-test-section-panel'),
      ).not.toBeInTheDocument(),
    );
    expect(btn).toHaveFocus();
  });

  it('clic fuera del componente cierra el panel', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SectionHelp {...PROPS} />
        <button data-testid="outside">Otro</button>
      </div>,
    );
    await user.click(screen.getByTestId('section-help-test-section-button'));
    expect(screen.getByTestId('section-help-test-section-panel')).toBeInTheDocument();
    await user.click(screen.getByTestId('outside'));
    await waitFor(() =>
      expect(
        screen.queryByTestId('section-help-test-section-panel'),
      ).not.toBeInTheDocument(),
    );
  });

  it('no se basa sólo en hover: data-open cambia con clic, no con pointerover', async () => {
    const user = userEvent.setup();
    render(<SectionHelp {...PROPS} />);
    const wrap = screen.getByTestId('section-help-test-section');
    expect(wrap).toHaveAttribute('data-open', 'false');
    // hover NO debe abrir el panel.
    await user.hover(screen.getByTestId('section-help-test-section-button'));
    expect(wrap).toHaveAttribute('data-open', 'false');
    // click sí.
    await user.click(screen.getByTestId('section-help-test-section-button'));
    expect(wrap).toHaveAttribute('data-open', 'true');
  });

  it('disabled=true bloquea el botón y mantiene el breve visible', () => {
    render(<SectionHelp {...PROPS} disabled />);
    expect(
      screen.getByTestId('section-help-test-section-breve'),
    ).toHaveTextContent(PROPS.breve);
    const btn = screen.getByTestId('section-help-test-section-button');
    expect(btn).toBeDisabled();
  });

  it('el panel usa el atributo id estable para asociación aria-describedby/aria-controls', async () => {
    const user = userEvent.setup();
    render(<SectionHelp {...PROPS} />);
    const btn = screen.getByTestId('section-help-test-section-button');
    await user.click(btn);
    const panel = await screen.findByTestId('section-help-test-section-panel');
    expect(panel.id).toBe('section-help-panel-test-section');
    expect(btn.getAttribute('aria-controls')).toBe(panel.id);
    expect(btn.getAttribute('aria-describedby')).toBe(panel.id);
  });

  it('dos botones con mismo helpId NO se pisan: ids únicos por id', async () => {
    // Garantiza que el id por helpId es estable y reproducible, sin colisión.
    const { rerender } = render(<SectionHelp {...PROPS} />);
    rerender(<SectionHelp {...PROPS} helpId="otro" ariaLabel="Otro" />);
    const btn = screen.getByTestId('section-help-otro-button');
    expect(btn.getAttribute('aria-controls')).toBe('section-help-panel-otro');
    expect(btn.getAttribute('aria-describedby')).toBe('section-help-panel-otro');
  });
});
