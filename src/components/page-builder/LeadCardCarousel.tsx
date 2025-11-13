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
  AlertCircle,
  Clock,
  MessageSquare,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LeadActionButton } from "./LeadActionButton";

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
  const [actionButtonsVisible, setActionButtonsVisible] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

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
    setActionButtonsVisible(true);
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

  type TaskStatus = "completed" | "current" | "pending";

  interface TaskStep {
    id: string;
    label: string;
    status: TaskStatus;
    description?: string;
  }

  const taskSteps = useMemo<TaskStep[]>(() => {
    if (!leadTasks.length) return [];

    const rawSteps = leadTasks.map((task, index) => {
      if (typeof task === "string") {
        return {
          id: `task-${index}`,
          label: task,
          description: undefined,
          statusText: "",
        };
      }

      if (typeof task === "object" && task !== null) {
        const cast = task as LeadTask;
        const statusText = (() => {
          const value = cast.status ?? cast.rawStatus;
          if (value === null || value === undefined) return "";
          return String(value);
        })();

        return {
          id: String(cast.id ?? cast.title ?? cast.name ?? `task-${index}`),
          label: cast.title || cast.name || `Task ${index + 1}`,
          description: cast.description,
          statusText,
        };
      }

      return {
        id: `task-${index}`,
        label: `Task ${index + 1}`,
        description: undefined,
        statusText: "",
      };
    });

    let currentMarked = false;
    const normalised = rawSteps.map((step, index) => {
      const normalizedStatus = step.statusText.toLowerCase().trim();
      let status: TaskStatus = "pending";
      if (!normalizedStatus && index === 0) {
        status = "current";
        currentMarked = true;
      } else if (
        normalizedStatus.includes("done") ||
        normalizedStatus.includes("yes") ||
        normalizedStatus.includes("complete")
      ) {
        status = "completed";
      } else if (
        normalizedStatus.includes("current") ||
        normalizedStatus.includes("progress") ||
        normalizedStatus.includes("ongoing")
      ) {
        status = "current";
        currentMarked = true;
      }

      return {
        id: step.id,
        label: step.label,
        description: step.description,
        status,
        statusText: step.statusText,
      };
    });

    if (!currentMarked) {
      const firstPendingIndex = normalised.findIndex(step => step.status === "pending");
      if (firstPendingIndex >= 0) {
        normalised[firstPendingIndex].status = "current";
      } else if (normalised.length) {
        normalised[0].status = "current";
      }
    }

    return normalised.map(step => ({
      id: step.id,
      label: step.label,
      description: step.description,
      status: step.status,
    }));
  }, [leadTasks]);

  const TaskProgressList: React.FC<{ steps: TaskStep[] }> = ({ steps }) => {
    if (!steps.length) return null;

    return (
      <ol
        className="relative flex flex-col gap-4"
        style={{
          fontFamily: '"Open Sans", sans-serif',
          fontWeight: 500,
          fontSize: "16px",
          lineHeight: "24px",
          letterSpacing: "0%",
        }}
      >
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-h-[44px] gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  step.status === "completed" && "border-emerald-500 bg-emerald-100 text-emerald-600",
                  step.status === "current" && "border-slate-900 bg-slate-900 text-white",
                  step.status === "pending" && "border-slate-200 bg-white text-slate-300"
                )}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.status === "current" ? (
                  <span className="block h-2.5 w-2.5 rounded-full bg-white" />
                ) : (
                  <span className="block h-2 w-2 rounded-full bg-slate-300" />
                )}
              </div>
              {index !== steps.length - 1 && <div className="mt-1 h-full w-px flex-1 bg-slate-200" />}
            </div>
            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.status === "current"
                    ? "text-slate-900"
                    : step.status === "completed"
                    ? "text-slate-600"
                    : "text-slate-500"
                )}
              >
                {step.label}
              </p>
              {step.description && <p className="text-xs text-slate-400">{step.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    );
  };

  interface LeadInfoTileProps {
    icon: React.ElementType;
    label: string;
    value?: string | number | null;
    onClick?: () => void;
  }

  const LeadInfoTile: React.FC<LeadInfoTileProps> = ({ icon: Icon, label, value, onClick }) => {
    const displayValue =
      typeof value === "string" && value.trim().length > 0 ? value : value ?? "N/A";

    const className = cn(
      "flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left",
      onClick &&
        "transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
    );

    const content = (
      <>
        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </span>
          <span className="break-words text-sm font-semibold text-slate-800">{displayValue}</span>
        </div>
      </>
    );

    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={className}>
          {content}
        </button>
      );
    }

    return <div className={className}>{content}</div>;
  };

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
      setActionButtonsVisible(false);
      setProcessingAction(null);
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
    setActionButtonsVisible(false);
    setProcessingAction(null);
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

    setProcessingAction(action);
    try {
      const ok = await sendLeadEvent(
        event,
        payload,
        { successTitle: "Success", successDescription: success }
      );

      if (ok) {
        await fetchFirstLead();
      }

      return ok;
    } finally {
      setProcessingAction(null);
    }
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

  const formattedCreatedAt = currentLead?.created_at
    ? new Date(currentLead.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const formattedPhoneNumber = primaryPhone ? formatPhoneForDisplay(primaryPhone) : "N/A";
  const profileClickable = Boolean(
    currentLead?.linkedin_profile || currentLead?.website || currentLead?.user_profile_link
  );
  const postCallActions = [
    {
      id: "trial-activated",
      label: "Trail Accepted",
      icon: CheckCircle2,
      tone: "neutral" as const,
      onClick: () => {
        void handleActionButton("Trial Activated");
      },
      loadingKey: "Trial Activated",
    },
    {
      id: "not-interested",
      label: "Not Interested",
      icon: MessageSquare,
      tone: "neutral" as const,
      onClick: handleNotInterestedClick,
      loadingKey: "Not Interested",
    },
    {
      id: "call-not-connected",
      label: "Not Connected",
      icon: AlertCircle,
      tone: "neutral" as const,
      onClick: () => {
        void handleActionButton("Call Not Connected");
      },
      loadingKey: "Call Not Connected",
    },
    {
      id: "call-back",
      label: "Call Back",
      icon: Clock,
      tone: "neutral" as const,
      onClick: handleOpenCallBackDialog,
      loadingKey: "Call Back Later",
    },
  ].filter(Boolean);
  const titleFont = { fontFamily: "Georgia, serif" };
  const bodyFont = { fontFamily: '"Open Sans", sans-serif' };
  // Showing the lead card
  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="relative flex h/full w/full">
        <Card className="relative flex w-full flex-col overflow-hidden bg-white border-0 shadow-none">
          {fetchingNext && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-b-transparent" />
                <p className="text-sm text-slate-500">Loading next lead...</p>
              </div>
            </div>
          )}
          <CardContent className="flex flex-col gap-8 p-6 bg-white" style={bodyFont}>
            <div className="w-full border-b border-slate-200 px-5 pb-5">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div
                  className={cn(
                    "flex items-center gap-4",
                    profileClickable && "cursor-pointer"
                  )}
                  onClick={profileClickable ? handleOpenProfile : undefined}
                >
                  {currentLead?.display_pic_url ? (
                    <img
                      src={currentLead.display_pic_url}
                      alt={`${currentLead?.customer_full_name || currentLead?.name || "Lead"} profile`}
                      className="h-14 w-14 rounded-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full bg-slate-100",
                      currentLead?.display_pic_url ? "hidden" : ""
                    )}
                  >
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                    {currentLead?.user_profile_link ? (
                      <a
                        href={currentLead.user_profile_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-2xl font-semibold text-slate-900 hover:text-primary"
                        style={titleFont}
                      >
                        {currentLead?.customer_full_name || currentLead?.name || "N/A"}
                      </a>
                    ) : (
                      <h2 className="text-2xl font-semibold text-slate-900" style={titleFont}>
                        {currentLead?.customer_full_name || currentLead?.name || "N/A"}
                      </h2>
                    )}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        {currentLead?.affiliated_party && (
                          <span className="font-medium text-slate-700">
                            {currentLead.affiliated_party}
                          </span>
                        )}
                        {currentLead?.lead_stage && (
                          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            {currentLead.lead_stage}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {currentLead?.status && (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {currentLead.status}
                        </span>
                      )}
                      {currentLead?.priority && (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Priority: {currentLead.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 px-3 py-2 text-sm font-semibold text-gray-500 shadow-sm hover:bg-gray-100"
                    onClick={handleTakeBreak}
                    disabled={updating}
                  >
                    <Coffee className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 rounded-xl border-[#D0D5DD] bg-[#F2F4F7] px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#E4E7EC]"
                    onClick={() => handleWhatsAppLead(primaryPhone, currentLead?.whatsapp_link)}
                    disabled={!primaryPhone || updating || fetchingNext}
                  >
                    <FaWhatsapp className="h-4 w-4 text-[#344054]" />
                    WhatsApp
                  </Button>
                  <Button
                    type="button"
                    className="flex items-center gap-2 rounded-xl bg-[#1D2939] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#111827]"
                    onClick={() => handleCallLead(primaryPhone)}
                    disabled={!primaryPhone || updating || fetchingNext}
                  >
                    <Phone className="h-4 w-4" />
                    <span>{formattedPhoneNumber}</span>
                  </Button>
                </div>
              </div>
            </div>
            <div
              className={cn(
                "mt-8 grid gap-6",
                currentLead?.location && "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
              )}
            >
              <div className="rounded-2xl border border-slate-200 p-5 w-full">
                <div className="mb-4 flex items-center justify-between pl-2">
                  <h3 className="text-lg font-semibold text-slate-900" style={titleFont}>Task Progress</h3>
                </div>
                {taskSteps.length ? (
                  <div className="pl-4">
                    <TaskProgressList steps={taskSteps} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No tasks available.</p>
                )}
              </div>
              {currentLead?.location ? (
                <div className="space-y-3">
                  <LeadInfoTile icon={AlertCircle} label="Location" value={currentLead.location} />
                </div>
              ) : null}
            </div>
          </CardContent>
          <div className="border-t border-slate-100 bg-white px-6 py-4">
            {actionButtonsVisible && postCallActions.length > 0 ? (
              <div className="flex w-full flex-wrap items-center gap-3">
                {postCallActions.map((action) => (
                  <LeadActionButton
                    key={action.id}
                    icon={action.icon}
                    label={action.label}
                    onClick={action.onClick}
                    disabled={updating || fetchingNext}
                    loading={processingAction === action.loadingKey && updating}
                    tone={action.tone}
                    className="flex-1 min-w-[160px]"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </Card>
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