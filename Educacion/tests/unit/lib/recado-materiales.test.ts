import { describe, it, expect } from 'vitest';
import {
  distribuirMaterialesEquitativamente,
  generarMensajeMismoMaterial,
  generarMensajeMaterialIndividual,
  generarHtmlEtiquetasTermicas,
} from '@/lib/planeaciones/recado-materiales';

describe('lib/planeaciones/recado-materiales', () => {
  const alumnos = [
    { id: 'al-1', nombre: 'Sofía Morales' },
    { id: 'al-2', nombre: 'Mateo Hernández' },
    { id: 'al-3', nombre: 'Valentina Díaz' },
    { id: 'al-4', nombre: 'Santiago Cruz' },
    { id: 'al-5', nombre: 'Camila Reyes' },
  ];

  describe('distribuirMaterialesEquitativamente', () => {
    it('devuelve array vacío si no hay alumnos o no hay materiales', () => {
      expect(distribuirMaterialesEquitativamente([], alumnos)).toEqual([]);
      expect(distribuirMaterialesEquitativamente(['Cartulina'], [])).toEqual([]);
    });

    it('distribuye de forma equitativa (round-robin) los materiales entre los alumnos', () => {
      const materiales = ['Plastilina', 'Cartulina blanca', 'Tijeras'];
      const resultado = distribuirMaterialesEquitativamente(materiales, alumnos);

      expect(resultado).toHaveLength(5);
      expect(resultado[0]).toEqual({
        alumnoId: 'al-1',
        alumnoNombre: 'Sofía Morales',
        material: 'Plastilina',
        entregado: false,
      });
      expect(resultado[1]).toEqual({
        alumnoId: 'al-2',
        alumnoNombre: 'Mateo Hernández',
        material: 'Cartulina blanca',
        entregado: false,
      });
      expect(resultado[2]).toEqual({
        alumnoId: 'al-3',
        alumnoNombre: 'Valentina Díaz',
        material: 'Tijeras',
        entregado: false,
      });
      // Vuelve a empezar el ciclo round-robin
      expect(resultado[3]).toEqual({
        alumnoId: 'al-4',
        alumnoNombre: 'Santiago Cruz',
        material: 'Plastilina',
        entregado: false,
      });
      expect(resultado[4]).toEqual({
        alumnoId: 'al-5',
        alumnoNombre: 'Camila Reyes',
        material: 'Cartulina blanca',
        entregado: false,
      });
    });

    it('soporta objetos de material además de strings', () => {
      const materiales = [
        { nombre: 'Pintura dactilar roja', categoria: 'arte' },
        { nombre: 'Pincel grueso', categoria: 'arte' },
      ];
      const resultado = distribuirMaterialesEquitativamente(materiales, alumnos.slice(0, 3));
      expect(resultado[0]!.material).toBe('Pintura dactilar roja');
      expect(resultado[1]!.material).toBe('Pincel grueso');
      expect(resultado[2]!.material).toBe('Pintura dactilar roja');
    });
  });

  describe('generarMensajeMismoMaterial', () => {
    it('genera texto formal y cálido para WhatsApp con la lista de materiales', () => {
      const msg = generarMensajeMismoMaterial({
        nombrePlaneacion: 'Los bichos de mi jardín',
        materiales: ['1 lupa pequeña', 'Frasco de plástico transparente'],
        fechaEntrega: 'Lunes 18 de Noviembre',
        docenteNombre: 'Mtra. Lolita',
      });

      expect(msg).toContain('Estimadas familias del grupo:');
      expect(msg).toContain('"Los bichos de mi jardín"');
      expect(msg).toContain('• 1 lupa pequeña');
      expect(msg).toContain('• Frasco de plástico transparente');
      expect(msg).toContain('*Lunes 18 de Noviembre*');
      expect(msg).toContain('*Mtra. Lolita*');
      expect(msg).toContain('debidamente identificado con el nombre');
    });

    it('genera texto amigable si no se especifica fecha ni nombre de docente', () => {
      const msg = generarMensajeMismoMaterial({
        materiales: ['Caja de zapatos'],
      });
      expect(msg).toContain('• Caja de zapatos');
      expect(msg).toContain('*Docente de Grupo*');
    });
  });

  describe('generarMensajeMaterialIndividual', () => {
    it('genera mensaje individual con el material específico asignado al alumno', () => {
      const msg = generarMensajeMaterialIndividual({
        alumnoNombre: 'Santiago Cruz',
        material: '2 barras de plastilina azul',
        nombrePlaneacion: 'Modelando animales',
        fechaEntrega: 'Martes 19 de Noviembre',
        docenteNombre: 'Mtra. Lolita',
      });

      expect(msg).toContain('Estimada familia de *Santiago Cruz*:');
      expect(msg).toContain('("Modelando animales")');
      expect(msg).toContain('• *2 barras de plastilina azul*');
      expect(msg).toContain('*Martes 19 de Noviembre*');
      expect(msg).toContain('*Mtra. Lolita*');
    });
  });

  describe('generarHtmlEtiquetasTermicas', () => {
    it('genera un documento HTML estructurado con estilos @media print y tamaño térmico (50x30mm)', () => {
      const html = generarHtmlEtiquetasTermicas({
        etiquetas: [
          { alumnoNombre: 'Mateo García', material: '1 vasito de plástico' },
          { alumnoNombre: 'Sofía Morales', material: 'Cartulina blanca' },
        ],
        tamano: '50x30',
        mensajeCortesia: 'Para el martes - Jardín Celestino Freinet',
      });

      expect(html).toContain('size: 50mm 30mm');
      expect(html).toContain('page-break-after: always');
      expect(html).toContain('break-after: page');
      expect(html).toContain('Mateo García');
      expect(html).toContain('1 vasito de plástico');
      expect(html).toContain('Sofía Morales');
      expect(html).toContain('Cartulina blanca');
      expect(html).toContain('Para el martes - Jardín Celestino Freinet');
      expect(html).toContain('window.print()');
    });

    it('soporta tamaño alternativo 40x30mm y escapa caracteres especiales de HTML', () => {
      const html = generarHtmlEtiquetasTermicas({
        etiquetas: [
          { alumnoNombre: '<Elena & Tomás>', material: '1 tijera de "punta roma"' },
        ],
        tamano: '40x30',
        fechaEntrega: '25/Nov',
      });

      expect(html).toContain('size: 40mm 30mm');
      expect(html).toContain('&lt;Elena &amp; Tomás&gt;');
      expect(html).toContain('1 tijera de &quot;punta roma&quot;');
      expect(html).toContain('Para: 25/Nov');
    });
  });
});
