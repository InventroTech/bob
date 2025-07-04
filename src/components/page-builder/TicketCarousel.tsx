import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  Tag,
  ChevronDown,
  Phone,
  Star,
  Clock,
  MessageSquare,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PieChart,
  Coffee,
  Waypoints,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PendingTicketsCard, TicketStats } from "@/components/ui/PendingTicketsCard";

interface Ticket {
  id: number;
  created_at: string;
  ticket_date: string;
  user_id: string;
  name: string;
  phone: string;
  source: string;
  subscription_status: string | null;
  atleast_paid_once: boolean | null;
  reason: string;
  other_reasons: string[] | string | null;
  badge: string | null;
  poster: string | null;
  tenant_id: string;
  assigned_to: string | null;
  layout_status: string;
  resolution_status: "Resolved" | "WIP" | "Pending" | "Already Resolved" | "No Issue" | "Not Possible" | "Feature Requested" | "Can't Resolve";
  resolution_time: string | null;
  cse_name: string | null;
  cse_remarks: string | null;
  call_status: string | null;
  call_attempts: number | null;
  rm_name: string | null;
  completed_at: string | null;
  snooze_until: string | null;
  praja_dashboard_user_link: string | null;
  display_pic_url: string | null;
}

const OTHER_REASONS_OPTIONS = [
  "Technical Issue",
  "Billing Problem",
  "Account Access",
  "Feature Request",
  "Bug Report",
  "Performance Issue",
  "Security Concern",
  "Data Issue",
  "Integration Problem",
  "User Training",
  "Documentation Request",
  "Service Outage",
  "Configuration Issue",
  "Compatibility Problem",
  "Other",
];

const parseOtherReasons = (otherReasons: any): string[] => {
  if (!otherReasons) return [];
  if (Array.isArray(otherReasons)) return otherReasons;
  if (typeof otherReasons === "string") {
    try {
      return JSON.parse(otherReasons);
    } catch {
      return otherReasons.split(",").map((r: string) => r.trim()).filter(Boolean);
    }
  }
  return [];
};

interface TicketCarouselProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    showFilters?: boolean;
    readOnly?: boolean;
  };
  initialTicket?: any;
  onUpdate?: (updatedTicket: any) => void;
}

