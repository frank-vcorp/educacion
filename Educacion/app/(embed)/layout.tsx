/**
 * Layout mínimo para consulta rápida embebida (iframe en planeación).
 * Sin header global — solo auth.
 */
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';

export default async function EmbedLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return <div className="min-h-full bg-background">{children}</div>;
}
