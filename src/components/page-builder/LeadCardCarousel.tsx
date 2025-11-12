import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fetchLottieAnimation, requestIdle } from "@/lib/lottieCache";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { FaWhatsapp } from "react-icons/fa";
import {
  User,
  Phone,
  Coffee,
  CheckCircle2,
  XCircle,
  Circle,
  X,
} from "lucide-react";

interface LeadCardCarouselProps {
  config?: {
    title?: string;
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
  };
}

interface LeadTask {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  due_date?: string;
  dueDate?: string;
  rawStatus?: any;
  [key: string]: any;
}

interface LeadData {
  id: number;
  created_at: string;
  name: string;
  email: string;
  phone?: string;
  phone_no?: string;
  phone_number?: string;
  company: string;
  position: string;
  source?: string;
  lead_source?: string;
  status: string;
  priority: string;
  notes: string;
  budget: number;
  location: string;
  tags: string[];
  display_pic_url: string;
  linkedin_profile: string;
  website: string;
  next_follow_up: string;
  // New fields as per requirements
  lead_stage: string;
  customer_full_name: string;
  user_id: string;
  affiliated_party: string;
  rm_dashboard: string;
  user_profile_link: string;
  whatsapp_link: string;
  package_to_pitch: string;
  premium_poster_count: number;
  last_active_date?: string;
  last_active_date_time?: string;
  latest_remarks: string;
  tasks?: LeadTask[] | LeadTask | string;
  data?: {
    notes?: string;
    tasks?: LeadTask[] | LeadTask | string;
    [key: string]: any;
  };
}

interface LeadStats {
  total: number;
  fresh_leads: number;
  leads_won: number;
  wip_leads: number;
  lost_leads: number;
}

interface LeadState {
  leadStatus: string;
  priority: string;
  notes: string;
  selectedTags: string[];
  nextFollowUp: string;
  leadStartTime: Date;
}

