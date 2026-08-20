/**
 * Página: entregar planeación al director (T14).
 * SPEC_TEC_04 §3 + D-FIN-19.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { EntregarDirectorDialog } from '@/components/entregas/entregar-director-dialog';

export const dynamic = 'force-dynamic';

export default async function EntregarPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) redirect('/login');

  const supabase = await createClient();
  const { data: planeacion } = await supabase
    .from('planeacion')
    .select('id, nombre, docente_id, cct, estado')
    .eq('id', params.id)
    .maybeSingle();
  if (!planeacion || planeacion.docente_id !== session.docenteId) {
    redirect('/planeaciones');
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">Entregar al director</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {planeacion.nombre}
        </p>
      </header>

      <EntregarDirectorDialog
        planeacionId={planeacion.id}
        docenteId={session.docenteId}
        cct={session.cct}
      />

      <div className="mt-6">
        <Button asChild variant="ghost">
          <Link href={`/planeaciones/${planeacion.id}`}>← Volver</Link>
        </Button>
      </div>
    </div>
  );
}
