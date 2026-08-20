/**
 * Lista de planeaciones del docente + acceso a wizard.
 * SPEC_TEC_04 §3.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listPlaneaciones } from '@/services/planeaciones/planeacion-actions';
import { getServerSession } from '@/lib/auth/session';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function PlaneacionesPage() {
  const session = await getServerSession();
  if (!session || !session.docenteId) redirect('/login');

  const { items } = await listPlaneaciones(session.docenteId);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nem-verde">Mis planeaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea, edita y entrega tus planeaciones al director.
          </p>
        </div>
        <Button asChild>
          <Link href="/planeaciones/nueva">Nueva planeación</Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Aún no tienes planeaciones"
          description="Crea tu primera planeación con el wizard guiado."
          action={
            <Button asChild>
              <Link href="/planeaciones/nueva">Crear planeación</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{p.nombre}</CardTitle>
                      <CardDescription>
                        {p.periodo_inicio} → {p.periodo_fin}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{p.estado}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/planeaciones/${p.id}`}>Abrir</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
