import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { convertGMTtoIST } from "@/lib/timeUtils";
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
  MoreVertical,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PendingTicketsCard, TicketStats } from "@/components/ui/PendingTicketsCard";
import { SupportTicketTaskProgress } from "@/components/page-builder/SupportTicketTaskProgress";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import {
  formatTicketSaveErrorMessage,
  isExpectedTicketSaveError,
  isStaleTicketSaveError,
} from "@/lib/api/errors";


interface Ticket {
  id: number;
  created_at: string;
  dumped_at: string;
  user_id: string;
  name: string;
  phone: string;
  source: string;
  subscription_status: string | null;
  atleast_paid_once: boolean | null;
  reason: string;
  other_reasons: string[] | string | null;
  badge: string | null;
  poster?: string | null;
  support_ticket_type?: string | null;
  Jatra_link?: string | null;
  tenant_id: string;
  assigned_to: string | null;
  layout_status: string;
  state?: string | null;
  tasks?: Array<{ task?: string; title?: string; status?: string; id?: string }>;
  task_progress?: Array<{ id: string; label: string; status: "completed" | "current" | "pending" }>;
  record_id?: number;
  support_ticket_id?: number;
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
  "Add Additional Badge",
  "Autopay Cancellation",
  "Autopay Cancellation Confirmation",
  "Badge Change",
  "Badge Removal",
  "Badge Request",
  "Feature Request",
  "Features Information",
  "Frame Change",
  "Location Change",
  "New Poster Request",
  "No Issue",
  "Number Update",
  "Partial Refund",
  "Protocal Change",
  "Refund Issued",
  "Refund Not Issued",
  "Subscription Information",
  "Update Affiliated Party",
  "User Name Update",
  "User Photo Background Change",
  "User Photo Change",
  "User photo/Protocal Size Issue",
  "Self Trial Completion",
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

// Function to format phone number
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "N/A";
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `+91 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // Check if it already has country code (12 digits starting with 91)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  // If it doesn't match expected formats, return as is
  return phone;
};

// Function to get clean phone number for links
const getCleanPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  return phone.replace(/\D/g, '');
};


// Function to handle WhatsApp action
const handleWhatsApp = (phone: string) => {
  const cleanNumber = getCleanPhoneNumber(phone);
  if (cleanNumber) {
    const message = `Hi, I'm calling regarding your support ticket.`;
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }
};

