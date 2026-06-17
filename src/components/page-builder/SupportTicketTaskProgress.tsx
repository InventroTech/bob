import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SupportTicketTaskStepStatus = "completed" | "current" | "pending";

export interface SupportTicketTaskStep {
  id: string;
  label: string;
  status: SupportTicketTaskStepStatus;
}

interface SupportTicketTaskProgressProps {
  /** Pre-computed steps from ``task_progress`` on the ticket API payload. */
  taskProgress?: SupportTicketTaskStep[] | null;
  className?: string;
}

export const SupportTicketTaskProgress: React.FC<SupportTicketTaskProgressProps> = ({
  taskProgress,
  className,
}) => {
  const steps = Array.isArray(taskProgress) ? taskProgress : [];

  if (!steps.length) {
    return (
      <div className={cn("rounded-2xl border border-slate-200 p-5", className)}>
        <h5 className="mb-2 pl-2 text-base font-semibold text-slate-900">Task Progress</h5>
        <p className="pl-2 text-sm text-slate-500">No tasks available.</p>
      </div>
    );
  }

  const currentIndexRaw = steps.findIndex((step) => step.status === "current");
  const currentIndex =
    currentIndexRaw !== -1
      ? currentIndexRaw
      : steps.findIndex((step) => step.status !== "completed");

  return (
    <div className={cn("rounded-2xl border border-slate-200 p-5", className)}>
      <h5 className="mb-4 pl-2 text-base font-semibold text-slate-900">Task Progress</h5>
      <ol className="relative flex flex-col gap-4 pl-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-h-[44px] gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                  step.status === "completed" && "border-emerald-200 bg-emerald-50",
                  step.status === "current" && "border-slate-900 bg-slate-900",
                  step.status === "pending" && "border-slate-200 bg-white"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : step.status === "current" ? (
                  <span className="block h-2 w-2 rounded-full bg-white" />
                ) : (
                  <span className="block h-1.5 w-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    "mt-1 h-full w-px flex-1",
                    currentIndex !== -1 && index < currentIndex
                      ? "bg-slate-900"
                      : "bg-slate-200"
                  )}
                />
              )}
            </div>
            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.status === "current"
                    ? "text-slate-900"
                    : step.status === "completed"
                    ? "text-slate-600"
                    : "text-slate-500"
                )}
              >
                {step.label}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
