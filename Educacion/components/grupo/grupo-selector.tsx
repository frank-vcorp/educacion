/**
 * Selector de grupo activo en el header.
 * SPEC_TEC_04 §3 + D-FIN-16: hasta 3 grupos por docente.
 * Visible en todas las páginas autenticadas.
 * Persistencia en localStorage vía Zustand.
 */
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGrupoStore, useGrupoActivo, type GrupoActivo } from '@/stores/grupo-store';
import { useUser } from '@/lib/auth/use-user';
import { ChevronDown, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function GrupoSelector() {
  const { user, isLoading: userLoading } = useUser();
  const grupos = useGrupoStore((s) => s.grupos);
  const grupoActivo = useGrupoActivo();
  const setGrupos = useGrupoStore((s) => s.setGrupos);
  const selectGrupo = useGrupoStore((s) => s.selectGrupo);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (userLoading || !user) {
      setLoaded(false);
      return;
    }
    const supabase = createClient();
    let active = true;
    supabase
      .from('grupo')
      .select('id, grado, grupo, nivel, ciclo_escolar, total_alumnos')
      .eq('docente_id', user.id)
      .eq('activo', true)
      .order('ciclo_escolar', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setGrupos((data ?? []) as GrupoActivo[]);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user, userLoading, setGrupos]);

  if (loaded && grupos.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 px-3 py-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Sin grupos aún</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Users className="h-4 w-4 text-nem-verde" />
        {grupoActivo ? (
          <span>
            {grupoActivo.grado}° {grupoActivo.grupo}{' '}
            <span className="text-muted-foreground">({grupoActivo.nivel})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Cargando…</span>
        )}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Cambiar de grupo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {grupos.map((g) => (
          <DropdownMenuItem
            key={g.id}
            onSelect={() => selectGrupo(g.id)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="font-medium">
              {g.grado}° {g.grupo}{' '}
              <span className="text-xs text-muted-foreground">({g.nivel})</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Ciclo {g.ciclo_escolar}
              {g.total_alumnos != null && ` · ${g.total_alumnos} alumnos`}
            </span>
          </DropdownMenuItem>
        ))}
        {grupos.length < 3 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/onboarding/grupo" className="text-primary">
                + Agregar nuevo grupo
              </a>
            </DropdownMenuItem>
          </>
        )}
        {grupoActivo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`/grupos/${grupoActivo.id}/editar`} className="text-primary">
                Editar grupo actual
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