// Function to format poster status with better UI
const formatPosterStatus = (poster: string): { label: string; color: string; bgColor: string } => {
  switch (poster) {
    case 'in_trial':
      return { label: 'In Trial', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    case 'paid':
      return { label: 'Paid', color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'in_trial_extension':
      return { label: 'Trial Extended', color: 'text-purple-600', bgColor: 'bg-purple-50' };
    case 'in_premium_extension':
      return { label: 'Premium Extended', color: 'text-indigo-600', bgColor: 'bg-indigo-50' };
    case 'trial_expired':
      return { label: 'Trial Expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'premium_expired':
      return { label: 'Premium Expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'in_grace_period':
      return { label: 'Grace Period', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    case 'auto_pay_not_set_up':
      return { label: 'Auto-pay Not Set', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    case 'autopay_setup_no_layout':
      return { label: 'Auto-pay No Layout', color: 'text-amber-600', bgColor: 'bg-amber-50' };
    case 'free':
      return { label: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    case 'Self_Trial':
      return { label: 'Self Trial', color: 'text-cyan-600', bgColor: 'bg-cyan-50' };
    default:
      return { label: poster || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

function getSupportTicketType(ticket: Ticket | null | undefined): string | null {
  return ticket?.support_ticket_type ?? ticket?.poster ?? null;
}

interface TicketCarouselProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    apiPrefix?: 'supabase' | 'renderer';
    title?: string;
  };
  initialTicket?: any;
  onUpdate?: (updatedTicket: any) => void;
}

export const TicketCarousel: React.FC<TicketCarouselProps> = ({
  config,
  initialTicket,
  onUpdate,
}) => {
  const { user, session } = useAuth();

  const isInitialized = React.useRef(false);
  const PERSIST_MAX_AGE_MS = 4 * 60 * 60 * 1000;

  //getting the persisted state from the session storage
  const getPersistedState = () => {
    try {
      const persisted = sessionStorage.getItem("ticketCarouselState");
      return persisted ? JSON.parse(persisted) : null;
    } catch {
      return null;
    }
  };

  //persisting the state to the session storage
  const persistState = (state: any) => {
    try {
      sessionStorage.setItem(
        "ticketCarouselState",
        JSON.stringify({ ...state, persistedAt: Date.now() })
      );
    } catch (error) {
      console.error("Error persisting state:", error);
    }
  };

  //clearing the persisted state from the session storage
  const clearPersistedState = () => {
    try {
      sessionStorage.removeItem("ticketCarouselState");
    } catch (error) {
      console.error("Error clearing persisted state:", error);
    }
  };

  //getting the initial state from the initial ticket
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
      const age = Date.now() - Number(persisted.persistedAt ?? 0);
      const sessionExpired = !persisted.persistedAt || age > PERSIST_MAX_AGE_MS;
      if (sessionExpired) {
        return {
          currentTicket: null,
          showPendingCard: true,
          resolutionStatus: "Pending" as const,
          callStatus: "Connected" as const,
          cseRemarks: "",
          selectedOtherReasons: [],
        };
      }
      return {
        ...persisted,
        showPendingCard: persisted.showPendingCard ?? !persisted.currentTicket,
      };
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
  const [ticket, setTicket] = useState({
    resolutionStatus: initialState.resolutionStatus as "WIP" | "Resolved" | "Can't Resolve" | "Pending",
    callStatus: initialState.callStatus as "Connected" | "Not Connected",
    cseRemarks: initialState.cseRemarks,
    selectedOtherReasons: initialState.selectedOtherReasons,
    ticketStartTime: null as Date | null,
    reviewRequested: false as boolean,
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fetchingNext, setFetchingNext] = useState(false);


  useEffect(() => {
    if (isInitialized.current) {
      persistState({
        currentTicket,
        showPendingCard,
        resolutionStatus: ticket.resolutionStatus,
        callStatus: ticket.callStatus,
        cseRemarks: ticket.cseRemarks,
        selectedOtherReasons: ticket.selectedOtherReasons,
      });
    }
  }, [currentTicket, showPendingCard, ticket.resolutionStatus, ticket.callStatus, ticket.cseRemarks, ticket.selectedOtherReasons]);

  useEffect(() => {
    if (initialTicket || !currentTicket?.id || showPendingCard) return;
    setTicket((prev) => ({
      ...prev,
      ticketStartTime: prev.ticketStartTime ?? new Date(),
    }));
    isInitialized.current = true;
  }, [initialTicket, currentTicket?.id, showPendingCard]);

  //calculating the resolution time
  const calculateResolutionTime = (): string => {
    if (!ticket.ticketStartTime) return "";
    const endTime = new Date();
    const diffInSeconds = Math.floor((endTime.getTime() - ticket.ticketStartTime.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  //fetching the ticket stats
  const fetchTicketStats = async () => {
    try {
      if (!session) return;

      const response = await apiClient.get("/analytics/get-ticket-status/", {
      });
      const data = response.data;
      
      // Map the new backend structure to our TicketStats interface
      const stats: TicketStats = {
        total: (data.ticketStats?.totalPendingTickets || 0) + (data.ticketStats?.wipTickets || 0) + (data.ticketStats?.resolvedByYouToday || 0) + (data.ticketStats?.cantResolveToday || 0),
        pending: data.ticketStats?.totalPendingTickets || 0,
        inProgress: data.ticketStats?.wipTickets || 0,
        resolved: data.ticketStats?.resolvedByYouToday || 0,
        notPossible: data.ticketStats?.cantResolveToday || 0,
        // Include the additional backend fields
        resolvedByYouToday: data.ticketStats?.resolvedByYouToday || 0,
        totalPendingTickets: data.ticketStats?.totalPendingTickets || 0,
        wipTickets: data.ticketStats?.wipTickets || 0,
        cantResolveToday: data.ticketStats?.cantResolveToday || 0,
        pendingByPoster: data.ticketStats?.pendingByPoster || [],
      };

      setTicketStats(stats);
    } catch (error) {
      console.error("Error fetching ticket statistics:", error);
      setTicketStats({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        notPossible: 0,
        resolvedByYouToday: 0,
        totalPendingTickets: 0,
        wipTickets: 0,
        cantResolveToday: 0,
        pendingByPoster: [],
      });
    }
  };

  // Helper function to reset ticket state
  const resetTicketState = () => {
    setTicket({
      resolutionStatus: "Pending",
      callStatus: "Connected",
      cseRemarks: "",
      selectedOtherReasons: [],
      ticketStartTime: null,
      reviewRequested: false,
    });
  };

  const resetToPendingQueue = async (toastMessage?: string) => {
    setShowPendingCard(true);
    setCurrentTicket(null);
    resetTicketState();
    isInitialized.current = false;
    clearPersistedState();
    await fetchTicketStats();
    if (toastMessage) {
      toast.info(toastMessage);
    }
  };

  // Helper function to set ticket from API response
  const setTicketFromResponse = (nextTicket: any) => {
    setCurrentTicket(nextTicket);
    setTicket({
      resolutionStatus: nextTicket.resolution_status === "Resolved"
        ? "Resolved"
        : nextTicket.resolution_status === "WIP"
        ? "WIP"
        : nextTicket.resolution_status === "Can't Resolve"
        ? "Can't Resolve"
        : "Pending",
      callStatus: nextTicket.call_status === "Connected"
        ? "Connected"
        : nextTicket.call_status === "Not Connected"
        ? "Not Connected"
        : "Connected",
      cseRemarks: nextTicket.cse_remarks || "",
      selectedOtherReasons: parseOtherReasons(nextTicket.other_reasons),
      ticketStartTime: new Date(),
      reviewRequested: Boolean(nextTicket.review_requested),
    });
    setShowPendingCard(false);
    isInitialized.current = true;
  };

  //fetching the next ticket
  const fetchNextTicket = async (currentTicketId: number) => {
    try {
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      const response = await apiClient.get("/support-ticket/get-next-ticket/", {
      });
      const ticketData = response.data;

      if (!ticketData || (typeof ticketData === "object" && !Object.keys(ticketData).length)) {
        setShowPendingCard(true);
        setCurrentTicket(null);
        resetTicketState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchTicketStats();
        toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
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
        setTicketFromResponse(nextTicket);
      } else {
        setShowPendingCard(true);
        setCurrentTicket(null);
        resetTicketState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchTicketStats();
        toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
      }

    } catch (error: any) {
      if (error?.response?.status === 404) {
        setShowPendingCard(true);
        setCurrentTicket(null);
        resetTicketState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchTicketStats();
        toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
        return;
      }
      console.error("Error fetching next ticket:", error);
      toast.error(error.message || "Failed to fetch next ticket");
      setShowPendingCard(true);
      setCurrentTicket(null);
      resetTicketState();
      isInitialized.current = false;
      clearPersistedState();
      await fetchTicketStats();
    }
  };

  //taking a break
  const handleTakeBreak = async () => {
    try {
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      await apiClient.post("/support-ticket/take-break/", {
        ticketId: currentTicket?.id,
      });

      // Navigate to pending card
      setShowPendingCard(true);
      setCurrentTicket(null);
      resetTicketState();
      isInitialized.current = false;
      clearPersistedState();
      await fetchTicketStats();
      toast.info("Taking a break. Click 'Get Tickets' when ready to continue.");
    } catch (error) {
      console.error("Error taking break:", error);
      toast.error("Error taking break. Please try again.");
    }
  };

  //fetching the ticket stats (initially)
  useEffect(() => {
    fetchTicketStats();
  }, []);

  //fetching the ticket stats (interval)
  useEffect(() => {
    if (!showPendingCard) return;
    const interval = setInterval(() => {
      fetchTicketStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [showPendingCard]);

  //handling the other reason change
  const handleOtherReasonChange = (reason: string, checked: boolean) => {
    if (checked) {
      setTicket(prev => ({
        ...prev,
        selectedOtherReasons: [...prev.selectedOtherReasons, reason]
      }));
    } else {
      setTicket(prev => ({
        ...prev,
        selectedOtherReasons: prev.selectedOtherReasons.filter((r) => r !== reason)
      }));
    }
  };

  //handling the action buttons
  const handleActionButton = async (action: "Not Connected" | "Can't Resolve" | "Call Later" | "Resolve") => {
    try {
      const ticketId = Number(currentTicket?.id);
      if (!Number.isFinite(ticketId)) {
        toast.error("No ticket ID available");
        await resetToPendingQueue();
        return;
      }

      setUpdating(true);
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      // Map action to resolution status
      let resolutionStatus: "Pending" | "WIP" | "Can't Resolve" | "Resolved";
      let callStatus = ticket.callStatus;
      
      switch (action) {
        case "Not Connected":
          resolutionStatus = "Pending";
          callStatus = "Not Connected";
          break;
        case "Can't Resolve":
          resolutionStatus = "Can't Resolve";
          break;
        case "Call Later":
          resolutionStatus = "WIP";
          break;
        case "Resolve":
          resolutionStatus = "Resolved";
          break;
        default:
          resolutionStatus = "Pending";
      }

      // Update local state
      setTicket(prev => ({
        ...prev,
        resolutionStatus,
        callStatus
      }));

      let endpoint = "/support-ticket/save-and-continue/";
      let payload: Record<string, unknown> = {
        ticketId,
        resolutionStatus,
        callStatus,
        cseRemarks: ticket.cseRemarks ?? "",
        resolutionTime: calculateResolutionTime(),
        otherReasons: Array.isArray(ticket.selectedOtherReasons) ? ticket.selectedOtherReasons : [],
        reviewRequested: Boolean(ticket.reviewRequested),
      };

      if (ticket.ticketStartTime) {
        payload.ticketStartTime = ticket.ticketStartTime.toISOString();
      }

      if (action === "Not Connected") {
        endpoint = "/support-ticket/update-call-status/";
        payload = {
          ticketId,
          callStatus,
          cseRemarks: ticket.cseRemarks ?? "",
          otherReasons: Array.isArray(ticket.selectedOtherReasons) ? ticket.selectedOtherReasons : [],
        };
      }

      await apiClient.post(endpoint, payload);

      await fetchNextTicket(ticketId);

    } catch (error: unknown) {
      const message = formatTicketSaveErrorMessage(error);
      if (isStaleTicketSaveError(error)) {
        console.warn("[TicketCarousel] Stale ticket on save:", message);
        await resetToPendingQueue(message);
        return;
      }
      if (isExpectedTicketSaveError(error)) {
        console.warn("[TicketCarousel] Expected save error:", message);
      } else {
        console.error("Error in handleActionButton:", error);
      }
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  //fetching the first ticket
  const fetchFirstTicket = async () => {
    try {
      setLoading(true);
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      const response = await apiClient.get("/support-ticket/get-next-ticket/", {
        params: {
          assign: "false",
        },
      });
      const ticketData = response.data;

      if (!ticketData || (typeof ticketData === "object" && !Object.keys(ticketData).length)) {
        setShowPendingCard(true);
        setCurrentTicket(null);
        resetTicketState();
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
        setTicketFromResponse(nextTicket);
      } else {
        setShowPendingCard(true);
        setCurrentTicket(null);
        resetTicketState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchTicketStats();
        toast.info("No tickets available.");
      }

    } catch (error: any) {
      if (error?.response?.status === 404) {
        setShowPendingCard(true);
        setCurrentTicket(null);
        resetTicketState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchTicketStats();
        toast.info("No tickets available at the moment.");
        return;
      }
      console.error("Error fetching first ticket:", error);
      toast.error(error.message || "Failed to fetch ticket");
      setShowPendingCard(true);
      setCurrentTicket(null);
      resetTicketState();
      isInitialized.current = false;
      clearPersistedState();
      await fetchTicketStats();
    } finally {
      setLoading(false);
    }
  };

  //loading the page
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  //showing the pending tickets card
  if (showPendingCard) {
    return (
      <PendingTicketsCard
        onGetFirstTicket={fetchFirstTicket}
        loading={loading}
        ticketStats={ticketStats}
        title={config?.title || "Today's Tickets"}
      />
    );
  }

  //showing the no ticket available card
  if (!currentTicket) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p>No ticket available</p>
        <CustomButton onClick={fetchFirstTicket} disabled={loading} loading={loading}>
          Get Tickets
        </CustomButton>
      </div>
    );
  }

  const ticketTimestamp = currentTicket?.dumped_at || currentTicket?.ticket_date || currentTicket?.created_at;
  const formattedTicketDate = ticketTimestamp
    ? convertGMTtoIST(ticketTimestamp, "date", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  const isCompact = !!initialTicket;
  const supportTicketType = getSupportTicketType(currentTicket);
  const posterInfo = supportTicketType ? formatPosterStatus(supportTicketType) : null;
  const displayTicketId =
    currentTicket?.record_id ||
    currentTicket?.support_ticket_id ||
    currentTicket?.id;
  const userProfile = (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
        {currentTicket?.display_pic_url ? (
          <img
            src={currentTicket.display_pic_url}
            alt={`${currentTicket.name || "User"} profile`}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <User className="h-6 w-6 text-slate-500" />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="truncate text-xl font-semibold text-slate-900">
          {currentTicket?.name || "N/A"}
        </p>
        {currentTicket?.state ? (
          <p className="text-sm font-medium uppercase tracking-wide text-slate-600">
            {currentTicket.state}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-500">
            ID: {currentTicket?.user_id || "N/A"}
          </span>
          {posterInfo ? (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                posterInfo.color,
                posterInfo.bgColor
              )}
            >
              {posterInfo.label}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "font-body mainCard flex w-full flex-col",
        isCompact ? "gap-4" : "mx-auto max-w-6xl gap-5 px-2 py-2 md:px-4"
      )}
    >
      {!isCompact && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            {currentTicket?.badge && currentTicket.badge !== "N/A" && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Badge:</span>
                <span className="font-medium text-slate-800">{currentTicket.badge}</span>
              </div>
            )}
            {currentTicket?.subscription_status &&
              currentTicket.subscription_status !== "N/A" && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Subscription:</span>
                  <span className="font-medium text-slate-800">
                    {currentTicket.subscription_status}
                  </span>
                </div>
              )}
          </div>
          <CustomButton
            onClick={handleTakeBreak}
            variant="outline"
            size="sm"
            icon={<Coffee className="h-4 w-4" />}
            disabled={updating}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 shadow-sm"
          >
            Take a Break
          </CustomButton>
        </div>
      )}

      <div className="relative w-full">
        <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {fetchingNext && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                <p className="text-sm text-muted-foreground">Loading next ticket...</p>
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="min-w-0 flex-1 space-y-2">
              {currentTicket?.praja_dashboard_user_link ? (
                <a
                  href={currentTicket.praja_dashboard_user_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-opacity hover:opacity-90"
                >
                  {userProfile}
                </a>
              ) : (
                userProfile
              )}
              {currentTicket?.Jatra_link ? (
                <a
                  href={currentTicket.Jatra_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex pl-[4.5rem] text-sm font-medium text-blue-600 hover:underline"
                >
                  Open Jatra link
                </a>
              ) : null}
            </div>
            <CustomButton
              type="button"
              icon={<Phone className="h-4 w-4" />}
              className="rounded-xl bg-[#1D2939] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#111827]"
              onClick={() => handleWhatsApp(currentTicket?.phone)}
              disabled={!currentTicket?.phone || updating}
            >
              {formatPhoneNumber(currentTicket?.phone) || "N/A"}
            </CustomButton>
          </div>

          <div
            className={cn(
              "grid gap-6",
              isCompact ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
            )}
          >
            <SupportTicketTaskProgress taskProgress={currentTicket?.task_progress} />

            <div className="space-y-4">
              <div className="rounded-xl bg-violet-50 p-4 md:p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-lg font-semibold text-slate-900">
                      {currentTicket?.reason || "No reason provided"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {currentTicket?.source || "N/A"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">
                    {formattedTicketDate}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>ID: {displayTicketId}</span>
                </div>
              </div>

              <div
                className={cn(
                  "grid gap-4",
                  isCompact ? "grid-cols-1" : "md:grid-cols-2"
                )}
              >
                <div className="space-y-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl border-slate-200 bg-white"
                        disabled={updating}
                      >
                        <span className="text-sm">
                          {ticket.selectedOtherReasons.length > 0
                            ? `${ticket.selectedOtherReasons.length} reason(s) selected`
                            : "Select other reasons"}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                      <div className="space-y-3">
                        <h4 className="font-medium">Select Other Reasons</h4>
                        <div className="max-h-60 space-y-2 overflow-y-auto">
                          {OTHER_REASONS_OPTIONS.map((reason) => (
                            <div key={reason} className="flex items-center space-x-2">
                              <Checkbox
                                id={`reason-${reason}`}
                                checked={ticket.selectedOtherReasons.includes(reason)}
                                onCheckedChange={(checked) =>
                                  handleOtherReasonChange(reason, checked as boolean)
                                }
                                disabled={updating}
                              />
                              <label
                                htmlFor={`reason-${reason}`}
                                className="cursor-pointer text-sm leading-none"
                              >
                                {reason}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {ticket.selectedOtherReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ticket.selectedOtherReasons.map((reason) => (
                        <Badge key={reason} variant="secondary" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="review-requested"
                      checked={ticket.reviewRequested}
                      onCheckedChange={(checked) =>
                        setTicket((prev) => ({
                          ...prev,
                          reviewRequested: Boolean(checked),
                        }))
                      }
                      disabled={updating}
                    />
                    <label
                      htmlFor="review-requested"
                      className="cursor-pointer text-sm font-medium leading-none"
                    >
                      Customer review submitted
                    </label>
                  </div>
                </div>

                <Textarea
                  value={ticket.cseRemarks}
                  onChange={(e) =>
                    setTicket((prev) => ({
                      ...prev,
                      cseRemarks: e.target.value,
                    }))
                  }
                  placeholder="Add your remarks about this ticket..."
                  className="min-h-[140px] rounded-xl border-slate-200"
                  disabled={updating}
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "mt-6 grid w-full gap-3 border-t border-slate-100 pt-6",
              isCompact ? "grid-cols-2 pb-2" : "grid-cols-2 sm:grid-cols-4"
            )}
          >
            <CustomButton
              onClick={() => handleActionButton("Not Connected")}
              variant="outline"
              className="h-11 w-full rounded-xl border-red-300 bg-white text-red-600 hover:border-red-400 hover:bg-red-50"
              disabled={updating}
            >
              Not Connected
            </CustomButton>
            <CustomButton
              onClick={() => handleActionButton("Call Later")}
              variant="outline"
              className="h-11 w-full rounded-xl border-red-300 bg-white text-red-600 hover:border-red-400 hover:bg-red-50"
              disabled={updating}
            >
              Call Later
            </CustomButton>
            <CustomButton
              onClick={() => handleActionButton("Can't Resolve")}
              variant="outline"
              className="h-11 w-full rounded-xl border-slate-900 bg-white text-slate-900 hover:bg-slate-50"
              disabled={updating}
            >
              Can&apos;t Resolve
            </CustomButton>
            <CustomButton
              onClick={() => handleActionButton("Resolve")}
              className="h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              disabled={updating || fetchingNext}
              loading={updating || fetchingNext}
            >
              {updating ? "Updating..." : fetchingNext ? "Loading..." : "Resolve"}
            </CustomButton>
          </div>
        </div>
      </div>

      {isCompact && (
        <div className="flex justify-end">
          <CustomButton
            onClick={handleTakeBreak}
            variant="outline"
            size="sm"
            icon={<Coffee className="h-4 w-4" />}
            disabled={updating}
          >
            Take a Break
          </CustomButton>
        </div>
      )}
    </div>
  );
};