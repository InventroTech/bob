import { toast } from "sonner";
import { LeadCalledBackNotificationToast } from "./LeadCalledBackNotificationToast";
import { pushLeadCalledBackNotification } from "./leadCalledBackNotificationStore";
import type { LeadCalledBackPayload } from "@/lib/realtime/types";

export function showLeadCalledBackNotification(payload: LeadCalledBackPayload): void {
  pushLeadCalledBackNotification(payload);

  toast.custom(
    (toastId) => (
      <LeadCalledBackNotificationToast
        payload={payload}
        onDismiss={() => toast.dismiss(toastId)}
      />
    ),
    {
      duration: 10_000,
      position: "top-right",
    },
  );
}
