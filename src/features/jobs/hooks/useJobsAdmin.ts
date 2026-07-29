import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import type {
  JobEnqueueResult,
  JobStatusSummary,
  JobsAdminAdapter,
} from '../types';

function jobKindsFromFn(fn: (...args: never[]) => unknown): string {
  return fn.name?.trim() || 'jobs';
}

/**
 * Load runnable job type names for the given adapter list fn.
 */
export function useRunnableJobTypes(
  listJobTypes: () => Promise<string[]>,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.jobs.types(jobKindsFromFn(listJobTypes)),
    queryFn: () => listJobTypes(),
    enabled,
  });
}

/**
 * Look up a single job's status. Debounce `jobId` in the caller if needed.
 */
export function useJobStatusLookup(
  getJobStatus: (jobId: string) => Promise<JobStatusSummary>,
  jobId: string,
  enabled: boolean,
) {
  const trimmed = jobId.trim();
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobKindsFromFn(getJobStatus), trimmed),
    queryFn: () => getJobStatus(trimmed),
    enabled: enabled && Boolean(trimmed),
    retry: false,
  });
}

export function useEnqueueJob(adapter: JobsAdminAdapter) {
  return useMutation({
    mutationFn: (params: {
      jobType: string;
      payload: Record<string, unknown>;
      tenantId?: string;
    }): Promise<JobEnqueueResult> => adapter.enqueue(params),
  });
}

export function useRerunJob(adapter: JobsAdminAdapter) {
  return useMutation({
    mutationFn: (params: {
      jobId: string;
      tenantId?: string;
    }): Promise<{ id: number }> =>
      adapter.rerun(params.jobId, params.tenantId),
  });
}
