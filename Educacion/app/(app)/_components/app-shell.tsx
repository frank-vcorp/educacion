'use client';

import type { ReactNode } from 'react';
import { ConsultaRapidaProvider } from '@/components/consulta-rapida/consulta-rapida-context';
import { ConsultaRapidaOverlay } from '@/components/consulta-rapida/consulta-rapida-overlay';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ConsultaRapidaProvider>
      {children}
      <ConsultaRapidaOverlay />
    </ConsultaRapidaProvider>
  );
}
