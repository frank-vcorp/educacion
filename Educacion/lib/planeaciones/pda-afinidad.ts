import type { Contenido, EjeArticulador, PDA } from '@/services/catalogo/catalogo';

export interface ContextoPdaAfinidad {
  nombre?: string;
  problemaContexto?: string;
  proposito?: string;
  productoIntegrador?: string;
  pdasTextos?: string[];
}

export interface SugerenciaIaPda {
  codigo: string;
  razon?: string;
}

export interface PdaClasificado {
  pda: PDA;
  score: number;
  origen: 'ia' | 'afinidad';
  razon?: string;
}

export interface ResultadoClasificacionPdas {
  sugeridos: PdaClasificado[];
  restantes: PdaClasificado[];
  tieneContexto: boolean;
}

const STOPWORDS_ES = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'asi', 'aun', 'bajo', 'bien',
  'cada', 'casi', 'como', 'con', 'contra', 'cual', 'cuando', 'de', 'del', 'desde',
  'donde', 'dos', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'es',
  'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estan', 'estas', 'este', 'esto',
  'estos', 'fue', 'ha', 'hace', 'hacia', 'han', 'hasta', 'hay', 'la', 'las',
  'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'mucho', 'muy', 'nada',
  'ni', 'no', 'nos', 'nuestra', 'nuestro', 'o', 'otra', 'otras', 'otro', 'otros',
  'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'se', 'sea', 'segun',
  'ser', 'si', 'sin', 'sobre', 'son', 'su', 'sus', 'tambien', 'tan', 'tanto',
  'te', 'tener', 'ti', 'tiene', 'tienen', 'todo', 'todos', 'tras', 'tu', 'tus',
  'un', 'una', 'unas', 'uno', 'unos', 'usted', 'ustedes', 'va', 'vamos', 'van',
  'vez', 'y', 'ya', 'yo', 'ninos', 'ninas', 'preescolar', 'escuela', 'aula',
  'jardin', 'grupo', 'proyecto', 'planeacion', 'actividad', 'actividades',
]);

const EXPANSION_TEMATICA: Record<string, string[]> = {
  agua: ['agua', 'cuidar', 'naturaleza', 'limpiar', 'plantas', 'seres', 'vivos', 'comunidad', 'ambiente'],
  papel: ['papel', 'reciclar', 'reutilizar', 'reducir', 'materiales', 'arboles', 'basura', 'naturaleza'],
  recicla: ['reciclar', 'reutilizar', 'reducir', 'basura', 'residuos', 'naturaleza', 'ambiente', 'cuidar'],
  basura: ['basura', 'residuos', 'limpiar', 'reciclar', 'reutilizar', 'ambiente', 'comunidad', 'salud'],
  plant: ['plantas', 'sembrar', 'huerto', 'naturaleza', 'seres', 'vivos', 'cuidar', 'crecer', 'agua'],
  huerto: ['huerto', 'plantas', 'sembrar', 'tierra', 'alimentos', 'naturaleza', 'cuidar'],
  animal: ['animales', 'seres', 'vivos', 'naturaleza', 'cuidar', 'habitat', 'entorno'],
  aliment: ['alimentos', 'saludable', 'comida', 'frutas', 'verduras', 'nutricion', 'higiene', 'salud'],
  salud: ['salud', 'higiene', 'lavar', 'manos', 'enfermedades', 'cuidar', 'cuerpo', 'alimentacion'],
  emocion: ['emociones', 'sentimientos', 'alegria', 'enojo', 'tristeza', 'miedo', 'expresar', 'convivencia'],
  conviv: ['convivencia', 'acuerdos', 'reglas', 'respeto', 'compartir', 'dialogo', 'conflictos', 'paz'],
  derech: ['derechos', 'ninas', 'ninos', 'respeto', 'igualdad', 'inclusion', 'proteccion'],
  cuent: ['cuentos', 'narracion', 'historias', 'lectura', 'libros', 'imaginar', 'personajes', 'oral'],
  narr: ['narracion', 'cuentos', 'historias', 'relatar', 'expresar', 'lenguaje', 'oral'],
  numer: ['numeros', 'contar', 'colecciones', 'cantidad', 'agregar', 'quitar', 'resolver'],
  contar: ['contar', 'numeros', 'colecciones', 'cantidad', 'objetos', 'juegos'],
  medir: ['medir', 'tamano', 'longitud', 'peso', 'tiempo', 'comparar', 'objetos'],
  arte: ['arte', 'pintar', 'dibujar', 'modelar', 'musica', 'bailar', 'expresion', 'creatividad'],
  music: ['musica', 'cantar', 'ritmo', 'sonidos', 'instrumentos', 'bailar', 'cuerpo'],
  famil: ['familia', 'comunidad', 'costumbres', 'tradiciones', 'historia', 'identidad'],
  tradicion: ['tradiciones', 'costumbres', 'cultura', 'comunidad', 'celebraciones', 'familia'],
  segur: ['seguridad', 'riesgos', 'prevencion', 'cuidar', 'accidentes', 'entorno'],
};

