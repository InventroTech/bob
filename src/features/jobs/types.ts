export const JOBS_ADMIN_ROLE_KEYS = new Set([
  'PYRO_ADMIN',
  'GM',
  'ASM',
  'OWNER',
  'ADMIN',
]);

export interface JobStatusSummary {
  name: string;
  status: string;
  tenantId: string;
}

export interface JobEnqueueResult {
  id: number;
  message?: string;
  tenant_id?: string | null;
}

export interface JobsAdminCopy {
  title: string;
  description: string;
  deniedMessage: string;
  runCardTitle: string;
  rerunCardTitle: string;
  jobIdPlaceholder: string;
  tenantHint: string;
  rerunHint: string;
  rerunNote: string;
  notFoundMessage: string;
  loadTypesError: string;
}

export interface JobsAdminAdapter {
  copy: JobsAdminCopy;
  /** When true, toast if status lookup finds a job without tenant_id. */
  warnMissingTenantOnLookup?: boolean;
  listJobTypes: () => Promise<string[]>;
  getPayloadTemplate: (jobType: string) => Record<string, unknown>;
  getJobStatus: (jobId: string) => Promise<JobStatusSummary>;
  preparePayload?: (
    payload: Record<string, unknown>,
    tenantId?: string,
  ) => Record<string, unknown>;
  enqueue: (params: {
    jobType: string;
    payload: Record<string, unknown>;
    tenantId?: string;
  }) => Promise<JobEnqueueResult>;
  rerun: (jobId: string, tenantId?: string) => Promise<{ id: number }>;
  formatEnqueueSuccess: (jobType: string, result: JobEnqueueResult) => string;
  formatRerunSuccess: (result: { id: number }) => string;
}
