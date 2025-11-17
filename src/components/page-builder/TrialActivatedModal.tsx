import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";

interface TrialActivatedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TrialActivatedModal: React.FC<TrialActivatedModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="trial-success-description">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold text-slate-900">Great Job!</DialogTitle>
          <p id="trial-success-description" className="text-sm text-slate-500">
            Well done. Proceed to next call.
          </p>
        </DialogHeader>
        <DialogFooter className="w-full pt-2">
          <Button
            className="w-40 gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            onClick={() => onOpenChange(false)}
          >
            <ChevronRight className="h-4 w-4" />
            Next Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