export function normalizarTextoEspanol(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extraerTokensRelevantes(texto: string): string[] {
  const norm = normalizarTextoEspanol(texto);
  if (!norm) return [];
  const tokens = norm
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS_ES.has(t));

  const expanded = new Set<string>(tokens);
  for (const t of tokens) {
    for (const [prefijo, relacionados] of Object.entries(EXPANSION_TEMATICA)) {
      if (t.startsWith(prefijo)) {
        for (const rel of relacionados) {
          expanded.add(rel);
        }
      }
    }
  }
  return Array.from(expanded);
}

export function calcularScoreAfinidadPda(
  pda: PDA,
  contenidoTitulo: string,
  tokensContexto: string[],
  tokensDirectos: Set<string>,
): number {
  if (tokensContexto.length === 0) return 0;

  const textoPdaNorm = normalizarTextoEspanol(pda.texto);
  const textoContenidoNorm = normalizarTextoEspanol(contenidoTitulo);
  const palabrasPda = new Set(textoPdaNorm.split(' ').filter((w) => w.length >= 3));
  const palabrasContenido = new Set(textoContenidoNorm.split(' ').filter((w) => w.length >= 3));

  let score = 0;
  for (const token of tokensContexto) {
    const esDirecto = tokensDirectos.has(token);
    const pesoBase = esDirecto ? 3 : 1;

    if (palabrasPda.has(token)) {
      score += pesoBase * 2;
    } else if (token.length >= 4 && textoPdaNorm.includes(token)) {
      score += pesoBase * 1.5;
    }

    if (palabrasContenido.has(token)) {
      score += pesoBase;
    } else if (token.length >= 4 && textoContenidoNorm.includes(token)) {
      score += pesoBase * 0.5;
    }
  }

  return Math.round(score * 10) / 10;
}

