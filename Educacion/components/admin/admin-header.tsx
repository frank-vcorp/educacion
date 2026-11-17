import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RoleViewSelector } from './role-view-selector';
import { UserMenu } from '@/components/auth/user-menu';

interface AdminHeaderProps {
  user: User;
  cct?: string | null;
}

export function AdminHeader({ user, cct }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 text-slate-100 shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-none tracking-tight text-white flex items-center gap-2">
                NEM Command Center
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] h-4 px-1 font-mono">
                  PROD · v0.1
                </Badge>
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Superusuario SaaS · Plataforma Educativa Federal
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Quick Role View Switcher */}
          <RoleViewSelector currentRole="admin" cct={cct} />

          <div className="h-4 w-px bg-slate-800" />

          {/* User profile */}
          <div className="flex items-center gap-2">
            <UserMenu
              user={user}
              perfilHref="/admin/perfil"
              ajustesHref="/admin/ajustes"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
