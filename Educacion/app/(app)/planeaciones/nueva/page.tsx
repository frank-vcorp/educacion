/**
 * Wizard de planeación — entrada.
 * SPEC_TEC_04 §3 + D-FIN-6.
 * Carga catálogos y datos del docente/grupo, luego delega al cliente.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import {
  getCamposFormativos,
  getEjesArticuladores,
  getPDAs,
  getContenidos,
} from '@/services/catalogo/catalogo';
import { WizardPlaneacion } from '@/components/planeaciones/wizard-planeacion';

export const dynamic = 'force-dynamic';

export default async function NuevaPlaneacionPage() {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) redirect('/login');

  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from('grupo')
    .select('id, nivel')
    .eq('docente_id', session.docenteId)
    .eq('activo', true)
    .limit(1);
  const grupo = grupos?.[0];
  if (!grupo) redirect('/onboarding/grupo');

  const [campos, ejes, pdas, contenidos] = await Promise.all([
    getCamposFormativos(),
    getEjesArticuladores(),
    getPDAs(),
    getContenidos(),
  ]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">Nueva planeación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige entre las 6 modalidades NEM: Proyecto Comunitario, Unidad Didáctica,
          Aprendizaje Basado en Juego (ABJ), Rincones, Centros de Interés o Taller
          Crítico. Te tomará ~10 minutos.
        </p>
      </header>
      <WizardPlaneacion
        docenteId={session.docenteId}
        grupoId={grupo.id}
        cct={session.cct}
        nivel={grupo.nivel}
        campos={campos}
        ejes={ejes}
        pdas={pdas}
        contenidos={contenidos}
      />
    </div>
  );
}