export function clasificarYOrdenarPdas(
  pdas: PDA[],
  contenidos: Contenido[],
  contexto: ContextoPdaAfinidad,
  opts?: {
    iaSugeridos?: SugerenciaIaPda[];
    iaAfinidadOrden?: string[];
    maxSugeridosDeterministas?: number;
  },
): ResultadoClasificacionPdas {
  const contenidoPorCodigo = new Map(contenidos.map((c) => [c.codigo, c.texto]));
  const textoContexto = [
    contexto.nombre ?? '',
    contexto.problemaContexto ?? '',
    contexto.proposito ?? '',
    contexto.productoIntegrador ?? '',
  ]
    .join(' ')
    .trim();

  const tieneContexto = textoContexto.length > 0;
  const tokensDirectos = new Set(
    normalizarTextoEspanol(textoContexto)
      .split(' ')
      .filter((t) => t.length >= 3 && !STOPWORDS_ES.has(t)),
  );
  const tokensContexto = extraerTokensRelevantes(textoContexto);

  const scorePorCodigo = new Map<string, number>();
  const ordenOriginal = new Map<string, number>();
  pdas.forEach((p, idx) => {
    ordenOriginal.set(p.codigo, idx);
    const tituloContenido = contenidoPorCodigo.get(p.contenido_codigo) ?? '';
    scorePorCodigo.set(
      p.codigo,
      calcularScoreAfinidadPda(p, tituloContenido, tokensContexto, tokensDirectos),
    );
  });

  const iaSugeridosMap = new Map<string, SugerenciaIaPda>();
  for (const s of opts?.iaSugeridos ?? []) {
    if (!iaSugeridosMap.has(s.codigo)) {
      iaSugeridosMap.set(s.codigo, s);
    }
  }

  const iaRankMap = new Map<string, number>();
  (opts?.iaAfinidadOrden ?? []).forEach((codigo, idx) => {
    if (!iaRankMap.has(codigo)) {
      iaRankMap.set(codigo, idx);
    }
  });

  const sugeridos: PdaClasificado[] = [];
  const sugeridosSet = new Set<string>();

  if (iaSugeridosMap.size > 0) {
    // Respetar el orden de la IA para los sugeridos presentes en pdas
    const pdaPorCodigo = new Map(pdas.map((p) => [p.codigo, p]));
    for (const [codigo, info] of iaSugeridosMap.entries()) {
      const pda = pdaPorCodigo.get(codigo);
      if (pda) {
        sugeridos.push({
          pda,
          score: scorePorCodigo.get(codigo) ?? 0,
          origen: 'ia',
          razon: info.razon,
        });
        sugeridosSet.add(codigo);
      }
    }
  } else if (tieneContexto) {
    // Fallback determinista inmediato: top N PDAs con score > 0
    const maxSug = opts?.maxSugeridosDeterministas ?? 4;
    const candidatos = pdas
      .filter((p) => (scorePorCodigo.get(p.codigo) ?? 0) > 0)
      .sort((a, b) => {
        const diff = (scorePorCodigo.get(b.codigo) ?? 0) - (scorePorCodigo.get(a.codigo) ?? 0);
        if (diff !== 0) return diff;
        return (ordenOriginal.get(a.codigo) ?? 0) - (ordenOriginal.get(b.codigo) ?? 0);
      })
      .slice(0, maxSug);

    for (const pda of candidatos) {
      sugeridos.push({
        pda,
        score: scorePorCodigo.get(pda.codigo) ?? 0,
        origen: 'afinidad',
      });
      sugeridosSet.add(pda.codigo);
    }
  }

  const restantes: PdaClasificado[] = pdas
    .filter((p) => !sugeridosSet.has(p.codigo))
    .map((pda) => ({
      pda,
      score: scorePorCodigo.get(pda.codigo) ?? 0,
      origen: 'afinidad' as const,
    }))
    .sort((a, b) => {
      const rankA = iaRankMap.get(a.pda.codigo);
      const rankB = iaRankMap.get(b.pda.codigo);
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;

      const diffScore = b.score - a.score;
      if (diffScore !== 0) return diffScore;

      return (ordenOriginal.get(a.pda.codigo) ?? 0) - (ordenOriginal.get(b.pda.codigo) ?? 0);
    });

  return {
    sugeridos,
    restantes,
    tieneContexto,
  };
}

export interface EjeClasificado {
  eje: EjeArticulador;
  score: number;
  origen: 'ia' | 'afinidad';
  razon?: string;
}

export interface ResultadoClasificacionEjes {
  sugeridos: EjeClasificado[];
  restantes: EjeClasificado[];
  tieneContexto: boolean;
}

