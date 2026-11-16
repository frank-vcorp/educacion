import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Building2, ArrowLeftRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/auth/user-menu';

interface DirectorHeaderProps {
  user: User;
  cct: string;
  escuelaNombre: string;
  isSuperuser?: boolean;
}

export function DirectorHeader({ user, cct, escuelaNombre, isSuperuser }: DirectorHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        {/* Brand + Context */}
        <div className="flex items-center gap-3">
          <Link href="/director" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-none tracking-tight text-foreground flex items-center gap-1.5">
                Dirección Escolar
                <Badge variant="verde" className="text-[10px] h-4 px-1.5">NEM</Badge>
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {escuelaNombre} · CCT {cct}
              </span>
            </div>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isSuperuser && (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex text-xs h-8 gap-1.5">
              <Link href="/admin">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Consola Admin</span>
              </Link>
            </Button>
          )}

          <Button asChild variant="ghost" size="sm" className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard">
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vista Maestra</span>
            </Link>
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
