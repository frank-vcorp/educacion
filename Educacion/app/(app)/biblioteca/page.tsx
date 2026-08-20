/**
 * Vista: biblioteca CONALITEG con iframe online (T13 + D-FIN-10).
 * SPEC_TEC_02 §5.1.9 + ADR-010.
 * La plataforma NO aloja contenido: solo iframe a portal CONALITEG.
 */
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConalitegIframe } from '@/components/pdf-viewer/conaliteg-iframe';
import { AtribucionSep } from '@/components/pdf-viewer/atribucion-sep';
import { getReferenciasConaliteg } from '@/services/catalogo/catalogo';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const refs = await getReferenciasConaliteg();

  if (refs.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <EmptyState
          title="No hay libros CONALITEG cargados"
          description="Ejecuta la migración 0016_seed_catalogo.sql."
        />
      </div>
    );
  }

  const found = searchParams.id ? refs.find((r) => String(r.id) === searchParams.id) : undefined;
  const selected: typeof refs[number] = found ?? refs[0]!;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-nem-verde">Biblioteca CONALITEG</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Libros de texto gratuitos. Plataforma NEM solo enlaza al portal oficial.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            19 libros
          </h2>
          <ul className="space-y-1">
            {refs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/biblioteca?id=${r.id}`}
                  className={`flex items-start gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-muted ${
                    String(r.id) === String(selected.id) ? 'border-nem-verde bg-nem-verde/5' : ''
                  }`}
                >
                  <Badge variant="secondary" className="text-[10px]">{r.grado}</Badge>
                  <span className="line-clamp-2">{r.titulo_libro}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{selected.titulo_libro}</CardTitle>
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
