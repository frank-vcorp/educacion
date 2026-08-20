/**
 * Navbar lateral de secciones del catálogo NEM.
 * SPEC_TEC_04 §3 (catálogo) y T7 (frontend catálogos).
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const sections = [
  { href: '/catalogo/campos', label: 'Campos formativos' },
  { href: '/catalogo/ejes', label: 'Ejes articuladores' },
  { href: '/catalogo/pda', label: 'PDA' },
  { href: '/catalogo/contenidos', label: 'Contenidos' },
  { href: '/catalogo/refs', label: 'Libros CONALITEG' },
  { href: '/catalogo/bloques', label: 'Catálogo M1 de bloques' },
];

export function CatalogoNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del catálogo" className="flex flex-wrap gap-2">
      {sections.map((s) => {
        const active = pathname?.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-nem-verde bg-nem-verde text-white'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
