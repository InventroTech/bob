import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import { format, addDays, addHours, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface CallbackSlot {
  id: string;
  label: string;
  iso: string;
  disabled: boolean;
}

interface CallbackSlotSection {
  label: string;
  slots: CallbackSlot[];
}

const CALLBACK_SLOT_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const CALLBACK_SLOT_HOURS_AHEAD = 48;

interface CallBackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (nextCallAt: string, assignToSelf: boolean) => Promise<boolean>;
  updating?: boolean;
}

export const CallBackModal: React.FC<CallBackModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  updating = false,
}) => {
  const [callbackSlotSections, setCallbackSlotSections] = useState<CallbackSlotSection[]>([]);
  const [selectedCallbackSlot, setSelectedCallbackSlot] = useState<string | null>(null);
  const [assignCallbackToSelf, setAssignCallbackToSelf] = useState(false);

  // Debug: log when modal opens unexpectedly
  useEffect(() => {
    if (open) {
      console.log('[CallBackModal] Modal opened - open prop is true');
      // Log stack trace to see what triggered it
      console.trace('[CallBackModal] Stack trace');
    }
  }, [open]);

  const buildCallbackSections = (): CallbackSlotSection[] => {
    const now = new Date();
    const limit = addHours(now, CALLBACK_SLOT_HOURS_AHEAD);

    return [0, 1, 2].map((offset) => {
      const dayStart = startOfDay(addDays(now, offset));
      const label =
        offset === 0
          ? "Today"
          : offset === 1
          ? "Tomorrow"
          : format(dayStart, "EEEE");

      const slots = CALLBACK_SLOT_HOURS.map((hour) => {
        const slotDate = new Date(dayStart);
        slotDate.setHours(hour, 0, 0, 0);
        const iso = slotDate.toISOString();
        const disabled = slotDate <= now || slotDate > limit;
        return {
          id: `${offset}-${hour}`,
          label: format(slotDate, "hh:mm a"),
          iso,
          disabled,
        };
      });

      return { label, slots };
    });
  };

  useEffect(() => {
    if (open) {
      const sections = buildCallbackSections();
      setCallbackSlotSections(sections);
      const firstAvailable = sections.flatMap((section) => section.slots).find((slot) => !slot.disabled);
      setSelectedCallbackSlot(firstAvailable?.iso ?? null);
      setAssignCallbackToSelf(false);
    }
  }, [open]);

  const handleClose = () => {
    setSelectedCallbackSlot(null);
    setAssignCallbackToSelf(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedCallbackSlot) {
      return;
    }
    const ok = await onSubmit(selectedCallbackSlot, assignCallbackToSelf);
    if (ok) {
      handleClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogPortal>
        {/* No overlay - modal slides in from right without blocking main content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 left-auto top-0 h-full w-full max-w-[320px] translate-x-0 translate-y-0 rounded-none border-l border-[#ded8d2] bg-[#f9f6f2] p-0 shadow-2xl z-[200]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "sm:w-[320px]"
          )}
          aria-describedby="callback-dialog-description"
          style={{ zIndex: 200 }}
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-[#e7e1db] px-4 py-4 flex-shrink-0 flex items-center justify-between">
              <div className="space-y-1">
                <DialogPrimitive.Title className="text-[20px] font-semibold text-black">Select time</DialogPrimitive.Title>
                <DialogPrimitive.Description id="callback-dialog-description" className="text-sm text-[#8c8176]">
                  Pick a time within the next 48 hours.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 min-h-0">
            {callbackSlotSections.map((section) => (
              <div key={section.label} className="space-y-3">
                <p className="text-sm font-semibold text-[#9b8f84]">{section.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {section.slots.map((slot) => {
                    const isSelected = selectedCallbackSlot === slot.iso;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={slot.disabled}
                        onClick={() => setSelectedCallbackSlot(slot.iso)}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-medium transition shadow-inner",
                          slot.disabled
                            ? "cursor-not-allowed bg-[#e8e3dd] text-[#b7aea4]"
                            : isSelected
                            ? "bg-black text-white shadow-md"
                            : "bg-[#efe8e1] text-[#6d5f54] hover:bg-[#e7dfd7]"
                        )}
                      >
                        {slot.label.toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#e7e1db] px-4 py-4 space-y-4 flex-shrink-0 bg-[#f4efe9]">
            <div className="flex items-center gap-2 text-black">
              <Checkbox
                id="assign-callback"
                checked={assignCallbackToSelf}
                onCheckedChange={(checked) => setAssignCallbackToSelf(Boolean(checked))}
                className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white"
              />
              <Label htmlFor="assign-callback" className="text-sm">
                Assign it to me.
              </Label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <CustomButton
                variant="ghost"
                className="w-full sm:w-auto rounded-full border border-transparent text-black hover:border-black hover:bg-transparent"
                onClick={handleClose}
              >
                Close
              </CustomButton>
              <CustomButton
                className="w-full sm:w-auto rounded-full bg-black text-white hover:bg-black/90"
                onClick={handleSubmit}
                disabled={!selectedCallbackSlot || updating}
                loading={updating}
              >
                Save
              </CustomButton>
            </div>
          </div>
        </div>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

