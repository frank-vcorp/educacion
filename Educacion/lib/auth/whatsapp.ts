/**
 * Normalización de números de WhatsApp para autenticación sin fricción.
 * Convierte cualquier formato común en México (+52, 521, 10 dígitos) o internacional
 * a un identificador canónico de dígitos y a un correo sintético para Supabase Auth.
 */

const SYNTHETIC_DOMAIN = 'wa.nem.local';

/**
 * Normaliza un número telefónico / WhatsApp a solo dígitos E.164 (sin '+').
 * - 10 dígitos -> '52' + 10 dígitos (México por defecto)
 * - '521' + 10 dígitos (13 dígitos MX móvil antiguo) -> '52' + 10 dígitos
 * - '52' + 10 dígitos (12 dígitos MX) -> '52' + 10 dígitos
 * - Internacional: entre 10 y 15 dígitos.
 * Devuelve `null` si no cumple longitud válida.
 */
export function normalizarWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10) {
    return `52${digits}`;
  }
  if (digits.length === 13 && digits.startsWith('521')) {
    return `52${digits.slice(3)}`;
  }
  if (digits.length === 12 && digits.startsWith('52')) {
    return digits;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

/**
 * Formatea dígitos normalizados para mostrar en UI (ej. "+52 55 1234 5678").
 */
export function formatearWhatsappDisplay(digits: string): string {
  if (digits.length === 12 && digits.startsWith('52')) {
    const local = digits.slice(2);
    return `+52 ${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
  }
  return `+${digits}`;
}

/**
 * Convierte dígitos normalizados en el correo interno usado por Supabase Auth.
 */
export function whatsappToAuthEmail(digits: string): string {
  return `wa.${digits}@${SYNTHETIC_DOMAIN}`;
}

/**
 * Resuelve un identificador de login (puede ser correo real o WhatsApp)
 * al correo que espera Supabase Auth.
 */
export function resolverIdentificadorLogin(raw: string): {
  ok: true;
  authEmail: string;
  esCorreo: boolean;
  whatsappDigits?: string;
} | {
  ok: false;
  error: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Ingresa tu número de WhatsApp o correo' };
  }

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'Correo inválido' };
    }
    return { ok: true, authEmail: email, esCorreo: true };
  }

  const digits = normalizarWhatsapp(trimmed);
  if (!digits) {
    return {
      ok: false,
      error: 'Ingresa un número de WhatsApp válido (10 dígitos en México o con lada)',
    };
  }
  return {
    ok: true,
    authEmail: whatsappToAuthEmail(digits),
    esCorreo: false,
    whatsappDigits: digits,
  };
}
