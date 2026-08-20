/**
 * Registro del service worker (T16 PWA).
 * Se monta una sola vez en el navegador del docente.
 */
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // evitar SW en dev
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silenciar: el SW es progresivo. Si falla, la app sigue funcionando online.
    });
  }, []);
  return null;
}
