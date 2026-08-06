/** Presentational JSX for the ticket carousel. */

import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { convertGMTtoIST } from "@/lib/utils/timeUtils";
import { Badge } from "@/components/ui/badge";
import { FaWhatsapp } from "react-icons/fa";
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
  RefreshCw,
  Play,
  Pause,
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
import { PendingTicketsCard } from "@/components/ui/PendingTicketsCard";
import { SupportTicketTaskProgress } from "@/components/page-builder/SupportTicketTaskProgress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WhatsAppTemplateModal } from "../WhatsAppTemplateModal";

import type { TicketCarouselModel } from "./useTicketCarousel";
import {
  OTHER_REASONS_OPTIONS,
  formatPhoneNumber,
  getPhoneDialLink,
  formatPosterStatus,
  getSupportTicketType,
  getHasGivenReferral,
  getJatraLink,
  getWhatsappLink,
  getParsedUserInput,
  resolveTicketRecordId,
} from "./utils";

function UserInputDisplay({
  values,
  audioUrl,
}: {
  values: string[];
  audioUrl: string | null;
}) {
  if (!values.length && !audioUrl) return null;

  return (
    <div className="mt-2 space-y-2">
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value, index) => (
            <Badge
              key={`${value}-${index}`}
              variant="secondary"
              className="text-xs font-medium"
            >
              {value}
            </Badge>
          ))}
        </div>
      ) : null}
      {audioUrl ? <UserInputAudioPlayer url={audioUrl} /> : null}
    </div>
  );
}

function UserInputAudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setPlaying(true);
      setLoading(false);
    };
    const handlePause = () => setPlaying(false);
    const handleEnded = () => setPlaying(false);
    const handleWaiting = () => setLoading(true);
    const handleCanPlay = () => setLoading(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [url]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (playing) {
        audio.pause();
      } else {
        setLoading(true);
        await audio.play();
      }
    } catch {
      setLoading(false);
      setPlaying(false);
      toast.error("Unable to play audio");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={url} preload="metadata" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-lg border-violet-200 bg-white px-3 text-violet-700 hover:bg-violet-100"
        onClick={() => void togglePlayback()}
        disabled={loading && !playing}
      >
        {loading && !playing ? (
          <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : playing ? (
          <Pause className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <Play className="mr-1.5 h-3.5 w-3.5" />
        )}
        {playing ? "Pause" : "Play"} voice message
      </Button>
    </div>
  );
}

