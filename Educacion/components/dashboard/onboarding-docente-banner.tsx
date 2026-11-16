'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Sparkles, 
  ClipboardCheck, 
  FileCheck2, 
  ArrowRight, 
  CheckCircle2, 
  X,
  Compass
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OnboardingDocenteBannerProps {
  nombreDocente?: string;
  hasGrupo: boolean;
  planeacionesCount: number;
}

export function OnboardingDocenteBanner({
  nombreDocente,
  hasGrupo,
  planeacionesCount,
}: OnboardingDocenteBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDismissed = localStorage.getItem('nem_docente_onboarding_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('nem_docente_onboarding_dismissed', 'true');
  };

  if (!mounted || dismissed) return null;

  const steps = [
    {
      num: 1,
      title: 'Tu Grupo y Alumnos',
      desc: 'Crea tu grupo de preescolar y captura o importa la lista de tus niñas y niños.',
      href: hasGrupo ? '/alumnos' : '/onboarding/grupo',
      btnLabel: hasGrupo ? 'Ver alumnos' : 'Crear grupo',
      completed: hasGrupo,
      icon: Users,
    },
    {
      num: 2,
      title: 'Planea tu Proyecto NEM',
      desc: 'Elige metodología (ABP, STEAM, AS), PDA y arrastra actividades oficiales.',
      href: '/planeaciones/nueva',
      btnLabel: 'Nueva planeación',
      completed: planeacionesCount > 0,
      icon: Sparkles,
    },
    {
      num: 3,
      title: 'Bitácora y Pase de Lista',
      desc: 'Registra asistencia lúdica rápida (<1 min) y notas de observación diaria.',
      href: '/planeaciones',
      btnLabel: 'Ir a bitácora',
      completed: false,
      icon: ClipboardCheck,
    },
    {
      num: 4,
      title: 'Entrega y Expediente Oficial',
      desc: 'Genera el PDF oficial validado y entrega a Dirección con acuse digital.',
      href: '/planeaciones',
      btnLabel: 'Ver entregas',
      completed: false,
      icon: FileCheck2,
    },
  ];

  const firstName = nombreDocente ? nombreDocente.split(' ')[0] : 'Maestra';

  return (
    <Card className="relative mb-8 overflow-hidden border-nem-verde/30 bg-gradient-to-br from-emerald-50/70 via-amber-50/40 to-background shadow-sm">
      <div className="absolute right-3 top-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 w-8 p-0 text-muted-foreground hover:bg-emerald-100/50 hover:text-foreground"
          aria-label="Cerrar guía de bienvenida"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="verde" className="flex items-center gap-1 font-medium">
            <Compass className="h-3.5 w-3.5" />
            Ruta del Ciclo Escolar NEM
          </Badge>
          <span className="text-xs text-muted-foreground">Preescolar · Guía de 4 pasos</span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">
          ¡Bienvenida, {firstName}! 🌸
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-emerald-900/80">
          Tu espacio de trabajo está diseñado para aligerar tu carga administrativa y dar vida a la
          Nueva Escuela Mexicana en tu aula con calidez, autonomía y rigor pedagógico.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative flex flex-col justify-between rounded-xl border border-emerald-100 bg-white/80 p-4 transition-all hover:border-emerald-300 hover:shadow-md"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-nem-verde/15 text-xs font-bold text-nem-verde">
                      {step.num}
                    </span>
                    {step.completed ? (
                      <Badge variant="verde" className="h-5 px-1.5 text-[10px] gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Hecho
                      </Badge>
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-nem-verde transition-colors" />
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm leading-snug">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  <Button
                    asChild
                    size="sm"
                    variant={step.completed ? 'outline' : 'default'}
                    className="w-full text-xs h-8 justify-between"
                  >
                    <Link href={step.href}>
                      <span>{step.btnLabel}</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
