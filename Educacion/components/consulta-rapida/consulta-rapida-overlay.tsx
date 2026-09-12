'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  consultaRapidaLabel,
  hrefToEmbedPath,
} from '@/lib/navigation/planeacion-editor-path';
import { useConsultaRapidaOptional } from './consulta-rapida-context';

export function ConsultaRapidaOverlay() {
  const ctx = useConsultaRapidaOptional();
  if (!ctx) return null;

  const { openHref, closeConsulta } = ctx;
  const embedSrc = openHref ? hrefToEmbedPath(openHref) : null;

  return (
    <Dialog open={openHref !== null} onOpenChange={(open) => !open && closeConsulta()}>
      <DialogContent
        className="flex h-[min(90vh,900px)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
        data-testid="consulta-rapida-overlay"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base">
                {openHref ? consultaRapidaLabel(openHref) : 'Consulta'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Consulta sin salir de tu planeación. Cierra este panel para seguir editando.
              </DialogDescription>
            </div>
            {openHref && (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={openHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Pantalla completa
                </Link>
              </Button>
            )}
          </div>
        </DialogHeader>
        {embedSrc && (
          <iframe
            title={openHref ? consultaRapidaLabel(openHref) : 'Consulta'}
            src={embedSrc}
            className="min-h-0 flex-1 w-full border-0 bg-background"
            data-testid="consulta-rapida-iframe"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
