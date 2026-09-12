import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { AlumnosManager } from '@/app/(app)/alumnos/alumnos-manager';

export const dynamic = 'force-dynamic';

export default async function EmbedAlumnosPage() {
  const session = await getServerSession();
  if (!session?.docenteId) redirect('/login');

  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from('grupo')
    .select('id, grado, grupo, nivel, ciclo_escolar')
    .eq('docente_id', session.docenteId)
    .eq('activo', true)
    .limit(1);
  const grupo = grupos?.[0];

  if (!grupo) {
    return (
      <div className="p-4">
        <EmptyState
          title="Sin grupo activo"
          description="Crea primero un grupo para registrar alumnos."
          action={
            <Button asChild size="sm">
              <Link href="/onboarding/grupo">Crear grupo</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { data: alumnos } = await supabase
    .from('alumno')
    .select('id, nombre, created_at')
    .eq('grupo_id', grupo.id)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  return (
    <div className="p-3 sm:p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Grupo:{' '}
        <span className="font-medium text-foreground">
          {grupo.grado}° {grupo.grupo} ({grupo.nivel})
        </span>
      </p>
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {alumnos && alumnos.length > 0
              ? `${alumnos.length} alumno(s) registrado(s)`
              : 'Aún no has agregado alumnos'}
          </div>
          <AlumnosManager
            initialAlumnos={alumnos ?? []}
            grupo={{
              id: grupo.id,
              grado: grupo.grado,
              grupo: grupo.grupo,
              ciclo_escolar: grupo.ciclo_escolar,
            }}
            avisoAceptado={session.hasAcceptedAviso}
          />
        </CardContent>
      </Card>
    </div>
  );
}
