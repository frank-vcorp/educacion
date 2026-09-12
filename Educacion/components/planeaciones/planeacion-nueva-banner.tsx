'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMensajePlaneacionNueva, type Modalidad } from '@/lib/planeaciones/modalidad-ui';

export interface PlaneacionNuevaBannerProps {
  modalidad: Modalidad;
  planeacionId: string;
}

export function PlaneacionNuevaBanner({
  modalidad,
  planeacionId,
}: PlaneacionNuevaBannerProps) {
  const router = useRouter();

  const dismiss = () => {
    router.replace(`/planeaciones/${planeacionId}`, { scroll: false });
  };

  return (
    <div
      role="status"
      data-testid="planeacion-nueva-banner"
      className="mb-4 flex items-start gap-3 rounded-lg border border-nem-verde/30 bg-nem-verde/5 px-4 py-3"
    >
      <p className="flex-1 text-sm">{getMensajePlaneacionNueva(modalidad)}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={dismiss}
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
