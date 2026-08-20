/**
 * Página /perfil — datos del docente y edición de CCT.
 * SPEC-CORRECCIONES-2026-08-17 C-1.
 */
import { redirect } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { EditarCCTForm } from './editar-cct-form';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const session = await getServerSession();
  if (!session || !session.docenteId) redirect('/login');

  const supabase = await createClient();
  const { data: docente } = await supabase
    .from('docente')
    .select('id, nombre, email, cct, nivel, activo, created_at')
    .eq('id', session.docenteId)
    .maybeSingle();

  // Lookup de escuela por CCT para mostrar nombre
  let escuela: { nombre: string; nivel: string; turno: string | null } | null = null;
  if (docente?.cct) {
    const { data } = await supabase
      .from('cct')
      .select('nombre, nivel, turno')
      .eq('clave', docente.cct)
      .maybeSingle();
    escuela = data;
  }

  const nombreCompleto =
    (session.user.user_metadata?.nombre as string) ?? docente?.nombre ?? 'Docente';
  const nivel = docente?.nivel ?? '—';

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos de tu cuenta y escuela. Puedes editar el CCT y nivel en cualquier momento.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
          <CardDescription>Información de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Nombre" value={nombreCompleto} />
          <Row label="Email" value={session.user.email ?? docente?.email ?? '—'} />
          <Row
            label="Estado"
            value={
              docente?.activo ? (
                <span className="inline-flex items-center gap-1 text-nem-verde">
                  <CheckCircle2 className="h-4 w-4" /> Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <XCircle className="h-4 w-4" /> Inactivo
                </span>
              )
            }
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Escuela</CardTitle>
          <CardDescription>Centro de Trabajo (CCT) y nivel educativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row
            label="CCT"
            value={
              docente?.cct ? (
                <Badge variant="outline" className="font-mono">
                  {docente.cct}
                </Badge>
              ) : (
                <span className="text-muted-foreground">Sin CCT asignado</span>
              )
            }
          />
          <Row
            label="Nivel"
            value={
              <Badge variant="secondary" className="capitalize">
                {nivel}
              </Badge>
            }
          />
          {escuela && (
            <>
              <Row label="Nombre de la escuela" value={escuela.nombre} />
              <Row label="Turno" value={escuela.turno ?? '—'} />
            </>
          )}
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Cambiar CCT o nivel</p>
            <EditarCCTForm
              cctInicial={docente?.cct ?? ''}
              nivelInicial={nivel !== '—' ? nivel : 'preescolar'}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Seguridad</CardTitle>
          <CardDescription>Gestión de contraseña y privacidad</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Para cambiar tu contraseña o email, hazlo desde tu cuenta de acceso (Supabase Auth).
          </p>
          <p>
            La configuración de privacidad y aviso de privacidad se gestiona en{' '}
            <a href="/ajustes" className="text-nem-verde underline-offset-2 hover:underline">
              Ajustes
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value}</span>
    </div>
  );
}
