/**
 * Layout del módulo catálogo (T7).
 * SPEC_TEC_04 §3: ruta /(app)/catalogo/*.
 */
import type { ReactNode } from 'react';
import { CatalogoNav } from '@/components/catalogo/catalogo-nav';

export default function CatalogoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">Catálogo NEM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Campos formativos, ejes articuladores, PDA, contenidos y referencias oficiales.
        </p>
      </header>
      <CatalogoNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
