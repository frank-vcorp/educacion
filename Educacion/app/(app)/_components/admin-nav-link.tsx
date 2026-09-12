import Link from 'next/link';
import { Shield } from 'lucide-react';
import { getServerSession } from '@/lib/auth/session';
import { isSuperuserEmail } from '@/lib/auth/superuser';
import { cn } from '@/lib/utils';

export async function AdminNavLink() {
  const session = await getServerSession();
  if (!session || !isSuperuserEmail(session.user.email)) return null;

  return (
    <Link
      href="/admin"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Shield className="h-4 w-4" />
      <span className="hidden lg:inline">Superusuario</span>
    </Link>
  );
}
