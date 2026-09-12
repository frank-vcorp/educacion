'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { etiquetaSesion } from '@/lib/planeaciones/modalidad-ui';
import type { Sesion } from '@/services/planeaciones/sesion-actions';

export function DiaActividadModal({
  sesion,
  open,
  onOpenChange,
  actividadesPanel,
  manualPanel,
}: {
  sesion: Sesion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividadesPanel: ReactNode;
  manualPanel: ReactNode;
}) {
  if (!sesion) return null;

  const etiqueta = etiquetaSesion(sesion);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] w-[min(96vw,40rem)] max-w-none overflow-y-auto p-4 sm:p-6"
        data-testid="dia-actividad-modal"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-base text-nem-verde">{etiqueta}</DialogTitle>
          <DialogDescription>
            Escribe una actividad nueva o pulsa una existente en la lista para modificarla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="space-y-2 rounded-lg border border-nem-verde/30 bg-nem-verde/5 p-3"
            data-testid="actividad-manual-panel"
          >
            {manualPanel}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Actividades de este día</p>
            {actividadesPanel}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
