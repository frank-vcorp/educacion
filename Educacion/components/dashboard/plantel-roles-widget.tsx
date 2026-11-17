'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Copy,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  aprobarDirectorPlantel,
  cambiarRolActivo,
  generarLinkInvitacionPlantel,
  rechazarDirectorPlantel,
  type EstadoPlantel,
} from '@/services/plantel/plantel-actions';

export function PlantelRolesWidget({ estado }: { estado: EstadoPlantel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [linkGenerado, setLinkGenerado] = useState<{
    rol: 'docente' | 'director';
    url: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const handleGenerarLink = (rol: 'docente' | 'director') => {
    setFeedback(null);
    setCopiado(false);
    startTransition(async () => {
      const res = await generarLinkInvitacionPlantel(rol);
      if (!res.ok || !res.url) {
        setFeedback({ tipo: 'err', texto: res.error ?? 'No se pudo generar el enlace.' });
        return;
      }
      setLinkGenerado({ rol, url: res.url });
      try {
        await navigator.clipboard.writeText(res.url);
        setCopiado(true);
      } catch {
        // clipboard may be blocked; link is shown below
      }
    });
  };

  const handleAprobar = (id: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await aprobarDirectorPlantel(id);
      if (!res.ok) {
        setFeedback({ tipo: 'err', texto: res.error ?? 'Error al aprobar.' });
        return;
      }
      setFeedback({ tipo: 'ok', texto: 'Director(a) aprobado(a) correctamente.' });
      router.refresh();
    });
  };

  const handleRechazar = (id: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await rechazarDirectorPlantel(id);
      if (!res.ok) {
        setFeedback({ tipo: 'err', texto: res.error ?? 'Error al rechazar.' });
        return;
      }
      setFeedback({ tipo: 'ok', texto: 'Solicitud rechazada.' });
      router.refresh();
    });
  };

  const handleCambiarRol = (nuevoRol: 'docente' | 'director') => {
    setFeedback(null);
    startTransition(async () => {
      const res = await cambiarRolActivo(nuevoRol);
      if (!res.ok) {
        setFeedback({ tipo: 'err', texto: res.error ?? 'No se pudo cambiar de rol.' });
        return;
      }
      setFeedback({
        tipo: 'ok',
        texto: res.mensaje ?? 'Rol actualizado.',
      });
      router.refresh();
    });
  };

  const esDirectorPendiente =
    estado.rolActivo === 'director' &&
    (estado.directorEstado === 'pendiente_aprobacion' ||
      estado.directorEstado === 'pendiente_respaldo');

  return (
    <Card className="mb-6 border-nem-verde/25" data-testid="plantel-roles-widget">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-nem-verde" />
            <CardTitle className="text-base">
              Mi Plantel · CCT {estado.cct}
              {estado.cctNombre ? ` (${estado.cctNombre})` : ''}
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={estado.rolActivo === 'director' ? 'amarillo' : 'verde'}>
              Rol activo: {estado.rolActivo === 'director' ? 'Director(a)' : 'Docente'}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {estado.totalDocentes} {estado.totalDocentes === 1 ? 'integrante' : 'integrantes'}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Invita a colegas de tu jardín de niños con enlace directo a tu CCT o cambia de rol conservando tu historial.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {esDirectorPendiente && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <p className="font-semibold">
              {estado.directorEstado === 'pendiente_respaldo'
                ? 'Tu alta como Director(a) espera respaldo de un docente'
                : 'Tu alta como Director(a) espera aprobación de un docente de tu plantel'}
            </p>
            <p className="mt-1">
              {estado.directorEstado === 'pendiente_respaldo'
                ? 'Comparte el enlace de invitación para Docente con al menos una maestra de tu CCT para que confirme tu cargo.'
                : 'Cualquier docente registrado en este CCT puede confirmarte con un clic desde su panel.'}
            </p>
          </div>
        )}

        {estado.solicitudesPendientes.length > 0 && (
          <div className="space-y-2 rounded-md border border-nem-verde/30 bg-nem-verde/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-nem-verde">
              <ShieldCheck className="h-4 w-4" />
              Solicitud de Dirección pendiente de aprobación
            </p>
            {estado.solicitudesPendientes.map((sol) => (
              <div
                key={sol.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border bg-background p-2.5 text-xs"
              >
                <div>
                  <p className="font-medium">{sol.nombre}</p>
                  <p className="text-muted-foreground">
                    {sol.email}
                    {sol.invitadoPorNombre ? ` · Invitado por ${sol.invitadoPorNombre}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleAprobar(sol.id)}
                    className="h-7 gap-1 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprobar Director(a)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => handleRechazar(sol.id)}
                    className="h-7 gap-1 text-xs text-destructive"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => handleGenerarLink('docente')}
              className="gap-1.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5 text-nem-verde" />
              Invitar Docente (link CCT)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => handleGenerarLink('director')}
              className="gap-1.5 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              Invitar Director(a) (link CCT)
            </Button>
          </div>

          <div>
            {estado.rolActivo === 'director' ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => handleCambiarRol('docente')}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Cambiar a rol Docente
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => handleCambiarRol('director')}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {estado.rolesDisponibles.includes('director') &&
                estado.directorEstado === 'activo'
                  ? 'Cambiar a rol Director(a)'
                  : 'Solicitar rol Director(a)'}
              </Button>
            )}
          </div>
        </div>

        {linkGenerado && (
          <div className="space-y-1.5 rounded-md border bg-muted/30 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                Enlace de invitación ({linkGenerado.rol === 'director' ? 'Director(a)' : 'Docente'})
                {copiado ? ' · ¡Copiado!' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-nem-verde underline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(linkGenerado.url);
                      setCopiado(true);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Te invito a unirte a nuestro plantel (CCT ${estado.cct}) en la plataforma NEM Preescolar: ${linkGenerado.url}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-700 underline"
                >
                  Enviar por WhatsApp
                </a>
              </div>
            </div>
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              {linkGenerado.url}
            </p>
          </div>
        )}

        {feedback && (
          <p
            className={`text-xs ${
              feedback.tipo === 'ok' ? 'text-nem-verde' : 'text-destructive'
            }`}
            role="status"
          >
            {feedback.texto}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
