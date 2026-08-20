/**
 * Tests para buildModalidadData — helper puro que traduce el FormState
 * del wizard a `metadata.modalidad_data` (contrato JSONB persistido).
 *
 * IMPL-20260818-07 — Fix P1-01 (GEMINI audit final 2026-08-18):
 *   Las modalidades ABJ y Taller Crítico ahora incluyen el contenido
 *   capturado de las 3 fases en metadata. Antes se persistían vacías o
 *   solo las claves sin contenido.
 *
 * SPEC_MODALIDADES_2026-08-17 §Estructura canónica.
 */
import { describe, it, expect } from 'vitest';
import {
  buildModalidadData,
  INITIAL_FORM,
  type FormState,
} from '../../components/planeaciones/wizard-modalidad-data';

/** Construye un FormState base de ABJ con las 3 fases capturadas. */
function makeAbjForm(overrides: Partial<FormState['fases']> = {}): FormState {
  return {
    ...INITIAL_FORM,
    modalidad: 'abj',
    nombre: 'ABJ — juego simbólico del agua',
    problemaContexto: 'Problema de contexto capturado en el wizard',
    ajustesRazonables: 'Ajustes razonables suficientemente largos para pasar validación',
    camposFormativos: ['LENGUAJES'],
    pdas: ['PDA-LEN-001'],
    periodoInicio: '2026-08-18',
    periodoFin: '2026-08-25',
    fases: {
      reflexion: '',
      inicioJuego: overrides.inicioJuego ?? 'Se presenta el juego con tarjetas de colores',
      desarrolloJuego:
        overrides.desarrolloJuego ?? 'Los niños eligen roles y juegan en equipos',
      cierreJuego:
        overrides.cierreJuego ?? 'Reflexionamos en círculo sobre lo aprendido',
      produccion: '',
      socializacion: '',
    },
  };
}

/** Construye un FormState base de Taller Crítico con las 3 fases capturadas. */
function makeTallerForm(overrides: Partial<FormState['fases']> = {}): FormState {
  return {
    ...INITIAL_FORM,
    modalidad: 'taller_critico',
    nombre: 'Taller crítico — oficios de mi comunidad',
    problemaContexto: 'Problema de contexto capturado en el wizard',
    ajustesRazonables: 'Ajustes razonables suficientemente largos para pasar validación',
    camposFormativos: ['SABERES_Y_PENSAMIENTO_CIENTIFICO'],
    pdas: ['PDA-SPC-002'],
    periodoInicio: '2026-08-18',
    periodoFin: '2026-08-25',
    fases: {
      reflexion: overrides.reflexion ?? '¿Qué pasaría si los oficios desaparecieran?',
      inicioJuego: '',
      desarrolloJuego: '',
      cierreJuego: '',
      produccion: overrides.produccion ?? 'Collage colectivo sobre los oficios',
      socializacion: overrides.socializacion ?? 'Exposición a las familias de la escuela',
    },
  };
}

