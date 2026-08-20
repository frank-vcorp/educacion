/**
 * Domain types — placeholder inicial.
 * SPEC_TEC_04 §3 carpeta `types/`.
 * Los tipos se iran poblando con cada módulo (planeaciones, alumnos, etc.).
 *
 * NOTA: `types/database.ts` se generará automaticamente desde Supabase via:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 * Por ahora este archivo es stub para que `lib/supabase/*.ts` compile.
 */

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

/**
 * Roles principales (D-FIN-12 multi-tenant RLS).
 * docente: usuario regular que crea planeaciones.
 * director: rol adicional (D-FIN-5) para revisar entregas.
 */
export type UserRole = 'docente' | 'director';

/**
 * Estados de planeación (SPEC_TEC_02 §5.3.6 + D-FIN-17).
 */
export type EstadoPlaneacion = 'borrador' | 'lista' | 'entregada' | 'archivada';

/**
 * Niveles de rúbrica semáforo (D-FIN-3).
 * 4 niveles: verde (logrado sin apoyo) → rojo (no logrado).
 */
export type NivelSemaforo = 'verde' | 'amarillo' | 'naranja' | 'rojo';

/**
 * Modalidades de planeación (D-FIN-6 wizard adaptativo).
 */
export type Modalidad = 'proyecto_comunitario' | 'proyecto_aula' | 'secuencia';
