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
  diaConfigPanel,
}: {
  sesion: Sesion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividadesPanel: ReactNode;
  diaConfigPanel?: ReactNode;
  manualPanel?: ReactNode;
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
            Edita las actividades de este día, asigna la tarea para casa o marca si es día sin clase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {diaConfigPanel}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Actividades de este día</p>
            {actividadesPanel}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
