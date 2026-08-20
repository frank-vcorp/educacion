/**
 * Vista: catálogo M1 de bloques arrastrables (T8 + D-FIN-1).
 * Grid filtrable por campo formativo, tipo y nivel de flexibilidad.
 */
import { getBloquesCatalogo, getCamposFormativos } from '@/services/catalogo/catalogo';
import { BloquesGrid } from '@/components/catalogo/bloques-grid';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function BloquesPage({
  searchParams,
}: {
  searchParams: { campo?: string; tipo?: string; nivel?: string };
}) {
  const [bloques, campos] = await Promise.all([
    getBloquesCatalogo({
      campoCodigo: searchParams.campo,
      tipo: searchParams.tipo as never,
      nivelFlexibilidad: searchParams.nivel as never,
    }),
    getCamposFormativos(),
  ]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Catálogo M1 — bloques arrastrables</h2>
        <p className="text-sm text-muted-foreground">
          3 niveles de flexibilidad: <strong>cerrado</strong> (texto pre-armado),{' '}
          <strong>abierto</strong> (editable), <strong>en blanco</strong> (estructura, tú escribes).
        </p>
      </div>
      {bloques.length === 0 ? (
        <EmptyState
          title="Aún no hay bloques cargados"
          description="Aplica la migración 0017_bloque_catalogo_seed.sql en tu proyecto Supabase."
        />
      ) : (
        <BloquesGrid bloques={bloques} campos={campos} />
      )}
    </section>
  );
}
