import { apiClient } from "@/lib/api";

export interface ManualPyroJobRunResult {
  id: number;
  job_name: string;
  status: string;
  payload?: Record<string, unknown>;
  source_job_id?: number;
  run_at?: string | null;
  ran_pending_jobs?: Array<{
    id: number;
    status: string;
    result?: Record<string, unknown> | null;
    error?: string | null;
  }>;
  message?: string;
}

const PYRO_JOB_PAYLOAD_TEMPLATES: Record<string, Record<string, unknown>> = {
  dispatch_data_sync: {},
  purge_old_log_tables: {
    days: 30,
    chunk_size: 1000,
    max_chunks_per_table: 20,
  },
  snoozed_to_not_connected_midnight: {},
};

export function getPyroJobPayloadTemplate(jobName: string): Record<string, unknown> {
  return PYRO_JOB_PAYLOAD_TEMPLATES[jobName]
    ? JSON.parse(JSON.stringify(PYRO_JOB_PAYLOAD_TEMPLATES[jobName]))
    : {};
}

export async function listRunnablePyroJobTypes(): Promise<string[]> {
  const response = await apiClient.get("/pyro-jobs/types/");
  return Array.isArray(response.data?.job_types) ? response.data.job_types : [];
}

export async function enqueuePyroJob(params: {
  jobName: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  tenantId?: string;
}): Promise<ManualPyroJobRunResult> {
  const payload = { ...params.payload };
  if (params.tenantId && payload.tenant_id == null) {
    payload.tenant_id = params.tenantId;
  }
  const response = await apiClient.post("/pyro-jobs/enqueue/", {
    job_name: params.jobName,
    payload,
    max_attempts: params.maxAttempts ?? 3,
  });
  return response.data;
}

export async function getPyroJobStatus(jobId: string | number): Promise<any> {
  const response = await apiClient.get(`/pyro-jobs/${jobId}/`);
  return response.data;
}

export async function rerunPyroJob(jobId: string | number): Promise<ManualPyroJobRunResult> {
  const response = await apiClient.post(`/pyro-jobs/${jobId}/rerun/`);
  return response.data;
}
