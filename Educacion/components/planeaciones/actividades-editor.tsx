'use client';

/**
 * Editor de actividades con drag-and-drop desde catálogo M1 hacia sesiones/días.
 * Incluye guías contextuales en lenguaje de docente (Tía Lola).
 */
import { useMemo, useState, useTransition, useCallback, type ReactNode } from 'react';
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
import { GripVertical, Plus, Save, Loader2, Trash2, Search } from 'lucide-react';
import type { BloqueCatalogo } from '@/services/catalogo/catalogo';
import type { Sesion } from '@/services/planeaciones/sesion-actions';
import {
  getBloques,
  createBloque,
  createBloqueFromCatalogo,
  reorderBloquesInSesion,
  moveBloqueToSesion,
  deleteBloque,
  type Bloque,
} from '@/services/planeaciones/bloque-actions';
import { updateBloque } from '@/services/planeaciones/update-actions';
import { IASugerenciaPanel } from '@/components/ia/ia-sugerencia-panel';
import {
  getMensajeSinActividades,
  getNotaDragDrop,
  getTituloSeccionActividades,
  etiquetaSesion,
  type Modalidad,
} from '@/lib/planeaciones/modalidad-ui';
import {
  GUIA_ACTIVIDADES,
  GUIA_CATALOGO,
  GUIA_ARRASTRAR,
} from '@/lib/planeaciones/guias';

const TIPO_LABEL: Record<string, string> = {
  apertura: 'Inicio',
  desarrollo: 'Desarrollo',
  practica: 'Práctica',
  cierre: 'Cierre',
  evaluacion: 'Evaluación',
  evaluacion_semanal: 'Evaluación semanal',
  banco_palabras: 'Banco de palabras',
};

export interface ActividadesEditorProps {
  planeacionId: string;
  docenteId: string;
  cct: string;
  modalidad: Modalidad;
  camposFormativos: string[];
  bloquesIniciales: Bloque[];
  sesionesIniciales: Sesion[];
  catalogoInicial: BloqueCatalogo[];
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

function ActividadSortable({
  bloque,
  planeacionId,
  docenteId,
  cct,
  onDelete,
  onRefresh,
}: {
  bloque: Bloque;
  planeacionId: string;
  docenteId: string;
  cct: string;
  onDelete: () => void;
  onRefresh: () => void;
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  return (
    <div
      ref={setNodeRef}
      style={style}
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
        <p className="whitespace-pre-wrap text-sm">{bloque.contenido_textual}</p>
      )}

      <div className="mt-3 space-y-2 border-t pt-2">
        <IASugerenciaPanel
          planeacionId={planeacionId}
          docenteId={docenteId}
          cct={cct}
          bloqueId={bloque.id}
          textoBase={bloque.contenido_textual ?? ''}
          feature="F1"
          varianteTipo="rural"
          label="Variante de actividad (F1)"
        />
        <IASugerenciaPanel
          planeacionId={planeacionId}
          docenteId={docenteId}
          cct={cct}
          bloqueId={bloque.id}
          textoBase={bloque.contenido_textual ?? ''}
          feature="F2"
          f2Accion="expandir"
          label="Ayuda a redactar (F2)"
        />
      </div>
    </div>
  );
}

function SesionZona({
  sesion,
  bloques,
  isOver,
  setNodeRef,
  children,
}: {
  sesion: Sesion;
  bloques: Bloque[];
  isOver: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
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
          Suelta aquí tu actividad (arrastra del catálogo o escribe abajo).
        </p>
      ) : null}
      {children}
    </div>
  );
}

