/**
 * Card de recurso del aula (T10).
 * E21 §3.3: foto + nombre + cantidad + uso pedagógico.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { emojiCategoria } from '@/services/recursos-aula/sugerir-uso';

interface Recurso {
  id: string;
  nombre: string;
  categoria: string;
  uso: string;
  edad: string | null;
  cantidad: number;
  foto_url: string | null;
  uso_fuente: string;
}

export function RecursoCard({ recurso }: { recurso: Recurso }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
            {recurso.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recurso.foto_url}
                alt={recurso.nombre}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <span>{emojiCategoria(recurso.categoria)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{recurso.nombre}</p>
            <p className="text-xs text-muted-foreground">Para: {recurso.uso}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {recurso.cantidad} ×
              </Badge>
              {recurso.edad && (
                <Badge variant="outline" className="text-[10px]">
                  {recurso.edad} años
                </Badge>
              )}
              {recurso.uso_fuente !== 'maestra' && (
                <Badge variant="amarillo" className="text-[10px]">
                  {recurso.uso_fuente}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
