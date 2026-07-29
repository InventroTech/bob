import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomButton } from '@/components/ui/CustomButton';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { PlayCircle, RefreshCw } from 'lucide-react';
import { JOBS_ADMIN_ROLE_KEYS, type JobsAdminAdapter } from './types';
import {
  useEnqueueJob,
  useJobStatusLookup,
  useRerunJob,
  useRunnableJobTypes,
} from './hooks/useJobsAdmin';

interface JobsAdminPageProps {
  adapter: JobsAdminAdapter;
}

const JobsAdminPage: React.FC<JobsAdminPageProps> = ({ adapter }) => {
  const { copy } = adapter;
  const { customRole, membershipLoaded, tenantId } = useTenant();
  const [selectedJobType, setSelectedJobType] = useState('');
  const [jobPayload, setJobPayload] = useState('{\n  \n}');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [rerunJobId, setRerunJobId] = useState('');
  const [debouncedRerunJobId, setDebouncedRerunJobId] = useState('');
  const [resolvedRerunTenantId, setResolvedRerunTenantId] = useState('');

  const formatTemplate = (jobType: string) =>
    JSON.stringify(adapter.getPayloadTemplate(jobType), null, 2);

  const normalizedRole = useMemo(
    () => String(customRole || '').trim().toUpperCase(),
    [customRole],
  );
  const hasAccess = membershipLoaded && JOBS_ADMIN_ROLE_KEYS.has(normalizedRole);

  const {
    data: jobTypes = [],
    isLoading: loadingJobTypes,
    error: jobTypesError,
  } = useRunnableJobTypes(adapter.listJobTypes, hasAccess);

  const {
    data: lookedUpJob,
    isFetching: resolvingRerunTenant,
    isError: lookupFailed,
  } = useJobStatusLookup(
    adapter.getJobStatus,
    debouncedRerunJobId,
    Boolean(debouncedRerunJobId),
  );

  const enqueueMutation = useEnqueueJob(adapter);
  const rerunMutation = useRerunJob(adapter);

  const resolvedJobName = lookedUpJob?.name ?? '';
  const resolvedJobStatus = lookedUpJob?.status ?? '';
  const runningJob = enqueueMutation.isPending
    ? 'generic'
    : rerunMutation.isPending
      ? 'rerun'
      : null;

  useEffect(() => {
    if (!jobTypesError) return;
    const message =
      jobTypesError instanceof Error
        ? jobTypesError.message
        : copy.loadTypesError;
    toast.error(message || copy.loadTypesError);
  }, [jobTypesError, copy.loadTypesError]);

  useEffect(() => {
    setSelectedJobType((current) => current || jobTypes[0] || '');
  }, [jobTypes]);

  useEffect(() => {
    if (!selectedJobType) return;
    setJobPayload(formatTemplate(selectedJobType));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refresh when job type changes
  }, [selectedJobType]);

  useEffect(() => {
    if (tenantId && !selectedTenantId) {
      setSelectedTenantId(tenantId);
    }
  }, [tenantId, selectedTenantId]);

  // Debounce job ID before status lookup (caller-owned debounce)
  useEffect(() => {
    const trimmed = rerunJobId.trim();
    if (!trimmed) {
      setDebouncedRerunJobId('');
      setResolvedRerunTenantId('');
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setDebouncedRerunJobId(trimmed);
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [rerunJobId]);

  useEffect(() => {
    if (!debouncedRerunJobId) {
      setResolvedRerunTenantId('');
      return;
    }
    if (lookupFailed) {
      setResolvedRerunTenantId('');
      return;
    }
    if (!lookedUpJob) return;
    setResolvedRerunTenantId(lookedUpJob.tenantId);
    if (adapter.warnMissingTenantOnLookup && !lookedUpJob.tenantId) {
      toast.error('Job found, but it has no tenant_id set');
    }
  }, [adapter.warnMissingTenantOnLookup, debouncedRerunJobId, lookedUpJob, lookupFailed]);

  const runGenericJob = async () => {
    if (!selectedJobType.trim()) {
      toast.error('Select a job type');
      return;
    }

    let parsedPayload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(jobPayload);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        toast.error('Payload must be a JSON object');
        return;
      }
      parsedPayload = parsed as Record<string, unknown>;
    } catch {
      toast.error('Payload is not valid JSON');
      return;
    }

    const tenant = selectedTenantId.trim() || undefined;
    if (adapter.preparePayload) {
      parsedPayload = adapter.preparePayload(parsedPayload, tenant);
    }

    try {
      const result = await enqueueMutation.mutateAsync({
        jobType: selectedJobType,
        payload: parsedPayload,
        tenantId: tenant,
      });
      toast.success(adapter.formatEnqueueSuccess(selectedJobType, result));
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          `Failed to queue ${selectedJobType}`,
      );
    }
  };

  const runRerunJob = async () => {
    if (!rerunJobId.trim()) {
      toast.error('Enter a job ID to re-run');
      return;
    }
    try {
      let tenantForRerun = resolvedRerunTenantId.trim() || undefined;
      try {
        const detail = await adapter.getJobStatus(rerunJobId.trim());
        if (detail.tenantId) {
          setResolvedRerunTenantId(detail.tenantId);
          tenantForRerun = detail.tenantId;
        }
      } catch (err: unknown) {
        const msg = String((err as { message?: string })?.message || '');
        if (msg.toLowerCase().includes('job not found')) {
          toast.error(copy.notFoundMessage);
          return;
        }
        throw err;
      }

      const result = await rerunMutation.mutateAsync({
        jobId: rerunJobId.trim(),
        tenantId: tenantForRerun,
      });
      toast.success(adapter.formatRerunSuccess(result));
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      toast.error(
        err?.response?.data?.error || err?.message || 'Failed to re-run job',
      );
    }
  };

  if (!membershipLoaded) {
    return (
      <DashboardLayout>
        <div className="text-sm text-muted-foreground">Loading access...</div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>{copy.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {copy.deniedMessage}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                {copy.runCardTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-type">Job Type</Label>
                <Select
                  value={selectedJobType}
                  onValueChange={setSelectedJobType}
                  disabled={loadingJobTypes || runningJob === 'generic'}
                >
                  <SelectTrigger id="job-type">
                    <SelectValue
                      placeholder={
                        loadingJobTypes
                          ? 'Loading job types...'
                          : 'Select a job type'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypes.map((jobType) => (
                      <SelectItem key={jobType} value={jobType}>
                        {jobType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-tenant-id">Tenant ID</Label>
                <Input
                  id="job-tenant-id"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  placeholder={tenantId || 'Tenant UUID'}
                  disabled={runningJob === 'generic'}
                />
                <p className="text-xs text-muted-foreground">{copy.tenantHint}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="job-payload">Payload JSON</Label>
                  <CustomButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setJobPayload(formatTemplate(selectedJobType))}
                    disabled={!selectedJobType || runningJob === 'generic'}
                  >
                    Reset to template
                  </CustomButton>
                </div>
                <Textarea
                  id="job-payload"
                  value={jobPayload}
                  onChange={(e) => setJobPayload(e.target.value)}
                  className="min-h-[220px] font-mono text-sm"
                  placeholder="Select a job type to load its payload template"
                />
              </div>
              <CustomButton
                onClick={runGenericJob}
                loading={runningJob === 'generic'}
                className="w-full"
              >
                Run Selected Job
              </CustomButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                {copy.rerunCardTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rerun-job-id">Job ID</Label>
                <Input
                  id="rerun-job-id"
                  value={rerunJobId}
                  onChange={(e) => setRerunJobId(e.target.value)}
                  placeholder={copy.jobIdPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rerun-resolved-job-name">Resolved Job</Label>
                <Input
                  id="rerun-resolved-job-name"
                  value={resolvingRerunTenant ? 'Looking up...' : resolvedJobName}
                  readOnly
                  placeholder="Will auto-fill from job ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rerun-resolved-job-status">Status</Label>
                <Input
                  id="rerun-resolved-job-status"
                  value={
                    resolvingRerunTenant ? 'Looking up...' : resolvedJobStatus
                  }
                  readOnly
                  placeholder="Will auto-fill from job ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rerun-tenant-id">Tenant ID</Label>
                <Input
                  id="rerun-tenant-id"
                  value={resolvedRerunTenantId}
                  readOnly
                  placeholder={
                    resolvingRerunTenant
                      ? 'Resolving tenant...'
                      : 'Will auto-fill from job ID'
                  }
                />
                <p className="text-xs text-muted-foreground">{copy.rerunHint}</p>
              </div>
              <p className="text-sm text-muted-foreground">{copy.rerunNote}</p>
              <CustomButton
                onClick={runRerunJob}
                loading={runningJob === 'rerun'}
                className="w-full"
              >
                Re-run Job by ID
              </CustomButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default JobsAdminPage;
