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
import { GripVertical, Plus, Save, Loader2, Trash2, Search, PenLine } from 'lucide-react';
import type { BloqueCatalogo } from '@/services/catalogo/catalogo';
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
import {
  agruparFechasPorSemana,
  fechaDesdeEtiquetaSesion,
} from '@/lib/planeaciones/calendario-periodo';
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

function ActividadPropiaCard() {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ACTIVIDAD_PROPIA_DRAG_ID,
    data: { type: 'actividad_propia' },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid="actividad-propia-card"
      className={`rounded-lg border-2 border-nem-verde/40 bg-nem-verde/10 p-2.5 shadow-sm ${
        isDragging ? 'opacity-40' : ''
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
            Arrastra a un día del calendario para escribirla (como en tu Word).
          </p>
        </div>
      </div>
    </div>
  );
}

function CatalogoCard({
  item,
  onAgregar,
  disabled,
}: {
  item: BloqueCatalogo;
  onAgregar: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cat-${item.codigo}`,
    data: { type: 'catalogo', codigo: item.codigo },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`catalogo-item-${item.codigo}`}
      className={`rounded-md border bg-background p-2 text-sm shadow-sm ${
        isDragging ? 'opacity-40' : ''
      }`}
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
          <p className="font-medium leading-snug">{item.nombre}</p>
          {item.descripcion && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {item.descripcion}
            </p>
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
}: {
  item: RecursoInventarioItem;
  onAgregar: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `rec-${item.id}`,
    data: { type: 'recurso', recursoId: item.id },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`recurso-item-${item.id}`}
      className={`rounded-md border bg-background p-2 text-sm ${isDragging ? 'opacity-40' : ''}`}
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
          <p className="font-medium leading-snug">
            {emojiCategoriaRecurso(item.categoria)} {item.nombre}
          </p>
          <p className="text-xs text-muted-foreground">{item.uso}</p>
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
              Observación / evidencias
            </label>
            <Textarea
              id={`obs-${bloque.id}`}
              defaultValue={bloque.observacion ?? ''}
              rows={2}
              className="mt-1 text-xs"
              placeholder="Qué observaste, evidencias, ajustes…"
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
  workbook = null,
}: ActividadesEditorProps) {
  const esWorkbook = usaWorkbookLayout(modalidad) && workbook != null;
  const momentosWorkbook = useMemo(
    () => (esWorkbook ? getSeccionesGuia(modalidad) : []),
    [esWorkbook, modalidad],
  );
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [bloques, setBloques] = useState<Bloque[]>(bloquesIniciales);
  const [sesiones] = useState<Sesion[]>(sesionesIniciales);
  const [recursosAsignados, setRecursosAsignados] = useState(recursosAsignadosInicial);
  const [panelIzquierdo, setPanelIzquierdo] = useState<'catalogo' | 'inventario'>('catalogo');
  const [busqueda, setBusqueda] = useState('');
  const [sesionSeleccionada, setSesionSeleccionada] = useState(sesionesIniciales[0]?.id ?? '');
  const [modalSesionId, setModalSesionId] = useState<string | null>(null);
  const [bloqueEditandoId, setBloqueEditandoId] = useState<string | null>(null);
  const [enfocarManual, setEnfocarManual] = useState(false);
  const manualInputRef = useRef<HTMLTextAreaElement>(null);
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    tipo: 'catalogo' | 'bloque' | 'recurso';
    label: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

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

  const catalogoFiltrado = useMemo(() => {
    const filtrados = filtrarBloquesCatalogo(catalogoInicial, {
      modalidad,
      camposFormativos,
      gradoPreescolar,
      pdaGradoPorCodigo,
      busqueda,
    });
    return ordenarBloquesPorContexto(filtrados, contextoCatalogo);
  }, [
    catalogoInicial,
    camposFormativos,
    modalidad,
    gradoPreescolar,
    pdaGradoPorCodigo,
    busqueda,
    contextoCatalogo,
  ]);

  const catalogoSugeridas = useMemo(
    () =>
      catalogoFiltrado.filter(
        (b) => puntuarBloqueCatalogo(b, contextoCatalogo) > 0,
      ),
    [catalogoFiltrado, contextoCatalogo],
  );

  const catalogoResto = useMemo(() => {
    if (catalogoSugeridas.length === 0) return catalogoFiltrado;
    const sugeridasSet = new Set(catalogoSugeridas.map((b) => b.codigo));
    return catalogoFiltrado.filter((b) => !sugeridasSet.has(b.codigo));
  }, [catalogoFiltrado, catalogoSugeridas]);

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
      await refresh();
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
      abrirDiaParaEscribir(sesionIdDestino);
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
    const sesionId = modalSesionId ?? sesionSeleccionada;
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

  const renderCatalogoLista = (items: BloqueCatalogo[], sesionId: string) =>
    items.map((item) => (
      <CatalogoCard
        key={item.codigo}
        item={item}
        disabled={pending || !sesionId}
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
              <p className="text-[11px] font-semibold text-nem-verde">
                Sugeridas para tu centro
              </p>
              {!compact && (
                <p className="text-[10px] text-muted-foreground">
                  Coinciden con tus PDA, campo y tema. Arrastra o pulsa Agregar.
                </p>
              )}
              {renderCatalogoLista(catalogoSugeridas, sesionId)}
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
          <Link href="/recursos-aula" className="text-nem-verde underline">
            Agregar en Recursos del aula
          </Link>
        </p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {recursosInventario.map((item) => (
            <RecursoInventarioCard
              key={item.id}
              item={item}
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
        modalSesionId={modalSesionId}
        onAbrirDia={abrirDia}
        onAgregarDia={abrirDiaParaEscribir}
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
                : 'grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]'
            }
            data-testid={esWorkbook ? 'workbook-layout' : 'classic-layout'}
          >
            <aside className="sticky top-[4.5rem] z-10 max-h-[calc(100dvh-5.5rem)] self-start space-y-3 overflow-y-auto rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/85">
              {esWorkbook ? (
                <>
                  <ActividadPropiaCard />
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

            {esWorkbook && (
              <aside className="sticky top-[4.5rem] z-10 max-h-[calc(100dvh-5.5rem)] self-start space-y-3 overflow-y-auto rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/85">
                {panelInventario}
              </aside>
            )}
          </div>

          {esWorkbook && <RutinariasPanel />}

          {esWorkbook && sesionModal && (
            <DiaActividadModal
              sesion={sesionModal}
              open={modalSesionId != null}
              onOpenChange={(open) => {
                if (!open) {
                  setModalSesionId(null);
                  setBloqueEditandoId(null);
                }
              }}
              manualPanel={panelManual}
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
          )}

          <DragOverlay>
            {activeDrag ? (
              <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
                {activeDrag.label}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
