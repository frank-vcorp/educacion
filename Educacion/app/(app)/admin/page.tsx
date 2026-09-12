/**
 * Panel superusuario — avance de docentes en pruebas piloto.
 */
import Link from 'next/link';
import { requireSuperuserSession } from '@/lib/auth/require-superuser';
import { getDocentesOverview } from '@/services/admin/docente-overview';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function fmtDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function onboardingStatus(d: Awaited<ReturnType<typeof getDocentesOverview>>[number]) {
  const steps = [
    d.cct ? 1 : 0,
    d.avisoAceptado ? 1 : 0,
    d.gruposCount > 0 ? 1 : 0,
    d.alumnosCount > 0 ? 1 : 0,
    d.planeaciones.length > 0 ? 1 : 0,
  ];
  const done = steps.reduce((a, b) => a + b, 0);
  return `${done}/5`;
}

export default async function AdminPage() {
  await requireSuperuserSession();
  const docentes = await getDocentesOverview();

  const totalPlaneaciones = docentes.reduce((n, d) => n + d.planeaciones.length, 0);
  const sinBloques = docentes.reduce(
    (n, d) => n + d.planeaciones.filter((p) => p.bloquesCount === 0).length,
    0,
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">Panel superusuario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Avance de maestras en prueba piloto. Solo visible para emails en{' '}
          <code className="rounded bg-muted px-1">SUPERUSER_EMAILS</code>.
        </p>
      </header>

      <Card className="mb-6 border-amber-200 bg-amber-50/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nota sobre &quot;no aparece nada&quot; en planeaciones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          El wizard guarda metadatos (problema, PDA, campos…). Las actividades se agregan
          después: arrastrando del catálogo o escribiendo manualmente. Si la maestra ve la
          sección vacía, debe arrastrar o pulsar &quot;+ Añadir actividad&quot; — no es un error.
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Docentes registradas</CardDescription>
            <CardTitle className="text-3xl">{docentes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planeaciones creadas</CardDescription>
            <CardTitle className="text-3xl">{totalPlaneaciones}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planeaciones sin actividades</CardDescription>
            <CardTitle className="text-3xl text-amber-700">{sinBloques}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        {docentes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aún no hay docentes registradas.
            </CardContent>
          </Card>
        ) : (
          docentes.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>{d.nombre}</CardTitle>
                    <CardDescription>
                      {d.email} · CCT {d.cct} · {d.nivel}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Onboarding {onboardingStatus(d)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Registro</dt>
                    <dd>{fmtDate(d.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Último acceso (auth)</dt>
                    <dd>{fmtDate(d.lastSignIn)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Grupos / alumnos</dt>
                    <dd>
                      {d.gruposCount} / {d.alumnosCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Entrevistas completas</dt>
                    <dd>
                      inicial {d.entrevistasInicialesCompletas} · familiar{' '}
                      {d.entrevistasFamiliaresCompletas}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="mb-2 font-medium">
                    Planeaciones ({d.planeaciones.length})
                  </p>
                  {d.planeaciones.length === 0 ? (
                    <p className="text-muted-foreground">Sin planeaciones aún.</p>
                  ) : (
                    <ul className="space-y-2">
                      {d.planeaciones.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <div>
                            <p className="font-medium">{p.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtDate(p.createdAt)} · {p.estado}
                              {p.tieneProposito ? ' · propósito ✓' : ' · sin propósito'}
                              {p.tieneProducto ? ' · producto ✓' : ' · sin producto'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={p.bloquesCount > 0 ? 'default' : 'outline'}>
                              {p.bloquesCount} actividad{p.bloquesCount === 1 ? '' : 'es'}
                            </Badge>
                            <Badge variant="secondary">{p.sesionesCount} sesiones</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  ID docente: <code>{d.id}</code>
                  {d.planeaciones[0] && (
                    <>
                      {' '}
                      · última planeación:{' '}
                      <Link
                        href={`/planeaciones/${d.planeaciones[0].id}`}
                        className="text-primary underline"
                      >
                        {d.planeaciones[0].nombre}
                      </Link>{' '}
                      (solo si inicias sesión como esa maestra)
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
