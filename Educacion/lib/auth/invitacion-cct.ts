import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret =
    process.env.INVITACION_SECRET ??
    process.env.JWT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'placeholder-dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

export type RolInvitacion = 'docente' | 'director';

export interface InvitacionCctPayload {
  cct: string;
  rolObjetivo: RolInvitacion;
  inviterId: string;
  inviterNombre: string;
  scope: 'cct:invite';
}

export function normalizarRolRegistro(raw: string | undefined | null): RolInvitacion {
  return raw === 'director' ? 'director' : 'docente';
}

export async function signInvitacionCCT(
  input: Omit<InvitacionCctPayload, 'scope'>,
  expDays = 30,
): Promise<string> {
  const expiraSec = Math.floor(Date.now() / 1000) + expDays * 24 * 60 * 60;
  return new SignJWT({
    cct: input.cct.trim().toUpperCase(),
    rolObjetivo: input.rolObjetivo,
    inviterId: input.inviterId,
    inviterNombre: input.inviterNombre,
    scope: 'cct:invite',
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiraSec)
    .sign(getSecret());
}

export async function verifyInvitacionCCT(
  token: string | null | undefined,
): Promise<InvitacionCctPayload | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.scope !== 'cct:invite') return null;
    const cct = String(payload.cct ?? '').trim().toUpperCase();
    const rolObjetivo = normalizarRolRegistro(
      typeof payload.rolObjetivo === 'string' ? payload.rolObjetivo : undefined,
    );
    const inviterId = String(payload.inviterId ?? '');
    const inviterNombre = String(payload.inviterNombre ?? 'Colega del plantel');
    if (!cct || !inviterId) return null;
    return {
      cct,
      rolObjetivo,
      inviterId,
      inviterNombre,
      scope: 'cct:invite',
    };
  } catch {
    return null;
  }
}
