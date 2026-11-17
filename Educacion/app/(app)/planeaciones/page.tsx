/**
 * Lista de planeaciones del docente + acceso a wizard.
 * SPEC_TEC_04 §3.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, CheckSquare, FileText, Plus, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listPlaneaciones } from '@/services/planeaciones/planeacion-actions';
import { getServerSession } from '@/lib/auth/session';
import { EmptyState } from '@/components/shared/states';
import { MODALIDADES_LABELS } from '@/components/planeaciones/wizard-modalidad-data';

export const dynamic = 'force-dynamic';

function badgeEstado(estado: string): { label: string; variant: 'verde' | 'amarillo' | 'secondary' } {
  switch (estado) {
    case 'entregada':
      return { label: 'Entregada', variant: 'amarillo' };
    case 'recibida':
    case 'aprobada':
      return { label: 'Con Vo.Bo.', variant: 'verde' };
    default:
      return { label: estado.charAt(0).toUpperCase() + estado.slice(1), variant: 'secondary' };
  }
}

export default async function PlaneacionesPage() {
  const session = await getServerSession();
  if (!session || !session.docenteId) redirect('/login');

  const { items } = await listPlaneaciones(session.docenteId);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-nem-verde">Mis planeaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea, edita, registra tu bitácora y entrega tus planeaciones al director.
          </p>
        </div>
        <Button asChild>
          <Link href="/planeaciones/nueva">
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva planeación
          </Link>
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
          {items.map((p) => {
            const est = badgeEstado(p.estado);
            const modLabel = MODALIDADES_LABELS[p.modalidad as keyof typeof MODALIDADES_LABELS] ?? p.modalidad;
            return (
              <li key={p.id}>
                <Card className="transition-shadow hover:shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          <Link href={`/planeaciones/${p.id}`} className="hover:text-nem-verde hover:underline">
                            {p.nombre}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                          <span>{p.periodo_inicio} → {p.periodo_fin}</span>
                          {modLabel && (
                            <Badge variant="outline" className="text-[11px] font-normal">
                              {modLabel}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant={est.variant}>{est.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm">
                      <Link href={`/planeaciones/${p.id}`}>
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Abrir
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/planeaciones/${p.id}/bitacora`}>
                        <BookOpen className="mr-1.5 h-3.5 w-3.5 text-nem-verde" />
                        Bitácora
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/planeaciones/${p.id}/evaluar`}>
                        <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-nem-verde" />
                        Evaluar
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/planeaciones/${p.id}/generar-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                        PDF
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
