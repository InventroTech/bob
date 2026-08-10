/** State, effects, and handlers for the lead card carousel. */

import React, { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSpoofUserId } from "@/lib/auth/spoof";
import { groupsApi } from '@/lib/api/services/userSettings';
import { crmLeadsApi } from '@/lib/api/services/crmLeads';
import { useRecordUpdated } from "@/hooks/useRecordUpdated";
import type {
  LeadCardCarouselHandle,
  LeadCardCarouselProps,
  LeadData,
  LeadState,
  LeadTask,
  TaskStep,
} from "./types";
import {
  formatRecallAtLabel,
  parseTags,
  normalizeApiLeadToLeadData,
  persistActionButtonsState,
  restoreActionButtonsState,
  getTodayDateString,
  shouldResetFetchedCount,
  getPhoneForDial,
  normalizePhoneForLinks,
} from "./utils";

export function useLeadCardCarousel(
  {
    config,
    initialLead,
    onLeadUpdate,
    isInModal = false,
    hideActionBar = false,
    onActionButtonsVisibilityChange,
    onCallBackModalChange,
    onActionComplete,
  }: LeadCardCarouselProps,
  ref: React.ForwardedRef<LeadCardCarouselHandle>,
) {

    const { toast } = useToast();
    const { user: authUser, session } = useAuth();
    const spoofUserId = useSpoofUserId();
    const activeUserId = spoofUserId ?? authUser?.id ?? null;

    const [currentLead, setCurrentLead] = useState<LeadData | null>(initialLead || null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [fetchingNext, setFetchingNext] = useState(false);
    const [refreshingLead, setRefreshingLead] = useState(false);
    const [showPendingCard, setShowPendingCard] = useState(true);
    const [hasCheckedForLeads, setHasCheckedForLeads] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // ✅ Add these two state variables here
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [tooltipOpen, setTooltipOpen] = useState(false);

    /** Idle “pending leads” dashboard: recall queue + today’s activity */
    const [pendingDash, setPendingDash] = useState<{
      notConnected: { name: string; nextCallLabel: string } | null;
      snoozed: { name: string; nextCallLabel: string } | null;
      trialAcceptedToday: number;
      notInterestedToday: number;
      loading: boolean;
    }>({
      notConnected: null,
      snoozed: null,
      trialAcceptedToday: 0,
      notInterestedToday: 0,
      loading: true,
    });

    const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false);
    const [showCallBackDialog, setShowCallBackDialog] = useState(false);


    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsappPhone, setWhatsappPhone] = useState<string>("");
    const [whatsappLink, setWhatsappLink] = useState<string | undefined>(undefined);
    
    const [lead, setLead] = useState<LeadState>({
      leadStatus: "New",
      notes: "",
      selectedTags: [],
      nextFollowUp: "",
      leadStartTime: new Date(),
    });
    
    const [actionButtonsVisible, setActionButtonsVisible] = useState(false);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [dailyLimit, setDailyLimit] = useState<number | null>(null);
    const [dailyLimitLoaded, setDailyLimitLoaded] = useState(false);
    const [fetchedLeadsCount, setFetchedLeadsCount] = useState<number>(0);
    
    /** RM's assigned group — same fresh pool as Lead Source Group List */
    const [assignedGroupId, setAssignedGroupId] = useState<number | null>(null);
    const [groupFreshLeads, setGroupFreshLeads] = useState<{
      name: string;
      count: number | null;
      loaded: boolean;
    }>({
      name: "",
      count: null,
      loaded: false,
    });
    
    const isInitialized = useRef(false);
    
    // Ensure modals are closed when component mounts or when in modal mode
    useEffect(() => {
      if (isInModal) {
        setShowCallBackDialog(false);
        setShowNotInterestedDialog(false);
        setShowProfileModal(false);
      }
    }, [isInModal]);
    
    // Detect touch devices
    useEffect(() => {
      const touch =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
    
      setIsTouchDevice(touch);
    }, []);
    
    // Sync actionButtonsVisible to parent when it changes (for modal mode)
    useEffect(() => {
      if (onActionButtonsVisibilityChange) {
        onActionButtonsVisibilityChange(actionButtonsVisible);
      }
    }, [actionButtonsVisible, onActionButtonsVisibilityChange]);
  // Store latest handlers in ref so useImperativeHandle always calls current versions
  const handlersRef = useRef<{
    handleActionButton: (action: "Trial Activated" | "Not Interested" | "Call Not Connected" | "Call Back Later", extra?: any) => Promise<any>;
    handleNotInterestedClick: () => void;
    handleOpenCallBackDialog: () => void;
  } | null>(null);



  // Fetch fresh lead by ID and update card (uses existing backend GET /crm-records/records/:id/)
  const fetchFreshLeadForCard = useCallback(async (leadId: number) => {
    try {
      const fresh = await crmLeadsApi.getLeadById(leadId);
      if (!fresh) return;
      const normalized = normalizeApiLeadToLeadData(fresh);
      setCurrentLead(normalized);
      setLead(prev => ({
        ...prev,
        leadStatus: normalized.status || normalized.lead_stage || "New",
        notes: normalized.notes || normalized.data?.notes || normalized.latest_remarks || "",
        selectedTags: parseTags(normalized.tags || []),
        nextFollowUp: normalized.next_follow_up || normalized.data?.next_follow_up || normalized.data?.next_call_at || "",
        leadStartTime: new Date(),
      }));
      if (onLeadUpdate) onLeadUpdate(normalized);
    } catch (err) {
      console.warn("[LeadCardCarousel] Failed to fetch fresh lead by ID:", err);
    }
  }, [onLeadUpdate]);

  // Track last lead id we fetched for (avoid re-fetching when parent re-renders with new initialLead object ref)
  const lastFetchedLeadIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!initialLead) lastFetchedLeadIdRef.current = null;
  }, [initialLead]);

  // Handle initialLead prop — only when the lead *id* changes.
  // Parent tables pass a new object ref on every list refresh; resetting from that
  // would wipe Task Progress updates applied via WebSocket / fetchFreshLeadForCard.
  useEffect(() => {
    if (!initialLead) return;
    const leadId = initialLead.id != null ? Number(initialLead.id) : NaN;
    const isNewLead = !Number.isNaN(leadId) && lastFetchedLeadIdRef.current !== leadId;
    if (!isNewLead) return;

    setCurrentLead(initialLead);
    setShowPendingCard(false);
    if (isInModal) {
      setActionButtonsVisible(true);
    } else {
      setActionButtonsVisible(false);
    }
    setShowNotInterestedDialog(false);
    setShowCallBackDialog(false);
    setShowProfileModal(false);
    setLead({
      leadStatus: initialLead.status || initialLead.lead_stage || "New",
      notes: initialLead.notes || initialLead.data?.notes || initialLead.latest_remarks || "",
      selectedTags: parseTags(initialLead.tags || []),
      nextFollowUp: initialLead.next_follow_up || initialLead.data?.next_follow_up || initialLead.data?.next_call_at || "",
      leadStartTime: new Date(),
    });
    isInitialized.current = true;

    lastFetchedLeadIdRef.current = leadId;
    fetchFreshLeadForCard(leadId);
  }, [initialLead, isInModal, fetchFreshLeadForCard]);

  // Call onLeadUpdate when currentLead changes (if callback provided)
  // Only call when currentLead.id actually changes to prevent infinite loops
  const prevLeadIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (onLeadUpdate && currentLead?.id && currentLead.id !== prevLeadIdRef.current) {
      prevLeadIdRef.current = currentLead.id;
      onLeadUpdate(currentLead);
    }
  }, [currentLead?.id, onLeadUpdate]);





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


  // Load daily fresh-lead cap + assigned group summary for the current user
  const fetchDailyLimit = useCallback(async () => {
    if (session) {
      setDailyLimitLoaded(false);
      setGroupFreshLeads((prev) => ({ ...prev, loaded: false }));
    }
    try {
      if (!session || !activeUserId) {
        setDailyLimit(null);
        setAssignedGroupId(null);
        setGroupFreshLeads({ name: "", count: null, loaded: true });
        return;
      }

      const summary = await groupsApi.getMyLeadGroupSummary();
      setDailyLimit(
        typeof summary.daily_limit === "number" ? summary.daily_limit : null,
      );
      setAssignedGroupId(
        typeof summary.group_id === "number" ? summary.group_id : null,
      );
      setGroupFreshLeads({
        name: summary.group_name || "",
        count:
          typeof summary.fresh_leads_count === "number"
            ? summary.fresh_leads_count
            : null,
        loaded: true,
      });
    } catch (error) {
      console.error('[LeadCardCarousel] Error fetching lead group summary:', error);
      setDailyLimit(null);
      setAssignedGroupId(null);
      setGroupFreshLeads({ name: "", count: null, loaded: true });
    } finally {
      setDailyLimitLoaded(true);
    }
  }, [session, activeUserId]);

  useEffect(() => {
    void fetchDailyLimit();
  }, [fetchDailyLimit]);

  // Fetch current assigned lead from API
  const fetchCurrentLead = async () => {
    try {
      return await crmLeadsApi.getCurrentLead();
    } catch (error) {
      console.error("Error fetching current lead:", error);
      return null;
    }
  };

  const refreshGroupFreshLeads = useCallback(async () => {
    try {
      const summary = await groupsApi.getMyLeadGroupSummary();
      setDailyLimit(
        typeof summary.daily_limit === "number" ? summary.daily_limit : null,
      );
      setAssignedGroupId(
        typeof summary.group_id === "number" ? summary.group_id : null,
      );
      setGroupFreshLeads({
        name: summary.group_name || "",
        count:
          typeof summary.fresh_leads_count === "number"
            ? summary.fresh_leads_count
            : null,
        loaded: true,
      });
      setDailyLimitLoaded(true);
    } catch (error) {
      console.error("[LeadCardCarousel] Error loading group fresh leads:", error);
      setGroupFreshLeads({ name: "", count: null, loaded: true });
    }
  }, []);

  const refreshPendingDashboard = useCallback(async () => {
    if (!session) return;
    if (!activeUserId) return;

    setPendingDash((prev) => ({ ...prev, loading: true }));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dateFrom = todayStart.toISOString();
    const dateTo = tomorrowStart.toISOString();

    try {
      const [nc, sz, trials, notInterested] = await Promise.all([
        crmLeadsApi.getRecallPreviewForAssignee(activeUserId, 'CALL_NOT_CONNECTED'),
        crmLeadsApi.getRecallPreviewForAssignee(activeUserId, 'SNOOZED'),
        crmLeadsApi.getTrialActivationCount(activeUserId, dateFrom, dateTo),
        crmLeadsApi.getLeadEventCount(activeUserId, 'lead.not_interested', dateFrom, dateTo),
        refreshGroupFreshLeads(),
      ]);

      setPendingDash({
        notConnected: nc
          ? { name: nc.name, nextCallLabel: formatRecallAtLabel(nc.nextCallAtIso) }
          : null,
        snoozed: sz
          ? { name: sz.name, nextCallLabel: formatRecallAtLabel(sz.nextCallAtIso) }
          : null,
        trialAcceptedToday: trials,
        notInterestedToday: notInterested,
        loading: false,
      });
    } catch (error) {
      console.error('[LeadCardCarousel] Error loading pending dashboard:', error);
      setPendingDash({
        notConnected: null,
        snoozed: null,
        trialAcceptedToday: 0,
        notInterestedToday: 0,
        loading: false,
      });
    }
  }, [session, activeUserId, refreshGroupFreshLeads]);





  const handleCallLead = (phone?: string) => {
    const forDial = getPhoneForDial(phone);
    if (!forDial) return;
    setActionButtonsVisible(true);
    persistActionButtonsState(currentLead?.id, true);
    window.open(`tel:${forDial}`);
  };

  const handleWhatsAppLead = (phone?: string, link?: string) => {
    // Open modal instead of directly opening WhatsApp
    setWhatsappPhone(phone || "");
    setWhatsappLink(link);
    setShowWhatsAppModal(true);
  };

  const handleTemplateSelected = (templateText: string | null) => {
    let whatsappUrl: string;
    
    if (whatsappLink) {
      // If there's a direct WhatsApp link, append template text if provided
      if (templateText) {
        const separator = whatsappLink.includes('?') ? '&' : '?';
        whatsappUrl = `${whatsappLink}${separator}text=${encodeURIComponent(templateText)}`;
      } else {
        whatsappUrl = whatsappLink;
      }
    } else {
      const clean = normalizePhoneForLinks(whatsappPhone);
      if (!clean) {
        toast({
          title: "Error",
          description: "Invalid phone number",
          variant: "destructive",
        });
        return;
      }
      
      // Open WhatsApp with template text or without
      if (templateText) {
        whatsappUrl = `https://wa.me/${clean}?text=${encodeURIComponent(templateText)}`;
      } else {
        whatsappUrl = `https://wa.me/${clean}`;
      }
    }
    
    // Create a temporary anchor element and click it - works better with popup blockers
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      }
      // Don't set any task as current if all tasks are completed
    }

    return normalised.map(step => ({
      id: step.id,
      label: step.label,
      description: step.description,
      status: step.status,
    }));
  }, [leadTasks]);



  // Fetching the next lead from API
  const fetchFirstLead = async () => {
    try {
      setLoading(true);

      // Use configured endpoint or fallback to default
      const endpoint = config?.apiEndpoint || "/api/leads";
      const leadData = await crmLeadsApi.getNextLead(endpoint);

      // API function returns null if no lead is available
      if (!leadData) {
        setHasCheckedForLeads(true);
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
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
      // For pending leads page: buttons should only show after user makes a call
      // Don't restore from sessionStorage - start fresh with buttons hidden
      setActionButtonsVisible(false);
      setProcessingAction(null);
      setLead(prev => ({
        ...prev,
        leadStatus: leadData.status || "New",
        notes: (leadData?.data?.notes as string) || leadData?.notes || "",
        selectedTags: parseTags(leadData?.tags || []),
        nextFollowUp: leadData.next_follow_up || "",
        leadStartTime: new Date(),
      }));

      // Increment fetched leads count (only if daily limit is configured)
      if (dailyLimit !== null) {
        incrementFetchedCount();
      }

      // Note: Both Mixpanel services are called from backend when new lead is assigned
      // No need to call from frontend

      isInitialized.current = true;
      
    } catch (error: any) {
      console.error("Error fetching lead:", error);
      
      // Handle 404 as "no leads available" instead of error
      if (error.message?.includes('404') || error.message?.includes('HTTP error! status: 404')) {
        setHasCheckedForLeads(true);
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
        toast({
          title: "Info",
          description: "No leads available at the moment.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load lead. Please try again.",
          variant: "destructive",
        });
        setShowPendingCard(true);
        setCurrentLead(null);
        resetLeadState();
        isInitialized.current = false;
      }
    } finally {
      setLoading(false);
    }
  };

  const resetLeadState = () => {
    setLead({
      leadStatus: "New",
      notes: "",
      selectedTags: [],
      nextFollowUp: "",
      leadStartTime: new Date(),
    });
    setActionButtonsVisible(false);
    persistActionButtonsState(undefined, false);
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
      const recordId = Number(currentLead.id);
      console.log('[sendLeadEvent] Starting, recordId:', recordId, 'eventName:', eventName);
      if (!Number.isInteger(recordId)) {
        console.error('[sendLeadEvent] Invalid recordId:', recordId);
        toast({ title: "Error", description: "Invalid lead id", variant: "destructive" });
        return false;
      }
      console.log('[sendLeadEvent] Calling API with:', { eventName, recordId, payload });
      try {
        const posted = await crmLeadsApi.sendLeadEvent(eventName, recordId, payload);
        if (!posted) {
          console.warn('[sendLeadEvent] Event not posted (session expired or no permission)');
          toast({
            title: 'Action not saved',
            description: 'Your session may have expired. Refresh the page or sign in again, then retry.',
            variant: 'default',
          });
          return false;
        }
        console.log('[sendLeadEvent] API call successful');
      } catch (apiError: unknown) {
        console.error('[sendLeadEvent] API call failed:', apiError);
        throw apiError;
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
    console.log('[handleActionButton] Called with action:', action, 'currentLead:', currentLead?.id, 'initialLead:', !!initialLead);
    if (!currentLead?.id) {
      console.error('[handleActionButton] No currentLead.id');
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

    const actingUserId = activeUserId || currentLead.praja_id;
    const payload: Record<string, any> = {
      notes: lead.notes || "",
      remarks: currentLead.latest_remarks,
      lead_id: currentLead.id,
      user_id: actingUserId,
      user_supabase_uid: actingUserId, // Backend filters by this field
      lead_owner_user_id: currentLead.praja_id,
    };

    if (extra?.reason) {
      payload.reason = extra.reason;
    }
    // Set lead_stage to SNOOZED when Call Back Later is triggered (always, regardless of nextCallAt)
    if (action === "Call Back Later") {
      payload.lead_stage = "SNOOZED";
    }
    if (extra?.nextCallAt) {
      payload.next_call_at = extra.nextCallAt;
    }
    // Call Back Later: always send current user for assignment; backend rules assign for sales lead only, not self trial
    if (action === "Call Back Later") {
      payload.assigned_to = actingUserId;
    }

    setProcessingAction(action);
    try {
      console.log('[handleActionButton] Calling sendLeadEvent with:', { event, recordId: currentLead.id, payload });
      const ok = await sendLeadEvent(
        event,
        payload,
        { successTitle: "Success", successDescription: success }
      );
      console.log('[handleActionButton] sendLeadEvent returned:', ok);

      if (ok) {
        console.log('[handleActionButton] Event sent successfully, updating state. initialLead:', !!initialLead);
        if (action === "Trial Activated") {
          window.dispatchEvent(new CustomEvent('trial-activated', { 
            detail: { leadId: currentLead.id } 
          }));
        }
        // Same as pending leads page: update state and move on (no extra API)
        if (initialLead && currentLead?.id) {
          // Derive new stage from action (same as backend would set) and update local state + parent
          const stageByAction: Record<typeof action, string> = {
            "Trial Activated": "TRIAL_ACTIVATED",
            "Not Interested": "NOT_INTERESTED",
            "Call Not Connected": "CALL_NOT_CONNECTED",
            "Call Back Later": "SNOOZED",
          };
          const newStage = stageByAction[action];
          const updatedLead = {
            ...currentLead,
            status: newStage,
            lead_stage: newStage,
            data: { ...(currentLead.data || {}), lead_stage: newStage },
          };
          setCurrentLead(updatedLead);
          setLead(prev => ({ ...prev, leadStatus: newStage }));
          if (onLeadUpdate) onLeadUpdate(updatedLead);
          // Close modal after successful action when opened from table; pass lead id and action so parent can remove from list only when not "Call Back Later"
          if (isInModal && onActionComplete && currentLead?.id != null) {
            onActionComplete(currentLead.id, action);
          }
        } else {
          persistActionButtonsState(undefined, false);
          // Do not auto-fetch next lead after an outcome.
          // User must click "Get Leads" manually for the next lead.
          setShowPendingCard(true);
          setCurrentLead(null);
          resetLeadState();
          isInitialized.current = false;
        }
      }

      return ok;
    } catch (error: unknown) {
      console.error('[handleActionButton] Error caught:', error);
      // Ensure processingAction is cleared even on error
      setProcessingAction(null);
      throw error;
    } finally {
      console.log('[handleActionButton] Finally block - clearing processingAction');
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
    return (await handleActionButton("Not Interested", { reason })) ?? false;
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
    console.log('[LeadCardCarousel] handleOpenCallBackDialog called - opening CallBackModal');
    setShowCallBackDialog(true);
  };

  const handleSubmitCallBackLater = async (nextCallAt: string): Promise<boolean> => {
    // Time is optional: with time → 48h unassign; without → 12h unassign (backend rule engine)
    const result = await handleActionButton("Call Back Later", { nextCallAt: nextCallAt || "" });
    // Note: onActionComplete will be called from handleActionButton if successful
    return result ?? false;
  };

  // Update handlers ref on every render to always have latest versions
  handlersRef.current = {
    handleActionButton,
    handleNotInterestedClick,
    handleOpenCallBackDialog,
  };

  // Expose handlers via ref - use handlersRef to always call latest versions
  useImperativeHandle(ref, () => ({
    handleTrialActivated: () => {
      console.log('[LeadCardCarousel] handleTrialActivated called via ref, currentLead:', currentLead?.id, 'handlersRef:', !!handlersRef.current);
      if (handlersRef.current?.handleActionButton) {
        console.log('[LeadCardCarousel] Calling handleActionButton from handlersRef');
        void handlersRef.current.handleActionButton("Trial Activated");
      } else {
        console.error('[LeadCardCarousel] handleActionButton not available in handlersRef');
      }
    },
    handleNotInterestedClick: () => {
      console.log('[LeadCardCarousel] handleNotInterestedClick called via ref');
      handlersRef.current?.handleNotInterestedClick();
    },
    handleCallNotConnected: () => {
      console.log('[LeadCardCarousel] handleCallNotConnected called via ref');
      if (handlersRef.current?.handleActionButton) {
        void handlersRef.current.handleActionButton("Call Not Connected");
      }
    },
    handleCallBackLaterClick: () => {
      console.log('[LeadCardCarousel] handleCallBackLaterClick called via ref');
      handlersRef.current?.handleOpenCallBackDialog();
    },
    updating,
    currentLead,
    actionButtonsVisible,
  }), [updating, currentLead, actionButtonsVisible]);

  // Initialize component - fetch current lead on refresh (skip if initialLead is provided)
  // Use initialLead?.id so we don't re-run when parent re-renders with new object ref (same lead)
  const initialLeadId = initialLead?.id != null ? Number(initialLead.id) : null;
  useEffect(() => {
    const initializeComponent = async () => {
      // If initialLead is provided, skip auto-initialization (daily limit loads via session effect)
      if (initialLead) {
        return;
      }

      // Initialize fetched leads count from localStorage
      const persistedCount = getPersistedFetchedCount();
      setFetchedLeadsCount(persistedCount);
      
      // Fetch current assigned lead from API on refresh
      const currentLead = await fetchCurrentLead();
      
      if (currentLead) {
        // Display the current lead immediately
        setCurrentLead(currentLead);
        setShowPendingCard(false);
        setHasCheckedForLeads(true);
        // Restore actionButtonsVisible state only if user had already made a call on this lead
        // (stored in sessionStorage from previous interaction)
        const shouldShowButtons = restoreActionButtonsState(currentLead?.id);
        setActionButtonsVisible(shouldShowButtons);
        setLead(prev => ({
          ...prev,
          leadStatus: currentLead.status || "New",
          notes: (currentLead?.data?.notes as string) || currentLead?.notes || "",
          selectedTags: parseTags(currentLead?.tags || []),
          nextFollowUp: currentLead.next_follow_up || "",
          leadStartTime: new Date(),
        }));
        isInitialized.current = true;
      } else {
        // No lead assigned, show pending card
        setShowPendingCard(true);
        setCurrentLead(null);
        setHasCheckedForLeads(true);
      }
    };
    
    initializeComponent();
  }, [initialLeadId]);

  // Handle "Get Leads" button click - fetch current lead first, then next if none
  const handleGetLeads = async () => {
    try {
      setLoading(true);
      
      // First try to get current assigned lead
      const currentLead = await fetchCurrentLead();
      
      if (currentLead) {
        // Display the current assigned lead (already assigned, no need to send event)
        setCurrentLead(currentLead);
        setShowPendingCard(false);
        setHasCheckedForLeads(true);
        // Restore actionButtonsVisible state if this is the same lead that had buttons visible
        const shouldShowButtons = restoreActionButtonsState(currentLead?.id);
        setActionButtonsVisible(shouldShowButtons);
        setLead(prev => ({
          ...prev,
          leadStatus: currentLead.status || "New",
          notes: (currentLead?.data?.notes as string) || currentLead?.notes || "",
          selectedTags: parseTags(currentLead?.tags || []),
          nextFollowUp: currentLead.next_follow_up || "",
          leadStartTime: new Date(),
        }));
        isInitialized.current = true;
        setLoading(false);
        return;
      }
      
      // No current lead, fetch next lead
      await fetchFirstLead();
    } catch (error) {
      console.error("Error getting leads:", error);
      toast({
        title: "Error",
        description: "Failed to load lead. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

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

  // Load recall queue + today’s stats while the idle “pending fresh leads” card is visible
  useEffect(() => {
    if (!showPendingCard || !session) return;
    void refreshPendingDashboard();
    const interval = window.setInterval(() => void refreshPendingDashboard(), 120_000);
    return () => clearInterval(interval);
  }, [showPendingCard, session, refreshPendingDashboard]);

  useRecordUpdated(
    useCallback(
      (payload) => {
        const recordId = Number(payload.record_id);
        const currentId =
          currentLead?.id != null ? Number(currentLead.id) : Number.NaN;
        if (!Number.isNaN(recordId) && recordId === currentId) {
          // Instant Task Progress update from WS payload (full HTTP refresh follows).
          const data = payload.data;
          if (data && typeof data === 'object' && 'tasks' in data && data.tasks !== undefined) {
            setCurrentLead((prev) => {
              if (!prev) return prev;
              const prevId = prev.id != null ? Number(prev.id) : Number.NaN;
              if (prevId !== recordId) return prev;
              const tasks = (data as Record<string, unknown>).tasks;
              const prevData =
                prev.data && typeof prev.data === 'object'
                  ? (prev.data as Record<string, unknown>)
                  : {};
              const nextData = { ...prevData, ...data, tasks };
              const stage =
                payload.lead_stage != null && String(payload.lead_stage).trim()
                  ? String(payload.lead_stage)
                  : undefined;
              return {
                ...prev,
                ...(stage ? { lead_stage: stage, status: stage } : {}),
                tasks,
                data: nextData,
                reject_reason:
                  (data as Record<string, unknown>).reject_reason ??
                  (prev as { reject_reason?: unknown }).reject_reason ??
                  prevData.reject_reason,
              } as typeof prev;
            });
          }
          void fetchFreshLeadForCard(recordId);
          return;
        }
        if (showPendingCard) {
          void refreshPendingDashboard();
        }
      },
      [currentLead?.id, showPendingCard, fetchFreshLeadForCard, refreshPendingDashboard],
    ),
    { entityType: "lead" },
  );


  return {
    config,
    isInModal,
    hideActionBar,
    showPendingCard,
    loading,
    updating,
    fetchingNext,
    refreshingLead,
    currentLead,
    lead,
    actionButtonsVisible,
    processingAction,
    imageError,
    setImageError,
    dailyLimit,
    dailyLimitLoaded,
    fetchedLeadsCount,
    assignedGroupId,
    groupFreshLeads,
    pendingDash,
    showNotInterestedDialog,
    setShowNotInterestedDialog,
    showCallBackDialog,
    setShowCallBackDialog,
    showWhatsAppModal,
    setShowWhatsAppModal,
    whatsappPhone,
    whatsappLink,
    showProfileModal,
    isTouchDevice,
    tooltipOpen,
    setTooltipOpen,
    primaryPhone,
    taskSteps,
    handleCallLead,
    handleWhatsAppLead,
    handleTemplateSelected,
    handleActionButton,
    handleNotInterestedClick,
    handleSubmitNotInterested,
    handleCloseProfile,
    handleOpenProfile,
    handleOpenCallBackDialog,
    handleSubmitCallBackLater,
    handleGetLeads,
    refreshPendingDashboard,
    onCallBackModalChange,
    setRefreshingLead,
    fetchFreshLeadForCard,
  };

}

export type LeadCardCarouselModel = ReturnType<typeof useLeadCardCarousel>;
