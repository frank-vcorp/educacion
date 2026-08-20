/**
 * Iframe online al portal CONALITEG (T13 + D-FIN-10).
 * ADR-010: la plataforma NO aloja el contenido, solo lo enlaza.
 */
'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface Props {
  src: string;
  title: string;
}

export function ConalitegIframe({ src, title }: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-muted">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Cargando libro…
        </div>
      )}
      <iframe
        src={src}
        title={title}
        className="h-full w-full"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        onLoad={() => setLoaded(true)}
        referrerPolicy="no-referrer"
      />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/95 px-2 py-1 text-xs shadow"
      >
        <ExternalLink className="h-3 w-3" /> Nueva pestaña
      </a>
    </div>
  );
}
