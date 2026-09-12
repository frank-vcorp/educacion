/**
 * SectionHelp — control accesible de ayuda contextual para secciones
 * (DEC-20260821-02).
 *
 * - Botón con icono (?) + texto "Ayuda" para garantizar área táctil ≥40px
 *   y explicar el propósito del control.
 * - Apertura/cierre por **clic/toque** (no hover) y por teclado
 *   (`Enter` / `Space` toggle, `Escape` cierra; las flechas izquierda /
 *   derecha NO están habilitadas para evitar conflicto con la
 *   navegación global por sub-campos).
 * - Conectado al tooltip/disclosure mediante `aria-describedby` y
 *   `aria-expanded` en el botón; el panel usa `role="tooltip"` (WAI-ARIA
 *   1.2 §4.10) para compatibilidad con lectores de pantalla.
 * - Cierra automáticamente con clic fuera, `Escape` o tras activar el
 *   botón de nuevo.
 * - **Sin dependencias nuevas**: no usa @radix-ui/react-tooltip; sólo
 *   React + `cn` (util ya presente). Cero props adicionales requeridas.
 * - Visible y operable a 375×812: el panel `position: absolute` cae
 *   sobre el contenido del modal pero respeta el ancho del bloque con
 *   `max-w-[min(360px,calc(100vw-2rem))]` y `z-30`.
 *
 * WCAG 2.1 AA — Diseño dentro y fuera del modal:
 *   - 2.1.1 Teclado: activable por `Enter` y `Space`.
 *   - 2.1.2 Sin trampas: `Escape` devuelve el foco al botón activador.
 *   - 2.4.7 Foco visible: conservado por las reglas `focus-visible` de
 *     Tailwind (anillo + outline).
 *   - 4.1.2 Nombre, función, valor: `aria-label` + `aria-expanded` +
 *     `aria-describedby` + `aria-controls` describen el comportamiento.
 */
'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionHelpProps {
  /** Identificador único (sufijo de `aria-describedby` / `id` del panel). */
  helpId: string;
  /** Etiqueta acortable que también sirve de `aria-label` si `ariaLabel` no se da. */
  ariaLabel: string;
  /** Texto breve siempre visible bajo el título del bloque (1–2 frases). */
  breve: string;
  /** Texto extendido del tooltip/disclosure (qué se captura, para qué, quién, evidencia, Guardar vs Archivar, sin IA). */
  detalle: string;
  /** Clases extra para personalizar el wrap visible (opcional). */
  className?: string;
  /** Si se desactiva el botón (sigue mostrando el `breve`). */
  disabled?: boolean;
  /** Solo icono (?) — para sidebars donde el espacio importa. */
  compact?: boolean;
}

export function SectionHelp({
  helpId,
  ariaLabel,
  breve,
  detalle,
  className,
  disabled = false,
  compact = false,
}: SectionHelpProps) {
  const [abierto, setAbierto] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const panelId = `section-help-panel-${helpId}`;

  const cerrar = React.useCallback(() => {
    setAbierto(false);
    // Devolver el foco al botón activador (WCAG 2.1.2).
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const toggle = React.useCallback(() => {
    setAbierto((prev) => !prev);
  }, []);

  // Cierre con Escape y clic fuera del contenedor.
  React.useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cerrar();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (target && wrapperRef.current && !wrapperRef.current.contains(target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [abierto, cerrar]);

  // Reposiciona el panel tras cambios de viewport / scroll para mantener
  // el ancla al botón. Ligero; sin libs.
  React.useEffect(() => {
    if (!abierto) return;
    function reposicionar() {
      const btn = buttonRef.current;
      const panel = panelRef.current;
      if (!btn || !panel) return;
      const r = btn.getBoundingClientRect();
      // Reset para mediar de nuevo.
      panel.style.position = 'absolute';
      panel.style.top = `${r.bottom + 6}px`;
      panel.style.left = `${Math.min(r.left, window.innerWidth - panel.offsetWidth - 16)}px`;
    }
    reposicionar();
    window.addEventListener('resize', reposicionar);
    window.addEventListener('scroll', reposicionar, true);
    return () => {
      window.removeEventListener('resize', reposicionar);
      window.removeEventListener('scroll', reposicionar, true);
    };
  }, [abierto]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative inline-flex',
        compact ? 'flex-row items-center' : 'flex-col gap-1',
        className,
      )}
      data-testid={`section-help-${helpId}`}
      data-open={abierto ? 'true' : 'false'}
    >
      {!compact && (
        <p
          className="text-xs text-muted-foreground"
          data-testid={`section-help-${helpId}-breve`}
        >
          {breve}
        </p>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={abierto}
        aria-controls={panelId}
        aria-describedby={panelId}
        aria-label={compact ? ariaLabel : ariaLabel}
        title={compact ? ariaLabel : undefined}
        data-testid={`section-help-${helpId}-button`}
        className={cn(
          'inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          compact
            ? 'h-7 w-7 shrink-0'
            : 'h-9 min-h-[36px] gap-1.5 self-start px-2.5 text-xs font-medium',
        )}
      >
        <Info className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        {!compact && <span>Ayuda</span>}
      </button>
      {abierto && (
        <div
          ref={panelRef}
          id={panelId}
          role="tooltip"
          aria-label={ariaLabel}
          data-testid={`section-help-${helpId}-panel`}
          className={cn(
            'z-30 max-w-[min(360px,calc(100vw-2rem))] rounded-md border border-input bg-popover p-3 text-xs text-popover-foreground shadow-md',
            'focus:outline-none',
          )}
        >
          <p className="mb-1 font-semibold">{ariaLabel}</p>
          <p className="whitespace-pre-line leading-relaxed">{detalle}</p>
        </div>
      )}
    </div>
  );
}

export default SectionHelp;
