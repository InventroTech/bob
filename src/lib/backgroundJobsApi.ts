import { apiClient } from "@/lib/api";

export interface ManualJobRunResult {
  id: number;
  job_type: string;
  status: string;
  tenant_id?: string | null;
  source_job_id?: number;
  payload?: Record<string, unknown>;
  message?: string;
}

const JOB_PAYLOAD_TEMPLATES: Record<string, Record<string, unknown>> = {
  send_mixpanel_event: {
    user_id: 3181247,
    event_name: "pyro_st_resolve",
    properties: {},
  },
  send_rm_assigned_event: {
    praja_id: 3181247,
    rm_email: "rm@example.com",
  },
  send_cse_assigned_event: {
    user_id: 3181247,
    cse_email: "cse@example.com",
  },
  send_webhook: {
    url: "https://example.com/webhook",
    payload: {},
  },
  score_leads: {
    entity_type: "lead",
    batch_size: 500,
  },
  score_leads_chunk: {
    entity_type: "lead",
    id_gte: 1,
    id_lt: 1000,
    rules: [],
    parent_job_id: 0,
    chunk_index: 0,
    total_chunks: 1,
  },
  send_to_praja: {
    object_type: "save_resolved_ticket",
    user_id: 3181247,
    ticket_id: 1419024,
    ticket_type: "self_trial",
    ticket_status: "RESOLVED",
    all_tasks_completed: false,
  },
  partner_lead_assign: {
    tenant_id: "tenant-uuid",
    email_id: "partner.user@example.com",
    record_id: 12345,
    partner_slug: "halocom",
  },
  unassign_snoozed_leads: {},
  release_leads_after_12h: {},
  close_stale_self_trial_support_tickets: {
    days: 15,
    other_days: 3,
  },
  snoozed_to_not_connected_midnight: {},
  purge_old_log_tables: {
    days: 30,
    chunk_size: 1000,
    max_chunks_per_table: 20,
  },
  sync_dispatch_to_records: {},
  process_dumped_tickets: {},
  discover_entity_types: {},
  refresh_inventory_shipment_tracking: {},
};

export function getJobPayloadTemplate(jobType: string): Record<string, unknown> {
  return JOB_PAYLOAD_TEMPLATES[jobType]
    ? JSON.parse(JSON.stringify(JOB_PAYLOAD_TEMPLATES[jobType]))
    : {};
}

export async function listRunnableJobTypes(): Promise<string[]> {
  try {
    const base = apiClient.defaults.baseURL || "";
    console.log("[BOB Jobs API] GET", `${base}/jobs/types/`);
    const response = await apiClient.get("/jobs/types/");
    console.log("[BOB Jobs API] GET /jobs/types/ ->", response.status, response.data);
    return Array.isArray(response.data?.job_types) ? response.data.job_types : [];
  } catch (error: any) {
    console.error("[BOB Jobs API] GET /jobs/types/ failed:", error?.response?.status, error?.response?.data);
    throw error;
  }
}

export async function enqueueBackgroundJob(params: {
  jobType: string;
  payload: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  tenantId?: string;
}): Promise<ManualJobRunResult> {
  const base = apiClient.defaults.baseURL || "";
  console.log("[BOB Jobs API] POST", `${base}/jobs/enqueue/`, {
    job_type: params.jobType,
    payload: params.payload,
    priority: params.priority ?? 0,
    max_attempts: params.maxAttempts ?? 3,
    tenant_id: params.tenantId || undefined,
  });
  const response = await apiClient.post("/jobs/enqueue/", {
    job_type: params.jobType,
    payload: params.payload,
    priority: params.priority ?? 0,
    max_attempts: params.maxAttempts ?? 3,
    tenant_id: params.tenantId || undefined,
  });
  console.log("[BOB Jobs API] POST /jobs/enqueue/ ->", response.status, response.data);
  return response.data;
}

export async function rerunBackgroundJob(
  jobId: string | number,
  tenantId?: string,
): Promise<ManualJobRunResult> {
  const base = apiClient.defaults.baseURL || "";
  const rerunUrl = `/jobs/${jobId}/rerun/`;
  const retryUrl = `/jobs/${jobId}/retry/`;
  try {
    console.log("[BOB Jobs API] POST", `${base}${rerunUrl}`, {
      tenant_id: tenantId || undefined,
    });
    const response = await apiClient.post(rerunUrl, {
      tenant_id: tenantId || undefined,
    });
    console.log("[BOB Jobs API] POST rerun ->", response.status, response.data);
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    console.error("[BOB Jobs API] rerun failed:", {
      endpoint: `${base}${rerunUrl}`,
      responseStatus: status,
      responseData: error?.response?.data,
      message: error?.message,
      code: error?.code,
      isAxiosError: error?.isAxiosError,
    });
    // Also print the full error for debugging (kept small-ish by browsers/devtools).
    console.error(error);
    // If rerun endpoint isn't deployed yet, fall back to retry endpoint.
    if (status === 404) {
      console.log("[BOB Jobs API] POST fallback retry", `${base}${retryUrl}`);
      const retryResp = await apiClient.post(retryUrl, {
        tenant_id: tenantId || undefined,
      });
      console.log("[BOB Jobs API] POST retry ->", retryResp.status, retryResp.data);
      return retryResp.data;
    }
    throw error;
  }
}

export async function getBackgroundJobStatus(
  jobId: string | number,
  tenantId?: string,
): Promise<any> {
  const base = apiClient.defaults.baseURL || "";
  const url = `/jobs/${jobId}/`;
  try {
    console.log("[BOB Jobs API] GET job detail", {
      endpoint: `${base}${url}`,
      jobId,
      tenantId: tenantId || undefined,
    });
    const response = await apiClient.get(url, {
      params: tenantId ? { tenant_id: tenantId } : undefined,
    });
    console.log("[BOB Jobs API] GET job detail success", {
      endpoint: `${base}${url}`,
      status: response.status,
      data: response.data,
    });
    return response.data;
  } catch (error: any) {
    console.error("[BOB Jobs API] GET job detail failed", {
      endpoint: `${base}${url}`,
      jobId,
      message: error?.message,
      name: error?.name,
      status: error?.status,
      data: error?.data,
      responseStatus: error?.response?.status,
      responseData: error?.response?.data,
    });
    throw error;
  }
}

export async function enqueueCseAssignedJob(params: {
  userId: string | number;
  cseEmail: string;
}): Promise<ManualJobRunResult> {
  const response = await apiClient.post("/jobs/enqueue/", {
    job_type: "send_cse_assigned_event",
    payload: {
      user_id: Number(params.userId),
      cse_email: params.cseEmail,
    },
  });
  return response.data;
}

export async function enqueueSaveSupportTicketJob(params: {
  userId: string | number;
  ticketId: string | number;
  ticketType: string;
  ticketStatus: string;
  allTasksCompleted: boolean;
}): Promise<ManualJobRunResult> {
  const response = await apiClient.post("/jobs/enqueue/", {
    job_type: "send_to_praja",
    payload: {
      object_type: "save_resolved_ticket",
      user_id: Number(params.userId),
      ticket_id: Number(params.ticketId),
      ticket_type: params.ticketType,
      ticket_status: params.ticketStatus,
      all_tasks_completed: params.allTasksCompleted,
    },
  });
  return response.data;
}
