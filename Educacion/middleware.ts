/**
 * Next.js middleware — actualiza sesión Supabase en cada request.
 * SPEC_TEC_04 §7.3: route groups (auth)/(app) + protección.
 */
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluye static files, _next, favicon, manifest
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
