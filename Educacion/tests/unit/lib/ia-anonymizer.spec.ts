import { describe, it, expect } from 'vitest';
import {
  anonymizeText,
  anonymizeRequest,
  detectIrredactablePII,
  findIrredactableField,
  _INTERNAL_PATTERNS,
} from '@/lib/ia/anonymizer';

describe('lib/ia/anonymizer — PII filter (P-PD8, P-PD9, D-FIN-13, AC-22)', () => {
  it('anonimiza nombres propios (2+ palabras capitalizadas)', () => {
    const r = anonymizeText('La alumna María López García necesita apoyo');
    expect(r).toContain('[NOMBRE]');
    expect(r).not.toContain('María López García');
  });

  it('NO anonimiza tokens seguros del dominio NEM', () => {
    expect(anonymizeText('México NEM SEP')).toBe('México NEM SEP');
    expect(anonymizeText('El proyecto NEM avanza')).toContain('NEM');
  });

  it('anonimiza celulares (10-15 dígitos)', () => {
    const r = anonymizeText('Llamar al 5215555555555 por favor');
    expect(r).toContain('[CELULAR]');
    expect(r).not.toContain('5215555555555');
  });

  it('anonimiza correos electrónicos', () => {
    const r = anonymizeText('Escribir a maria.lopez@escuela.edu.mx');
    expect(r).toContain('[EMAIL]');
    expect(r).not.toContain('maria.lopez@escuela.edu.mx');
  });

  it('anonimiza CCT con formato estándar 5+2+3', () => {
    const r = anonymizeText('CCT 09DPR1234Z');
    expect(r).toContain('[CCT]');
  });

  it('anonimiza CURP', () => {
    const r = anonymizeText('CURP LOMG850623HDFRPR09');
    expect(r).toContain('[CURP]');
  });

  it('preserva palabras con 1 sola mayúscula (verbos en inicio de oración)', () => {
    const r = anonymizeText('Aprender es divertido');
    expect(r).toBe('Aprender es divertido');
  });

  it('maneja entrada vacía', () => {
    expect(anonymizeText('')).toBe('');
  });

  it('anonymizeRequest anonimiza prompt y contexto por separado', () => {
    const r = anonymizeRequest({
      prompt: 'Sugerir variante para María López',
      context: 'CCT 09DPR1234Z',
      observaciones: '',
    });
    expect(r.prompt).toContain('[NOMBRE]');
    expect(r.context).toContain('[CCT]');
  });

  it('los patrones internos son regex válidos', () => {
    expect(_INTERNAL_PATTERNS.NOMBRE_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.CELULAR_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.EMAIL_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.CCT_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.CURP_PATTERN).toBeInstanceOf(RegExp);
    expect(_INTERNAL_PATTERNS.IRREDACTABLE_PATTERN).toBeInstanceOf(RegExp);
  });

  // ─── IMPL-20260819-04: shape ampliado F1/F2/F3 ───

  it('anonymizeRequest anonimiza texto_base (F2) y contenido_textual (F1)', () => {
    const r = anonymizeRequest({
      texto_base: 'La alumna María López explora.',
      contenido_textual: 'Texto con CCT 09DPR1234Z y CURP LOMG850623HDFRPR09',
      variante_tipo: 'rural',
    });
    expect(r.texto_base).toContain('[NOMBRE]');
    expect(r.contenido_textual).toContain('[CCT]');
    expect(r.contenido_textual).toContain('[CURP]');
    expect(r.variante_tipo).toBe('rural'); // enum seguro, no se toca
  });

  it('anonymizeRequest anonimiza extras (F3 campos_a_pulir)', () => {
    const r = anonymizeRequest({
      extras: {
        problema_contexto: 'Contexto de María López',
        proposito: 'Propósito general',
      },
    });
    expect(r.extras?.problema_contexto).toContain('[NOMBRE]');
    expect(r.extras?.proposito).toBe('Propósito general');
  });

  it('AC-22 regla dura: texto_base con María + CURP + celular → anonimiza todos', () => {
    const r = anonymizeRequest({
      texto_base:
        'La alumna María López García, CURP LOMG850623HDFRPR09, celular 5512345678',
    });
    expect(r.texto_base).toContain('[NOMBRE]');
    expect(r.texto_base).toContain('[CURP]');
    expect(r.texto_base).toContain('[CELULAR]');
    expect(r.texto_base).not.toContain('María López');
    expect(r.texto_base).not.toContain('LOMG850623');
    expect(r.texto_base).not.toContain('5512345678');
  });

  // ─── IMPL-20260819-04: irredactable detection (NEM_IA_ANONYMIZER_BLOCKED) ───

  it('detectIrredactablePII: false para texto normal', () => {
    expect(detectIrredactablePII('Hola mundo')).toBe(false);
  });

  it('detectIrredactablePII: false para SAFE_TOKENS mayúsculas', () => {
    expect(detectIrredactablePII('MÉXICO NEM SEP')).toBe(false);
  });

  it('detectIrredactablePII: true para nombre TODO MAYÚSCULAS sin acentos', () => {
    expect(detectIrredactablePII('MARIA LOPEZ GARCIA')).toBe(true);
  });

  it('findIrredactableField: detecta en texto_base', () => {
    const r = findIrredactableField({ texto_base: 'MARIA LOPEZ GARCIA vino' });
    expect(r).toBe('texto_base');
  });

  it('findIrredactableField: null cuando no hay PII irredactable', () => {
    const r = findIrredactableField({ texto_base: 'Texto normal sin nombres' });
    expect(r).toBeNull();
  });

  // ─── Fixture P2-2 (R-IA-10 / ADR-02 §17) ───────────────────────
  //
  // Restricción aceptada para prueba real (INTEGRA Decisión, no fix):
  // `IRREDACTABLE_PATTERN` (2–4 palabras ALL-CAPS ≥3 chars, no en
  // `SAFE_TOKENS`) produce 500 `NEM_IA_ANONYMIZER_BLOCKED` sobre texto
  // docente legítimo en mayúsculas sostenidas. La prosa legítima en
  // mayúsculas es léxicamente indistinguible de nombres en mayúsculas
  // tipo "MARIA LOPEZ GARCIA"; `NOMBRE_PATTERN` no captura nombres
  // todo-mayúsculas. Aflojar `IRREDACTABLE_PATTERN` filtraría PII → no
  // existe fix L1 inequívoco.
  //
  // Este test REGISTRA el falso positivo conocido como restricción
  // documentada (fail-closed preservado, sin fuga). NO modifica
  // `lib/ia/anonymizer.ts`. Mitigación operativa: reformular el input
  // en minúsculas o editar la planeación directamente.

  it('Fixture P2-2: detectIrredactablePII true para prosa legítima en mayúsculas (EL NIÑO EXPLORARÁ LAS SEMILLAS)', () => {
    // Texto docente legítimo que NO contiene PII pero dispara el catch
    // fail-closed de `IRREDACTABLE_PATTERN`. El route handler emitirá
    // 500 `NEM_IA_ANONYMIZER_BLOCKED` y NO llamará al proveedor.
    expect(detectIrredactablePII('EL NIÑO EXPLORARÁ LAS SEMILLAS')).toBe(true);
  });

  it('Fixture P2-2: findIrredactableField detecta la prosa legítima y el campo ofensor', () => {
    // Verifica que el route identifica el campo concreto del payload
    // donde aparece la prosa mayúscula, para orientar el mensaje de error.
    const r = findIrredactableField({ texto_base: 'EL NIÑO EXPLORARÁ LAS SEMILLAS' });
    expect(r).toBe('texto_base');
  });

  it('Fixture P2-2: restricción preservada — SAFE_TOKENS siguen siendo excepción', () => {
    // `MÉXICO NEM SEP` son tokens explícitamente seguros del dominio
    // pedagógico NEM (no son nombres propios); deben seguir pasando.
    expect(detectIrredactablePII('MÉXICO NEM SEP')).toBe(false);
  });
});