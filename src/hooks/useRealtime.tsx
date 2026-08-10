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
import { getAccessToken } from "@/lib/auth/accessTokenProvider";
import { NotificationsWsClient } from "@/lib/realtime/wsClient";
import type { RealtimeConnectionStatus, RealtimePayload } from "@/lib/realtime/types";

type RealtimeContextValue = {
  status: RealtimeConnectionStatus;
  lastMessage: RealtimePayload | null;
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const [lastMessage, setLastMessage] = useState<RealtimePayload | null>(null);
  const clientRef = useRef<NotificationsWsClient | null>(null);
  const didLogConnectedRef = useRef(false);

  const handleMessage = useCallback((payload: RealtimePayload) => {
    setLastMessage(payload);
  }, []);

  const handleStatus = useCallback(
    (next: "connecting" | "connected" | "disconnected" | "error") => {
      setStatus(next);
      if (typeof window !== "undefined") {
        (window as Window & { __pyroRealtime?: string }).__pyroRealtime = next;
      }
      if (next === "connected" && !didLogConnectedRef.current) {
        didLogConnectedRef.current = true;
        console.info("[Realtime] WebSocket connected");
      }
      if (next === "disconnected" || next === "error") {
        didLogConnectedRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!session?.access_token) {
      clientRef.current?.stop();
      clientRef.current = null;
      setStatus("idle");
      return;
    }

    const sessionToken = session.access_token;
    const client = new NotificationsWsClient({
      onMessage: handleMessage,
      onStatus: handleStatus,
      getToken: () => getAccessToken() || sessionToken,
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
  }, [session?.access_token, handleMessage, handleStatus]);

  const value = useMemo(
    () => ({
      status,
      lastMessage,
    }),
    [status, lastMessage],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return ctx;
}
