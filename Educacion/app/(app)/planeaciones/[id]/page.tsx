/**
 * Vista detalle de una planeación (T9).
 * SPEC_TEC_02 §5.3.6.
 *
 * IMPL-20260819-01 — Incluye botón "Duplicar/Clonar" (D-FIN-17, §6.6)
 * para que la maestra pueda clonar hacia otro grupo del mismo CCT.
 *
 * IMPL-20260820-01 — Incluye unidades UI:
 *  - "Bloques" (`BloqueEditor`, SPEC_TEC_08 §4.1) — lista, crea, edita
 *    bloques y por cada bloque expone F1 + F2.
 *  - "Asistente IA" F3 (`IASugerenciaPanel` para F3 en cabecera) — pule
 *    `problema_contexto` / `proposito` / `producto_integrador` /
 *    `ajustes_razonables`.
 *
 * Las Cards preexistentes (problema, campos, PDA, ejes, ajustes) y los
 * botones (Evaluar / Entregar / Duplicar / Volver) se preservan intactos.
 * La unidad IA es aditiva.
 */
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getPlaneacion } from '@/services/planeaciones/planeacion-actions';
import { getBloques } from '@/services/planeaciones/bloque-actions';
import { getServerSession } from '@/lib/auth/session';
import { DuplicarPlaneacionDialog } from '@/components/planeaciones/duplicar-planeacion-dialog';
import { BloqueEditor } from '@/components/planeaciones/bloque-editor';
import { IASugerenciaPanel } from '@/components/ia/ia-sugerencia-panel';

export const dynamic = 'force-dynamic';

export default async function PlaneacionDetallePage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const res = await getPlaneacion(params.id);
  if (!res.ok || !res.data) notFound();

  const p = res.data;
  const isOwner = p.docente_id === session.docenteId;

  // Bloques (RLS hace que sólo se devuelvan los del docente). Si la
  // consulta falla (p.ej. timeout), degradación graceful: la UI sigue
  // mostrando el resto de la planeación; `BloqueEditor` mostrará "sin
  // bloques" y el docente podrá crear uno nuevo.
  const bloquesRes = isOwner
    ? await getBloques(p.id).catch(() => ({ ok: false, data: null, error: 'timeout' as const }))
    : { ok: false, data: null, error: 'not-owner' as const };
  const bloquesIniciales = bloquesRes.ok && bloquesRes.data ? bloquesRes.data : [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-nem-verde">{p.nombre}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.periodo_inicio} → {p.periodo_fin} · Modalidad {p.modalidad}
            </p>
          </div>
          <Badge variant="secondary">{p.estado}</Badge>
        </div>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Problema del contexto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{p.problema_contexto}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campos formativos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {(p.campos_formativos ?? []).map((c: string) => (
              <Badge key={c} variant="verde">{c}</Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">PDA trabajados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {(p.pdas ?? []).map((pd: string) => (
              <Badge key={pd} variant="outline">{pd}</Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ejes articuladores</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {(p.ejes_articuladores ?? []).length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              (p.ejes_articuladores ?? []).map((e: string) => (
                <Badge key={e} variant="amarillo">{e}</Badge>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajustes razonables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{p.ajustes_razonables ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── IMPL-20260820-01: unidad UI F1/F2/F3 ─── */}
      {isOwner && (
        <>
          <Separator className="my-6" />
          <section className="space-y-4" aria-labelledby="bloques-heading">
            <h2 id="bloques-heading" className="sr-only">
              Bloques
            </h2>
            <BloqueEditor
              planeacionId={p.id}
              docenteId={session.docenteId!}
              cct={p.cct}
              bloquesIniciales={bloquesIniciales}
            />
          </section>

          <section
            className="mt-6"
            aria-labelledby="asistente-ia-heading"
          >
            <h2
              id="asistente-ia-heading"
              className="mb-3 text-base font-semibold"
            >
              Asistente IA
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              La IA sugiere; tú decides. Pulsa &laquo;Aceptar&raquo; sólo si
              quieres aplicar el texto a tu planeación.
            </p>
            <IASugerenciaPanel
              planeacionId={p.id}
              docenteId={session.docenteId!}
              cct={p.cct}
              feature="F3"
              label="Pulir campos del PDF (F3)"
            />
          </section>
        </>
      )}

      <Separator className="my-6" />

      <div className="flex flex-wrap gap-2">
        {isOwner && (
          <>
            <Button asChild variant="outline">
              <Link href={`/planeaciones/${p.id}/evaluar`}>Evaluar</Link>
            </Button>
            <Button asChild>
              <Link href={`/planeaciones/${p.id}/entregar`}>Entregar al director</Link>
            </Button>
            {/* D-FIN-17 — Duplicar/Clonar */}
            <DuplicarPlaneacionDialog
              planeacionId={p.id}
              docenteId={session.docenteId!}
              cct={p.cct}
              grupoActualId={p.grupo_id}
              planeacionNombre={p.nombre}
            />
          </>
        )}
        <Button asChild variant="ghost">
          <Link href="/planeaciones">← Mis planeaciones</Link>
        </Button>
      </div>
    </div>
  );
}
