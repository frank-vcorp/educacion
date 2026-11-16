import Link from 'next/link';
import { Shield, Building2 } from 'lucide-react';
import { getServerSession } from '@/lib/auth/session';
import { isSuperuserEmail } from '@/lib/auth/superuser';
import { cn } from '@/lib/utils';

export async function AdminNavLink() {
  const session = await getServerSession();
  if (!session) return null;

  const isSuper = isSuperuserEmail(session.user.email);

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/director"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-800',
        )}
        title="Panel de Dirección Escolar"
      >
        <Building2 className="h-3.5 w-3.5 text-emerald-700" />
        <span className="hidden md:inline">Dirección</span>
      </Link>

      {isSuper && (
        <Link
          href="/admin"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            'text-muted-foreground hover:bg-slate-100 hover:text-slate-900',
          )}
          title="Consola Superusuario SaaS"
        >
          <Shield className="h-3.5 w-3.5 text-slate-700" />
          <span className="hidden lg:inline">Superusuario</span>
        </Link>
      )}
    </div>
  );
}
