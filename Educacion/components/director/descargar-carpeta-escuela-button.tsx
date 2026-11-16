'use client';

import { useState } from 'react';
import {
  FileCheck2,
  FolderDown,
  Printer,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type EntregaCCTItem } from '@/services/director/director-actions';

interface DescargarCarpetaEscuelaButtonProps {
  cct: string;
  escuelaNombre: string;
  entregas: EntregaCCTItem[];
}

export function DescargarCarpetaEscuelaButton({
  cct,
  escuelaNombre,
  entregas,
}: DescargarCarpetaEscuelaButtonProps) {
  const [open, setOpen] = useState(false);
  const totalEntregadas = entregas.length;
  const validadas = entregas.filter((e) => e.estado === 'recibida').length;

  const handleImprimir = () => {
    // Abrir ventana de impresión institucional
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium shadow-sm gap-2">
          <FolderDown className="h-4 w-4" />
          <span>Descargar Carpeta de la Escuela en PDF</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <FileCheck2 className="h-5 w-5 text-emerald-700" />
            Carpeta Institucional de Supervisión NEM
          </DialogTitle>
          <DialogDescription>
            Expediente concentrado para la visita de Supervisión Escolar de Zona.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground border-b pb-2">
              <span>CCT: <strong className="text-foreground">{cct}</strong></span>
              <Badge variant="verde">Ciclo 2025-2026</Badge>
            </div>
            <div className="font-semibold text-foreground text-base">
              {escuelaNombre}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="bg-white/80 p-2 rounded border">
                <span className="text-muted-foreground block">Planeaciones incluidas:</span>
                <span className="text-base font-bold text-emerald-800">{totalEntregadas}</span>
              </div>
              <div className="bg-white/80 p-2 rounded border">
                <span className="text-muted-foreground block">Con Vo.Bo. oficial:</span>
                <span className="text-base font-bold text-emerald-800">{validadas}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Carátula Institucional Oficial:</strong> Datos del plantel, zona escolar y firma digital de la Dirección.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Matriz de Avance por Grupo:</strong> Registro ordenado de 1°, 2° y 3° con sus docentes titulares.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Acuerdo 14/08/22 y 06/08/23:</strong> Alineación curricular y vinculación comunitaria acreditada.
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-200/60 text-xs text-emerald-950 flex items-start gap-2">
            <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              Al descargar o imprimir, se compila el índice del colectivo con accesos directos a los expedientes completos y hojas de seguimiento para la supervisora.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          <Button onClick={handleImprimir} className="bg-emerald-800 hover:bg-emerald-900 text-white gap-2">
            <Printer className="h-4 w-4" />
            Generar e Imprimir Carpeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
