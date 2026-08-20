'use client';

/**
 * `BloqueEditor` — editor mínimo de bloques para la unidad UI F1/F2/F3.
 * SPEC_TEC_08 §4.1 + IMPL-20260820-01.
 *
 * Lista los bloques de la planeación (cargados server-side) y permite:
 *  - Crear un bloque mínimo (texto_base) → `createBloque` server action.
 *  - Editar inline `contenido_textual` → `updateBloque` server action (PATCH
 *    post-IA o edición manual de la maestra; ambos soportados).
 *  - Por bloque, expone los paneles F1 (Variante) y F2 (Ayuda a redactar)
 *    instanciando `IASugerenciaPanel`.
 *
 * Caso borde MVP: planeación sin bloques → botón "Añadir bloque" que
 * llama `createBloque`. `createBloque` se encarga de auto-crear una sesión
 * por defecto si la planeación no tiene (decisión reversible SOFIA
 * documentada en `services/planeaciones/bloque-actions.ts`).
 *
 * P-PD9 preservado: la sugerencia de la IA NO autocompleta el bloque. La
 * maestra debe pulsar "Aceptar" en el panel para persistirla.
 */
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Loader2 } from 'lucide-react';
import {
  getBloques,
  createBloque,
  type Bloque,
} from '@/services/planeaciones/bloque-actions';
import { updateBloque } from '@/services/planeaciones/update-actions';
import { IASugerenciaPanel } from '@/components/ia/ia-sugerencia-panel';

export interface BloqueEditorProps {
  planeacionId: string;
  docenteId: string;
  cct: string;
  bloquesIniciales: Bloque[];
}

