/**
 * Página 404 custom — NEM.
 * SPEC-CORRECCIONES-2026-08-17 C-6.
 *
 * Se muestra en cualquier ruta no encontrada.
 */
import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-nem-verde/10">
          <Search className="h-8 w-8 text-nem-verde" />
        </div>
        <p className="text-6xl font-bold text-nem-verde">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La ruta que buscas no existe o fue movida. Verifica la URL o vuelve al inicio.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
