'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { fechaDesdeEtiquetaSesion, parseISODate } from '@/lib/planeaciones/calendario-periodo';
import {
  diaSemanaHabil,
  esLunes,
  esUltimoViernesDelMes,
  obtenerEfemeride,
  type DiaEventoConfig,
  type RutinaGrupoItem,
} from '@/lib/planeaciones/calendario-escolar';
import { etiquetaSesion } from '@/lib/planeaciones/modalidad-ui';
import type { SemanaCalendario } from '@/lib/planeaciones/calendario-periodo';
import type { Bloque } from '@/services/planeaciones/bloque-actions';
import type { Sesion } from '@/services/planeaciones/sesion-actions';
import type { SesionRecursoAsignado } from '@/services/planeaciones/sesion-recurso-actions';

const COLUMNAS_L_V = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'] as const;

function columnaDiaHabil(iso: string): number | null {
  const dow = parseISODate(iso).getDay();
  if (dow < 1 || dow > 5) return null;
  return dow - 1;
}

function gridSemana(sesiones: Sesion[]): (Sesion | null)[] {
  const celdas: (Sesion | null)[] = [null, null, null, null, null];
  for (const s of sesiones) {
    const f = fechaDesdeEtiquetaSesion(s.ajustes_sesion);
    if (!f) continue;
    const col = columnaDiaHabil(f);
    if (col != null) celdas[col] = s;
  }
  return celdas;
}

function previewActividad(texto: string | null | undefined): string {
  const t = texto?.trim() ?? '';
  if (!t) return '';
  const linea = t.split('\n')[0] ?? t;
  return linea.length > 56 ? `${linea.slice(0, 53)}…` : linea;
}

