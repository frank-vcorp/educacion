/**
 * Server component: contenido del Dialog "Entrevista inicial" para un alumno.
 * SPEC_TEC_09 §7: la UI se renderiza dentro del modal de la fila del alumno (v2).
 *
 * - Carga la entrevista existente (si la hay) antes de abrir el modal.
 * - Aplica el gate A1 (aviso aceptado) en server-side.
 * - Renderiza el client form `EntrevistaInicialForm` con el contrato v2
 *   (3 bloques + directorio).
 */
import { getEntrevista } from '@/services/alumnos/entrevista-actions';
import { EntrevistaInicialForm } from '@/components/alumnos/entrevista-inicial-form';
import type {
  Directorio,
  EstadoEntrevista,
  RespuestasV2,
} from '@/types/entrevista';

interface Props {
  alumnoId: string;
  alumnoNombre: string;
  alumnoGrado: string;
  avisoAceptado: boolean;
  onSaved?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export async function EntrevistaDialogContent({
  alumnoId,
  alumnoNombre,
  alumnoGrado,
  avisoAceptado,
  onSaved,
  onError,
}: Props) {
  // getEntrevista valida RLS + ownership server-side. Si el alumno no es
  // accesible, devolvemos un fallback controlado.
  const res = await getEntrevista(alumnoId);
  const initial =
    res.ok && res.data
      ? {
          fecha_aplicacion: res.data.fecha_aplicacion,
          estado: res.data.estado as EstadoEntrevista,
          respuestas: res.data.respuestas as RespuestasV2,
          directorio: res.data.directorio as Directorio,
        }
      : null;

  return (
    <EntrevistaInicialForm
      alumno={{ id: alumnoId, nombre: alumnoNombre, grado: alumnoGrado }}
      initial={initial}
      avisoAceptado={avisoAceptado}
      onSaved={onSaved}
      onError={onError}
    />
  );
}