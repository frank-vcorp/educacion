import Link from 'next/link';
import {
  Award,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FileCheck2,
  GraduationCap,
  Heart,
  LogIn,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background">
      {/* Barra superior */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-nem-verde text-sm font-bold text-white">
              NEM
            </span>
            <div>
              <p className="text-sm font-bold leading-none text-nem-verde">
                NEM Preescolar
              </p>
              <p className="text-[11px] text-muted-foreground">
                Planeación Fase 2 · SEP México
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-foreground hover:bg-accent"
            >
              <LogIn className="h-3.5 w-3.5" />
              Iniciar sesión
            </Link>
            <Link
              href="/registro?rol=docente"
              className="inline-flex h-9 items-center rounded-md bg-nem-verde px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-nem-verde/90"
            >
              Registrarme gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO + 3 OPCIONES PRINCIPALES */}
        <section className="container mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-nem-verde/30 bg-nem-verde/10 px-3 py-1 text-xs font-medium text-nem-verde">
              <Sparkles className="h-3.5 w-3.5" />
              Diseñada para maestras y directoras de preescolar en México
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Planea tu semana en{' '}
              <span className="text-nem-verde">minutos, no en fines de semana</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Cumple al 100% con la <strong>Nueva Escuela Mexicana (Fase 2)</strong> sin
              empezar desde cero en Word. Sugerencias inteligentes de PDAs, actividades,
              libros CONALITEG, calendario SEP automático y PDF listo para Dirección.
            </p>
          </div>

          {/* 3 Opciones principales */}
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            <Link
              href="/login"
              className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-nem-verde hover:shadow-md"
            >
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-nem-verde/10 group-hover:text-nem-verde">
                  <LogIn className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-base font-semibold text-foreground">
                  Iniciar sesión
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  ¿Ya tienes cuenta? Entra directo a tus planeaciones, bitácora y grupo.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center text-xs font-semibold text-nem-verde">
                Entrar a mi cuenta →
              </span>
            </Link>

            <Link
              href="/registro?rol=docente"
              className="group flex flex-col justify-between rounded-xl border-2 border-nem-verde bg-card p-5 shadow-md transition-all hover:bg-emerald-50/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-nem-verde text-white">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-nem-verde/15 px-2 py-0.5 text-[10px] font-semibold text-nem-verde">
                    Más usado
                  </span>
                </div>
                <h2 className="mt-3 text-base font-semibold text-nem-verde">
                  Alta como Docente
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Crea tus planeaciones con IA, organiza tu calendario, lleva tu bitácora y
                  descarga tu PDF oficial.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center text-xs font-semibold text-nem-verde">
                Registrarme como Docente →
              </span>
            </Link>

            <Link
              href="/registro?rol=director"
              className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-amber-500 hover:shadow-md"
            >
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-base font-semibold text-foreground">
                  Alta como Director(a)
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Conecta con tu plantel (CCT), recibe planeaciones en línea y coordina a tu
                  equipo docente.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center text-xs font-semibold text-amber-700">
                Registrarme como Director(a) →
              </span>
            </Link>
          </div>
        </section>

        {/* BENEFICIOS: AHORRO DE TIEMPO Y CUMPLIMIENTO */}
        <section className="border-y bg-muted/30 py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Menos horas frente a la computadora, más tiempo con tus alumnos
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Todo lo que te pide supervisión y dirección escolar, en un flujo guiado y
                fácil de usar.
              </p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <Clock className="h-6 w-6 text-nem-verde" />
                <h3 className="mt-3 text-sm font-semibold">Ahorra hasta 70% de tiempo</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  La IA te sugiere PDAs, Ejes articuladores, actividades del Catálogo NEM y
                  libros de CONALITEG acordes a tu proyecto y grado.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <Award className="h-6 w-6 text-nem-verde" />
                <h3 className="mt-3 text-sm font-semibold">Cumplimiento 100% SEP Fase 2</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Centros de interés, Proyectos comunitarios, Talleres, Rincones y ABJ con
                  criterios formativos, formas de trabajo, espacios y apoyos BAP por alumno.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <CalendarCheck2 className="h-6 w-6 text-nem-verde" />
                <h3 className="mt-3 text-sm font-semibold">Calendario escolar automático</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Marca automáticamente Honores los lunes, CTE el último viernes del mes,
                  efemérides, clases especiales (música/ed. física) y tareas para casa.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <FileCheck2 className="h-6 w-6 text-nem-verde" />
                <h3 className="mt-3 text-sm font-semibold">PDF oficial con 1 clic</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Descarga tu planeación lista para entregar o imprimir, además de recados de
                  materiales listos para copiar y enviar por WhatsApp a mamás y papás.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA + PLANTEL COLABORATIVO */}
        <section className="container mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">
                ¿Cómo funciona en tu jardín de niños?
              </h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-nem-verde" />
                  <span>
                    <strong>1. Elige tu escuela (CCT) y grupo:</strong> en 3 minutos dejas
                    configurado tu grado (1°, 2° o 3°) y tu lista de alumnos.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-nem-verde" />
                  <span>
                    <strong>2. Arma tu planeación guiada:</strong> selecciona modalidad, PDAs y
                    arrastra actividades sugeridas al calendario semanal.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-nem-verde" />
                  <span>
                    <strong>3. Evalúa y entrega sin estrés:</strong> registra tu bitácora diaria,
                    valoración formativa por alumno y descarga tu PDF o entrégalo en línea.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-nem-verde/25 bg-emerald-50/50 p-6">
              <div className="flex items-center gap-2 text-nem-verde">
                <Users className="h-5 w-5" />
                <h3 className="text-base font-semibold">
                  Trabajo en equipo por Plantel (CCT)
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Diseñado para la realidad de los planteles escolares:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-foreground">
                <li className="flex items-start gap-2">
                  <BookOpenCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nem-verde" />
                  <span>
                    <strong>Invitación directa por WhatsApp:</strong> cualquier docente o director
                    puede compartir un enlace ya ligado al CCT de su escuela.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nem-verde" />
                  <span>
                    <strong>Validación por docentes del plantel:</strong> los maestros del mismo
                    CCT confirman con 1 clic el alta de su Director(a).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nem-verde" />
                  <span>
                    <strong>Cambio de rol con historial intacto:</strong> si una maestra pasa a
                    dirección (o regresa a grupo), conserva todo su historial en solo lectura.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="container mx-auto flex items-center justify-center gap-1 px-4">
          Hecho <Heart aria-hidden="true" className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />{' '}
          para las Maestas · por Ing. Frank Saavedra
        </div>
      </footer>
    </div>
  );
}
