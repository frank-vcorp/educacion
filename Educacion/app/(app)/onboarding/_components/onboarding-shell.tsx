/**
 * Shell de onboarding con wizard 5 pasos.
 * SPEC_TEC_04 D-FIN-4.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

interface OnboardingShellProps {
  paso: number;
  children: (ctx: OnboardingContext) => React.ReactNode;
}

export interface OnboardingContext {
  docenteId: string;
  cct: string;
  nivel: string;
  grupoId: string | null;
}

export async function OnboardingShell({ paso, children }: OnboardingShellProps) {
  const session = await getServerSession();
  if (!session) redirect('/login?redirect=/onboarding');
  if (!session.docenteId) redirect('/login');

  // Paso 1: el usuario ya existe en auth.users (vino de registro). docente vacio.
  // Paso 2: requiere docente con cct. Si no, redirige a paso 2.
  // Paso 3: requiere docente. Si no, paso 2.
  // Paso 4: requiere grupo. Si no, paso 3.
  // Paso 5: bienvenida. Requiere al menos un grupo.

  const supabase = await createClient();
  const { data: docente } = await supabase
    .from('docente')
    .select('id, cct, nivel')
    .eq('id', session.user.id)
    .maybeSingle();

  const { data: grupos } = await supabase
    .from('grupo')
    .select('id')
    .eq('docente_id', session.user.id)
    .eq('activo', true)
    .order('created_at', { ascending: true });
  const grupo = grupos?.[0];

  if (paso >= 2 && !docente?.cct) redirect('/onboarding/cct');
  if (paso > 3 && !grupo) redirect('/onboarding/grupo');
  if (paso >= 5 && !grupo) redirect('/onboarding/grupo');

  const ctx: OnboardingContext = {
    docenteId: session.user.id,
    cct: docente?.cct ?? '',
    nivel: docente?.nivel ?? 'preescolar',
    grupoId: grupo?.id ?? null,
  };

  const steps = [
    { n: 1, label: 'Registro' },
    { n: 2, label: 'CCT' },
    { n: 3, label: 'Tu grupo' },
    { n: 4, label: 'Alumnos' },
    { n: 5, label: 'Bienvenida' },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-nem-verde">Configura tu espacio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paso {paso} de 5 — te tomará menos de 5 minutos.
          </p>
          <ol className="mt-4 flex items-center gap-1">
            {steps.map((s) => (
              <li
                key={s.n}
                className={`flex-1 rounded-full px-2 py-1 text-center text-xs transition-colors ${
                  s.n === paso
                    ? 'bg-nem-verde text-white'
                    : s.n < paso
                      ? 'bg-nem-verde/20 text-nem-verde'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.label}
              </li>
            ))}
          </ol>
        </header>
        <main className="rounded-lg border bg-card p-6 shadow-sm">{children(ctx)}</main>
      </div>
    </div>
  );
}
