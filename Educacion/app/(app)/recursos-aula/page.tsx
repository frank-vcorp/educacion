/**
 * Vista: inventario del aula (E21).
 * SPEC_TEC_02 §5.3.10 + T10.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { listRecursos } from '@/services/recursos-aula/recurso-actions';
import { RecursoFormDialog } from '@/components/recursos-aula/recurso-form-dialog';
import { RecursoCard } from '@/components/recursos-aula/recurso-card';
import { CATEGORIAS_RECURSO } from '@/services/recursos-aula/sugerir-uso';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function RecursosAulaPage() {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) redirect('/login');

  const { items } = await listRecursos(session.docenteId);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nem-verde">Recursos del aula</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario personal por categoría pedagógica. Arrastra o asigna a sesiones del planeación.
          </p>
        </div>
        <RecursoFormDialog docenteId={session.docenteId} cct={session.cct} />
      </header>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Categorías pedagógicas
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIAS_RECURSO.map((c) => (
            <div
              key={c.codigo}
              className="rounded-lg border bg-muted/30 p-3 text-center text-sm"
            >
              <span className="text-2xl">{c.emoji}</span>
              <p className="mt-1 font-medium">{c.nombre}</p>
            </div>
          ))}
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyState
          title="Aún no tienes recursos registrados"
          description="Empieza agregando los materiales con los que cuentas en tu aula."
          action={
            <RecursoFormDialog docenteId={session.docenteId} cct={session.cct} />
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <li key={r.id}>
              <RecursoCard recurso={r} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/dashboard">← Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
