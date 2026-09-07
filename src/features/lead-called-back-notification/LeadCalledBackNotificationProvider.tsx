import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLeadCalledBackNotification } from "@/hooks/useLeadCalledBackNotification";
import { useOpenLeadNavigation } from "@/hooks/useOpenLeadNavigation";
import { hydrateLeadCalledBackNotifications } from "@/features/lead-called-back-notification/leadCalledBackNotificationStore";

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
    if (!session?.access_token) return;
    void hydrateLeadCalledBackNotifications();
  }, [session?.access_token]);

  return children;
}
