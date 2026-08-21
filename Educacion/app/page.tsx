/**
 * Home page — landing pública mínima.
 * La landing real (login/registro) se implementa en app/(auth)/login/page.tsx
 * y app/(auth)/registro/page.tsx (SPEC_TEC_04 §3, §9.1).
 */
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-nem-verde sm:text-5xl">
          NEM — Módulo Docente
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Planeación didáctica para preescolar mexicana
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Registrarme
        </Link>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        MVP en construcción. Setup monorepo inicializado · Path A SQL aplicado.
      </p>
      <footer className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
        Hecho <Heart aria-hidden="true" className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> para las Maetas · por Ing. Frank Saavedra
      </footer>
    </main>
  );
}
