/**
 * Next.js 14 configuration for NEM Plataforma (Módulo Docente MVP).
 *
 * DEC-04-02: App Router (no Pages Router).
 * DEC-04-04: shadcn/ui (Radix + Tailwind) para componentes base.
 * PWA: manifest en app/manifest.ts, service worker via next-pwa en Fase 2.
 *
 * Ver SPEC_TEC_04 §3, §5, §10 para detalle.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Permitir iframes solo en /v/[entrega_id] (D-FIN-5) — headers definidos en vercel.json
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/v/:entrega_id',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ];
  },
  experimental: {
    // Server Actions habilitados por default en Next 14
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Puppeteer (PDF generation) no se bundlea — se externaliza para serverless
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
};

export default nextConfig;
