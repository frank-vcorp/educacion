/**
 * Menú principal de navegación (desktop + mobile).
 * SPEC-CORRECCIONES-2026-08-17 C-4.
 *
 * Desktop: links horizontales + dropdown "Catálogo NEM".
 * Mobile: hamburger menu (Sheet).
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, BookOpen, Library, GraduationCap, BookText, LayoutDashboard, FileText, Users, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/planeaciones', label: 'Mis planeaciones', icon: FileText },
  { href: '/alumnos', label: 'Alumnos', icon: Users },
  { href: '/recursos-aula', label: 'Recursos', icon: Package },
  { href: '/biblioteca', label: 'Biblioteca', icon: Library },
];

const CATALOGO_ITEMS = [
  { href: '/catalogo/campos', label: 'Campos formativos' },
  { href: '/catalogo/pda', label: 'PDA' },
  { href: '/catalogo/bloques', label: 'Bloques M1' },
  { href: '/catalogo/refs', label: 'Libros CONALITEG' },
];

export function NavMenu() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  }

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-nem-verde/10 text-nem-verde'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              pathname?.startsWith('/catalogo')
                ? 'bg-nem-verde/10 text-nem-verde'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <BookText className="h-4 w-4" />
            <span>Catálogo NEM</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {CATALOGO_ITEMS.map((c) => (
              <DropdownMenuItem key={c.href} asChild>
                <Link href={c.href}>{c.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Mobile hamburger trigger */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile drawer (overlay simple, sin animación para no añadir dependencia) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <span className="text-base font-semibold text-nem-verde">NEM</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 p-3" aria-label="Navegación móvil">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-nem-verde/10 text-nem-verde'
                        : 'text-foreground hover:bg-accent',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="my-2 border-t" />

              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Catálogo NEM
              </p>
              {CATALOGO_ITEMS.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive(c.href)
                      ? 'bg-nem-verde/10 text-nem-verde'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  {c.label}
                </Link>
              ))}

              <div className="my-2 border-t" />

              <Link
                href="/ajustes"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                <GraduationCap className="h-4 w-4" />
                Ajustes
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
