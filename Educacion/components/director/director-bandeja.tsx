'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  Download,
  Eye,
  Send,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { type EntregaCCTItem, emitirVoBoDirector } from '@/services/director/director-actions';

interface DirectorBandejaProps {
  entregas: EntregaCCTItem[];
}

export function DirectorBandeja({ entregas: initialEntregas }: DirectorBandejaProps) {
  const [entregas, setEntregas] = useState<EntregaCCTItem[]>(initialEntregas);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaCCTItem | null>(null);
  const [modalAction, setModalAction] = useState<'vobo' | 'comentar' | null>(null);
  const [comentario, setComentario] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleOpenAction = (item: EntregaCCTItem, action: 'vobo' | 'comentar') => {
    setSelectedEntrega(item);
    setModalAction(action);
    setComentario(item.comentarioDirector ?? '');
  };

  const handleCloseModal = () => {
    setSelectedEntrega(null);
    setModalAction(null);
    setComentario('');
  };

  const handleConfirmAction = () => {
    if (!selectedEntrega || !modalAction) return;

    startTransition(async () => {
      const res = await emitirVoBoDirector({
        entregaId: selectedEntrega.id,
        accion: modalAction,
        comentario: comentario.trim() || undefined,
      });

      if (res.ok) {
        setEntregas((prev) =>
          prev.map((item) =>
            item.id === selectedEntrega.id
              ? {
                  ...item,
                  estado: res.estado as EntregaCCTItem['estado'],
                  comentarioDirector: comentario.trim() || item.comentarioDirector,
                  fechaRecibida:
                    modalAction === 'vobo' ? new Date().toISOString() : item.fechaRecibida,
                }
              : item,
          ),
        );
        handleCloseModal();
      }
    });
  };

  const getStatusBadge = (estado: EntregaCCTItem['estado']) => {
    switch (estado) {
      case 'recibida':
        return (
          <Badge variant="verde" className="gap-1 font-medium bg-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Con Vo.Bo.
          </Badge>
        );
      case 'con_comentarios':
        return (
          <Badge variant="amarillo" className="gap-1 font-medium bg-amber-400 text-amber-950">
            <MessageSquare className="h-3 w-3" /> Con Observaciones
          </Badge>
        );
      case 'entregada':
      default:
        return (
          <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 bg-amber-50/50 font-medium">
            <Clock className="h-3 w-3 text-amber-600" /> Pendiente Revisión
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {entregas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              Bandeja al día
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Aún no hay planeaciones entregadas por las docentes de este CCT en el ciclo actual.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[140px]">Grado / Grupo</TableHead>
                <TableHead>Docente</TableHead>
                <TableHead className="min-w-[200px]">Proyecto / Planeación</TableHead>
                <TableHead className="w-[130px]">Fecha Entrega</TableHead>
                <TableHead className="w-[160px]">Estado</TableHead>
                <TableHead className="text-right">Acciones de Dirección</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-foreground">
                      {item.grado} {item.grupo}
                    </div>
                    <span className="text-xs text-muted-foreground">Preescolar</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.docenteNombre}</div>
                    <div className="text-xs text-muted-foreground">{item.docenteEmail}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground leading-snug">
                      {item.planeacionNombre}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">v{item.version}</span>
                      {item.comentarioDirector && (
                        <span className="text-[11px] text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                          Obs: {item.comentarioDirector}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.fechaCreacion ? (
                      new Date(item.fechaCreacion).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Enlace para revisar planeación completa */}
                      <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs" title="Ver planeación">
                        <Link href={`/v/${item.id}?t=${item.urlFirmadaToken}`} target="_blank" rel="noopener">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                          <span className="hidden sm:inline">Ver</span>
                        </Link>
                      </Button>

                      {/* Descargar PDF */}
                      <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs" title="Descargar PDF oficial">
                        <a href={item.docPdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5 text-emerald-700" />
                        </a>
                      </Button>

                      {/* Dejar comentario / retroalimentación */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenAction(item, 'comentar')}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Retroalimentación"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>

                      {/* Botón Vo.Bo. 1 clic */}
                      <Button
                        size="sm"
                        variant={item.estado === 'recibida' ? 'secondary' : 'default'}
                        onClick={() => handleOpenAction(item, 'vobo')}
                        className={`h-8 text-xs font-medium gap-1 ${
                          item.estado === 'recibida'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{item.estado === 'recibida' ? 'Vo.Bo. ✓' : 'Emitir Vo.Bo.'}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal para emitir Vo.Bo. o Retroalimentación */}
      <Dialog open={!!modalAction} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {modalAction === 'vobo' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Emitir Visto Bueno Digital (Vo.Bo.)
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 text-amber-600" />
                  Observaciones y Retroalimentación
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {modalAction === 'vobo'
                ? `Estás por validar formalmente la planeación de ${selectedEntrega?.docenteNombre} (${selectedEntrega?.grado} ${selectedEntrega?.grupo}).`
                : `Envía comentarios pedagógicos a ${selectedEntrega?.docenteNombre} para fortalecer su proyecto.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <div className="font-semibold text-foreground">
                Proyecto: {selectedEntrega?.planeacionNombre}
              </div>
              <div className="text-muted-foreground">
                Docente: {selectedEntrega?.docenteNombre} · Grado: {selectedEntrega?.grado} {selectedEntrega?.grupo}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dir-comentario" className="text-sm">
                {modalAction === 'vobo'
                  ? 'Mensaje o recomendación de dirección (opcional):'
                  : 'Observaciones para la maestra:'}
              </Label>
              <Textarea
                id="dir-comentario"
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder={
                  modalAction === 'vobo'
                    ? 'Excelente vinculación comunitaria. Autorizada para implementarse en el aula.'
                    : 'Recomiendo fortalecer las actividades de cierre con el libro de texto CONALITEG.'
                }
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleCloseModal} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isPending}
              className={
                modalAction === 'vobo'
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5'
                  : 'bg-amber-600 hover:bg-amber-700 text-white gap-1.5'
              }
            >
              {isPending ? (
                'Guardando...'
              ) : modalAction === 'vobo' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Vo.Bo.
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Guardar Observaciones
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
