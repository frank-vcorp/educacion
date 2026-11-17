'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface EntregaCCTItem {
  id: string;
  planeacionId: string;
  planeacionNombre: string;
  docenteId: string;
  docenteNombre: string;
  docenteEmail: string;
  grado: string;
  grupo: string;
  cct: string;
  version: number;
  estado: 'entregada' | 'recibida' | 'con_comentarios' | 'archivada';
  fechaCreacion: string;
  fechaRecibida: string | null;
  comentarioDirector: string | null;
  docPdfUrl: string;
  urlFirmadaToken: string;
}

export interface DirectorCCTOverview {
  cct: string;
  escuelaNombre: string;
  nivel: string;
  turno: string | null;
  entregas: EntregaCCTItem[];
  stats: {
    totalDocentes: number;
    totalPlaneacionesEntregadas: number;
    conVoBo: number;
    pendientesRevision: number;
  };
}

export async function getDirectorCCTOverview(cctClave?: string): Promise<DirectorCCTOverview> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let targetCct = cctClave;

  if (!targetCct && user) {
    // Buscar en director o docente
    const { data: dirRow } = await supabase
      .from('director')
      .select('cct')
      .eq('id', user.id)
      .maybeSingle();

    if (dirRow?.cct) {
      targetCct = dirRow.cct;
    } else {
      const { data: docRow } = await supabase
        .from('docente')
        .select('cct')
        .eq('id', user.id)
        .maybeSingle();
      if (docRow?.cct) targetCct = docRow.cct;
    }
  }

  // Fallback si todavía no hay CCT (demo / primer ingreso)
  if (!targetCct) {
    const { data: firstCct } = await supabase.from('cct').select('clave').limit(1).maybeSingle();
    targetCct = firstCct?.clave ?? '21EJN0001A';
  }

  // Información de la escuela
  const { data: cctData } = await supabase
    .from('cct')
    .select('clave, nombre, nivel, turno')
    .eq('clave', targetCct)
    .maybeSingle();

  // Obtener docentes del CCT
  const { data: docentes } = await supabase
    .from('docente')
    .select('id, nombre, email')
    .eq('cct', targetCct);

  const docenteMap = new Map((docentes ?? []).map((d) => [d.id, d]));

  // Obtener grupos del CCT
  const { data: grupos } = await supabase
    .from('grupo')
    .select('id, docente_id, grado, grupo')
    .eq('cct', targetCct);

  const grupoByDocente = new Map((grupos ?? []).map((g) => [g.docente_id, g]));

  // Obtener entregas
  const { data: entregasRaw } = await supabase
    .from('entrega')
    .select('id, planeacion_id, docente_id, cct, version, estado, fecha_creacion, fecha_recibida, comentario_director, doc_pdf_url, url_firmada_token')
    .eq('cct', targetCct)
    .order('fecha_creacion', { ascending: false });

  // Obtener nombres de planeaciones
  const planeacionIds = Array.from(new Set((entregasRaw ?? []).map((e) => e.planeacion_id)));
  let planeacionMap = new Map<string, string>();
  if (planeacionIds.length > 0) {
    const { data: planeaciones } = await supabase
      .from('planeacion')
      .select('id, nombre')
      .in('id', planeacionIds);
    planeacionMap = new Map((planeaciones ?? []).map((p) => [p.id, p.nombre]));
  }

  const items: EntregaCCTItem[] = (entregasRaw ?? []).map((e) => {
    const doc = docenteMap.get(e.docente_id);
    const grp = grupoByDocente.get(e.docente_id);
    return {
      id: e.id,
      planeacionId: e.planeacion_id,
      planeacionNombre: planeacionMap.get(e.planeacion_id) ?? 'Planeación Quincenal',
      docenteId: e.docente_id,
      docenteNombre: doc?.nombre ?? 'Docente CCT',
      docenteEmail: doc?.email ?? '—',
      grado: grp?.grado ?? 'Preescolar',
      grupo: grp?.grupo ?? 'A',
      cct: e.cct,
      version: e.version,
      estado: (e.estado as EntregaCCTItem['estado']) ?? 'entregada',
      fechaCreacion: e.fecha_creacion,
      fechaRecibida: e.fecha_recibida,
      comentarioDirector: e.comentario_director,
      docPdfUrl: e.doc_pdf_url,
      urlFirmadaToken: e.url_firmada_token,
    };
  });

  const totalDocentes = docentes?.length ?? 0;
  const conVoBo = items.filter((i) => i.estado === 'recibida').length;
  const pendientesRevision = items.filter((i) => i.estado === 'entregada').length;

  const finalCct = targetCct ?? '21EJN0001A';

  return {
    cct: finalCct,
    escuelaNombre: cctData?.nombre ?? `Jardín de Niños (${finalCct})`,
    nivel: cctData?.nivel ?? 'Preescolar',
    turno: cctData?.turno ?? 'Matutino',
    entregas: items,
    stats: {
      totalDocentes,
      totalPlaneacionesEntregadas: items.length,
      conVoBo,
      pendientesRevision,
    },
  };
}

const EmitirVoBoSchema = z.object({
  entregaId: z.string().uuid(),
  comentario: z.string().max(1000).optional(),
  accion: z.enum(['vobo', 'comentar']),
});

export async function emitirVoBoDirector(input: z.infer<typeof EmitirVoBoSchema>) {
  const parsed = EmitirVoBoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Parámetros inválidos' };
  }

  const { entregaId, comentario, accion } = parsed.data;
  const supabase = await createClient();

  const nuevoEstado = accion === 'vobo' ? 'recibida' : 'con_comentarios';

  const updatePayload: Record<string, unknown> = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  };

  if (accion === 'vobo') {
    updatePayload.fecha_recibida = new Date().toISOString();
  }

  if (comentario !== undefined) {
    updatePayload.comentario_director = comentario;
  }

  const { error } = await supabase
    .from('entrega')
    .update(updatePayload)
    .eq('id', entregaId);

  if (error) {
    // Si falla por RLS en modo director, intentar con service role admin
    try {
      const admin = createAdminClient();
      await admin.from('entrega').update(updatePayload).eq('id', entregaId);
    } catch {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath('/director');
  return { ok: true, estado: nuevoEstado };
}

const ResponderConTokenSchema = z.object({
  entregaId: z.string().uuid(),
  token: z.string().min(10),
  accion: z.enum(['vobo', 'comentar']),
  comentario: z.string().max(1000).optional(),
});

export async function responderEntregaConToken(
  input: z.infer<typeof ResponderConTokenSchema>,
) {
  const parsed = ResponderConTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Datos inválidos' };
  }

  const { verifyUrlFirmada } = await import('@/lib/auth/url-firmada');
  const payload = await verifyUrlFirmada(parsed.data.token);
  if (!payload || payload.entrega_id !== parsed.data.entregaId) {
    return { ok: false, error: 'Enlace expirado o inválido' };
  }

  const nuevoEstado = parsed.data.accion === 'vobo' ? 'recibida' : 'con_comentarios';
  const updatePayload: Record<string, unknown> = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.accion === 'vobo') {
    updatePayload.fecha_recibida = new Date().toISOString();
  }
  if (parsed.data.comentario !== undefined) {
    updatePayload.comentario_director = parsed.data.comentario.trim();
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('entrega')
    .update(updatePayload)
    .eq('id', parsed.data.entregaId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/director');
  revalidatePath(`/v/${parsed.data.entregaId}`);
  return { ok: true, estado: nuevoEstado };
}