describe('buildModalidadData — fix P1-01 (ABJ y Taller Crítico persisten contenido)', () => {
  it('ABJ: incluye el contenido de los 3 momentos capturado en el wizard', () => {
    const form = makeAbjForm();
    const data = buildModalidadData(form) as {
      inicio_juego: string;
      desarrollo_juego: string;
      cierre_reflexion: string;
    };

    expect(data.inicio_juego).toBe('Se presenta el juego con tarjetas de colores');
    expect(data.inicio_juego.length).toBeGreaterThanOrEqual(5);
    expect(data.desarrollo_juego).toBe(
      'Los niños eligen roles y juegan en equipos',
    );
    expect(data.desarrollo_juego.length).toBeGreaterThanOrEqual(5);
    expect(data.cierre_reflexion).toBe('Reflexionamos en círculo sobre lo aprendido');
    expect(data.cierre_reflexion.length).toBeGreaterThanOrEqual(5);
  });

  it('ABJ: hace trim del contenido para evitar whitespace-only en BD', () => {
    const form = makeAbjForm({
      inicioJuego: '   Inicio con tarjetas y reglas claras   ',
      desarrolloJuego: '\n\nDesarrollo del juego con variantes\n\n',
      cierreJuego: '\tCierre reflexivo en asamblea\t',
    });
    const data = buildModalidadData(form) as {
      inicio_juego: string;
      desarrollo_juego: string;
      cierre_reflexion: string;
    };

    expect(data.inicio_juego).toBe('Inicio con tarjetas y reglas claras');
    expect(data.desarrollo_juego).toBe('Desarrollo del juego con variantes');
    expect(data.cierre_reflexion).toBe('Cierre reflexivo en asamblea');
  });

  it('Taller Crítico: incluye el contenido de las 3 fases capturado en el wizard', () => {
    const form = makeTallerForm();
    const data = buildModalidadData(form) as {
      reflexion_inicial: string;
      produccion: string;
      socializacion: string;
    };

    expect(data.reflexion_inicial).toBe('¿Qué pasaría si los oficios desaparecieran?');
    expect(data.reflexion_inicial.length).toBeGreaterThanOrEqual(5);
    expect(data.produccion).toBe('Collage colectivo sobre los oficios');
    expect(data.produccion.length).toBeGreaterThanOrEqual(5);
    expect(data.socializacion).toBe('Exposición a las familias de la escuela');
    expect(data.socializacion.length).toBeGreaterThanOrEqual(5);
  });

  it('Taller Crítico: hace trim del contenido para evitar whitespace-only en BD', () => {
    const form = makeTallerForm({
      reflexion: '  ¿Qué pasaría sin oficios?  ',
      produccion: '\nCollage colectivo\n',
      socializacion: '\tExposición a familias\t',
    });
    const data = buildModalidadData(form) as {
      reflexion_inicial: string;
      produccion: string;
      socializacion: string;
    };

    expect(data.reflexion_inicial).toBe('¿Qué pasaría sin oficios?');
    expect(data.produccion).toBe('Collage colectivo');
    expect(data.socializacion).toBe('Exposición a familias');
  });

  it('ABJ/Taller: NO persiste la forma legacy (claves sin contenido ni strings vacíos de campos no capturados)', () => {
    const abjData = buildModalidadData(makeAbjForm()) as Record<string, unknown>;
    // Antes (legacy): tipo_juego/reglas/extension como strings vacíos.
    expect(abjData.tipo_juego).toBeUndefined();
    expect(abjData.reglas).toBeUndefined();
    expect(abjData.extension).toBeUndefined();
    expect(abjData.fases).toBeUndefined();

    const tallerData = buildModalidadData(makeTallerForm()) as Record<string, unknown>;
    // Antes (legacy): fases como array de claves sin contenido.
    expect(tallerData.fases).toBeUndefined();
  });

  it('Las otras 4 modalidades siguen devolviendo sus estructuras canónicas intactas', () => {
    const base = {
      ...INITIAL_FORM,
      nombre: 'X',
      problemaContexto: 'Contexto suficientemente largo',
      ajustesRazonables: 'Ajustes razonables suficientemente largos',
      camposFormativos: ['LENGUAJES'],
      pdas: ['PDA-001'],
      periodoInicio: '2026-08-18',
      periodoFin: '2026-08-25',
    };

    // proyecto_comunitario: {}
    expect(buildModalidadData({ ...base, modalidad: 'proyecto_comunitario' })).toEqual({});

    // unidad_didactica: { sesiones_semana, actividades_recurrentes }
    const udData = buildModalidadData({
      ...base,
      modalidad: 'unidad_didactica',
      sesionesSemana: { lunes: 'Sesión lunes' },
      bancoPalabras: ['agua'],
    }) as { sesiones_semana: object; actividades_recurrentes: unknown[] };
    expect(udData.sesiones_semana).toEqual({ lunes: 'Sesión lunes' });
    expect(Array.isArray(udData.actividades_recurrentes)).toBe(true);

    // rincones: { rincones: [{ nombre, materiales[], reglas }] }
    const rData = buildModalidadData({
      ...base,
      modalidad: 'rincones',
      rincones: [
        { nombre: 'Lectura', materiales: 'Libros\nCojines', reglas: 'Silencio' },
        { nombre: 'Arte', materiales: '', reglas: 'Lavar pinceles' },
      ],
    }) as { rincones: Array<{ nombre: string; materiales: string[]; reglas: string }> };
    expect(rData.rincones).toHaveLength(2);
    expect(rData.rincones[0]?.nombre).toBe('Lectura');
    expect(rData.rincones[0]?.materiales).toEqual(['Libros', 'Cojines']);

    // centros_interes: { tema, preguntas_det, estaciones }
    const ciData = buildModalidadData({
      ...base,
      modalidad: 'centros_interes',
      temaCentro: 'Los oficios',
      preguntasDet: ['¿Qué son?', '¿Quién los hace?'],
    }) as { tema: string; preguntas_det: string[]; estaciones: unknown[] };
    expect(ciData.tema).toBe('Los oficios');
    expect(ciData.preguntas_det).toEqual(['¿Qué son?', '¿Quién los hace?']);
  });
});
