/**
 * Tipos de las tablas del schema.
 * SPEC_TEC_02 §5. Cuando Frank corra `supabase db push` por primera vez,
 * regenerar con `pnpm exec supabase gen types typescript --local > types/database.ts`
 * y reemplazar este archivo.
 */

// Esquema placeholder. Hasta que Frank corra `supabase gen types`, usamos
// el tipo `any` para evitar fricciones con el parser de PostgREST
// (que requiere Relationships tipados). Una vez generado, este stub
// se reemplaza por la salida oficial.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
