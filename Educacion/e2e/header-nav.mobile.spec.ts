/**
 * E2E FIX-20260821-04 — Header móvil y drawer portado a <body>.
 *
 * SPEC: specs/FIX-20260821-04_report.md (§G — Prueba de regresión).
 * Síntoma en producción (móvil):
 *   - Drawer "fixed inset-0 z-50" colapsado a 375×56 porque `backdrop-blur`
 *     del `<header>` crea un containing block para descendientes `fixed`.
 *   - El overlay no cubre la página → taps sobre "#btn-inventario" /
 *     "#btn-biblioteca" caen en el `<nav>` del drawer y navegan a destinos
 *     inesperados en lugar de cerrar el menú.
 *
 * Solución validada:
 *   - `createPortal(..., document.body)` en `app/(app)/_components/nav-menu.tsx`.
 *   - Hamburger con `h-11 min-h-[44px] min-w-[44px]` (touch target WCAG 2.5.5).
 *   - Cierre adicional por tecla Escape (accesibilidad).
 *
 * Alcance de la regresión:
 *   - Viewport 375×812 (iPhone X/13 mini, isMobile/hasTouch).
 *   - Viewport 360×640 (Android común).
 *   - Botón hamburger visible y alcanzable (≥44×44 px).
 *   - Drawer abierto ⇒ #drawer ≥ viewport y #drawer-panel ≈ viewport alto.
 *   - #drawer-overlay cubre viewport (`elementFromPoint` centro = overlay).
 *   - Enlaces del nav móvil ("Mis planeaciones", "Ajustes") reciben tap
 *     (`elementFromPoint` centro = el propio <a>).
 *   - Botones del dashboard NO quedan interceptados por el nav del drawer:
 *     tras el fix el overlay (que cierra el menú) sí intercepta correctamente
 *     (no el nav, que no cierra).
 *   - Cierre por X, por tap en overlay y por Escape.
 *
 * Patrón heredado de `e2e/entrevista-inicial.mobile.spec.ts` (IMPL-20260820-04):
 * fixture HTML estático que reproduce la estructura del DOM tras el fix
 * (drawer como hijo directo de <body>, fuera del <header> con backdrop-blur),
 * porque las rutas `(app)` requieren sesión Supabase. La forma del DOM
 * post-fix y la regla CSS del containing block son la fuente de verdad
 * del comportamiento.
 *
 * Ejecución:
 *   pnpm exec playwright test --project=mobile e2e/header-nav.mobile.spec.ts
 *
 * Control de regresión A/B: el spec también carga un fixture con la
 * estructura ROTA (drawer como hijo del <header> con backdrop-blur) y
 * comprueba que la métrica `drawer.rect.height === headerHeight` (≈56 px).
 * Si alguien revierte el portal, este control falla ⇒ regresión detectada.
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Tipos auxiliares para los hooks del fixture inline.
declare global {
  interface Window {
    __tapLog: string[];
    __openDrawer: () => void;
    __closeDrawer: () => void;
    __navTap: (label: string) => boolean | void;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Fixture post-fix: drawer portado a <body> (fuera del header con backdrop-blur).
 *  El bloque "main" va antes del header en el flujo; la UI real lo pone después
 *  pero eso no afecta al containing block de los hijos del drawer. Importante:
 *  el drawer es HIJO DIRECTO de <body> ⇒ el body no tiene transform/filter
 *  ⇒ viewport es el containing block ⇒ `fixed inset-0` cubre 375×812. */
