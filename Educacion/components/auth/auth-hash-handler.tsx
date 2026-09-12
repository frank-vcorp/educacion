'use client';

/**
 * Completa sesión cuando Supabase devuelve tokens en el hash (#access_token=…).
 * Ocurre con magic links si el callback server-side no recibe ?code= (PKCE).
 */
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AuthHashHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;

    started.current = true;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;

    const redirect = searchParams.get('redirect') ?? '/dashboard';
    const supabase = createClient();

    void supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) return;
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        router.replace(redirect);
        router.refresh();
      });
  }, [router, searchParams]);

  return null;
}
