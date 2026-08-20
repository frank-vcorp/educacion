/**
 * Hook de sesión para Client Components.
 * SPEC_TEC_04 §7.4: useUser.
 * Usa react-query para caché y revalidación en foco.
 */
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface UserHook {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useUser(): UserHook {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // Carga inicial
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setIsLoading(false);
    });

    // Suscripción a cambios
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, isLoading, signOut };
}
