import { describe, it, expect } from 'vitest';
import {
  CATALOGO_DINAMICAS_PASE_LISTA,
  obtenerSugerenciaDinamica,
  inicializarAsistencia,
  calcularResumenAsistencia,
  generarTextoBitacoraAsistencia,
  type RegistroAsistenciaAlumno,
} from '@/lib/asistencia/pase-lista-ludico';

describe('lib/asistencia/pase-lista-ludico', () => {
  const alumnos = [
    { id: 'al-1', nombre: 'Sofía Morales' },
    { id: 'al-2', nombre: 'Mateo Hernández' },
    { id: 'al-3', nombre: 'Valentina Díaz' },
    { id: 'al-4', nombre: 'Santiago Cruz' },
  ];

  describe('CATALOGO_DINAMICAS_PASE_LISTA', () => {
    it('incluye dinámicas para todos los campos formativos de preescolar', () => {
      const campos = new Set(CATALOGO_DINAMICAS_PASE_LISTA.map((d) => d.campo));
      expect(campos.has('lenguajes')).toBe(true);
      expect(campos.has('saberes_pensamiento_cientifico')).toBe(true);
      expect(campos.has('etica_naturaleza_sociedades')).toBe(true);
      expect(campos.has('de_lo_humano_comunitario')).toBe(true);
    });

    it('todas las dinámicas contienen título, consigna y ejemplo formativo', () => {
      for (const d of CATALOGO_DINAMICAS_PASE_LISTA) {
        expect(d.titulo.length).toBeGreaterThan(3);
        expect(d.consigna.length).toBeGreaterThan(10);
        expect(d.ejemplo.length).toBeGreaterThan(5);
        expect(d.icono).toBeDefined();
      }
    });
  });

  describe('obtenerSugerenciaDinamica', () => {
    it('filtra por campo formativo especificado', () => {
      const sugerencia = obtenerSugerenciaDinamica('lenguajes');
      expect(sugerencia.campo).toBe('lenguajes');
    });

    it('permite rotación cíclica con indiceActual', () => {
      const dinamica1 = obtenerSugerenciaDinamica('lenguajes', 0);
      const dinamica2 = obtenerSugerenciaDinamica('lenguajes', 1);
      expect(dinamica1).toBeDefined();
      expect(dinamica2).toBeDefined();
      expect(dinamica1.id).not.toBe(dinamica2.id);
    });
  });

  describe('inicializarAsistencia', () => {
    it('inicializa todos los alumnos en presente por defecto', () => {
      const registros = inicializarAsistencia(alumnos);
      expect(registros).toHaveLength(4);
      expect(registros.every((r) => r.estado === 'presente')).toBe(true);
      expect(registros[0]?.alumnoNombre).toBe('Sofía Morales');
    });

    it('maneja listas vacías limpiamente', () => {
      expect(inicializarAsistencia([])).toEqual([]);
    });
  });

  describe('calcularResumenAsistencia', () => {
    it('calcula correctamente presentes, ausentes, retardos y porcentaje', () => {
      const registros: RegistroAsistenciaAlumno[] = [
        { alumnoId: 'al-1', alumnoNombre: 'Sofía', estado: 'presente' },
        { alumnoId: 'al-2', alumnoNombre: 'Mateo', estado: 'presente' },
        { alumnoId: 'al-3', alumnoNombre: 'Valentina', estado: 'ausente' },
        { alumnoId: 'al-4', alumnoNombre: 'Santiago', estado: 'retardo' },
      ];

      const resumen = calcularResumenAsistencia(registros);
      expect(resumen.total).toBe(4);
      expect(resumen.presentes).toBe(2);
      expect(resumen.ausentes).toBe(1);
      expect(resumen.retardos).toBe(1);
      // (2 + 1) / 4 = 75%
      expect(resumen.porcentajeAsistencia).toBe(75);
    });

    it('devuelve ceros cuando el array está vacío', () => {
      const resumen = calcularResumenAsistencia([]);
      expect(resumen.total).toBe(0);
      expect(resumen.porcentajeAsistencia).toBe(0);
    });
  });

  describe('generarTextoBitacoraAsistencia', () => {
    it('genera texto descriptivo para incluir en la bitácora docente', () => {
      const dinamica = CATALOGO_DINAMICAS_PASE_LISTA[0]!;
      const resumen = {
        total: 10,
        presentes: 8,
        ausentes: 2,
        retardos: 0,
        porcentajeAsistencia: 80,
      };

      const texto = generarTextoBitacoraAsistencia({
        fecha: '2026-10-25',
        dinamica,
        resumen,
        ausentesNombres: ['Juanito', 'Pedrito'],
      });

      expect(texto).toContain('Pase de Lista — 2026-10-25');
      expect(texto).toContain(dinamica.titulo);
      expect(texto).toContain('8 presentes / 2 ausentes / 0 retardos (80%)');
      expect(texto).toContain('Juanito, Pedrito');
    });
  });
});
