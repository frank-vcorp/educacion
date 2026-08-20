/**
 * Gate que muestra el modal de Aviso de Privacidad si el docente no lo ha aceptado.
 * SPEC_TEC_04 D-FIN-15.
 * El modal es bloqueante hasta que se registre la aceptación.
 */
'use client';

import { AvisoPrivacidadModal } from '@/lib/aviso/aviso-privacidad-modal';

interface AvisoPrivacidadGateProps {
  docenteId: string;
  cct: string;
}

export function AvisoPrivacidadGate({ docenteId, cct }: AvisoPrivacidadGateProps) {
  return <AvisoPrivacidadModal docenteId={docenteId} cct={cct} />;
}
