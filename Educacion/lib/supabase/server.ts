/**
 * Server Supabase client — Server Components + Route Handlers.
 * SPEC_TEC_04 §7.2 + §7.4: RLS helpers, getUser, etc.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DB: any = undefined;
  return createServerClient<typeof DB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components no pueden setear cookies; el middleware lo hace.
            // Es seguro ignorar si el método se llama desde un Server Component.
          }
        },
      },
    },
  );
}
