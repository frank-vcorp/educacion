import { describe, expect, it } from 'vitest';
import {
  formatearWhatsappDisplay,
  normalizarWhatsapp,
  resolverIdentificadorLogin,
  whatsappToAuthEmail,
} from '@/lib/auth/whatsapp';

describe('whatsapp auth helpers', () => {
  it('normaliza formatos comunes de México al mismo identificador', () => {
    expect(normalizarWhatsapp('5512345678')).toBe('525512345678');
    expect(normalizarWhatsapp('55 1234 5678')).toBe('525512345678');
    expect(normalizarWhatsapp('+52 55 1234 5678')).toBe('525512345678');
    expect(normalizarWhatsapp('+52 1 55 1234 5678')).toBe('525512345678');
    expect(normalizarWhatsapp('5215512345678')).toBe('525512345678');
  });

  it('rechaza números demasiado cortos o vacíos', () => {
    expect(normalizarWhatsapp('')).toBeNull();
    expect(normalizarWhatsapp('12345')).toBeNull();
  });

  it('formatea números de México para mostrar', () => {
    expect(formatearWhatsappDisplay('525512345678')).toBe('+52 55 1234 5678');
  });

  it('resuelve identificador de login ya sea WhatsApp o correo existente', () => {
    const wa = resolverIdentificadorLogin('55 1234 5678');
    expect(wa.ok).toBe(true);
    if (wa.ok) {
      expect(wa.esCorreo).toBe(false);
      expect(wa.authEmail).toBe(whatsappToAuthEmail('525512345678'));
    }

    const email = resolverIdentificadorLogin('admin@escuela.edu.mx');
    expect(email.ok).toBe(true);
    if (email.ok) {
      expect(email.esCorreo).toBe(true);
      expect(email.authEmail).toBe('admin@escuela.edu.mx');
    }
  });
});
