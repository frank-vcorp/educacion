/**
 * Modal "Recado de Materiales" (D-FIN-Recados).
 * Dos modalidades:
 *   a) "Mismo material para todos": genera texto formal/cálido para copiar a WhatsApp o imprimir tiritas.
 *   b) "Distribuir equitativamente": asigna los materiales colectivos entre la lista de alumnos del grupo,
 *      con tabla de control de entrega (palomitas/checkboxes).
 */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  distribuirMaterialesEquitativamente,
  generarMensajeMismoMaterial,
  generarMensajeMaterialIndividual,
  generarHtmlEtiquetasTermicas,
  type AsignacionMaterial,
  type EtiquetaTermicaItem,
} from '@/lib/planeaciones/recado-materiales';
import {
  Copy,
  Check,
  Share2,
  PackageCheck,
  Users,
  Printer,
  FileText,
  Tag,
} from 'lucide-react';

export interface RecadoMaterialesModalProps {
  planeacionNombre: string;
  materiales: string[];
  alumnos: Array<{ id: string; nombre: string }>;
  docenteNombre?: string;
  triggerButton?: React.ReactNode;
}

export function RecadoMaterialesModal({
  planeacionNombre,
  materiales,
  alumnos,
  docenteNombre,
  triggerButton,
}: RecadoMaterialesModalProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'mismo' | 'distribuido'>('mismo');
  const [fechaEntrega, setFechaEntrega] = useState<string>('');
  const [copiadoGeneral, setCopiadoGeneral] = useState(false);
  const [copiadoAlumnoId, setCopiadoAlumnoId] = useState<string | null>(null);

  // Materiales en lista editable/personalizable
  const [listaMateriales, setListaMateriales] = useState<string[]>(
    materiales.length > 0 ? materiales : ['Plastilina de colores', 'Cartulina blanca', 'Tijeras de punta redonda'],
  );
  const [nuevoMaterial, setNuevoMaterial] = useState('');

  // Asignaciones distribuidas
  const [asignaciones, setAsignaciones] = useState<AsignacionMaterial[]>(() =>
    distribuirMaterialesEquitativamente(listaMateriales, alumnos),
  );

  const recalcularDistribucion = (mats: string[]) => {
    setAsignaciones(distribuirMaterialesEquitativamente(mats, alumnos));
  };

  const handleAgregarMaterial = () => {
    if (!nuevoMaterial.trim()) return;
    const matsActualizados = [...listaMateriales, nuevoMaterial.trim()];
    setListaMateriales(matsActualizados);
    setNuevoMaterial('');
    recalcularDistribucion(matsActualizados);
  };

  const handleEliminarMaterial = (idx: number) => {
    const matsActualizados = listaMateriales.filter((_, i) => i !== idx);
    setListaMateriales(matsActualizados);
    recalcularDistribucion(matsActualizados);
  };

  const toggleEntrega = (alumnoId: string) => {
    setAsignaciones((prev) =>
      prev.map((a) =>
        a.alumnoId === alumnoId ? { ...a, entregado: !a.entregado } : a,
      ),
    );
  };

  const mensajeWhatsApp = generarMensajeMismoMaterial({
    nombrePlaneacion: planeacionNombre,
    materiales: listaMateriales,
    fechaEntrega: fechaEntrega || undefined,
    docenteNombre,
  });

  const handleCopiarGeneral = async () => {
    try {
      await navigator.clipboard.writeText(mensajeWhatsApp);
      setCopiadoGeneral(true);
      setTimeout(() => setCopiadoGeneral(false), 2000);
    } catch (e) {
      console.error('Error al copiar:', e);
    }
  };

  const handleCopiarIndividual = async (asig: AsignacionMaterial) => {
    try {
      const msg = generarMensajeMaterialIndividual({
        alumnoNombre: asig.alumnoNombre,
        material: asig.material,
        nombrePlaneacion: planeacionNombre,
        fechaEntrega: fechaEntrega || undefined,
        docenteNombre,
      });
      await navigator.clipboard.writeText(msg);
      setCopiadoAlumnoId(asig.alumnoId);
      setTimeout(() => setCopiadoAlumnoId(null), 2000);
    } catch (e) {
      console.error('Error al copiar:', e);
    }
  };

  const handleImprimirTiritas = () => {
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) return;

    let contenidoHtml = '';

    if (tab === 'mismo') {
      contenidoHtml = `
        <div class="grid">
          ${alumnos.map((al) => `
            <div class="tirita">
              <h4>Recado de Materiales — Jardín de Niños</h4>
              <p><strong>Alumno(a):</strong> ${al.nombre}</p>
              <p><strong>Situación didáctica:</strong> ${planeacionNombre}</p>
              <p><strong>Material solicitado:</strong></p>
              <ul>
                ${listaMateriales.map((m) => `<li>${m}</li>`).join('')}
              </ul>
              ${fechaEntrega ? `<p><strong>Fecha de entrega:</strong> ${fechaEntrega}</p>` : ''}
              <p class="nota">*Favor de enviar todo rotulado con su nombre. ¡Gracias por su apoyo!*</p>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      contenidoHtml = `
        <div class="grid">
          ${asignaciones.map((asig) => `
            <div class="tirita">
              <h4>Recado de Material Asignado — Jardín de Niños</h4>
              <p><strong>Alumno(a):</strong> ${asig.alumnoNombre}</p>
              <p><strong>Situación:</strong> ${planeacionNombre}</p>
              <p><strong>Material asignado:</strong></p>
              <div class="destacado">★ ${asig.material}</div>
              ${fechaEntrega ? `<p><strong>Fecha de entrega:</strong> ${fechaEntrega}</p>` : ''}
              <p class="nota">*Favor de rotular con su nombre. ¡Muchas gracias!*</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recados de Materiales - ${planeacionNombre}</title>
          <style>
            body { font-family: sans-serif; font-size: 11pt; padding: 10mm; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; }
            .tirita { border: 1.5px dashed #666; padding: 10mm; page-break-inside: avoid; border-radius: 4px; }
            h4 { margin: 0 0 6px; color: #2f6e3a; font-size: 12pt; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            p { margin: 3px 0; }
            ul { margin: 4px 0; padding-left: 18px; }
            .destacado { font-size: 13pt; font-weight: bold; color: #2f6e3a; margin: 8px 0; padding: 4px 8px; background: #f0f7f1; border-radius: 4px; }
            .nota { font-size: 9pt; color: #555; margin-top: 8px; font-style: italic; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${contenidoHtml}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
  };

  const handleImprimirEtiquetasTermicas = () => {
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) return;

    let itemsParaStickers: EtiquetaTermicaItem[] = [];

    if (tab === 'mismo') {
      const materialResumen = listaMateriales.join(', ');
      itemsParaStickers = alumnos.map((al) => ({
        alumnoNombre: al.nombre,
        material: materialResumen || 'Material solicitado en recado',
      }));
    } else {
      itemsParaStickers = asignaciones.map((asig) => ({
        alumnoNombre: asig.alumnoNombre,
        material: asig.material,
      }));
    }

    const htmlTermico = generarHtmlEtiquetasTermicas({
      etiquetas: itemsParaStickers,
      tamano: '50x30',
      fechaEntrega: fechaEntrega || undefined,
      mensajeCortesia: fechaEntrega
        ? `Para el ${fechaEntrega} - Jardín de Niños`
        : 'Jardín de Niños - Preescolar',
    });

    ventanaImpresion.document.write(htmlTermico);
    ventanaImpresion.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" className="flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-nem-verde" />
            <span>Recado de Materiales</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-nem-verde flex items-center gap-2">
            <PackageCheck className="w-6 h-6" />
            Recado de Materiales para Familias
          </DialogTitle>
          <DialogDescription>
            Genera recados cálidos para WhatsApp, tiritas impresas o etiquetas adhesivas térmicas (tipo Niimbot) para la playera del alumno.
          </DialogDescription>
        </DialogHeader>

        {/* Parámetros Generales */}
        <div className="bg-gray-50 p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Fecha de entrega solicitada:
            </label>
            <Input
              type="text"
              placeholder="Ej. Viernes 20 de Octubre"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="h-8 text-xs bg-white max-w-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImprimirTiritas}
              className="flex items-center gap-1.5 text-xs h-8"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Tiritas</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleImprimirEtiquetasTermicas}
              className="flex items-center gap-1.5 text-xs h-8 bg-nem-verde hover:bg-nem-verde/90 text-white font-medium shadow-sm"
              title="Formato continuo 50x30mm / 40x30mm para stickers autoadheribles"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Imprimir Etiquetas (Niimbot / Térmica)</span>
            </Button>
          </div>
        </div>

        {/* Gestión de Lista de Materiales */}
        <div className="border rounded-md p-3">
          <label className="text-xs font-semibold text-gray-700 block mb-2">
            Materiales de la situación didáctica:
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {listaMateriales.map((mat, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-green-50 text-green-800 text-xs px-2.5 py-1 rounded-full border border-green-200"
              >
                {mat}
                <button
                  type="button"
                  onClick={() => handleEliminarMaterial(i)}
                  className="hover:text-red-700 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Agregar otro material..."
              value={nuevoMaterial}
              onChange={(e) => setNuevoMaterial(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAgregarMaterial();
                }
              }}
              className="h-8 text-xs bg-white"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleAgregarMaterial}
              className="h-8 text-xs"
            >
              + Agregar
            </Button>
          </div>
        </div>

        {/* Modalidades */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mismo" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Mismo material para todos</span>
            </TabsTrigger>
            <TabsTrigger value="distribuido" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Distribuir equitativamente</span>
            </TabsTrigger>
          </TabsList>

          {/* Modalidad A: Mismo material para todos */}
          <TabsContent value="mismo" className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Texto listo para grupo de WhatsApp:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopiarGeneral}
                  className="h-7 text-xs flex items-center gap-1 text-nem-verde border-nem-verde/40"
                >
                  {copiadoGeneral ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar al Portapapeles</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-3 bg-gray-50 border rounded-md font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                {mensajeWhatsApp}
              </div>
            </div>
          </TabsContent>

          {/* Modalidad B: Distribuir equitativamente */}
          <TabsContent value="distribuido" className="space-y-4 pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Se asignaron los {listaMateriales.length} materiales entre los {alumnos.length} alumnos del grupo.
              </span>
              <span>
                Entregados: {asignaciones.filter((a) => a.entregado).length} de {asignaciones.length}
              </span>
            </div>

            <div className="border rounded-md overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-700 uppercase font-semibold">
                  <tr>
                    <th className="p-2 w-10 text-center">Entregó</th>
                    <th className="p-2">Alumno</th>
                    <th className="p-2">Material asignado</th>
                    <th className="p-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {asignaciones.map((asig) => (
                    <tr
                      key={asig.alumnoId}
                      className={`hover:bg-gray-50 transition-colors ${
                        asig.entregado ? 'bg-green-50/40 text-gray-600' : ''
                      }`}
                    >
                      <td className="p-2 text-center">
                        <Checkbox
                          checked={!!asig.entregado}
                          onCheckedChange={() => toggleEntrega(asig.alumnoId)}
                          aria-label={`Entregado por ${asig.alumnoNombre}`}
                        />
                      </td>
                      <td className="p-2 font-medium text-gray-900">
                        {asig.alumnoNombre}
                      </td>
                      <td className="p-2">
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                          {asig.material}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopiarIndividual(asig)}
                          className="h-6 px-2 text-xs text-nem-verde hover:text-nem-verde/80"
                        >
                          {copiadoAlumnoId === asig.alumnoId ? (
                            <span className="flex items-center gap-1 text-green-700">
                              <Check className="w-3 h-3" /> Copiado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Copy className="w-3 h-3" /> WhatsApp
                            </span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
