import { Badge } from '@/components/ui/badge';
import {
  RUTINARIAS_PREESCOLAR,
  RECURRENTES_EJEMPLO,
} from '@/lib/planeaciones/rutinarias-preescolar';

export function RutinariasPanel() {
  return (
    <footer
      className="mt-4 rounded-lg border bg-muted/20 p-4"
      data-testid="rutinarias-panel"
    >
      <p className="text-sm font-medium">Rutinarias y recurrentes</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Como en tu Word: honores, fecha, conteo… Próximamente podrás arrastrarlas a cada día.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {RUTINARIAS_PREESCOLAR.map((r) => (
          <Badge key={r} variant="outline" className="font-normal">
            {r}
          </Badge>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">Recurrentes (ejemplo)</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {RECURRENTES_EJEMPLO.map((r) => (
          <Badge key={r} variant="secondary" className="font-normal">
            {r}
          </Badge>
        ))}
      </div>
    </footer>
  );
}
