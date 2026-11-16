import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaseListaLudicoModal } from '@/components/asistencia/pase-lista-ludico-modal';

describe('PaseListaLudicoModal', () => {
  const alumnos = [
    { id: 'al-1', nombre: 'Mateo García' },
    { id: 'al-2', nombre: 'Sofía Morales' },
  ];

  it('renderiza el botón disparador por defecto', () => {
    render(<PaseListaLudicoModal alumnos={alumnos} />);
    expect(screen.getByRole('button', { name: /Pase de Lista Lúdico/i })).toBeDefined();
  });

  it('abre el modal y muestra la dinámica pedagógica y la lista de alumnos', () => {
    render(<PaseListaLudicoModal alumnos={alumnos} fecha="2026-10-20" />);
    fireEvent.click(screen.getByRole('button', { name: /Pase de Lista Lúdico/i }));

    expect(screen.getByText(/Consigna para los niños:/i)).toBeDefined();
    expect(screen.getByText('Mateo García')).toBeDefined();
    expect(screen.getByText('Sofía Morales')).toBeDefined();
    expect(screen.getByText(/Sugerir otra dinámica/i)).toBeDefined();
  });

  it('permite cambiar el estado de asistencia de un alumno con chips', () => {
    render(<PaseListaLudicoModal alumnos={alumnos} />);
    fireEvent.click(screen.getByRole('button', { name: /Pase de Lista Lúdico/i }));

    // Mateo García ausente
    const ausenteMateo = screen.getByLabelText(/Ausente: Mateo García/i);
    fireEvent.click(ausenteMateo);

    expect(screen.getByText(/1 presentes/i)).toBeDefined();
    expect(screen.getByText(/1 ausentes/i)).toBeDefined();
  });
});
