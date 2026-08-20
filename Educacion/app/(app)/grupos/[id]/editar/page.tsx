/**
 * Página de edición/eliminación de grupo.
 * SPEC-CORRECCIONES-2026-08-17 C-2.
 */
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { EditarGrupoForm } from './editar-grupo-form';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function EditarGrupoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !session.docenteId) redirect('/login');

  const supabase = await createClient();
  const { data: grupo } = await supabase
    .from('grupo')
    .select('id, grado, grupo, nivel, cct, ciclo_escolar, total_alumnos')
    .eq('id', params.id)
    .eq('docente_id', session.docenteId)
    .maybeSingle();

  if (!grupo) notFound();

  // conteo de alumnos
  const { count } = await supabase
    .from('alumno')
    .select('id', { count: 'exact', head: true })
    .eq('grupo_id', grupo.id)
    .eq('activo', true);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-nem-verde">
            Editar grupo {grupo.grado}° {grupo.grupo}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CCT: <span className="font-mono">{grupo.cct}</span> · Nivel: {grupo.nivel}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">← Volver</Link>
        </Button>
      </header>

      <EditarGrupoForm
        grupoId={grupo.id}
        inicial={{
          grado: grupo.grado,
          grupo: grupo.grupo,
          cicloEscolar: grupo.ciclo_escolar,
          totalAlumnos: grupo.total_alumnos,
        }}
        totalAlumnosRegistrados={count ?? 0}
      />
    </div>
  );
}
