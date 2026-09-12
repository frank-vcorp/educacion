/**
 * Superusuario de plataforma (Frank / equipo VectorIA).
 * Lista de emails en SUPERUSER_EMAILS (comma-separated), server-only.
 */
export function getSuperuserEmails(): string[] {
  return (process.env.SUPERUSER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperuserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getSuperuserEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}
