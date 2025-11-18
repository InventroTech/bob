import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NOT_INTERESTED_REASONS = [
  "Not a political follower or leader",
  "No Trust in Auto Pay Feature",
  "Bank Account/UPI Issue",
  "Cannot Afford",
  ">=6 attempts",
  "Opted other services for Posters",
  "Lack of local Leader Content",
  "Lack of customization options",
  "Other (Free Text)",
];

interface NotInterestedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<boolean>;
  updating?: boolean;
}

export const NotInterestedModal: React.FC<NotInterestedModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  updating = false,
}) => {
  const [selectedNotInterestedReason, setSelectedNotInterestedReason] = useState<string>("");
  const [customNotInterestedReason, setCustomNotInterestedReason] = useState("");

  const handleClose = () => {
    setSelectedNotInterestedReason("");
    setCustomNotInterestedReason("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const selected = selectedNotInterestedReason.trim();
    const isOther = selected === "Other (Free Text)";
    const finalReason = isOther ? customNotInterestedReason.trim() : selected;

    if (!finalReason) {
      return;
    }

    const ok = await onSubmit(finalReason);
    if (ok) {
      handleClose();
    }
  };

  const isOtherSelected = selectedNotInterestedReason === "Other (Free Text)";
  const hasSelectedReason = selectedNotInterestedReason && !isOtherSelected;
  const hasCustomReason = isOtherSelected && Boolean(customNotInterestedReason.trim());
  const isValid = Boolean(hasSelectedReason || hasCustomReason);

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-xl" aria-describedby="not-interested-dialog-description">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-semibold text-slate-900">Any Feedback?</DialogTitle>
          <p id="not-interested-dialog-description" className="text-sm text-slate-500">
            Share why this lead is not interested so we can improve the experience.
          </p>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {NOT_INTERESTED_REASONS.map((reason) => {
              const isSelected = selectedNotInterestedReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setSelectedNotInterestedReason(reason);
                    if (reason !== "Other (Free Text)") {
                      setCustomNotInterestedReason("");
                    }
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {reason}
                </button>
              );
            })}
          </div>
          {isOtherSelected && (
            <div className="space-y-2">
              <Label htmlFor="not-interested-other" className="text-sm font-medium text-slate-700">
                Feedback
              </Label>
              <Textarea
                id="not-interested-other"
                value={customNotInterestedReason}
                onChange={(e) => setCustomNotInterestedReason(e.target.value)}
                placeholder="Add feedback"
                rows={3}
                className="h-28 rounded-2xl border-slate-200 shadow-sm focus-visible:ring-slate-400"
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto gap-2 rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold shadow-sm hover:bg-slate-800"
            onClick={handleSubmit}
            disabled={!isValid || updating}
          >
            Submit
            <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

