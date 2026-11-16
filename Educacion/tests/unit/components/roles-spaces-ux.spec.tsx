import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OnboardingDocenteBanner } from '@/components/dashboard/onboarding-docente-banner';
import { OnboardingDirectorBanner } from '@/components/director/onboarding-director-banner';
import { RoleViewSelector } from '@/components/admin/role-view-selector';
import { ModuloVigilanciaNormativa } from '@/components/admin/modulo-vigilancia-normativa';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin',
}));

describe('Roles y Espacios UX / UI (Docente, Director, Superusuario)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Rol Docente — OnboardingDocenteBanner', () => {
    it('renderiza la bienvenida cálida y el recorrido de los 4 pasos del ciclo de aula', () => {
      render(
        <OnboardingDocenteBanner
          nombreDocente="Lolita Pérez"
          hasGrupo={true}
          planeacionesCount={2}
        />
      );

      // Saludo cálido
      expect(screen.getByText(/¡Bienvenida, Lolita!/i)).toBeInTheDocument();
      expect(screen.getByText(/Preescolar · Guía de 4 pasos/i)).toBeInTheDocument();

      // Los 4 pasos del aula
      expect(screen.getByText(/Tu Grupo y Alumnos/i)).toBeInTheDocument();
      expect(screen.getByText(/Planea tu Proyecto NEM/i)).toBeInTheDocument();
      expect(screen.getByText(/Bitácora y Pase de Lista/i)).toBeInTheDocument();
      expect(screen.getByText(/Entrega y Expediente Oficial/i)).toBeInTheDocument();
    });

    it('indica los pasos completados adecuadamente según el estado del docente', () => {
      render(
        <OnboardingDocenteBanner
          nombreDocente="María González"
          hasGrupo={true}
          planeacionesCount={3}
        />
      );

      // Debe mostrar badges de completado para paso 1 y 2
      const hechoBadges = screen.getAllByText(/Hecho/i);
      expect(hechoBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Rol Director — OnboardingDirectorBanner', () => {
    it('renderiza el panel de bienvenida institucional del colectivo escolar con los 3 pasos clave', () => {
      render(
        <OnboardingDirectorBanner
          cct="21EJN0023X"
          escuelaNombre="Jardín de Niños Rosaura Zapata"
        />
      );

      expect(
        screen.getByText(/Panel de Dirección Escolar — CCT 21EJN0023X/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Bienvenida al Colectivo Escolar de Jardín de Niños Rosaura Zapata/i)
      ).toBeInTheDocument();

      // Pasos institucionales
      expect(screen.getByText(/Revisa planeaciones quincenales/i)).toBeInTheDocument();
      expect(screen.getByText(/Emite Vo.Bo. y retroalimentación/i)).toBeInTheDocument();
      expect(screen.getByText(/Descarga carpeta para supervisión/i)).toBeInTheDocument();
    });
  });

  describe('3. Rol Superusuario — Selector de Vistas y Vigilancia Normativa', () => {
    it('renderiza el selector de roles para alternar entre Docente, Director y Admin', () => {
      render(<RoleViewSelector currentRole="admin" cct="21EJN0001A" />);

      // Debe renderizar el disparador del botón
      expect(screen.getByText(/Consola Superusuario/i)).toBeInTheDocument();
    });

    it('renderiza el Módulo de Vigilancia Normativa (E11) con Acuerdos 14/08/22 y 06/08/23 vigentes', () => {
      render(<ModuloVigilanciaNormativa />);

      expect(screen.getByText(/Módulo de Vigilancia Normativa \(E11\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Monitor DOF \/ SEP Activo/i)).toBeInTheDocument();
      expect(screen.getByText(/Acuerdo 14\/08\/22/i)).toBeInTheDocument();
      expect(screen.getByText(/Acuerdo 06\/08\/23/i)).toBeInTheDocument();
      expect(screen.getByText(/0 Alertas Bloqueantes/i)).toBeInTheDocument();
      expect(screen.getAllByText(/100% Vigente/i).length).toBe(2);
    });
  });
});
