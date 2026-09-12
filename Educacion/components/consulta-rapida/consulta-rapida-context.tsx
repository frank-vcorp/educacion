'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ConsultaRapidaHref } from '@/lib/navigation/planeacion-editor-path';

interface ConsultaRapidaContextValue {
  openHref: ConsultaRapidaHref | null;
  openConsulta: (href: ConsultaRapidaHref) => void;
  closeConsulta: () => void;
}

const ConsultaRapidaContext = createContext<ConsultaRapidaContextValue | null>(null);

export function ConsultaRapidaProvider({ children }: { children: ReactNode }) {
  const [openHref, setOpenHref] = useState<ConsultaRapidaHref | null>(null);

  const openConsulta = useCallback((href: ConsultaRapidaHref) => {
    setOpenHref(href);
  }, []);

  const closeConsulta = useCallback(() => {
    setOpenHref(null);
  }, []);

  const value = useMemo(
    () => ({ openHref, openConsulta, closeConsulta }),
    [openHref, openConsulta, closeConsulta],
  );

  return (
    <ConsultaRapidaContext.Provider value={value}>{children}</ConsultaRapidaContext.Provider>
  );
}

export function useConsultaRapida(): ConsultaRapidaContextValue {
  const ctx = useContext(ConsultaRapidaContext);
  if (!ctx) {
    throw new Error('useConsultaRapida debe usarse dentro de ConsultaRapidaProvider');
  }
  return ctx;
}

/** Hook seguro para NavMenu (no lanza si falta provider). */
export function useConsultaRapidaOptional(): ConsultaRapidaContextValue | null {
  return useContext(ConsultaRapidaContext);
}
