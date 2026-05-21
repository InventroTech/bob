import React from 'react';
import { cn } from '@/lib/utils';

/** Tapered three-line filter icon from dispatch mobile design. */
export function DispatchFilterIcon({
  className,
  inverted,
}: {
  className?: string;
  /** White lines on dark header */
  inverted?: boolean;
}) {
  const stroke = inverted ? '#ffffff' : '#111827';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-5 w-5', className)}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill={stroke} />
      <rect x="5" y="10.75" width="14" height="2.5" rx="1.25" fill={stroke} />
      <rect x="7" y="16.5" width="10" height="2.5" rx="1.25" fill={stroke} />
    </svg>
  );
}
