import { describe, it, expect } from 'vitest';
import {
  extractPdaCodes,
  validarEstructuraF1,
  validarCampoPulidoF3,
} from '@/services/ia/validate';

describe('services/ia/validate — post-IA estructura NEM (P-PD8)', () => {
  it('extractPdaCodes encuentra PDA-F<n>-<CAMPO>-<NNN>', () => {
    const text = 'Trabajamos con PDA-F2-LNG-001 y PDA-F2-LNG-002 hoy.';
    const codes = extractPdaCodes(text);
    expect(codes).toContain('PDA-F2-LNG-001');
    expect(codes).toContain('PDA-F2-LNG-002');
  });

  it('extractPdaCodes no captura emails ni CCTs ni nombres', () => {
    const text = 'maria@escuela.edu CCT 09DPR1234Z 5215555555555';
    expect(extractPdaCodes(text)).toEqual([]);
  });

  it('extractPdaCodes deduplica', () => {
    const text = 'PDA-F2-LNG-001 otra vez PDA-F2-LNG-001';
    expect(extractPdaCodes(text)).toEqual(['PDA-F2-LNG-001']);
  });

  it('validarEstructuraF1: OK si no introduce PDA nuevos', () => {
    expect(
      validarEstructuraF1({
        pdaOriginales: ['PDA-F2-LNG-001'],
        varianteTexto: 'Reforzamos PDA-F2-LNG-001 en el cierre.',
      }),
    ).toBeNull();
  });

  it('validarEstructuraF1: violation si introduce PDA nuevo', () => {
    const r = validarEstructuraF1({
      pdaOriginales: ['PDA-F2-LNG-001'],
      varianteTexto: 'Vamos por PDA-F2-LNG-001 y PDA-F2-LNG-999 nuevo',
    });
    expect(r).not.toBeNull();
    expect(r!.code).toBe('NEM_IA_VARIANTE_VIOLA_ESTRUCTURA');
    expect(r!.pdaIntroducidos).toContain('PDA-F2-LNG-999');
  });

  it('validarCampoPulidoF3: OK si no introduce PDA no en catálogo', () => {
    expect(
      validarCampoPulidoF3({
        campo: 'proposito',
        textoPulido: 'Trabajo comunitario con el grupo.',
        catalogoPdas: ['PDA-F2-LNG-001', 'PDA-F2-LNG-002'],
      }),
    ).toBeNull();
  });

  it('validarCampoPulidoF3: violation si PDA no en catálogo', () => {
    const r = validarCampoPulidoF3({
      campo: 'proposito',
      textoPulido: 'Pulido con PDA-F2-XXX-999',
      catalogoPdas: ['PDA-F2-LNG-001'],
    });
    expect(r).not.toBeNull();
    expect(r!.code).toBe('NEM_IA_VARIANTE_VIOLA_ESTRUCTURA');
    expect(r!.pdaIntroducidos).toContain('PDA-F2-XXX-999');
  });

  it('validarCampoPulidoF3: PDA existente en catálogo NO es violación', () => {
    expect(
      validarCampoPulidoF3({
        campo: 'proposito',
        textoPulido: 'PDA-F2-LNG-001 ya lo cubrimos.',
        catalogoPdas: ['PDA-F2-LNG-001'],
      }),
    ).toBeNull();
  });

  // ─── AC-31 (P2-1, criterio operativo PDA-only — §5.1 v1.1) ─────
  // Decisión INTEGRA (Decisión 10 ADR-02, §5.1 v1.1): la validación post-IA
  // de F1 sólo detecta PDA INTRODUCIDOS. No valida campos formativos/ejes
  // (se referencian en prosa sin código estable → fuzzy/NLP propenso a
  // falsos positivos, mismo problema que P2-2). Tampoco detecta eliminación
  // (la variante es texto adaptado, no una reescritura de `bloque.pda_ids`).
  // F1 NO persiste nada → P-PD8 preservado a nivel de DB.
  //
  // Este test DOCUMENTA el criterio (no cambia `validate.ts`).

  it('AC-31: variante que sustituye campos_formativos (en prosa) NO produce 422', () => {
    // El bloque original tenía `campos_formativos: ['LENGUAJES']`; la
    // variante del proveedor menciona "Pensamiento matemático" en lugar
    // de "Lenguajes y comunicación" → el texto NO introduce ningún código
    // PDA nuevo, por lo que el criterio PDA-only la acepta.
    const r = validarEstructuraF1({
      pdaOriginales: ['PDA-F2-LNG-001'],
      varianteTexto:
        'Reforzamos PDA-F2-LNG-001 vinculándolo con Pensamiento matemático y Saberes y pensamiento científico.',
    });
    expect(r).toBeNull();
  });

  it('AC-31: variante que introduce un PDA no en el bloque SÍ produce 422 con pdaIntroducidos', () => {
    const r = validarEstructuraF1({
      pdaOriginales: ['PDA-F2-LNG-001'],
      varianteTexto:
        'Trabajamos PDA-F2-LNG-001 y añadimos PDA-F2-MAT-007 (pensamiento matemático) como nuevo.',
    });
    expect(r).not.toBeNull();
    expect(r!.code).toBe('NEM_IA_VARIANTE_VIOLA_ESTRUCTURA');
    expect(r!.pdaIntroducidos).toContain('PDA-F2-MAT-007');
    expect(r!.pdaIntroducidos).not.toContain('PDA-F2-LNG-001');
  });

  it('AC-31: variante sin PDA introducidos, aunque mencione ejes distintos, NO produce 422', () => {
    // Ejes articuladores se referencian en prosa (no tienen código estable
    // tipo `PDA-F<n>-...`); el criterio operativo v1.1 los ignora.
    const r = validarEstructuraF1({
      pdaOriginales: ['PDA-F2-LNG-001'],
      varianteTexto:
        'Mantenemos PDA-F2-LNG-001 con enfoque de inclusión y vida saludable, no cambiamos estructura.',
    });
    expect(r).toBeNull();
  });
});