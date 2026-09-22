/** Compact fetch status for the inventory item card. */

import React, { useEffect, useState } from 'react';

const STAGES = [
  { afterMs: 0, label: 'Opening the product page…' },
  { afterMs: 4000, label: 'Reading name, price, and image…' },
  { afterMs: 9000, label: 'This can take about 15 seconds…' },
  { afterMs: 14000, label: 'Still working — almost there…' },
] as const;

function stageLabel(elapsedMs: number): string {
  let label: string = STAGES[0].label;
  for (const stage of STAGES) {
    if (elapsedMs >= stage.afterMs) label = stage.label;
  }
  return label;
}

function progressPercent(elapsedMs: number): number {
  const t = Math.min(1, elapsedMs / 16000);
  const eased = 1 - (1 - t) * (1 - t);
  return Math.max(8, Math.min(92, Math.round(eased * 92)));
}

export function ProductLinkFetchLoader({
  active,
  navy,
}: {
  active: boolean;
  navy?: boolean;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    const started = Date.now();
    setElapsedMs(0);
    const id = window.setInterval(() => setElapsedMs(Date.now() - started), 150);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const accent = navy ? '#1A3673' : 'hsl(var(--primary))';
  const accentSoft = navy ? '#3B6BC4' : 'hsl(var(--primary))';
  const pct = progressPercent(elapsedMs);
  const label = stageLabel(elapsedMs);

  return (
    <div
      className="rounded-md border px-3 py-2.5"
      style={{
        borderColor: navy ? '#D8DEE9' : undefined,
        background: navy ? '#F7F9FC' : undefined,
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-2.5 h-12 w-12" aria-hidden>
          <span
            className="absolute inset-0 rounded-full border-[1.5px] border-dashed animate-product-fetch-orbit-rev"
            style={{ borderColor: `${accent}40` }}
          />
          <span
            className="absolute inset-[4px] rounded-full border-[2.5px] border-transparent animate-product-fetch-orbit"
            style={{
              borderTopColor: accent,
              borderRightColor: accentSoft,
            }}
          />
          <span
            className="absolute inset-[9px] rounded-full border-2 border-transparent animate-product-fetch-orbit-rev"
            style={{ borderBottomColor: accent }}
          />
          <span
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: accent }}
          />
        </div>
        <p
          key={label}
          className="animate-product-fetch-fade text-[12px] font-medium"
          style={{ color: navy ? '#0B1F4D' : undefined }}
        >
          {label}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className="relative h-full overflow-hidden rounded-full animate-product-fetch-glow"
          style={{
            width: `${pct}%`,
            transition: 'width 200ms ease-out',
            background: `linear-gradient(90deg, ${accent} 0%, ${accentSoft} 55%, ${accent} 100%)`,
          }}
        >
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-product-fetch-shimmer bg-gradient-to-r from-transparent via-white/75 to-transparent" />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Vendor pages often take 10–15s
      </p>
    </div>
  );
}