export function TicketCarouselView(props: TicketCarouselModel) {
  const {
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
    fetchFirstTicket
  } = props;

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

  const isCompact = !!initialTicket && !isInModal;
  const supportTicketType = getSupportTicketType(currentTicket);
  const posterInfo = supportTicketType ? formatPosterStatus(supportTicketType) : null;
  const hasGivenReferral = getHasGivenReferral(currentTicket);
  const displayTicketId =
    currentTicket?.record_id ||
    currentTicket?.support_ticket_id ||
    currentTicket?.id;
  const jatraLink = getJatraLink(currentTicket);
  const primaryPhone = currentTicket?.phone || "";
  const ticketWhatsappLink = getWhatsappLink(currentTicket);
  const parsedUserInput = getParsedUserInput(currentTicket);
  const formattedPhoneNumber = formatPhoneNumber(primaryPhone);

  const openJatraLink = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (jatraLink) {
      window.open(jatraLink, "_blank", "noopener,noreferrer");
    }
  };

  const ticketMetadata = (
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
      {hasGivenReferral !== null && (
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Given Referral:</span>
          <span className="font-medium text-slate-800">
            {hasGivenReferral ? "Yes" : "No"}
          </span>
        </div>
      )}
    </div>
  );

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
        <p
          className={cn(
            "truncate text-xl font-semibold text-slate-900",
            jatraLink && "group-hover:text-blue-600 group-hover:underline"
          )}
        >
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
      {!isCompact ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {ticketMetadata}
          <CustomButton
            onClick={handleTakeBreak}
            variant="outline"
            size="sm"
            icon={<Coffee className="h-4 w-4" />}
            disabled={updating || takingBreak}
            loading={takingBreak}
            className="rounded-xl border-slate-200 bg-white px-4 py-2 shadow-sm"
          >
            {takingBreak ? "Taking break..." : "Take a Break"}
          </CustomButton>
        </div>
      ) : (
        hasGivenReferral !== null ||
        (currentTicket?.badge && currentTicket.badge !== "N/A") ||
        (currentTicket?.subscription_status &&
          currentTicket.subscription_status !== "N/A")
      ) ? (
        ticketMetadata
      ) : null}

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
          {takingBreak && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                <p className="text-sm text-muted-foreground">Taking a break...</p>
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="relative z-0 min-w-0 flex-1">
              {jatraLink ? (
                <a
                  href={jatraLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={openJatraLink}
                  className="group relative z-0 block cursor-pointer rounded-lg transition-opacity hover:opacity-90"
                >
                  {userProfile}
                </a>
              ) : (
                userProfile
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <CustomButton
                type="button"
                variant="outline"
                icon={
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 text-[#344054]",
                      refreshingTicket && "animate-spin"
                    )}
                  />
                }
                className="rounded-xl border-[#D0D5DD] bg-[#F2F4F7] px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#E4E7EC]"
                onClick={() => {
                  const ticketId = resolveTicketRecordId(currentTicket);
                  if (ticketId == null) return;
                  setRefreshingTicket(true);
                  void fetchFreshTicketForCard(ticketId).finally(() => {
                    setRefreshingTicket(false);
                  });
                }}
                disabled={
                  refreshingTicket ||
                  updating ||
                  fetchingNext ||
                  resolveTicketRecordId(currentTicket) == null
                }
              >
                Refresh
              </CustomButton>
              <CustomButton
                type="button"
                variant="outline"
                icon={<FaWhatsapp className="h-4 w-4 text-[#344054]" />}
                className="rounded-xl border-[#D0D5DD] bg-[#F2F4F7] px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#E4E7EC]"
                onClick={() => handleWhatsAppTicket(primaryPhone, ticketWhatsappLink)}
                disabled={!primaryPhone || updating || fetchingNext}
              >
                WhatsApp
              </CustomButton>
              <CustomButton
                type="button"
                icon={<Phone className="h-4 w-4" />}
                className="rounded-xl bg-[#1D2939] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#111827]"
                onClick={() => handleCallTicket(primaryPhone)}
                disabled={!primaryPhone || updating || fetchingNext}
              >
                {formattedPhoneNumber || "N/A"}
              </CustomButton>
            </div>
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
                    {parsedUserInput ? (
                      <UserInputDisplay
                        values={parsedUserInput.values}
                        audioUrl={parsedUserInput.audioUrl}
                      />
                    ) : null}
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
  <PopoverContent
    // Always portal so the list isn't clipped by modal overflow:hidden.
    className={cn(
      "flex w-80 flex-col overflow-hidden p-4",
      isInModal && "z-[100]"
    )}
    align="start"
    collisionPadding={16}
    onWheel={(event) => event.stopPropagation()}
    onTouchMove={(event) => event.stopPropagation()}
  >
    <div className="flex min-h-0 flex-col space-y-3">
      <h4 className="shrink-0 font-medium">Select Other Reasons</h4>
      <div
        className="max-h-56 overflow-y-auto overflow-x-hidden space-y-2 overscroll-contain"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
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
                      {ticket.selectedOtherReasons.map((reason: string) => (
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
            disabled={updating || takingBreak}
            loading={takingBreak}
          >
            {takingBreak ? "Taking break..." : "Take a Break"}
          </CustomButton>
        </div>
      )}

      <WhatsAppTemplateModal
        open={showWhatsAppModal}
        onOpenChange={setShowWhatsAppModal}
        phone={whatsappPhone}
        whatsappLink={whatsappLink}
        apiEndpoint={config?.whatsappTemplatesApiEndpoint}
        apiPrefix={config?.apiPrefix || "renderer"}
        onSelectTemplate={handleTemplateSelected}
      />
    </div>
  );
}
