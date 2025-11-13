import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type LeadActionTone = "neutral" | "primary" | "danger" | "success";

const toneStyles: Record<LeadActionTone, string> = {
  neutral:
    "border border-[#D0D5DD] bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC] focus-visible:ring-[#D0D5DD]",
  primary:
    "border border-[#D0D5DD] bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC] focus-visible:ring-[#D0D5DD]",
  danger:
    "border border-[#D0D5DD] bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC] focus-visible:ring-[#D0D5DD]",
  success:
    "border border-[#D0D5DD] bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC] focus-visible:ring-[#D0D5DD]",
};

export interface LeadActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: LeadActionTone;
  className?: string;
  loading?: boolean;
}

export const LeadActionButton: React.FC<LeadActionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "neutral",
  className,
  loading = false,
}) => {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "h-12 rounded-xl border border-transparent px-4 text-sm font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2",
        "flex items-center justify-center gap-2 text-sm font-medium",
        toneStyles[tone],
        (disabled || loading) &&
          "cursor-not-allowed opacity-60 hover:bg-inherit",
        className
      )}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent" />
          <span>{label}</span>
        </>
      ) : (
        <>
          <Icon className="h-4 w-4 text-[#61646B]" strokeWidth={2} />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
};


