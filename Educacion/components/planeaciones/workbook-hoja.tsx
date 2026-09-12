import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
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

  const resumenPeriodo = [
    ctx.periodoInicio,
    ctx.periodoFin && `→ ${ctx.periodoFin}`,
    ctx.clasificacionPeriodo,
    ctx.totalDiasHabiles != null && ctx.totalDiasHabiles > 0
      ? `${ctx.totalDiasHabiles} días hábiles`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <details
      className="group rounded-lg border border-nem-verde/25 bg-card shadow-sm"
      data-testid="workbook-hoja"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-2 p-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Resumen del centro · {ctx.etiquetaGrupo ?? 'Grupo'}
            {ctx.cct ? ` · CCT ${ctx.cct}` : ''}
          </p>
          <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold text-nem-verde">
            {ctx.nombre}
          </h2>
          {resumenPeriodo && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{resumenPeriodo}</p>
          )}
        </div>
        <ChevronDown
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="space-y-4 border-t border-dashed px-4 pb-4 pt-3">
        <div className="border-b border-dashed pb-3 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Planeación preescolar · Fase 2
            {plantilla === 'centro_interes' && ' · Centro de interés'}
            {plantilla === 'proyecto_comunitario' && ' · Proyecto comunitario'}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-nem-verde">{ctx.nombre}</h3>
          <p className="text-xs text-muted-foreground">{resumenPeriodo}</p>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
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
          <div className="rounded-md bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Tema del centro</p>
            <p className="text-sm">{ctx.temaCentro}</p>
          </div>
        )}

        {ctx.preguntasDet && ctx.preguntasDet.length > 0 && (
          <div>
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

        <div className="flex flex-wrap gap-1">
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
            <span className="text-xs text-muted-foreground">Ninguno seleccionado.</span>
          )}
        </div>

        <div className="overflow-x-auto">
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
                      {campo ? <span className="font-medium">{campo.nombre}</span> : '—'}
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
          <div className="rounded-md border border-amber-200/60 bg-amber-50/50 px-3 py-2 dark:bg-amber-950/20">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Estrategias / ajustes razonables
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{ctx.ajustesRazonables}</p>
          </div>
        )}

        <div className="border-t border-dashed pt-3">
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
        </div>
      </div>
    </details>
  );
}

/** @deprecated Use WorkbookHoja */
export const WorkbookHojaCentroInteres = WorkbookHoja;
