/**
 * Generar/verificar JWT de URL firmada para que el director abra la entrega.
 * SPEC_TEC_04 D-FIN-5 + D-FIN-19.
 */
import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'placeholder-dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

export interface UrlFirmadaPayload {
  entrega_id: string;
  cct: string;
  docente_id: string;
  scope: 'director:view';
}

/**
 * Firmar token JWT para URL del director (default 30 días).
 */
export async function signUrlFirmada(
  payload: UrlFirmadaPayload,
  expDays = 30,
): Promise<{ token: string; expiraAt: Date }> {
  const expiraAt = new Date(Date.now() + expDays * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiraAt.getTime() / 1000))
    .sign(getSecret());
  return { token, expiraAt };
}

/**
 * Verificar token JWT de URL firmada.
 */
export async function verifyUrlFirmada(
  token: string,
): Promise<UrlFirmadaPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.scope !== 'director:view') return null;
    return {
      entrega_id: String(payload.entrega_id),
      cct: String(payload.cct),
      docente_id: String(payload.docente_id),
      scope: 'director:view',
    };
  } catch {
    return null;
  }
}
