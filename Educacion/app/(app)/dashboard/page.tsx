/**
 * Dashboard principal del docente (sesión 1 → T7-T16).
 * SPEC_TEC_04 §3.
 *
 * SPEC-CORRECCIONES-2026-08-17 C-7: empty states mejorados.
 *
 * FIX-20260823-01 — una sesión válida sin fila `docente` (recién
 * confirmó email, todavía no pasó por `saveCCT`) ya no se redirige a
 * `/login`. Va a `/onboarding/cct`, evitando el bucle
 * login↔dashboard que producía el middleware al combinar
 * `isAuthRoute + user → /dashboard → redirect('/login')`. Sólo sin
 * sesión (sin usuario) mantenemos el redirect a `/login`.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Package, Users, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/states';
import { getServerSession } from '@/lib/auth/session';
import { listPlaneaciones } from '@/services/planeaciones/planeacion-actions';
import { listRecursos } from '@/services/recursos-aula/recurso-actions';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  // FIX-20260823-01: sin docente pero con sesión → paso 2 del onboarding.
  // No redirigir a /login (eso sería un loop con el middleware).
  if (!session.docenteId) redirect('/onboarding/cct');

  const [{ items: planeaciones }, { items: recursos }, gruposRes] = await Promise.all([
    listPlaneaciones(session.docenteId),
    listRecursos(session.docenteId),
    createClient().then((s) =>
      s
        .from('grupo')
        .select('id, nombre, grado')
        .eq('docente_id', session.docenteId)
        .eq('activo', true)
        .limit(1)
        .maybeSingle(),
    ),
  ]);

  const grupo = gruposRes.data;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">¡Hola!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {grupo ? `Grupo activo: ${grupo.nombre} (${grupo.grado})` : 'Configura tu grupo para empezar.'}
          {!session.hasAcceptedAviso && (
            <Badge variant="amarillo" className="ml-2 text-[10px]">Aviso de privacidad pendiente</Badge>
          )}
        </p>
        {grupo && (
          <p className="mt-1 text-xs">
            <Link
              href={`/grupos/${grupo.id}/editar`}
              className="text-nem-verde underline-offset-2 hover:underline"
            >
              Editar grupo
            </Link>
          </p>
        )}
      </header>

      {/* C-7: empty state cuando no hay grupo */}
      {!grupo && (
        <EmptyState
          className="mb-6"
          title="Configura tu grupo para empezar"
          description="Crea tu primer grupo (grado, grupo, ciclo escolar) para poder registrar alumnos y crear planeaciones."
          action={
            <Button asChild>
              <Link href="/onboarding/grupo">
                <Users className="mr-2 h-4 w-4" />
                Crear grupo
              </Link>
            </Button>
          }
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planeaciones</CardDescription>
            <CardTitle className="text-3xl">{planeaciones.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/planeaciones/nueva">+ Nueva</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recursos del aula</CardDescription>
            <CardTitle className="text-3xl">{recursos.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/recursos-aula">Ver inventario</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Catálogo NEM</CardDescription>
            <CardTitle className="text-base">Explorar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1 text-sm">
              <Link href="/catalogo/campos" className="text-nem-verde underline-offset-2 hover:underline">
                Campos formativos
              </Link>
              <Link href="/catalogo/pda" className="text-nem-verde underline-offset-2 hover:underline">
                PDA
              </Link>
              <Link href="/catalogo/bloques" className="text-nem-verde underline-offset-2 hover:underline">
                Bloques M1
              </Link>
              <Link href="/catalogo/refs" className="text-nem-verde underline-offset-2 hover:underline">
                Libros CONALITEG
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Biblioteca</CardDescription>
            <CardTitle className="text-base">CONALITEG</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/biblioteca">Abrir biblioteca</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Mis últimas planeaciones</h2>
        {planeaciones.length === 0 ? (
          <EmptyState
            title="Aún no tienes planeaciones"
            description="Te tomará menos de 15 minutos crear tu primera planeación. Empieza con un problema del contexto real de tu aula."
            action={
              <Button asChild size="lg">
                <Link href="/planeaciones/nueva">
                  <Sparkles className="mr-2 h-4 w-4" />
                  + Crear primera planeación
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {planeaciones.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Card>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.periodo_inicio} → {p.periodo_fin}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{p.estado}</Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/planeaciones/${p.id}`}>Abrir</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {grupo && recursos.length === 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Recursos del aula</h2>
          <EmptyState
            title="Aún no has agregado recursos a tu aula"
            description="Registra los recursos con los que cuentas (proyector, libros, materiales) para que la planeación los considere al sugerir bloques."
            action={
              <Button asChild variant="outline">
                <Link href="/recursos-aula">
                  <Package className="mr-2 h-4 w-4" />
                  Agregar primer recurso
                </Link>
              </Button>
            }
          />
        </section>
      )}

      {grupo && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Acciones rápidas</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button asChild variant="outline" className="h-auto justify-start p-4 text-left">
              <Link href="/planeaciones/nueva">
                <FileText className="mr-3 h-5 w-5 text-nem-verde" />
                <span>
                  <span className="block font-semibold">Nueva planeación</span>
                  <span className="block text-xs text-muted-foreground">~15 minutos</span>
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start p-4 text-left">
              <Link href="/alumnos">
                <Users className="mr-3 h-5 w-5 text-nem-verde" />
                <span>
                  <span className="block font-semibold">Gestionar alumnos</span>
                  <span className="block text-xs text-muted-foreground">Agregar, editar o eliminar</span>
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start p-4 text-left">
              <Link href="/biblioteca">
                <Package className="mr-3 h-5 w-5 text-nem-verde" />
                <span>
                  <span className="block font-semibold">Explorar biblioteca</span>
                  <span className="block text-xs text-muted-foreground">Libros CONALITEG</span>
                </span>
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
