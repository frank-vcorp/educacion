/**
 * Browser Supabase client — Client Components.
 * SPEC_TEC_04 §7.2: 3 entrypoints (browser, server, middleware).
 * NO usar @supabase/auth-helpers-nextjs (deprecado).
 */
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
