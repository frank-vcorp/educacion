/**
 * Store de grupo activo para el docente.
 * SPEC_TEC_04 §3 + D-FIN-16: hasta 3 grupos por docente.
 * Usa cookie para SSR-friendly (evita flash) + Zustand para client state.
 */
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface GrupoActivo {
  id: string;
  grado: string;
  grupo: string;
  nivel: string;
  ciclo_escolar: string;
  total_alumnos: number | null;
}

interface GrupoState {
  grupos: GrupoActivo[];
  grupoActivoId: string | null;
  setGrupos: (grupos: GrupoActivo[]) => void;
  selectGrupo: (id: string) => void;
  clear: () => void;
}

export const useGrupoStore = create<GrupoState>()(
  persist(
    (set) => ({
      grupos: [],
      grupoActivoId: null,
      setGrupos: (grupos) => {
        const current = useGrupoStore.getState().grupoActivoId;
        // Mantener selección si todavía existe; si no, primera activa
        const exists = grupos.find((g) => g.id === current);
        set({
          grupos,
          grupoActivoId: exists ? current : grupos[0]?.id ?? null,
        });
      },
      selectGrupo: (id) => set({ grupoActivoId: id }),
      clear: () => set({ grupos: [], grupoActivoId: null }),
    }),
    {
      name: 'nem-grupo-activo',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Getter conveniente. Devuelve el grupo activo o null.
 */
export function useGrupoActivo(): GrupoActivo | null {
  const grupos = useGrupoStore((s) => s.grupos);
  const id = useGrupoStore((s) => s.grupoActivoId);
  return grupos.find((g) => g.id === id) ?? null;
}
