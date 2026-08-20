/**
 * Root layout — NEM Plataforma.
 * SPEC_TEC_04 §5.3: Server Component por defecto.
 * SPEC_TEC_05 §10.2: PWA manifest y theme-color verde NEM.
 */
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/pwa/service-worker-registrar';

export const metadata: Metadata = {
  title: {
    default: 'NEM — Módulo Docente',
    template: '%s | NEM Docente',
  },
  description: 'Planeación didáctica NEM para docentes mexicanas de preescolar.',
  applicationName: 'NEM Docente',
  authors: [{ name: 'NEM Plataforma' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NEM',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#1F8A4C', // verde NEM
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
