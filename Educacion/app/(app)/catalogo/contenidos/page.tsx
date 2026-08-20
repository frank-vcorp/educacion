/**
 * Vista: contenidos oficiales del programa (T7).
 * SPEC_TEC_02 §5.1.6 — contenido (4 registros en Fase 2).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getContenidos, getCamposFormativos } from '@/services/catalogo/catalogo';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function ContenidosPage() {
  const [contenidos, campos] = await Promise.all([getContenidos(), getCamposFormativos()]);
  const campoByCodigo = new Map(campos.map((c) => [c.codigo, c.nombre]));

  if (contenidos.length === 0) {
    return (
      <EmptyState
        title="No hay contenidos cargados"
        description="Ejecuta la migración 0016_seed_catalogo.sql."
      />
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Contenidos oficiales del programa</h2>
      <ul className="space-y-3">
        {contenidos.map((c) => (
          <Card key={c.codigo}>
            <CardHeader>
              <CardTitle className="text-base">{c.codigo}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Campo formativo: {campoByCodigo.get(c.campo_codigo) ?? c.campo_codigo}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{c.texto}</p>
            </CardContent>
          </Card>
        ))}
      </ul>
    </section>
  );
}
