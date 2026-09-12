import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { isSuperuserEmail } from '@/lib/auth/superuser';

export async function requireSuperuserSession() {
  const session = await getServerSession();
  if (!session) redirect('/login?redirect=/admin');
  if (!isSuperuserEmail(session.user.email)) redirect('/dashboard');
  return session;
}
