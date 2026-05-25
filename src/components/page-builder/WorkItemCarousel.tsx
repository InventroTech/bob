import React, { useCallback, useState } from "react";
import { ArrowRight, Briefcase, Headphones, Inbox, Target } from "lucide-react";
import { toast } from "sonner";
import { CustomButton } from "@/components/ui/CustomButton";
import { apiClient } from "@/lib/api/client";
import { TicketCarousel } from "./TicketCarousel";
import LeadCardCarousel from "./LeadCardCarousel";
import type { LeadData } from "@/types/lead";

interface WorkItemCarouselProps {
  config?: {
    apiPrefix?: "supabase" | "renderer";
    useWorkItemApi?: boolean;
    title?: string;
    workItemMode?: boolean;
    workItemRecordId?: number | null;
  };
}

type IdleView = "ready" | "empty";

function mapSupportTicket(workItem: any) {
  const t = workItem?.ticket || workItem?.record?.data || {};
  return {
    id: t.support_ticket_id ?? t.ticket_id ?? workItem?.record?.id,
    ...t,
    resolution_status: t.resolution_status ?? null,
    call_status: t.call_status ?? "Call Waiting",
    cse_remarks: t.cse_remarks ?? "",
    other_reasons: t.other_reasons ?? [],
  };
}

function mapLead(workItem: any): LeadData {
  const lead = workItem?.lead;
  if (lead) return lead as LeadData;
  const rec = workItem?.record;
  const data = rec?.data || {};
  return {
    id: rec?.id,
    name: data.name || "",
    phone_number: data.phone_number || data.phone || "",
    lead_stage: data.lead_stage,
    lead_status: data.lead_status,
    lead_source: data.lead_source,
    call_attempts: data.call_attempts,
    next_call_at: data.next_call_at,
    assigned_to: data.assigned_to,
    data,
  } as LeadData;
}

export type WorkItemFetchResult = {
  profile: "support" | "self_trial" | "sales";
  ticket: any | null;
  lead: LeadData | null;
  recordId: number | null;
};

async function fetchNextWorkItem(): Promise<WorkItemFetchResult | null> {
  const response = await apiClient.get("/crm-records/work-item/next/");
  const workItem = response.data?.work_item;
  if (!workItem?.record) return null;
  const profile = (workItem.ui_profile || "sales") as "support" | "self_trial" | "sales";
  return {
    profile,
    ticket: profile === "support" ? mapSupportTicket(workItem) : null,
    lead: profile !== "support" ? mapLead(workItem) : null,
    recordId: workItem.record?.id ?? null,
  };
}

interface WorkItemIdleCardProps {
  title?: string;
  loading: boolean;
  view: IdleView;
  onGetWorkItem: () => void;
}

function WorkItemIdleCard({ title, loading, view, onGetWorkItem }: WorkItemIdleCardProps) {
  const isEmpty = view === "empty";

  return (
    <div className="mainCard w-full flex flex-col justify-center items-center min-h-[420px] py-8 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            isEmpty ? "bg-slate-100 text-slate-500" : "bg-slate-900 text-white"
          }`}
        >
          {isEmpty ? (
            <Inbox className="h-5 w-5" aria-hidden />
          ) : (
            <Briefcase className="h-5 w-5" aria-hidden />
          )}
        </div>

        <div className="space-y-2 text-center">
          <h5 className="text-lg font-semibold text-slate-900">
            {isEmpty ? "All caught up" : title || "Work Queue"}
          </h5>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isEmpty
              ? "No tickets or leads waiting right now."
              : "Pull your next assignment — support tickets and self-trial leads"}
          </p>
        </div>

        {!isEmpty && (
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Headphones className="h-3.5 w-3.5" aria-hidden />
              Support
            </span>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <Target className="h-3.5 w-3.5" aria-hidden />
              Self trial
            </span>
          </div>
        )}

        <CustomButton
          onClick={onGetWorkItem}
          disabled={loading}
          loading={loading}
          size="lg"
          className="justify-center px-8"
          iconRight={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {isEmpty ? "Check again" : "Get work item"}
        </CustomButton>
      </div>
    </div>
  );
}

export const WorkItemCarousel: React.FC<WorkItemCarouselProps> = ({ config }) => {
  const [idleView, setIdleView] = useState<IdleView>("ready");
  const [loading, setLoading] = useState(false);
  const [uiProfile, setUiProfile] = useState<"support" | "self_trial" | "sales" | null>(null);
  const [initialTicket, setInitialTicket] = useState<any>(null);
  const [initialLead, setInitialLead] = useState<LeadData | null>(null);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  const applyWorkItem = useCallback((item: WorkItemFetchResult | null) => {
    if (!item) {
      setActive(false);
      setIdleView("empty");
      setUiProfile(null);
      setInitialTicket(null);
      setInitialLead(null);
      setRecordId(null);
      return;
    }
    setUiProfile(item.profile);
    setRecordId(item.recordId);
    setInitialTicket(item.ticket);
    setInitialLead(item.lead);
    setActive(true);
    setIdleView("ready");
  }, []);

  const loadWorkItem = useCallback(async () => {
    setLoading(true);
    try {
      const item = await fetchNextWorkItem();
      applyWorkItem(item);
    } catch (err) {
      console.error("[WorkItemCarousel] fetch failed", err);
      toast.error("Couldn't load the next work item. Please try again.");
      setActive(false);
      setIdleView("ready");
    } finally {
      setLoading(false);
    }
  }, [applyWorkItem]);

  /** After a support/self-trial action: return to Get work item (manual pull only). */
  const handleWorkItemResolved = useCallback(() => {
    setActive(false);
    setIdleView("ready");
    setUiProfile(null);
    setInitialTicket(null);
    setInitialLead(null);
    setRecordId(null);
  }, []);

  const childConfig = {
    ...config,
    workItemMode: true,
    workItemRecordId: recordId,
    fetchNextWorkItem,
    onWorkItemResolved: handleWorkItemResolved,
  };

  if (!active) {
    return (
      <WorkItemIdleCard
        title={config?.title}
        loading={loading}
        view={idleView}
        onGetWorkItem={loadWorkItem}
      />
    );
  }

  if (uiProfile === "support" && initialTicket) {
    return (
      <TicketCarousel
        key={`ticket-${initialTicket.id}`}
        config={childConfig}
        initialTicket={initialTicket}
      />
    );
  }

  if (initialLead) {
    return (
      <LeadCardCarousel
        key={`lead-${initialLead.id}`}
        config={childConfig}
        initialLead={initialLead}
      />
    );
  }

  return (
    <WorkItemIdleCard
      title={config?.title}
      loading={loading}
      view="empty"
      onGetWorkItem={loadWorkItem}
    />
  );
};
