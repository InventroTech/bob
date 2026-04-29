import React from "react";
import { useNavigate } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  SPOOF_CHANGED_EVENT,
  SPOOF_LABEL_KEY,
  clearSpoofLocalStorage,
  dispatchSpoofChanged,
} from "@/lib/spoof";

interface UserInfo {
  name: string;
  email: string;
  image?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  user?: UserInfo;
}

const DashboardLayout = ({ children, className, user }: DashboardLayoutProps) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [spoofLabel, setSpoofLabel] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(SPOOF_LABEL_KEY);
  });

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SPOOF_LABEL_KEY) {
        setSpoofLabel(event.newValue);
      }
    };
    const handleSpoofChanged = () => {
      setSpoofLabel(window.localStorage.getItem(SPOOF_LABEL_KEY));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SPOOF_CHANGED_EVENT, handleSpoofChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SPOOF_CHANGED_EVENT, handleSpoofChanged);
    };
  }, []);

  const handleStopSpoofing = React.useCallback(() => {
    try {
      clearSpoofLocalStorage();
      setSpoofLabel(null);
      dispatchSpoofChanged();
      navigate("/");
    } catch (err) {
      console.error("Failed to stop spoofing:", err);
    }
  }, [navigate]);

  const resolvedUser = React.useMemo(() => {
    if (user) return user;
    if (!authUser) return undefined;

    return {
      name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "User",
      email: authUser.email || "user@example.com",
      image:
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        undefined,
    };
  }, [user, authUser]);

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="bg-background">
        <Navbar user={resolvedUser} />
        {spoofLabel && (
          <div className="w-full bg-yellow-300 text-black text-xs px-4 py-1 flex items-center justify-between">
            <span className="truncate">
              Spoofing as <span className="font-semibold">{spoofLabel}</span>
            </span>
            <button
              type="button"
              onClick={handleStopSpoofing}
              className="ml-4 rounded border border-black/40 px-2 py-0.5 text-xs font-medium hover:bg-black hover:text-amber-300"
            >
              Stop spoofing
            </button>
          </div>
        )}
        <main className={cn("flex-1 overflow-auto p-6", className)}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
