/**
 * Vista: 19 referencias a libros CONALITEG (T7 + D-FIN-10).
 * SPEC_TEC_02 §5.1.9 — referencia_libro_conaliteg.
 * Atribución obligatoria: "Libro distribuido por CONALITEG, SEP".
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getReferenciasConaliteg } from '@/services/catalogo/catalogo';
import { AtribucionSep } from '@/components/pdf-viewer/atribucion-sep';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function RefsPage() {
  const refs = await getReferenciasConaliteg();

  if (refs.length === 0) {
    return (
      <EmptyState
        title="No hay referencias CONALITEG cargadas"
        description="Ejecuta la migración 0016_seed_catalogo.sql."
      />
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Biblioteca CONALITEG</h2>
        <p className="text-sm text-muted-foreground">
          Referencias oficiales a libros de texto gratuitos. La plataforma NO aloja el contenido;
          solo enlaza al portal CONALITEG.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {refs.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{r.grado}</Badge>
                <Badge variant="outline">{r.edicion}</Badge>
              </div>
              <CardTitle className="mt-1 text-base leading-tight">{r.titulo_libro}</CardTitle>
              <p className="text-xs text-muted-foreground">{r.campo}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {r.notas && (
                <p className="text-xs leading-relaxed text-muted-foreground">{r.notas}</p>
              )}
              <a
                href={r.url_publica}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm font-medium text-nem-verde underline-offset-2 hover:underline"
              >
                Ver en CONALITEG →
              </a>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {r.tipo} · {r.formato}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AtribucionSep />
    </section>
  );
}
