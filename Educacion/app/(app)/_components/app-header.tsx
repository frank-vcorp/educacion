/**
 * Header de las páginas autenticadas (logo + nav + GrupoSelector + menú usuario).
 * SPEC-CORRECCIONES-2026-08-17 C-4: menú principal + dropdown usuario.
 */
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { GrupoSelector } from '@/components/grupo/grupo-selector';
import { NavMenu } from './nav-menu';
import { UserMenu } from './user-menu';

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-semibold text-nem-verde">NEM</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Planeación didáctica
            </span>
          </Link>
          <NavMenu />
        </div>
        <div className="flex items-center gap-2">
          <GrupoSelector />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
