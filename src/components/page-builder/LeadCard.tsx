import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { authService } from "@/lib/authService";
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
  X,
  Mail,
  Building,
  MapPin,
  DollarSign,
  Target,
  TrendingUp,
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

interface Lead {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  source: string;
  status: string;
  priority: "High" | "Medium" | "Low";
  assigned_to: string | null;
  tenant_id: string;
  notes: string | null;
  budget: number | null;
  timeline: string | null;
  industry: string | null;
  location: string | null;
  lead_score: number | null;
  last_contact: string | null;
  next_follow_up: string | null;
  tags: string[] | null;
  display_pic_url: string | null;
  linkedin_profile: string | null;
  website: string | null;
}

const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Cold Call",
  "Trade Show",
  "Advertisement",
  "Partner",
  "Other"
];

const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
  "Follow Up"
];

const LEAD_PRIORITIES = [
  "High",
  "Medium", 
  "Low"
];

const LEAD_INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Education",
  "Real Estate",
  "Consulting",
  "Other"
];

const parseTags = (tags: any): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      return JSON.parse(tags);
    } catch {
      return tags.split(",").map((t: string) => t.trim()).filter(Boolean);
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
    const message = `Hi, I'm reaching out regarding your inquiry.`;
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }
};

// Function to handle email action
const handleEmail = (email: string) => {
  if (email) {
    const subject = "Follow up on your inquiry";
    const body = "Hi, I wanted to follow up on your recent inquiry. Please let me know if you have any questions.";
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  }
};

