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
  MoreVertical,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
    case 'in_grace_period':
      return { label: 'Grace Period', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    case 'auto_pay_not_set_up':
      return { label: 'Auto-pay Not Set', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    case 'autopay_setup_no_layout':
      return { label: 'Auto-pay No Layout', color: 'text-amber-600', bgColor: 'bg-amber-50' };
    case 'free':
      return { label: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    default:
      return { label: poster || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

interface TicketCarouselProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
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
  const { user } = useAuth();

  const isInitialized = React.useRef(false);

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
      sessionStorage.setItem("ticketCarouselState", JSON.stringify(state));
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use renderer URL with analytics endpoint
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/analytics/get-ticket-status/`;
      
      console.log('Fetching ticket stats from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "X-Tenant-Slug": "bibhab-thepyro-ai",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Ticket stats response:', data);
      
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
      const nextTicketUrl = `${import.meta.env.VITE_API_URI}${config?.apiEndpoint || "/api/tickets"}`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const nextTicketResponse = await fetch(nextTicketUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!nextTicketResponse.ok) {
        if (nextTicketResponse.status === 404) {
          setShowPendingCard(true);
          setCurrentTicket(null);
          resetTicketState();
          isInitialized.current = false;
          clearPersistedState();
          await fetchTicketStats();
          toast.info("No more tickets available. Click 'Get First Ticket' to continue.");
          return;
        }
        throw new Error(`HTTP error! status: ${nextTicketResponse.status}`);
      }

      const ticketData = await nextTicketResponse.json();

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
      const apiUrl = `${import.meta.env.VITE_API_URI}/take-a-break`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId: currentTicket?.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
      if (!currentTicket?.id) {
        toast.error("No ticket ID available");
        return;
      }



      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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

      // Use renderer URL for save and continue
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      let apiUrl = `${baseUrl}/support-ticket/save-and-continue/`;
      let payload: any = {
        ticketId: currentTicket?.id,
        resolutionStatus,
        callStatus,
        cseRemarks: ticket.cseRemarks,
        resolutionTime: calculateResolutionTime(),
        otherReasons: ticket.selectedOtherReasons,
        ticketStartTime: ticket.ticketStartTime?.toISOString(),
        reviewRequested: ticket.reviewRequested,

      };

      // If Not Connected, use original not-connected endpoint and adjust payload
      if (action === "Not Connected") {
        apiUrl = `${import.meta.env.VITE_API_URI}/not-connected`;
        payload = {
          ticketId: currentTicket?.id,
          callStatus,
          cseRemarks: ticket.cseRemarks,
          otherReasons: ticket.selectedOtherReasons,
          reviewRequested: ticket.reviewRequested,
        };
      }

      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication required");
      }

      // Add X-Tenant-Slug header only for renderer API calls
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      
      // Add tenant slug only for renderer API endpoints
      if (apiUrl.includes(import.meta.env.VITE_RENDER_API_URL)) {
        headers["X-Tenant-Slug"] = "bibhab-thepyro-ai";
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // After successful API call, fetch next ticket
      await fetchNextTicket(currentTicket?.id);

    } catch (error: any) {
      console.error("Error in handleActionButton:", error);
      toast.error(error.message || "Failed to process action");
    } finally {
      setUpdating(false);
    }
  };

  //fetching the first ticket
  const fetchFirstTicket = async () => {
    try {
      setLoading(true);
      const endpoint = config?.apiEndpoint || "/api/tickets";
      const apiUrl = `${import.meta.env.VITE_API_URI}${endpoint}?assign=false`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setShowPendingCard(true);
          setCurrentTicket(null);
          resetTicketState();
          isInitialized.current = false;
          clearPersistedState();
          await fetchTicketStats();
          toast.info("No tickets available at the moment.");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ticketData = await response.json();

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
        <Button onClick={fetchFirstTicket} disabled={loading}>
          Get Tickets
        </Button>
      </div>
    );
  }

  //formatting the ticket date
  const formattedDate = currentTicket?.dumped_at
    ? new Date(currentTicket.dumped_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  //showing the ticket card
  return (
    <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
      <div className="mt-4 flex  w-[70%] justify-end">
        <Button
          onClick={handleTakeBreak}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={updating}
        >
          <Coffee className="h-3 w-3" />
          Take a Break
        </Button>
      </div>
      <div className="relative w-[70%] h-full">
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
          </div>

          <div className="flex flex-col gap-4 ">
            <div className="space-y-2 flex flex-col gap-2">
             
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-sm bg-muted/50 p-2 rounded-md flex flex-col justify-between gap-4">
                    <span className="font-medium text-sm">
                  {currentTicket?.dumped_at ? new Date(currentTicket.dumped_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }) : "N/A"}
                </span>
                <div className="flex flex-col">
                      <span className="font-medium text-lg">{currentTicket?.reason || "No reason provided"}</span>
                      <span className=" text-sm pt-2">{currentTicket?.source || "N/A"}</span>
                </div>
                      
                    </p>
                  </div>
                 
                </div>
                
                
            
           
              <div className="">
                {currentTicket?.praja_dashboard_user_link ? (
                  <a
                    href={currentTicket.praja_dashboard_user_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="flex items-center text-sm bg-muted/50 p-4 rounded-md cursor-pointer hover:bg-muted/70 transition-colors">
                      {currentTicket?.display_pic_url ? (
                        <img
                          src={currentTicket.display_pic_url}
                          alt={`${currentTicket.name || "User"} profile`}
                          className="h-12 w-12 rounded-full mr-2 object-cover"
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
                      <div className="flex flex-col w-full gap-2">
                        <div>
                          <p className="font-medium text-lg">{currentTicket?.name || "N/A"}</p>
                          <p className="text-xs text-muted-foreground pt-2">
                            ID: {currentTicket?.user_id || "N/A"}
                          </p>
                        </div>
                        <span className="font-medium text-sm  flex items-center gap-1">
                          {currentTicket?.poster ? (
                            (() => {
                              const posterInfo = formatPosterStatus(currentTicket.poster);
                              return (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${posterInfo.color} ${posterInfo.bgColor} border`}>
                                  {posterInfo.label}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border">
                              No Poster
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center text-sm bg-muted/50 p-4 rounded-md">
                    {currentTicket?.display_pic_url ? (
                      <img
                        src={currentTicket.display_pic_url}
                        alt={`${currentTicket.name || "User"} profile`}
                        className="h-12 w-12 rounded-full mr-2 object-cover"
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
                    <div className="flex flex-col w-full gap-2">
                      <div>
                        <p className="font-medium text-lg">{currentTicket?.name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground pt-2">
                          ID: {currentTicket?.user_id || "N/A"}
                        </p>
                      </div>
                      <span className="font-medium text-sm  flex items-center gap-1">
                        {currentTicket?.poster ? (
                          (() => {
                            const posterInfo = formatPosterStatus(currentTicket.poster);
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${posterInfo.color} ${posterInfo.bgColor} border`}>
                                {posterInfo.label}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border">
                            No Poster
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {/* Removed the separate payment status row */}
                <div 
                  className="flex items-center text-sm bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleWhatsApp(currentTicket?.phone)}
                >
                  <Phone className="h-3 w-3 mr-2 text-primary" />
                  <span className="font-medium text-sm">{formatPhoneNumber(currentTicket?.phone) || "N/A"}</span>
                </div>
              </div>
              
          
              
            </div>

            <div className="flex flex-row gap-2 w-full items-start">
              <div className="w-full">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      disabled={updating}
                    >
                      <span className="text-sm">
                        {ticket.selectedOtherReasons.length > 0
                          ? `${ticket.selectedOtherReasons.length} reason(s) selected`
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
                              checked={ticket.selectedOtherReasons.includes(reason)}
                              onCheckedChange={(checked) =>
                                handleOtherReasonChange(reason, checked as boolean)
                              }
                              disabled={updating}
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
                      {ticket.selectedOtherReasons.length > 0 && (
                        <div className="pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTicket(prev => ({
                              ...prev,
                              selectedOtherReasons: []
                            }))}
                            disabled={updating}
                            className="text-xs"
                          >
                            Clear All
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {ticket.selectedOtherReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ticket.selectedOtherReasons.map((reason) => (
                      <Badge key={reason} variant="secondary" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="review-requested"
                  checked={ticket.reviewRequested}
                  onCheckedChange={(checked) =>
                    setTicket(prev => ({ ...prev, reviewRequested: Boolean(checked) }))
                  }
                  disabled={updating}
                />
                <label
                  htmlFor="review-requested"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Customer review requested (Yes/No)
                </label>
              </div>
              </div>
              <div className="w-full space-y-2">
                <Textarea
                  value={ticket.cseRemarks}
                  onChange={(e) => setTicket(prev => ({
                    ...prev,
                    cseRemarks: e.target.value
                  }))}
                  placeholder="Add your remarks about this ticket..."
                  className="min-h-[100px]"
                  disabled={updating}
                />
              </div>
            </div>
          </div>
        </div>
  <div className="buttons flex flex-row items-center justify-center gap-[200px]  w-full">
        <div className="flex justify-center items-center gap-3 mt-4 pt-3  ">
          <Button
            onClick={() => handleActionButton("Not Connected")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating}
          >
            Not Connected
          </Button>
          
          <Button
            onClick={() => handleActionButton("Call Later")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating}
          >
            Call Later
          </Button>
          
        </div>
        <div className="flex justify-center items-center gap-3 mt-4 pt-3  ">
          
          <Button
            onClick={() => handleActionButton("Can't Resolve")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-primary border-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating}
          >
            Can't Resolve
          </Button>
         
          <Button
            onClick={() => handleActionButton("Resolve")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-primary border-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={updating || fetchingNext}
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                Updating...
              </>
            ) : fetchingNext ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                Loading Next Ticket...
              </>
            ) : (
              "Resolve"
            )}
          </Button>
        </div>
        </div>
      </div>
      
      {/* Take a Break button outside the main card at bottom */}
    </div>
    </div>
  );
};