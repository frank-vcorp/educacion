import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConalitegIframe } from '@/components/pdf-viewer/conaliteg-iframe';
import { AtribucionSep } from '@/components/pdf-viewer/atribucion-sep';
import { getReferenciasConaliteg } from '@/services/catalogo/catalogo';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

const BASE = '/embed/biblioteca';

export default async function EmbedBibliotecaPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const refs = await getReferenciasConaliteg();

  if (refs.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No hay libros CONALITEG cargados"
          description="Ejecuta la migración 0016_seed_catalogo.sql."
        />
      </div>
    );
  }

  const found = searchParams.id ? refs.find((r) => String(r.id) === searchParams.id) : undefined;
  const selected: (typeof refs)[number] = found ?? refs[0]!;

  return (
    <div className="p-3 sm:p-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Libros CONALITEG
          </h2>
          <ul className="max-h-[40vh] space-y-1 overflow-y-auto lg:max-h-[calc(90vh-8rem)]">
            {refs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`${BASE}?id=${r.id}`}
                  className={`flex items-start gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-muted ${
                    String(r.id) === String(selected.id) ? 'border-nem-verde bg-nem-verde/5' : ''
                  }`}
                >
                  <Badge variant="secondary" className="text-[10px]">
                    {r.grado}
                  </Badge>
                  <span className="line-clamp-2">{r.titulo_libro}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{selected.titulo_libro}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {selected.campo} · {selected.edicion} · {selected.tipo}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={selected.url_publica} target="_blank" rel="noopener noreferrer">
                    Abrir en CONALITEG
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConalitegIframe src={selected.url_publica} title={selected.titulo_libro} />
              {selected.notas && (
                <p className="text-xs text-muted-foreground">{selected.notas}</p>
              )}
              <AtribucionSep />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
