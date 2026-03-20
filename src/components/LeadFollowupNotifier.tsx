import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { LeadFollowupNotification, useLeadFollowups, formatNextCallRelative } from "@/hooks/useLeadFollowups";

export function LeadFollowupNotifier() {
  const { data = [] } = useLeadFollowups();
  const seenIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!Array.isArray(data)) {
      console.warn("[LeadFollowupNotifier] data is not an array:", data);
      return;
    }
    console.log("[LeadFollowupNotifier] received followups:", data);
    (data as LeadFollowupNotification[]).forEach((lead) => {
      if (!seenIds.current.has(lead.id)) {
        seenIds.current.add(lead.id);
        console.log("[LeadFollowupNotifier] showing toast for lead id:", lead.id);
        toast(`Follow-up due: ${lead.name || `Lead #${lead.id}`}`, {
          description:
            lead.latest_remarks ||
            `${lead.lead_status ?? ""}${
              lead.next_call_at ? ` • ${formatNextCallRelative(lead.next_call_at)}` : ""
            }`,
        });
      }
    });
  }, [data]);

  return null;
}

