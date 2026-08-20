/**
 * Vista: rúbrica semáforo por alumnos (T11 + D-FIN-2, D-FIN-3).
 * SPEC_TEC_02 §5.3.9.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { listEvaluaciones } from '@/services/evaluacion/evaluacion-actions';
import { RubricaSemaforoBoard } from '@/components/evaluacion/rubrica-semaforo-board';

export const dynamic = 'force-dynamic';

export default async function EvaluarPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) redirect('/login');

  const supabase = await createClient();
  const { data: planeacion } = await supabase
    .from('planeacion')
    .select('id, nombre, docente_id, grupo_id, pdas')
    .eq('id', params.id)
    .maybeSingle();

  if (!planeacion) redirect('/planeaciones');
  if (planeacion.docente_id !== session.docenteId) redirect('/planeaciones');

  const [{ data: alumnosGrupo }, { items: evaluaciones }] = await Promise.all([
    supabase
      .from('alumno')
      .select('id, nombre')
      .eq('grupo_id', planeacion.grupo_id)
      .eq('activo', true)
      .order('nombre', { ascending: true }),
    listEvaluaciones(params.id),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-nem-verde">
          Evaluar: {planeacion.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arrastra a cada alumna/alumno al nivel de logro. Se guarda automáticamente.
        </p>
      </header>

      <RubricaSemaforoBoard
        planeacionId={planeacion.id}
        docenteId={session.docenteId}
        cct={session.cct}
        pdas={(planeacion.pdas ?? []) as string[]}
        alumnos={(alumnosGrupo ?? []) as Array<{ id: string; nombre: string }>}
        evaluacionesIniciales={evaluaciones as Array<{
          id: string;
          alumno_id: string;
          nivel: number;
          pda_codigo: string | null;
          fecha: string;
        }>}
      />
    </div>
  );
}
