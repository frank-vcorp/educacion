/**
 * Vista: ajustes del docente (M4 + comparación mensual T6).
 * SPEC_TEC_04 §3.
 */
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerSession } from '@/lib/auth/session';
import { EmptyState } from '@/components/shared/states';

export const dynamic = 'force-dynamic';

export default async function AjustesPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuración del docente y privacidad.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aviso de privacidad</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Aviso de privacidad aceptado"
            description="Para volver a consultarlo o revocarlo, contacta al equipo NEM."
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{session.user.email}</p>
        </CardContent>
      </Card>
    </div>
  );
}
