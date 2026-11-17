'use client';

/**
 * Editor de actividades con drag-and-drop desde catálogo M1 hacia sesiones/días.
 * Incluye guías contextuales en lenguaje de docente (Tía Lola).
 */
import {
  useMemo,
  useState,
  useTransition,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SectionHelp } from '@/components/ui/section-help';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GripVertical,
  Plus,
  Save,
  Loader2,
  Trash2,
  Search,
  PenLine,
  Sparkles,
  ExternalLink,
  Library,
  Package,
} from 'lucide-react';
import type { BloqueCatalogo, ReferenciaConaliteg } from '@/services/catalogo/catalogo';
import type { Sesion } from '@/services/planeaciones/sesion-actions';
import {
  getBloques,
  createBloque,
  createBloqueFromCatalogo,
  reorderBloquesInSesion,
  moveBloqueToSesion,
  deleteBloque,
  patchBloqueCampos,
  type Bloque,
} from '@/services/planeaciones/bloque-actions';
import { updateBloque } from '@/services/planeaciones/update-actions';
import { IASugerenciaPanel } from '@/components/ia/ia-sugerencia-panel';
import {
  getMensajeSinActividades,
  getNotaDragDrop,
  getTituloSeccionActividades,
  getSeccionesGuia,
  etiquetaSesion,
  MODALIDADES_LABELS,
  type Modalidad,
} from '@/lib/planeaciones/modalidad-ui';
import {
  GUIA_ACTIVIDADES,
  GUIA_CATALOGO,
  GUIA_ARRASTRAR,
  GUIA_RECURSOS,
} from '@/lib/planeaciones/guias';
import {
  assignRecursoToSesion,
  removeRecursoFromSesion,
  getRecursosPorPlaneacion,
  type SesionRecursoAsignado,
} from '@/services/planeaciones/sesion-recurso-actions';
import { matchRecursosInventario } from '@/lib/planeaciones/matching-recursos';
import { CATEGORIAS_RECURSO } from '@/services/recursos-aula/sugerir-uso';
import {
  filtrarBloquesCatalogo,
  ordenarBloquesPorContexto,
  puntuarBloqueCatalogo,
  etiquetaContextoInventario,
  type PdaGradoMap,
} from '@/lib/nivel-educativo/filtros-inventario';
import {
  usaWorkbookLayout,
  type WorkbookContexto,
} from '@/lib/planeaciones/workbook-layout';
import { WorkbookHoja } from '@/components/planeaciones/workbook-hoja';
import { WorkbookCalendario } from '@/components/planeaciones/workbook-calendario';
import { DiaActividadModal } from '@/components/planeaciones/dia-actividad-modal';
import { RutinariasPanel } from '@/components/planeaciones/rutinarias-panel';
import { ConsultaRapidaSidebar } from '@/components/consulta-rapida/consulta-rapida-sidebar';
import { useConsultaRapidaOptional } from '@/components/consulta-rapida/consulta-rapida-context';
import {
  agruparFechasPorSemana,
  fechaDesdeEtiquetaSesion,
} from '@/lib/planeaciones/calendario-periodo';
import {
  esLunes,
  esUltimoViernesDelMes,
  type DiaEventoConfig,
  type RutinaGrupoItem,
} from '@/lib/planeaciones/calendario-escolar';
const TIPO_LABEL: Record<string, string> = {
  apertura: 'Inicio',
  desarrollo: 'Desarrollo',
  practica: 'Práctica',
  cierre: 'Cierre',
  evaluacion: 'Evaluación',
  evaluacion_semanal: 'Evaluación semanal',
  banco_palabras: 'Banco de palabras',
};

export interface RecursoInventarioItem {
  id: string;
  nombre: string;
  categoria: string;
  uso: string;
  cantidad: number;
}

export interface ProyectoContextoEditor {
  nombre: string;
  problemaContexto: string;
  proposito: string;
  pdas: string[];
  ejes: string[];
}

export interface ActividadesEditorProps {
  planeacionId: string;
  docenteId: string;
  cct: string;
  modalidad: Modalidad;
  camposFormativos: string[];
  gradoPreescolar: string;
  pdaGradoPorCodigo: PdaGradoMap;
  bloquesIniciales: Bloque[];
  sesionesIniciales: Sesion[];
  catalogoInicial: BloqueCatalogo[];
  recursosInventario: RecursoInventarioItem[];
  recursosAsignadosInicial: SesionRecursoAsignado[];
  referenciasBiblioteca?: ReferenciaConaliteg[];
  proyectoContexto?: ProyectoContextoEditor | null;
  /** Datos para hoja central (centro de interés / proyecto). */
  workbook?: WorkbookContexto | null;
}

function emojiCategoriaRecurso(codigo: string): string {
  return CATEGORIAS_RECURSO.find((c) => c.codigo === codigo)?.emoji ?? '📦';
}

function parseSesionDropId(overId: string): string | null {
  if (overId.startsWith('ses-cal-')) return overId.slice('ses-cal-'.length);
  if (overId.startsWith('ses-modal-')) return overId.slice('ses-modal-'.length);
  if (overId.startsWith('ses-')) return overId.slice('ses-'.length);
  return null;
}

const ACTIVIDAD_PROPIA_DRAG_ID = 'act-propia-manual';

