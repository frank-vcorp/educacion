/**
 * Matching simple entre recursos_requeridos del catálogo M1 e inventario del aula.
 */

export interface RecursoRequerido {
  categoria?: string;
  clave_busqueda?: string;
  cantidad?: number;
}

export interface RecursoInventario {
  id: string;
  nombre: string;
  categoria: string;
  uso: string;
}

export interface MatchRecurso {
  recursoId: string;
  nombre: string;
  razon: string;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

export function matchRecursosInventario(
  requeridos: RecursoRequerido[],
  inventario: RecursoInventario[],
): MatchRecurso[] {
  if (!requeridos.length || !inventario.length) return [];
  const usados = new Set<string>();
  const matches: MatchRecurso[] = [];

  for (const req of requeridos) {
    const clave = normalizar(req.clave_busqueda ?? '');
    const cat = normalizar(req.categoria ?? '');
    if (!clave && !cat) continue;

    for (const item of inventario) {
      if (usados.has(item.id)) continue;
      const nombre = normalizar(item.nombre);
      const uso = normalizar(item.uso);
      const categoria = normalizar(item.categoria);

      const porClave =
        clave.length > 0 &&
        (nombre.includes(clave) ||
          clave.includes(nombre) ||
          uso.includes(clave) ||
          clave.split(/\s+/).some((p) => p.length >= 3 && (nombre.includes(p) || uso.includes(p))));

      const porCategoria = cat.length > 0 && categoria === cat;

      if (porClave || porCategoria) {
        usados.add(item.id);
        matches.push({
          recursoId: item.id,
          nombre: item.nombre,
          razon: porClave
            ? `Coincide con “${req.clave_busqueda}”`
            : `Misma categoría (${req.categoria})`,
        });
        break;
      }
    }
  }
  return matches;
}
