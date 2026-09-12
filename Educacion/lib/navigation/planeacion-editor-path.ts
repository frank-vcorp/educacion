/** Vista de edición de una planeación (no entregar/evaluar/nueva). */
export function isPlaneacionEditorPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/planeaciones\/[0-9a-f-]{36}$/i.test(pathname);
}

export const CONSULTA_RAPIDA_HREFS = [
  '/alumnos',
  '/recursos-aula',
  '/biblioteca',
] as const;

export type ConsultaRapidaHref = (typeof CONSULTA_RAPIDA_HREFS)[number];

export function hrefToEmbedPath(href: ConsultaRapidaHref): string {
  if (href === '/alumnos') return '/embed/alumnos';
  if (href === '/recursos-aula') return '/embed/recursos-aula';
  return '/embed/biblioteca';
}

export function consultaRapidaLabel(href: ConsultaRapidaHref): string {
  if (href === '/alumnos') return 'Alumnos';
  if (href === '/recursos-aula') return 'Recursos del aula';
  return 'Biblioteca CONALITEG';
}
