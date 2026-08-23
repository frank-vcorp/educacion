/**
 * Shell de onboarding con wizard 5 pasos.
 * SPEC_TEC_04 D-FIN-4.
 *
 * FIX-20260823-01 — un usuario autenticado pero sin fila `docente`
 * (caso típico tras confirmar email antes de pasar por `saveCCT`)
 * debe poder renderizar el paso 2 (CCT) sin ser expulsado a
 * `/login`. Antes el shell redirigía a `/login` cuando no había
 * docente, lo que combinando con el middleware (auth user + auth
 * route → /dashboard → docenteId null → /login) producía un bucle
 * login↔dashboard. Aquí sólo exigimos sesión y permitimos que
 * `session.user.id` funcione como `docenteId` contextual hasta que
 * `saveCCT` persista la fila.
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
  // FIX-20260823-01: ya no redirigimos a /login por docenteId ausente.
  // El docente se crea/actualiza dentro del propio flujo (paso 2 →
  // saveCCT). Sólo exigimos sesión; `docenteId` contextual se deriva
  // de `session.user.id` mientras no exista fila en `docente`.

  // Paso 1: el usuario ya existe en auth.users (vino de registro). docente vacio.
  // Paso 2: picker CCT. No requiere fila docente previa.
  // Paso 3: requiere cct guardado. Si no, paso 2.
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

  // FIX-20260823-01: paso 2 ES el picker CCT, no redirigir al mismo paso
  // cuando aún no hay cct — eso causaba auto-redirect en bucle.
  if (paso >= 3 && !docente?.cct) redirect('/onboarding/cct');
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
