/**
 * Componente modal ágil para Pase de Lista Lúdico con Sugerencias Pedagógicas Diarias.
 * Permite a la educadora seleccionar/rotar dinámicas por Campo Formativo NEM y
 * pasar lista en <30 segundos usando toggles/chips rápidos.
 */
'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CATALOGO_DINAMICAS_PASE_LISTA,
  obtenerSugerenciaDinamica,
  inicializarAsistencia,
  calcularResumenAsistencia,
  generarTextoBitacoraAsistencia,
  type CampoFormativoId,
  type DinamicaPaseLista,
  type RegistroAsistenciaAlumno,
  type EstadoAsistencia,
} from '@/lib/asistencia/pase-lista-ludico';
import {
  Sparkles,
  Users,
  Shuffle,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  ClipboardList,
  Loader2,
} from 'lucide-react';

export interface PaseListaLudicoModalProps {
  alumnos: Array<{ id: string; nombre: string }>;
  fecha?: string;
  onRegistrarEnBitacora?: (textoResumen: string) => void;
  triggerButton?: React.ReactNode;
}

const CAMPOS_TABS: Array<{ id: CampoFormativoId | 'todos'; label: string }> = [
  { id: 'todos', label: 'Todos los Campos' },
  { id: 'lenguajes', label: 'Lenguajes' },
  { id: 'saberes_pensamiento_cientifico', label: 'Saberes y Pensamiento' },
  { id: 'etica_naturaleza_sociedades', label: 'Ética y Naturaleza' },
  { id: 'de_lo_humano_comunitario', label: 'De lo Humano' },
];

