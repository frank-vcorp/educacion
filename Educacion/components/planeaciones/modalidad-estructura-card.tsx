import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildModalidadDisplay,
  MODALIDADES_LABELS,
  type Modalidad,
} from '@/lib/planeaciones/modalidad-ui';

export interface ModalidadEstructuraCardProps {
  modalidad: Modalidad;
  modalidadData?: Record<string, unknown>;
}

export function ModalidadEstructuraCard({
  modalidad,
  modalidadData = {},
}: ModalidadEstructuraCardProps) {
  const { secciones, calendario } = buildModalidadDisplay(modalidad, modalidadData);
  const hasContent =
    secciones.some((s) => s.contenido) || calendario.length > 0;

  if (!hasContent && secciones.length === 0) {
    return null;
  }

  return (
    <Card data-testid="modalidad-estructura">
      <CardHeader>
        <CardTitle className="text-base">
          Estructura — {MODALIDADES_LABELS[modalidad]}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Lo que capturaste en el wizard y las fases donde van tus actividades.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {calendario.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Calendario L–V</h3>
            <ul className="space-y-1 text-sm">
              {calendario.map(({ dia, titulo }) => (
                <li key={dia} className="flex gap-2">
                  <span className="w-20 shrink-0 font-medium text-nem-verde">{dia}</span>
                  <span>{titulo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {secciones.length > 0 && (
          <div className="space-y-3">
            {secciones.map((s) => (
              <div
                key={s.key}
                className="rounded-md border bg-muted/20 px-3 py-2"
                data-testid={`modalidad-seccion-${s.key}`}
              >
                <h3 className="text-sm font-medium">{s.label}</h3>
                {s.contenido ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm">{s.contenido}</p>
                ) : (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {s.vacio ?? 'Sin contenido aún.'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