function SesionDropArea({
  sesion,
  bloques,
  planeacionId,
  docenteId,
  cct,
  onRefresh,
}: {
  sesion: Sesion;
  bloques: Bloque[];
  planeacionId: string;
  docenteId: string;
  cct: string;
  onRefresh: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `ses-${sesion.id}`,
    data: { type: 'sesion', sesionId: sesion.id },
  });
  const ids = bloques.map((b) => `blk-${b.id}`);

  const onDelete = async (bloqueId: string) => {
    const res = await deleteBloque({ bloqueId, docenteId });
    if (res.ok) onRefresh();
  };

  return (
    <SesionZona sesion={sesion} bloques={bloques} isOver={isOver} setNodeRef={setNodeRef}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {bloques.map((b) => (
            <ActividadSortable
              key={b.id}
              bloque={b}
              planeacionId={planeacionId}
              docenteId={docenteId}
              cct={cct}
              onDelete={() => onDelete(b.id)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </SortableContext>
    </SesionZona>
  );
}

export function ActividadesEditor({
  planeacionId,
  docenteId,
  cct,
  modalidad,
  camposFormativos,
  bloquesIniciales,
  sesionesIniciales,
  catalogoInicial,
}: ActividadesEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [bloques, setBloques] = useState<Bloque[]>(bloquesIniciales);
  const [sesiones] = useState<Sesion[]>(sesionesIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [sesionSeleccionada, setSesionSeleccionada] = useState(sesionesIniciales[0]?.id ?? '');
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<{ tipo: 'catalogo' | 'bloque'; label: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return catalogoInicial.filter((b) => {
      if (camposFormativos.length > 0) {
        const matchCampo = b.campos_formativos.some((c) => camposFormativos.includes(c));
        if (!matchCampo) return false;
      }
      if (b.modalidades_compatibles.length > 0 && !b.modalidades_compatibles.includes(modalidad)) {
        return false;
      }
      if (!q) return true;
      return (
        b.nombre.toLowerCase().includes(q) ||
        (b.descripcion ?? '').toLowerCase().includes(q) ||
        b.codigo.toLowerCase().includes(q)
      );
    });
  }, [catalogoInicial, camposFormativos, modalidad, busqueda]);

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

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith('cat-')) {
      const codigo = id.replace('cat-', '');
      const item = catalogoInicial.find((c) => c.codigo === codigo);
      setActiveDrag({ tipo: 'catalogo', label: item?.nombre ?? 'Actividad' });
    } else if (id.startsWith('blk-')) {
      const bloqueId = id.replace('blk-', '');
      const b = bloques.find((x) => x.id === bloqueId);
      setActiveDrag({ tipo: 'bloque', label: b?.contenido_textual?.slice(0, 40) ?? 'Actividad' });
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDrag(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    if (activeId.startsWith('cat-') && overId.startsWith('ses-')) {
      const codigo = activeId.replace('cat-', '');
      const sesionId = overId.replace('ses-', '');
      await agregarDesdeCatalogo(codigo, sesionId);
      return;
    }

    if (activeId.startsWith('blk-')) {
      const bloqueId = activeId.replace('blk-', '');
      const bloque = bloques.find((b) => b.id === bloqueId);
      if (!bloque) return;

      if (overId.startsWith('ses-')) {
        const targetSesionId = overId.replace('ses-', '');
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
    if (!sesionSeleccionada) {
      setErrorNuevo('Selecciona un día o sección.');
      return;
    }
    setAdding(true);
    setErrorNuevo(null);
    try {
      const res = await createBloque({
        planeacionId,
        docenteId,
        sesionId: sesionSeleccionada,
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

  return (
    <Card data-testid="actividades-editor" className={pending ? 'opacity-90' : ''}>
      <CardHeader>
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
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
            {/* Catálogo */}
            <aside className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div>
                <h3 className="text-sm font-semibold">Catálogo de actividades</h3>
                <SectionHelp
                  helpId={GUIA_CATALOGO.id}
                  ariaLabel={GUIA_CATALOGO.ariaLabel}
                  breve={GUIA_CATALOGO.breve}
                  detalle={GUIA_CATALOGO.detalle}
                  className="mt-1"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar actividad…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  data-testid="catalogo-busqueda"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {catalogoFiltrado.length} actividades · día seleccionado para
                &quot;Agregar&quot;:{' '}
                {sesiones.find((s) => s.id === sesionSeleccionada)
                  ? etiquetaSesion(sesiones.find((s) => s.id === sesionSeleccionada)!)
                  : '—'}
              </p>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {catalogoFiltrado.map((item) => (
                  <CatalogoCard
                    key={item.codigo}
                    item={item}
                    disabled={pending || !sesionSeleccionada}
                    onAgregar={() => agregarDesdeCatalogo(item.codigo, sesionSeleccionada)}
                  />
                ))}
                {catalogoFiltrado.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay actividades para tus filtros. Prueba otra búsqueda.
                  </p>
                )}
              </div>
            </aside>

            {/* Sesiones / días */}
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

              {sesiones.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSesionSeleccionada(s.id)}
                  role="presentation"
                >
                  <SesionDropArea
                    sesion={s}
                    bloques={bloquesPorSesion.get(s.id) ?? []}
                    planeacionId={planeacionId}
                    docenteId={docenteId}
                    cct={cct}
                    onRefresh={refresh}
                  />
                </div>
              ))}

              <div className="space-y-2 border-t pt-3">
                <label htmlFor="actividad-manual" className="text-xs font-medium">
                  Escribir actividad propia
                </label>
                <Textarea
                  id="actividad-manual"
                  data-testid="bloque-editor-nuevo"
                  value={nuevoTexto}
                  onChange={(e) => setNuevoTexto(e.target.value)}
                  placeholder="Ej. Tintura con café, picnic de amigos, entrevista a compañeros…"
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
                  disabled={adding || !sesionSeleccionada}
                  data-testid="bloque-editor-crear"
                >
                  {adding ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  Añadir actividad
                </Button>
              </div>
            </div>
          </div>

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
