/** State, effects, and handlers for the ticket carousel. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRecordUpdated } from "@/hooks/useRecordUpdated";
import { apiClient } from "@/lib/api";
import {
  formatTicketSaveErrorMessage,
  isExpectedTicketRecordNotFound,
  isExpectedTicketSaveError,
  isStaleTicketSaveError,
} from "@/lib/api/errors";

import type { TicketStats } from "@/components/ui/PendingTicketsCard";
import type { TicketCarouselProps } from "./types";
import {
  OTHER_REASONS_OPTIONS,
  OTHER_REASONS_ALIASES,
  normalizeOtherReason,
  parseOtherReasons,
  flattenTicketFields,
  enrichTicketWithTaskProgress,
  mergeRefreshedTicket,
  normalizeTicketFromApi,
  extractTicketFromApiResponse,
  resolveTicketRecordId,
  getCleanPhoneNumber,
  getPhoneDialLink,
  getJatraLink,
  getRawUserInput,
} from "./utils";

export function useTicketCarousel({
  config,
  initialTicket,
  onUpdate,
  isInModal = false,
}: TicketCarouselProps) {
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

  const buildTicketFormState = (ticketSource: any): {
    resolutionStatus: "WIP" | "Resolved" | "Can't Resolve" | "Pending";
    callStatus: "Connected" | "Not Connected";
    cseRemarks: string;
    selectedOtherReasons: string[];
  } => ({
    resolutionStatus:
      ticketSource.resolution_status === "Resolved"
        ? "Resolved"
        : ticketSource.resolution_status === "WIP"
        ? "WIP"
        : ticketSource.resolution_status === "Can't Resolve"
        ? "Can't Resolve"
        : "Pending",
    callStatus:
      ticketSource.call_status === "Connected"
        ? "Connected"
        : ticketSource.call_status === "Not Connected"
        ? "Not Connected"
        : "Connected",
    cseRemarks: ticketSource.cse_remarks || "",
    selectedOtherReasons: parseOtherReasons(ticketSource.other_reasons),
  });

  //getting the initial state from the initial ticket
  const getInitialState = () => {
    if (initialTicket) {
      const normalizedTicket = normalizeTicketFromApi(initialTicket);
      return {
        currentTicket: normalizedTicket,
        showPendingCard: false,
        ...buildTicketFormState(initialTicket),
      };
    }

    if (isInModal) {
      return {
        currentTicket: null,
        showPendingCard: true,
        resolutionStatus: "Pending" as const,
        callStatus: "Connected" as const,
        cseRemarks: "",
        selectedOtherReasons: [],
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
        currentTicket: persisted.currentTicket
          ? normalizeTicketFromApi(persisted.currentTicket)
          : null,
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
  const [refreshingTicket, setRefreshingTicket] = useState(false);
  const [takingBreak, setTakingBreak] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState<string>("");
  const [whatsappLink, setWhatsappLink] = useState<string | undefined>(undefined);

  const abandonStaleTicket = useCallback(() => {
    if (isInModal) return;
    clearPersistedState();
    setCurrentTicket(null);
    setShowPendingCard(true);
    setTicket({
      resolutionStatus: "Pending",
      callStatus: "Connected",
      cseRemarks: "",
      selectedOtherReasons: [],
      ticketStartTime: null,
      reviewRequested: false,
    });
  }, [isInModal]);

  const lastFetchedTicketIdRef = React.useRef<number | null>(null);

  const fetchFreshTicketForCard = useCallback(async (ticketId: number) => {
    if (!session?.access_token) return;
    try {
      const response = await apiClient.get(`/crm-records/records/${ticketId}/`);
      const normalized = normalizeTicketFromApi(response.data);
      setCurrentTicket((prev: any) => mergeRefreshedTicket(prev, normalized));
      setShowPendingCard(false);
      setTicket((prev: any) => ({
        ...prev,
        ...buildTicketFormState(normalized),
        ticketStartTime: prev.ticketStartTime ?? new Date(),
        reviewRequested: Boolean(normalized.review_requested),
      }));
    } catch (error) {
      if (!isExpectedTicketRecordNotFound(error)) {
        console.warn("[TicketCarousel] Failed to fetch fresh ticket by ID:", error);
      }
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!initialTicket) {
      lastFetchedTicketIdRef.current = null;
      return;
    }

    const normalizedTicket = normalizeTicketFromApi(initialTicket);
    const ticketId = resolveTicketRecordId(normalizedTicket);
    const isNewTicket =
      ticketId != null && lastFetchedTicketIdRef.current !== ticketId;

    setCurrentTicket(normalizedTicket);
    setShowPendingCard(false);
    setTicket((prev) => ({
      ...prev,
      ...buildTicketFormState(initialTicket),
      ticketStartTime: prev.ticketStartTime ?? new Date(),
      reviewRequested: Boolean(initialTicket.review_requested),
    }));

    if (isInModal && ticketId != null && isNewTicket) {
      lastFetchedTicketIdRef.current = ticketId;
      void fetchFreshTicketForCard(ticketId);
    }
  }, [initialTicket, isInModal, fetchFreshTicketForCard]);

  useEffect(() => {
    if (isInModal || !isInitialized.current) return;
    persistState({
      currentTicket,
      showPendingCard,
      resolutionStatus: ticket.resolutionStatus,
      callStatus: ticket.callStatus,
      cseRemarks: ticket.cseRemarks,
      selectedOtherReasons: ticket.selectedOtherReasons,
    });
  }, [currentTicket, showPendingCard, ticket.resolutionStatus, ticket.callStatus, ticket.cseRemarks, ticket.selectedOtherReasons, isInModal]);

  useEffect(() => {
    if (isInModal || initialTicket || !currentTicket?.id || showPendingCard) return;
    setTicket((prev) => ({
      ...prev,
      ticketStartTime: prev.ticketStartTime ?? new Date(),
    }));
    isInitialized.current = true;
  }, [isInModal, initialTicket, currentTicket?.id, showPendingCard]);

  useEffect(() => {
    const ticketId = resolveTicketRecordId(currentTicket);
    const hasJatra = Boolean(getJatraLink(currentTicket));
    const hasUserInput = Boolean(getRawUserInput(currentTicket));
    if (ticketId == null || (hasJatra && hasUserInput) || !session?.access_token) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await apiClient.get(`/crm-records/records/${ticketId}/`);
        if (cancelled) return;
        const hydrated = normalizeTicketFromApi(response.data);
        const link = getJatraLink(hydrated);
        const userInput = getRawUserInput(hydrated);
        if (!link && !userInput) return;
        setCurrentTicket((prev: any) =>
          resolveTicketRecordId(prev) === ticketId
            ? mergeRefreshedTicket(prev, hydrated)
            : prev
        );
      } catch (error) {
        if (!isInModal && isExpectedTicketRecordNotFound(error)) {
          if (!cancelled) {
            abandonStaleTicket();
          }
          return;
        }
        console.warn("[TicketCarousel] Failed to hydrate ticket fields:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTicket, session?.access_token, abandonStaleTicket, isInModal]);

  // Drop session-persisted ticket if the CRM record no longer exists (prevents repeat 404s).
  useEffect(() => {
    if (isInModal) return;

    const ticketId = resolveTicketRecordId(currentTicket);
    if (ticketId == null || !session?.access_token || showPendingCard) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiClient.get(`/crm-records/records/${ticketId}/`);
      } catch (error) {
        if (!cancelled && isExpectedTicketRecordNotFound(error)) {
          abandonStaleTicket();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, showPendingCard, currentTicket, abandonStaleTicket, isInModal]);

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
  const fetchTicketStats = useCallback(async () => {
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
  }, [session]);

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
    if (isInModal) {
      if (toastMessage) {
        toast.info(toastMessage);
      }
      return;
    }
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
    const normalizedTicket = normalizeTicketFromApi(nextTicket);
    setCurrentTicket(normalizedTicket);
    setTicket({
      resolutionStatus: normalizedTicket.resolution_status === "Resolved"
        ? "Resolved"
        : normalizedTicket.resolution_status === "WIP"
        ? "WIP"
        : normalizedTicket.resolution_status === "Can't Resolve"
        ? "Can't Resolve"
        : "Pending",
      callStatus: normalizedTicket.call_status === "Connected"
        ? "Connected"
        : normalizedTicket.call_status === "Not Connected"
        ? "Not Connected"
        : "Connected",
      cseRemarks: normalizedTicket.cse_remarks || "",
      selectedOtherReasons: parseOtherReasons(normalizedTicket.other_reasons),
      ticketStartTime: new Date(),
      reviewRequested: Boolean(normalizedTicket.review_requested),
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

      const nextTicket = extractTicketFromApiResponse(ticketData);

      if (nextTicket?.id) {
        setTicketFromResponse(nextTicket);
        window.dispatchEvent(new CustomEvent('support-ticket-assigned'));
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
    if (takingBreak) return;
    setTakingBreak(true);
    try {
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      await apiClient.post("/support-ticket/take-break/", {
        ticketId: currentTicket?.id,
      });

      toast.info("Taking a break. Click 'Get Tickets' when ready to continue.");
    } catch (error) {
      console.error("Error taking break:", error);
      toast.error("Error taking break. Please try again.");
    } finally {
      // Always navigate away — backend may have already unassigned the ticket
      setTakingBreak(false);
      setShowPendingCard(true);
      setCurrentTicket(null);
      resetTicketState();
      isInitialized.current = false;
      clearPersistedState();
      void fetchTicketStats();
    }
  };

  //fetching the ticket stats (initially)
  useEffect(() => {
    fetchTicketStats();
  }, [fetchTicketStats]);

  //fetching the ticket stats (interval)
  useEffect(() => {
    if (!showPendingCard) return;
    const interval = setInterval(() => {
      fetchTicketStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [showPendingCard, fetchTicketStats]);

  const fetchCurrentTicket = async () => {
    const ticketId = resolveTicketRecordId(currentTicket);
    if (ticketId == null || !session?.access_token) {
      return null;
    }

    try {
      const response = await apiClient.get(`/crm-records/records/${ticketId}/`);
      return normalizeTicketFromApi(response.data);
    } catch (error) {
      if (isExpectedTicketRecordNotFound(error)) {
        return "NOT_FOUND" as const;
      }
      console.error("Error fetching current ticket:", error);
      return null;
    }
  };

  const handleRealtimeTicketUpdate = useCallback(
    async (payload: { record_id?: string; [key: string]: unknown }) => {
      const recordId = payload.record_id;
      const currentId = resolveTicketRecordId(currentTicket);
      if (currentId != null && String(currentId) === recordId) {
        const refreshed = await fetchCurrentTicket();
        if (refreshed === "NOT_FOUND") {
          if (isInModal) {
            toast.info("This ticket is no longer available.");
          } else {
            abandonStaleTicket();
            toast.info(
              "This ticket is no longer available. Use Get Tickets to load a new one.",
            );
          }
          return;
        }
        if (refreshed) {
          setCurrentTicket((prev: any) => mergeRefreshedTicket(prev, refreshed));
          setTicket((prev: any) => ({
            ...prev,
            resolutionStatus:
              refreshed.resolution_status === "Resolved"
                ? "Resolved"
                : refreshed.resolution_status === "WIP"
                ? "WIP"
                : refreshed.resolution_status === "Can't Resolve"
                ? "Can't Resolve"
                : "Pending",
            callStatus:
              refreshed.call_status === "Connected"
                ? "Connected"
                : refreshed.call_status === "Not Connected"
                ? "Not Connected"
                : prev.callStatus,
            cseRemarks: refreshed.cse_remarks || prev.cseRemarks,
            selectedOtherReasons: parseOtherReasons(refreshed.other_reasons),
            reviewRequested: Boolean(refreshed.review_requested),
          }));
        }
        return;
      }
      if (showPendingCard) {
        void fetchTicketStats();
      }
    },
    [
      currentTicket,
      showPendingCard,
      fetchCurrentTicket,
      abandonStaleTicket,
      isInModal,
      fetchTicketStats,
    ],
  );

  useRecordUpdated(handleRealtimeTicketUpdate, { entityType: "support_ticket" });

  const handleWhatsAppTicket = (phone?: string, link?: string) => {
    setWhatsappPhone(phone || "");
    setWhatsappLink(link);
    setShowWhatsAppModal(true);
  };

  const handleTemplateSelected = (templateText: string | null) => {
    let whatsappUrl: string;

    if (whatsappLink) {
      if (templateText) {
        const separator = whatsappLink.includes("?") ? "&" : "?";
        whatsappUrl = `${whatsappLink}${separator}text=${encodeURIComponent(templateText)}`;
      } else {
        whatsappUrl = whatsappLink;
      }
    } else {
      const clean = getCleanPhoneNumber(whatsappPhone);
      if (!clean) {
        toast.error("Invalid phone number");
        return;
      }

      if (templateText) {
        whatsappUrl = `https://wa.me/${clean}?text=${encodeURIComponent(templateText)}`;
      } else {
        whatsappUrl = `https://wa.me/${clean}`;
      }
    }

    const link = document.createElement("a");
    link.href = whatsappUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCallTicket = (phone?: string) => {
    if (!phone) return;
    const dialLink = getPhoneDialLink(phone);
    if (!dialLink) return;
    window.open(dialLink);
  };

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
        selectedOtherReasons: prev.selectedOtherReasons.filter((r: string) => r !== reason)
      }));
    }
  };

  //handling the action buttons
  const handleActionButton = async (action: "Not Connected" | "Can't Resolve" | "Call Later" | "Resolve") => {
    try {
      const ticketId = resolveTicketRecordId(currentTicket);
      if (ticketId == null) {
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

      if (isInModal && onUpdate) {
        onUpdate(
          normalizeTicketFromApi({
            ...currentTicket,
            resolution_status: resolutionStatus,
            call_status: callStatus,
            cse_remarks: ticket.cseRemarks,
            other_reasons: ticket.selectedOtherReasons,
          })
        );
        return;
      }

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
        await resetToPendingQueue(message);
        return;
      }
      console.error("Error in handleActionButton:", error);
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

      const nextTicket = extractTicketFromApiResponse(ticketData);

      if (nextTicket?.id) {
        setTicketFromResponse(nextTicket);
        window.dispatchEvent(new CustomEvent('support-ticket-assigned'));
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

  return {
    config,
    initialTicket,
    onUpdate,
    isInModal,
    user,
    session,
    isInitialized,
    PERSIST_MAX_AGE_MS,
    getPersistedState,
    persistState,
    clearPersistedState,
    buildTicketFormState,
    getInitialState,
    initialState,
    currentTicket,
    setCurrentTicket,
    showPendingCard,
    setShowPendingCard,
    ticketStats,
    setTicketStats,
    ticket,
    setTicket,
    loading,
    setLoading,
    updating,
    setUpdating,
    fetchingNext,
    setFetchingNext,
    refreshingTicket,
    setRefreshingTicket,
    takingBreak,
    setTakingBreak,
    showWhatsAppModal,
    setShowWhatsAppModal,
    whatsappPhone,
    setWhatsappPhone,
    whatsappLink,
    setWhatsappLink,
    abandonStaleTicket,
    lastFetchedTicketIdRef,
    fetchFreshTicketForCard,
    calculateResolutionTime,
    fetchTicketStats,
    resetTicketState,
    resetToPendingQueue,
    setTicketFromResponse,
    fetchNextTicket,
    handleTakeBreak,
    fetchCurrentTicket,
    handleRealtimeTicketUpdate,
    handleWhatsAppTicket,
    handleTemplateSelected,
    handleCallTicket,
    handleOtherReasonChange,
    handleActionButton,
    fetchFirstTicket,
  };
}

export type TicketCarouselModel = ReturnType<typeof useTicketCarousel>;
