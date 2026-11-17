import Link from 'next/link';
import { ArrowLeft, Shield, UserCheck } from 'lucide-react';
import { requireSuperuserSession } from '@/lib/auth/require-superuser';
import { AdminHeader } from '@/components/admin/admin-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminPerfilPage() {
  const session = await requireSuperuserSession();
  const nombre =
    (session.user.user_metadata?.nombre as string) ?? session.user.email ?? 'Superusuario';

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminHeader user={session.user} cct={session.cct} />

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Perfil de Superusuario
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Identidad de administrador y accesos multi-rol de la plataforma.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Volver al Command Center
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-700" />
              Datos de la cuenta
            </CardTitle>
            <CardDescription>Sesión actual autenticada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <span className="font-medium">{nombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{session.user.email ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nivel de acceso</span>
              <Badge className="bg-emerald-700 text-white">Superusuario</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CCT vinculado</span>
              <Badge variant="outline" className="font-mono">
                {session.cct ?? 'Sin CCT'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              Cambio de vista operativa
            </CardTitle>
            <CardDescription>
              Si necesitas editar tu CCT o probar el flujo docente completo, puedes abrir tu perfil de maestra.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/perfil">Abrir perfil en Vista Maestra</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/director">Ir a Vista Dirección</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
