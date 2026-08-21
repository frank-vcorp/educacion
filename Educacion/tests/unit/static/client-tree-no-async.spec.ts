/**
 * Guard de regresión — FIX-20260820-03 (React error #482).
 *
 * Prohíbe componentes `async` bajo el árbol cliente:
 *
 *   Un módulo con `'use client'` que importa (directa o transitivamente) un
 *   componente declarado `export async function` lo convierte en un
 *   Client Component async. React/Next no lo soportan: en producción el
 *   render lanza el error #482 ("async Client Components are not supported").
 *   El build NO valida esta condición (el defecto original pasó CI y
 *   despliegue), por eso la invariante se protege aquí con un recorrido del
 *   grafo de imports del árbol cliente.
 *
 * Reglas del recorrido:
 *   - Semillas: todos los módulos fuente con directiva `'use client'`.
 *   - Se siguen los imports relativos (`./`, `../`) y de alias `@/` que NO
 *     sean `import type` / `export type` (los types se borran al compilar).
 *   - Los módulos `'use server'` se excluyen del recorrido y del check:
 *     importados desde cliente se resuelven como referencias de acción
 *     (action ID), nunca se evalúan ni se renderizan como código cliente.
 *   - Los imports de paquete (bare specifiers) quedan fuera (node_modules).
 *   - Se marca violación si un módulo del árbol cliente exporta
 *     `export default async function` (componente por defecto) o
 *     `export async function PascalCase` (forma de componente).
 *
 * Los Server Components async legítimos (`app/**\/page.tsx`, `layout.tsx`,
 * shells de onboarding, etc.) NO son alcanzables desde una semilla
 * `'use client'` y por tanto no se marcan.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_DIRS = ['app', 'components', 'hooks', 'stores', 'lib', 'services'];
const EXTENSIONS = ['.ts', '.tsx'];

// ============ Utilidades ============

function listSourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      listSourceFiles(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!EXTENSIONS.includes(ext)) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

/** Directiva del módulo: `'use client'` | `'use server'` | null. */
function directiveOf(source: string): 'use client' | 'use server' | null {
  // Remueve BOM, whitespace y comentarios iniciales; la directiva debe ser
  // la primera sentencia del módulo.
  const stripped = source
    .replace(/^\uFEFF/, '')
    .replace(/^(\s*(\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, '');
  if (/^(['"])use client\1/.test(stripped)) return 'use client';
  if (/^(['"])use server\1/.test(stripped)) return 'use server';
  return null;
}

interface ImportRef {
  spec: string;
  typeOnly: boolean;
}

/** Specifiers de import/export del módulo (incluye re-exports). */
function importSpecifiers(source: string): ImportRef[] {
  const refs: ImportRef[] = [];
  // import/export ... from 'spec' (detecta `import type` / `export type`).
  const fromRe = /(?:import|export)\s+(type\s+)?[^'";]*?from\s+(['"])([^'"]+)\2/g;
  for (const m of source.matchAll(fromRe)) {
    refs.push({ spec: m[3]!, typeOnly: !!m[1] });
  }
  // import 'spec' (efecto lateral).
  const sideRe = /^\s*import\s+(['"])([^'"]+)\1/gm;
  for (const m of source.matchAll(sideRe)) {
    refs.push({ spec: m[2]!, typeOnly: false });
  }
  return refs;
}

/** Resuelve un specifier a archivo fuente del repo (null si es paquete/externo). */
function resolveSpecifier(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) {
    base = path.join(ROOT, spec.slice(2));
  } else if (spec.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return null; // paquete de node_modules / builtin
  }
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/** Exportaciones de función async con forma de componente. */
function asyncComponentExports(source: string): string[] {
  const names: string[] = [];
  const re = /export\s+(default\s+)?async\s+function\s*([A-Za-z_$][\w$]*)?/g;
  for (const m of source.matchAll(re)) {
    const isDefault = !!m[1];
    const name = m[2] ?? 'default';
    // default async export en un módulo del árbol cliente es componente;
    // named export sólo si tiene forma PascalCase de componente.
    if (isDefault || /^[A-Z]/.test(name)) names.push(name);
  }
  return names;
}

// ============ Recorrido ============

interface Violation {
  file: string;
  exportName: string;
  importedFrom: string;
}

function scanClientTree(): { violations: Violation[]; visited: number } {
  const allFiles = SOURCE_DIRS.flatMap((d) => listSourceFiles(path.join(ROOT, d)));
  const seeds = allFiles.filter((f) => directiveOf(fs.readFileSync(f, 'utf8')) === 'use client');

  const visited = new Set<string>();
  const importedFrom = new Map<string, string>();
  const violations: Violation[] = [];
  const queue = [...seeds];

  while (queue.length > 0) {
    const file = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);

    const source = fs.readFileSync(file, 'utf8');
    // Módulo 'use server': referencias de acción, no es código cliente.
    if (directiveOf(source) === 'use server') continue;

    for (const exportName of asyncComponentExports(source)) {
      violations.push({
        file: path.relative(ROOT, file),
        exportName,
        importedFrom: path.relative(ROOT, importedFrom.get(file) ?? file),
      });
    }

    for (const { spec, typeOnly } of importSpecifiers(source)) {
      if (typeOnly) continue;
      const resolved = resolveSpecifier(spec, file);
      if (!resolved || visited.has(resolved)) continue;
      if (!importedFrom.has(resolved)) importedFrom.set(resolved, file);
      queue.push(resolved);
    }
  }

  return { violations, visited: visited.size };
}

// ============ Tests ============

describe('Árbol cliente sin componentes async (React error #482)', () => {
  it('ningún módulo alcanzable desde un "use client" exporta un componente async', () => {
    const { violations, visited } = scanClientTree();

    // Sanidad del recorrido: el árbol cliente del repo es no trivial.
    expect(visited).toBeGreaterThan(20);

    expect(
      violations,
      'Componente async reachable desde el árbol cliente.\n' +
        'Un Client Component async lanza React error #482 en producción.\n' +
        'Convertir a componente no-async que cargue datos vía server action\n' +
        'o route handler (patrón FIX-20260820-03):\n' +
        JSON.stringify(violations, null, 2),
    ).toEqual([]);
  });

  it('caso concreto: EntrevistaDialogContent no es AsyncFunction', async () => {
    const mod = await import('@/app/(app)/alumnos/entrevista-dialog-content');
    const component = mod.EntrevistaDialogContent as unknown as Function;
    expect(typeof component).toBe('function');
    expect(component.constructor.name).not.toBe('AsyncFunction');
  });
});