export function clasificarYOrdenarEjes(
  ejes: EjeArticulador[],
  contexto: ContextoPdaAfinidad,
  opts?: {
    iaSugeridos?: SugerenciaIaPda[];
    iaAfinidadOrden?: string[];
    maxSugeridosDeterministas?: number;
  },
): ResultadoClasificacionEjes {
  const textoContexto = [
    contexto.nombre ?? '',
    contexto.problemaContexto ?? '',
    contexto.proposito ?? '',
    contexto.productoIntegrador ?? '',
    ...(contexto.pdasTextos ?? []),
  ]
    .join(' ')
    .trim();

  const tieneContexto = textoContexto.length > 0;
  const tokensDirectos = new Set(
    normalizarTextoEspanol(textoContexto)
      .split(' ')
      .filter((t) => t.length >= 3 && !STOPWORDS_ES.has(t)),
  );
  const tokensContexto = extraerTokensRelevantes(textoContexto);

  const scorePorCodigo = new Map<string, number>();
  const ordenOriginal = new Map<string, number>();

  ejes.forEach((e, idx) => {
    ordenOriginal.set(e.codigo, idx);
    if (tokensContexto.length === 0) {
      scorePorCodigo.set(e.codigo, 0);
      return;
    }
    const nombreNorm = normalizarTextoEspanol(e.nombre);
    const descNorm = normalizarTextoEspanol(e.descripcion);
    const palabrasNombre = new Set(nombreNorm.split(' ').filter((w) => w.length >= 3));
    const palabrasDesc = new Set(descNorm.split(' ').filter((w) => w.length >= 3));

    let score = 0;
    for (const token of tokensContexto) {
      const pesoBase = tokensDirectos.has(token) ? 3 : 1;
      if (palabrasNombre.has(token)) score += pesoBase * 2;
      else if (token.length >= 4 && nombreNorm.includes(token)) score += pesoBase * 1.5;

      if (palabrasDesc.has(token)) score += pesoBase;
      else if (token.length >= 4 && descNorm.includes(token)) score += pesoBase * 0.5;
    }
    scorePorCodigo.set(e.codigo, Math.round(score * 10) / 10);
  });

  const iaSugeridosMap = new Map<string, SugerenciaIaPda>();
  for (const s of opts?.iaSugeridos ?? []) {
    if (!iaSugeridosMap.has(s.codigo)) {
      iaSugeridosMap.set(s.codigo, s);
    }
  }

  const iaRankMap = new Map<string, number>();
  (opts?.iaAfinidadOrden ?? []).forEach((codigo, idx) => {
    if (!iaRankMap.has(codigo)) {
      iaRankMap.set(codigo, idx);
    }
  });

  const sugeridos: EjeClasificado[] = [];
  const sugeridosSet = new Set<string>();

  if (iaSugeridosMap.size > 0) {
    const ejePorCodigo = new Map(ejes.map((e) => [e.codigo, e]));
    for (const [codigo, info] of iaSugeridosMap.entries()) {
      const eje = ejePorCodigo.get(codigo);
      if (eje) {
        sugeridos.push({
          eje,
          score: scorePorCodigo.get(codigo) ?? 0,
          origen: 'ia',
          razon: info.razon,
        });
        sugeridosSet.add(codigo);
      }
    }
  } else if (tieneContexto) {
    const maxSug = opts?.maxSugeridosDeterministas ?? 2;
    const candidatos = ejes
      .filter((e) => (scorePorCodigo.get(e.codigo) ?? 0) > 0)
      .sort((a, b) => {
        const diff = (scorePorCodigo.get(b.codigo) ?? 0) - (scorePorCodigo.get(a.codigo) ?? 0);
        if (diff !== 0) return diff;
        return (ordenOriginal.get(a.codigo) ?? 0) - (ordenOriginal.get(b.codigo) ?? 0);
      })
      .slice(0, maxSug);

    for (const eje of candidatos) {
      sugeridos.push({
        eje,
        score: scorePorCodigo.get(eje.codigo) ?? 0,
        origen: 'afinidad',
      });
      sugeridosSet.add(eje.codigo);
    }
  }

  const restantes: EjeClasificado[] = ejes
    .filter((e) => !sugeridosSet.has(e.codigo))
    .map((eje) => ({
      eje,
      score: scorePorCodigo.get(eje.codigo) ?? 0,
      origen: 'afinidad' as const,
    }))
    .sort((a, b) => {
      const rankA = iaRankMap.get(a.eje.codigo);
      const rankB = iaRankMap.get(b.eje.codigo);
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;

      const diffScore = b.score - a.score;
      if (diffScore !== 0) return diffScore;

      return (ordenOriginal.get(a.eje.codigo) ?? 0) - (ordenOriginal.get(b.eje.codigo) ?? 0);
    });

  return {
    sugeridos,
    restantes,
    tieneContexto,
  };
}

