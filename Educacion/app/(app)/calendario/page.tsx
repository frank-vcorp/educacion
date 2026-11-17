import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { CalendarioEscolarView } from '@/components/calendario/calendario-escolar-view';

export const dynamic = 'force-dynamic';

export default async function CalendarioEscolarPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const ahora = new Date();
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-nem-verde">
          Calendario Escolar SEP
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta días de asueto oficial, puentes, vacaciones, Consejos Técnicos Escolares (CTE),
          Honores y efemérides. Estas fechas se marcan automáticamente en tus planeaciones y PDF.
        </p>
      </header>

      <CalendarioEscolarView
        anioInicial={ahora.getFullYear()}
        mes0Inicial={ahora.getMonth()}
      />
    </div>
  );
}