export const TicketCarousel: React.FC<TicketCarouselProps> = ({
  config,
  initialTicket,
  onUpdate,
}) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const isInitialized = React.useRef(false);

  const getPersistedState = () => {
    try {
      const persisted = sessionStorage.getItem("ticketCarouselState");
      return persisted ? JSON.parse(persisted) : null;
    } catch {
      return null;
    }
  };

  const persistState = (state: any) => {
    try {
      sessionStorage.setItem("ticketCarouselState", JSON.stringify(state));
    } catch (error) {
      console.error("Error persisting state:", error);
    }
  };

  const clearPersistedState = () => {
    try {
      sessionStorage.removeItem("ticketCarouselState");
    } catch (error) {
      console.error("Error clearing persisted state:", error);
    }
  };

  const getInitialState = () => {
    if (initialTicket) {
      return {
        currentTicket: initialTicket,
        showPendingCard: false,
        resolutionStatus:
          initialTicket.resolution_status === "Resolved"
            ? "Resolved"
            : initialTicket.resolution_status === "WIP"
            ? "WIP"
            : initialTicket.resolution_status === "Can't Resolve"
            ? "Can't Resolve"
            : "Pending",
        callStatus:
          initialTicket.call_status === "Connected"
            ? "Connected"
            : initialTicket.call_status === "Not Connected"
            ? "Not Connected"
            : "Connected",
        cseRemarks: initialTicket.cse_remarks || "",
        selectedOtherReasons: parseOtherReasons(initialTicket.other_reasons),
      };
    }

    const persisted = getPersistedState();
    if (persisted) {
      return persisted;
    }

    return {
      currentTicket: null,
      showPendingCard: true,
      resolutionStatus: "Pending" as const,
      callStatus: "Connected" as const,
      cseRemarks: "",
      selectedOtherReasons: [],
    };
  };

  const initialState = getInitialState();

  const [currentTicket, setCurrentTicket] = useState<any>(initialState.currentTicket);
  const [showPendingCard, setShowPendingCard] = useState(initialState.showPendingCard);
  const [ticketStats, setTicketStats] = useState<TicketStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    notPossible: 0,
  });
  const [resolutionStatus, setResolutionStatus] = useState<"WIP" | "Resolved" | "Can't Resolve" | "Pending">(
    initialState.resolutionStatus
  );
  const [callStatus, setCallStatus] = useState<"Connected" | "Not Connected">(
    initialState.callStatus
  );
  const [cseRemarks, setCseRemarks] = useState(initialState.cseRemarks);
  const [selectedOtherReasons, setSelectedOtherReasons] = useState<string[]>(
    initialState.selectedOtherReasons
  );
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [ticketStartTime, setTicketStartTime] = useState<Date | null>(null);
  const [notConnectedClicked, setNotConnectedClicked] = useState(false);

  const isReadOnly = config?.readOnly || false;

  useEffect(() => {
    if (isInitialized.current) {
      persistState({
        currentTicket,
        showPendingCard,
        resolutionStatus,
        callStatus,
        cseRemarks,
        selectedOtherReasons,
      });
    }
  }, [currentTicket, showPendingCard, resolutionStatus, callStatus, cseRemarks, selectedOtherReasons]);

  const calculateResolutionTime = (): string => {
    if (!ticketStartTime) return "";
    const endTime = new Date();
    const diffInSeconds = Math.floor((endTime.getTime() - ticketStartTime.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const unassignTicket = async (ticketId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("support_ticket")
        .update({
          assigned_to: null,
          cse_name: null,
        })
        .eq("id", ticketId);

      console.log("Ticket unassigned successfully");
    } catch (error) {
      console.error("Error unassigning ticket:", error);
    }
  };

  const fetchTicketStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URI}/get-ticket-status`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const stats: TicketStats = {
        total: data.total_tickets || 0,
        pending: data.total_pending_tickets || 0,
        inProgress: 0,
        resolved: data.total_completed_tickets || 0,
        notPossible: 0,
      };
      const calculatedInProgress = Math.max(0, stats.total - stats.pending - stats.resolved);
      stats.inProgress = calculatedInProgress;

      setTicketStats(stats);
    } catch (error) {
      console.error("Error fetching ticket statistics:", error);
      setTicketStats({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        notPossible: 0,
      });
    }
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const endpoint = config?.apiEndpoint || "/api/tickets";
      const excludeParam = currentTicket?.id ? `&exclude=${currentTicket.id}` : '';
      const apiUrl = `${import.meta.env.VITE_API_URI}${endpoint}?assign=false${excludeParam}`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          setShowPendingCard(true);
          setCurrentTicket(null);
          setTicketStartTime(null);
          setResolutionStatus("Pending");
          setCseRemarks("");
          setCallStatus("Connected");
          setSelectedOtherReasons([]);
          isInitialized.current = false;
          clearPersistedState();
          await fetchTicketStats();
          toast.info("No tickets available at the moment.");
          return;
        } else if (response.status === 409) {
          toast.warning("Ticket already claimed, retrying...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchTicket(); // Retry
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ticketData = await response.json();

      if (!ticketData || (typeof ticketData === "object" && !Object.keys(ticketData).length)) {
        setShowPendingCard(true);
        setCurrentTicket(null);
        setTicketStartTime(null);
        setResolutionStatus("Pending");
        setCseRemarks("");
        setCallStatus("Connected");
        setSelectedOtherReasons([]);
        isInitialized.current = false;
        clearPersistedState();
        await fetchTicketStats();
        toast.info("No tickets available.");
        return;
      }

      let nextTicket = null;
      if (ticketData && typeof ticketData === "object") {
        if (ticketData.id) {
          nextTicket = ticketData;
        } else if (ticketData.ticket && ticketData.ticket.id) {
          nextTicket = ticketData.ticket;
        } else if (ticketData.data && ticketData.data.id) {
          nextTicket = ticketData.data;
        } else if (Array.isArray(ticketData) && ticketData.length > 0) {
          nextTicket = ticketData[0];
        }
      }

      if (nextTicket && nextTicket.id) {
        setCurrentTicket(nextTicket);
        setResolutionStatus(
          nextTicket.resolution_status === "Resolved"
            ? "Resolved"
            : nextTicket.resolution_status === "WIP"
            ? "WIP"
            : nextTicket.resolution_status === "Can't Resolve"
            ? "Can't Resolve"
            : "Pending"
        );
        setCseRemarks(nextTicket.cse_remarks || "");
        setCallStatus(
          nextTicket.call_status === "Connected"
            ? "Connected"
            : nextTicket.call_status === "Not Connected"
            ? "Not Connected"
            : "Connected"
        );
        setSelectedOtherReasons(parseOtherReasons(nextTicket.other_reasons));
        setShowPendingCard(false);
        setTicketStartTime(new Date());
        isInitialized.current = true;
      } else {
        setShowPendingCard(true);
        setCurrentTicket(null);
        setTicketStartTime(null);
        setResolutionStatus("Pending");
        setCseRemarks("");
        setCallStatus("Connected");
        setSelectedOtherReasons([]);
        isInitialized.current = false;
        clearPersistedState();
        await fetchTicketStats();
        toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        toast.error("Request timed out. Please try again.");
      } else {
        console.error("Error fetching ticket:", error);
        toast.error(error.message || "Failed to fetch ticket");
      }
      setShowPendingCard(true);
      setCurrentTicket(null);
      setTicketStartTime(null);
      setResolutionStatus("Pending");
      setCseRemarks("");
      setCallStatus("Connected");
      setSelectedOtherReasons([]);
      isInitialized.current = false;
      clearPersistedState();
      await fetchTicketStats();
    } finally {
      setLoading(false);
    }
  };

  const handleTakeBreak = async () => {
    try {
      if (currentTicket?.id && resolutionStatus !== "WIP") {
        await unassignTicket(currentTicket.id);
        toast.info("Ticket unassigned. Taking a break.");
      } else if (resolutionStatus === "WIP") {
        toast.info("Ticket is in progress. Taking a break without unassigning.");
      }

      setShowPendingCard(true);
      setCurrentTicket(null);
      setTicketStartTime(null);
      setResolutionStatus("Pending");
      setCseRemarks("");
      setCallStatus("Connected");
      setSelectedOtherReasons([]);
      isInitialized.current = false;
      clearPersistedState();
      await fetchTicketStats();
      toast.info("Taking a break. Click 'Get Tickets' when ready to continue.");
    } catch (error) {
      console.error("Error taking break:", error);
      toast.error("Error taking break. Please try again.");
    }
  };

  useEffect(() => {
    fetchTicketStats();
  }, []);

  useEffect(() => {
    if (!showPendingCard) return;
    const interval = setInterval(() => {
      fetchTicketStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [showPendingCard]);

  const handleOtherReasonChange = (reason: string, checked: boolean) => {
    if (checked) {
      setSelectedOtherReasons((prev) => [...prev, reason]);
    } else {
      setSelectedOtherReasons((prev) => prev.filter((r) => r !== reason));
    }
  };

  const ActionNotConnected = async (ticketId: number) => {
    const newCallStatus = callStatus === "Not Connected" ? "Connected" : "Not Connected";
    setCallStatus(newCallStatus);
    
    // Set flag when "Not Connected" button is clicked
    if (newCallStatus === "Not Connected") {
      setNotConnectedClicked(true);
    }
    
    await handleSubmit();
  };

  const handleSubmit = async () => {
    try {
      if (!currentTicket?.id) {
        toast.error("No ticket ID available");
        return;
      }

      if (isReadOnly) {
        toast.error("This ticket is read-only");
        return;
      }

      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication required");
      }

      const currentTime = new Date().toISOString();
      const calculatedResolutionTime = calculateResolutionTime();
      const isCallNotConnected = callStatus === "Not Connected";
      let snoozeUntil = null;
      let newCallAttempts = currentTicket.call_attempts || 0;

      if (isCallNotConnected) {
        const currentDate = new Date();
        if (newCallAttempts === 0) {
          currentDate.setHours(currentDate.getHours() + 1);
          snoozeUntil = currentDate.toISOString();
        } else {
          currentDate.setDate(currentDate.getDate() + 1000);
          snoozeUntil = currentDate.toISOString();
        }
      }

      // Only increment call attempts when "Not Connected" button was clicked
      if (notConnectedClicked && isCallNotConnected) {
        newCallAttempts += 1;
        setNotConnectedClicked(false); // Reset the flag
      }
      
      const shouldAssign = resolutionStatus === "WIP";
      const assignedTo = shouldAssign ? user?.id || "Unknown CSE" : null;

      const { data: updatedTicket, error: updateError } = await supabase
        .from("support_ticket")
        .update({
          resolution_status: resolutionStatus,
          assigned_to: assignedTo,
          cse_remarks: cseRemarks,
          cse_name: user?.email || "Unknown CSE",
          call_status: callStatus,
          resolution_time: calculatedResolutionTime || null,
          call_attempts: newCallAttempts,
          completed_at: resolutionStatus === "Resolved" || resolutionStatus === "Can't Resolve" ? currentTime : null,
          snooze_until: snoozeUntil,
          other_reasons: selectedOtherReasons,
        })
        .eq("id", currentTicket.id)
        .select()
        .maybeSingle();

      if (updateError) {
        toast.error("Failed to update ticket. Retrying...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryUpdatedTicket, error: retryError } = await supabase
          .from("support_ticket")
          .update({
            resolution_status: resolutionStatus,
            assigned_to: assignedTo,
            cse_remarks: cseRemarks,
            cse_name: user?.email || "Unknown CSE",
            call_status: callStatus,
            resolution_time: calculatedResolutionTime || null,
            call_attempts: newCallAttempts,
            completed_at: resolutionStatus === "Resolved" || resolutionStatus === "Can't Resolve" ? currentTime : null,
            snooze_until: snoozeUntil,
            other_reasons: selectedOtherReasons,
          })
          .eq("id", currentTicket.id)
          .select()
          .maybeSingle();

        if (retryError) {
          throw retryError;
        }
        setCurrentTicket(retryUpdatedTicket);
      } else {
        setCurrentTicket(updatedTicket);
      }

      if (onUpdate) {
        onUpdate(updatedTicket);
      }

      setTimeout(async () => {
        try {
          setFetchingNext(true);
          const currentTicketId = currentTicket?.id;

          if (!currentTicketId) {
            setShowPendingCard(true);
            setCurrentTicket(null);
            setTicketStartTime(null);
            setResolutionStatus("Pending");
            setCseRemarks("");
            setCallStatus("Connected");
            setSelectedOtherReasons([]);
            isInitialized.current = false;
            clearPersistedState();
            await fetchTicketStats();
            return;
          }

          let nextTicket = null;
          let attempts = 0;
          const maxAttempts = 3;

          while (attempts < maxAttempts) {
            attempts++;
            const endpoint = config?.apiEndpoint || "/api/tickets";
            const excludeParam = currentTicketId ? `&exclude=${currentTicketId}` : '';
            const apiUrl = `${import.meta.env.VITE_API_URI}${endpoint}?assign=false${excludeParam}`;
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
              throw new Error("Authentication required");
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(apiUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
             
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              if (response.status === 404) {
                setShowPendingCard(true);
                setCurrentTicket(null);
                setTicketStartTime(null);
                setResolutionStatus("Pending");
                setCseRemarks("");
                setCallStatus("Connected");
                setSelectedOtherReasons([]);
                isInitialized.current = false;
                clearPersistedState();
                await fetchTicketStats();
                toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
                return;
              } else if (response.status === 409) {
                toast.warning("Ticket already claimed, retrying...");
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const ticketData = await response.json();

            if (!ticketData || (typeof ticketData === "object" && !Object.keys(ticketData).length)) {
              setShowPendingCard(true);
              setCurrentTicket(null);
              setTicketStartTime(null);
              setResolutionStatus("Pending");
              setCseRemarks("");
              setCallStatus("Connected");
              setSelectedOtherReasons([]);
              isInitialized.current = false;
              clearPersistedState();
              await fetchTicketStats();
              toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
              return;
            }

            if (ticketData.id) {
              nextTicket = ticketData;
            } else if (ticketData.ticket && ticketData.ticket.id) {
              nextTicket = ticketData.ticket;
            } else if (ticketData.data && ticketData.data.id) {
              nextTicket = ticketData.data;
            } else if (Array.isArray(ticketData) && ticketData.length > 0) {
              nextTicket = ticketData[0];
            }

            if (nextTicket && nextTicket.id && nextTicket.id !== currentTicketId) {
              setCurrentTicket(nextTicket);
              setResolutionStatus(
                nextTicket.resolution_status === "Resolved"
                  ? "Resolved"
                  : nextTicket.resolution_status === "WIP"
                  ? "WIP"
                  : nextTicket.resolution_status === "Can't Resolve"
                  ? "Can't Resolve"
                  : "Pending"
              );
              setCseRemarks(nextTicket.cse_remarks || "");
              setCallStatus(
                nextTicket.call_status === "Connected"
                  ? "Connected"
                  : nextTicket.call_status === "Not Connected"
                  ? "Not Connected"
                  : "Connected"
              );
              setSelectedOtherReasons(parseOtherReasons(nextTicket.other_reasons));
              setShowPendingCard(false);
              setTicketStartTime(new Date());
              isInitialized.current = true;
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          if (!nextTicket || !nextTicket.id || nextTicket.id === currentTicketId) {
            setShowPendingCard(true);
            setCurrentTicket(null);
            setTicketStartTime(null);
            setResolutionStatus("Pending");
            setCseRemarks("");
            setCallStatus("Connected");
            setSelectedOtherReasons([]);
            isInitialized.current = false;
            clearPersistedState();
            await fetchTicketStats();
            toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
          }
        } catch (error: any) {
          if (error.name === "AbortError") {
            toast.error("Request timed out. Please try again.");
          } else {
            console.error("Error in delayed fetch:", error);
            toast.error(error.message || "Failed to fetch next ticket");
          }
          setShowPendingCard(true);
          setCurrentTicket(null);
          setTicketStartTime(null);
          setResolutionStatus("Pending");
          setCseRemarks("");
          setCallStatus("Connected");
          setSelectedOtherReasons([]);
          isInitialized.current = false;
          clearPersistedState();
          await fetchTicketStats();
        } finally {
          setFetchingNext(false);
        }
      }, 1000);
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update ticket. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showPendingCard) {
    return (
      <PendingTicketsCard
        onGetFirstTicket={fetchTicket}
        loading={loading}
        ticketStats={ticketStats}
      />
    );
  }

  if (!currentTicket) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p>No ticket available</p>
        <Button onClick={fetchTicket} disabled={loading}>
          Get Tickets
        </Button>
      </div>
    );
  }

  const formattedDate = currentTicket?.ticket_date
    ? new Date(currentTicket.ticket_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="relative w-full h-full">
      <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-4">
        {fetchingNext && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading next ticket...</p>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-primary">
                {config?.title || "Support Tickets"}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                {currentTicket?.badge && currentTicket.badge !== "N/A" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Badge:</span>
                    <span className="text-xs font-medium">{currentTicket.badge}</span>
                  </div>
                )}
                {currentTicket?.subscription_status &&
                  currentTicket.subscription_status !== "N/A" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Subscription:</span>
                      <span className="text-xs font-medium">
                        {currentTicket.subscription_status}
                      </span>
                    </div>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleTakeBreak}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={updating || isReadOnly}
              >
                <Coffee className="h-3 w-3" />
                Take a Break
              </Button>
              <Select
                value={resolutionStatus}
                onValueChange={async (value: "WIP" | "Resolved" | "Can't Resolve" | "Pending") => {
                  setResolutionStatus(value);
                  if (value === "WIP" && currentTicket?.id && !isReadOnly) {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (session) {
                        await supabase
                          .from("support_ticket")
                          .update({
                            assigned_to: user?.id || "Unknown CSE",
                            cse_name: user?.email || "Unknown CSE",
                          })
                          .eq("id", currentTicket.id);
                        setCurrentTicket((prev: any) => ({
                          ...prev,
                          assigned_to: user?.id || "Unknown CSE",
                          cse_name: user?.email || "Unknown CSE",
                        }));
                      }
                    } catch (error) {
                      console.error("Error assigning ticket:", error);
                      toast.error("Failed to assign ticket");
                    }
                  }
                }}
                disabled={updating || isReadOnly}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIP">Work in Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Can't Resolve">Can't Resolve</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div
                className={`flex items-center text-sm bg-muted/50 p-2 rounded-md ${
                  currentTicket?.praja_dashboard_user_link
                    ? "cursor-pointer hover:bg-muted/70 transition-colors"
                    : ""
                }`}
                onClick={() => {
                  if (currentTicket?.praja_dashboard_user_link) {
                    window.open(currentTicket.praja_dashboard_user_link, "_blank");
                  }
                }}
              >
                {currentTicket?.display_pic_url ? (
                  <img
                    src={currentTicket.display_pic_url}
                    alt={`${currentTicket.name || "User"} profile`}
                    className="h-6 w-6 rounded-full mr-2 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <User
                  className={`h-3 w-3 mr-2 text-primary ${
                    currentTicket?.display_pic_url ? "hidden" : ""
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">{currentTicket?.name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {currentTicket?.user_id || "N/A"}
                  </p>
                </div>
              </div>
              {currentTicket?.rm_name && (
                <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                  <User className="h-3 w-3 mr-2 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">RM Name</p>
                    <p className="font-medium text-sm">{currentTicket.rm_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                <Phone className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">{currentTicket?.phone || "N/A"}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                <Waypoints className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">{currentTicket?.source || "N/A"}</span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                {currentTicket?.atleast_paid_once ? (
                  <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 mr-2 text-red-500" />
                )}
                <span className="font-medium text-sm">
                  Payment Status (Atleast once):{" "}
                  {currentTicket?.atleast_paid_once ? "Paid" : "Never Paid"}
                </span>
              </div>
              <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                <Clock className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">
                  Attempts: {currentTicket?.call_attempts || 0}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-muted/30 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-3 w-3 text-primary" />
                  <p className="font-medium text-sm">Issue Details</p>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Primary Reason</p>
                    <p className="text-sm bg-muted/50 p-2 rounded-md">
                      {currentTicket?.reason || "No reason provided"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Other Reasons</p>
                    <div className="space-y-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-between"
                            disabled={updating || isReadOnly}
                          >
                            <span className="text-sm">
                              {selectedOtherReasons.length > 0
                                ? `${selectedOtherReasons.length} reason(s) selected`
                                : "Select other reasons"}
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Select Other Reasons</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {OTHER_REASONS_OPTIONS.map((reason) => (
                                <div key={reason} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`reason-${reason}`}
                                    checked={selectedOtherReasons.includes(reason)}
                                    onCheckedChange={(checked) =>
                                      handleOtherReasonChange(reason, checked as boolean)
                                    }
                                    disabled={updating || isReadOnly}
                                  />
                                  <label
                                    htmlFor={`reason-${reason}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {reason}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {selectedOtherReasons.length > 0 && (
                              <div className="pt-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedOtherReasons([])}
                                  disabled={updating || isReadOnly}
                                  className="text-xs"
                                >
                                  Clear All
                                </Button>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {selectedOtherReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedOtherReasons.map((reason) => (
                            <Badge key={reason} variant="secondary" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-3 w-3 text-primary" />
                  CSE Remarks
                </label>
                <Textarea
                  value={cseRemarks}
                  onChange={(e) => setCseRemarks(e.target.value)}
                  placeholder="Add your remarks about this ticket..."
                  className="min-h-[80px]"
                  disabled={updating || isReadOnly}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 mt-4 pt-3 border-t">
          <div className="flex gap-2">
            <Button
              onClick={() => ActionNotConnected(currentTicket.id)}
              size="sm"
              variant={callStatus === "Not Connected" ? "default" : "outline"}
              className={`
                ${callStatus === "Not Connected" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              `}
              disabled={updating || isReadOnly}
            >
              Not Connected
            </Button>
          </div>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={updating || isReadOnly || fetchingNext}
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Updating...
              </>
            ) : fetchingNext ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Loading Next Ticket...
              </>
            ) : isReadOnly ? (
              "Close"
            ) : (
              "Save & Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};