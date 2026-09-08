import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getRealtimeSubscriberCount,
  PYRO_REALTIME_SUBSCRIBERS_CHANGED,
} from "@/lib/realtime/recordUpdatedBus";
import { NotificationsWsClient } from "@/lib/realtime/wsClient";
import type { RealtimeConnectionStatus } from "@/lib/realtime/types";

type RealtimeContextValue = {
  status: RealtimeConnectionStatus;
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const clientRef = useRef<NotificationsWsClient | null>(null);

  const handleStatus = useCallback(
    (next: "connecting" | "connected" | "disconnected" | "error") => {
      setStatus(next);
    },
    [],
  );

  const [subscriberCount, setSubscriberCount] = useState(getRealtimeSubscriberCount);

  useEffect(() => {
    const onSubscribersChanged = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      setSubscriberCount(typeof count === "number" ? count : getRealtimeSubscriberCount());
    };
    window.addEventListener(PYRO_REALTIME_SUBSCRIBERS_CHANGED, onSubscribersChanged);
    return () => {
      window.removeEventListener(PYRO_REALTIME_SUBSCRIBERS_CHANGED, onSubscribersChanged);
    };
  }, []);

  const hasSubscribers = subscriberCount > 0;

  useEffect(() => {
    const shouldConnect =
      Boolean(session?.access_token) &&
      hasSubscribers &&
      import.meta.env.VITE_ENABLE_REALTIME !== "false";

    if (!shouldConnect) {
      clientRef.current?.stop();
      clientRef.current = null;
      setStatus("idle");
      return;
    }

    const client = new NotificationsWsClient({
      onStatus: handleStatus,
    });
    clientRef.current = client;
    client.start();

    const onSpoofChanged = () => client.reconnect();
    window.addEventListener("pyro-spoof-changed", onSpoofChanged);

    return () => {
      window.removeEventListener("pyro-spoof-changed", onSpoofChanged);
      client.stop();
      clientRef.current = null;
      setStatus("idle");
    };
  }, [session?.access_token, hasSubscribers, handleStatus]);

  const value = useMemo(
    () => ({
      status,
    }),
    [status],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return ctx;
}
