'use client';

import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Building2,
  Shield,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RoleViewSelectorProps {
  currentRole: 'docente' | 'director' | 'admin';
  cct?: string | null;
}

export function RoleViewSelector({ currentRole, cct }: RoleViewSelectorProps) {
  const router = useRouter();

  const roles = [
    {
      id: 'docente' as const,
      label: 'Vista Docente / Educadora',
      desc: 'Experiencia cálida, móvil y centrada en aula y proyectos',
      href: '/dashboard',
      icon: GraduationCap,
      badge: 'Aula Preescolar',
      badgeVariant: 'verde' as const,
    },
    {
      id: 'director' as const,
      label: 'Vista Dirección Escolar',
      desc: `Bandeja de entregas, Vo.Bo. y carpeta escolar (${cct ? `CCT ${cct}` : 'CCT'})`,
      href: '/director',
      icon: Building2,
      badge: 'Gestión CCT',
      badgeVariant: 'amarillo' as const,
    },
    {
      id: 'admin' as const,
      label: 'Consola Superusuario',
      desc: 'Métricas SaaS, monitoreo normativo DOF/SEP y escuelas piloto',
      href: '/admin',
      icon: Shield,
      badge: 'Command Center',
      badgeVariant: 'default' as const,
    },
  ];

  const active = roles.find((r) => r.id === currentRole) ?? roles[0]!;
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800 hover:text-white shadow-sm"
        >
          <ActiveIcon className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold">{active.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-slate-950 text-slate-100 border-slate-800 p-1">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-400 px-2 py-1.5 font-medium flex items-center justify-between">
          <span>Cambiar Modo de Vista</span>
          <Badge variant="outline" className="text-[9px] h-4 border-slate-700 text-slate-400">
            Superuser Sandbox
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-800" />

        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = role.id === currentRole;

          return (
            <DropdownMenuItem
              key={role.id}
              onClick={() => router.push(role.href)}
              className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-slate-800/90 text-white'
                  : 'hover:bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <div
                className={`p-1.5 rounded mt-0.5 ${
                  isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs leading-none">{role.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{role.desc}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
