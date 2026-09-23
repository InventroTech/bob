import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatElapsed } from "./useLeadTimer";

// past this many seconds on one lead, nudge the RM that they're taking a while
const SLOW_AFTER_SECONDS = 180;

export const LeadTimerBadge: React.FC<{ seconds: number }> = ({ seconds }) => {
  const isSlow = seconds >= SLOW_AFTER_SECONDS;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
        isSlow ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-600"
      )}
      title="Time spent on this lead"
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {formatElapsed(seconds)}
    </span>
  );
};