function WorkbookDiaCelda({
  sesion,
  bloques,
  recursos,
  seleccionado,
  destacado,
  interaccionDnD,
  rutinasGrupo = [],
  eventoDia,
  onAbrir,
  onAgregar,
  renderBloque,
}: {
  sesion: Sesion;
  bloques: Bloque[];
  recursos: SesionRecursoAsignado[];
  seleccionado: boolean;
  destacado?: boolean;
  /** false cuando el modal de este día está abierto (evita ids DnD duplicados). */
  interaccionDnD: boolean;
  rutinasGrupo?: RutinaGrupoItem[];
  eventoDia?: DiaEventoConfig;
  onAbrir: () => void;
  onAgregar: () => void;
  renderBloque: (bloque: Bloque) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `ses-cal-${sesion.id}`,
    data: { type: 'sesion', sesionId: sesion.id },
    disabled: !interaccionDnD,
  });
  const ids = bloques.map((b) => `blk-${b.id}`);
  const etiqueta = etiquetaSesion(sesion);
  const fechaISO = fechaDesdeEtiquetaSesion(sesion.ajustes_sesion);
  const esCteAuto = fechaISO ? esUltimoViernesDelMes(fechaISO) : false;
  const sinClase = eventoDia?.sinClase ?? esCteAuto;
  const motivoSinClase =
    eventoDia?.motivoSinClase?.trim() || (esCteAuto ? 'Consejo Técnico Escolar' : 'Sin clase');
  const mostrarHonores =
    Boolean(fechaISO && esLunes(fechaISO)) && !sinClase && !eventoDia?.ocultarHonores;
  const efemeride = fechaISO ? obtenerEfemeride(fechaISO) : null;
  const dow = fechaISO ? diaSemanaHabil(fechaISO) : null;
  const rutinasDelDia =
    dow && !sinClase
      ? rutinasGrupo.filter((r) => r.diasSemana.includes(dow))
      : [];

  return (
    <div
      ref={setNodeRef}
      data-testid={`workbook-dia-${sesion.id}`}
      className={`flex min-h-[140px] flex-col rounded-lg border-2 border-dashed p-2 transition-colors ${
        sinClase
          ? 'border-rose-300 bg-rose-50/60'
          : isOver
            ? 'border-nem-verde bg-nem-verde/10'
            : destacado
              ? 'border-nem-verde bg-nem-verde/15 ring-2 ring-nem-verde/40'
              : seleccionado
                ? 'border-nem-verde/50 bg-nem-verde/5'
                : 'border-muted-foreground/20 bg-background'
      }`}
    >
      <button
        type="button"
        className="mb-1 w-full rounded-md px-1 py-0.5 text-left text-xs font-semibold text-nem-verde hover:bg-nem-verde/10"
        onClick={onAbrir}
        aria-label={`${etiqueta} — agregar o editar actividades`}
      >
        {etiqueta}
      </button>

      {(sinClase || mostrarHonores || efemeride || rutinasDelDia.length > 0) && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {sinClase && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
              {motivoSinClase}
            </span>
          )}
          {mostrarHonores && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
              Honores a la bandera
            </span>
          )}
          {efemeride && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
              {efemeride.nombre}
            </span>
          )}
          {rutinasDelDia.map((r) => (
            <span
              key={r.id}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                r.categoria === 'especial'
                  ? 'bg-sky-100 text-sky-800'
                  : r.categoria === 'recurrente'
                    ? 'bg-lime-100 text-lime-800'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {r.titulo}
            </span>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-1">
        {sinClase && bloques.length === 0 ? (
          <p className="text-[10px] leading-snug text-rose-700">
            Día marcado sin actividades regulares.
          </p>
        ) : bloques.length === 0 ? (
          <p className="text-[10px] leading-snug text-muted-foreground">
            Sin actividades. Arrastra aquí o pulsa Configurar.
          </p>
        ) : interaccionDnD ? (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {bloques.slice(0, 2).map((b) => renderBloque(b))}
            {bloques.length > 2 && (
              <button
                type="button"
                className="text-[10px] text-nem-verde underline hover:no-underline"
                onClick={onAbrir}
              >
                +{bloques.length - 2} más
              </button>
            )}
          </SortableContext>
        ) : (
          <>
            {bloques.slice(0, 2).map((b) => (
              <p key={b.id} className="line-clamp-2 text-[10px] leading-snug text-foreground">
                {previewActividad(b.contenido_textual)}
              </p>
            ))}
            {bloques.length > 2 && (
              <button
                type="button"
                className="text-[10px] text-nem-verde underline hover:no-underline"
                onClick={onAbrir}
              >
                +{bloques.length - 2} más
              </button>
            )}
          </>
        )}
      </div>

      {eventoDia?.tareaCasa?.trim() && (
        <p className="mt-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] italic text-violet-900">
          <strong>TAREA:</strong> {eventoDia.tareaCasa.trim()}
        </p>
      )}

      {recursos.length > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {recursos.length} material{recursos.length === 1 ? '' : 'es'}
        </p>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 h-7 w-full text-[11px]"
        onClick={onAgregar}
        data-testid={`workbook-dia-agregar-${sesion.id}`}
      >
        <Plus className="mr-1 h-3 w-3" />
        Editar día
      </Button>
    </div>
  );
}

export function WorkbookCalendario({
  sesiones,
  sesionesPorSemana,
  bloquesPorSesion,
  recursosPorSesion,
  sesionSeleccionada,
  sesionDestacadaId,
  modalSesionId,
  rutinasGrupo = [],
  eventosPorFecha = {},
  onAbrirDia,
  onAgregarDia,
  renderBloqueCompacto,
}: {
  sesiones: Sesion[];
  sesionesPorSemana: Array<SemanaCalendario & { sesiones: Sesion[] }> | null;
  bloquesPorSesion: Map<string, Bloque[]>;
  recursosPorSesion: Map<string, SesionRecursoAsignado[]>;
  sesionSeleccionada: string;
  sesionDestacadaId?: string | null;
  modalSesionId: string | null;
  rutinasGrupo?: RutinaGrupoItem[];
  eventosPorFecha?: Record<string, DiaEventoConfig>;
  /** Ver / editar actividades del día. */
  onAbrirDia: (sesionId: string) => void;
  /** Abrir modal para editar día. */
  onAgregarDia: (sesionId: string) => void;
  renderBloqueCompacto: (bloque: Bloque) => ReactNode;
}) {
  const semanas =
    sesionesPorSemana ??
    (sesiones.length > 0
      ? [{ clave: 'unica', etiqueta: 'Calendario', fechasISO: [], sesiones }]
      : []);

  if (semanas.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Aún no hay días en el calendario del centro.
      </p>
    );
  }

  return (
    <div className="space-y-5" data-testid="workbook-calendario">
      {semanas.map((sem) => (
        <div key={sem.clave} className="space-y-2">
          <p className="text-xs font-medium text-nem-verde">{sem.etiqueta}</p>
          <div className="grid grid-cols-5 gap-2">
            {COLUMNAS_L_V.map((d) => (
              <p
                key={d}
                className="hidden text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:block"
              >
                {d}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {gridSemana(sem.sesiones).map((s, i) => {
              if (!s) {
                return (
                  <div
                    key={`empty-${sem.clave}-${i}`}
                    className="hidden min-h-[140px] rounded-lg border border-transparent bg-muted/20 sm:block"
                    aria-hidden
                  />
                );
              }
              const f = fechaDesdeEtiquetaSesion(s.ajustes_sesion);
              return (
                <WorkbookDiaCelda
                  key={s.id}
                  sesion={s}
                  bloques={bloquesPorSesion.get(s.id) ?? []}
                  recursos={recursosPorSesion.get(s.id) ?? []}
                  seleccionado={sesionSeleccionada === s.id}
                  destacado={sesionDestacadaId === s.id}
                  interaccionDnD={modalSesionId !== s.id}
                  rutinasGrupo={rutinasGrupo}
                  eventoDia={f ? eventosPorFecha[f] : undefined}
                  onAbrir={() => onAbrirDia(s.id)}
                  onAgregar={() => onAgregarDia(s.id)}
                  renderBloque={renderBloqueCompacto}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export { previewActividad };
