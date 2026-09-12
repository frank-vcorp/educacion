import { Badge } from '@/components/ui/badge';
import type { WorkbookContexto } from '@/lib/planeaciones/workbook-layout';
import { getSeccionesGuia, type Modalidad } from '@/lib/planeaciones/modalidad-ui';

function modalidadDesdePlantilla(
  plantilla: WorkbookContexto['workbook'] extends infer W
    ? W extends { plantilla: infer P }
      ? P
      : never
    : never,
): Modalidad {
  if (plantilla === 'proyecto_comunitario') return 'proyecto_comunitario';
  return 'centros_interes';
}

function tituloMomentos(plantilla: string | undefined): string {
  if (plantilla === 'proyecto_comunitario') return 'Fases del proyecto';
  return 'Momentos del centro';
}

export function WorkbookHoja({ ctx }: { ctx: WorkbookContexto }) {
  const plantilla = ctx.workbook?.plantilla ?? 'centro_interes';
  const modalidad = modalidadDesdePlantilla(plantilla);
  const momentos = getSeccionesGuia(modalidad);
  const campoPorCodigo = new Map(ctx.campos.map((c) => [c.codigo, c]));

  return (
    <div
      className="rounded-lg border-2 border-nem-verde/30 bg-card p-4 shadow-sm"
      data-testid="workbook-hoja"
    >
      <div className="border-b border-dashed pb-3 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Planeación preescolar · Fase 2
          {plantilla === 'centro_interes' && ' · Centro de interés'}
          {plantilla === 'proyecto_comunitario' && ' · Proyecto comunitario'}
        </p>
        {ctx.cct && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">CCT {ctx.cct}</p>
        )}
        {ctx.etiquetaGrupo && (
          <p className="text-sm text-muted-foreground">Grupo {ctx.etiquetaGrupo}</p>
        )}
        <h2 className="mt-2 text-lg font-semibold text-nem-verde">{ctx.nombre}</h2>
        <p className="text-xs text-muted-foreground">
          {ctx.periodoInicio} → {ctx.periodoFin}
          {ctx.clasificacionPeriodo && (
            <>
              {' '}
              · <span className="font-medium text-foreground">{ctx.clasificacionPeriodo}</span>
            </>
          )}
          {ctx.totalDiasHabiles != null && ctx.totalDiasHabiles > 0 && (
            <> · {ctx.totalDiasHabiles} días hábiles (L–V)</>
          )}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">Problemática</dt>
          <dd className="mt-0.5">{ctx.problemaContexto}</dd>
        </div>
        {ctx.proposito && (
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Propósito</dt>
            <dd className="mt-0.5">{ctx.proposito}</dd>
          </div>
        )}
        {ctx.productoIntegrador && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Producto integrador
            </dt>
            <dd className="mt-0.5">{ctx.productoIntegrador}</dd>
          </div>
        )}
      </dl>

      {ctx.temaCentro && (
        <div className="mt-3 rounded-md bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Tema del centro</p>
          <p className="text-sm">{ctx.temaCentro}</p>
        </div>
      )}

      {ctx.preguntasDet && ctx.preguntasDet.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Preguntas detonadoras
          </p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {ctx.preguntasDet.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        <span className="w-full text-xs font-medium uppercase text-muted-foreground">
          Ejes articuladores
        </span>
        {ctx.ejes.length > 0 ? (
          ctx.ejes.map((e) => (
            <Badge key={e.codigo} variant="amarillo">
              {e.nombre}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">
            Ninguno seleccionado — elígelos al crear la planeación (paso Ejes del wizard).
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-2 font-medium">Campo formativo</th>
              <th className="p-2 font-medium">PDA</th>
            </tr>
          </thead>
          <tbody>
            {ctx.pdas.map((pda) => {
              const campoCodigo = ctx.pdaCampoCodigo?.[pda.codigo];
              const campo = campoCodigo ? campoPorCodigo.get(campoCodigo) : ctx.campos[0];
              return (
                <tr key={pda.codigo} className="border-b align-top">
                  <td className="p-2">
                    {campo ? (
                      <>
                        <span className="font-medium">{campo.nombre}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2">
                    <span className="font-medium">{pda.texto}</span>
                  </td>
                </tr>
              );
            })}
            {ctx.pdas.length === 0 && (
              <tr>
                <td colSpan={2} className="p-2 text-muted-foreground">
                  Sin PDA seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ctx.ajustesRazonables && (
        <div className="mt-4 rounded-md border border-amber-200/60 bg-amber-50/50 px-3 py-2 dark:bg-amber-950/20">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Estrategias / ajustes razonables
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{ctx.ajustesRazonables}</p>
        </div>
      )}

      <div className="mt-4 border-t border-dashed pt-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {tituloMomentos(plantilla)}
        </p>
        <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
          {momentos.map((m, i) => (
            <li key={m.key}>
              {i + 1}. {m.label}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Asigna el <strong>momento</strong> y la <strong>observación</strong> en cada actividad
          del calendario abajo.
        </p>
      </div>
    </div>
  );
}

/** @deprecated Use WorkbookHoja */
export const WorkbookHojaCentroInteres = WorkbookHoja;
