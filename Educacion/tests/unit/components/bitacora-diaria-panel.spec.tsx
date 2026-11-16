import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BitacoraDiariaPanel } from '@/components/bitacora/bitacora-diaria-panel';

// Mock server actions
vi.mock('@/services/evaluacion/evaluacion-actions', () => ({
  upsertBitacora: vi.fn().mockResolvedValue({ ok: true, id: 'bit-1' }),
  upsertEvaluacion: vi.fn().mockResolvedValue({ ok: true, id: 'eval-1' }),
}));

describe('BitacoraDiariaPanel', () => {
  const sesiones = [
    {
      id: 'ses-1',
      numero: 1,
      ajustes_sesion: 'Inicio y exploración sensorial',
      bloques: [
        {
          id: 'bloque-1',
          contenido_textual: 'Observar hojas con lupa y describir textura',
          momento: 'inicio',
        },
      ],
    },
    {
      id: 'ses-2',
      numero: 2,
      ajustes_sesion: 'Clasificación de elementos',
      bloques: [],
    },
  ];

  const alumnos = [
    { id: 'al-1', nombre: 'Sofía Morales' },
    { id: 'al-2', nombre: 'Mateo Hernández' },
  ];

  const bitacoras = [
    {
      id: 'bit-1',
      sesion_id: 'ses-1',
      fecha: '2026-10-05',
      participacion_grupo: 4,
      dificultades: 'Ninguna dificultad',
    },
  ];

  const evaluaciones = [
    {
      id: 'eval-1',
      alumno_id: 'al-1',
      sesion_id: 'ses-1',
      nivel: 1,
      observaciones: 'Participó activamente',
      fecha: '2026-10-05',
    },
  ];

  it('renderiza la nota general de la actividad y las caritas de participación', () => {
    render(
      <BitacoraDiariaPanel
        planeacionId="plan-1"
        docenteId="doc-1"
        cct="09DPR1234Z"
        pdas={['PDA-01']}
        sesiones={sesiones}
        alumnos={alumnos}
        bitacorasIniciales={bitacoras}
        evaluacionesIniciales={evaluaciones}
      />,
    );

    expect(screen.getByText('Nota general de la actividad')).toBeDefined();
    expect(screen.getByText('Excelente')).toBeDefined();
    expect(screen.getByText('Buena')).toBeDefined();
    expect(screen.getByText('Media')).toBeDefined();
  });

  it('renderiza la lista de alumnos con el semáforo de 4 niveles y campo de observación', () => {
    render(
      <BitacoraDiariaPanel
        planeacionId="plan-1"
        docenteId="doc-1"
        cct="09DPR1234Z"
        pdas={['PDA-01']}
        sesiones={sesiones}
        alumnos={alumnos}
        bitacorasIniciales={bitacoras}
        evaluacionesIniciales={evaluaciones}
      />,
    );

    expect(screen.getByText('Sofía Morales')).toBeDefined();
    expect(screen.getByText('Mateo Hernández')).toBeDefined();
    expect(screen.getByText('Notas y Valoración por Alumno (2)')).toBeDefined();

    const inputs = screen.getAllByPlaceholderText('Observación cualitativa (opcional)...');
    expect(inputs).toHaveLength(2);
  });

  it('permite cambiar la participación y actualizar la observación cualitativa', () => {
    render(
      <BitacoraDiariaPanel
        planeacionId="plan-1"
        docenteId="doc-1"
        cct="09DPR1234Z"
        pdas={['PDA-01']}
        sesiones={sesiones}
        alumnos={alumnos}
        bitacorasIniciales={bitacoras}
        evaluacionesIniciales={evaluaciones}
      />,
    );

    const botonExcelente = screen.getByText('Excelente');
    fireEvent.click(botonExcelente);

    const inputs = screen.getAllByPlaceholderText('Observación cualitativa (opcional)...');
    const inputMateo = inputs[1]!;
    fireEvent.change(inputMateo, { target: { value: 'Necesita apoyo con la tijera' } });
    expect((inputMateo as HTMLInputElement).value).toBe('Necesita apoyo con la tijera');
  });
});
