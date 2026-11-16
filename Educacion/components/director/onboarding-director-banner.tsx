'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  FolderDown, 
  X,
  Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OnboardingDirectorBannerProps {
  cct: string;
  escuelaNombre: string;
}

export function OnboardingDirectorBanner({
  cct,
  escuelaNombre,
}: OnboardingDirectorBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDismissed = localStorage.getItem('nem_director_onboarding_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('nem_director_onboarding_dismissed', 'true');
  };

  if (!mounted || dismissed) return null;

  const steps = [
    {
      num: 1,
      title: 'Revisa planeaciones quincenales',
      desc: 'Consulta en tiempo real los proyectos por grado (1°, 2°, 3°) y grupo de tus educadoras.',
      icon: Users,
    },
    {
      num: 2,
      title: 'Emite Vo.Bo. y retroalimentación',
      desc: 'Valida con 1 clic o deja comentarios pedagógicos constructivos para enriquecer las sesiones.',
      icon: CheckCircle2,
    },
    {
      num: 3,
      title: 'Descarga carpeta para supervisión',
      desc: 'Genera el concentrado oficial con firma digital para la visita de la Supervisora de Zona.',
      icon: FolderDown,
    },
  ];

  return (
    <Card className="relative mb-8 overflow-hidden border-emerald-900/20 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white shadow-md">
      <div className="absolute right-3 top-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 w-8 p-0 text-emerald-300/70 hover:bg-emerald-900/50 hover:text-white"
          aria-label="Ocultar bienvenida"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-600/90 text-white hover:bg-emerald-600 border-none flex items-center gap-1 font-semibold text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Panel de Dirección Escolar — CCT {cct}
          </Badge>
          <span className="text-xs text-emerald-200/80">{escuelaNombre}</span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          Bienvenida al Colectivo Escolar de {escuelaNombre}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-emerald-100/80">
          Tu centro de dirección institucional para el acompañamiento técnico-pedagógico y la
          consolidación de los proyectos formativos de tu colectivo docente.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative flex flex-col justify-between rounded-xl border border-emerald-800/60 bg-emerald-900/40 p-4 backdrop-blur-sm"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                      {step.num}
                    </span>
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs text-emerald-200/70 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
