/**
 * Vista: 4 campos formativos NEM (T7).
 * SPEC_TEC_02 §5.1.2 — campos_formativos.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getCamposFormativos } from '@/services/catalogo/catalogo';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

const PALETA_CAMPO = [
  'bg-nem-verde/10 text-nem-verde',
  'bg-nem-amarillo/20 text-amber-900',
  'bg-nem-naranja/15 text-orange-900',
  'bg-nem-rojo/10 text-red-900',
];

export default async function CamposPage() {
  const campos = await getCamposFormativos();

  if (campos.length === 0) {
    return (
      <EmptyState
        title="No hay campos formativos cargados"
        description="Ejecuta la migración 0016_seed_catalogo.sql en tu proyecto Supabase."
      />
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Los 4 campos formativos de Fase 2</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {campos.map((c, idx) => (
          <Card key={c.codigo}>
            <CardHeader>
              <span
                className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${PALETA_CAMPO[idx % PALETA_CAMPO.length] ?? 'bg-muted'}`}
              >
                #{c.orden}
              </span>
              <CardTitle className="text-xl">{c.nombre}</CardTitle>
              <CardDescription>{c.codigo}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{c.descripcion}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
