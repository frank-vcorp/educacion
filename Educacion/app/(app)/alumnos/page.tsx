/**
 * Vista: gestión completa de alumnos del grupo activo.
 * SPEC-CORRECCIONES-2026-08-17 C-3.
 *
 * Lista, búsqueda, agregar uno, agregar varios, editar, eliminar.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { AlumnosManager } from './alumnos-manager';

export const dynamic = 'force-dynamic';

export default async function AlumnosPage() {
  const session = await getServerSession();
  if (!session || !session.docenteId) redirect('/login');

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
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-nem-verde">Mis alumnos</h1>
        </header>
        <EmptyState
          title="Sin grupo activo"
          description="Crea primero un grupo para poder registrar alumnos."
          action={
            <Button asChild>
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
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">Mis alumnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grupo activo:{' '}
          <span className="font-medium text-foreground">
            {grupo.grado}° {grupo.grupo} ({grupo.nivel})
          </span>
        </p>
      </header>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
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