const LeadCardCarousel: React.FC<LeadCardCarouselProps> = ({ config }) => {
  const { toast } = useToast();
  const [currentLead, setCurrentLead] = useState<LeadData | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats>({
    total: 0,
    fresh_leads: 0,
    leads_won: 0,
    wip_leads: 0,
    lost_leads: 0,
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [showPendingCard, setShowPendingCard] = useState(true);
  const [hasCheckedForLeads, setHasCheckedForLeads] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [inspirationalMessage, setInspirationalMessage] = useState<string>('');
  const [animationData, setAnimationData] = useState<any>(null);
  const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false);
  const [selectedNotInterestedReason, setSelectedNotInterestedReason] = useState<string>("");
  const [customNotInterestedReason, setCustomNotInterestedReason] = useState("");
  const [showCallBackDialog, setShowCallBackDialog] = useState(false);
  const [callbackDate, setCallbackDate] = useState<Date | undefined>(undefined);
  const [callbackHour, setCallbackHour] = useState(12);
  const [callbackMinute, setCallbackMinute] = useState(0);
  const [callbackIsAM, setCallbackIsAM] = useState(true);
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour');
  const clockRef = useRef<HTMLDivElement | null>(null);
  const [lead, setLead] = useState<LeadState>({
    leadStatus: "New",
    priority: "Medium",
    notes: "",
    selectedTags: [],
    nextFollowUp: "",
    leadStartTime: new Date(),
  });

  const isInitialized = useRef(false);

  // Inspirational messages for workers
  const inspirationalMessages = [
    "Every call brings you closer to success! 💪",
    "Your dedication drives results! 🚀",
    "Turn challenges into opportunities! 🌟",
    "Every lead is a chance to make a difference! 💎",
    "You're building relationships that matter! 🤝",
    "Success is calling - answer it! 📞",
    "Each interaction creates value! ✨",
    "You've got this! Keep pushing forward! 💯"
  ];

  const NOT_INTERESTED_REASONS = [
    "Not a political follower or leader",
    "No Trust in Auto Pay Feature",
    "Bank Account/UPI Issue",
    "Cannot Afford",
    ">=6 attempts",
    "Opted other services for Posters",
    "Lack of local Leader Content",
    "Lack of customization options",
    "Other (Free Text)",
  ];

  // Utility functions
  const parseTags = (tags: string[] | string) => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") return tags.split(",").map(tag => tag.trim());
    return [];
  };

  const formatPhoneForDisplay = (phone?: string) => {
    if (!phone) return "N/A";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 12) {
      return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phone;
  };

  const normalizePhoneForLinks = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleCallLead = (phone?: string) => {
    const clean = normalizePhoneForLinks(phone);
    if (!clean) return;
    window.open(`tel:${clean}`);
  };

  const handleWhatsAppLead = (phone?: string, whatsappLink?: string) => {
    if (whatsappLink) {
      window.open(whatsappLink, "_blank");
      return;
    }
    const clean = normalizePhoneForLinks(phone);
    if (!clean) return;
    window.open(`https://wa.me/${clean}`, "_blank");
  };

  const primaryPhone = useMemo(() => {
    return currentLead?.phone_no || currentLead?.phone || (currentLead as any)?.phone_number || currentLead?.data?.phone_number;
  }, [currentLead]);

  const leadTasks = useMemo(() => {
    const source =
      (currentLead as any)?.tasks ??
      currentLead?.data?.tasks;

    if (!source) return [];

    if (typeof source === "string") {
      try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // fall back to comma-separated list
      }
      return source
        .split(",")
        .map(task => task.trim())
        .filter(Boolean);
    }

    if (Array.isArray(source)) {
      return source;
    }

    if (typeof source === "object" && source !== null) {
      const taskLikeKeys = ["title", "name", "description", "status", "due_date", "dueDate"];
      if (taskLikeKeys.some(key => key in (source as Record<string, unknown>))) {
        return [source];
      }

      return Object.entries(source as Record<string, any>).map(([key, value]) => {
        let normalizedStatus: string | undefined;
        if (value === null || value === undefined || value === "Null") {
          normalizedStatus = undefined;
        } else if (typeof value === "string") {
          normalizedStatus = value;
        } else {
          try {
            normalizedStatus = JSON.stringify(value);
          } catch {
            normalizedStatus = String(value);
          }
        }

        return {
          id: key,
          title: key,
          status: normalizedStatus,
          rawStatus: value,
        } as LeadTask;
      });
    }

    return [];
  }, [currentLead]);

  // Fetching the lead stats
  const fetchLeadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use configured status data API endpoint or fallback to default
      const statusEndpoint = config?.statusDataApiEndpoint || "/get-lead-status";
      
      const response = await fetch(
        `${import.meta.env.VITE_RENDER_API_URL}${statusEndpoint}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLeadStats(data);
    } catch (error) {
      console.error("Error fetching lead stats:", error);
    }
  };

  // Fetching the first lead
  const fetchFirstLead = async () => {
    try {
      setLoading(true);
      const endpoint = config?.apiEndpoint || "/api/leads";
      const apiUrl = `${import.meta.env.VITE_RENDER_API_URL}${endpoint}`;
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
          setHasCheckedForLeads(true);
          setShowPendingCard(true);
          setCurrentLead(null);
          resetLeadState();
          isInitialized.current = false;
          await fetchLeadStats();
          toast({
            title: "Info",
            description: "No leads available at the moment.",
            variant: "default",
          });
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const leadData = await response.json();

      // Check if leadData is empty (handles null, undefined, empty object, empty array)
      const isEmpty = !leadData || 
                      (Array.isArray(leadData) && leadData.length === 0) ||
                      (typeof leadData === "object" && !Array.isArray(leadData) && Object.keys(leadData).length === 0) ||
                      (typeof leadData === "string" && leadData.trim() === "");

      if (isEmpty) {
        setHasCheckedForLeads(true);
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        await fetchLeadStats();
        toast({
          title: "Info",
          description: "No leads available at the moment.",
          variant: "default",
        });
        return;
      }

      setHasCheckedForLeads(true);

      setCurrentLead(leadData);
      setShowPendingCard(false);
      setLead(prev => ({
        ...prev,
        leadStatus: leadData.status || "New",
        priority: leadData.priority || "Medium",
        notes: (leadData?.data?.notes as string) || leadData?.notes || "",
        selectedTags: parseTags(leadData?.tags || []),
        nextFollowUp: leadData.next_follow_up || "",
        leadStartTime: new Date(),
      }));

      isInitialized.current = true;
      await fetchLeadStats();
      
    } catch (error) {
      console.error("Error fetching lead:", error);
      toast({
        title: "Error",
        description: "Failed to load lead. Please try again.",
        variant: "destructive",
      });
      setShowPendingCard(true);
      setCurrentLead(null);
      resetLeadState();
      isInitialized.current = false;
      await fetchLeadStats();
    } finally {
      setLoading(false);
    }
  };

  const resetLeadState = () => {
    setLead({
      leadStatus: "New",
      priority: "Medium",
      notes: "",
      selectedTags: [],
      nextFollowUp: "",
      leadStartTime: new Date(),
    });
  };

  // Reusable helper to post CRM events
  const sendLeadEvent = async (
    eventName: string,
    payload: Record<string, any>,
    options: { successTitle?: string; successDescription?: string } = {}
  ): Promise<boolean> => {
    if (!currentLead?.id) {
      toast({ title: "Error", description: "No lead to act on", variant: "destructive" });
      return false;
    }
    try {
      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Authentication required");

      const base = import.meta.env.VITE_RENDER_API_URL;
      if (!base) {
        console.warn("[LeadCardCarousel] VITE_RENDER_API_URL is not defined");
      }
      const url = `${base}/crm-records/records/events/`;
      const body = {
        event: eventName,
        record_id: currentLead.id,
        payload,
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => null);
        console.error("[LeadCardCarousel] Event request failed", { status: resp.status, statusText: resp.statusText, body: text });
        throw new Error(`HTTP ${resp.status}`);
      }

      if (options.successTitle || options.successDescription) {
        toast({
          title: options.successTitle || "Success",
          description: options.successDescription || "Event sent successfully.",
          variant: "default",
        });
      }
      return true;
    } catch (error: any) {
      console.error("Error sending event:", error);
      toast({ title: "Error", description: error.message || "Failed to send event", variant: "destructive" });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleActionButton = async (
    action: "Trial Activated" | "Not Interested" | "Call Not Connected" | "Call Back Later",
    extra?: { reason?: string; nextCallAt?: string }
  ) => {
    if (!currentLead?.id) {
      toast({ title: "Error", description: "No lead to act on", variant: "destructive" });
      return;
    }

    const eventMap: Record<typeof action, { event: string; success: string }> = {
      "Trial Activated": { event: "lead.trial_activated", success: "Marked as trial activated" },
      "Not Interested": { event: "lead.not_interested", success: "Lead marked as not interested" },
      "Call Not Connected": { event: "lead.call_not_connected", success: "Call status updated" },
      "Call Back Later": { event: "lead.call_back_later", success: "Marked for follow-up" },
    };

    const { event, success } = eventMap[action];

    const payload: Record<string, any> = {
          notes: lead.notes || "",
          remarks: currentLead.latest_remarks,
          lead_id: currentLead.id,
          user_id: currentLead.user_id,
    };

    if (extra?.reason) {
      payload.reason = extra.reason;
    }
    if (extra?.nextCallAt) {
      payload.next_call_at = extra.nextCallAt;
    }

      const ok = await sendLeadEvent(
      event,
      payload,
      { successTitle: "Success", successDescription: success }
    );

    if (ok) {
      await fetchFirstLead();
    }

    return ok;
  };

  const handleNotInterestedClick = () => {
    setSelectedNotInterestedReason("");
    setCustomNotInterestedReason("");
    setShowNotInterestedDialog(true);
  };

  const handleCloseNotInterestedDialog = () => {
    setShowNotInterestedDialog(false);
    setSelectedNotInterestedReason("");
    setCustomNotInterestedReason("");
  };

  const handleSubmitNotInterested = async () => {
    const selected = selectedNotInterestedReason.trim();
    const isOther = selected === "Other (Free Text)";
    const finalReason = isOther ? customNotInterestedReason.trim() : selected;

    if (!finalReason) {
      toast({ title: "Reason required", description: "Please select or enter a reason.", variant: "destructive" });
      return;
    }

    const ok = await handleActionButton("Not Interested", { reason: finalReason });
    if (ok) {
      handleCloseNotInterestedDialog();
    }
  };

  const handleTakeBreak = async () => {
    if (!currentLead?.id) {
      toast({ title: "Error", description: "No lead to act on", variant: "destructive" });
      return;
    }
    const ok = await sendLeadEvent(
      "agent.take_break",
      { notes: lead.notes },
      { successTitle: "Taking break", successDescription: "Bye, Come back soon!" }
    );
    if (ok) {
      // Return to landing (pending) screen
      setShowPendingCard(true);
      setCurrentLead(null);
      resetLeadState();
      isInitialized.current = false;
      await fetchLeadStats();
    }
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  const handleOpenProfile = () => {
    if (currentLead?.linkedin_profile || currentLead?.website) {
      setShowProfileModal(true);
    }
  };

  const buildCallbackISO = (): string | null => {
    if (!callbackDate) return null;
    let hour24 = callbackHour % 12;
    hour24 = callbackIsAM ? hour24 : hour24 + 12;
    const date = new Date(callbackDate);
    date.setHours(hour24, callbackMinute, 0, 0);
    try {
      return date.toISOString();
    } catch {
      return null;
    }
  };

  const handleOpenCallBackDialog = () => {
    setCallbackDate(new Date());
    setCallbackHour(12);
    setCallbackMinute(0);
    setCallbackIsAM(true);
    setClockMode('hour');
    setShowCallBackDialog(true);
  };

  const handleCloseCallBackDialog = () => {
    setShowCallBackDialog(false);
  };

  const handleSubmitCallBackLater = async () => {
    const iso = buildCallbackISO();
    if (!iso) {
      toast({ title: "Select time", description: "Please choose a valid date and time.", variant: "destructive" });
      return;
    }
    const ok = await handleActionButton("Call Back Later", { nextCallAt: iso });
    if (ok) {
      handleCloseCallBackDialog();
    }
  };

  const updateHourFromAngle = (angle: number) => {
    let hour = Math.round(angle / 30) % 12;
    if (hour <= 0) hour = 12;
    setCallbackHour(hour);
  };

  const updateMinuteFromAngle = (angle: number) => {
    let minute = Math.round(angle / 6) % 60;
    if (minute < 0) minute += 60;
    setCallbackMinute(minute);
  };

  const handleClockPointer = (clientX: number, clientY: number) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = clientX - centerX;
    const y = clientY - centerY;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    if (clockMode === 'hour') {
      updateHourFromAngle(angle);
    } else {
      updateMinuteFromAngle(angle);
    }
  };

  const handleClockMouse = (event: React.MouseEvent<HTMLDivElement>) => {
    handleClockPointer(event.clientX, event.clientY);
  };

  const handleClockTouch = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    handleClockPointer(touch.clientX, touch.clientY);
  };

  // Load Lottie animation (idle + cached)
  useEffect(() => {
    const urls = [
      'https://lottie.host/embed/c7676df8-1c6b-4703-b6dd-3e861d2c90a2/tl7ZtL4MJc.json',
      'https://assets5.lottiefiles.com/packages/lf20_jcikwtux.json',
      'https://assets5.lottiefiles.com/packages/lf20_qp1spzqv.json',
    ];

    requestIdle(() => {
      fetchLottieAnimation(urls)
        .then((data) => {
          if (data) setAnimationData(data);
        })
        .catch(() => {
          // noop; we already show a lightweight fallback
        });
    });
  }, []);

  // Initialize component - fetch stats only, don't fetch lead yet
  useEffect(() => {
    fetchLeadStats();
    setShowPendingCard(true);
    // Set random inspirational message
    setInspirationalMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);
  }, []);

  // Pending card
  if (showPendingCard) {
    return (
      <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
        <div className="relative w-full md:w-[90%] lg:w-[70%] h-full">
          <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {config?.title || "Lead Management"}
              </h3>
            </div>

            {/* Inspirational Messages for Workers */}
            <div className="mb-6 space-y-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-center shadow-lg">
                <p className="text-white text-xl font-semibold mb-2">
                  {inspirationalMessage}
                </p>
                <p className="text-blue-100 text-sm">
                  Ready to make your next call count?
                </p>
              </div>
              
              {/* Lottie Animation */}
              <div className="flex justify-center items-center h-64">
                {animationData ? (
                  <React.Suspense
                    fallback={
                      <div className="flex flex-col items-center justify-center h-64">
                        <div className="text-6xl mb-4">🎯</div>
                        <p className="text-gray-500 text-sm">Loading animation...</p>
                      </div>
                    }
                  >
                    {/* Lazy import to avoid blocking initial render with lottie-web */}
                    {(() => {
                      const Lottie = React.lazy(() => import('lottie-react'));
                      return (
                        <Lottie
                          animationData={animationData}
                          loop={true}
                          autoplay={true}
                          rendererSettings={{ progressiveLoad: true, hideOnTransparent: true }}
                          style={{ height: 250, width: 250 }}
                        />
                      );
                    })()}
                  </React.Suspense>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-gray-500 text-sm">Loading animation...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <Button 
                onClick={fetchFirstLead} 
                disabled={loading}
                className="w-full max-w-xs"
                size="lg"
              >
                {loading ? "Loading..." : "Get Leads"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
        <div className="mt-4 flex w-full md:w-[90%] lg:w-[70%] justify-end px-4 md:px-0">
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
        <div className="relative w-full md:w-[90%] lg:w-[70%] h-full">
          <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white p-4">
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading lead...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Showing the lead card
  return (
    <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
      <div className="mt-4 flex w-full md:w-[90%] lg:w-[70%] justify-end px-4 md:px-0">
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
      <div className="relative w-full md:w-[90%] lg:w-[70%] h-full">
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
            {/* Main Lead Information */}
            <div className="space-y-2">
              {/* Customer Profile Section */}
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="flex items-center gap-3">
                  {currentLead?.display_pic_url ? (
                    <img
                      src={currentLead.display_pic_url}
                      alt={`${currentLead.name || "Lead"} profile`}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <User
                    className={`h-12 w-12 text-primary ${currentLead?.display_pic_url ? "hidden" : ""}`}
                  />
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        {/* Customer Full Name - Clickable to User Profile */}
                        <a
                          href={currentLead?.user_profile_link || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-lg hover:text-blue-600 hover:underline cursor-pointer"
                        >
                          {currentLead?.customer_full_name || currentLead?.name || "N/A"}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {currentLead?.affiliated_party || "N/A"}
                        </p>
                      </div>
                      
                      {primaryPhone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${normalizePhoneForLinks(primaryPhone)}`}
                            className="flex items-center gap-2 text-sm font-semibold text-white bg-black px-4 py-1.5 rounded-full shadow hover:bg-black/80 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              handleCallLead(primaryPhone);
                            }}
                          >
                            <Phone className="h-4 w-4" />
                            <span>{formatPhoneForDisplay(primaryPhone)}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleWhatsAppLead(primaryPhone, currentLead?.whatsapp_link)}
                            className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            aria-label="Open WhatsApp"
                          >
                            <FaWhatsapp className="h-4 w-4" />
                          </button>
                      </div>
                      )}
                    </div>
                    
                    {/* Package to Pitch - Below Premium Count */}
                    <div className="mt-1">
                      <span className="text-xs text-muted-foreground">Package: </span>
                      <span className="text-xs font-medium">{currentLead?.package_to_pitch || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</Label>
                {leadTasks.length > 0 ? (
                  <div className="relative mx-auto max-w-2xl pl-10">
                    {leadTasks.map((task, index) => {
                      const isObjectTask = typeof task === "object" && task !== null;
                      const castTask = isObjectTask ? (task as LeadTask) : null;
                      const title = isObjectTask
                        ? castTask?.title || castTask?.name || `Task ${index + 1}`
                        : task;
                      const description =
                        isObjectTask && typeof castTask?.description === "string"
                          ? castTask?.description
                          : "";
                      const statusTextRaw = (() => {
                        if (!isObjectTask) return "";
                        const value = castTask?.status ?? castTask?.rawStatus;
                        if (value === undefined || value === null) return "";
                        return String(value);
                      })();
                      const statusNormalized = statusTextRaw.trim().toLowerCase();
                      const isAffirmative = statusNormalized === "yes";
                      const isNegative = statusNormalized === "no";
                      const lineColor = isAffirmative
                        ? "border-emerald-500"
                        : isNegative
                          ? "border-rose-400"
                          : "border-gray-400";
                      const dotColor = isAffirmative
                        ? "bg-emerald-500"
                        : isNegative
                          ? "bg-rose-500"
                          : "bg-gray-400";
                      const lineStyle = isAffirmative ? "" : "border-dashed";
                      const dueRaw =
                        isObjectTask &&
                        typeof ((castTask?.due_date ?? castTask?.dueDate)) === "string"
                          ? (castTask?.due_date ?? castTask?.dueDate)
                          : "";
                      const due =
                        dueRaw && !Number.isNaN(Date.parse(dueRaw))
                          ? new Date(dueRaw).toLocaleString()
                          : dueRaw;
                      const key =
                        (isObjectTask &&
                          (castTask?.id ?? castTask?.title ?? castTask?.name)) ||
                        `task-${index}`;
                      const isLast = index === leadTasks.length - 1;

                      return (
                        <div key={key} className="relative pb-6 last:pb-0">
                          {!isLast && (
                            <span
                              className={`absolute left-[11px] top-5 bottom-0 border-l-2 ${lineStyle} ${lineColor}`}
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className={`absolute left-[3px] top-3 h-5 w-5 rounded-full ${dotColor} shadow`}
                            aria-hidden="true"
                          />
                          <div className="bg-muted/40 rounded-md px-6 py-4 ml-2">
                            <p className="text-base font-semibold">
                              {typeof title === "string" && title.length > 0 ? title : `Task ${index + 1}`}
                            </p>
                            {description && (
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
                                {description}
                              </p>
                            )}
                            {(statusTextRaw || due) && (
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-3">
                                {statusTextRaw && (
                                  <span className="font-medium capitalize">{statusTextRaw}</span>
                                )}
                                {due && <span className="font-medium">Due: {due}</span>}
                  </div>
                )}
              </div>
                </div>
                      );
                    })}
                </div>
                ) : (
                  <div className="bg-muted/50 p-2 rounded-md text-sm text-muted-foreground">
                    No tasks available
              </div>
                )}
              </div>
            </div>
          </div>
          
            <div className="buttons flex flex-row flex-wrap items-center justify-center gap-4 sm:gap-5 md:gap-6 w-full max-w-full px-4">
              <div className="flex flex-wrap justify-center items-center gap-3 mt-4 pt-3 w-full">
                <Button
                  onClick={() => handleActionButton("Trial Activated")}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-40 bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updating || fetchingNext}
                >
                  Trial Activated
                </Button>
                <Button
                  onClick={handleNotInterestedClick}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-40 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updating || fetchingNext}
                >
                  Not Interested
                </Button>
                <Button
                  onClick={() => handleActionButton("Call Not Connected")}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-40 bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updating || fetchingNext}
                >
                  Call Not Connected
                </Button>
                <Button
                  onClick={handleOpenCallBackDialog}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-40 bg-white text-purple-600 border-purple-300 hover:bg-purple-50 hover:border-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updating || fetchingNext}
                >
                  Call Back Later
                </Button>
                        </div>
                      </div>
            <Dialog open={showNotInterestedDialog} onOpenChange={(open) => {
              if (!open) {
                handleCloseNotInterestedDialog();
              }
            }}>
              <DialogContent className="sm:max-w-lg" aria-describedby="not-interested-dialog-description">
                <DialogHeader>
                  <DialogTitle>Select a reason</DialogTitle>
                </DialogHeader>
                <p id="not-interested-dialog-description" className="sr-only">
                  Choose a reason for marking the lead as not interested or provide a custom explanation.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {NOT_INTERESTED_REASONS.filter(reason => reason !== "Other (Free Text)").map((reason) => {
                      const isSelected = selectedNotInterestedReason === reason;
                      return (
                        <button
                          key={reason}
                          type="button"
                            onClick={() => {
                            setSelectedNotInterestedReason(reason);
                            setCustomNotInterestedReason("");
                          }}
                          className={`rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/60"
                          }`}
                        >
                          {reason}
                          </button>
                      );
                    })}
                  </div>
                  <div
                    className={`rounded-md border px-3 py-2 transition-colors ${
                      selectedNotInterestedReason === "other"
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                  >
                    <Label htmlFor="not-interested-other" className="text-xs font-semibold text-muted-foreground">
                      Other Reason
                    </Label>
                    <Textarea
                      id="not-interested-other"
                      value={customNotInterestedReason}
                      onFocus={() => setSelectedNotInterestedReason("other")}
                      onChange={(e) => {
                        setSelectedNotInterestedReason("other");
                        setCustomNotInterestedReason(e.target.value);
                      }}
                      placeholder="Describe the customer's reason"
                      rows={3}
                      className="mt-2"
                    />
                        </div>
                      </div>
                <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:gap-2">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleCloseNotInterestedDialog}>
                    Cancel
                  </Button>
                    <Button
                    className="w-full sm:w-auto"
                    onClick={handleSubmitNotInterested}
                    disabled={
                      !selectedNotInterestedReason ||
                      (selectedNotInterestedReason === "other" && !customNotInterestedReason.trim()) ||
                      updating
                    }
                  >
                    Submit
                    </Button>
                </DialogFooter>
                </DialogContent>
              </Dialog>
            <Dialog open={showCallBackDialog} onOpenChange={(open) => {
               if (!open) {
                 handleCloseCallBackDialog();
               }
             }}>
               <DialogContent className="sm:max-w-3xl" aria-describedby="callback-dialog-description">
                 <DialogHeader>
                   <DialogTitle>Schedule Call Back</DialogTitle>
                 </DialogHeader>
                 <p id="callback-dialog-description" className="sr-only">
                   Pick a date and time to follow up with this lead.
                 </p>
                 <div className="flex flex-col md:flex-row gap-4">
                   <div className="border rounded-md p-3 flex-1 min-w-[260px]">
                     <Label className="text-xs font-semibold text-muted-foreground">Select Date</Label>
                     <Calendar
                       mode="single"
                       selected={callbackDate}
                       onSelect={setCallbackDate}
                       disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                       className="mt-2"
                     />
                   </div>
                   <div className="border rounded-md p-3 flex flex-col items-center gap-3 flex-1 min-w-[260px]">
                     <Label className="text-xs font-semibold text-muted-foreground self-start">Select Time</Label>
                     <div
                       ref={clockRef}
                       onMouseDown={handleClockMouse}
                       onTouchStart={handleClockTouch}
                       className="relative h-48 w-48 rounded-full bg-white shadow-inner cursor-pointer select-none"
                     >
                       <svg viewBox="0 0 200 200" className="h-full w-full">
                         <circle cx="100" cy="100" r="96" fill="white" stroke="#E5E7EB" strokeWidth="2" />
                         {Array.from({ length: 12 }, (_, i) => {
                           const angle = ((i + 1) * 30 - 90) * (Math.PI / 180);
                           const radius = 80;
                           const x = 100 + radius * Math.cos(angle);
                           const y = 100 + radius * Math.sin(angle);
                           return (
                             <text
                               key={i}
                               x={x}
                               y={y}
                               fontSize="12"
                               fill="#4B5563"
                               textAnchor="middle"
                               dominantBaseline="middle"
                             >
                               {i + 1}
                             </text>
                           );
                         })}
                         {clockMode === 'minute' && (
                           <line
                             x1="100"
                             y1="100"
                             x2={100 + 70 * Math.cos(((callbackMinute * 6) - 90) * (Math.PI / 180))}
                             y2={100 + 70 * Math.sin(((callbackMinute * 6) - 90) * (Math.PI / 180))}
                             stroke="#8B5CF6"
                             strokeWidth="3"
                             strokeLinecap="round"
                           />
                         )}
                         {clockMode === 'hour' && (
                           <line
                             x1="100"
                             y1="100"
                             x2={100 + 50 * Math.cos((((callbackHour % 12) * 30 + callbackMinute * 0.5) - 90) * (Math.PI / 180))}
                             y2={100 + 50 * Math.sin((((callbackHour % 12) * 30 + callbackMinute * 0.5) - 90) * (Math.PI / 180))}
                             stroke="#8B5CF6"
                             strokeWidth="4"
                             strokeLinecap="round"
                           />
                         )}
                         <circle cx="100" cy="100" r="4" fill="#8B5CF6" />
                       </svg>
                     </div>
                     <div className="flex gap-2 w-full">
                       <Button
                         type="button"
                         variant={clockMode === 'hour' ? "default" : "outline"}
                         size="sm"
                         className="flex-1"
                         onClick={() => setClockMode('hour')}
                       >
                         Hour
                       </Button>
                       <Button
                         type="button"
                         variant={clockMode === 'minute' ? "default" : "outline"}
                         size="sm"
                         className="flex-1"
                         onClick={() => setClockMode('minute')}
                       >
                         Minute
                       </Button>
                     </div>
                     <div className="flex gap-2 w-full">
                       <Button
                         type="button"
                         variant={callbackIsAM ? "default" : "outline"}
                         size="sm"
                         className="flex-1"
                         onClick={() => setCallbackIsAM(true)}
                       >
                         AM
                       </Button>
                       <Button
                         type="button"
                         variant={!callbackIsAM ? "default" : "outline"}
                         size="sm"
                         className="flex-1"
                         onClick={() => setCallbackIsAM(false)}
                       >
                         PM
                       </Button>
                     </div>
                   </div>
                 </div>
                 {callbackDate && (
                   <div className="mt-4 rounded-md bg-muted p-2 text-sm">
                     <span className="text-muted-foreground">Scheduled for: </span>
                     <span className="font-medium">
                       {format(callbackDate, "PPP")} at {((callbackHour % 12) || 12)}:{callbackMinute.toString().padStart(2, '0')} {callbackIsAM ? 'AM' : 'PM'}
                     </span>
                   </div>
                 )}
                 <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:gap-2">
                   <Button variant="outline" className="w-full sm:w-auto" onClick={handleCloseCallBackDialog}>
                     Cancel
                   </Button>
                   <Button
                     className="w-full sm:w-auto"
                     onClick={handleSubmitCallBackLater}
                     disabled={!callbackDate || updating}
                   >
                     Schedule
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
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
                  <h3 className="font-semibold">{currentLead?.name || "Lead Profile"}</h3>
                  <p className="text-sm text-muted-foreground">Profile Information</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseProfile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentLead?.linkedin_profile && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">LinkedIn Profile</h4>
                    <a
                      href={currentLead.linkedin_profile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {currentLead.linkedin_profile}
                    </a>
                  </div>
                )}
                
                {currentLead?.website && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Website</h4>
                    <a
                      href={currentLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {currentLead.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCardCarousel;