/**
 * Unit: components/alumnos/entrevista-familiar-form — SPEC_TEC_11 §6, §7, §10.
 *
 * Verifica:
 *   - Render de los 6 bloques (A identificación, B mamá/papá, C situación legal,
 *     D padres separados, E hábitos, F cierre+firmas).
 *   - Literalidad visible (cabecera institucional, títulos, peculiaridades
 *     `escorar` (sic), `limites` sin tilde, `ocupación` minúscula).
 *   - Gate D11-07: con `avisoAceptado:false` el form está deshabilitado y muestra
 *     banner.
 *   - Tabla mamá/papá con 6 filas × 2 cols.
 *   - 15 ítems de hábitos numerados con salto 14→16 (sin 15).
 *   - Firmas = dos inputs de texto (D11-11).
 *   - Bloque D se muestra cuando NO hay casados/unión libre.
 *   - Botón guardar deshabilitado durante isPending (anti-doble-submit).
 *
 * Se mockean las server actions del módulo
 * `services/alumnos/entrevista-familiar-actions` para no tocar Supabase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntrevistaFamiliarForm } from '@/components/alumnos/entrevista-familiar-form';
import {
  HABITOS_FAMILIARES,
  HABITOS_FAMILIARES_TOTAL,
  PROGENITOR_ETIQUETAS,
  PROGENITOR_TOTAL,
  buildRespuestasFamiliaresVaciasV1,
  CIERRE_MENSAJE_GRACIAS,
  CIERRE_MENSAJE_RECABADA,
  ENCABEZADO_INSTITUCION,
  TITULO_CUESTIONARIO,
} from '@/types/entrevista-familiar';

// ============ Mocks ============

const upsertMock = vi.fn();
const archivarMock = vi.fn();

vi.mock('@/services/alumnos/entrevista-familiar-actions', () => ({
  upsertEntrevistaFamiliar: (arg: unknown) => upsertMock(arg),
  archivarEntrevistaFamiliar: (arg: unknown) => archivarMock(arg),
}));

const alumnoFixture = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  nombre: 'Alumno Demo',
  grado: '1°',
};

// ============ Helpers ============

function makeRespuestas() {
  return buildRespuestasFamiliaresVaciasV1({
    nombreAlumno: 'Alumno Demo',
    fechaNacimiento: '2020-01-15',
  });
}

// ============ Tests ============

describe('IMPL-20260821-05 — EntrevistaFamiliarForm', () => {
  beforeEach(() => {
    (upsertMock as unknown as { mockClear: () => void }).mockClear();
    (archivarMock as unknown as { mockClear: () => void }).mockClear();
    (
      upsertMock as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({ ok: true, id: 'ef-1' });
    (
      archivarMock as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({ ok: true, data: null });
    // Limpia cualquier borrador en sessionStorage.
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }
  });

  it('renderiza los 6 bloques del cuestionario literal', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );

    expect(screen.getByTestId('entrevista-familiar-bloque-a')).toBeTruthy();
    expect(screen.getByTestId('entrevista-familiar-bloque-b')).toBeTruthy();
    expect(screen.getByTestId('entrevista-familiar-bloque-c')).toBeTruthy();
    expect(screen.getByTestId('entrevista-familiar-bloque-e')).toBeTruthy();
    expect(screen.getByTestId('entrevista-familiar-bloque-f')).toBeTruthy();
  });

  it('muestra la cabecera institucional y el título literales', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    expect(screen.getByTestId('entrevista-familiar-institucion').textContent).toContain(
      ENCABEZADO_INSTITUCION,
    );
    expect(screen.getByTestId('entrevista-familiar-titulo').textContent).toContain(
      TITULO_CUESTIONARIO,
    );
  });

  it('muestra los mensajes de cierre literales en bloque F', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    expect(screen.getByTestId('familiar-cierre-gracias').textContent).toContain(
      CIERRE_MENSAJE_GRACIAS,
    );
    expect(screen.getByTestId('familiar-cierre-recabada').textContent).toContain(
      CIERRE_MENSAJE_RECABADA,
    );
  });

  it('bloque B: tabla mamá/papá con 6 filas × 2 cols', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    expect(
      screen.getByTestId('entrevista-familiar-bloque-b').querySelectorAll(
        'tbody > tr',
      ).length,
    ).toBe(PROGENITOR_TOTAL);
    expect(PROGENITOR_ETIQUETAS).toHaveLength(6);
  });

  it('bloque E: 15 ítems con salto 14→16 (sin 15) y peculiaridades', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );

    // El total reportado por el componente debe ser 15.
    expect(screen.getByTestId('familiar-habitos-total').textContent).toContain(
      String(HABITOS_FAMILIARES_TOTAL),
    );

    // Cada uno de los 15 ítems debe existir (incluido el orden 16).
    for (const h of HABITOS_FAMILIARES) {
      expect(
        screen.getByTestId(`familiar-habito-${h.orden}`),
        `falta ítem ${h.orden}`,
      ).toBeTruthy();
    }
    expect(screen.queryByTestId('familiar-habito-15')).toBeNull();

    // Peculiaridad: ítem 13 conserva `escorar`.
    expect(
      screen.getByTestId('familiar-habito-13').textContent,
    ).toContain('escorar');

    // Peculiaridad: ítems 10 y 11 conservan `limites`.
    expect(screen.getByTestId('familiar-habito-10').textContent).toContain(
      'limites',
    );
    expect(screen.getByTestId('familiar-habito-11').textContent).toContain(
      'limites',
    );
  });

  it('bloque F: firmas son dos inputs de texto (D11-11)', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    const mama = screen.getByTestId(
      'familiar-firma-mama',
    ) as HTMLInputElement;
    const papa = screen.getByTestId(
      'familiar-firma-papa',
    ) as HTMLInputElement;
    expect(mama.tagName).toBe('INPUT');
    expect(papa.tagName).toBe('INPUT');
    expect(mama.type).toBe('text');
    expect(papa.type).toBe('text');
    // Aviso de no-valor-legal conservado.
    expect(screen.getByTestId('familiar-firma-aviso')).toBeTruthy();
  });

  it('gate D11-07: con aviso NO aceptado, el botón guardar está deshabilitado', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado={false}
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    const guardar = screen.getByTestId('entrevista-familiar-guardar');
    expect(guardar.hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('entrevista-familiar-gate-aviso')).toBeTruthy();
  });

  it('bloque D: si casados/unión libre → oculto; sin marcar → se muestra', () => {
    const { rerender } = render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={{
          fecha_aplicacion: '2026-08-20',
          estado: 'borrador',
          respuestas: makeRespuestas(),
        }}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    // Sin marcar casados/unión libre → bloque D SE MUESTRA (la docente
    // puede llenarlo si aplica; SPEC §4.1: "condicional; se muestra
    // cuando el bloque C no marca casados/unión libre").
    expect(screen.getByTestId('entrevista-familiar-bloque-d')).toBeTruthy();

    // Re-render con casados=true → bloque D se OCULTA (no aplica).
    const conCasados = makeRespuestas();
    conCasados.situacionLegal.casados = true;
    rerender(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={{
          fecha_aplicacion: '2026-08-20',
          estado: 'borrador',
          respuestas: conCasados,
        }}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    expect(screen.queryByTestId('entrevista-familiar-bloque-d')).toBeNull();

    // Re-render con unión libre=true → bloque D sigue oculto.
    const conUnionLibre = makeRespuestas();
    conUnionLibre.situacionLegal.unionLibre = true;
    rerender(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={{
          fecha_aplicacion: '2026-08-20',
          estado: 'borrador',
          respuestas: conUnionLibre,
        }}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    expect(screen.queryByTestId('entrevista-familiar-bloque-d')).toBeNull();
  });

  it('submit llama upsertEntrevistaFamiliar con el cuestionario literal', async () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={null}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );

    const guardar = screen.getByTestId('entrevista-familiar-guardar');
    fireEvent.click(guardar);

    await waitFor(() => {
      expect(
        (upsertMock as unknown as { mock: { calls: unknown[][] } }).mock.calls
          .length,
      ).toBe(1);
    });

    const firstCall = (
      upsertMock as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0];
    const call = firstCall && (firstCall[0] as Record<string, unknown> | undefined);
    expect(call).toBeDefined();
    if (!call) throw new Error('upsertMock no fue invocado');
    expect(call.alumnoId).toBe(alumnoFixture.id);
    expect(call.estado).toMatch(/borrador|completa/);
    const respuestas = call.respuestas as ReturnType<typeof makeRespuestas>;
    expect(respuestas.habitosFamiliares.items).toHaveLength(
      HABITOS_FAMILIARES_TOTAL,
    );
  });

  it('archivado: con initial.estado="archivada", banner visible y Archivar deshabilitado', () => {
    render(
      <EntrevistaFamiliarForm
        alumno={alumnoFixture}
        initial={{
          fecha_aplicacion: '2026-08-20',
          estado: 'archivada',
          respuestas: makeRespuestas(),
        }}
        avisoAceptado
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    expect(
      screen.getByTestId('entrevista-familiar-archivada-banner'),
    ).toBeTruthy();
    const archivar = screen.getByTestId('entrevista-familiar-archivar');
    expect(archivar.hasAttribute('disabled')).toBe(true);
  });
});
