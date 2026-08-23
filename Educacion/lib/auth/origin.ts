/**
 * Resolución determinista y production-safe del origin para los
 * `emailRedirectTo` de Supabase Auth.
 *
 * FIX-20260822-01:
 *  - Producción NUNCA lee el host de la request (cabeceras controladas por
 *    el cliente ⇒ atacante podría envenenar el email de confirmación con
 *    un dominio propio).
 *  - Dev / local sigue funcionando con `x-forwarded-host` / `x-forwarded-proto`
 *    (o `host` como fallback) para no romper el flujo local.
 *
 * Precedencia:
 *   1. `NEXT_PUBLIC_SITE_URL` si está definido y parsea como URL absoluta.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` con `https://` forzado.
 *   3. Cabeceras de la request — ÚNICAMENTE fuera de producción.
 *
 * Helper puro (sin `next/headers`) para poder ejercer todas las ramas desde
 * tests sin necesidad de un servidor Next en marcha.
 */

export interface ResolveOriginInput {
  siteUrl?: string | undefined;
  vercelProd?: string | undefined;
  isProd: boolean;
  forwardedHost?: string | null | undefined;
  forwardedProto?: string | null | undefined;
  host?: string | null | undefined;
}

export function resolveOrigin(input: ResolveOriginInput): string {
  // 1) NEXT_PUBLIC_SITE_URL — más alta prioridad, controla el origen
  //    público y permite forzar scheme (http en local-staging, https en prod).
  const siteUrl = input.siteUrl?.trim();
  if (siteUrl) {
    try {
      const u = new URL(siteUrl);
      // Solo aceptamos http/https para evitar file:, javascript:, etc.
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return u.origin;
      }
    } catch {
      // URL mal formada — caemos al siguiente origen.
    }
  }

  // 2) VERCEL_PROJECT_PRODUCTION_URL — Vercel garantiza hostname sin scheme;
  //    forzamos https para producción.
  const vercelProd = input.vercelProd?.trim().replace(/\/+$/, '');
  if (vercelProd) {
    return `https://${vercelProd}`;
  }

  // 3) Cabeceras — sólo en desarrollo / local. Producción nunca debe leer
  //    un host del request: el cliente controla la cabecera y podría
  //    envenenar `emailRedirectTo` apuntando a un dominio malicioso.
  if (!input.isProd) {
    const host = input.forwardedHost ?? input.host ?? 'localhost:3000';
    const proto = input.forwardedProto ?? 'http';
    return `${proto}://${host}`;
  }

  // Producción sin env vars es un error de despliegue: emitimos un mensaje
  // explícito en lugar de devolver `http://localhost:3000` (que rompería el
  // email de confirmación silenciosamente).
  throw new Error(
    '[auth] No production origin configured. Set NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL before deploying.',
  );
}
