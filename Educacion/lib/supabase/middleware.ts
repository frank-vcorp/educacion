/**
 * Supabase middleware — refresh session en every request.
 * SPEC_TEC_04 §7.2 + §7.3: route groups (auth)/(app) + protección.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericDB = any;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // En modo demo (sin env vars reales), no crear cliente. La página renderiza
  // y la auth UI funciona; las queries fallarán hasta que Frank configure
  // un proyecto Supabase real.
  if (!url || !key || url.includes('placeholder')) {
    return response;
  }

  const supabase = createServerClient<GenericDB>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: getUser() refresca la sesión si está por expirar.
  // NO usar getSession() en middleware (no valida JWT contra el servidor).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas protegidas: /(app)/* requiere sesión
  const isAppRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/planeaciones') ||
    request.nextUrl.pathname.startsWith('/onboarding') ||
    request.nextUrl.pathname.startsWith('/alumnos') ||
    request.nextUrl.pathname.startsWith('/recursos-aula') ||
    request.nextUrl.pathname.startsWith('/evaluaciones') ||
    request.nextUrl.pathname.startsWith('/biblioteca') ||
    request.nextUrl.pathname.startsWith('/ajustes');

  if (isAppRoute && !user) {
    const url2 = request.nextUrl.clone();
    url2.pathname = '/login';
    url2.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url2);
  }

  // Rutas auth-only: si ya hay sesión, redirigir al dashboard
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/registro');
  if (isAuthRoute && user) {
    const url2 = request.nextUrl.clone();
    url2.pathname = '/dashboard';
    return NextResponse.redirect(url2);
  }

  return response;
}
