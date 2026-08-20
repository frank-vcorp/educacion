/**
 * PWA manifest — NEM Docente.
 * SPEC_TEC_04 §10.2: Next.js native manifest.
 */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEM — Módulo Docente',
    short_name: 'NEM Docente',
    description: 'Planeación didáctica NEM para docentes mexicanas de preescolar.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1F8A4C', // verde NEM
    lang: 'es-MX',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
