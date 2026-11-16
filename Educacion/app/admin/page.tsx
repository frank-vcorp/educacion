import Link from 'next/link';
import { requireSuperuserSession } from '@/lib/auth/require-superuser';
import { getDocentesOverview } from '@/services/admin/docente-overview';
import { AdminHeader } from '@/components/admin/admin-header';
import { ModuloVigilanciaNormativa } from '@/components/admin/modulo-vigilancia-normativa';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Building2,
  FileText,
  Cpu,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmtDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function onboardingStatus(d: Awaited<ReturnType<typeof getDocentesOverview>>[number]) {
  const steps = [
    d.cct ? 1 : 0,
    d.avisoAceptado ? 1 : 0,
    d.gruposCount > 0 ? 1 : 0,
    d.alumnosCount > 0 ? 1 : 0,
    d.planeaciones.length > 0 ? 1 : 0,
  ];
  const done = steps.reduce((a, b) => a + b, 0);
  return `${done}/5`;
}

export default async function AdminPage() {
  const session = await requireSuperuserSession();
  const docentes = await getDocentesOverview();

  const totalPlaneaciones = docentes.reduce((n, d) => n + d.planeaciones.length, 0);
  const sinBloques = docentes.reduce(
    (n, d) => n + d.planeaciones.filter((p) => p.bloquesCount === 0).length,
    0,
  );

  // Agrupar escuelas / CCTs activos
  const cctMap = new Map<string, {
    cct: string;
    docentesCount: number;
    planeacionesCount: number;
    alumnosCount: number;
    docentes: typeof docentes;
  }>();

  for (const d of docentes) {
    const clave = d.cct || 'SIN_CCT';
    const existing = cctMap.get(clave) ?? {
      cct: clave,
      docentesCount: 0,
      planeacionesCount: 0,
      alumnosCount: 0,
      docentes: [],
    };
    existing.docentesCount += 1;
    existing.planeacionesCount += d.planeaciones.length;
    existing.alumnosCount += d.alumnosCount;
    existing.docentes.push(d);
    cctMap.set(clave, existing);
  }

  const cctsActivos = Array.from(cctMap.values());

  // Estimación de IA: llamadas aproximadas de planeaciones + contexto (~12,500 tokens por planeación asistida)
  const estimatedTokens = (totalPlaneaciones * 12500) + 45000;
  const estimatedCostUsd = ((estimatedTokens / 1000000) * 0.15).toFixed(3); // Base MiniMax/Claude pricing

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader user={session.user} cct={session.cct} />

      <main className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Title area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Panel de Control Global SaaS
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Métricas de producción, avance de escuelas piloto y vigilancia normativa federal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistemas Operacionales 100%
            </span>
          </div>
        </div>

        {/* Global Key SaaS Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Maestras registradas */}
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Maestras Registradas
                </CardDescription>
                <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mt-1">
                {docentes.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Docentes activas en piloto</span>
              </div>
            </CardContent>
          </Card>

          {/* CCTs Activos */}
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  CCTs / Jardines Activos
                </CardDescription>
                <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mt-1">
                {cctsActivos.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-slate-400">Centros de Trabajo en Puebla y CDMX</span>
            </CardContent>
          </Card>

          {/* Planeaciones Creadas este mes */}
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Planeaciones del Mes
                </CardDescription>
                <div className="p-1.5 rounded bg-teal-500/10 text-teal-400">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mt-1">
                {totalPlaneaciones}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-slate-400">
                {sinBloques} sin actividades aún
              </span>
            </CardContent>
          </Card>

          {/* Estimación de Tokens / Costo IA */}
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Consumo IA (Tokens / Costo)
                </CardDescription>
                <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-400">
                  <Cpu className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-indigo-400 mt-1 font-mono">
                {estimatedTokens.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-slate-400 font-mono">
                Est. ~${estimatedCostUsd} USD acumulado
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Módulo de Vigilancia Normativa (E11) */}
        <section>
          <ModuloVigilanciaNormativa />
        </section>

        {/* Tabla de CCTs y Escuelas Piloto Activas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Escuelas Piloto y Centros de Trabajo (CCTs)
              </h2>
              <p className="text-xs text-slate-400">
                Desglose de centros educativos con maestras registradas y avance de cobertura.
              </p>
            </div>
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              {cctsActivos.length} CCTs activos
            </Badge>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-950/70">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Clave CCT</TableHead>
                  <TableHead className="text-slate-400">Docentes en Piloto</TableHead>
                  <TableHead className="text-slate-400">Alumnos Atendidos</TableHead>
                  <TableHead className="text-slate-400">Proyectos NEM Creados</TableHead>
                  <TableHead className="text-slate-400">Estado de Adopción</TableHead>
                  <TableHead className="text-right text-slate-400">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cctsActivos.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      No hay escuelas piloto registradas en la base de datos.
                    </TableCell>
                  </TableRow>
                ) : (
                  cctsActivos.map((c) => (
                    <TableRow key={c.cct} className="border-slate-800/80 hover:bg-slate-800/40">
                      <TableCell className="font-mono font-semibold text-emerald-400">
                        {c.cct}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {c.docentesCount} educadora{c.docentesCount === 1 ? '' : 's'}
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {c.alumnosCount} alumnos
                      </TableCell>
                      <TableCell className="text-slate-200">
                        {c.planeacionesCount} planeaciones
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.planeacionesCount > 0
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }
                        >
                          {c.planeacionesCount > 0 ? 'Activo con proyectos' : 'En configuración'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/director`}
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          <span>Ver como Director</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Tabla de Maestras y Onboarding Detallado */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Avance Individual de Docentes en Piloto
              </h2>
              <p className="text-xs text-slate-400">
                Detalle por educadora: onboarding, grupos, alumnos, entrevistas y planeaciones.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {docentes.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/60 text-slate-400 py-8 text-center">
                <CardContent>Aún no hay docentes registradas.</CardContent>
              </Card>
            ) : (
              docentes.map((d) => (
                <Card key={d.id} className="border-slate-800 bg-slate-900/70 text-slate-100">
                  <CardHeader className="pb-3 border-b border-slate-800/60">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base text-white">{d.nombre}</CardTitle>
                        <CardDescription className="text-slate-400 text-xs mt-0.5">
                          {d.email} · CCT <span className="text-emerald-400 font-mono">{d.cct}</span> · {d.nivel}
                        </CardDescription>
                      </div>
                      <Badge className="bg-slate-800 text-slate-200 border-slate-700">
                        Onboarding {onboardingStatus(d)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                        <dt className="text-slate-400">Fecha de Registro</dt>
                        <dd className="font-medium text-slate-200 mt-0.5">{fmtDate(d.createdAt)}</dd>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                        <dt className="text-slate-400">Último Acceso</dt>
                        <dd className="font-medium text-slate-200 mt-0.5">{fmtDate(d.lastSignIn)}</dd>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                        <dt className="text-slate-400">Grupos / Alumnos</dt>
                        <dd className="font-medium text-slate-200 mt-0.5">
                          {d.gruposCount} grupos · {d.alumnosCount} alumnos
                        </dd>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                        <dt className="text-slate-400">Entrevistas diagnósticas</dt>
                        <dd className="font-medium text-slate-200 mt-0.5">
                          Ini: {d.entrevistasInicialesCompletas} · Fam: {d.entrevistasFamiliaresCompletas}
                        </dd>
                      </div>
                    </dl>

                    {/* Proyectos de la maestra */}
                    <div>
                      <p className="font-semibold text-slate-200 mb-2">
                        Proyectos y Planeaciones ({d.planeaciones.length})
                      </p>
                      {d.planeaciones.length === 0 ? (
                        <p className="text-slate-500 italic">Sin planeaciones creadas aún.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {d.planeaciones.map((p) => (
                            <div
                              key={p.id}
                              className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 flex flex-col justify-between"
                            >
                              <div>
                                <p className="font-medium text-white">{p.nombre}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {fmtDate(p.createdAt)} · Estado: {p.estado}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60">
                                <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                                  {p.bloquesCount} actividades
                                </Badge>
                                <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                                  {p.sesionesCount} sesiones
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
