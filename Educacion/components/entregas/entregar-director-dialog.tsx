/**
 * Modal: entregar planeación al director (T14 + D-FIN-19).
 * SPEC_TEC_04 §3.
 */
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Copy, ExternalLink } from 'lucide-react';
import { entregarDirector } from '@/services/entregas/entrega-actions';

interface Props {
  planeacionId: string;
  docenteId: string;
  cct: string;
}

export function EntregarDirectorDialog({ planeacionId, docenteId, cct }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [celular, setCelular] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    urlFirmada: string;
    urlWhatsapp?: string;
  } | null>(null);

  function submit() {
    setError(null);
    if (celular && !/^\d{10,15}$/.test(celular)) {
      setError('Celular a 10-15 dígitos (solo números)');
      return;
    }
    startTransition(async () => {
      const res = await entregarDirector({
        planeacionId,
        docenteId,
        cct,
        directorCelular: celular || undefined,
        mensajePersonalizado: mensaje || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? 'Error');
        return;
      }
      setResultado({
        urlFirmada: res.urlFirmada!,
        urlWhatsapp: res.urlWhatsapp,
      });
    });
  }

  function copiar() {
    if (resultado?.urlFirmada) {
      void navigator.clipboard.writeText(resultado.urlFirmada);
    }
  }

  function abrirWhatsapp() {
    if (resultado?.urlWhatsapp) {
      window.open(resultado.urlWhatsapp, '_blank', 'noopener');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="mr-1 h-4 w-4" /> Entregar al director
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entregar planeación al director</DialogTitle>
          <DialogDescription>
            Generaremos una URL firmada (30 días) y un mensaje de WhatsApp pre-armado.
          </DialogDescription>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="dir-cel">Celular del director (opcional, 10-15 dígitos)</Label>
              <Input
                id="dir-cel"
                inputMode="numeric"
                placeholder="5215555555555"
                value={celular}
                onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <Label htmlFor="dir-msg">
                Mensaje personalizado (opcional)
              </Label>
              <Textarea
                id="dir-msg"
                rows={2}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Hola, te comparto mi planeación…"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? 'Generando…' : 'Generar entrega'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-nem-verde/40 bg-nem-verde/5 p-3">
              <p className="text-xs font-medium text-nem-verde">Entrega generada ✓</p>
              <p className="mt-1 break-all text-xs">{resultado.urlFirmada}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copiar}>
                <Copy className="mr-1 h-4 w-4" /> Copiar enlace
              </Button>
              {resultado.urlWhatsapp && (
                <Button size="sm" onClick={abrirWhatsapp}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Abrir WhatsApp
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
