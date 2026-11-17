import { describe, it, expect } from 'vitest';
import {
  clasificarYOrdenarPdas,
  extraerTokensRelevantes,
  normalizarTextoEspanol,
} from '@/lib/planeaciones/pda-afinidad';
import type { Contenido, PDA } from '@/services/catalogo/catalogo';

const CONTENIDOS: Contenido[] = [
  { codigo: 'C-AGUA', campo_codigo: 'saberes', texto: 'Cuidado del agua y la naturaleza', fase_codigo: '2' },
  { codigo: 'C-CUENTO', campo_codigo: 'lenguajes', texto: 'Narración de historias y cuentos', fase_codigo: '2' },
  { codigo: 'C-NUM', campo_codigo: 'saberes', texto: 'Saberes numéricos para contar', fase_codigo: '2' },
];

const PDAS: PDA[] = [
  {
    codigo: 'PDA-NUM-1',
    contenido_codigo: 'C-NUM',
    grado: '2°',
    texto: 'Cuenta objetos de su entorno en juegos cotidianos.',
    activo: true,
  },
  {
    codigo: 'PDA-AGUA-1',
    contenido_codigo: 'C-AGUA',
    grado: '2°',
    texto: 'Propone acciones para cuidar el agua y las plantas de su comunidad.',
    activo: true,
  },
  {
    codigo: 'PDA-CUENTO-1',
    contenido_codigo: 'C-CUENTO',
    grado: '2°',
    texto: 'Narra historias que inventa considerando personajes y secuencia.',
    activo: true,
  },
  {
    codigo: 'PDA-AGUA-2',
    contenido_codigo: 'C-AGUA',
    grado: '2°',
    texto: 'Identifica situaciones donde se desperdicia el agua en la escuela.',
    activo: true,
  },
];

describe('pda-afinidad', () => {
  it('normaliza acentos y extrae tokens relevantes con expansión temática', () => {
    expect(normalizarTextoEspanol('Cuidado del ÁguA y Reciclaje!')).toBe('cuidado del agua y reciclaje');
    const tokens = extraerTokensRelevantes('Cuidar el agua en el jardín');
    expect(tokens).toContain('agua');
    expect(tokens).toContain('naturaleza');
  });

  it('ordena y sugiere PDAs por afinidad determinista cuando hay contexto', () => {
    const res = clasificarYOrdenarPdas(PDAS, CONTENIDOS, {
      nombre: 'Guardianes del agua',
      problemaContexto: 'En la escuela se desperdicia el agua al lavar las manos',
      proposito: 'Cuidar el agua y las plantas',
    });

    expect(res.tieneContexto).toBe(true);
    expect(res.sugeridos.length).toBeGreaterThanOrEqual(2);
    expect(res.sugeridos.map((s) => s.pda.codigo)).toContain('PDA-AGUA-1');
    expect(res.sugeridos.map((s) => s.pda.codigo)).toContain('PDA-AGUA-2');
    expect(res.sugeridos[0]?.origen).toBe('afinidad');
    // Los restantes no duplican a los sugeridos
    const sugeridosSet = new Set(res.sugeridos.map((s) => s.pda.codigo));
    for (const r of res.restantes) {
      expect(sugeridosSet.has(r.pda.codigo)).toBe(false);
    }
  });

  it('prioriza sugerencias de IA y orden de afinidad de IA, ignorando códigos inventados', () => {
    const res = clasificarYOrdenarPdas(
      PDAS,
      CONTENIDOS,
      {
        nombre: 'Contamos cuentos del agua',
      },
      {
        iaSugeridos: [
          { codigo: 'PDA-CUENTO-1', razon: 'Conecta la narración con el tema central.' },
          { codigo: 'PDA-INVENTADO-999', razon: 'No debe aparecer.' },
          { codigo: 'PDA-AGUA-1', razon: 'Aborda directamente el cuidado del agua.' },
        ],
        iaAfinidadOrden: ['PDA-AGUA-2', 'PDA-NUM-1'],
      },
    );

    expect(res.sugeridos.map((s) => s.pda.codigo)).toEqual(['PDA-CUENTO-1', 'PDA-AGUA-1']);
    expect(res.sugeridos[0]?.origen).toBe('ia');
    expect(res.sugeridos[0]?.razon).toContain('narración');
    expect(res.restantes.map((r) => r.pda.codigo)).toEqual(['PDA-AGUA-2', 'PDA-NUM-1']);
  });

  it('devuelve todos en restantes sin sugeridos cuando no hay contexto ni IA', () => {
    const res = clasificarYOrdenarPdas(PDAS, CONTENIDOS, {});
    expect(res.tieneContexto).toBe(false);
    expect(res.sugeridos).toHaveLength(0);
    expect(res.restantes.map((r) => r.pda.codigo)).toEqual(PDAS.map((p) => p.codigo));
  });
});
