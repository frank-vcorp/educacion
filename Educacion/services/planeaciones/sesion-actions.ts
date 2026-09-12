'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  generarSesionesWorkbook,
  resolverWorkbookConfig,
  type WorkbookMetadata,
} from '@/lib/planeaciones/tipo-workbook';

export interface Sesion {
  id: string;
  planeacion_id: string;
  numero: number;
  fase_interna: string;
  ajustes_sesion: string | null;
  estado: string;
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
 * Garantiza sesiones según contrato workbook (modalidad + alcance + fechas).
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
    .select('id, docente_id, cct, modalidad, metadata, periodo_inicio, periodo_fin, periodo_tipo')
    .eq('id', planeacionId)
    .maybeSingle();
  if (errPlane) return { ok: false, data: null, error: errPlane.message };
  if (!planeacion) return { ok: false, data: null, error: 'Planeación no encontrada' };
  if (planeacion.docente_id !== docenteId) {
    return { ok: false, data: null, error: 'La planeación no pertenece al docente' };
  }

  const metadata = (planeacion.metadata ?? {}) as {
    modalidad_data?: Record<string, unknown>;
    workbook?: Partial<WorkbookMetadata>;
  };
  const modalidadData = metadata.modalidad_data ?? {};
  const workbookMeta = metadata.workbook ?? null;

  const config = resolverWorkbookConfig({
    modalidad: planeacion.modalidad,
    workbookMetadata: workbookMeta,
  });

  const sesionesSemana =
    modalidadData.sesiones_semana &&
    typeof modalidadData.sesiones_semana === 'object' &&
    !Array.isArray(modalidadData.sesiones_semana)
      ? (modalidadData.sesiones_semana as Record<string, string>)
      : undefined;

  let rows = generarSesionesWorkbook({
    config,
    planeacionId,
    docenteId,
    cct: planeacion.cct,
    periodoInicio: String(planeacion.periodo_inicio),
    periodoFin: String(planeacion.periodo_fin),
    sesionesSemanaWizard: sesionesSemana,
  });

  if (rows.length === 0) {
    rows = [
      {
        planeacion_id: planeacionId,
        docente_id: docenteId,
        cct: planeacion.cct,
        numero: 1,
        fase_interna: 'desarrollo',
        ajustes_sesion: 'Actividades de la planeación',
        estado: 'pendiente',
      },
    ];
  }

  const { error: errInsert } = await supabase.from('sesion').insert(rows);
  if (errInsert) return { ok: false, data: null, error: errInsert.message };

  return getSesiones(planeacionId);
}
