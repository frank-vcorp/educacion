/**
 * Vista: 7 ejes articuladores NEM (T7).
 * SPEC_TEC_02 §5.1.3 — ejes_articuladores.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getEjesArticuladores } from '@/services/catalogo/catalogo';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function EjesPage() {
  const ejes = await getEjesArticuladores();

  if (ejes.length === 0) {
    return (
      <EmptyState
        title="No hay ejes articuladores cargados"
        description="Ejecuta la migración 0016_seed_catalogo.sql."
      />
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Los 7 ejes articuladores del programa</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ejes.map((e) => (
          <Card key={e.codigo}>
            <CardHeader>
              <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                #{e.orden}
              </span>
              <CardTitle className="text-lg">{e.nombre}</CardTitle>
              <CardDescription>{e.codigo}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{e.descripcion}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
