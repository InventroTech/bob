import {
  enqueueBackgroundJob,
  getBackgroundJobStatus,
  getJobPayloadTemplate,
  listRunnableJobTypes,
  rerunBackgroundJob,
} from '@/lib/api/services/backgroundJobs';
import {
  enqueuePyroJob,
  getPyroJobPayloadTemplate,
  getPyroJobStatus,
  listRunnablePyroJobTypes,
  rerunPyroJob,
} from '@/lib/api/services/pyroJobs';
import type { JobStatusSummary, JobsAdminAdapter } from './types';

/** Named for stable React Query keys via function.name */
async function getBackgroundJobStatusSummary(
  jobId: string,
): Promise<JobStatusSummary> {
  const detail = await getBackgroundJobStatus(jobId);
  return {
    name: String(detail?.job_type || ''),
    status: String(detail?.status || ''),
    tenantId: String(detail?.tenant_id || ''),
  };
}

/** Named for stable React Query keys via function.name */
async function getPyroJobStatusSummary(
  jobId: string,
): Promise<JobStatusSummary> {
  const detail = await getPyroJobStatus(jobId);
  const payloadTenant = detail?.payload?.tenant_id;
  return {
    name: String(detail?.job_name || ''),
    status: String(detail?.status || ''),
    tenantId: payloadTenant ? String(payloadTenant) : '',
  };
}

export const backgroundJobsAdapter: JobsAdminAdapter = {
  warnMissingTenantOnLookup: true,
  copy: {
    title: 'Background Jobs',
    description:
      'Run any registered background job from BOB and view the queuing result.',
    deniedMessage: 'You do not have access to manually run background jobs.',
    runCardTitle: 'Run Any Background Job',
    rerunCardTitle: 'Re-run Existing Job',
    jobIdPlaceholder: '7114764',
    tenantHint:
      'Defaults to your current tenant. Override this when you need to queue the job for another tenant.',
    rerunHint:
      'Enter a BackgroundJob ID. Job type, status, and tenant fill automatically when found.',
    rerunNote:
      'This clones the original job into a new pending job without editing the source job.',
    notFoundMessage:
      'Job not found across tenants. Confirm this is a BackgroundJob ID (not a ticket/record ID).',
    loadTypesError: 'Failed to load job types',
  },
  listJobTypes: listRunnableJobTypes,
  getPayloadTemplate: getJobPayloadTemplate,
  getJobStatus: getBackgroundJobStatusSummary,
  enqueue: ({ jobType, payload, tenantId }) =>
    enqueueBackgroundJob({ jobType, payload, tenantId }),
  rerun: (jobId, tenantId) => rerunBackgroundJob(jobId, tenantId),
  formatEnqueueSuccess: (jobType, result) =>
    `${jobType} queued as job #${result.id}${
      result.tenant_id ? ` for tenant ${result.tenant_id}` : ''
    }`,
  formatRerunSuccess: (result) => `Job requeued as new job #${result.id}`,
};

export const pyroJobsAdapter: JobsAdminAdapter = {
  copy: {
    title: 'Pyro Jobs',
    description:
      'Manually enqueue or re-run Brahma/Vishnu pyro jobs. Tenant ID is stored in the job payload for ops context; some handlers still use fixed tenants.',
    deniedMessage: 'You do not have access to manually run pyro jobs.',
    runCardTitle: 'Run Any Pyro Job',
    rerunCardTitle: 'Re-run Existing Pyro Job',
    jobIdPlaceholder: '123',
    tenantHint:
      'Defaults to your current tenant. Added to the payload as tenant_id when missing.',
    rerunHint:
      'Enter a pyro_job ID. Job name, status, and payload tenant_id fill automatically when found.',
    rerunNote:
      'This clones the original pyro job into a new pending row without editing the source.',
    notFoundMessage: 'Pyro job not found. Confirm this is a pyro_job ID.',
    loadTypesError: 'Failed to load pyro job types',
  },
  listJobTypes: listRunnablePyroJobTypes,
  getPayloadTemplate: getPyroJobPayloadTemplate,
  getJobStatus: getPyroJobStatusSummary,
  preparePayload: (payload, tenantId) => {
    if (tenantId && payload.tenant_id == null) {
      return { ...payload, tenant_id: tenantId };
    }
    return payload;
  },
  enqueue: ({ jobType, payload, tenantId }) =>
    enqueuePyroJob({ jobName: jobType, payload, tenantId }),
  rerun: (jobId) => rerunPyroJob(jobId),
  formatEnqueueSuccess: (jobType, result) =>
    result.message || `${jobType} queued as pyro job #${result.id}`,
  formatRerunSuccess: (result) => `Pyro job requeued as new job #${result.id}`,
};
