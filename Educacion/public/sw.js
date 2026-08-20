/**
 * Service worker mínimo (T16 + PWA offline-first MVP).
 * SPEC_TEC_04 §10.
 *
 * Estrategia:
 *  - Network-first para navegación y rutas autenticadas (datos siempre frescos).
 *  - Cache-first para assets estáticos (iconos, manifest, _next/static).
 *  - Fallback a /offline.html si la red falla y no hay cache.
 *
 * TODO Fase 2: integrar @serwist/next para precachear rutas + IndexedDB (idb-keyval)
 *              para mutaciones offline (bitacora, planeaciones en draft).
 */
/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

const CACHE = 'nem-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // offline.html podría no existir; ignorar.
      }),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Cache-first para assets estáticos
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(req).then((cached) => cached ?? fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })),
    );
    return;
  }

  // Network-first para todo lo demás
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.pathname === '/dashboard') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached ?? caches.match('/offline.html'))),
  );
});