export function PaseListaLudicoModal({
  alumnos,
  fecha = new Date().toISOString().slice(0, 10),
  onRegistrarEnBitacora,
  triggerButton,
}: PaseListaLudicoModalProps) {
  const [open, setOpen] = useState(false);
  const [campoFiltro, setCampoFiltro] = useState<CampoFormativoId | 'todos'>('todos');
  const [dinamicaActual, setDinamicaActual] = useState<DinamicaPaseLista>(
    () => CATALOGO_DINAMICAS_PASE_LISTA[0]!,
  );
  const [registros, setRegistros] = useState<RegistroAsistenciaAlumno[]>(() =>
    inicializarAsistencia(alumnos),
  );
  const [copiado, setCopiado] = useState(false);
  const [agregadoBitacora, setAgregadoBitacora] = useState(false);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [iaAviso, setIaAviso] = useState<string | null>(null);
  const [titulosIaVistos, setTitulosIaVistos] = useState<string[]>([]);

  // Si la lista de alumnos externa cambia y los registros están vacíos, sincronizar
  React.useEffect(() => {
    if (registros.length === 0 && alumnos.length > 0) {
      setRegistros(inicializarAsistencia(alumnos));
    }
  }, [alumnos, registros.length]);

  const handleRotarDinamica = () => {
    setIaAviso(null);
    const filtro = campoFiltro === 'todos' ? undefined : campoFiltro;
    const listaFiltrada = filtro
      ? CATALOGO_DINAMICAS_PASE_LISTA.filter((d) => d.campo === filtro)
      : CATALOGO_DINAMICAS_PASE_LISTA;

    const idxActual = listaFiltrada.findIndex((d) => d.id === dinamicaActual.id);
    const siguiente = obtenerSugerenciaDinamica(filtro, idxActual >= 0 ? idxActual : 0);
    setDinamicaActual(siguiente);
  };

  const handleCambiarFiltroCampo = (nuevoCampo: CampoFormativoId | 'todos') => {
    setIaAviso(null);
    setCampoFiltro(nuevoCampo);
    const filtro = nuevoCampo === 'todos' ? undefined : nuevoCampo;
    setDinamicaActual(obtenerSugerenciaDinamica(filtro));
  };

  const handleGenerarConIa = async () => {
    if (generandoIa) return;
    setGenerandoIa(true);
    setIaAviso(null);
    try {
      const res = await fetch('/api/asistencia/ia/dinamica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campo: campoFiltro,
          excluirTitulos: [dinamicaActual.titulo, ...titulosIaVistos].slice(-10),
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setIaAviso(
          errBody?.error?.message ?? 'No se pudo contactar a la IA; usando catálogo.',
        );
        handleRotarDinamica();
        return;
      }
      const data = (await res.json()) as {
        dinamica?: DinamicaPaseLista;
        origen?: 'ia' | 'catalogo';
      };
      if (data.dinamica) {
        setDinamicaActual(data.dinamica);
        if (data.origen === 'ia') {
          setTitulosIaVistos((prev) => [...prev.slice(-9), data.dinamica!.titulo]);
        } else {
          setIaAviso('IA no disponible en este momento; se sugirió una del catálogo.');
        }
      }
    } catch {
      setIaAviso('Error de red con IA; se sugirió una del catálogo.');
      handleRotarDinamica();
    } finally {
      setGenerandoIa(false);
    }
  };

  const handleSetEstado = (alumnoId: string, nuevoEstado: EstadoAsistencia) => {
    setRegistros((prev) =>
      prev.map((reg) =>
        reg.alumnoId === alumnoId ? { ...reg, estado: nuevoEstado } : reg,
      ),
    );
  };

  const handleMarcarTodos = (estado: EstadoAsistencia) => {
    setRegistros((prev) => prev.map((reg) => ({ ...reg, estado })));
  };

  const resumen = useMemo(() => calcularResumenAsistencia(registros), [registros]);

  const ausentesNombres = useMemo(
    () => registros.filter((r) => r.estado === 'ausente').map((r) => r.alumnoNombre),
    [registros],
  );

  const textoResumen = useMemo(
    () =>
      generarTextoBitacoraAsistencia({
        fecha,
        dinamica: dinamicaActual,
        resumen,
        ausentesNombres,
      }),
    [fecha, dinamicaActual, resumen, ausentesNombres],
  );

  const handleCopiarResumen = async () => {
    try {
      await navigator.clipboard.writeText(textoResumen);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      console.error('Error al copiar resumen de asistencia:', e);
    }
  };

  const handleAgregarABitacora = () => {
    if (onRegistrarEnBitacora) {
      onRegistrarEnBitacora(textoResumen);
      setAgregadoBitacora(true);
      setTimeout(() => setAgregadoBitacora(false), 2500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-nem-verde/40 text-nem-verde hover:bg-nem-verde/10"
          >
            <Sparkles className="w-4 h-4 text-nem-verde" />
            <span>Pase de Lista Lúdico</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl text-nem-verde flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-nem-verde" />
              Pase de Lista Lúdico
            </DialogTitle>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-800 border-green-200">
              {fecha}
            </Badge>
          </div>
          <DialogDescription>
            Conecta el pase de lista con un momento pedagógico por Campo Formativo NEM y registra la asistencia en menos de 30 segundos.
          </DialogDescription>
        </DialogHeader>

        {/* Tarjeta de Sugerencia Lúdica */}
        <div className="p-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-green-50/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="Icono dinámica">
                {dinamicaActual.icono}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-wide uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {dinamicaActual.campoNombre}
                  </span>
                  {dinamicaActual.origen === 'ia' && (
                    <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                      ✨ Generada con IA
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 leading-snug mt-0.5">
                  {dinamicaActual.titulo}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotarDinamica}
                disabled={generandoIa}
                className="h-8 text-xs flex items-center gap-1.5 bg-white border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-medium"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Sugerir otra dinámica</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerarConIa}
                disabled={generandoIa}
                className="h-8 text-xs flex items-center gap-1.5 bg-white border-purple-300 hover:bg-purple-50 text-purple-800 font-medium"
              >
                {generandoIa ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{generandoIa ? 'Creando...' : 'Crear con IA'}</span>
              </Button>
            </div>
          </div>

          {iaAviso && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              {iaAviso}
            </p>
          )}

          <div className="bg-white/80 p-3 rounded-lg border border-emerald-100/80 text-xs text-gray-800 space-y-1.5">
            <p>
              <strong className="text-emerald-900">Consigna para los niños:</strong>{' '}
              {dinamicaActual.consigna}
            </p>
            <p className="text-muted-foreground italic">
              {dinamicaActual.ejemplo}
            </p>
          </div>

          {/* Filtros de campo formativo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
            <span className="text-[11px] text-gray-500 font-semibold whitespace-nowrap mr-1">
              Filtrar campo:
            </span>
            {CAMPOS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCambiarFiltroCampo(tab.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                  campoFiltro === tab.id
                    ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen de Asistencia y Acciones Colectivas */}
        <div className="bg-gray-50 p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              <Users className="w-4 h-4 text-nem-verde" />
              Total: {resumen.total}
            </span>
            <span className="text-green-700 font-medium">
              🟢 {resumen.presentes} presentes
            </span>
            <span className="text-red-700 font-medium">
              🔴 {resumen.ausentes} ausentes
            </span>
            <span className="text-amber-700 font-medium">
              🟡 {resumen.retardos} retardos
            </span>
            <Badge variant="outline" className="bg-white font-bold text-nem-verde border-nem-verde/30">
              {resumen.porcentajeAsistencia}% Asistencia
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleMarcarTodos('presente')}
              className="h-7 text-[11px] px-2"
            >
              Todos Presentes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopiarResumen}
              className="h-7 text-[11px] px-2 flex items-center gap-1 text-gray-700"
            >
              {copiado ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiado ? '¡Copiado!' : 'Copiar Resumen'}</span>
            </Button>
            {onRegistrarEnBitacora && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAgregarABitacora}
                className="h-7 text-[11px] px-2 flex items-center gap-1 text-nem-verde border-nem-verde/40 bg-white hover:bg-green-50"
              >
                <ClipboardList className="w-3 h-3" />
                <span>{agregadoBitacora ? '¡Agregado a nota!' : 'Anotar en Bitácora'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Alumnos con Toggle Chips Rápidos (< 30s) */}
        <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto divide-y divide-gray-100">
          {registros.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No hay alumnos registrados en el grupo seleccionado.
            </div>
          ) : (
            registros.map((reg, index) => {
              const isPresente = reg.estado === 'presente';
              const isAusente = reg.estado === 'ausente';
              const isRetardo = reg.estado === 'retardo';

              return (
                <div
                  key={reg.alumnoId}
                  className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                    isAusente ? 'bg-red-50/40 text-gray-500' : isRetardo ? 'bg-amber-50/30' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-mono text-gray-400 w-5 text-right">
                      {index + 1}.
                    </span>
                    <span
                      className={`font-medium truncate ${
                        isAusente ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {reg.alumnoNombre}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Chip Presente */}
                    <button
                      type="button"
                      aria-label={`Presente: ${reg.alumnoNombre}`}
                      onClick={() => handleSetEstado(reg.alumnoId, 'presente')}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold text-[11px] transition-all ${
                        isPresente
                          ? 'bg-green-600 text-white shadow-sm ring-1 ring-green-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Presente</span>
                    </button>

                    {/* Chip Ausente */}
                    <button
                      type="button"
                      aria-label={`Ausente: ${reg.alumnoNombre}`}
                      onClick={() => handleSetEstado(reg.alumnoId, 'ausente')}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold text-[11px] transition-all ${
                        isAusente
                          ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-800'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Ausente</span>
                    </button>

                    {/* Chip Retardo */}
                    <button
                      type="button"
                      aria-label={`Retardo: ${reg.alumnoNombre}`}
                      onClick={() => handleSetEstado(reg.alumnoId, 'retardo')}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold text-[11px] transition-all ${
                        isRetardo
                          ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-800'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Retardo</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Barra Flotante / Sticky Counter inferior para celulares y pantallas pequeñas (P2-UI-01) */}
        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-emerald-200/80 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-semibold text-gray-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-nem-verde" />
                <span className="font-bold">{resumen.total}</span>
              </span>
              <span className="text-green-700 font-medium">
                🟢 {resumen.presentes}
              </span>
              <span className="text-red-700 font-medium">
                🔴 {resumen.ausentes}
              </span>
              {resumen.retardos > 0 && (
                <span className="text-amber-700 font-medium hidden sm:inline">
                  🟡 {resumen.retardos}
                </span>
              )}
              <Badge variant="outline" className="bg-emerald-50 text-nem-verde border-nem-verde/40 font-bold text-[11px] px-1.5 h-5">
                {resumen.porcentajeAsistencia}%
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleMarcarTodos('presente')}
                className="h-7 text-[11px] px-2 text-emerald-800 border-emerald-200 hover:bg-emerald-50"
              >
                Todos Presentes
              </Button>
              {onRegistrarEnBitacora && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAgregarABitacora}
                  className="h-7 text-[11px] px-2 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1"
                >
                  <ClipboardList className="w-3 h-3" />
                  <span>{agregadoBitacora ? '¡Guardado!' : 'Anotar'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
