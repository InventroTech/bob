/**
 * Background Jobs API Service
 * Manual enqueue / status / re-run for Django BackgroundJob rows.
 */

import { apiClient } from '../client';

export interface ManualJobRunResult {
  id: number;
  job_type: string;
  status: string;
  tenant_id?: string | null;
  source_job_id?: number;
  payload?: Record<string, unknown>;
  message?: string;
}

export interface BackgroundJobDetail {
  id?: number;
  job_type?: string;
  status?: string;
  tenant_id?: string | null;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

const JOB_PAYLOAD_TEMPLATES: Record<string, Record<string, unknown>> = {
  send_mixpanel_event: {
    user_id: 3181247,
    event_name: 'pyro_st_resolve',
    properties: {},
  },
  send_rm_assigned_event: {
    praja_id: 3181247,
    rm_email: 'rm@example.com',
  },
  send_cse_assigned_event: {
    user_id: 3181247,
    cse_email: 'cse@example.com',
  },
  send_webhook: {
    url: 'https://example.com/webhook',
    payload: {},
  },
  score_leads: {
    entity_type: 'lead',
    batch_size: 500,
  },
  score_leads_chunk: {
    entity_type: 'lead',
    id_gte: 1,
    id_lt: 1000,
    rules: [],
    parent_job_id: 0,
    chunk_index: 0,
    total_chunks: 1,
  },
  send_to_praja: {
    object_type: 'save_resolved_ticket',
    user_id: 3181247,
    ticket_id: 1419024,
    ticket_type: 'self_trial',
    ticket_status: 'RESOLVED',
    all_tasks_completed: false,
  },
  partner_lead_assign: {
    tenant_id: 'tenant-uuid',
    email_id: 'partner.user@example.com',
    record_id: 12345,
    partner_slug: 'halocom',
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
    ? structuredClone(JOB_PAYLOAD_TEMPLATES[jobType])
    : {};
}

export async function listRunnableJobTypes(): Promise<string[]> {
  const response = await apiClient.get('/jobs/types/');
  return Array.isArray(response.data?.job_types) ? response.data.job_types : [];
}

export async function enqueueBackgroundJob(params: {
  jobType: string;
  payload: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  tenantId?: string;
}): Promise<ManualJobRunResult> {
  const response = await apiClient.post('/jobs/enqueue/', {
    job_type: params.jobType,
    payload: params.payload,
    priority: params.priority ?? 0,
    max_attempts: params.maxAttempts ?? 3,
    tenant_id: params.tenantId || undefined,
  });
  return response.data;
}

export async function rerunBackgroundJob(
  jobId: string | number,
  tenantId?: string,
): Promise<ManualJobRunResult> {
  const body = { tenant_id: tenantId || undefined };
  try {
    const response = await apiClient.post(`/jobs/${jobId}/rerun/`, body);
    return response.data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    // If rerun endpoint isn't deployed yet, fall back to retry endpoint.
    if (status === 404) {
      const retryResp = await apiClient.post(`/jobs/${jobId}/retry/`, body);
      return retryResp.data;
    }
    throw error;
  }
}

export async function getBackgroundJobStatus(
  jobId: string | number,
  tenantId?: string,
): Promise<BackgroundJobDetail> {
  const response = await apiClient.get(`/jobs/${jobId}/`, {
    params: tenantId ? { tenant_id: tenantId } : undefined,
  });
  return response.data;
}

export async function enqueueCseAssignedJob(params: {
  userId: string | number;
  cseEmail: string;
}): Promise<ManualJobRunResult> {
  return enqueueBackgroundJob({
    jobType: 'send_cse_assigned_event',
    payload: {
      user_id: Number(params.userId),
      cse_email: params.cseEmail,
    },
  });
}

export async function enqueueSaveSupportTicketJob(params: {
  userId: string | number;
  ticketId: string | number;
  ticketType: string;
  ticketStatus: string;
  allTasksCompleted: boolean;
}): Promise<ManualJobRunResult> {
  return enqueueBackgroundJob({
    jobType: 'send_to_praja',
    payload: {
      object_type: 'save_resolved_ticket',
      user_id: Number(params.userId),
      ticket_id: Number(params.ticketId),
      ticket_type: params.ticketType,
      ticket_status: params.ticketStatus,
      all_tasks_completed: params.allTasksCompleted,
    },
  });
}

export const backgroundJobsService = {
  listTypes: listRunnableJobTypes,
  getPayloadTemplate: getJobPayloadTemplate,
  enqueue: enqueueBackgroundJob,
  getStatus: getBackgroundJobStatus,
  rerun: rerunBackgroundJob,
  enqueueCseAssigned: enqueueCseAssignedJob,
  enqueueSaveSupportTicket: enqueueSaveSupportTicketJob,
};
