'use client';

import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OpenLinkButtonProps = {
  href: string;
  className?: string;
  /** Visible label; default "Open link". */
  label?: string;
};

/**
 * Compact control for URL fields in modals: avoids showing long URLs inline.
 */
export function OpenLinkButton({ href, className, label = 'Open link' }: OpenLinkButtonProps) {
  const trimmed = String(href ?? '').trim();
  if (!trimmed) return null;

  return (
    <Button variant="outline" size="sm" className={cn('h-8 shrink-0 gap-1.5 px-3', className)} asChild>
      <a href={trimmed} target="_blank" rel="noopener noreferrer" title={trimmed}>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        {label}
      </a>
    </Button>
  );
}
