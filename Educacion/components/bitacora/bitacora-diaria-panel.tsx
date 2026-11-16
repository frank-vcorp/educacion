/**
 * Panel de Bitácora Diaria y Registro de Notas por Alumno.
 * Flujo C (<1 minuto de captura diaria).
 * - Selector de día/actividad (sesión).
 * - Nota general: participación (1-5 estrellas/caritas) y dificultades/reflexión pedagógica.
 * - Notas por alumno: semáforo (1=🟢 Logrado, 2=🟡 Con apoyo, 3=🟠 Apoyo constante, 4=🔴 Requiere apoyo) y observación cualitativa.
 */
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  upsertBitacora,
  upsertEvaluacion,
} from '@/services/evaluacion/evaluacion-actions';
import { PaseListaLudicoModal } from '@/components/asistencia/pase-lista-ludico-modal';
import { Star, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface SesionOption {
  id: string;
  numero: number;
  ajustes_sesion: string | null;
  fase_interna?: string;
  bloques?: Array<{ id: string; contenido_textual: string; momento?: string | null }>;
}

export interface AlumnoItem {
  id: string;
  nombre: string;
}

export interface BitacoraRow {
  id?: string;
  sesion_id: string;
  fecha: string;
  participacion_grupo: number;
  actividad_mejor_bloque_id?: string | null;
  dificultades?: string | null;
  evidencia_url?: string | null;
}

export interface EvaluacionRow {
  id?: string;
  alumno_id: string;
  sesion_id?: string | null;
  nivel: number;
  pda_codigo?: string | null;
  observaciones?: string | null;
  fecha: string;
}

interface BitacoraDiariaPanelProps {
  planeacionId: string;
  docenteId: string;
  cct: string;
  pdas: string[];
  sesiones: SesionOption[];
  alumnos: AlumnoItem[];
  bitacorasIniciales: BitacoraRow[];
  evaluacionesIniciales: EvaluacionRow[];
}

const CARITAS = [
  { nivel: 1, label: 'Muy baja', emoji: '😞' },
  { nivel: 2, label: 'Baja', emoji: '😐' },
  { nivel: 3, label: 'Media', emoji: '🙂' },
  { nivel: 4, label: 'Buena', emoji: '😄' },
  { nivel: 5, label: 'Excelente', emoji: '🤩' },
];

const SEMAFORO = [
  { nivel: 1, label: 'Logrado', badgeClass: 'bg-green-100 text-green-800 border-green-300', emoji: '🟢' },
  { nivel: 2, label: 'Con apoyo', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300', emoji: '🟡' },
  { nivel: 3, label: 'Apoyo constante', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300', emoji: '🟠' },
  { nivel: 4, label: 'Requiere apoyo', badgeClass: 'bg-red-100 text-red-800 border-red-300', emoji: '🔴' },
];

export function BitacoraDiariaPanel({
  planeacionId,
  docenteId,
  cct,
  pdas,
  sesiones,
  alumnos,
  bitacorasIniciales,
  evaluacionesIniciales,
}: BitacoraDiariaPanelProps) {
  const [selectedSesionId, setSelectedSesionId] = useState<string>(
    sesiones[0]?.id || '',
  );
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Buscar bitácora para la sesión seleccionada
  const activeBitacora = bitacorasIniciales.find(
    (b) => b.sesion_id === selectedSesionId,
  );

  const [fecha, setFecha] = useState<string>(
    activeBitacora?.fecha || new Date().toISOString().slice(0, 10),
  );
  const [participacion, setParticipacion] = useState<number>(
    activeBitacora?.participacion_grupo || 4,
  );
  const [mejorBloqueId, setMejorBloqueId] = useState<string | null>(
    activeBitacora?.actividad_mejor_bloque_id || null,
  );
  const [dificultades, setDificultades] = useState<string>(
    activeBitacora?.dificultades || '',
  );

  // Evaluaciones mapa: alumnoId -> { nivel, observaciones }
  const [evaluacionesMap, setEvaluacionesMap] = useState<
    Record<string, { nivel: number; observaciones: string }>
  >(() => {
    const map: Record<string, { nivel: number; observaciones: string }> = {};
    for (const al of alumnos) {
      const match = evaluacionesIniciales.find(
        (e) => e.alumno_id === al.id && (e.sesion_id === selectedSesionId || !e.sesion_id),
      );
      if (match) {
        map[al.id] = {
          nivel: match.nivel,
          observaciones: match.observaciones || '',
        };
      }
    }
    return map;
  });

  const selectedSesion = sesiones.find((s) => s.id === selectedSesionId);

  const handleSesionChange = (newSesionId: string) => {
    setSelectedSesionId(newSesionId);
    const bitacora = bitacorasIniciales.find((b) => b.sesion_id === newSesionId);
    if (bitacora) {
      setFecha(bitacora.fecha);
      setParticipacion(bitacora.participacion_grupo);
      setMejorBloqueId(bitacora.actividad_mejor_bloque_id || null);
      setDificultades(bitacora.dificultades || '');
    } else {
      setParticipacion(4);
      setMejorBloqueId(null);
      setDificultades('');
    }

    const map: Record<string, { nivel: number; observaciones: string }> = {};
    for (const al of alumnos) {
      const match = evaluacionesIniciales.find(
        (e) => e.alumno_id === al.id && (e.sesion_id === newSesionId || !e.sesion_id),
      );
      if (match) {
        map[al.id] = {
          nivel: match.nivel,
          observaciones: match.observaciones || '',
        };
      }
    }
    setEvaluacionesMap(map);
  };

  const handleNivelChange = (alumnoId: string, nivel: number) => {
    setEvaluacionesMap((prev) => ({
      ...prev,
      [alumnoId]: {
        nivel,
        observaciones: prev[alumnoId]?.observaciones || '',
      },
    }));
  };

  const handleObservacionChange = (alumnoId: string, obs: string) => {
    setEvaluacionesMap((prev) => ({
      ...prev,
      [alumnoId]: {
        nivel: prev[alumnoId]?.nivel || 1,
        observaciones: obs,
      },
    }));
  };

  const handleGuardarTodo = () => {
    if (!selectedSesionId) return;

    startTransition(async () => {
      try {
        // 1. Guardar Bitácora General
        const bitacoraRes = await upsertBitacora({
          planeacionId,
          sesionId: selectedSesionId,
          docenteId,
          cct,
          fecha,
          participacionGrupo: participacion,
          actividadMejorBloqueId: mejorBloqueId || null,
          dificultades: dificultades || null,
        });

        if (!bitacoraRes.ok) {
          setSaveStatus('error');
          return;
        }

        // 2. Guardar Notas por Alumno
        const pdaCodigo = pdas[0] || undefined;
        for (const [alumnoId, data] of Object.entries(evaluacionesMap)) {
          if (data.nivel) {
            await upsertEvaluacion({
              planeacionId,
              sesionId: selectedSesionId,
              alumnoId,
              docenteId,
              cct,
              nivel: data.nivel,
              pdaCodigo,
              observaciones: data.observaciones || undefined,
              fecha,
            });
          }
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (e) {
        console.error('Error al guardar bitácora:', e);
        setSaveStatus('error');
      }
    });
  };

  return (
    <div className="space-y-6" data-testid="bitacora-diaria-panel">
      {/* Selector de Sesión / Día */}
      <Card className="border-nem-verde/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-nem-verde font-semibold">
                Registro del Día / Sesión
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona la actividad o momento del día a registrar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PaseListaLudicoModal
                alumnos={alumnos}
                fecha={fecha}
                onRegistrarEnBitacora={(resumenTexto) => {
                  setDificultades((prev) =>
                    prev ? `${prev}\n\n${resumenTexto}` : resumenTexto,
                  );
                }}
              />
              <div className="flex items-center gap-2">
                <label htmlFor="fecha-sesion" className="text-sm font-medium">
                  Fecha:
                </label>
                <Input
                  id="fecha-sesion"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-40 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md">
            <Select value={selectedSesionId} onValueChange={handleSesionChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar sesión..." />
              </SelectTrigger>
              <SelectContent>
                {sesiones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Sesión {s.numero}: {s.ajustes_sesion || `Actividad del día`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Nota General de la Actividad */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Nota general de la actividad
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Reflexión pedagógica ágil (&lt;30 segundos) sobre la respuesta del grupo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Participación del grupo:
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {CARITAS.map((c) => {
                const isSelected = participacion === c.nivel;
                return (
                  <button
                    key={c.nivel}
                    type="button"
                    onClick={() => setParticipacion(c.nivel)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-nem-verde bg-nem-verde/10 text-nem-verde ring-2 ring-nem-verde/30 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSesion?.bloques && selectedSesion.bloques.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Actividad con mejor respuesta pedagógica (opcional):
              </label>
              <Select
                value={mejorBloqueId || 'none'}
                onValueChange={(val) => setMejorBloqueId(val === 'none' ? null : val)}
              >
                <SelectTrigger className="w-full max-w-lg">
                  <SelectValue placeholder="Selecciona la actividad destacada..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna en específico</SelectItem>
                  {selectedSesion.bloques.map((b, idx) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.momento ? `[${b.momento}] ` : `Actividad ${idx + 1}: `}
                      {b.contenido_textual.slice(0, 60)}
                      {b.contenido_textual.length > 60 ? '...' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label htmlFor="dificultades" className="text-sm font-medium mb-1 block">
              Dificultades encontradas o reflexión pedagógica:
            </label>
            <Textarea
              id="dificultades"
              placeholder="¿Qué dificultades surgieron? ¿Qué ajustes se realizaron sobre la marcha?"
              value={dificultades}
              onChange={(e) => setDificultades(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sección de Notas por Alumno */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Notas y Valoración por Alumno ({alumnos.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Semáforo rápido de 4 niveles y anotación cualitativa.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>🟢 Logrado</span>
              <span>•</span>
              <span>🟡 Con apoyo</span>
              <span>•</span>
              <span>🟠 Apoyo constante</span>
              <span>•</span>
              <span>🔴 Requiere apoyo</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alumnos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                No hay alumnos registrados en este grupo.
              </p>
            ) : (
              alumnos.map((alumno) => {
                const evalData = evaluacionesMap[alumno.id];
                const currentNivel = evalData?.nivel;

                return (
                  <div
                    key={alumno.id}
                    className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="font-medium text-sm text-gray-900 md:w-1/4">
                      {alumno.nombre}
                    </div>

                    {/* Semáforo 4 niveles */}
                    <div className="flex items-center gap-1.5 md:w-auto">
                      {SEMAFORO.map((s) => {
                        const isSelected = currentNivel === s.nivel;
                        return (
                          <button
                            key={s.nivel}
                            type="button"
                            onClick={() => handleNivelChange(alumno.id, s.nivel)}
                            title={s.label}
                            className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1 transition-all ${
                              isSelected
                                ? `${s.badgeClass} ring-2 ring-offset-1 font-semibold shadow-xs`
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <span>{s.emoji}</span>
                            <span className="hidden sm:inline">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Observación cualitativa rápida */}
                    <div className="md:w-1/3">
                      <Input
                        placeholder="Observación cualitativa (opcional)..."
                        value={evalData?.observaciones || ''}
                        onChange={(e) =>
                          handleObservacionChange(alumno.id, e.target.value)
                        }
                        className="h-8 text-xs bg-white"
                        maxLength={500}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Acciones de Guardado */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
              <CheckCircle className="w-4 h-4" />
              Bitácora y notas guardadas correctamente
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm font-medium text-red-700 bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
              <AlertCircle className="w-4 h-4" />
              Ocurrió un error al guardar.
            </span>
          )}
        </div>

        <Button
          onClick={handleGuardarTodo}
          disabled={isPending || !selectedSesionId}
          className="bg-nem-verde hover:bg-nem-verde/90 text-white min-w-[140px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Bitácora'
          )}
        </Button>
      </div>
    </div>
  );
}
