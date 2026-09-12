'use client';

import type { ComponentType } from 'react';
import { Library, Package, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConsultaRapidaHref } from '@/lib/navigation/planeacion-editor-path';
import { useConsultaRapidaOptional } from './consulta-rapida-context';

const ITEMS: Array<{
  href: ConsultaRapidaHref;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { href: '/biblioteca', label: 'Biblioteca', icon: Library },
  { href: '/alumnos', label: 'Alumnos', icon: Users },
  { href: '/recursos-aula', label: 'Recursos', icon: Package },
];

export function ConsultaRapidaSidebar() {
  const consulta = useConsultaRapidaOptional();

  return (
    <div className="space-y-2" data-testid="consulta-rapida-sidebar">
      <div>
        <p className="text-xs font-medium">Consultar</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Abre encima de tu planeación sin perder el día que estás editando.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Button
            key={href}
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full justify-start gap-2 text-xs"
            data-testid={`consulta-rapida-${href.slice(1)}`}
            onClick={() => consulta?.openConsulta(href)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
