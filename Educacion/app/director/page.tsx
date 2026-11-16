import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { isSuperuserEmail } from '@/lib/auth/superuser';
import { getDirectorCCTOverview } from '@/services/director/director-actions';
import { DirectorHeader } from '@/components/director/director-header';
import { OnboardingDirectorBanner } from '@/components/director/onboarding-director-banner';
import { DirectorBandeja } from '@/components/director/director-bandeja';
import { DescargarCarpetaEscuelaButton } from '@/components/director/descargar-carpeta-escuela-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DirectorPage() {
  const session = await getServerSession();
  if (!session) redirect('/login?redirect=/director');

  const overview = await getDirectorCCTOverview(session.cct ?? undefined);
  const isSuperuser = isSuperuserEmail(session.user.email);

  return (
    <div className="min-h-screen bg-muted/20">
      <DirectorHeader
        user={session.user}
        cct={overview.cct}
        escuelaNombre={overview.escuelaNombre}
        isSuperuser={isSuperuser}
      />

      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Banner de Bienvenida y Ciclo Directivo */}
        <OnboardingDirectorBanner
          cct={overview.cct}
          escuelaNombre={overview.escuelaNombre}
        />

        {/* Métricas del CCT y Acción Primaria */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bandeja de Entregas del Colectivo
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Supervisa el avance de planeación didáctica por grado y grupo de tus maestras.
            </p>
          </div>

          <DescargarCarpetaEscuelaButton
            cct={overview.cct}
            escuelaNombre={overview.escuelaNombre}
            entregas={overview.entregas}
          />
        </div>

        {/* Tarjetas de Métricas Rápidas */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Docentes en CCT
                </CardDescription>
                <Users className="h-4 w-4 text-emerald-700" />
              </div>
              <CardTitle className="text-3xl font-bold text-foreground">
                {overview.stats.totalDocentes}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Plantilla activa registrada</span>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Planeaciones Entregadas
                </CardDescription>
                <FileText className="h-4 w-4 text-emerald-700" />
              </div>
              <CardTitle className="text-3xl font-bold text-foreground">
                {overview.stats.totalPlaneacionesEntregadas}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Ciclo escolar 2025-2026</span>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Con Vo.Bo. Digital
                </CardDescription>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-emerald-700">
                {overview.stats.conVoBo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Aprobadas para aula</span>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Por Revisar
                </CardDescription>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-amber-600">
                {overview.stats.pendientesRevision}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Requieren visto bueno</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabla/Bandeja Principal de Maestras */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Entregas del Colectivo Escolar
            </h2>
            <Badge variant="outline" className="text-xs">
              {overview.entregas.length} entregas registradas
            </Badge>
          </div>

          <DirectorBandeja entregas={overview.entregas} />
        </section>
      </main>
    </div>
  );
}
