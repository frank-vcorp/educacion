/**
 * Vista de Bitácora / Diario de Clase y Notas por Alumno de la Planeación.
 * Permite a la educadora capturar en <1 minuto la bitácora del día y notas individuales de sus alumnos.
 */
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { getPlaneacion } from '@/services/planeaciones/planeacion-actions';
import { ensureSesionesForPlaneacion } from '@/services/planeaciones/sesion-actions';
import { getBloques } from '@/services/planeaciones/bloque-actions';
import {
  listEvaluaciones,
  listBitacorasPorPlaneacion,
} from '@/services/evaluacion/evaluacion-actions';
import { BitacoraDiariaPanel } from '@/components/bitacora/bitacora-diaria-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Printer } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BitacoraPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession();
  if (!session || !session.docenteId || !session.cct) redirect('/login');

  const planeacionRes = await getPlaneacion(params.id);
  if (!planeacionRes.ok || !planeacionRes.data) notFound();

  const planeacion = planeacionRes.data;
  if (planeacion.docente_id !== session.docenteId) redirect('/planeaciones');

  const supabase = await createClient();

  // Asegurar sesiones y traer bloques, alumnos, bitácoras y evaluaciones
  const [sesionesRes, bloquesRes, { data: alumnosRaw }, bitacorasRes, evaluacionesRes] =
    await Promise.all([
      ensureSesionesForPlaneacion(planeacion.id, session.docenteId),
      getBloques(planeacion.id).catch(() => ({ ok: false, data: [] })),
      planeacion.grupo_id
        ? supabase
            .from('alumno')
            .select('id, nombre')
            .eq('grupo_id', planeacion.grupo_id)
            .eq('activo', true)
            .order('nombre', { ascending: true })
        : Promise.resolve({ data: [] }),
      listBitacorasPorPlaneacion(planeacion.id),
      listEvaluaciones(planeacion.id),
    ]);

  const sesionesData = sesionesRes.ok && sesionesRes.data ? sesionesRes.data : [];
  const bloquesData = bloquesRes.ok && bloquesRes.data ? bloquesRes.data : [];

  // Mapear bloques a cada sesión
  const sesionesConBloques = sesionesData.map((s) => ({
    id: s.id,
    numero: s.numero,
    ajustes_sesion: s.ajustes_sesion,
    fase_interna: s.fase_interna,
    bloques: bloquesData
      .filter((b) => b.sesion_id === s.id)
      .map((b) => ({
        id: b.id,
        contenido_textual: b.contenido_textual ?? '',
        momento: b.momento,
      })),
  }));

  const alumnos = (alumnosRaw ?? []) as Array<{ id: string; nombre: string }>;
  const bitacoras = bitacorasRes.ok ? bitacorasRes.items : [];
  const evaluaciones = evaluacionesRes.ok ? evaluacionesRes.items : [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-nem-verde mb-1">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">
              Diario de Clase & Notas
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bitácora: {planeacion.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {planeacion.periodo_inicio} → {planeacion.periodo_fin} · CCT {planeacion.cct}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/planeaciones/${planeacion.id}/generar-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Expediente Imprimible</span>
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/planeaciones/${planeacion.id}`} className="flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la planeación</span>
            </Link>
          </Button>
        </div>
      </header>

      <BitacoraDiariaPanel
        planeacionId={planeacion.id}
        docenteId={session.docenteId}
        cct={session.cct}
        pdas={(planeacion.pdas ?? []) as string[]}
        sesiones={sesionesConBloques}
        alumnos={alumnos}
        bitacorasIniciales={bitacoras as any[]}
        evaluacionesIniciales={evaluaciones as any[]}
      />
    </div>
  );
}