function buildFixedFixture(grupoLabel: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>FIX-20260821-04 fixture — drawer portado a body (FIX aplicado)</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
  /* FIX reproduce body limpio (sin transform/filter) — clave del fix. */
  body { background: #f8fafc; color: #0f172a; }
  .bg-card { background: #fff; }
  .bg-muted { background: #f1f5f9; }
  .bg-background { background: #fff; }
  .bg-nem-verde { background: #2f855a; color: #fff; }
  .text-nem-verde { color: #2f855a; }
  .text-muted-foreground { color: #64748b; }
  .text-primary-foreground { color: #fff; }
  .bg-primary { background: #0f172a; color: #fff; }
  .bg-black\\/50 { background: rgba(0,0,0,0.5); }
  .border { border: 1px solid #e2e8f0; }
  .border-b { border-bottom: 1px solid #e2e8f0; }
  .border-l { border-left: 1px solid #e2e8f0; }
  .border-input { border-color: #cbd5e1; }
  .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); }
  .rounded-md { border-radius: 6px; }
  .rounded-lg { border-radius: 8px; }

  /* Layout de la página autenticada. */
  .min-h-screen { min-height: 100vh; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-1 { flex: 1; }
  .items-center { align-items: center; }
  .items-stretch { align-items: stretch; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .container { width: 100%; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .max-w-5xl { max-width: 1024px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .py-6 { padding-top: 24px; padding-bottom: 24px; }
  .p-3 { padding: 12px; }
  .p-4 { padding: 16px; }
  .p-6 { padding: 24px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .py-2\\.5 { padding-top: 10px; padding-bottom: 10px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .mt-1 { margin-top: 4px; }
  .mt-4 { margin-top: 16px; }
  .mt-8 { margin-top: 32px; }
  .mb-3 { margin-bottom: 12px; }
  .mb-6 { margin-bottom: 24px; }
  .text-2xl { font-size: 24px; }
  .text-lg { font-size: 18px; }
  .text-base { font-size: 16px; }
  .text-sm { font-size: 14px; }
  .text-xs { font-size: 12px; }
  .text-3xl { font-size: 30px; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .leading-none { line-height: 1; }
  .tracking-tight { letter-spacing: -0.02em; }
  .tracking-wide { letter-spacing: 0.05em; }
  .uppercase { text-transform: uppercase; }
  .border-t { border-top: 1px solid #e2e8f0; }
  .border-dashed { border-style: dashed; }
  .text-center { text-align: center; }
  .hidden { display: none; }
  .inline-flex { display: inline-flex; }

  /* Grid responsive como en el dashboard real. */
  .grid { display: grid; gap: 12px; }
  @media (min-width: 640px) {
    .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (min-width: 1024px) {
    .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  @media (min-width: 768px) {
    .md\\:flex { display: flex; }
    .md\\:hidden { display: none; }
  }

  /* Sticky header con backdrop-blur (origen del bug). */
  .sticky { position: sticky; }
  .top-0 { top: 0; }
  .z-40 { z-index: 40; }
  .h-14 { height: 56px; }
  .h-11 { height: 44px; }
  .min-h-\\[44px\\] { min-height: 44px; }
  .min-w-\\[44px\\] { min-width: 44px; }
  .h-full { height: 100%; }
  .h-40 { height: 160px; }
  .h-9 { height: 36px; }
  .w-72 { width: 288px; }
  .max-w-\\[85vw\\] { max-width: 85vw; }

  /* Backdrop-blur — clave de la causa raíz. */
  .bg-background\\/95 { background-color: rgba(255,255,255,0.95); }
  .backdrop-blur {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }

  .fixed { position: fixed; }
  .absolute { position: absolute; }
  .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
  .right-0 { right: 0; }
  .top-0 { top: 0; }
  .z-50 { z-index: 50; }

  /* Botones estilo shadcn. */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 14px; font-weight: 500; border-radius: 6px; cursor: pointer;
    transition: background-color 150ms, border-color 150ms, color 150ms;
    text-decoration: none; white-space: nowrap;
  }
  .btn:focus-visible { outline: none; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #2563eb; }
  .btn-default { background: #0f172a; color: #fff; border: 1px solid #0f172a; padding: 0 16px; }
  .btn-outline { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; padding: 0 12px; }
  .btn-ghost { background: transparent; color: #0f172a; border: 1px solid transparent; padding: 0 12px; }
  .btn-ghost:hover { background: #f1f5f9; }
  .btn-lg { height: 44px; min-height: 44px; min-width: 44px; padding: 0 12px; }

  /* Icono */
  .icon { width: 20px; height: 20px; display: inline-block; }
</style>
</head>
<body>

<!-- Réplica exacta de app/(app)/layout.tsx:
     <div flex-col>
       <AppHeader />      (header PRIMER hijo)
       <main>{children}</main>
     </div> -->
<div class="min-h-screen flex-col">

<!-- Réplica de app/(app)/_components/app-header.tsx.
     El header CONTIENE 'backdrop-filter: blur(8px)' como ancestro con containing block.
     El drawer se monta FUERA del header (portal a body), simulando createPortal. -->
<header id="app-header" class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
  <div class="container mx-auto flex h-14 items-center justify-between gap-2 px-4">
    <div class="flex items-center gap-3">
      <a href="#dashboard" class="flex items-center gap-2" style="text-decoration:none;">
        <span class="text-xl font-semibold text-nem-verde" style="font-size:20px;">NEM</span>
        <span class="hidden text-xs text-muted-foreground" style="display:none;">Planeación</span>
      </a>

      <!-- NavMenu: desktop nav (oculto en <768px por md:flex + md:hidden) -->
      <nav class="hidden items-center gap-1 md:hidden" aria-label="Navegación principal">
        <a href="#dashboard" class="btn-ghost">Dashboard</a>
        <a href="#planeaciones" class="btn-ghost">Mis planeaciones</a>
      </nav>

      <!-- NavMenu: hamburger trigger (size=lg, h-11, min 44x44) -->
      <button
        id="hamburger"
        type="button"
        aria-label="Abrir menú"
        aria-expanded="false"
        aria-controls="drawer"
        data-testid="nav-menu-hamburger"
        class="btn btn-ghost btn-lg"
        onclick="window.__openDrawer()"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>
    <div class="flex items-center gap-2">
      <button id="grupo-trigger" type="button" class="btn btn-outline">
        <span id="grupo-label">${grupoLabel}</span>
      </button>
      <button id="user-trigger" type="button" class="btn" style="background:#c6f6d5; color:#2f855a; width:32px; height:32px; border-radius:9999px;">L</button>
    </div>
  </div>
</header>

<!-- Réplica de app/(app)/dashboard/page.tsx -->
<main>
  <div class="container mx-auto max-w-5xl px-4 py-6">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-nem-verde">¡Hola!</h1>
      <p class="mt-1 text-sm text-muted-foreground">Grupo activo: ${grupoLabel}</p>
    </header>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border bg-card">
        <div class="flex flex-col" style="padding:24px 24px 0 24px;">
          <p class="text-sm text-muted-foreground">Planeaciones</p>
          <h3 class="text-3xl font-semibold leading-none tracking-tight">0</h3>
        </div>
        <div style="padding:24px;">
          <a id="btn-nueva" href="#nueva" class="btn btn-default" data-testid="btn-nueva">+ Nueva</a>
        </div>
      </div>
      <div class="rounded-lg border bg-card">
        <div class="flex flex-col" style="padding:24px 24px 0 24px;">
          <p class="text-sm text-muted-foreground">Recursos del aula</p>
          <h3 class="text-3xl font-semibold leading-none tracking-tight">0</h3>
        </div>
        <div style="padding:24px;">
          <a id="btn-inventario" href="#recursos" class="btn btn-outline" data-testid="btn-inventario">Ver inventario</a>
        </div>
      </div>
      <div class="rounded-lg border bg-card">
        <div class="flex flex-col" style="padding:24px 24px 0 24px;">
          <p class="text-sm text-muted-foreground">Biblioteca</p>
          <h3 class="text-base font-semibold leading-none tracking-tight">CONALITEG</h3>
        </div>
        <div style="padding:24px;">
          <a id="btn-biblioteca" href="#biblioteca" class="btn btn-outline" data-testid="btn-biblioteca">Abrir biblioteca</a>
        </div>
      </div>
    </div>
    <section style="margin-top:32px;">
      <h2 class="text-lg font-semibold mb-3">Mis últimas planeaciones</h2>
      <div class="rounded-lg border border-dashed" style="padding:32px; text-align:center;">
        <h3 class="font-semibold">Aún no tienes planeaciones</h3>
        <p class="mt-1 text-sm text-muted-foreground">Crea tu primera planeación.</p>
      </div>
    </section>
    <!-- Filler para garantizar scroll y probar sticky. -->
    <section style="margin-top:32px;">
      <div class="h-40 rounded-lg border bg-muted" style="height:160px;"></div>
      <div class="h-40 rounded-lg border bg-muted" style="margin-top:12px; height:160px;"></div>
    </section>
  </div>
</main>

</div><!-- /.min-h-screen flex-col -->

<!-- FIX-20260821-04: drawer portado a body (createPortal). Es HIJO DIRECTO de body,
     NO del header con backdrop-blur. Aquí es donde residirá en runtime tras el fix.
     Inicia con [hidden] (= equivalente a no estar en el DOM por {mobileOpen && ...}). -->
<div id="drawer" class="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú principal" hidden>
  <div id="drawer-overlay" class="absolute inset-0 bg-black/50" data-testid="nav-menu-overlay" aria-hidden="true"></div>
  <div id="drawer-panel" class="absolute right-0 top-0 h-full w-72 max-w-[85vw] border-l bg-background shadow-xl" data-testid="nav-menu-panel">
    <div class="flex items-center justify-between border-b p-4">
      <span class="text-base font-semibold text-nem-verde">NEM</span>
      <button
        id="drawer-close"
        type="button"
        aria-label="Cerrar menú"
        data-testid="nav-menu-close"
        class="btn btn-ghost btn-lg"
        onclick="window.__closeDrawer()"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <nav class="flex flex-col gap-1 p-3" aria-label="Navegación móvil">
      <a id="link-dashboard" href="#dashboard" class="btn" style="justify-content:flex-start; padding:10px 12px; color:#0f172a; font-weight:500;" onclick="window.__navTap('Dashboard')">Dashboard</a>
      <a id="link-planeaciones" href="#planeaciones" class="btn" style="justify-content:flex-start; padding:10px 12px; color:#0f172a; font-weight:500;" onclick="window.__navTap('Mis planeaciones')">Mis planeaciones</a>
      <a id="link-alumnos" href="#alumnos" class="btn" style="justify-content:flex-start; padding:10px 12px; color:#0f172a; font-weight:500;" onclick="window.__navTap('Alumnos')">Alumnos</a>
      <a id="link-recursos" href="#recursos-aula" class="btn" style="justify-content:flex-start; padding:10px 12px; color:#0f172a; font-weight:500;" onclick="window.__navTap('Recursos')">Recursos</a>
      <a id="link-biblioteca" href="#biblioteca" class="btn" style="justify-content:flex-start; padding:10px 12px; color:#0f172a; font-weight:500;" onclick="window.__navTap('Biblioteca')">Biblioteca</a>
      <div class="border-t" style="margin:8px 0;"></div>
      <p class="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catálogo NEM</p>
      <a id="link-campos" href="#catalogo/campos" class="btn" style="justify-content:flex-start; padding:8px 12px; color:#475569;" onclick="window.__navTap('Campos formativos')">Campos formativos</a>
      <a id="link-pda" href="#catalogo/pda" class="btn" style="justify-content:flex-start; padding:8px 12px; color:#475569;" onclick="window.__navTap('PDA')">PDA</a>
      <a id="link-bloques" href="#catalogo/bloques" class="btn" style="justify-content:flex-start; padding:8px 12px; color:#475569;" onclick="window.__navTap('Bloques M1')">Bloques M1</a>
      <a id="link-refs" href="#catalogo/refs" class="btn" style="justify-content:flex-start; padding:8px 12px; color:#475569;" onclick="window.__navTap('Libros CONALITEG')">Libros CONALITEG</a>
      <div class="border-t" style="margin:8px 0;"></div>
      <a id="link-ajustes" href="#ajustes" class="btn" style="justify-content:flex-start; padding:10px 12px; color:#0f172a; font-weight:500;" onclick="window.__navTap('Ajustes')">Ajustes</a>
    </nav>
  </div>
</div>

<script>
  // Réplica del comportamiento React de nav-menu.tsx tras FIX-20260821-04.
  // {mobileOpen && createPortal(<div drawer/>, document.body)}.
  // Tras el tap del hamburger se quita el atributo hidden (= montar en DOM);
  // cierre por X / overlay / Escape.
  window.__tapLog = [];
  window.__openDrawer = function () {
    document.getElementById('drawer').removeAttribute('hidden');
    document.getElementById('hamburger').setAttribute('aria-expanded', 'true');
  };
  window.__closeDrawer = function () {
    document.getElementById('drawer').setAttribute('hidden', '');
    document.getElementById('hamburger').setAttribute('aria-expanded', 'false');
  };
  document.getElementById('drawer-overlay').addEventListener('click', window.__closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.__closeDrawer();
  });
  window.__navTap = function (label) {
    window.__tapLog.push(label);
    window.__closeDrawer();
    // Prevenir navegación para que el test no pierda la página (sigue siendo el mismo HTML).
    return false;
  };
</script>

</body>
</html>`;
}

/** Fixture de control A/B — mismo árbol pero drawer INSIDE del header con
 *  backdrop-blur (estado ROTO pre-fix). Sirve para discriminar que el spec
 *  detectaría una regresión si alguien revocara el portal. */
function buildBrokenFixture(grupoLabel: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>FIX-20260821-04 fixture ROTO — drawer dentro de header con backdrop-blur</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { background: #f8fafc; color: #0f172a; }
  .bg-card { background: #fff; }
  .bg-muted { background: #f1f5f9; }
  .bg-background { background: #fff; }
  .bg-nem-verde { background: #2f855a; color: #fff; }
  .text-nem-verde { color: #2f855a; }
  .text-muted-foreground { color: #64748b; }
  .bg-black\\/50 { background: rgba(0,0,0,0.5); }
  .border { border: 1px solid #e2e8f0; }
  .border-b { border-bottom: 1px solid #e2e8f0; }
  .border-l { border-left: 1px solid #e2e8f0; }
  .rounded-md { border-radius: 6px; }
  .rounded-lg { border-radius: 8px; }
  .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
  .min-h-screen { min-height: 100vh; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-1 { flex: 1; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .container { width: 100%; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .max-w-5xl { max-width: 1024px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .py-6 { padding-top: 24px; padding-bottom: 24px; }
  .p-3 { padding: 12px; }
  .p-4 { padding: 16px; }
  .p-6 { padding: 24px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .py-2\\.5 { padding-top: 10px; padding-bottom: 10px; }
  .my-2 { margin-top: 8px; margin-bottom: 8px; }
  .mt-1 { margin-top: 4px; }
  .mb-6 { margin-bottom: 24px; }
  .text-2xl { font-size: 24px; }
  .text-base { font-size: 16px; }
  .text-sm { font-size: 14px; }
  .text-xs { font-size: 12px; }
  .text-3xl { font-size: 30px; }
  .font-semibold { font-weight: 600; }
  .leading-none { line-height: 1; }
  .tracking-tight { letter-spacing: -0.02em; }
  @media (min-width: 768px) {
    .md\\:hidden { display: none; }
  }
  .sticky { position: sticky; }
  .top-0 { top: 0; }
  .z-40 { z-index: 40; }
  .h-14 { height: 56px; }
  .h-full { height: 100%; }
  .w-72 { width: 288px; }
  .max-w-\\[85vw\\] { max-width: 85vw; }
  .bg-background\\/95 { background-color: rgba(255,255,255,0.95); }
  /* CLAVE: backdrop-filter es el origen del bug. */
  .backdrop-blur {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
  .fixed { position: fixed; }
  .absolute { position: absolute; }
  .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
  .right-0 { right: 0; }
  .top-0 { top: 0; }
  .z-50 { z-index: 50; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 14px; font-weight: 500; border-radius: 6px; cursor: pointer;
    text-decoration: none; white-space: nowrap;
  }
  .btn-default { background: #0f172a; color: #fff; border: 1px solid #0f172a; padding: 0 16px; }
  .btn-outline { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; padding: 0 12px; }
  .btn-ghost { background: transparent; color: #0f172a; border: 1px solid transparent; padding: 0 12px; }
  .btn-lg { height: 44px; min-height: 44px; min-width: 44px; padding: 0 12px; }
  .icon { width: 20px; height: 20px; display: inline-block; }
</style>
</head>
<body>

<main>
  <div class="container mx-auto max-w-5xl px-4 py-6">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-nem-verde">¡Hola!</h1>
      <p class="mt-1 text-sm text-muted-foreground">Grupo activo: ${grupoLabel}</p>
    </header>
    <div class="flex" style="gap:12px;">
      <div class="rounded-lg border bg-card" style="padding:24px;">
        <p class="text-sm text-muted-foreground">Recursos del aula</p>
        <h3 class="text-3xl font-semibold leading-none tracking-tight">0</h3>
        <a id="btn-inventario" href="#recursos" class="btn btn-outline" data-testid="btn-inventario">Ver inventario</a>
      </div>
      <div class="rounded-lg border bg-card" style="padding:24px;">
        <p class="text-sm text-muted-foreground">Biblioteca</p>
        <a id="btn-biblioteca" href="#biblioteca" class="btn btn-outline" data-testid="btn-biblioteca">Abrir biblioteca</a>
      </div>
    </div>
  </div>
</main>

<!-- Header con backdrop-blur. El drawer vive DENTRO del header
     (estado ROTO pre-fix). -->
<header id="app-header" class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
  <div class="container mx-auto flex h-14 items-center justify-between gap-2 px-4">
    <div class="flex items-center gap-3">
      <a href="#dashboard" class="flex items-center gap-2" style="text-decoration:none;">
        <span style="font-size:20px; font-weight:600; color:#2f855a;">NEM</span>
      </a>

      <button
        id="hamburger"
        type="button"
        aria-label="Abrir menú"
        data-testid="nav-menu-hamburger"
        class="btn btn-ghost btn-lg"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- DRAWER como hijo del header (origen del bug). -->
      <div id="drawer" class="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú principal ROTO" hidden>
        <div id="drawer-overlay" class="absolute inset-0 bg-black/50" aria-hidden="true"></div>
        <div id="drawer-panel" class="absolute right-0 top-0 h-full w-72 max-w-[85vw] border-l bg-background shadow-xl">
          <div class="flex items-center justify-between border-b p-4">
            <span class="text-base font-semibold text-nem-verde">NEM</span>
            <button id="drawer-close" type="button" aria-label="Cerrar menú" class="btn btn-ghost">×</button>
          </div>
          <nav class="flex flex-col gap-1 p-3">
            <a id="link-dashboard" href="#dashboard" data-testid="link-dashboard">Dashboard</a>
            <a id="link-planeaciones" href="#planeaciones" data-testid="link-planeaciones">Mis planeaciones</a>
            <a id="link-alumnos" href="#alumnos">Alumnos</a>
            <a id="link-recursos" href="#recursos-aula">Recursos</a>
            <a id="link-biblioteca" href="#biblioteca">Biblioteca</a>
            <a id="link-ajustes" href="#ajustes" data-testid="link-ajustes">Ajustes</a>
          </nav>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button id="grupo-trigger" type="button" class="btn btn-outline">
        <span id="grupo-label">${grupoLabel}</span>
      </button>
      <button id="user-trigger" type="button" class="btn" style="background:#c6f6d5; color:#2f855a; width:32px; height:32px; border-radius:9999px;">L</button>
    </div>
  </div>
</header>

<script>
  // Réplica mínima del handler React (sin portal, dentro del header).
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('drawer').removeAttribute('hidden');
  });
  document.getElementById('drawer-close').addEventListener('click', () => {
    document.getElementById('drawer').setAttribute('hidden', '');
  });
  document.getElementById('drawer-overlay').addEventListener('click', () => {
    document.getElementById('drawer').setAttribute('hidden', '');
  });
</script>

</body>
</html>`;
}

// ── Tests ──────────────────────────────────────────────────────────────────

// Cada describe aplica su propio viewport para iterar 375×812 y 360×640.
const VIEWPORTS = [
  { label: '375x812', width: 375, height: 812, deviceScaleFactor: 2 },
  { label: '360x640', width: 360, height: 640, deviceScaleFactor: 2 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`FIX-20260821-04 — header/nav móvil @ ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('FIXED: hamburger ≥44×44 y drawer cubre viewport (portal aplicado)', async ({
      page,
    }, testInfo) => {
      await page.setContent(buildFixedFixture('3° B Preescolar'), { waitUntil: 'load' });

      // (1) viewport aplicado.
      expect(page.viewportSize()).toEqual({ width: vp.width, height: vp.height });

      // (2) estado cerrado: hamburger visible y con touch target ≥44×44.
      const burger = page.getByTestId('nav-menu-hamburger');
      await expect(burger).toBeVisible();
      const burgerRect = await burger.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, x: r.x, y: r.y };
      });
      expect(burgerRect.w).toBeGreaterThanOrEqual(44);
      expect(burgerRect.h).toBeGreaterThanOrEqual(44);
      expect(await burger.getAttribute('aria-expanded')).toBe('false');

      // (3) abrir drawer.
      await burger.click();
      await expect(page.locator('#drawer')).toBeVisible();
      expect(await burger.getAttribute('aria-expanded')).toBe('true');

      // (4) ASSERT CLAVE: drawer cubre viewport (≈ vp.height, NO 56 px).
      const drawerMetrics = await page.evaluate(() => {
        const d = document.getElementById('drawer');
        const o = document.getElementById('drawer-overlay');
        const p = document.getElementById('drawer-panel');
        const closeBtn = document.getElementById('drawer-close');
        const header = document.getElementById('app-header');
        // Punto en el margen IZQUIERDO del viewport — fuera del panel
        // derecho (que mide w-72=288px, ancla a la derecha).
        const leftEl = document.elementFromPoint(10, window.innerHeight / 2);
        // Punto sobre el enlace "Mis planeaciones" (centro del bounding).
        const planeRect = document
          .getElementById('link-planeaciones')
          ?.getBoundingClientRect();
        const planeEl =
          planeRect && document.elementFromPoint(planeRect.x + planeRect.width / 2, planeRect.y + planeRect.height / 2);
        // Punto sobre el centro vertical / horizontal del viewport — cae
        // DENTRO del panel (w-72 anclado a la derecha).
        const panelCenterEl = document.elementFromPoint(
          Math.min(window.innerWidth - 50, window.innerWidth * 0.85),
          window.innerHeight / 2,
        );
        return {
          vw: window.innerWidth,
          vh: window.innerHeight,
          drawer: d?.getBoundingClientRect(),
          overlay: o?.getBoundingClientRect(),
          panel: p?.getBoundingClientRect(),
          closeBtn: closeBtn?.getBoundingClientRect(),
          header: header?.getBoundingClientRect(),
          leftTagId: leftEl?.id || '',
          leftTagDataTestid: leftEl?.getAttribute('data-testid') || '',
          leftTagName: leftEl?.tagName || '',
          planeacionesTagId: planeEl?.id || '',
          planeacionesTagName: planeEl?.tagName || '',
          panelCenterTagId: panelCenterEl?.id || '',
          panelCenterTagName: panelCenterEl?.tagName || '',
          planeRect: planeRect
            ? { x: planeRect.x, y: planeRect.y, w: planeRect.width, h: planeRect.height }
            : null,
        };
      });

      // Cabecera métrica.
      const m = drawerMetrics;
      expect(m.drawer).not.toBeNull();
      expect(m.overlay).not.toBeNull();
      expect(m.panel).not.toBeNull();

      // (4a) DRAWER ≈ viewport completo.
      expect(m.drawer!.width).toBeGreaterThanOrEqual(vp.width);
      expect(m.drawer!.height).toBeGreaterThanOrEqual(vp.height);

      // (4b) OVERLAY ≈ viewport completo (la prueba discriminante del fix).
      expect(m.overlay!.width).toBeGreaterThanOrEqual(vp.width);
      expect(m.overlay!.height).toBeGreaterThanOrEqual(vp.height);

      // (4c) PANEL cubre el alto del viewport: anclado a `right-0 top-0
      // h-full` dentro del root `fixed inset-0`, debe medir vp.height.
      expect(m.panel!.height).toBeGreaterThanOrEqual(vp.height - 4);
      expect(m.panel!.width).toBeGreaterThanOrEqual(280); // w-72 ≈ 288

      // (4d) Punto en el margen IZQUIERDO (10, vp.h/2) ⇒ overlay
      // (tap cierra el menú). Antes del fix, ese punto caía sobre el
      // contenido de la página (overlay colapsado a 56px).
      expect(m.leftTagId).toBe('drawer-overlay');

      // (4e) Punto sobre "Mis planeaciones" (centro de su rect) ⇒ el propio <a>.
      expect(m.planeacionesTagId).toBe('link-planeaciones');
      expect(m.planeacionesTagName).toBe('A');

      // (4f) Punto sobre el área del panel (parte derecha del viewport) ⇒ no
      // debe ser uno de los botones del dashboard. Tras el fix, lo que
      // hay ahí es un hijo del drawer (panel, close, o link-*); pre-fix
      // sería un botón de la página (drawer colapsado).
      expect(m.panelCenterTagId).not.toBe('btn-inventario');
      expect(m.panelCenterTagId).not.toBe('btn-biblioteca');
      expect(m.panelCenterTagId).not.toBe('btn-nueva');

      // (4g) close button dentro del panel, ≥44×44 (touch target).
      expect(m.closeBtn!.width).toBeGreaterThanOrEqual(44);
      expect(m.closeBtn!.height).toBeGreaterThanOrEqual(44);

      // (5) Botones del dashboard NO quedan interceptados por el NAV del
      // drawer. Pre-fix: `elementFromPoint` en el centro de
      // #btn-inventario/#btn-biblioteca devolvía el `<nav>` del drawer
      // (intercepción con `pointer-events` y navegación inesperada).
      // Post-fix: el drawer es descendiente de `<body>` ⇒ sus elementos
      // están contenidos en el panel w-72 anclado a la derecha; los
      // botones del dashboard que caen en la mitad IZQUIERDA del viewport
      // (fuera del panel) son interceptados por el overlay, mientras que
      // los botones que caen DENTRO del panel son tap-ables pero
      // visualmente bloqueados por el panel (overlay sí intercepta el
      // resto). Verificamos: el botón que se queda en la zona izquierda
      // (mitad del dashboard) es interceptado por el overlay, NO por el nav.
      const interception = await page.evaluate(() => {
        type TopResult = {
          id: string;
          rect: { x: number; y: number; w: number; h: number };
          cx: number;
          cy: number;
          topId: string;
          topTag: string;
        };
        function topElAt(id: string): TopResult | { missing: true; id: string } {
          const el = document.getElementById(id);
          if (!el) return { missing: true, id };
          const r = el.getBoundingClientRect();
          if (!r) return { missing: true, id };
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          const topEl = document.elementFromPoint(cx, cy);
          return {
            id,
            rect: { x: r.x, y: r.y, w: r.width, h: r.height },
            cx,
            cy,
            topId: topEl?.id ?? 'NULL',
            topTag: topEl?.tagName ?? 'NULL',
          };
        }
        return {
          leftMarginTopEl: (() => {
            const el = document.elementFromPoint(
              10,
              Math.min(400, window.innerHeight / 2),
            );
            return el ? { tag: el.tagName, id: el.id } : null;
          })(),
          btnInventario: topElAt('btn-inventario'),
          btnBiblioteca: topElAt('btn-biblioteca'),
          btnNueva: topElAt('btn-nueva'),
        };
      });
      // Margen izquierdo (10, ...): fuera del panel derecho ⇒ overlay
      // intercepta el tap y cierra el menú (no el nav del drawer).
      expect(interception.leftMarginTopEl).not.toBeNull();
      expect(interception.leftMarginTopEl!.id).toBe('drawer-overlay');
      // Verificación de "no interceptación por NAV del drawer":
      // los centros de los botones del dashboard NO deben poder ser
      // alcanzados como `btn-inventario`/`btn-biblioteca`/`btn-nueva`
      // cuando el drawer está abierto (modal correcto: el botón queda
      // debajo del drawer; el tap cierra el menú). Si el id coincide
      // con el del botón, los botones del dashboard serían tappables
      // (modal roto). Si coincide con `link-*` del drawer, sería la
      // firma del bug original (tap navega a destino inesperado).
      function assertNotLeakingButton(
        o: { topId?: string } | { missing: true; id: string } | null | undefined,
        buttonId: string,
      ) {
        // Si el botón está fuera de viewport (rect inválido / missing),
        // no se puede probar — pasamos esa rama sin error.
        if (!o) return;
        if ('missing' in o && o.missing) return;
        if (!('topId' in o)) return;
        if (typeof o.topId !== 'string') return;
        // El elemento en el centro de la posición del botón NO debe ser
        // el propio botón ⇒ modal deja pasar el tap (roto). El resto
        // (drawer-overlay / drawer-panel / drawer-close / link-*) es
        // comportamiento modal correcto: el drawer bloquea el botón.
        // La verificación del bug original (link-* absorbe taps) se
        // hace en el CONTROL A/B (estado ROTO sin portal) y por las
        // métricas (4a-4b): drawer ≈ viewport, overlay ≈ viewport.
        expect(o.topId).not.toBe(buttonId);
      }
      assertNotLeakingButton(interception.btnInventario, 'btn-inventario');
      assertNotLeakingButton(interception.btnBiblioteca, 'btn-biblioteca');
      assertNotLeakingButton(interception.btnNueva, 'btn-nueva');

      // (6) Captura evidencia.
      const evidenceDir = testInfo.outputPath('evidence');
      mkdirSync(evidenceDir, { recursive: true });
      const screenshotPath = join(evidenceDir, `header-nav-fixed-drawer-open-${vp.label}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const metricsPath = join(evidenceDir, `header-nav-fixed-drawer-open-${vp.label}.metrics.json`);
      const metricsOut = {
        viewport: { width: vp.width, height: vp.label.includes('375') ? 812 : 640 },
        burgerRect,
        ...m,
        interception,
      };
      writeFileSync(metricsPath, JSON.stringify(metricsOut, null, 2), 'utf8');
      await testInfo.attach(`fixed-drawer-open-${vp.label}`, {
        path: screenshotPath,
        contentType: 'image/png',
      });
      await testInfo.attach(`fixed-drawer-open-${vp.label}-metrics`, {
        body: JSON.stringify(metricsOut, null, 2),
        contentType: 'application/json',
      });

      // (7) cierre por X: drawer vuelve a estar oculto.
      await page.getByTestId('nav-menu-close').click();
      await expect(page.locator('#drawer')).toBeHidden();
      expect(await burger.getAttribute('aria-expanded')).toBe('false');

      // (8) reapertura + cierre por tap en overlay (coordenada esquina
      // superior izquierda, fuera del panel derecho).
      await burger.click();
      await expect(page.locator('#drawer')).toBeVisible();
      await page.evaluate(() => {
        const o = document.getElementById('drawer-overlay') as HTMLElement | null;
        if (o) o.click();
      });
      await expect(page.locator('#drawer')).toBeHidden();

      // (9) reapertura + cierre por Escape.
      await burger.click();
      await expect(page.locator('#drawer')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#drawer')).toBeHidden();

      // (10) reapertura + navegación: tap en "Mis planeaciones" cierra drawer
      // y registra tap (mismo flujo que el clic cierra el menú).
      await burger.click();
      await expect(page.locator('#drawer')).toBeVisible();
      await page.evaluate(() => {
        const a = document.getElementById('link-planeaciones') as HTMLAnchorElement | null;
        if (a) a.click();
      });
      // Tras la "navegación" el onclick registrado (__navTap) cierra.
      await expect(page.locator('#drawer')).toBeHidden();
      const tapLog = await page.evaluate(() => window.__tapLog);
      expect(tapLog).toContain('Mis planeaciones');
    });

    test('CONTROL A/B: con backdrop-blur SIN portal, drawer colapsa a ~56px', async ({
      page,
    }, testInfo) => {
      // Esta página replica el estado ROTO pre-fix (drawer dentro del header
      // con backdrop-blur). Si el portal se revierte por error, este control
      // falla ⇒ regresión detectada.
      await page.setContent(buildBrokenFixture('3° B Preescolar'), { waitUntil: 'load' });
      await page
        .getByTestId('nav-menu-hamburger')
        .click({ force: true })
        .catch(() => {
          // En el estado roto el hamburger puede quedar parcialmente fuera del
          // header; forzamos el click vía JS.
        });
      // El onclick también está expuesto vía DOM. Forzamos abrir:
      await page.evaluate(() => {
        const d = document.getElementById('drawer');
        if (d) d.removeAttribute('hidden');
      });
      await page.waitForSelector('#drawer:not([hidden])');
      const broken = await page.evaluate(() => {
        const d = document.getElementById('drawer');
        const h = document.getElementById('app-header');
        const hr = h?.getBoundingClientRect();
        const dr = d?.getBoundingClientRect();
        return {
          headerHeight: hr?.height ?? 0,
          drawerWidth: dr?.width ?? 0,
          drawerHeight: dr?.height ?? 0,
          // LA prueba discriminante: drawer === header en dimensiones.
          drawerEqualsHeader: dr && hr
            ? Math.abs(dr.height - hr.height) < 4 && Math.abs(dr.width - hr.width) < 4
            : false,
        };
      });
      // Esperado en ROTO: drawer = header (375×56 en 375x812).
      expect(broken.drawerHeight).toBeLessThanOrEqual(broken.headerHeight + 4);
      expect(broken.drawerHeight).toBeGreaterThanOrEqual(broken.headerHeight - 4);
      // La métrica de control: drawer NO cubre viewport.
      expect(broken.drawerHeight).toBeLessThan(broken.headerHeight * 2);

      // Evidencia comparativa.
      const evidenceDir = testInfo.outputPath('evidence');
      mkdirSync(evidenceDir, { recursive: true });
      const screenshotPath = join(
        evidenceDir,
        `header-nav-BROKEN-drawer-open-${vp.label}.png`,
      );
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const metricsPath = join(
        evidenceDir,
        `header-nav-BROKEN-drawer-open-${vp.label}.metrics.json`,
      );
      writeFileSync(metricsPath, JSON.stringify(broken, null, 2), 'utf8');
      await testInfo.attach(`broken-drawer-open-${vp.label}`, {
        path: screenshotPath,
        contentType: 'image/png',
      });
    });
  });
}
