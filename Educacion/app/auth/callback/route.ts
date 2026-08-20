/**
 * Auth callback para OAuth/magic link de Supabase.
 * Intercambia el code por sesión y redirige.
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Fallback: redirige a login con error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
