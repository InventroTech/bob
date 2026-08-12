/** Presentational JSX for the lead card carousel. */

import React from "react";
import { useNavigate } from "react-router-dom";
import { CustomButton } from "@/components/ui/CustomButton";
import { FaWhatsapp } from "react-icons/fa";
import {
  User,
  Phone,
  CheckCircle2,
  Check,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  X,
  Target,
  Users,
  RefreshCw,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LeadActionButton } from "../LeadActionButton";
import { NotInterestedModal } from "../NotInterestedModal";
import { CallBackModal } from "../CallBackModal";
import { WhatsAppTemplateModal } from "../WhatsAppTemplateModal";
import type { TaskStep } from "./types";
import { formatRecallAtLabel, formatPhoneForDisplay, getLeadName } from "./utils";
import type { LeadCardCarouselModel } from "./useLeadCardCarousel";

const TaskProgressList: React.FC<{ steps: TaskStep[]; rejectReason?: string }> = ({ steps, rejectReason }) => {
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
            <div className="flex items-center gap-2">
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
              {step.label.toLowerCase().includes('layout feedback') && rejectReason && (
                <span className="text-sm text-red-600 font-medium">
                  ({rejectReason})
                </span>
              )}
            </div>
            {step.description && <p className="text-xs text-slate-400">{step.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};

const LeadInfoTile: React.FC<{
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  onClick?: () => void;
}> = ({ icon: Icon, label, value, onClick }) => {

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

export function LeadCardCarouselView(props: LeadCardCarouselModel & { onClose?: () => void }) {
  const navigate = useNavigate();
  const {
    config,
    isInModal,
    hideActionBar,
    showPendingCard,
    loading,
    updating,
    fetchingNext,
    refreshingLead,
    currentLead,
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
    onClose,
  } = props;

  // Pending card
  if (showPendingCard) {
    const recallSkeleton = (
      <div className="space-y-2 animate-pulse" aria-hidden>
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted/80" />
      </div>
    );

    const freshRemainingToday =
      dailyLimit !== null ? Math.max(0, dailyLimit - fetchedLeadsCount) : null;

    return (
      <div className="mainCard w-full border flex flex-col justify-center items-center gap-2">
        <div className="relative w-full md:w-[90%] lg:w-[70%] h-full">
          <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white shadow-sm p-6 md:p-8">
            <div className="text-center space-y-1 mb-8">
              <h5 className="text-xl font-semibold tracking-tight text-slate-900">
                Pending Fresh Leads
              </h5>
              {config?.title ? (
                <p className="text-sm text-muted-foreground">{config.title}</p>
              ) : null}
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your next callbacks and today&apos;s outcomes at a glance.
              </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              {freshRemainingToday !== null ? (
                <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-cyan-50/80 px-5 py-4 shadow-sm w-full">
                  <div className="flex items-center gap-2 text-sky-900/90">
                    <Target className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Fresh leads remaining today
                    </span>
                  </div>
                  <p className="text-center text-sm text-slate-700 leading-snug">
                    <span className="text-3xl font-bold tabular-nums text-sky-950">
                      {freshRemainingToday}
                    </span>
                    <span className="text-slate-500"> of </span>
                    <span className="text-lg font-semibold tabular-nums text-slate-800">
                      {dailyLimit}
                    </span>
                    <span className="block text-slate-600 mt-1">
                      against your daily limit
                    </span>
                  </p>
                </div>
              ) : dailyLimitLoaded ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-4">
                  <p className="text-center text-xs text-muted-foreground">
                    Daily limit isn&apos;t configured — ask your admin to set{' '}
                    <span className="font-mono">DAILY_LIMIT</span> in core settings.
                  </p>
                </div>
              ) : (
                <div className="h-28 w-full rounded-xl bg-muted/50 animate-pulse" aria-hidden />
              )}

              {!groupFreshLeads.loaded ? (
                <div className="h-28 w-full rounded-xl bg-muted/50 animate-pulse" aria-hidden />
              ) : groupFreshLeads.count !== null ? (
                <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 px-5 py-4 shadow-sm w-full">
                  <div className="flex items-center gap-2 text-emerald-900/90">
                    <Users className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Fresh leads available
                    </span>
                  </div>
                  <p className="text-center text-sm text-slate-700 leading-snug">
                    <span className="text-3xl font-bold tabular-nums text-emerald-950">
                      {groupFreshLeads.count.toLocaleString()}
                    </span>
                    <span className="block text-slate-600 mt-1">
                      {groupFreshLeads.name
                        ? `in ${groupFreshLeads.name}`
                        : "in your lead group"}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-4">
                  <p className="text-center text-xs text-muted-foreground">
                    {assignedGroupId == null && dailyLimitLoaded
                      ? "No lead group assigned — ask your admin to set your group in core settings."
                      : "Fresh leads available count unavailable."}
                  </p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-amber-50/90 to-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-800/90">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Next not connected
                  </span>
                </div>
                {pendingDash.loading ? (
                  recallSkeleton
                ) : pendingDash.notConnected ? (
                  <>
                    <p className="text-base font-medium text-slate-900 leading-snug">
                      {pendingDash.notConnected.name}
                    </p>
                    <p className="flex items-start gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" aria-hidden />
                      <span>
                        Next call at{' '}
                        <span className="font-medium text-slate-800">
                          {pendingDash.notConnected.nextCallLabel}
                        </span>
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No assigned not-connected leads with a queued recall.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-violet-50/90 to-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-violet-900/85">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Next snoozed
                  </span>
                </div>
                {pendingDash.loading ? (
                  recallSkeleton
                ) : pendingDash.snoozed ? (
                  <>
                    <p className="text-base font-medium text-slate-900 leading-snug">
                      {pendingDash.snoozed.name}
                    </p>
                    <p className="flex items-start gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" aria-hidden />
                      <span>
                        Next call at{' '}
                        <span className="font-medium text-slate-800">
                          {pendingDash.snoozed.nextCallLabel}
                        </span>
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No assigned snoozed leads scheduled.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
                Today&apos;s stats
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-white border border-slate-200/80 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    <span className="text-xs font-medium">Trial accepted</span>
                  </div>
                  {pendingDash.loading ? (
                    <div className="h-8 w-12 rounded-md bg-muted animate-pulse mt-1" aria-hidden />
                  ) : (
                    <p className="text-2xl font-semibold tabular-nums text-slate-900">
                      {pendingDash.trialAcceptedToday}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-white border border-slate-200/80 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-700 mb-1">
                    <XCircle className="h-4 w-4" aria-hidden />
                    <span className="text-xs font-medium">Not interested</span>
                  </div>
                  {pendingDash.loading ? (
                    <div className="h-8 w-12 rounded-md bg-muted animate-pulse mt-1" aria-hidden />
                  ) : (
                    <p className="text-2xl font-semibold tabular-nums text-slate-900">
                      {pendingDash.notInterestedToday}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center w-full">
              <CustomButton
                onClick={handleGetLeads}
                disabled={loading}
                loading={loading}
                className="max-w-xs"
                size="lg"
              >
                Get Leads
              </CustomButton>
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
      label: "Trial Activated",
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
      label: "Call Back Later",
      icon: Clock,
      tone: "neutral" as const,
      onClick: handleOpenCallBackDialog,
      loadingKey: "Call Back Later",
    },
  ].filter(Boolean);
  const titleFont = { fontFamily: "Georgia, serif" };
  const bodyFont = { fontFamily: '"Open Sans", sans-serif' };
  
  return (
    <div className={cn("flex w-full flex-col relative", !isInModal && "overflow-hidden md:overflow-hidden")}>
      <div className={cn("relative w-full", !isInModal && "overflow-hidden md:overflow-hidden")}>
        <Card className={cn("relative flex w-full flex-col bg-white border-0 shadow-none", !isInModal && "overflow-hidden md:overflow-hidden")}>
          
          {/* Mobile Absolute Close Button - Visible only on small screens */}
          <button
            type="button"
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
              }
            }}
            className="absolute top-2 right-2 z-[100] flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 p-1.5 shadow-sm hover:bg-slate-200 md:hidden"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>

          {fetchingNext && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-b-transparent" />
                <p className="text-sm text-slate-500">Loading next lead...</p>
              </div>
            </div>
          )}
          
          {/* Header Section */}
          <div className="w-full border-b border-slate-200 px-2 py-2 md:py-1.5 bg-white" style={bodyFont}>
            <div className="relative flex flex-wrap items-start justify-between gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 pr-12 md:pr-0", // Keeps text from overlapping the floating close button on mobile
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
                    <div className="flex items-center gap-2">
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
                        <h5>{getLeadName(currentLead)}</h5>
                      )}

                      {currentLead?.lead_source && (
                        <Popover>
                        <PopoverTrigger asChild>
                          <Info className="h-4 w-4 cursor-pointer text-slate-400 hover:text-slate-700" />
                        </PopoverTrigger>
                      
                        <PopoverContent
                          side="bottom"
                          className="w-56 rounded-xl border bg-white p-4 shadow-lg"
                        >
                          <p className="text-sm">
                            {currentLead.data?.lead_source_description}
                          </p>
                        </PopoverContent>
                      </Popover>
                      )}
                    </div>
  
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      {currentLead?.affiliated_party && (
                        <span className="font-medium text-slate-700">
                          {currentLead.affiliated_party}
                        </span>
                      )}
                      {currentLead?.affiliated_party && currentLead?.package_to_pitch && (
                        <span className="text-slate-400">•</span>
                      )}
                      {currentLead?.package_to_pitch && (
                        <span className="rounded bg-black px-2 py-0.5 font-medium text-white">
                          {currentLead.package_to_pitch}
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
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-2 md:mt-0">
                <CustomButton
                  type="button"
                  variant="outline"
                  icon={
                    <RefreshCw
                      className={cn(
                        "h-4 w-4 text-[#344054]",
                        refreshingLead && "animate-spin"
                      )}
                    />
                  }
                  className="rounded-xl border-[#D0D5DD] bg-[#F2F4F7] px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#E4E7EC]"
                  onClick={() => {
                    const leadId =
                      currentLead?.id != null ? Number(currentLead.id) : NaN;
                    if (Number.isNaN(leadId)) return;
                    setRefreshingLead(true);
                    void fetchFreshLeadForCard(leadId).finally(() => {
                      setRefreshingLead(false);
                    });
                  }}
                  disabled={
                    refreshingLead ||
                    updating ||
                    fetchingNext ||
                    currentLead?.id == null
                  }
                >
                  Refresh
                </CustomButton>

                <CustomButton
                  type="button"
                  variant="outline"
                  icon={<FaWhatsapp className="h-4 w-4 text-[#344054]" />}
                  className="rounded-xl border-[#D0D5DD] bg-[#F2F4F7] px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#E4E7EC]"
                  onClick={() => handleWhatsAppLead(primaryPhone, currentLead?.whatsapp_link)}
                  disabled={!primaryPhone || updating || fetchingNext}
                >
                  WhatsApp
                </CustomButton>

                <CustomButton
                  type="button"
                  icon={<Phone className="h-4 w-4" />}
                  className="rounded-xl bg-[#1D2939] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#111827]"
                  onClick={() => handleCallLead(primaryPhone)}
                  disabled={!primaryPhone || updating || fetchingNext}
                >
                  {formattedPhoneNumber}
                </CustomButton>

                {/* Desktop-only Inline Close Button */}
                <CustomButton
                  type="button"
                  variant="outline"
                  icon={<X className="h-4 w-4" />}
                  className="hidden md:inline-flex rounded-xl border-[#D0D5DD] bg-white px-3 py-2 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#F9FAFB]"
                  onClick={() => {
                    if (onClose) {
                      onClose();
                    } else {
                      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Task Progress Section */}
          <CardContent className={`flex flex-col gap-8 p-4 bg-white ${actionButtonsVisible && postCallActions.length > 0 ? 'pb-32 md:pb-28' : 'pb-4'}`} style={bodyFont}>
            <div
              className={cn(
                "grid gap-6",
                currentLead?.location && "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
              )}
            >
              <div className="rounded-2xl border border-slate-200 p-5 w-full">
                <div className="mb-4 flex items-center justify-between pl-2">
                  <h5>Task Progress</h5>
                </div>
                {taskSteps.length ? (
                  <div className="pl-4">
                    <TaskProgressList steps={taskSteps} rejectReason={(currentLead as any)?.data?.reject_reason} />
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
      
      {/* Bottom action bar — sized by left/right inset (do not use w-full with sidebar offset) */}
      {!hideActionBar && actionButtonsVisible && postCallActions.length > 0 && (
        <div 
          className={cn(
            "z-[100] border-t border-slate-200 bg-white px-3 md:px-4 lg:px-6 py-3 md:py-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] box-border",
            isInModal 
              ? "sticky bottom-0 shrink-0 w-full" 
              : "fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-width,288px)] transition-[left] duration-200 ease-in-out"
          )}
          style={isInModal ? { pointerEvents: 'auto' } : undefined}
        >
          <div className="grid w-full max-w-full grid-cols-2 gap-2 md:grid-cols-4 md:gap-2 lg:gap-3">
            {postCallActions.map((action) => (
              <LeadActionButton
                key={action.id}
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
                disabled={updating || fetchingNext}
                loading={Boolean(processingAction === action.loadingKey && updating)}
                tone={action.tone}
                className="w-full max-w-full min-w-0"
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
        onOpenChange={(open) => {
          setShowCallBackDialog(open);
          if (onCallBackModalChange) {
            onCallBackModalChange(open);
          }
        }}
        onSubmit={handleSubmitCallBackLater}
        updating={updating}
      />
      <WhatsAppTemplateModal
        open={showWhatsAppModal}
        onOpenChange={setShowWhatsAppModal}
        phone={whatsappPhone}
        whatsappLink={whatsappLink}
        apiEndpoint={config?.whatsappTemplatesApiEndpoint}
        apiPrefix={config?.apiPrefix || 'renderer'}
        onSelectTemplate={handleTemplateSelected}
      />

      {/* Profile Modal */}
      {showProfileModal && (currentLead?.linkedin_profile || currentLead?.website) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
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
                  <h5>{getLeadName(currentLead) || "Lead Profile"}</h5>
                  <p>Profile Information</p>
                </div>
              </div>
              <CustomButton variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={handleCloseProfile} />
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentLead?.linkedin_profile && (
                  <div className="p-4 border rounded-lg">
                    <h5>LinkedIn Profile</h5>
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
                    <h5>Website</h5>
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
}