export function BloqueEditor({
  planeacionId,
  docenteId,
  cct,
  bloquesIniciales,
}: BloqueEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [bloques, setBloques] = useState<Bloque[]>(bloquesIniciales);
  const [adding, setAdding] = useState(false);
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
  // Edición inline por bloqueId: { texto, guardando, error }.
  const [editState, setEditState] = useState<
    Record<string, { texto: string; guardando: boolean; error: string | null }>
  >({});

  const onCrear = async () => {
    if (nuevoTexto.trim().length === 0) {
      setErrorNuevo('Escribe el contenido del bloque antes de añadir.');
      return;
    }
    setAdding(true);
    setErrorNuevo(null);
    try {
      const res = await createBloque({
        planeacionId,
        docenteId,
        contenidoTextual: nuevoTexto.trim(),
        tipo: 'desarrollo',
        nivelFlexibilidad: 'abierto',
      });
      if (!res.ok) {
        setErrorNuevo(res.error ?? 'No se pudo crear el bloque.');
        return;
      }
      setNuevoTexto('');
      // Re-fetch para refrescar la lista con el nuevo bloque (RLS-ok).
      const refreshed = await getBloques(planeacionId);
      if (refreshed.ok && refreshed.data) {
        setBloques(refreshed.data);
      } else {
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setErrorNuevo((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const onEditar = async (bloqueId: string) => {
    const ed = editState[bloqueId];
    if (!ed) return;
    if (ed.texto.trim().length === 0) {
      setEditState((prev) => ({
        ...prev,
        [bloqueId]: { ...prev[bloqueId]!, error: 'El contenido no puede estar vacío.' },
      }));
      return;
    }
    setEditState((prev) => ({
      ...prev,
      [bloqueId]: { ...prev[bloqueId]!, guardando: true, error: null },
    }));
    try {
      const res = await updateBloque({
        bloqueId,
        docenteId,
        contenidoTextual: ed.texto.trim(),
        // Edición manual sin IA → origen sigue siendo 'maestra' (no es PATCH
        // post-IA; mantenemos el invariante de provenance).
        origen: 'maestra_editado_de_ia',
      });
      if (!res.ok) {
        setEditState((prev) => ({
          ...prev,
          [bloqueId]: { ...prev[bloqueId]!, guardando: false, error: res.error ?? 'No se pudo guardar.' },
        }));
        return;
      }
      // Actualización local optimista + refresh router.
      setBloques((prev) =>
        prev.map((b) =>
          b.id === bloqueId
            ? { ...b, contenido_textual: ed.texto.trim() }
            : b,
        ),
      );
      setEditState((prev) => ({
        ...prev,
        [bloqueId]: { texto: ed.texto, guardando: false, error: null },
      }));
      startTransition(() => router.refresh());
    } catch (err) {
      setEditState((prev) => ({
        ...prev,
        [bloqueId]: {
          ...prev[bloqueId]!,
          guardando: false,
          error: (err as Error).message,
        },
      }));
    }
  };

  const startEdit = (b: Bloque) => {
    setEditState((prev) => ({
      ...prev,
      [b.id]: {
        texto: b.contenido_textual ?? '',
        guardando: false,
        error: null,
      },
    }));
  };

  return (
    <Card data-testid="bloque-editor">
      <CardHeader>
        <CardTitle className="text-base">Bloques</CardTitle>
        <p className="text-xs text-muted-foreground">
          Lista mínima de bloques para activar F1 y F2. El editor completo
          con drag-drop del catálogo M1 es alcance de Fase 2.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {bloques.length === 0 && (
          <p
            data-testid="bloque-editor-empty"
            className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
          >
            Esta planeación aún no tiene bloques. Añade uno para habilitar
            las sugerencias F1 y F2.
          </p>
        )}

        <div className="space-y-3">
          {bloques.map((b) => {
            const ed = editState[b.id];
            const editing = ed !== undefined;
            return (
              <div
                key={b.id}
                data-testid={`bloque-${b.id}`}
                className="space-y-2 rounded-md border bg-background p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="capitalize">
                      {b.tipo.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {b.nivel_flexibilidad.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      origen: {b.origen}
                    </Badge>
                  </div>
                  {!editing && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(b)}
                      data-testid={`bloque-${b.id}-editar`}
                    >
                      Editar
                    </Button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-2">
                    <Textarea
                      data-testid={`bloque-${b.id}-texto`}
                      value={ed.texto}
                      onChange={(e) =>
                        setEditState((prev) => ({
                          ...prev,
                          [b.id]: { ...prev[b.id]!, texto: e.target.value },
                        }))
                      }
                      rows={4}
                      disabled={ed.guardando}
                    />
                    {ed.error && (
                      <p
                        role="alert"
                        data-testid={`bloque-${b.id}-error`}
                        className="text-xs text-destructive"
                      >
                        {ed.error}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onEditar(b.id)}
                        disabled={ed.guardando}
                        data-testid={`bloque-${b.id}-guardar`}
                      >
                        {ed.guardando ? (
                          <>
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            Guardando…
                          </>
                        ) : (
                          <>
                            <Save className="mr-1 h-4 w-4" />
                            Guardar
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditState((prev) => {
                            const next = { ...prev };
                            delete next[b.id];
                            return next;
                          })
                        }
                        disabled={ed.guardando}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    data-testid={`bloque-${b.id}-contenido`}
                    className="whitespace-pre-wrap text-sm"
                  >
                    {b.contenido_textual ?? (
                      <span className="italic text-muted-foreground">
                        (sin contenido)
                      </span>
                    )}
                  </p>
                )}

                {/* Paneles F1 + F2 por bloque. F3 vive en la cabecera de la
                    planeación (instanciado por la page.tsx). */}
                <div className="space-y-3 pt-2">
                  <IASugerenciaPanel
                    planeacionId={planeacionId}
                    docenteId={docenteId}
                    cct={cct}
                    bloqueId={b.id}
                    textoBase={b.contenido_textual ?? ''}
                    feature="F1"
                    varianteTipo="rural"
                    label="Variante de bloque (F1)"
                  />
                  <IASugerenciaPanel
                    planeacionId={planeacionId}
                    docenteId={docenteId}
                    cct={cct}
                    bloqueId={b.id}
                    textoBase={b.contenido_textual ?? ''}
                    feature="F2"
                    f2Accion="expandir"
                    label="Ayuda a redactar (F2)"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t pt-3">
          <label
            htmlFor="bloque-editor-nuevo"
            className="text-xs font-medium"
          >
            Añadir bloque
          </label>
          <Textarea
            id="bloque-editor-nuevo"
            data-testid="bloque-editor-nuevo"
            value={nuevoTexto}
            onChange={(e) => setNuevoTexto(e.target.value)}
            placeholder="Escribe el texto base del bloque…"
            rows={3}
            disabled={adding}
          />
          {errorNuevo && (
            <p
              role="alert"
              data-testid="bloque-editor-error"
              className="text-xs text-destructive"
            >
              {errorNuevo}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onCrear}
            disabled={adding}
            data-testid="bloque-editor-crear"
          >
            {adding ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Añadiendo…
              </>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />
                Añadir bloque
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}