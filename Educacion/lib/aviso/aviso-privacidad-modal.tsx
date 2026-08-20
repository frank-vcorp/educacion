/**
 * Modal full-screen de Aviso de Privacidad.
 * SPEC_TEC_04 D-FIN-15. Se muestra en primer login del docente.
 * Botón "Aceptar" solo habilitado con checkbox marcado.
 * D-FIN-15: persistencia en `aceptacion_aviso_privacidad`.
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptAvisoPrivacidad } from './actions';
import { AVISO_PRIVACIDAD_TEXTO, AVISO_CONSENTIMIENTO_CHECKBOX } from './texto';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AvisoPrivacidadModalProps {
  docenteId: string;
  cct: string;
  onAccepted?: () => void;
  /** Si es modal embebido (false) o full-screen page (true). */
  fullScreen?: boolean;
}

export function AvisoPrivacidadModal({
  docenteId,
  cct,
  onAccepted,
  fullScreen = false,
}: AvisoPrivacidadModalProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    if (!accepted) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('docenteId', docenteId);
      formData.set('cct', cct);
      const result = await acceptAvisoPrivacidad(formData);
      if (!result.ok) {
        setError(result.error ?? 'Error al registrar la aceptación');
        return;
      }
      if (onAccepted) {
        onAccepted();
      } else {
        router.refresh();
      }
    });
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4'
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';

  return (
    <div
      className={containerClasses}
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-title"
    >
      <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border bg-card shadow-xl">
        <header className="border-b px-6 py-4">
          <h2 id="aviso-title" className="text-xl font-semibold text-nem-verde">
            Aviso de Privacidad
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Antes de registrar alumnos, debes leer y aceptar el aviso de privacidad.
          </p>
        </header>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
            {AVISO_PRIVACIDAD_TEXTO}
          </div>
        </ScrollArea>

        <footer className="space-y-4 border-t bg-muted/30 px-6 py-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v: boolean | 'indeterminate') => setAccepted(v === true)}
              aria-label="Aceptar aviso de privacidad"
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed">{AVISO_CONSENTIMIENTO_CHECKBOX}</span>
          </label>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleAccept}
              disabled={!accepted || isPending}
              className="min-w-32"
            >
              {isPending ? 'Guardando…' : 'Aceptar'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
