'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { fechaDesdeEtiquetaSesion, parseISODate } from '@/lib/planeaciones/calendario-periodo';
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
  interaccionDnD,
  onAbrir,
  onAgregar,
  renderBloque,
}: {
  sesion: Sesion;
  bloques: Bloque[];
  recursos: SesionRecursoAsignado[];
  seleccionado: boolean;
  /** false cuando el modal de este día está abierto (evita ids DnD duplicados). */
  interaccionDnD: boolean;
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

  return (
    <div
      ref={setNodeRef}
      data-testid={`workbook-dia-${sesion.id}`}
      className={`flex min-h-[140px] flex-col rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver
          ? 'border-nem-verde bg-nem-verde/10'
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

      <div className="min-h-0 flex-1 space-y-1">
        {bloques.length === 0 ? (
          <p className="text-[10px] leading-snug text-muted-foreground">
            Sin actividades. Arrastra aquí o pulsa Agregar.
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
        Agregar
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
  modalSesionId,
  onAbrirDia,
  onAgregarDia,
  renderBloqueCompacto,
}: {
  sesiones: Sesion[];
  sesionesPorSemana: Array<SemanaCalendario & { sesiones: Sesion[] }> | null;
  bloquesPorSesion: Map<string, Bloque[]>;
  recursosPorSesion: Map<string, SesionRecursoAsignado[]>;
  sesionSeleccionada: string;
  modalSesionId: string | null;
  /** Ver / editar actividades del día. */
  onAbrirDia: (sesionId: string) => void;
  /** Abrir modal para escribir actividad propia. */
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
            {gridSemana(sem.sesiones).map((s, i) =>
              s ? (
                <WorkbookDiaCelda
                  key={s.id}
                  sesion={s}
                  bloques={bloquesPorSesion.get(s.id) ?? []}
                  recursos={recursosPorSesion.get(s.id) ?? []}
                  seleccionado={sesionSeleccionada === s.id}
                  interaccionDnD={modalSesionId !== s.id}
                  onAbrir={() => onAbrirDia(s.id)}
                  onAgregar={() => onAgregarDia(s.id)}
                  renderBloque={renderBloqueCompacto}
                />
              ) : (
                <div
                  key={`empty-${sem.clave}-${i}`}
                  className="hidden min-h-[140px] rounded-lg border border-transparent bg-muted/20 sm:block"
                  aria-hidden
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { previewActividad };
