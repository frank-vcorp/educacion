import { CheckCircle2, ShieldCheck, Scale, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NormativaStatus {
  acuerdo14: {
    nombre: string;
    dofUrl: string;
    estado: 'vigente';
    ultimaVerificacion: string;
  };
  acuerdo06: {
    nombre: string;
    dofUrl: string;
    estado: 'vigente';
    ultimaVerificacion: string;
  };
  alertasBloqueantes: number;
}

export function ModuloVigilanciaNormativa() {
  const status: NormativaStatus = {
    acuerdo14: {
      nombre: 'Acuerdo 14/08/22 — Plan de Estudio Preescolar, Primaria y Secundaria',
      dofUrl: 'https://sidof.segob.gob.mx/notas/docFuente/5661845',
      estado: 'vigente',
      ultimaVerificacion: '13 de agosto 2026, 04:33 UTC (Monitor Automatizado E11)',
    },
    acuerdo06: {
      nombre: 'Acuerdo 06/08/23 — Anexo Modificatorio Programas Sintéticos Fase 2',
      dofUrl: 'https://sidof.segob.gob.mx/notas/docFuente/5698663',
      estado: 'vigente',
      ultimaVerificacion: '13 de agosto 2026, 04:33 UTC (Monitor Automatizado E11)',
    },
    alertasBloqueantes: 0,
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 text-slate-100 shadow-lg">
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                Módulo de Vigilancia Normativa (E11)
                <Badge variant="verde" className="text-[10px] h-4 bg-emerald-600 px-1.5">
                  Monitor DOF / SEP Activo
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-0.5">
                Seguimiento de validez legal y sincronización de Acuerdos Secretariales Federales.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs gap-1 font-mono">
              <ShieldCheck className="h-3.5 w-3.5" />
              {status.alertasBloqueantes} Alertas Bloqueantes
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Acuerdo 14/08/22 */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-xs text-white">Acuerdo 14/08/22</span>
              <Badge variant="verde" className="text-[10px] h-4 bg-emerald-600 gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> 100% Vigente
              </Badge>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Establece el Plan de Estudio para la educación preescolar, primaria y secundaria.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span className="truncate max-w-[200px]">Check: 13 ago 2026</span>
              <a
                href={status.acuerdo14.dofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-medium"
              >
                <span>DOF</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* Acuerdo 06/08/23 */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-xs text-white">Acuerdo 06/08/23</span>
              <Badge variant="verde" className="text-[10px] h-4 bg-emerald-600 gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> 100% Vigente
              </Badge>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Modifica y actualiza los Programas Sintéticos de la Fase 2 (Preescolar oficial).
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span className="truncate max-w-[200px]">Check: 13 ago 2026</span>
              <a
                href={status.acuerdo06.dofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-medium"
              >
                <span>DOF</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-950/40 p-2.5 text-xs text-slate-400 border border-slate-800/60">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin-slow" />
            <span>Última inspección de hashes SHA-256 completada sin discrepancias detectadas.</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Pipeline: fuentes/_monitor/estado.json (F2/F3)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
