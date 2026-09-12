'use client';

/**
 * Bloquea la app a docentes con nivel distinto de preescolar (cuentas legacy).
 * Permite /perfil y /onboarding para corregir CCT.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { esNivelSoportado, mensajeSoloPreescolar } from '@/lib/nivel-educativo/scope';
import { Button } from '@/components/ui/button';

export function PreescolarOnlyGate({ nivelDocente }: { nivelDocente: string | null }) {
  const pathname = usePathname();

  if (!nivelDocente || esNivelSoportado(nivelDocente)) return null;

  const rutasPermitidas =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/login');

  if (rutasPermitidas) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-medium">Esta versión es solo para preescolar</p>
      <p className="mt-1 text-amber-900/90">
        Tu cuenta está registrada como <strong className="capitalize">{nivelDocente}</strong>.
        {` ${mensajeSoloPreescolar()}`} Primaria y secundaria tendrán sistemas independientes más
        adelante.
      </p>
      <Button asChild size="sm" variant="outline" className="mt-3">
        <Link href="/perfil">Actualizar CCT a un jardín de niños</Link>
      </Button>
    </div>
  );
}
