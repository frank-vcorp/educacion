'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

export interface Sesion {
  id: string;
  planeacion_id: string;
  numero: number;
  fase_interna: string;
  ajustes_sesion: string | null;
  estado: string;
}

function faseParaNumero(numero: number): 'inicio' | 'desarrollo' | 'cierre' {
  if (numero <= 1) return 'inicio';
  if (numero >= 5) return 'cierre';
  return 'desarrollo';
}

function tituloDia(key: string, titulo?: string): string {
  const labels: Record<string, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
  };
  const dia = labels[key] ?? key;
  return titulo?.trim() ? `${dia}: ${titulo.trim()}` : dia;
}

export async function getSesiones(
  planeacionId: string,
): Promise<{ ok: boolean; data: Sesion[] | null; error?: string }> {
  const parsed = z.string().uuid().safeParse(planeacionId);
  if (!parsed.success) {
    return { ok: false, data: null, error: 'planeacionId inválido' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sesion')
    .select('id, planeacion_id, numero, fase_interna, ajustes_sesion, estado')
    .eq('planeacion_id', planeacionId)
    .order('numero', { ascending: true });
  if (error) return { ok: false, data: null, error: error.message };
  return { ok: true, data: (data ?? []) as Sesion[] };
}

/**
 * Garantiza al menos una sesión editable. Si la planeación es unidad didáctica
 * y el wizard guardó `sesiones_semana`, crea L–V; si no, una sesión única.
 */
export async function ensureSesionesForPlaneacion(
  planeacionId: string,
  docenteId: string,
): Promise<{ ok: boolean; data: Sesion[] | null; error?: string }> {
  const existing = await getSesiones(planeacionId);
  if (!existing.ok) return existing;
  if (existing.data && existing.data.length > 0) {
    return existing;
  }

  const supabase = await createClient();
  const { data: planeacion, error: errPlane } = await supabase
    .from('planeacion')
    .select('id, docente_id, cct, modalidad, metadata')
    .eq('id', planeacionId)
    .maybeSingle();
  if (errPlane) return { ok: false, data: null, error: errPlane.message };
  if (!planeacion) return { ok: false, data: null, error: 'Planeación no encontrada' };
  if (planeacion.docente_id !== docenteId) {
    return { ok: false, data: null, error: 'La planeación no pertenece al docente' };
  }

  const modalidadData =
    ((planeacion.metadata as { modalidad_data?: Record<string, unknown> } | null)
      ?.modalidad_data ?? {}) as Record<string, unknown>;
  const sesionesSemana = modalidadData.sesiones_semana;
  const rows: Array<{
    planeacion_id: string;
    docente_id: string;
    cct: string;
    numero: number;
    fase_interna: string;
    ajustes_sesion: string | null;
    estado: string;
  }> = [];

  if (
    planeacion.modalidad === 'unidad_didactica' &&
    sesionesSemana &&
    typeof sesionesSemana === 'object' &&
    !Array.isArray(sesionesSemana)
  ) {
    DIAS_ORDEN.forEach((dia, idx) => {
      const titulo =
        typeof (sesionesSemana as Record<string, unknown>)[dia] === 'string'
          ? ((sesionesSemana as Record<string, string>)[dia] ?? '')
          : '';
      rows.push({
        planeacion_id: planeacionId,
        docente_id: docenteId,
        cct: planeacion.cct,
        numero: idx + 1,
        fase_interna: faseParaNumero(idx + 1),
        ajustes_sesion: tituloDia(dia, titulo),
        estado: 'pendiente',
      });
    });
  }

  if (rows.length === 0) {
    rows.push({
      planeacion_id: planeacionId,
      docente_id: docenteId,
      cct: planeacion.cct,
      numero: 1,
      fase_interna: 'desarrollo',
      ajustes_sesion: 'Actividades de la planeación',
      estado: 'pendiente',
    });
  }

  const { error: errInsert } = await supabase.from('sesion').insert(rows);
  if (errInsert) return { ok: false, data: null, error: errInsert.message };

  return getSesiones(planeacionId);
}
