import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { fetchLottieAnimation, requestIdle } from "@/lib/lottieCache";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { userSettingsApi } from "@/lib/userSettingsApi";
import { FaWhatsapp } from "react-icons/fa";
import {
  User,
  Phone,
  Coffee,
  CheckCircle2,
  Check,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LeadActionButton } from "./LeadActionButton";
import { NotInterestedModal } from "./NotInterestedModal";
import { CallBackModal } from "./CallBackModal";

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
  display_pic_url?: string | null;
  linkedin_profile: string;
  website: string;
  next_follow_up: string;
  // New fields as per requirements
  lead_stage: string;
  praja_id: string;
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
  const { user: authUser } = useAuth();
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
  const [showCallBackDialog, setShowCallBackDialog] = useState(false);
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
  const [imageError, setImageError] = useState(false);
  const [dailyTarget, setDailyTarget] = useState<number | null>(null);
  const [fetchedLeadsCount, setFetchedLeadsCount] = useState<number>(0);

  const isInitialized = useRef(false);

  // Get today's date string (YYYY-MM-DD) for daily reset tracking
  const getTodayDateString = (): string => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Check if we need to reset fetched leads count (new day after midnight)
  const shouldResetFetchedCount = (): boolean => {
    try {
      const lastResetDate = localStorage.getItem('leadCardCarousel_lastResetDate');
      const today = getTodayDateString();
      return lastResetDate !== today;
    } catch {
      return true;
    }
  };

  // Reset fetched leads count when day changes
  const resetFetchedLeadsCount = () => {
    try {
      const today = getTodayDateString();
      localStorage.setItem('leadCardCarousel_fetchedLeadsCount', '0');
      localStorage.setItem('leadCardCarousel_lastResetDate', today);
      setFetchedLeadsCount(0);
    } catch (e) {
      console.warn('[LeadCardCarousel] Failed to reset fetched leads count:', e);
    }
  };

  // Load persisted fetched leads count from localStorage
  const getPersistedFetchedCount = (): number => {
    try {
      // Check if we need to reset (new day)
      if (shouldResetFetchedCount()) {
        resetFetchedLeadsCount();
        return 0;
      }
      const stored = localStorage.getItem('leadCardCarousel_fetchedLeadsCount');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };

  // Increment fetched leads count
  const incrementFetchedCount = () => {
    try {
      const newCount = fetchedLeadsCount + 1;
      setFetchedLeadsCount(newCount);
      const today = getTodayDateString();
      localStorage.setItem('leadCardCarousel_fetchedLeadsCount', newCount.toString());
      localStorage.setItem('leadCardCarousel_lastResetDate', today);
    } catch (e) {
      console.warn('[LeadCardCarousel] Failed to persist fetched leads count:', e);
    }
  };

  // Fetch daily target from LEAD_TYPE_ASSIGNMENT record
  const fetchDailyTarget = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.log('[LeadCardCarousel] No session, skipping daily target fetch');
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.log('[LeadCardCarousel] No user, skipping daily target fetch');
        return;
      }

      console.log('[LeadCardCarousel] Fetching daily target for user:', currentUser.id);

      try {
        const savedSetting = await userSettingsApi.get(currentUser.id, 'LEAD_TYPE_ASSIGNMENT');
        console.log('[LeadCardCarousel] Retrieved LEAD_TYPE_ASSIGNMENT record:', {
          daily_target: savedSetting.daily_target,
          value: savedSetting.value
        });
        
        if (savedSetting.daily_target !== undefined && savedSetting.daily_target !== null) {
          const savedTarget = savedSetting.daily_target;
          console.log('[LeadCardCarousel] Found daily target:', savedTarget);
          setDailyTarget(savedTarget);
        } else {
          console.log('[LeadCardCarousel] daily_target is null/undefined, setting to null');
          setDailyTarget(null);
        }
      } catch (error: any) {
        if (error.message?.includes('404') || error.message?.includes('Not found')) {
          console.log('[LeadCardCarousel] No LEAD_TYPE_ASSIGNMENT record found, setting daily target to null');
          setDailyTarget(null);
        } else {
          console.error('[LeadCardCarousel] Error loading daily target:', error);
          setDailyTarget(null);
        }
      }
    } catch (error) {
      console.error('[LeadCardCarousel] Error fetching daily target:', error);
      setDailyTarget(null);
    }
  };

  // Persistence functions for sessionStorage
  const getPersistedState = () => {
    try {
      const persisted = sessionStorage.getItem("leadCardCarouselState");
      return persisted ? JSON.parse(persisted) : null;
    } catch {
      return null;
    }
  };

  const persistState = (lead: LeadData | null) => {
    try {
      if (lead) {
        sessionStorage.setItem("leadCardCarouselState", JSON.stringify({
          currentLead: lead,
          leadId: lead.id,
          timestamp: Date.now()
        }));
      } else {
        sessionStorage.removeItem("leadCardCarouselState");
      }
    } catch (error) {
      console.error("Error persisting state:", error);
    }
  };

  const clearPersistedState = () => {
    try {
      sessionStorage.removeItem("leadCardCarouselState");
    } catch (error) {
      console.error("Error clearing persisted state:", error);
    }
  };

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


  // Utility functions
  const parseTags = (tags: string[] | string) => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") return tags.split(",").map(tag => tag.trim());
    return [];
  };

  const getLeadName = (lead: LeadData | null): string => {
    if (!lead) return "N/A";
    return lead.data?.name || lead.name || "N/A";
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
      // Handle new list format: [{task: "...", status: "..."}, ...]
      return source.map((item, index) => {
        if (typeof item === "string") {
          return item;
        }
        if (typeof item === "object" && item !== null) {
          // New format: {task: "...", status: "..."}
          if ('task' in item) {
            return {
              id: String(item.task || index),
              title: item.task,
              name: item.task,
              status: item.status || item.rawStatus,
              rawStatus: item.status,
            } as LeadTask;
          }
          // Legacy format: {title: "...", status: "..."} or {name: "...", status: "..."}
          return item as LeadTask;
        }
        return item;
      });
    }

    if (typeof source === "object" && source !== null) {
      const taskLikeKeys = ["title", "name", "description", "status", "due_date", "dueDate", "task"];
      if (taskLikeKeys.some(key => key in (source as Record<string, unknown>))) {
        return [source];
      }

      // Convert dict format to array: {"Task Name": "Status", ...}
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
          name: key,
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
          if (value === null || value === undefined || value === "Null") return "";
          return String(value);
        })();

        // Support new format: {task: "...", status: "..."}
        // Also support legacy formats: {title: "..."} or {name: "..."}
        const taskLabel = cast.task || cast.title || cast.name || `Task ${index + 1}`;

        return {
          id: String(cast.id ?? cast.task ?? cast.title ?? cast.name ?? `task-${index}`),
          label: taskLabel,
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

    const currentIndexRaw = steps.findIndex((step) => step.status === "current");
    const currentIndex =
      currentIndexRaw !== -1
        ? currentIndexRaw
        : steps.findIndex((step) => step.status !== "completed");

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
          <li key={step.id} className="flex min-h-[44px] gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                  step.status === "completed" && "border-slate-300 bg-slate-50",
                  step.status === "current" && "border-slate-900 bg-slate-900",
                  step.status === "pending" && "border-slate-200 bg-white"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : step.status === "current" ? (
                  <span className="block h-2 w-2 rounded-full bg-white" />
                ) : (
                  <span className="block h-1.5 w-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    "mt-1 h-full w-px flex-1",
                    currentIndex !== -1 && index < currentIndex ? "bg-slate-900" : "bg-slate-200"
                  )}
                />
              )}
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
      const apiUrl = `${import.meta.env.VITE_RENDER_API_URL}${statusEndpoint}`;
      
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLeadStats(data);
    } catch (error) {
      console.error("Error fetching lead statistics:", error);
    }
  };

  // Fetching the first lead
  const fetchFirstLead = async () => {
    try {
      setLoading(true);
      
      // Check if there's a persisted lead to restore (only on explicit "Get Leads" click)
      // This helps with page refresh scenario, but won't interfere with navigation
      const persistedState = getPersistedState();
      if (persistedState?.currentLead && persistedState.leadId && !hasCheckedForLeads) {
        // Read current count from localStorage to ensure we have the correct value
        const currentCount = getPersistedFetchedCount();
        // Sync state with localStorage value
        setFetchedLeadsCount(currentCount);
        
        // Restore persisted lead only if user hasn't checked for leads yet (page refresh scenario)
        // Don't increment count when restoring - it was already counted when first fetched
        // The count state is already synced above
        const restoredLead = persistedState.currentLead;
        setCurrentLead(restoredLead);
        setShowPendingCard(false);
        setHasCheckedForLeads(true);
        setLead(prev => ({
          ...prev,
          leadStatus: restoredLead.status || "New",
          priority: restoredLead.priority || "Medium",
          notes: (restoredLead?.data?.notes as string) || restoredLead?.notes || "",
          selectedTags: parseTags(restoredLead?.tags || []),
          nextFollowUp: restoredLead.next_follow_up || "",
          leadStartTime: new Date(),
        }));
        isInitialized.current = true;
        await fetchLeadStats();
        setLoading(false);
        return;
      }
      
      // Otherwise, fetch a new lead from API
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
          clearPersistedState();
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
        clearPersistedState();
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

      // Handle nested data structures (e.g., if data is in a 'data' or 'lead' property)
      let processedLead = leadData;
      if (leadData?.data && typeof leadData.data === 'object') {
        processedLead = { ...leadData, ...leadData.data };
        // Ensure name is accessible at top level if it's in data.name
        if (leadData.data.name && !processedLead.name) {
          processedLead.name = leadData.data.name;
        }
      }
      if (leadData?.lead && typeof leadData.lead === 'object') {
        processedLead = { ...leadData, ...leadData.lead };
      }
      setCurrentLead(processedLead);
      setShowPendingCard(false);
      setActionButtonsVisible(false);
      setProcessingAction(null);
      setLead(prev => ({
        ...prev,
        leadStatus: processedLead.status || "New",
        priority: processedLead.priority || "Medium",
        notes: (processedLead?.data?.notes as string) || processedLead?.notes || "",
        selectedTags: parseTags(processedLead?.tags || []),
        nextFollowUp: processedLead.next_follow_up || "",
        leadStartTime: new Date(),
      }));

      // Increment fetched leads count (only if daily target is set)
      if (dailyTarget !== null) {
        incrementFetchedCount();
      }

      // Persist the current lead
      persistState(processedLead);

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
      clearPersistedState();
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
    extra?: { reason?: string; nextCallAt?: string; assignToSelf?: boolean }
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

    const actingUserId = authUser?.id || currentLead.praja_id;
    const payload: Record<string, any> = {
      notes: lead.notes || "",
      remarks: currentLead.latest_remarks,
      lead_id: currentLead.id,
      user_id: actingUserId,
      lead_owner_user_id: currentLead.praja_id,
    };

    if (extra?.reason) {
      payload.reason = extra.reason;
    }
    if (extra?.nextCallAt) {
      payload.next_call_at = extra.nextCallAt;
    }
    // Handle assignment: set assigned_to based on assignToSelf checkbox
    if (extra?.assignToSelf === true) {
      payload.assign_to_self = actingUserId;
      payload.assigned_to = actingUserId;
    } else {
      // When not assigning to self, explicitly set assigned_to to null
      // Backend should respect this and set assigned_to to null in the database
      payload.assigned_to = null;
    }

    setProcessingAction(action);
    try {
      const ok = await sendLeadEvent(
        event,
        payload,
        { successTitle: "Success", successDescription: success }
      );

      if (ok) {
        if (action === "Trial Activated") {
          // Dispatch custom event for progress bar to listen
          window.dispatchEvent(new CustomEvent('trial-activated', { 
            detail: { leadId: currentLead.id } 
          }));
        }
        
        // Check daily target before fetching next lead
        if (dailyTarget !== null && fetchedLeadsCount >= dailyTarget) {
          // Daily target reached, show pending card with message
          setShowPendingCard(true);
          setCurrentLead(null);
          resetLeadState();
          clearPersistedState();
          isInitialized.current = false;
          await fetchLeadStats();
          toast({
            title: "Daily Target Reached",
            description: `You have reached your daily target of ${dailyTarget}. Please contact your manager to get more leads assigned.`,
            variant: "default",
          });
        } else {
          await fetchFirstLead();
        }
      }

      return ok;
    } finally {
      setProcessingAction(null);
    }
  };

  const handleNotInterestedClick = () => {
    setShowNotInterestedDialog(true);
  };

  const handleSubmitNotInterested = async (reason: string): Promise<boolean> => {
    if (!reason) {
      toast({ title: "Reason required", description: "Please select or enter a reason.", variant: "destructive" });
      return false;
    }
    return await handleActionButton("Not Interested", { reason });
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

  const handleOpenCallBackDialog = () => {
    setShowCallBackDialog(true);
  };

  const handleSubmitCallBackLater = async (nextCallAt: string, assignToSelf: boolean): Promise<boolean> => {
    if (!nextCallAt) {
      toast({ title: "Select time", description: "Please choose a valid date and time.", variant: "destructive" });
      return false;
    }
    return await handleActionButton("Call Back Later", {
      nextCallAt,
      assignToSelf,
    });
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

  // Initialize component - always show pending card first
  useEffect(() => {
    fetchLeadStats();
    fetchDailyTarget();
    
    // Initialize fetched leads count from localStorage
    const persistedCount = getPersistedFetchedCount();
    setFetchedLeadsCount(persistedCount);
    
    // Always show pending card when component mounts (navigation or refresh)
    // Persisted state will only be used when user clicks "Get Leads" button
    // This ensures users always see the pending card first when navigating to the page
    setShowPendingCard(true);
    
    // Set random inspirational message
    setInspirationalMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);
  }, []);

  // Sync count from localStorage periodically
  useEffect(() => {
    const syncCount = () => {
      const storedCount = getPersistedFetchedCount();
      if (storedCount !== fetchedLeadsCount) {
        setFetchedLeadsCount(storedCount);
      }
    };
    
    // Sync immediately
    syncCount();
    
    // Sync every 2 seconds to keep it up to date
    const syncInterval = setInterval(syncCount, 2000);
    
    return () => clearInterval(syncInterval);
  }, [fetchedLeadsCount]);

  // Check for midnight reset periodically
  useEffect(() => {
    const checkMidnightReset = () => {
      if (shouldResetFetchedCount()) {
        resetFetchedLeadsCount();
      }
    };

    // Check immediately
    checkMidnightReset();

    // Check every minute for midnight crossing
    const intervalId = setInterval(checkMidnightReset, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, []);

  // Reset image error when currentLead changes
  useEffect(() => {
    setImageError(false);
  }, [currentLead]);

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
    <div className="flex w-full flex-col relative overflow-hidden md:overflow-hidden">
      <div className="relative w-full overflow-hidden md:overflow-hidden">
        <Card className="relative flex w-full flex-col bg-white border-0 shadow-none overflow-hidden md:overflow-hidden">
          {fetchingNext && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-b-transparent" />
                <p className="text-sm text-slate-500">Loading next lead...</p>
              </div>
            </div>
          )}
          {/* Header Section */}
          <div className="w-full border-b border-slate-200 px-2 py-1.5 bg-white" style={bodyFont}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5",
                  profileClickable && "cursor-pointer"
                )}
                onClick={profileClickable ? handleOpenProfile : undefined}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 flex-shrink-0 overflow-hidden">
                  {currentLead?.display_pic_url && 
                   typeof currentLead.display_pic_url === 'string' && 
                   currentLead.display_pic_url.trim() !== '' && 
                   !imageError ? (
                    <img
                      src={currentLead.display_pic_url}
                      alt={`${getLeadName(currentLead) || "Lead"} profile`}
                      className="h-9 w-9 rounded-full object-cover"
                      loading="lazy"
                      onError={() => {
                        setImageError(true);
                      }}
                      onLoad={() => {
                        setImageError(false);
                      }}
                    />
                  ) : (
                    <User className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-col gap-0.5">
                  {currentLead?.user_profile_link ? (
                    <a
                      href={currentLead.user_profile_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl font-semibold text-slate-900 hover:text-primary"
                      style={titleFont}
                    >
                      {getLeadName(currentLead)}
                    </a>
                  ) : (
                    <h2 className="text-2xl font-semibold text-slate-900" style={titleFont}>
                      {getLeadName(currentLead)}
                    </h2>
                  )}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      {currentLead?.affiliated_party && (
                        <span className="font-medium text-slate-700">
                          {currentLead.affiliated_party}
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
          
          {/* Task Progress Section */}
          <CardContent className={`flex flex-col gap-8 p-4 bg-white ${actionButtonsVisible && postCallActions.length > 0 ? 'pb-24' : 'pb-4'}`} style={bodyFont}>
            <div
              className={cn(
                "grid gap-6",
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
        </Card>
      </div>
      {/* Fixed Action Buttons at Bottom of Viewport */}
      {actionButtonsVisible && postCallActions.length > 0 && (
        <div 
          className="fixed bottom-0 right-0 z-50 border-t border-slate-200 bg-white px-6 py-4 shadow-lg"
          style={{ 
            left: 'var(--sidebar-width, 288px)',
            transition: 'left 0.2s ease-in-out'
          }}
        >
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
        </div>
      )}
      <NotInterestedModal
        open={showNotInterestedDialog}
        onOpenChange={setShowNotInterestedDialog}
        onSubmit={handleSubmitNotInterested}
        updating={updating}
      />
      <CallBackModal
        open={showCallBackDialog}
        onOpenChange={setShowCallBackDialog}
        onSubmit={handleSubmitCallBackLater}
        updating={updating}
      />

      {/* Profile Modal */}
      {showProfileModal && (currentLead?.linkedin_profile || currentLead?.website) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 flex-shrink-0 overflow-hidden">
                  {currentLead?.display_pic_url && 
                   typeof currentLead.display_pic_url === 'string' && 
                   currentLead.display_pic_url.trim() !== '' && 
                   !imageError ? (
                    <img
                      src={currentLead.display_pic_url}
                      alt={`${getLeadName(currentLead) || "Lead"} profile`}
                      className="h-8 w-8 rounded-full object-cover"
                      onError={() => {
                        setImageError(true);
                      }}
                      onLoad={() => {
                        setImageError(false);
                      }}
                    />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{getLeadName(currentLead) || "Lead Profile"}</h3>
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