// Function to format lead status with better UI
const formatLeadStatus = (status: string): { label: string; color: string; bgColor: string } => {
  switch (status.toLowerCase()) {
    case 'new':
      return { label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    case 'contacted':
      return { label: 'Contacted', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    case 'qualified':
      return { label: 'Qualified', color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'proposal sent':
      return { label: 'Proposal Sent', color: 'text-purple-600', bgColor: 'bg-purple-50' };
    case 'negotiation':
      return { label: 'Negotiation', color: 'text-indigo-600', bgColor: 'bg-indigo-50' };
    case 'closed won':
      return { label: 'Closed Won', color: 'text-emerald-600', bgColor: 'bg-emerald-50' };
    case 'closed lost':
      return { label: 'Closed Lost', color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'follow up':
      return { label: 'Follow Up', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    default:
      return { label: status || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

// Function to format priority with better UI
const formatPriority = (priority: string): { label: string; color: string; bgColor: string } => {
  switch (priority.toLowerCase()) {
    case 'high':
      return { label: 'High', color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'medium':
      return { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    case 'low':
      return { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-50' };
    default:
      return { label: priority || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

interface LeadCardProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
  };
  initialLead?: any;
  onUpdate?: (updatedLead: any) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  config,
  initialLead,
  onUpdate,
}) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const isInitialized = React.useRef(false);

  // Getting the persisted state from the session storage
  const getPersistedState = () => {
    try {
      const persisted = sessionStorage.getItem("leadCardState");
      return persisted ? JSON.parse(persisted) : null;
    } catch {
      return null;
    }
  };

  // Persisting the state to the session storage
  const persistState = (state: any) => {
    try {
      sessionStorage.setItem("leadCardState", JSON.stringify(state));
    } catch (error) {
      console.error("Error persisting state:", error);
    }
  };

  // Clearing the persisted state from the session storage
  const clearPersistedState = () => {
    try {
      sessionStorage.removeItem("leadCardState");
    } catch (error) {
      console.error("Error clearing persisted state:", error);
    }
  };

  // Getting the initial state from the initial lead
  const getInitialState = () => {
    if (initialLead) {
      return {
        currentLead: initialLead,
        showPendingCard: false,
        leadStatus: initialLead.status || "New",
        priority: initialLead.priority || "Medium",
        notes: initialLead.notes || "",
        selectedTags: parseTags(initialLead.tags),
        nextFollowUp: initialLead.next_follow_up || "",
      };
    }

    const persisted = getPersistedState();
    if (persisted) {
      return persisted;
    }

    return {
      currentLead: null,
      showPendingCard: true,
      leadStatus: "New" as const,
      priority: "Medium" as const,
      notes: "",
      selectedTags: [],
      nextFollowUp: "",
    };
  };

  const initialState = getInitialState();

  const [currentLead, setCurrentLead] = useState<any>(initialState.currentLead);
  const [showPendingCard, setShowPendingCard] = useState(initialState.showPendingCard);
  const [leadStats, setLeadStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    closed: 0,
  });
  const [lead, setLead] = useState({
    leadStatus: initialState.leadStatus as string,
    priority: initialState.priority as string,
    notes: initialState.notes,
    selectedTags: initialState.selectedTags,
    nextFollowUp: initialState.nextFollowUp,
    leadStartTime: null as Date | null,
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Function to handle opening profile modal
  const handleOpenProfile = () => {
    if (currentLead?.linkedin_profile || currentLead?.website) {
      setShowProfileModal(true);
    }
  };

  // Function to close profile modal
  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  useEffect(() => {
    if (isInitialized.current) {
      persistState({
        currentLead,
        showPendingCard,
        leadStatus: lead.leadStatus,
        priority: lead.priority,
        notes: lead.notes,
        selectedTags: lead.selectedTags,
        nextFollowUp: lead.nextFollowUp,
      });
    }
  }, [currentLead, showPendingCard, lead.leadStatus, lead.priority, lead.notes, lead.selectedTags, lead.nextFollowUp]);

  // Calculating the lead processing time
  const calculateLeadTime = (): string => {
    if (!lead.leadStartTime) return "";
    const endTime = new Date();
    const diffInSeconds = Math.floor((endTime.getTime() - lead.leadStartTime.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Fetching the lead stats
  const fetchLeadStats = async () => {
    try {
      const sessionResponse = await authService.getSession();
      const session = sessionResponse.success ? sessionResponse.data : null;
      if (!session) return;

      // Use configured status data API endpoint or fallback to default
      const statusEndpoint = config?.statusDataApiEndpoint || "/get-lead-status";
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URI}${statusEndpoint}`,
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
      
      // Map the backend structure to our leadStats interface
      const stats = {
        total: data.leadStats?.totalLeads || 0,
        new: data.leadStats?.newLeads || 0,
        contacted: data.leadStats?.contactedLeads || 0,
        qualified: data.leadStats?.qualifiedLeads || 0,
        closed: data.leadStats?.closedLeads || 0,
      };

      setLeadStats(stats);
    } catch (error) {
      console.error("Error fetching lead statistics:", error);
      setLeadStats({
        total: 0,
        new: 0,
        contacted: 0,
        qualified: 0,
        closed: 0,
      });
    }
  };

  // Helper function to reset lead state
  const resetLeadState = () => {
    setLead({
      leadStatus: "New",
      priority: "Medium",
      notes: "",
      selectedTags: [],
      nextFollowUp: "",
      leadStartTime: null,
    });
  };

  // Helper function to set lead from API response
  const setLeadFromResponse = (nextLead: any) => {
    setCurrentLead(nextLead);
    setLead({
      leadStatus: nextLead.status || "New",
      priority: nextLead.priority || "Medium",
      notes: nextLead.notes || "",
      selectedTags: parseTags(nextLead.tags),
      nextFollowUp: nextLead.next_follow_up || "",
      leadStartTime: new Date(),
    });
    setShowPendingCard(false);
    isInitialized.current = true;
  };

  // Fetching the next lead
  const fetchNextLead = async (currentLeadId: number) => {
    try {
      const nextLeadUrl = `${import.meta.env.VITE_API_URI}${config?.apiEndpoint || "/api/leads"}`;
      const sessionResponse = await authService.getSession();
      const session = sessionResponse.success ? sessionResponse.data : null;
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const nextLeadResponse = await fetch(nextLeadUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!nextLeadResponse.ok) {
        if (nextLeadResponse.status === 404) {
          setShowPendingCard(true);
          setCurrentLead(null);
          resetLeadState();
          isInitialized.current = false;
          clearPersistedState();
          await fetchLeadStats();
          toast.info("No more leads available. Click 'Get First Lead' to continue.");
          return;
        }
        throw new Error(`HTTP error! status: ${nextLeadResponse.status}`);
      }

      const leadData = await nextLeadResponse.json();

      if (!leadData || (typeof leadData === "object" && !Object.keys(leadData).length)) {
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchLeadStats();
        toast.info("No more leads available. Click 'Get First Lead' to continue.");
        return;
      }

      let nextLead = null;
      if (leadData && typeof leadData === "object") {
        if (leadData.id) {
          nextLead = leadData;
        } else if (leadData.lead && leadData.lead.id) {
          nextLead = leadData.lead;
        } else if (leadData.data && leadData.data.id) {
          nextLead = leadData.data;
        } else if (Array.isArray(leadData) && leadData.length > 0) {
          nextLead = leadData[0];
        }
      }

      if (nextLead && nextLead.id) {
        setLeadFromResponse(nextLead);
      } else {
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchLeadStats();
        toast.info("No more leads available. Click 'Get First Lead' to continue.");
      }

    } catch (error: any) {
      console.error("Error fetching next lead:", error);
      toast.error(error.message || "Failed to fetch next lead");
      setShowPendingCard(true);
      setCurrentLead(null);
      resetLeadState();
      isInitialized.current = false;
      clearPersistedState();
      await fetchLeadStats();
    }
  };

  // Taking a break
  const handleTakeBreak = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URI}/take-a-break`;
      const sessionResponse = await authService.getSession();
      const session = sessionResponse.success ? sessionResponse.data : null;
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
          leadId: currentLead?.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Navigate to pending card
      setShowPendingCard(true);
      setCurrentLead(null);
      resetLeadState();
      isInitialized.current = false;
      clearPersistedState();
      await fetchLeadStats();
      toast.info("Taking a break. Click 'Get Leads' when ready to continue.");
    } catch (error) {
      console.error("Error taking break:", error);
      toast.error("Error taking break. Please try again.");
    }
  };

  // Fetching the lead stats (initially)
  useEffect(() => {
    fetchLeadStats();
  }, []);

  // Fetching the lead stats (interval)
  useEffect(() => {
    if (!showPendingCard) return;
    const interval = setInterval(() => {
      fetchLeadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [showPendingCard]);

  // Handling the tag change
  const handleTagChange = (tag: string, checked: boolean) => {
    if (checked) {
      setLead(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, tag]
      }));
    } else {
      setLead(prev => ({
        ...prev,
        selectedTags: prev.selectedTags.filter((t) => t !== tag)
      }));
    }
  };

  // Handling the action buttons
  const handleActionButton = async (action: "Qualify" | "Disqualify" | "Follow Up" | "Close") => {
    try {
      if (!currentLead?.id) {
        toast.error("No lead ID available");
        return;
      }

      setUpdating(true);
      const sessionResponse = await authService.getSession();
      const session = sessionResponse.success ? sessionResponse.data : null;
      if (!session) {
        throw new Error("Authentication required");
      }

      // Map action to lead status
      let leadStatus: string;
      
      switch (action) {
        case "Qualify":
          leadStatus = "Qualified";
          break;
        case "Disqualify":
          leadStatus = "Closed Lost";
          break;
        case "Follow Up":
          leadStatus = "Follow Up";
          break;
        case "Close":
          leadStatus = "Closed Won";
          break;
        default:
          leadStatus = "New";
      }

      // Update local state
      setLead(prev => ({
        ...prev,
        leadStatus
      }));

      const apiUrl = `${import.meta.env.VITE_API_URI}/update-lead`;
      const payload = {
        leadId: currentLead?.id,
        leadStatus,
        priority: lead.priority,
        notes: lead.notes,
        tags: lead.selectedTags,
        nextFollowUp: lead.nextFollowUp,
        leadTime: calculateLeadTime(),
        leadStartTime: lead.leadStartTime?.toISOString(),
      };

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
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // After successful API call, fetch next lead
      await fetchNextLead(currentLead?.id);

    } catch (error: any) {
      console.error("Error in handleActionButton:", error);
      toast.error(error.message || "Failed to process action");
    } finally {
      setUpdating(false);
    }
  };

  // Fetching the first lead
  const fetchFirstLead = async () => {
    try {
      setLoading(true);
      const endpoint = config?.apiEndpoint || "/api/leads";
      const apiUrl = `${import.meta.env.VITE_API_URI}${endpoint}?assign=false`;
      const sessionResponse = await authService.getSession();
      const session = sessionResponse.success ? sessionResponse.data : null;
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
          setCurrentLead(null);
          resetLeadState();
          isInitialized.current = false;
          clearPersistedState();
          await fetchLeadStats();
          toast.info("No leads available at the moment.");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const leadData = await response.json();

      if (!leadData || (typeof leadData === "object" && !Object.keys(leadData).length)) {
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchLeadStats();
        toast.info("No leads available.");
        return;
      }

      let nextLead = null;
      if (leadData && typeof leadData === "object") {
        if (leadData.id) {
          nextLead = leadData;
        } else if (leadData.lead && leadData.lead.id) {
          nextLead = leadData.lead;
        } else if (leadData.data && leadData.data.id) {
          nextLead = leadData.data;
        } else if (Array.isArray(leadData) && leadData.length > 0) {
          nextLead = leadData[0];
        }
      }

      if (nextLead && nextLead.id) {
        setLeadFromResponse(nextLead);
      } else {
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        clearPersistedState();
        await fetchLeadStats();
        toast.info("No leads available.");
      }

    } catch (error: any) {
      console.error("Error fetching first lead:", error);
      toast.error(error.message || "Failed to fetch lead");
      setShowPendingCard(true);
      setCurrentLead(null);
      resetLeadState();
      isInitialized.current = false;
      clearPersistedState();
      await fetchLeadStats();
    } finally {
      setLoading(false);
    }
  };

  // Loading the page
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Showing the pending leads card
  if (showPendingCard) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-primary mr-2" />
                <h2 className="text-2xl font-semibold text-gray-800">
                  {config?.title || "Lead Management"}
                </h2>
              </div>
              <p className="text-gray-600 mb-6">Click to start working on leads</p>
            </div>

            <div className="mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{leadStats.total}</div>
                <div className="text-xs text-gray-600">Total Leads</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">New</span>
                </div>
                <span className="text-sm font-medium">{leadStats.new}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Contacted</span>
                </div>
                <span className="text-sm font-medium">{leadStats.contacted}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Qualified</span>
                </div>
                <span className="text-sm font-medium">{leadStats.qualified}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Closed</span>
                </div>
                <span className="text-sm font-medium">{leadStats.closed}</span>
              </div>
            </div>

            <Button 
              onClick={fetchFirstLead} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                'Get Leads'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Showing the no lead available card
  if (!currentLead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p>No lead available</p>
        <Button onClick={fetchFirstLead} disabled={loading}>
          Get Leads
        </Button>
      </div>
    );
  }

  // Formatting the lead date
  const formattedDate = currentLead?.created_at
    ? new Date(currentLead.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  // Showing the lead card
  return (
    <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
      <div className="mt-4 flex w-[70%] justify-end">
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
                <p className="text-sm text-muted-foreground">Loading next lead...</p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-4 mt-1">
                  {currentLead?.source && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Source:</span>
                      <span className="text-xs font-medium">{currentLead.source}</span>
                    </div>
                  )}
                  {currentLead?.industry && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Industry:</span>
                      <span className="text-xs font-medium">{currentLead.industry}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-2 flex flex-col gap-2">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-sm bg-muted/50 p-2 rounded-md flex flex-col justify-between gap-4">
                      <span className="font-medium text-sm">
                        {currentLead?.created_at ? new Date(currentLead.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        }) : "N/A"}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-lg">{currentLead?.company || "No company provided"}</span>
                        <span className="text-sm pt-2">{currentLead?.position || "N/A"}</span>
                      </div>
                    </p>
                  </div>
                </div>
                
                <div className="">
                  <div
                    className={`flex items-center text-sm bg-muted/50 p-4 rounded-md ${
                      currentLead?.linkedin_profile || currentLead?.website
                        ? "cursor-pointer hover:bg-muted/70 transition-colors"
                        : ""
                    }`}
                    onClick={handleOpenProfile}
                  >
                    {currentLead?.display_pic_url ? (
                      <img
                        src={currentLead.display_pic_url}
                        alt={`${currentLead.name || "Lead"} profile`}
                        className="h-12 w-12 rounded-full mr-2 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <User
                      className={`h-3 w-3 mr-2 text-primary ${
                        currentLead?.display_pic_url ? "hidden" : ""
                      }`}
                    />
                    <div className="flex flex-col w-full gap-2">
                      <div>
                        <p className="font-medium text-lg">{currentLead?.name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground pt-2">
                          ID: {currentLead?.user_id || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentLead?.status ? (
                          (() => {
                            const statusInfo = formatLeadStatus(currentLead.status);
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor} border`}>
                                {statusInfo.label}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border">
                            No Status
                          </span>
                        )}
                        {currentLead?.priority && (
                          (() => {
                            const priorityInfo = formatPriority(currentLead.priority);
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color} ${priorityInfo.bgColor} border`}>
                                {priorityInfo.label}
                              </span>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="flex items-center text-sm bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleEmail(currentLead?.email)}
                  >
                    <Mail className="h-3 w-3 mr-2 text-primary" />
                    <span className="font-medium text-sm">{currentLead?.email || "N/A"}</span>
                  </div>
                  
                  <div 
                    className="flex items-center text-sm bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleWhatsApp(currentLead?.phone)}
                  >
                    <Phone className="h-3 w-3 mr-2 text-primary" />
                    <span className="font-medium text-sm">{formatPhoneNumber(currentLead?.phone) || "N/A"}</span>
                  </div>
                  
                  {currentLead?.location && (
                    <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                      <MapPin className="h-3 w-3 mr-2 text-primary" />
                      <span className="font-medium text-sm">{currentLead.location}</span>
                    </div>
                  )}
                  
                  {currentLead?.budget && (
                    <div className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                      <DollarSign className="h-3 w-3 mr-2 text-primary" />
                      <span className="font-medium text-sm">₹{currentLead.budget.toLocaleString()}</span>
                    </div>
                  )}
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
                          {lead.selectedTags.length > 0
                            ? `${lead.selectedTags.length} tag(s) selected`
                            : "Select tags"}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Select Tags</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {LEAD_SOURCES.map((tag) => (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tag-${tag}`}
                                checked={lead.selectedTags.includes(tag)}
                                onCheckedChange={(checked) =>
                                  handleTagChange(tag, checked as boolean)
                                }
                                disabled={updating}
                              />
                              <label
                                htmlFor={`tag-${tag}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {tag}
                              </label>
                            </div>
                          ))}
                        </div>
                        {lead.selectedTags.length > 0 && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLead(prev => ({
                                ...prev,
                                selectedTags: []
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
                  {lead.selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lead.selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-full space-y-2">
                  <Textarea
                    value={lead.notes}
                    onChange={(e) => setLead(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    placeholder="Add your notes about this lead..."
                    className="min-h-[100px]"
                    disabled={updating}
                  />
                  <Input
                    value={lead.nextFollowUp}
                    onChange={(e) => setLead(prev => ({
                      ...prev,
                      nextFollowUp: e.target.value
                    }))}
                    placeholder="Next follow-up action..."
                    disabled={updating}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="buttons flex flex-row items-center justify-center gap-[200px] w-full">
            <div className="flex justify-center items-center gap-3 mt-4 pt-3">
              <Button
                onClick={() => handleActionButton("Follow Up")}
                size="sm"
                variant="outline"
                className="w-32 bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={updating}
              >
                Follow Up
              </Button>
              
              <Button
                onClick={() => handleActionButton("Disqualify")}
                size="sm"
                variant="outline"
                className="w-32 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={updating}
              >
                Disqualify
              </Button>
            </div>
            <div className="flex justify-center items-center gap-3 mt-4 pt-3">
              <Button
                onClick={() => handleActionButton("Qualify")}
                size="sm"
                variant="outline"
                className="w-32 bg-white text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={updating}
              >
                Qualify
              </Button>
              
              <Button
                onClick={() => handleActionButton("Close")}
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
                    Loading Next Lead...
                  </>
                ) : (
                  "Close"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile Modal */}
      {showProfileModal && (currentLead?.linkedin_profile || currentLead?.website) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {currentLead?.display_pic_url ? (
                  <img
                    src={currentLead.display_pic_url}
                    alt={`${currentLead.name || "Lead"} profile`}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <User
                  className={`h-4 w-4 text-primary ${
                    currentLead?.display_pic_url ? "hidden" : ""
                  }`}
                />
                <div>
                  <h3 className="font-semibold text-lg">{currentLead?.name || "Lead Profile"}</h3>
                  <p className="text-sm text-muted-foreground">Company: {currentLead?.company || "N/A"}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseProfile}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Modal Content - Iframe */}
            <div className="flex-1 p-4">
              <iframe
                src={currentLead.linkedin_profile || currentLead.website}
                className="w-full h-full border-0 rounded-md"
                title={`${currentLead?.name || "Lead"} Profile`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
