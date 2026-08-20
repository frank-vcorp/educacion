/**
 * Vista: PDA filtrables por campo y grado (T7).
 * SPEC_TEC_02 §5.1.5 — pda (24 registros en Fase 2).
 */
import { getPDAs, getCamposFormativos } from '@/services/catalogo/catalogo';
import { PdaFilterList } from '@/components/catalogo/pda-filter-list';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function PdaPage({
  searchParams,
}: {
  searchParams: { campo?: string; grado?: string };
}) {
  const [pdas, campos] = await Promise.all([getPDAs(), getCamposFormativos()]);

  if (pdas.length === 0 && campos.length === 0) {
    return (
      <EmptyState
        title="No hay PDA cargados"
        description="Ejecuta la migración 0016_seed_catalogo.sql."
      />
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Procesos de Desarrollo de Aprendizaje (PDA)</h2>
      <p className="text-sm text-muted-foreground">
        Los PDA son oficiales del DOF. La maestra NO puede crear PDA personalizados (P-PD2).
      </p>
      <PdaFilterList pdas={pdas} campos={campos} selectedCampo={searchParams.campo} selectedGrado={searchParams.grado} />
    </section>
  );
}
