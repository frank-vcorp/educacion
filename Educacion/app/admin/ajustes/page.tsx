import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Cpu, ShieldCheck, XCircle } from 'lucide-react';
import { requireSuperuserSession } from '@/lib/auth/require-superuser';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminIaTestButton } from '@/components/admin/admin-ia-test-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function StatusBadge({ ok, okText, failText }: { ok: boolean; okText: string; failText: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {okText}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle className="h-3.5 w-3.5" />
      {failText}
    </span>
  );
}

export default async function AdminAjustesPage() {
  const session = await requireSuperuserSession();

  const hasApiKey = Boolean(process.env.AI_API_KEY?.trim());
  const hasBaseUrl = Boolean(process.env.AI_BASE_URL?.trim());
  const hasModel = Boolean(process.env.AI_MODEL?.trim());
  const providerName = process.env.AI_PROVIDER?.trim() || 'No especificado';
  const modelName = process.env.AI_MODEL?.trim() || 'No configurado';
  const timeoutMs = process.env.AI_TIMEOUT_MS?.trim() || '25000 (default)';

  return (
    <div className="min-h-screen bg-slate-50/70">
      <AdminHeader user={session.user} cct={session.cct} />

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Ajustes de Superusuario
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configuración de plataforma, diagnóstico del motor de IA y cuenta administradora.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Volver al Command Center
            </Link>
          </Button>
        </div>

        {/* Estado del Motor de IA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-700" />
              Motor de Inteligencia Artificial (Entorno Servidor)
            </CardTitle>
            <CardDescription>
              Verificación en vivo de las variables de entorno en Vercel/servidor (sin exponer secretos).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">AI_API_KEY</span>
              <StatusBadge ok={hasApiKey} okText="Configurada" failText="Faltante / Vacía" />
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">AI_BASE_URL</span>
              <StatusBadge ok={hasBaseUrl} okText="Configurada" failText="Faltante / Vacía" />
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">AI_MODEL</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{modelName}</code>
                <StatusBadge ok={hasModel} okText="OK" failText="Faltante" />
              </div>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">AI_PROVIDER</span>
              <Badge variant="outline" className="font-mono text-xs">
                {providerName}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI_TIMEOUT_MS</span>
              <span className="font-mono text-xs text-slate-700">{timeoutMs} ms</span>
            </div>
            <AdminIaTestButton />
          </CardContent>
        </Card>

        {/* Cuenta y Privacidad */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Cuenta y Privacidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Correo</span>
              <span className="font-medium">{session.user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rol</span>
              <Badge className="bg-slate-900 text-white">Superusuario SaaS</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CCT activo</span>
              <span className="font-mono text-xs">{session.cct ?? 'Sin CCT'}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
