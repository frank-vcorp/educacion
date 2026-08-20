import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center',
        className,
      )}
    >
      <p className="text-base font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  retry,
  className,
}: {
  title: string;
  message?: string;
  retry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center',
        className,
      )}
    >
      <p className="text-base font-medium text-destructive">{title}</p>
      {message && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      )}
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 text-sm font-medium text-nem-verde underline-offset-2 hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
      <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-nem-verde" />
      {label}
    </div>
  );
}
