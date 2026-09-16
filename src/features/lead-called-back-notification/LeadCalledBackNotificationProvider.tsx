import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLeadCalledBackNotification } from "@/hooks/useLeadCalledBackNotification";
import { useOpenLeadNavigation } from "@/hooks/useOpenLeadNavigation";
import {
  clearLeadCalledBackNotifications,
  hydrateLeadCalledBackNotifications,
} from "@/features/lead-called-back-notification/leadCalledBackNotificationStore";
import {
  clearOpenLeadHighlightStash,
  clearRegisteredAllLeadsPath,
} from "@/lib/realtime/openLeadBus";
import { SPOOF_CHANGED_EVENT } from "@/lib/auth/spoof";

type LeadCalledBackNotificationProviderProps = {
  children: ReactNode;
};

export function LeadCalledBackNotificationProvider({
  children,
}: LeadCalledBackNotificationProviderProps) {
  const { session } = useAuth();
  const realtimeEnabled = import.meta.env.VITE_ENABLE_REALTIME !== "false";
  const enabled = Boolean(session?.access_token) && realtimeEnabled;

  useLeadCalledBackNotification({ enabled });
  useOpenLeadNavigation();

  useEffect(() => {
    if (!session?.access_token) {
      clearLeadCalledBackNotifications();
      clearOpenLeadHighlightStash();
      clearRegisteredAllLeadsPath();
      return;
    }
    void hydrateLeadCalledBackNotifications();
  }, [session?.access_token]);

  // Spoof swaps the effective JWT without changing session.access_token — clear + rehydrate
  // so admin and spoofed-user notifications do not mix in the inbox.
  useEffect(() => {
    if (!session?.access_token) return;

    const onSpoofChanged = () => {
      clearLeadCalledBackNotifications();
      clearOpenLeadHighlightStash();
      void hydrateLeadCalledBackNotifications();
    };

    window.addEventListener(SPOOF_CHANGED_EVENT, onSpoofChanged);
    return () => {
      window.removeEventListener(SPOOF_CHANGED_EVENT, onSpoofChanged);
    };
  }, [session?.access_token]);

  return children;
}
