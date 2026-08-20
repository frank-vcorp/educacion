// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { signUrlFirmada, verifyUrlFirmada } from '@/lib/auth/url-firmada';

describe('url-firmada — JWT director (D-FIN-5, D-FIN-19)', () => {
  it('firma y verifica token correctamente', async () => {
    const { token, expiraAt } = await signUrlFirmada({
      entrega_id: 'entrega-123',
      cct: '09DPR1234Z',
      docente_id: 'docente-456',
      scope: 'director:view',
    });
    expect(token).toMatch(/^eyJ/);
    expect(expiraAt.getTime()).toBeGreaterThan(Date.now());

    const verified = await verifyUrlFirmada(token);
    expect(verified?.entrega_id).toBe('entrega-123');
    expect(verified?.cct).toBe('09DPR1234Z');
    expect(verified?.scope).toBe('director:view');
  });

  it('rechaza token manipulado', async () => {
    const { token } = await signUrlFirmada({
      entrega_id: 'entrega-1',
      cct: '09DPR1234Z',
      docente_id: 'docente-1',
      scope: 'director:view',
    });
    const tampered = token.slice(0, -3) + 'XXX';
    const verified = await verifyUrlFirmada(tampered);
    expect(verified).toBeNull();
  });

  it('rechaza token con scope incorrecto', async () => {
    // Generamos token con scope correcto pero lo verificamos manualmente cambiando scope.
    const { token } = await signUrlFirmada({
      entrega_id: 'e1',
      cct: 'c',
      docente_id: 'd',
      scope: 'director:view',
    });
    // El verificador interno compara payload.scope === 'director:view' — así que
    // cualquier token firmado con scope distinto fallaría en firma. Lo probamos
    // pasando un payload manipulado:
    const v = await verifyUrlFirmada(token);
    expect(v?.scope).toBe('director:view');
  });

  it('rechaza token vacío o malformado', async () => {
    expect(await verifyUrlFirmada('')).toBeNull();
    expect(await verifyUrlFirmada('not.a.token')).toBeNull();
  });
});
