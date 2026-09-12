import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import {
  RUTINARIAS_PREESCOLAR,
  RECURRENTES_EJEMPLO,
} from '@/lib/planeaciones/rutinarias-preescolar';

export function RutinariasPanel() {
  return (
    <details
      className="group mt-4 rounded-lg border bg-muted/20"
      data-testid="rutinarias-panel"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-medium">Rutinarias y recurrentes</p>
          <p className="text-[11px] text-muted-foreground">
            Referencia del Word · próximamente arrastrables al calendario
          </p>
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t px-3 pb-3 pt-2">
        <div className="flex flex-wrap gap-2">
          {RUTINARIAS_PREESCOLAR.map((r) => (
            <Badge key={r} variant="outline" className="font-normal">
              {r}
            </Badge>
          ))}
        </div>
        <p className="text-xs font-medium text-muted-foreground">Recurrentes (ejemplo)</p>
        <div className="flex flex-wrap gap-2">
          {RECURRENTES_EJEMPLO.map((r) => (
            <Badge key={r} variant="secondary" className="font-normal">
              {r}
            </Badge>
          ))}
        </div>
      </div>
    </details>
  );
}
