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

  //getting the initial state from the initial ticket
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
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fetchingNext, setFetchingNext] = useState(false);

  const isReadOnly = config?.readOnly || false;

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
      
      // Map the new backend structure to our TicketStats interface
      const stats: TicketStats = {
        total: (data.ticketStats?.totalPendingTickets || 0) + (data.ticketStats?.wipTickets || 0) + (data.ticketStats?.resolvedByYouToday || 0) + (data.ticketStats?.cantResolveToday || 0),
        pending: data.ticketStats?.totalPendingTickets || 0,
        inProgress: data.ticketStats?.wipTickets || 0,
        resolved: data.ticketStats?.resolvedByYouToday || 0,
        notPossible: data.ticketStats?.cantResolveToday || 0,
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

      if (isReadOnly) {
        toast.error("This ticket is read-only");
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

      const apiUrl = `${import.meta.env.VITE_API_URI}/save-and-continue`;
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const payload = {
        ticketId: currentTicket?.id,
        resolutionStatus,
        callStatus,
        cseRemarks: ticket.cseRemarks,
        resolutionTime: calculateResolutionTime(),
        otherReasons: ticket.selectedOtherReasons,
        ticketStartTime: ticket.ticketStartTime?.toISOString(),
        isReadOnly: isReadOnly
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
  const formattedDate = currentTicket?.ticket_date
    ? new Date(currentTicket.ticket_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  //showing the ticket card
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
              <div 
                className="flex items-center text-sm bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleWhatsApp(currentTicket?.phone)}
              >
                <Phone className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">{formatPhoneNumber(currentTicket?.phone) || "N/A"}</span>
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
                <Calendar className="h-3 w-3 mr-2 text-primary" />
                <span className="font-medium text-sm">
                  Created: {currentTicket?.created_at ? new Date(currentTicket.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }) : "N/A"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-muted/30 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-3 w-3 text-primary" />
                  <p className="font-medium text-sm">Task Details</p>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
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
                            {ticket.selectedOtherReasons.length > 0 && (
                              <div className="pt-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setTicket(prev => ({
                                    ...prev,
                                    selectedOtherReasons: []
                                  }))}
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
                      {ticket.selectedOtherReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ticket.selectedOtherReasons.map((reason) => (
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
                  value={ticket.cseRemarks}
                  onChange={(e) => setTicket(prev => ({
                    ...prev,
                    cseRemarks: e.target.value
                  }))}
                  placeholder="Add your remarks about this ticket..."
                  className="min-h-[80px]"
                  disabled={updating || isReadOnly}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-3 mt-4 pt-3 border-t">
          <Button
            onClick={() => handleActionButton("Not Connected")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating || isReadOnly}
          >
            Not Connected
          </Button>
          <Button
            onClick={() => handleActionButton("Can't Resolve")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-primary border-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating || isReadOnly}
          >
            Can't Resolve
          </Button>
          <Button
            onClick={() => handleActionButton("Call Later")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-primary border-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={updating || isReadOnly}
          >
            Call Later
          </Button>
          <Button
            onClick={() => handleActionButton("Resolve")}
            size="sm"
            variant="outline"
            className="w-32 bg-white text-primary border-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={updating || isReadOnly || fetchingNext}
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
            ) : isReadOnly ? (
              "Close"
            ) : (
              "Resolve"
            )}
          </Button>
        </div>
      </div>
      
      {/* Take a Break button outside the main card at bottom */}
      <div className="mt-4 flex justify-center">
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
      </div>
    </div>
  );
};