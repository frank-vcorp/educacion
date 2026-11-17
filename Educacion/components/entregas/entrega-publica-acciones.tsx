'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { responderEntregaConToken } from '@/services/director/director-actions';

interface EntregaPublicaAccionesProps {
  entregaId: string;
  token: string;
  estadoInicial: string;
  comentarioInicial?: string | null;
}

export function EntregaPublicaAcciones({
  entregaId,
  token,
  estadoInicial,
  comentarioInicial,
}: EntregaPublicaAccionesProps) {
  const [estado, setEstado] = useState(estadoInicial);
  const [comentario, setComentario] = useState(comentarioInicial ?? '');
  const [abierto, setAbierto] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function enviar(accion: 'vobo' | 'comentar') {
    if (accion === 'comentar' && !comentario.trim()) {
      setFeedback('Escribe tus observaciones antes de enviar.');
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await responderEntregaConToken({
        entregaId,
        token,
        accion,
        comentario: comentario.trim() || undefined,
      });
      if (res.ok && res.estado) {
        setEstado(res.estado);
        setAbierto(false);
        setFeedback(
          accion === 'vobo'
            ? 'Visto Bueno (Vo.Bo.) registrado correctamente.'
            : 'Observaciones enviadas a la educadora.',
        );
      } else {
        setFeedback(res.error ?? 'No se pudo guardar la respuesta.');
      }
    });
  }

  return (
    <Card className="mt-6 border-emerald-200 bg-emerald-50/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-emerald-950">
            Revisión de Dirección Escolar
          </CardTitle>
          <Badge
            variant={
              estado === 'recibida'
                ? 'verde'
                : estado === 'con_comentarios'
                  ? 'amarillo'
                  : 'secondary'
            }
          >
            {estado === 'recibida'
              ? 'Con Vo.Bo.'
              : estado === 'con_comentarios'
                ? 'Con observaciones'
                : 'Pendiente de revisión'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {comentario && !abierto && (
          <div className="rounded-md border bg-background p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Observaciones registradas:
            </p>
            <p className="mt-1 text-foreground">{comentario}</p>
          </div>
        )}

        {abierto ? (
          <div className="space-y-3 rounded-md border bg-background p-3">
            <Label htmlFor="obs-director" className="text-sm font-medium">
              Observaciones o mensaje para la educadora
            </Label>
            <Textarea
              id="obs-director"
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Ej. Excelente vinculación comunitaria. Se sugiere reforzar los materiales del cierre."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => enviar('comentar')}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {isPending ? 'Guardando...' : 'Enviar observaciones'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => enviar('vobo')}
              className="bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {estado === 'recibida' ? 'Vo.Bo. Emitido ✓' : 'Emitir Vo.Bo.'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setAbierto(true)}
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              {comentario ? 'Editar observaciones' : 'Dejar observaciones'}
            </Button>
          </div>
        )}

        {feedback && (
          <p className="text-xs font-medium text-emerald-800" role="status">
            {feedback}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