function ActividadPropiaCard({ onEscribir }: { onEscribir?: () => void } = {}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ACTIVIDAD_PROPIA_DRAG_ID,
    data: { type: 'actividad_propia' },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid="actividad-propia-card"
      className={`rounded-lg border-2 border-nem-verde/40 bg-nem-verde/10 p-2.5 shadow-sm ${
        isDragging ? 'ring-2 ring-nem-verde/50' : ''
      }`}
      data-dnd-draggable
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-nem-verde active:cursor-grabbing"
          aria-label="Arrastrar actividad propia a un día del calendario"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-nem-verde">
            <PenLine className="h-3.5 w-3.5" />
            Actividad propia
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Arrastra a un día o escribe una actividad libre.
          </p>
          {onEscribir && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEscribir}
              className="mt-2 h-7 w-full border-nem-verde/40 text-xs text-nem-verde hover:bg-nem-verde/10"
            >
              Escribir actividad
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogoCard({
  item,
  onAgregar,
  disabled,
  sugerido,
  origenIa,
  razon,
}: {
  item: BloqueCatalogo;
  onAgregar: () => void;
  disabled?: boolean;
  sugerido?: boolean;
  origenIa?: boolean;
  razon?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cat-${item.codigo}`,
    data: { type: 'catalogo', codigo: item.codigo },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`catalogo-item-${item.codigo}`}
      className={`rounded-md border p-2 text-sm shadow-sm ${
        sugerido ? 'border-nem-verde/40 bg-nem-verde/5' : 'bg-background'
      } ${isDragging ? 'ring-2 ring-nem-verde/40' : ''}`}
      data-dnd-draggable
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label={`Arrastrar ${item.nombre}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium leading-snug">{item.nombre}</p>
            {sugerido && (
              <Badge variant="verde" className="gap-0.5 text-[10px]">
                <Sparkles className="h-2.5 w-2.5" />
                {origenIa ? 'Sugerida por IA' : 'Sugerida'}
              </Badge>
            )}
          </div>
          {item.descripcion && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {item.descripcion}
            </p>
          )}
          {razon && (
            <p className="mt-1 text-[11px] leading-snug text-nem-verde">{razon}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">
              {TIPO_LABEL[item.tipo] ?? item.tipo}
            </Badge>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {item.nivel_flexibilidad.replace(/_/g, ' ')}
            </Badge>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-1 h-7 px-2 text-xs"
            onClick={onAgregar}
            disabled={disabled}
            data-testid={`catalogo-agregar-${item.codigo}`}
          >
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecursoInventarioCard({
  item,
  onAgregar,
  disabled,
  sugerido,
  usoSugerido,
}: {
  item: RecursoInventarioItem;
  onAgregar: () => void;
  disabled?: boolean;
  sugerido?: boolean;
  usoSugerido?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `rec-${item.id}`,
    data: { type: 'recurso', recursoId: item.id },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`recurso-item-${item.id}`}
      className={`rounded-md border p-2 text-sm ${
        sugerido ? 'border-nem-verde/40 bg-nem-verde/5' : 'bg-background'
      } ${isDragging ? 'ring-2 ring-nem-verde/40' : ''}`}
      data-dnd-draggable
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground"
          aria-label={`Arrastrar ${item.nombre}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium leading-snug">
              {emojiCategoriaRecurso(item.categoria)} {item.nombre}
            </p>
            {sugerido && (
              <Badge variant="verde" className="gap-0.5 text-[10px]">
                <Sparkles className="h-2.5 w-2.5" />
                Sugerido
              </Badge>
            )}
          </div>
          {usoSugerido ? (
            <p className="mt-0.5 text-xs text-nem-verde">
              Uso sugerido: {usoSugerido}
            </p>
          ) : (
            item.uso && <p className="text-xs text-muted-foreground">{item.uso}</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-1 h-7 px-2 text-xs"
            onClick={onAgregar}
            disabled={disabled}
          >
            Agregar al día
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActividadSortable({
  bloque,
  planeacionId,
  docenteId,
  cct,
  inventario,
  esWorkbook,
  modoCompacto,
  editarAlMontar,
  momentosOptions,
  onAbrir,
  onDelete,
  onRefresh,
  onUsarRecurso,
}: {
  bloque: Bloque;
  planeacionId: string;
  docenteId: string;
  cct: string;
  inventario: RecursoInventarioItem[];
  esWorkbook?: boolean;
  modoCompacto?: boolean;
  editarAlMontar?: boolean;
  momentosOptions?: Array<{ key: string; label: string }>;
  onAbrir?: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onUsarRecurso: (recursoId: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `blk-${bloque.id}`,
      data: { type: 'bloque', bloqueId: bloque.id, sesionId: bloque.sesion_id },
    });
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(bloque.contenido_textual ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTexto(bloque.contenido_textual ?? '');
  }, [bloque.contenido_textual]);

  useEffect(() => {
    if (editarAlMontar) setEditing(true);
  }, [editarAlMontar, bloque.id]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sugeridos = useMemo(
    () => matchRecursosInventario(bloque.recursos_requeridos ?? [], inventario),
    [bloque.recursos_requeridos, inventario],
  );

  const guardar = async () => {
    if (!texto.trim()) {
      setError('El contenido no puede estar vacío.');
      return;
    }
    setGuardando(true);
    setError(null);
    const res = await updateBloque({
      bloqueId: bloque.id,
      docenteId,
      contenidoTextual: texto.trim(),
      origen: 'maestra_editado_de_ia',
    });
    setGuardando(false);
    if (!res.ok) {
      setError(res.error ?? 'No se pudo guardar.');
      return;
    }
    setEditing(false);
    onRefresh();
  };

  if (modoCompacto) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        data-testid={`bloque-${bloque.id}`}
        className="flex items-start gap-1 rounded border bg-background/90 px-1.5 py-1"
        data-dnd-draggable
      >
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Reordenar actividad"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 rounded px-0.5 text-left text-[10px] leading-snug line-clamp-2 hover:bg-muted/60"
          onClick={onAbrir}
          aria-label="Abrir y editar actividad"
        >
          {bloque.contenido_textual}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`bloque-anchor-${bloque.id}`}
      data-testid={`bloque-${bloque.id}`}
      className="rounded-md border bg-background p-3"
      data-dnd-draggable
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="Reordenar actividad"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Badge variant="outline" className="text-[10px]">
            {TIPO_LABEL[bloque.tipo] ?? bloque.tipo}
          </Badge>
        </div>
        <div className="flex gap-1">
          {!editing && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={onDelete}
            aria-label="Quitar actividad"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={guardar} disabled={guardando}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full rounded-md px-1 py-0.5 text-left text-sm whitespace-pre-wrap hover:bg-muted/50"
          onClick={() => setEditing(true)}
          aria-label="Editar actividad"
        >
          {bloque.contenido_textual}
        </button>
      )}

      {esWorkbook && (momentosOptions?.length ?? 0) > 0 && (
        <div className="mt-2 space-y-2 border-t pt-2">
          <div>
            <label
              htmlFor={`momento-${bloque.id}`}
              className="text-xs font-medium text-muted-foreground"
            >
              Momento
            </label>
            <select
              id={`momento-${bloque.id}`}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={bloque.momento ?? ''}
              onChange={async (e) => {
                const res = await patchBloqueCampos({
                  bloqueId: bloque.id,
                  docenteId,
                  momento: e.target.value || null,
                });
                if (res.ok) onRefresh();
              }}
            >
              <option value="">— Sin asignar —</option>
              {momentosOptions!.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor={`obs-${bloque.id}`}
              className="text-xs font-medium text-muted-foreground"
            >
              ¿Qué se observará? (criterio formativo)
            </label>
            <Textarea
              id={`obs-${bloque.id}`}
              defaultValue={bloque.observacion ?? ''}
              rows={2}
              className="mt-1 text-xs"
              placeholder="Ej. Participación en clase, escucha de indicaciones, convivencia pacífica…"
              onBlur={async (e) => {
                const val = e.target.value.trim();
                if (val === (bloque.observacion ?? '').trim()) return;
                const res = await patchBloqueCampos({
                  bloqueId: bloque.id,
                  docenteId,
                  observacion: val || null,
                });
                if (res.ok) onRefresh();
              }}
            />
          </div>
          {(bloque.recursos_requeridos?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Materiales sugeridos:
              </span>
              {bloque.recursos_requeridos!.map((rec, idx) => {
                const label =
                  rec.clave_busqueda || rec.categoria || `Material ${idx + 1}`;
                const texto =
                  rec.cantidad && rec.cantidad > 1
                    ? `${rec.cantidad}× ${label}`
                    : label;
                return (
                  <Badge
                    key={`${label}-${idx}`}
                    variant="outline"
                    className="text-[10px] font-normal"
                  >
                    {texto}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sugeridos.length > 0 && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/80 p-2">
          <p className="text-xs font-medium text-amber-900">Materiales que podrías usar:</p>
          <ul className="mt-1 space-y-1">
            {sugeridos.map((s) => (
              <li key={s.recursoId} className="flex items-center justify-between gap-2 text-xs">
                <span>{s.nombre}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => onUsarRecurso(s.recursoId)}
                >
                  Usar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 space-y-2 border-t pt-2">
        <IASugerenciaPanel
          planeacionId={planeacionId}
          docenteId={docenteId}
          cct={cct}
          bloqueId={bloque.id}
          textoBase={bloque.contenido_textual ?? ''}
          feature="F1"
          onAccepted={({ texto: aceptado }) => {
            if (aceptado) {
              setTexto(aceptado);
              setEditing(false);
            }
            void onRefresh();
          }}
        />
        <IASugerenciaPanel
          planeacionId={planeacionId}
          docenteId={docenteId}
          cct={cct}
          bloqueId={bloque.id}
          textoBase={bloque.contenido_textual ?? ''}
          feature="F2"
          f2Accion="expandir"
          onAccepted={({ texto: aceptado }) => {
            if (aceptado) {
              setTexto(aceptado);
              setEditing(false);
            }
            void onRefresh();
          }}
        />
      </div>
    </div>
  );
}

function SesionZona({
  sesion,
  bloques,
  recursos,
  isOver,
  setNodeRef,
  onQuitarRecurso,
  children,
}: {
  sesion: Sesion;
  bloques: Bloque[];
  recursos: SesionRecursoAsignado[];
  isOver: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  onQuitarRecurso: (recursoId: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={setNodeRef}
      data-testid={`sesion-zona-${sesion.id}`}
      className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
        isOver ? 'border-nem-verde bg-nem-verde/5' : 'border-muted-foreground/25 bg-muted/10'
      }`}
    >
      <h3 className="mb-2 text-sm font-semibold text-nem-verde">
        {etiquetaSesion(sesion)}
      </h3>
      {bloques.length === 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Suelta aquí actividades o materiales (catálogo / Mi aula).
        </p>
      ) : null}
      {children}
      {recursos.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Materiales de este día
          </p>
          <div className="flex flex-wrap gap-1">
            {recursos.map((r) => (
              <Badge
                key={r.recurso_id}
                variant="secondary"
                className="gap-1 pr-1 text-[11px]"
              >
                {emojiCategoriaRecurso(r.categoria)} {r.nombre}
                <button
                  type="button"
                  className="ml-1 rounded px-0.5 hover:bg-muted"
                  aria-label={`Quitar ${r.nombre}`}
                  onClick={() => onQuitarRecurso(r.recurso_id)}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SesionDropArea({
  sesion,
  bloques,
  recursos,
  planeacionId,
  docenteId,
  cct,
  inventario,
  esWorkbook,
  momentosOptions,
  droppableId,
  sinEncabezado,
  bloqueEditandoId,
  onRefresh,
  onAssignRecurso,
  onQuitarRecurso,
}: {
  sesion: Sesion;
  bloques: Bloque[];
  recursos: SesionRecursoAsignado[];
  planeacionId: string;
  docenteId: string;
  cct: string;
  inventario: RecursoInventarioItem[];
  esWorkbook?: boolean;
  momentosOptions?: Array<{ key: string; label: string }>;
  droppableId?: string;
  sinEncabezado?: boolean;
  bloqueEditandoId?: string | null;
  onRefresh: () => void;
  onAssignRecurso: (sesionId: string, recursoId: string) => Promise<void>;
  onQuitarRecurso: (sesionId: string, recursoId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId ?? `ses-${sesion.id}`,
    data: { type: 'sesion', sesionId: sesion.id },
  });
  const ids = bloques.map((b) => `blk-${b.id}`);

  const onDelete = async (bloqueId: string) => {
    const res = await deleteBloque({ bloqueId, docenteId });
    if (res.ok) onRefresh();
  };

  const lista = (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className="space-y-2">
        {bloques.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Suelta aquí actividades o materiales del catálogo / Mi aula.
          </p>
        ) : null}
        {bloques.map((b) => (
          <ActividadSortable
            key={b.id}
            bloque={b}
            planeacionId={planeacionId}
            docenteId={docenteId}
            cct={cct}
            inventario={inventario}
            esWorkbook={esWorkbook}
            editarAlMontar={bloqueEditandoId === b.id}
            momentosOptions={momentosOptions}
            onDelete={() => onDelete(b.id)}
            onRefresh={onRefresh}
            onUsarRecurso={(recursoId) => onAssignRecurso(sesion.id, recursoId)}
          />
        ))}
      </div>
    </SortableContext>
  );

  if (sinEncabezado) {
    return (
      <div
        ref={setNodeRef}
        data-testid={`sesion-zona-${sesion.id}`}
        className={`rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-nem-verde bg-nem-verde/5' : 'border-muted-foreground/25'
        }`}
      >
        {lista}
        {recursos.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Materiales</p>
            <div className="flex flex-wrap gap-1">
              {recursos.map((r) => (
                <Badge
                  key={r.recurso_id}
                  variant="secondary"
                  className="gap-1 pr-1 text-[11px]"
                >
                  {emojiCategoriaRecurso(r.categoria)} {r.nombre}
                  <button
                    type="button"
                    className="ml-1 rounded px-0.5 hover:bg-muted"
                    aria-label={`Quitar ${r.nombre}`}
                    onClick={() => onQuitarRecurso(sesion.id, r.recurso_id)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <SesionZona
      sesion={sesion}
      bloques={bloques}
      recursos={recursos}
      isOver={isOver}
      setNodeRef={setNodeRef}
      onQuitarRecurso={(recursoId) => onQuitarRecurso(sesion.id, recursoId)}
    >
      {lista}
    </SesionZona>
  );
}

export function ActividadesEditor({
  planeacionId,
  docenteId,
  cct,
  modalidad,
  camposFormativos,
  gradoPreescolar,
  pdaGradoPorCodigo,
  bloquesIniciales,
  sesionesIniciales,
  catalogoInicial,
  recursosInventario,
  recursosAsignadosInicial,
  referenciasBiblioteca = [],
  proyectoContexto = null,
  workbook = null,
}: ActividadesEditorProps) {
  const esWorkbook = usaWorkbookLayout(modalidad) && workbook != null;
  const momentosWorkbook = useMemo(
    () => (esWorkbook ? getSeccionesGuia(modalidad) : []),
    [esWorkbook, modalidad],
  );
  const router = useRouter();
  const consultaRapida = useConsultaRapidaOptional();
  const [, startTransition] = useTransition();
  const [bloques, setBloques] = useState<Bloque[]>(bloquesIniciales);
  const [sesiones] = useState<Sesion[]>(sesionesIniciales);
  const [recursosAsignados, setRecursosAsignados] = useState(recursosAsignadosInicial);
  const [panelIzquierdo, setPanelIzquierdo] = useState<'catalogo' | 'inventario'>('catalogo');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarTodoCatalogo, setMostrarTodoCatalogo] = useState(false);
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false);
  const [recursosModalOpen, setRecursosModalOpen] = useState(false);
  const [iaEditorState, setIaEditorState] = useState<{
    loading: boolean;
    origen: 'ia' | 'afinidad' | null;
    actividades: Array<{ codigo: string; razon?: string }>;
    actividadesAfinidad: string[];
    libros: Array<{ id: number; razon?: string }>;
    recursos: Array<{ id: string; uso_sugerido?: string }>;
  }>({
    loading: false,
    origen: null,
    actividades: [],
    actividadesAfinidad: [],
    libros: [],
    recursos: [],
  });
  const [sesionSeleccionada, setSesionSeleccionada] = useState(sesionesIniciales[0]?.id ?? '');
  const [modalSesionId, setModalSesionId] = useState<string | null>(null);
  const [actividadPropiaSesionId, setActividadPropiaSesionId] = useState<string | null>(null);
  const [bloqueEditandoId, setBloqueEditandoId] = useState<string | null>(null);
  const [enfocarManual, setEnfocarManual] = useState(false);
  const manualInputRef = useRef<HTMLTextAreaElement>(null);
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);

  const rutinasStorageKey = `nem_rutinas_grupo_${docenteId}_${gradoPreescolar}`;
  const eventosStorageKey = `nem_eventos_planeacion_${planeacionId}`;
  const [rutinasGrupo, setRutinasGrupo] = useState<RutinaGrupoItem[]>([]);
  const [eventosPorFecha, setEventosPorFecha] = useState<Record<string, DiaEventoConfig>>({});

  useEffect(() => {
    try {
      const rRaw = localStorage.getItem(rutinasStorageKey);
      if (rRaw) {
        const parsed = JSON.parse(rRaw);
        if (Array.isArray(parsed)) setRutinasGrupo(parsed);
      }
      const eRaw = localStorage.getItem(eventosStorageKey);
      if (eRaw) {
        const parsed = JSON.parse(eRaw);
        if (parsed && typeof parsed === 'object') setEventosPorFecha(parsed);
      }
    } catch {
      // ignore localStorage errors
    }
  }, [rutinasStorageKey, eventosStorageKey]);

  const actualizarRutinasGrupo = useCallback(
    (next: RutinaGrupoItem[]) => {
      setRutinasGrupo(next);
      try {
        localStorage.setItem(rutinasStorageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [rutinasStorageKey],
  );

  const actualizarEventoDia = useCallback(
    (fechaISO: string, patch: Partial<DiaEventoConfig>) => {
      setEventosPorFecha((prev) => {
        const next = {
          ...prev,
          [fechaISO]: { ...(prev[fechaISO] ?? {}), ...patch },
        };
        try {
          localStorage.setItem(eventosStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [eventosStorageKey],
  );
  const [activeDrag, setActiveDrag] = useState<{
    tipo: 'catalogo' | 'bloque' | 'recurso';
    label: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [sesionDestacadaId, setSesionDestacadaId] = useState<string | null>(null);
  const destacarSesion = useCallback((sesionId: string) => {
    setSesionDestacadaId(sesionId);
    window.setTimeout(() => {
      setSesionDestacadaId((prev) => (prev === sesionId ? null : prev));
    }, 1800);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const contextoCatalogo = useMemo(
    () => ({
      pdas: workbook?.pdas.map((p) => p.codigo) ?? [],
      temaCentro: workbook?.temaCentro ?? null,
      preguntasDet: workbook?.preguntasDet ?? [],
      problemaContexto: workbook?.problemaContexto ?? '',
    }),
    [workbook],
  );

  const catalogoBase = useMemo(() => {
    if (mostrarTodoCatalogo) {
      const q = busqueda.trim().toLowerCase();
      const base = q
        ? catalogoInicial.filter(
            (b) =>
              b.nombre.toLowerCase().includes(q) ||
              (b.descripcion ?? '').toLowerCase().includes(q) ||
              b.codigo.toLowerCase().includes(q),
          )
        : catalogoInicial;
      return ordenarBloquesPorContexto(base, contextoCatalogo);
    }
    const filtrados = filtrarBloquesCatalogo(catalogoInicial, {
      modalidad,
      camposFormativos,
      gradoPreescolar,
      pdaGradoPorCodigo,
      busqueda,
    });
    return ordenarBloquesPorContexto(filtrados, contextoCatalogo);
  }, [
    mostrarTodoCatalogo,
    catalogoInicial,
    camposFormativos,
    modalidad,
    gradoPreescolar,
    pdaGradoPorCodigo,
    busqueda,
    contextoCatalogo,
  ]);

  const analizarEditorConIa = useCallback(async () => {
    const nombreProyecto = proyectoContexto?.nombre ?? workbook?.nombre ?? '';
    const problemaProyecto = proyectoContexto?.problemaContexto ?? workbook?.problemaContexto ?? '';
    const propositoProyecto = proyectoContexto?.proposito ?? workbook?.proposito ?? '';
    if (!nombreProyecto && !problemaProyecto && !propositoProyecto) return;

    setIaEditorState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/planeaciones/ia/sugerir-recursos-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modalidad,
          grado: gradoPreescolar,
          nombre: nombreProyecto,
          problema_contexto: problemaProyecto,
          proposito: propositoProyecto,
          campos: camposFormativos,
          pdas:
            workbook?.pdas.map((p) => `${p.codigo}: ${p.texto}`) ??
            proyectoContexto?.pdas ??
            [],
          ejes:
            workbook?.ejes.map((e) => e.nombre) ??
            proyectoContexto?.ejes ??
            [],
          actividades_candidatas: catalogoInicial.slice(0, 45).map((b) => ({
            codigo: b.codigo,
            nombre: b.nombre,
            descripcion: b.descripcion ?? '',
            tipo: b.tipo,
          })),
          libros_candidatos: referenciasBiblioteca.slice(0, 25).map((l) => ({
            id: l.id,
            titulo_libro: l.titulo_libro,
            campo: l.campo,
            grado: l.grado,
          })),
          recursos_candidatos: recursosInventario.slice(0, 45).map((r) => ({
            id: r.id,
            nombre: r.nombre,
            categoria: r.categoria,
            uso: r.uso,
          })),
        }),
      });
      const json = await res.json().catch(() => null);
      const data = json?.data;
      if (res.ok && data?.origen === 'ia') {
        setIaEditorState({
          loading: false,
          origen: 'ia',
          actividades: Array.isArray(data.actividades) ? data.actividades : [],
          actividadesAfinidad: Array.isArray(data.actividades_afinidad)
            ? data.actividades_afinidad
            : [],
          libros: Array.isArray(data.libros) ? data.libros : [],
          recursos: Array.isArray(data.recursos) ? data.recursos : [],
        });
      } else {
        setIaEditorState((prev) => ({ ...prev, loading: false, origen: 'afinidad' }));
      }
    } catch {
      setIaEditorState((prev) => ({ ...prev, loading: false, origen: 'afinidad' }));
    }
  }, [
    proyectoContexto,
    workbook,
    modalidad,
    gradoPreescolar,
    camposFormativos,
    catalogoInicial,
    referenciasBiblioteca,
    recursosInventario,
  ]);

  useEffect(() => {
    void analizarEditorConIa();
  }, [analizarEditorConIa]);

  const iaActividadesMap = useMemo(
    () => new Map(iaEditorState.actividades.map((a) => [a.codigo, a.razon])),
    [iaEditorState.actividades],
  );

  const iaActividadesRankMap = useMemo(() => {
    const map = new Map<string, number>();
    iaEditorState.actividadesAfinidad.forEach((c, idx) => map.set(c, idx));
    return map;
  }, [iaEditorState.actividadesAfinidad]);

  const catalogoFiltrado = catalogoBase;

  const catalogoSugeridas = useMemo(() => {
    if (iaActividadesMap.size > 0) {
      const porCodigo = new Map(catalogoBase.map((b) => [b.codigo, b]));
      const lista: BloqueCatalogo[] = [];
      for (const a of iaEditorState.actividades) {
        const b = porCodigo.get(a.codigo);
        if (b) lista.push(b);
      }
      if (lista.length > 0) return lista;
    }
    return catalogoBase.filter((b) => puntuarBloqueCatalogo(b, contextoCatalogo) > 0);
  }, [iaActividadesMap, iaEditorState.actividades, catalogoBase, contextoCatalogo]);

  const catalogoResto = useMemo(() => {
    const sugeridasSet = new Set(catalogoSugeridas.map((b) => b.codigo));
    const rest =
      catalogoSugeridas.length === 0
        ? catalogoBase
        : catalogoBase.filter((b) => !sugeridasSet.has(b.codigo));
    if (iaActividadesRankMap.size === 0) return rest;
    return [...rest].sort((a, b) => {
      const rA = iaActividadesRankMap.get(a.codigo);
      const rB = iaActividadesRankMap.get(b.codigo);
      if (rA !== undefined && rB !== undefined) return rA - rB;
      if (rA !== undefined) return -1;
      if (rB !== undefined) return 1;
      return 0;
    });
  }, [catalogoBase, catalogoSugeridas, iaActividadesRankMap]);

  const librosSugeridos = useMemo(() => {
    if (iaEditorState.libros.length > 0) {
      const porId = new Map(referenciasBiblioteca.map((r) => [r.id, r]));
      return iaEditorState.libros
        .map((l) => {
          const ref = porId.get(l.id);
          return ref ? { ref, razon: l.razon } : null;
        })
        .filter((x): x is { ref: ReferenciaConaliteg; razon: string | undefined } => x !== null);
    }
    // Fallback determinista: libros del mismo grado o campos
    return referenciasBiblioteca
      .filter((r) => r.grado.includes(gradoPreescolar.replace('°', '')) || camposFormativos.some((c) => r.campo.toLowerCase().includes(c.split('_')[0] ?? '')))
      .slice(0, 4)
      .map((ref) => ({ ref, razon: undefined }));
  }, [iaEditorState.libros, referenciasBiblioteca, gradoPreescolar, camposFormativos]);

  const recursosOrdenados = useMemo(() => {
    const iaMap = new Map(iaEditorState.recursos.map((r) => [r.id, r.uso_sugerido]));
    const sugeridos = recursosInventario
      .filter((r) => iaMap.has(r.id))
      .map((item) => ({ item, sugerido: true, usoSugerido: iaMap.get(item.id) }));
    const otros = recursosInventario
      .filter((r) => !iaMap.has(r.id))
      .map((item) => ({ item, sugerido: false, usoSugerido: undefined }));
    return [...sugeridos, ...otros];
  }, [recursosInventario, iaEditorState.recursos]);

  const etiquetaFiltro = useMemo(
    () =>
      etiquetaContextoInventario({
        grado: gradoPreescolar,
        modalidadLabel: MODALIDADES_LABELS[modalidad],
        camposCount: camposFormativos.length,
      }),
    [gradoPreescolar, modalidad, camposFormativos.length],
  );

  const bloquesPorSesion = useMemo(() => {
    const map = new Map<string, Bloque[]>();
    for (const s of sesiones) map.set(s.id, []);
    for (const b of bloques) {
      const list = map.get(b.sesion_id);
      if (list) list.push(b);
      else map.set(b.sesion_id, [b]);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.orden - b.orden);
    }
    return map;
  }, [bloques, sesiones]);

  const refresh = useCallback(async () => {
    const res = await getBloques(planeacionId);
    if (res.ok && res.data) setBloques(res.data);
    else startTransition(() => router.refresh());
  }, [planeacionId, router, startTransition]);

  const refreshRecursos = useCallback(async () => {
    const res = await getRecursosPorPlaneacion(planeacionId);
    if (res.ok && res.data) setRecursosAsignados(res.data);
  }, [planeacionId]);

  const recursosPorSesion = useMemo(() => {
    const map = new Map<string, SesionRecursoAsignado[]>();
    for (const s of sesiones) map.set(s.id, []);
    for (const r of recursosAsignados) {
      const list = map.get(r.sesion_id);
      if (list) list.push(r);
      else map.set(r.sesion_id, [r]);
    }
    return map;
  }, [recursosAsignados, sesiones]);

  const assignRecurso = async (sesionId: string, recursoId: string) => {
    setPending(true);
    try {
      const res = await assignRecursoToSesion({
        sesionId,
        recursoId,
        docenteId,
        cct,
      });
      if (!res.ok) {
        setErrorNuevo(res.error ?? 'No se pudo asignar el material.');
        return;
      }
      setErrorNuevo(null);
      await refreshRecursos();
    } finally {
      setPending(false);
    }
  };

  const quitarRecurso = async (sesionId: string, recursoId: string) => {
    const res = await removeRecursoFromSesion({ sesionId, recursoId, docenteId });
    if (res.ok) await refreshRecursos();
  };

  const agregarDesdeCatalogo = async (codigo: string, sesionId: string) => {
    if (!sesionId) return;
    setPending(true);
    try {
      const res = await createBloqueFromCatalogo({
        planeacionId,
        docenteId,
        sesionId,
        catalogoCodigo: codigo,
      });
      if (!res.ok) {
        setErrorNuevo(res.error ?? 'No se pudo agregar la actividad.');
        return;
      }
      setErrorNuevo(null);
      const cat = catalogoInicial.find((c) => c.codigo === codigo);
      const nuevoBloqueId = res.id;
      if (nuevoBloqueId && cat) {
        const ahora = new Date().toISOString();
        const ordenEnSesion = (bloquesPorSesion.get(sesionId)?.length ?? 0) + 1;
        setBloques((prev) => [
          ...prev,
          {
            id: nuevoBloqueId,
            planeacion_id: planeacionId,
            sesion_id: sesionId,
            docente_id: docenteId,
            cct,
            tipo: cat.tipo,
            nivel_flexibilidad: cat.nivel_flexibilidad,
            contenido_textual: cat.contenido_textual ?? cat.nombre,
            pda_ids: cat.pda_ids ?? [],
            campos_formativos: cat.campos_formativos ?? [],
            ejes_articuladores: cat.ejes_articuladores ?? [],
            duracion_min: cat.duracion_min ?? null,
            orden: ordenEnSesion,
            origen: 'kit_template',
            bloque_catalogo_id: cat.codigo,
            recursos_requeridos: cat.recursos_requeridos ?? [],
            created_at: ahora,
            updated_at: ahora,
          },
        ]);
        destacarSesion(sesionId);
      }
      void refresh();
    } finally {
      setPending(false);
    }
  };

  const abrirDia = useCallback((sesionId: string) => {
    setSesionSeleccionada(sesionId);
    setModalSesionId(sesionId);
    setBloqueEditandoId(null);
    setErrorNuevo(null);
  }, []);

  const abrirDiaParaEscribir = useCallback((sesionId: string) => {
    setSesionSeleccionada(sesionId);
    setModalSesionId(sesionId);
    setBloqueEditandoId(null);
    setErrorNuevo(null);
    setEnfocarManual(true);
  }, []);

  const abrirActividad = useCallback((bloqueId: string, sesionId: string) => {
    setSesionSeleccionada(sesionId);
    setModalSesionId(sesionId);
    setBloqueEditandoId(bloqueId);
    setErrorNuevo(null);
    setEnfocarManual(false);
  }, []);

  useEffect(() => {
    if (!enfocarManual || !modalSesionId) return;
    const t = window.setTimeout(() => {
      manualInputRef.current?.focus();
      setEnfocarManual(false);
    }, 50);
    return () => window.clearTimeout(t);
  }, [enfocarManual, modalSesionId]);

  useEffect(() => {
    if (!modalSesionId || !bloqueEditandoId) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`bloque-anchor-${bloqueEditandoId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [modalSesionId, bloqueEditandoId]);

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id === ACTIVIDAD_PROPIA_DRAG_ID) {
      setActiveDrag({ tipo: 'catalogo', label: 'Actividad propia' });
    } else if (id.startsWith('cat-')) {
      const codigo = id.replace('cat-', '');
      const item = catalogoInicial.find((c) => c.codigo === codigo);
      setActiveDrag({ tipo: 'catalogo', label: item?.nombre ?? 'Actividad' });
    } else if (id.startsWith('blk-')) {
      const bloqueId = id.replace('blk-', '');
      const b = bloques.find((x) => x.id === bloqueId);
      setActiveDrag({ tipo: 'bloque', label: b?.contenido_textual?.slice(0, 40) ?? 'Actividad' });
    } else if (id.startsWith('rec-')) {
      const recursoId = id.replace('rec-', '');
      const r = recursosInventario.find((x) => x.id === recursoId);
      setActiveDrag({ tipo: 'recurso', label: r?.nombre ?? 'Material' });
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDrag(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    const sesionIdDestino = parseSesionDropId(overId);
    if (activeId === ACTIVIDAD_PROPIA_DRAG_ID && sesionIdDestino) {
      setSesionSeleccionada(sesionIdDestino);
      setActividadPropiaSesionId(sesionIdDestino);
      return;
    }

    if (activeId.startsWith('cat-') && sesionIdDestino) {
      const codigo = activeId.replace('cat-', '');
      await agregarDesdeCatalogo(codigo, sesionIdDestino);
      return;
    }

    if (activeId.startsWith('rec-') && sesionIdDestino) {
      const recursoId = activeId.replace('rec-', '');
      await assignRecurso(sesionIdDestino, recursoId);
      return;
    }

    if (activeId.startsWith('blk-')) {
      const bloqueId = activeId.replace('blk-', '');
      const bloque = bloques.find((b) => b.id === bloqueId);
      if (!bloque) return;

      const targetSesionId = parseSesionDropId(overId);
      if (targetSesionId) {
        if (targetSesionId === bloque.sesion_id) return;
        setPending(true);
        const res = await moveBloqueToSesion({
          planeacionId,
          docenteId,
          bloqueId,
          targetSesionId,
        });
        setPending(false);
        if (res.ok) await refresh();
        return;
      }

      if (overId.startsWith('blk-')) {
        const overBloqueId = overId.replace('blk-', '');
        const overBloque = bloques.find((b) => b.id === overBloqueId);
        if (!overBloque || overBloque.sesion_id !== bloque.sesion_id) {
          if (overBloque && overBloque.sesion_id !== bloque.sesion_id) {
            setPending(true);
            const res = await moveBloqueToSesion({
              planeacionId,
              docenteId,
              bloqueId,
              targetSesionId: overBloque.sesion_id,
            });
            setPending(false);
            if (res.ok) await refresh();
          }
          return;
        }
        const sesionBloques = [...(bloquesPorSesion.get(bloque.sesion_id) ?? [])];
        const oldIndex = sesionBloques.findIndex((b) => b.id === bloqueId);
        const newIndex = sesionBloques.findIndex((b) => b.id === overBloqueId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
        const reordered = arrayMove(sesionBloques, oldIndex, newIndex);
        setPending(true);
        const res = await reorderBloquesInSesion({
          planeacionId,
          docenteId,
          sesionId: bloque.sesion_id,
          orderedIds: reordered.map((b) => b.id),
        });
        setPending(false);
        if (res.ok) await refresh();
      }
    }
  };

  const onCrearManual = async () => {
    if (!nuevoTexto.trim()) {
      setErrorNuevo('Escribe la actividad antes de añadir.');
      return;
    }
    const sesionId = actividadPropiaSesionId ?? modalSesionId ?? sesionSeleccionada;
    if (!sesionId) {
      setErrorNuevo('Selecciona un día o sección.');
      return;
    }
    setAdding(true);
    setErrorNuevo(null);
    try {
      const res = await createBloque({
        planeacionId,
        docenteId,
        sesionId,
        contenidoTextual: nuevoTexto.trim(),
        tipo: 'desarrollo',
        nivelFlexibilidad: 'abierto',
      });
      if (!res.ok) {
        setErrorNuevo(res.error ?? 'No se pudo crear la actividad.');
        return;
      }
      setNuevoTexto('');
      setActividadPropiaSesionId(null);
      await refresh();
    } finally {
      setAdding(false);
    }
  };

  const titulo = getTituloSeccionActividades(modalidad);

  const diaSeleccionadoLabel = sesiones.find((s) => s.id === sesionSeleccionada)
    ? etiquetaSesion(sesiones.find((s) => s.id === sesionSeleccionada)!)
    : '—';

  const sesionModal = sesiones.find((s) => s.id === modalSesionId) ?? null;
  const sesionIdCatalogo = modalSesionId ?? sesionSeleccionada;

  const renderCatalogoLista = (
    items: BloqueCatalogo[],
    sesionId: string,
    opts?: { esSugerida?: boolean },
  ) =>
    items.map((item) => (
      <CatalogoCard
        key={item.codigo}
        item={item}
        disabled={pending || !sesionId}
        sugerido={opts?.esSugerida}
        origenIa={opts?.esSugerida && iaActividadesMap.has(item.codigo)}
        razon={opts?.esSugerida ? iaActividadesMap.get(item.codigo) : undefined}
        onAgregar={() => agregarDesdeCatalogo(item.codigo, sesionId)}
      />
    ));

  const renderPanelCatalogo = (sesionId: string, diaLabel: string, compact = false) => {
    const catalogoDetalle = [
      GUIA_CATALOGO.detalle,
      `\nFiltro actual: ${etiquetaFiltro}`,
      workbook?.temaCentro ? `Tema del centro: ${workbook.temaCentro}` : '',
      `Día seleccionado: ${diaLabel}`,
    ]
      .filter(Boolean)
      .join('\n');

    return (
    <>
      {compact ? (
        <div className="flex items-center gap-1.5 border-t pt-3">
          <p className="min-w-0 flex-1 text-xs font-medium">Catálogo NEM</p>
          <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
            {catalogoFiltrado.length}
          </Badge>
          <SectionHelp
            compact
            helpId={GUIA_CATALOGO.id}
            ariaLabel={GUIA_CATALOGO.ariaLabel}
            breve={GUIA_CATALOGO.breve}
            detalle={catalogoDetalle}
          />
        </div>
      ) : (
        <>
          <SectionHelp
            helpId={GUIA_CATALOGO.id}
            ariaLabel={GUIA_CATALOGO.ariaLabel}
            breve={GUIA_CATALOGO.breve}
            detalle={GUIA_CATALOGO.detalle}
          />
          <p
            className="rounded-md border border-nem-verde/20 bg-nem-verde/5 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground"
            data-testid="catalogo-filtro-contexto"
          >
            Filtrado por: <span className="font-medium text-foreground">{etiquetaFiltro}</span>
            {workbook?.temaCentro ? (
              <>
                {' '}
                · tema:{' '}
                <span className="font-medium text-foreground">{workbook.temaCentro}</span>
              </>
            ) : null}
          </p>
        </>
      )}
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <button
          type="button"
          onClick={() => setMostrarTodoCatalogo((v) => !v)}
          className="text-nem-verde underline hover:opacity-80"
        >
          {mostrarTodoCatalogo
            ? 'Ver solo filtradas'
            : `Ver todo (${catalogoInicial.length})`}
        </button>
        {iaEditorState.loading ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin text-nem-verde" />
            IA...
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void analizarEditorConIa()}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title="Re-analizar sugerencias con IA"
          >
            <Sparkles className="h-3 w-3 text-nem-verde" />
            Sugerir IA
          </button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={compact ? 'Buscar actividad…' : 'Filtrar (ej. observación, experimento, naturaleza…)'}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          data-testid="catalogo-busqueda"
        />
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          {catalogoFiltrado.length} actividades · día:{' '}
          <span className="font-medium text-foreground">{diaLabel}</span>
        </p>
      )}
      {catalogoFiltrado.length === 0 ? (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950"
          data-testid="catalogo-vacio"
        >
          <p className="font-medium">No hay plantillas con ese filtro.</p>
          <p className="mt-1 leading-relaxed">
            {esWorkbook
              ? 'Arrastra Actividad propia a un día o limpia el buscador.'
              : 'Elige el día y escribe tu actividad en Escribir actividad propia. También puedes limpiar el buscador.'}
          </p>
        </div>
      ) : (
        <div
          className={`space-y-3 overflow-y-auto pr-1 ${compact ? 'max-h-[min(52dvh,560px)]' : 'max-h-[420px]'}`}
        >
          {catalogoSugeridas.length > 0 && !busqueda.trim() && (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-nem-verde">
                <Sparkles className="h-3 w-3" />
                Sugeridas para tu proyecto
              </p>
              {!compact && (
                <p className="text-[10px] text-muted-foreground">
                  Coinciden con tu proyecto, PDA y campo. Arrastra o pulsa Agregar.
                </p>
              )}
              {renderCatalogoLista(catalogoSugeridas, sesionId, { esSugerida: true })}
            </div>
          )}
          {catalogoResto.length > 0 && (
            <div className="space-y-2">
              {catalogoSugeridas.length > 0 && !busqueda.trim() && (
                <p className="text-[11px] font-medium text-muted-foreground">
                  Más actividades del catálogo
                </p>
              )}
              {renderCatalogoLista(catalogoResto, sesionId)}
            </div>
          )}
        </div>
      )}
    </>
    );
  };

  const panelCatalogo = renderPanelCatalogo(sesionIdCatalogo, diaSeleccionadoLabel, esWorkbook);

  const panelInventario = (
    <>
      {esWorkbook ? (
        <div className="flex items-center gap-1.5">
          <p className="flex-1 text-xs font-medium">Mi aula</p>
          <SectionHelp
            compact
            helpId={GUIA_RECURSOS.id}
            ariaLabel={GUIA_RECURSOS.ariaLabel}
            breve={GUIA_RECURSOS.breve}
            detalle={GUIA_RECURSOS.detalle}
          />
        </div>
      ) : (
        <SectionHelp
          helpId={GUIA_RECURSOS.id}
          ariaLabel={GUIA_RECURSOS.ariaLabel}
          breve={GUIA_RECURSOS.breve}
          detalle={GUIA_RECURSOS.detalle}
        />
      )}
      {recursosInventario.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aún no tienes materiales registrados.{' '}
          {consultaRapida ? (
            <button
              type="button"
              className="text-nem-verde underline"
              onClick={() => consultaRapida.openConsulta('/recursos-aula')}
            >
              Agregar en Recursos del aula
            </button>
          ) : (
            <Link href="/recursos-aula" className="text-nem-verde underline">
              Agregar en Recursos del aula
            </Link>
          )}
        </p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {recursosOrdenados.map(({ item, sugerido, usoSugerido }) => (
            <RecursoInventarioCard
              key={item.id}
              item={item}
              sugerido={sugerido}
              usoSugerido={usoSugerido}
              disabled={pending || !sesionSeleccionada}
              onAgregar={() => assignRecurso(sesionSeleccionada, item.id)}
            />
          ))}
        </div>
      )}
    </>
  );

  const sesionesPorSemana = useMemo(() => {
    if (!esWorkbook || sesiones.length === 0) return null;
    const fechas = sesiones
      .map((s) => fechaDesdeEtiquetaSesion(s.ajustes_sesion))
      .filter((f): f is string => f != null);
    if (fechas.length === 0) return null;
    const semanas = agruparFechasPorSemana(fechas);
    return semanas.map((sem) => ({
      ...sem,
      sesiones: sesiones.filter((s) => {
        const f = fechaDesdeEtiquetaSesion(s.ajustes_sesion);
        return f != null && sem.fechasISO.includes(f);
      }),
    }));
  }, [esWorkbook, sesiones]);

  const renderBloqueCompacto = (b: Bloque) => (
    <ActividadSortable
      key={b.id}
      bloque={b}
      planeacionId={planeacionId}
      docenteId={docenteId}
      cct={cct}
      inventario={recursosInventario}
      esWorkbook={esWorkbook}
      modoCompacto
      onAbrir={() => abrirActividad(b.id, b.sesion_id)}
      onDelete={async () => {
        const res = await deleteBloque({ bloqueId: b.id, docenteId });
        if (res.ok) await refresh();
      }}
      onRefresh={refresh}
      onUsarRecurso={(recursoId) => assignRecurso(b.sesion_id, recursoId)}
    />
  );

  const panelManual = (
    <>
      <label
        htmlFor={esWorkbook ? 'actividad-manual-modal' : 'actividad-manual'}
        className="text-sm font-medium text-nem-verde"
      >
        Escribir actividad propia
      </label>
      <p className="text-[11px] text-muted-foreground">
        {esWorkbook
          ? 'Describe lo que harás este día y pulsa Añadir actividad.'
          : 'Paso 1: elige el día arriba. Paso 2: escribe lo que harás y pulsa Añadir actividad.'}
      </p>
      <Textarea
        ref={manualInputRef}
        id={esWorkbook ? 'actividad-manual-modal' : 'actividad-manual'}
        data-testid="bloque-editor-nuevo"
        value={nuevoTexto}
        onChange={(e) => setNuevoTexto(e.target.value)}
        placeholder="Ej. Contacto con alimentos: Jamaica, zanahoria, col morada. Observar, oler, tocar."
        rows={3}
        disabled={adding}
      />
      {errorNuevo && (
        <p role="alert" className="text-xs text-destructive">
          {errorNuevo}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        onClick={onCrearManual}
        disabled={adding || !(modalSesionId ?? sesionSeleccionada)}
        data-testid="bloque-editor-crear"
      >
        {adding ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-1 h-4 w-4" />
        )}
        Añadir actividad
      </Button>
    </>
  );

  const renderSesionDrop = (s: Sesion) => (
    <div key={s.id} onClick={() => setSesionSeleccionada(s.id)} role="presentation">
      <SesionDropArea
        sesion={s}
        bloques={bloquesPorSesion.get(s.id) ?? []}
        recursos={recursosPorSesion.get(s.id) ?? []}
        planeacionId={planeacionId}
        docenteId={docenteId}
        cct={cct}
        inventario={recursosInventario}
        esWorkbook={esWorkbook}
        momentosOptions={momentosWorkbook}
        onRefresh={refresh}
        onAssignRecurso={assignRecurso}
        onQuitarRecurso={quitarRecurso}
      />
    </div>
  );

  const panelSesiones = esWorkbook ? (
    <div className="space-y-4">
      {bloques.length === 0 && (
        <p
          data-testid="bloque-editor-empty"
          className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
        >
          {getMensajeSinActividades(modalidad)} Pulsa un día del calendario para empezar.
        </p>
      )}
      <WorkbookCalendario
        sesiones={sesiones}
        sesionesPorSemana={sesionesPorSemana}
        bloquesPorSesion={bloquesPorSesion}
        recursosPorSesion={recursosPorSesion}
        sesionSeleccionada={sesionSeleccionada}
        sesionDestacadaId={sesionDestacadaId}
        modalSesionId={modalSesionId}
        rutinasGrupo={rutinasGrupo}
        eventosPorFecha={eventosPorFecha}
        onAbrirDia={abrirDia}
        onAgregarDia={abrirDia}
        renderBloqueCompacto={renderBloqueCompacto}
      />
    </div>
  ) : (
    <div className="space-y-4">
      {sesiones.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sesiones.map((s) => (
            <Button
              key={s.id}
              type="button"
              size="sm"
              variant={sesionSeleccionada === s.id ? 'default' : 'outline'}
              onClick={() => setSesionSeleccionada(s.id)}
            >
              {etiquetaSesion(s)}
            </Button>
          ))}
        </div>
      )}

      {bloques.length === 0 && (
        <p
          data-testid="bloque-editor-empty"
          className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
        >
          {getMensajeSinActividades(modalidad)}
        </p>
      )}

      {sesionesPorSemana
        ? sesionesPorSemana.map((sem) => (
            <div key={sem.clave} className="space-y-2">
              <p className="text-xs font-medium text-nem-verde">{sem.etiqueta}</p>
              {sem.sesiones.map(renderSesionDrop)}
            </div>
          ))
        : sesiones.map(renderSesionDrop)}

      <div
        className="space-y-2 rounded-lg border border-nem-verde/30 bg-nem-verde/5 p-3"
        data-testid="actividad-manual-panel"
      >
        {panelManual}
      </div>
    </div>
  );

  return (
    <Card data-testid="actividades-editor" className={pending ? 'opacity-90' : ''}>
      <CardHeader className={esWorkbook ? 'pb-3' : undefined}>
        {esWorkbook ? (
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{titulo}</CardTitle>
            <SectionHelp
              compact
              helpId={GUIA_ACTIVIDADES.id}
              ariaLabel={GUIA_ACTIVIDADES.ariaLabel}
              breve={GUIA_ACTIVIDADES.breve}
              detalle={`${GUIA_ACTIVIDADES.detalle}\n\n${GUIA_ARRASTRAR.detalle}`}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">{titulo}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{getNotaDragDrop()}</p>
              </div>
              <SectionHelp
                helpId={GUIA_ACTIVIDADES.id}
                ariaLabel={GUIA_ACTIVIDADES.ariaLabel}
                breve={GUIA_ACTIVIDADES.breve}
                detalle={GUIA_ACTIVIDADES.detalle}
              />
            </div>
            <SectionHelp
              helpId={GUIA_ARRASTRAR.id}
              ariaLabel={GUIA_ARRASTRAR.ariaLabel}
              breve={GUIA_ARRASTRAR.breve}
              detalle={GUIA_ARRASTRAR.detalle}
              className="mt-2"
            />
          </>
        )}
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div
            className={
              esWorkbook
                ? 'grid gap-4 xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(220px,260px)]'
                : 'grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr_minmax(200px,240px)]'
            }
            data-testid={esWorkbook ? 'workbook-layout' : 'classic-layout'}
          >
            <aside className="sticky top-[4.5rem] z-10 max-h-[calc(100dvh-5.5rem)] self-start space-y-3 overflow-y-auto rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/85">
              {esWorkbook ? (
                <>
                  <ActividadPropiaCard
                    onEscribir={() =>
                      setActividadPropiaSesionId(sesionSeleccionada || sesiones[0]?.id || null)
                    }
                  />
                  {panelCatalogo}
                </>
              ) : (
                <>
                  <div className="flex gap-1 rounded-md border bg-background p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={panelIzquierdo === 'catalogo' ? 'default' : 'ghost'}
                      className="h-8 flex-1 text-xs"
                      onClick={() => setPanelIzquierdo('catalogo')}
                    >
                      Catálogo NEM
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={panelIzquierdo === 'inventario' ? 'default' : 'ghost'}
                      className="h-8 flex-1 text-xs"
                      onClick={() => setPanelIzquierdo('inventario')}
                    >
                      Mi aula
                    </Button>
                  </div>
                  {panelIzquierdo === 'catalogo' ? panelCatalogo : panelInventario}
                </>
              )}
            </aside>

            <div className="min-w-0 space-y-4">
              {esWorkbook && workbook && (
                <WorkbookHoja ctx={workbook} />
              )}
              {panelSesiones}
            </div>

            <aside className="sticky top-[4.5rem] z-10 max-h-[calc(100dvh-5.5rem)] self-start space-y-4 overflow-y-auto rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <ConsultaRapidaSidebar
                onOpenBiblioteca={() => setBibliotecaOpen(true)}
                onOpenRecursos={() => setRecursosModalOpen(true)}
              />
              {esWorkbook && (
                <>
                  <div className="border-t" />
                  {panelInventario}
                </>
              )}
            </aside>
          </div>

          {esWorkbook && (
            <RutinariasPanel
              rutinas={rutinasGrupo}
              onChangeRutinas={actualizarRutinasGrupo}
            />
          )}

          {esWorkbook && sesionModal && (() => {
            const fechaModal = fechaDesdeEtiquetaSesion(sesionModal.ajustes_sesion);
            const configDia = fechaModal ? (eventosPorFecha[fechaModal] ?? {}) : {};
            const esLunesDia = fechaModal ? esLunes(fechaModal) : false;
            const esCteAuto = fechaModal ? esUltimoViernesDelMes(fechaModal) : false;
            const sinClaseActivo = configDia.sinClase ?? esCteAuto;

            return (
              <DiaActividadModal
                sesion={sesionModal}
                open={modalSesionId != null}
                onOpenChange={(open) => {
                  if (!open) {
                    setModalSesionId(null);
                    setBloqueEditandoId(null);
                  }
                }}
                diaConfigPanel={
                  fechaModal ? (
                    <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3">
                      <div className="space-y-1">
                        <label
                          htmlFor={`tarea-dia-${fechaModal}`}
                          className="text-xs font-medium text-foreground"
                        >
                          TAREA (para casa)
                        </label>
                        <Input
                          id={`tarea-dia-${fechaModal}`}
                          value={configDia.tareaCasa ?? ''}
                          onChange={(e) =>
                            actualizarEventoDia(fechaModal, { tareaCasa: e.target.value })
                          }
                          placeholder="Ej. Traer un recorte de su color favorito o preguntar en casa..."
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={sinClaseActivo}
                            onChange={(e) =>
                              actualizarEventoDia(fechaModal, {
                                sinClase: e.target.checked,
                                motivoSinClase:
                                  e.target.checked && !configDia.motivoSinClase
                                    ? esCteAuto
                                      ? 'Consejo Técnico Escolar (CTE)'
                                      : 'Suspensión de clases'
                                    : configDia.motivoSinClase,
                              })
                            }
                            className="h-3.5 w-3.5 accent-amber-600"
                          />
                          <span>Día sin clase (CTE / Suspensión)</span>
                        </label>

                        {esLunesDia && (
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(configDia.ocultarHonores)}
                              onChange={(e) =>
                                actualizarEventoDia(fechaModal, {
                                  ocultarHonores: e.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5 accent-nem-verde"
                            />
                            <span>Ocultar Honores a la bandera</span>
                          </label>
                        )}
                      </div>

                      {sinClaseActivo && (
                        <Input
                          value={
                            configDia.motivoSinClase ??
                            (esCteAuto ? 'Consejo Técnico Escolar (CTE)' : '')
                          }
                          onChange={(e) =>
                            actualizarEventoDia(fechaModal, {
                              motivoSinClase: e.target.value,
                            })
                          }
                          placeholder="Motivo (ej. Consejo Técnico Escolar, Reunión sindical...)"
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  ) : null
                }
                actividadesPanel={
                  <SesionDropArea
                    sesion={sesionModal}
                    bloques={bloquesPorSesion.get(sesionModal.id) ?? []}
                    recursos={recursosPorSesion.get(sesionModal.id) ?? []}
                    planeacionId={planeacionId}
                    docenteId={docenteId}
                    cct={cct}
                    inventario={recursosInventario}
                    esWorkbook={esWorkbook}
                    momentosOptions={momentosWorkbook}
                    droppableId={`ses-modal-${sesionModal.id}`}
                    sinEncabezado
                    bloqueEditandoId={bloqueEditandoId}
                    onRefresh={refresh}
                    onAssignRecurso={assignRecurso}
                    onQuitarRecurso={quitarRecurso}
                  />
                }
              />
            );
          })()}

          {esWorkbook && (
            <Dialog
              open={actividadPropiaSesionId != null}
              onOpenChange={(open) => {
                if (!open) {
                  setActividadPropiaSesionId(null);
                  setErrorNuevo(null);
                }
              }}
            >
              <DialogContent className="max-w-md" data-testid="actividad-propia-modal">
                <DialogHeader>
                  <DialogTitle className="text-base text-nem-verde">
                    Nueva actividad propia
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Escribe una actividad personalizada y elige el día donde se agregará.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="actividad-propia-dia-select"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Día de la planeación
                    </label>
                    <select
                      id="actividad-propia-dia-select"
                      value={actividadPropiaSesionId ?? ''}
                      onChange={(e) => setActividadPropiaSesionId(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                    >
                      {sesiones.map((s) => (
                        <option key={s.id} value={s.id}>
                          {etiquetaSesion(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">{panelManual}</div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <DragOverlay dropAnimation={null}>
            {activeDrag ? (
              <div className="rounded-md border border-nem-verde/40 bg-background px-3 py-2 text-sm shadow-lg ring-2 ring-nem-verde/30">
                {activeDrag.label}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <Dialog open={bibliotecaOpen} onOpenChange={setBibliotecaOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Library className="h-4 w-4 text-nem-verde" />
                Textos y libros sugeridos para tu proyecto
              </DialogTitle>
              <DialogDescription className="text-xs">
                Referencias oficiales de CONALITEG seleccionadas por afinidad con tu planeación.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
              {iaEditorState.loading && librosSugeridos.length === 0 ? (
                <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-nem-verde" />
                  Buscando textos y libros afines con IA...
                </div>
              ) : librosSugeridos.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground">
                  No se encontraron sugerencias específicas aún. Puedes explorar la biblioteca completa.
                </p>
              ) : (
                librosSugeridos.map(({ ref, razon }) => (
                  <div
                    key={ref.id}
                    className="rounded-lg border border-nem-verde/30 bg-nem-verde/5 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium">{ref.titulo_libro}</p>
                      <Badge variant="verde" className="gap-1 text-[10px]">
                        <Sparkles className="h-2.5 w-2.5" />
                        Sugerido
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ref.grado} · {ref.campo}
                    </p>
                    {razon && (
                      <p className="mt-1.5 text-xs text-nem-verde">{razon}</p>
                    )}
                    <div className="mt-2">
                      <a
                        href={ref.url_publica}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-nem-verde underline"
                      >
                        Abrir libro en CONALITEG
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setBibliotecaOpen(false);
                  consultaRapida?.openConsulta('/biblioteca');
                }}
              >
                Ver biblioteca completa
              </Button>
              <Button type="button" size="sm" onClick={() => setBibliotecaOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={recursosModalOpen} onOpenChange={setRecursosModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-nem-verde" />
                Recursos del aula
              </DialogTitle>
              <DialogDescription className="text-xs">
                Todos tus materiales registrados; los sugeridos aparecen primero con su uso recomendado para el día ({diaSeleccionadoLabel}).
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {recursosOrdenados.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground">
                  Aún no tienes materiales registrados en tu aula.
                </p>
              ) : (
                recursosOrdenados.map(({ item, sugerido, usoSugerido }) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 text-sm ${
                      sugerido ? 'border-nem-verde/40 bg-nem-verde/5' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium">
                            {emojiCategoriaRecurso(item.categoria)} {item.nombre}
                          </p>
                          {sugerido && (
                            <Badge variant="verde" className="gap-1 text-[10px]">
                              <Sparkles className="h-2.5 w-2.5" />
                              Sugerido
                            </Badge>
                          )}
                        </div>
                        {usoSugerido ? (
                          <p className="mt-1 text-xs text-nem-verde">
                            Actividad / uso sugerido: {usoSugerido}
                          </p>
                        ) : (
                          item.uso && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.uso}</p>
                          )
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={sugerido ? 'default' : 'outline'}
                        disabled={pending || !sesionSeleccionada}
                        onClick={() => assignRecurso(sesionSeleccionada, item.id)}
                        className="shrink-0 text-xs"
                      >
                        Agregar al día
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setRecursosModalOpen(false);
                  consultaRapida?.openConsulta('/recursos-aula');
                }}
              >
                Administrar en Recursos del aula
              </Button>
              <Button type="button" size="sm" onClick={() => setRecursosModalOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
