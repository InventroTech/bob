import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomButton } from "@/components/ui/CustomButton";
import { useTenant } from "@/hooks/useTenant";
import {
  enqueueBackgroundJob,
  getJobPayloadTemplate,
  getBackgroundJobStatus,
  listRunnableJobTypes,
  rerunBackgroundJob,
} from "@/lib/backgroundJobsApi";
import { toast } from "sonner";
import { PlayCircle, RefreshCw } from "lucide-react";

const ALLOWED_ROLE_KEYS = new Set(["PYRO_ADMIN", "GM", "ASM", "OWNER", "ADMIN"]);

const BackgroundJobsPage: React.FC = () => {
  const { customRole, membershipLoaded, tenantId } = useTenant();
  const [selectedJobType, setSelectedJobType] = useState("");
  const [jobPayload, setJobPayload] = useState("{\n  \n}");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [rerunJobId, setRerunJobId] = useState("");
  const [resolvedJobName, setResolvedJobName] = useState("");
  const [resolvedJobStatus, setResolvedJobStatus] = useState("");
  const [resolvedRerunTenantId, setResolvedRerunTenantId] = useState("");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [loadingJobTypes, setLoadingJobTypes] = useState(false);
  const [resolvingRerunTenant, setResolvingRerunTenant] = useState(false);
  const [runningJob, setRunningJob] = useState<"generic" | "rerun" | null>(null);

  const formatTemplate = (jobType: string) =>
    JSON.stringify(getJobPayloadTemplate(jobType), null, 2);

  const normalizedRole = useMemo(
    () => String(customRole || "").trim().toUpperCase(),
    [customRole],
  );
  const hasAccess = membershipLoaded && ALLOWED_ROLE_KEYS.has(normalizedRole);

  useEffect(() => {
    if (!hasAccess) return;
    let active = true;
    const loadJobTypes = async () => {
      setLoadingJobTypes(true);
      try {
        const types = await listRunnableJobTypes();
        if (!active) return;
        setJobTypes(types);
        setSelectedJobType((current) => current || types[0] || "");
      } catch (error: any) {
        if (!active) return;
        toast.error(error?.message || "Failed to load job types");
      } finally {
        if (active) setLoadingJobTypes(false);
      }
    };
    void loadJobTypes();
    return () => {
      active = false;
    };
  }, [hasAccess]);

  useEffect(() => {
    if (!selectedJobType) return;
    setJobPayload(formatTemplate(selectedJobType));
  }, [selectedJobType]);

  useEffect(() => {
    if (tenantId && !selectedTenantId) {
      setSelectedTenantId(tenantId);
    }
  }, [tenantId, selectedTenantId]);

  useEffect(() => {
    const trimmedJobId = rerunJobId.trim();
    if (!trimmedJobId) {
      setResolvedJobName("");
      setResolvedJobStatus("");
      setResolvedRerunTenantId("");
      setResolvingRerunTenant(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setResolvingRerunTenant(true);
      try {
        const detail = await getBackgroundJobStatus(trimmedJobId);
        if (cancelled) return;
        setResolvedJobName(String(detail?.job_type || ""));
        setResolvedJobStatus(String(detail?.status || ""));
        const resolvedTenant = String(detail?.tenant_id || "");
        setResolvedRerunTenantId(resolvedTenant);
        console.log("[BOB Jobs Page] auto-resolved rerun job", {
          jobId: trimmedJobId,
          tenantId: detail?.tenant_id,
          jobType: detail?.job_type,
          status: detail?.status,
        });
        if (!resolvedTenant) {
          toast.error("Job found, but it has no tenant_id set");
        }
      } catch (err: any) {
        if (cancelled) return;
        setResolvedJobName("");
        setResolvedJobStatus("");
        setResolvedRerunTenantId("");
        console.error("[BOB Jobs Page] auto-resolve rerun job failed", {
          jobId: trimmedJobId,
          message: err?.message,
          name: err?.name,
          status: err?.status,
          data: err?.data,
        });
      } finally {
        if (!cancelled) setResolvingRerunTenant(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [rerunJobId]);

  const runGenericJob = async () => {
    if (!selectedJobType.trim()) {
      toast.error("Select a job type");
      return;
    }

    let parsedPayload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(jobPayload);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        toast.error("Payload must be a JSON object");
        return;
      }
      parsedPayload = parsed as Record<string, unknown>;
    } catch {
      toast.error("Payload is not valid JSON");
      return;
    }

    console.log("[BOB Jobs Page] runGenericJob", {
      selectedJobType,
      parsedPayload,
      selectedTenantId,
    });
    setRunningJob("generic");
    try {
      const result = await enqueueBackgroundJob({
        jobType: selectedJobType,
        payload: parsedPayload,
        tenantId: selectedTenantId.trim() || undefined,
      });
      toast.success(
        `${selectedJobType} queued as job #${result.id}${result.tenant_id ? ` for tenant ${result.tenant_id}` : ""}`,
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          `Failed to queue ${selectedJobType}`,
      );
    } finally {
      setRunningJob(null);
    }
  };

  const runRerunJob = async () => {
    if (!rerunJobId.trim()) {
      toast.error("Enter a job ID to re-run");
      return;
    }
    console.log("[BOB Jobs Page] runRerunJob start", {
      rerunJobId,
      resolvedRerunTenantId,
      normalizedRole,
      hasAccess,
    });
    setRunningJob("rerun");
    try {
      // Pre-check so we can show a clearer message when the job
      // doesn't exist (or doesn't belong to the current tenant).
      try {
        console.log("[BOB Jobs Page] checking job before rerun", {
          jobId: rerunJobId.trim(),
        });
        const detail = await getBackgroundJobStatus(rerunJobId.trim());
        if (detail?.tenant_id) {
          setResolvedRerunTenantId(String(detail.tenant_id));
        }
        console.log("[BOB Jobs Page] job detail check passed", {
          jobId: rerunJobId.trim(),
          tenantId: detail?.tenant_id,
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        console.error("[BOB Jobs Page] job detail check failed", {
          jobId: rerunJobId.trim(),
          message: err?.message,
          name: err?.name,
          status: err?.status,
          data: err?.data,
        });
        if (msg.toLowerCase().includes("job not found")) {
          toast.error(
            "Job not found across tenants. Confirm this is a BackgroundJob ID (not a ticket/record ID)."
          );
          return;
        }
        throw err;
      }

      const result = await rerunBackgroundJob(
        rerunJobId.trim(),
        resolvedRerunTenantId.trim() || undefined,
      );
      console.log("[BOB Jobs Page] rerun succeeded", {
        sourceJobId: rerunJobId.trim(),
        tenantId: resolvedRerunTenantId,
        newJobId: result.id,
        result,
      });
      toast.success(`Job requeued as new job #${result.id}`);
    } catch (error: any) {
      console.error("[BOB Jobs Page] rerun failed", {
        jobId: rerunJobId.trim(),
        message: error?.message,
        name: error?.name,
        status: error?.status,
        data: error?.data,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
      });
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to re-run job",
      );
    } finally {
      setRunningJob(null);
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
            <CardTitle>Background Jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You do not have access to manually run background jobs.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Background Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Run any registered background job from BOB and view the queuing result.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Run Any Background Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-type">Job Type</Label>
                <Select
                  value={selectedJobType}
                  onValueChange={setSelectedJobType}
                  disabled={loadingJobTypes || runningJob === "generic"}
                >
                  <SelectTrigger id="job-type">
                    <SelectValue placeholder={loadingJobTypes ? "Loading job types..." : "Select a job type"} />
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
                  placeholder={tenantId || "Tenant UUID"}
                  disabled={runningJob === "generic"}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to your current tenant. Override this when you need to queue the job for another tenant.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="job-payload">Payload JSON</Label>
                  <CustomButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setJobPayload(formatTemplate(selectedJobType))}
                    disabled={!selectedJobType || runningJob === "generic"}
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
                loading={runningJob === "generic"}
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
                Re-run Existing Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rerun-job-id">Job ID</Label>
                <Input
                  id="rerun-job-id"
                  value={rerunJobId}
                  onChange={(e) => setRerunJobId(e.target.value)}
                  placeholder="7114764"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rerun-resolved-job-name">Resolved Job</Label>
                <Input
                  id="rerun-resolved-job-name"
                  value={
                    resolvingRerunTenant
                      ? "Looking up..."
                      : resolvedJobName
                  }
                  readOnly
                  placeholder="Will auto-fill from job ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rerun-resolved-job-status">Status</Label>
                <Input
                  id="rerun-resolved-job-status"
                  value={
                    resolvingRerunTenant
                      ? "Looking up..."
                      : resolvedJobStatus
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
                      ? "Resolving tenant..."
                      : "Will auto-fill from job ID"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter a BackgroundJob ID. Job type, status, and tenant fill automatically when found.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                This clones the original job into a new pending job without editing the source job.
              </p>
              <CustomButton
                onClick={runRerunJob}
                loading={runningJob === "rerun"}
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

export default BackgroundJobsPage;
