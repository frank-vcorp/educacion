/**
 * Layout para rutas públicas (auth) — sin sidebar, sin header.
 * SPEC_TEC_04 §3: (auth) route group.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      {children}
    </div>
  );
}
