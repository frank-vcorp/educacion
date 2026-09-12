import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { listRecursos } from '@/services/recursos-aula/recurso-actions';
import { RecursoFormDialog } from '@/components/recursos-aula/recurso-form-dialog';
import { RecursoCard } from '@/components/recursos-aula/recurso-card';
import { CATEGORIAS_RECURSO } from '@/services/recursos-aula/sugerir-uso';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function EmbedRecursosAulaPage() {
  const session = await getServerSession();
  if (!session?.docenteId || !session.cct) redirect('/login');

  const { items } = await listRecursos(session.docenteId);

  return (
    <div className="p-3 sm:p-4">
      <header className="mb-4 flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Materiales de tu aula. Puedes agregar recursos y volver al calendario sin perder tu
          planeación.
        </p>
        <RecursoFormDialog docenteId={session.docenteId} cct={session.cct} />
      </header>

      <section className="mb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIAS_RECURSO.map((c) => (
            <div
              key={c.codigo}
              className="rounded-lg border bg-muted/30 p-2 text-center text-xs"
            >
              <span className="text-xl">{c.emoji}</span>
              <p className="mt-0.5 font-medium">{c.nombre}</p>
            </div>
          ))}
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyState
          title="Aún no tienes recursos registrados"
          description="Agrega los materiales con los que cuentas en tu aula."
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
    </div>
  );
}
