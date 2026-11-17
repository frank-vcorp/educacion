// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  normalizarRolRegistro,
  signInvitacionCCT,
  verifyInvitacionCCT,
} from '@/lib/auth/invitacion-cct';
import { parseRolPlantelConfig } from '@/lib/auth/roles-cct';

describe('invitacion-cct y roles-cct', () => {
  it('firma y verifica tokens de invitación ligados al CCT', async () => {
    const token = await signInvitacionCCT({
      cct: '15djn0001a',
      rolObjetivo: 'director',
      inviterId: '11111111-1111-1111-1111-111111111111',
      inviterNombre: 'Maestra Lolita',
    });

    const payload = await verifyInvitacionCCT(token);
    expect(payload).not.toBeNull();
    expect(payload?.cct).toBe('15DJN0001A');
    expect(payload?.rolObjetivo).toBe('director');
    expect(payload?.inviterNombre).toBe('Maestra Lolita');
  });

  it('rechaza tokens inválidos o manipulados', async () => {
    expect(await verifyInvitacionCCT('token-invalido')).toBeNull();
    expect(await verifyInvitacionCCT('')).toBeNull();
  });

  it('normaliza el rol de registro de forma segura', () => {
    expect(normalizarRolRegistro('director')).toBe('director');
    expect(normalizarRolRegistro('docente')).toBe('docente');
    expect(normalizarRolRegistro('admin')).toBe('docente');
    expect(normalizarRolRegistro(undefined)).toBe('docente');
  });

  it('parsea configuracion_m4 de roles y estado de director', () => {
    const def = parseRolPlantelConfig(null);
    expect(def.rolActivo).toBe('docente');
    expect(def.rolesDisponibles).toEqual(['docente']);

    const dir = parseRolPlantelConfig({
      rolActivo: 'director',
      rolesDisponibles: ['docente', 'director'],
      directorEstado: 'pendiente_aprobacion',
      aprobadoPorDocentes: ['doc-1'],
    });
    expect(dir.rolActivo).toBe('director');
    expect(dir.rolesDisponibles).toEqual(['docente', 'director']);
    expect(dir.directorEstado).toBe('pendiente_aprobacion');
    expect(dir.aprobadoPorDocentes).toEqual(['doc-1']);
  });
});
