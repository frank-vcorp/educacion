'use client';

import Link from 'next/link';
import { Sparkles, BookOpen, Calendar, SunMedium } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaseListaLudicoModal } from '@/components/asistencia/pase-lista-ludico-modal';

interface DashboardRutinaDiariaWidgetProps {
  planeacionActiva?: {
    id: string;
    nombre: string;
    periodoInicio?: string;
    periodoFin?: string;
    modalidad?: string;
  } | null;
  alumnos: Array<{ id: string; nombre: string }>;
  grupoNombre?: string;
}

export function DashboardRutinaDiariaWidget({
  planeacionActiva,
  alumnos,
  grupoNombre,
}: DashboardRutinaDiariaWidgetProps) {
  if (!planeacionActiva) return null;

  return (
    <Card className="mb-8 border-nem-verde/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-amber-500/10 shadow-sm overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Info de la jornada */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="verde" className="flex items-center gap-1 font-semibold text-xs h-5 px-2 bg-emerald-700">
                <SunMedium className="h-3.5 w-3.5" />
                Tu Jornada Escolar
              </Badge>
              {grupoNombre && (
                <span className="text-xs text-muted-foreground font-medium">
                  {grupoNombre}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
              {planeacionActiva.nombre}
            </h2>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {planeacionActiva.periodoInicio && planeacionActiva.periodoFin
                  ? `${planeacionActiva.periodoInicio} → ${planeacionActiva.periodoFin}`
                  : 'Proyecto Activo'}
              </span>
            </p>
          </div>

          {/* Dos botones de acción directa en un solo tap */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pt-0">
            {/* 1. Pase de Lista Lúdico */}
            <PaseListaLudicoModal
              alumnos={alumnos}
              triggerButton={
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs sm:text-sm h-10 px-4 shadow-sm flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>⚡ Pase de Lista Lúdico</span>
                </Button>
              }
            />

            {/* 2. Bitácora de Hoy */}
            <Button
              asChild
              variant="outline"
              className="border-emerald-700/30 text-emerald-900 bg-white hover:bg-emerald-50 font-medium text-xs sm:text-sm h-10 px-4 shadow-sm flex items-center gap-2"
            >
              <Link href={`/planeaciones/${planeacionActiva.id}/bitacora`}>
                <BookOpen className="h-4 w-4 text-emerald-700" />
                <span>📝 Bitácora de Hoy</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
