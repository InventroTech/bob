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
  enqueuePyroJob,
  getPyroJobPayloadTemplate,
  getPyroJobStatus,
  listRunnablePyroJobTypes,
  rerunPyroJob,
} from "@/lib/pyroJobsApi";
import { toast } from "sonner";
import { PlayCircle, RefreshCw } from "lucide-react";

const ALLOWED_ROLE_KEYS = new Set(["PYRO_ADMIN", "GM", "ASM", "OWNER", "ADMIN"]);

const PyroJobsPage: React.FC = () => {
  const { customRole, membershipLoaded, tenantId } = useTenant();
  const [selectedJobType, setSelectedJobType] = useState("");
  const [jobPayload, setJobPayload] = useState("{\n  \n}");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [rerunJobId, setRerunJobId] = useState("");
  const [resolvedJobName, setResolvedJobName] = useState("");
  const [resolvedJobStatus, setResolvedJobStatus] = useState("");
  const [resolvedTenantId, setResolvedTenantId] = useState("");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [loadingJobTypes, setLoadingJobTypes] = useState(false);
  const [resolvingRerunJob, setResolvingRerunJob] = useState(false);
  const [runningJob, setRunningJob] = useState<"generic" | "rerun" | null>(null);

  const formatTemplate = (jobType: string) =>
    JSON.stringify(getPyroJobPayloadTemplate(jobType), null, 2);

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
        const types = await listRunnablePyroJobTypes();
        if (!active) return;
        setJobTypes(types);
        setSelectedJobType((current) => current || types[0] || "");
      } catch (error: any) {
        if (!active) return;
        toast.error(error?.message || "Failed to load pyro job types");
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
      setResolvedTenantId("");
      setResolvingRerunJob(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setResolvingRerunJob(true);
      try {
        const detail = await getPyroJobStatus(trimmedJobId);
        if (cancelled) return;
        setResolvedJobName(String(detail?.job_name || ""));
        setResolvedJobStatus(String(detail?.status || ""));
        const payloadTenant = detail?.payload?.tenant_id;
        setResolvedTenantId(payloadTenant ? String(payloadTenant) : "");
      } catch (err: any) {
        if (cancelled) return;
        setResolvedJobName("");
        setResolvedJobStatus("");
        setResolvedTenantId("");
        console.error("[BOB Pyro Jobs] auto-resolve failed", {
          jobId: trimmedJobId,
          message: err?.message,
          status: err?.status,
          data: err?.data,
        });
      } finally {
        if (!cancelled) setResolvingRerunJob(false);
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

    if (selectedTenantId.trim() && parsedPayload.tenant_id == null) {
      parsedPayload = {
        ...parsedPayload,
        tenant_id: selectedTenantId.trim(),
      };
    }

    setRunningJob("generic");
    try {
      const result = await enqueuePyroJob({
        jobName: selectedJobType,
        payload: parsedPayload,
        tenantId: selectedTenantId.trim() || undefined,
      });
      toast.success(
        result.message ||
          `${selectedJobType} queued as pyro job #${result.id}`,
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
      toast.error("Enter a pyro job ID to re-run");
      return;
    }
    setRunningJob("rerun");
    try {
      try {
        const detail = await getPyroJobStatus(rerunJobId.trim());
        setResolvedJobName(String(detail?.job_name || ""));
        setResolvedJobStatus(String(detail?.status || ""));
        const payloadTenant = detail?.payload?.tenant_id;
        setResolvedTenantId(payloadTenant ? String(payloadTenant) : "");
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.toLowerCase().includes("job not found")) {
          toast.error("Pyro job not found. Confirm this is a pyro_job ID.");
          return;
        }
        throw err;
      }

      const result = await rerunPyroJob(rerunJobId.trim());
      toast.success(`Pyro job requeued as new job #${result.id}`);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to re-run pyro job",
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
            <CardTitle>Pyro Jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You do not have access to manually run pyro jobs.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pyro Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manually enqueue or re-run Brahma/Vishnu pyro jobs. Tenant ID is stored
            in the job payload for ops context; some handlers still use fixed tenants.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Run Any Pyro Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pyro-job-type">Job Type</Label>
                <Select
                  value={selectedJobType}
                  onValueChange={setSelectedJobType}
                  disabled={loadingJobTypes || runningJob === "generic"}
                >
                  <SelectTrigger id="pyro-job-type">
                    <SelectValue
                      placeholder={
                        loadingJobTypes ? "Loading job types..." : "Select a job type"
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
                <Label htmlFor="pyro-job-tenant-id">Tenant ID</Label>
                <Input
                  id="pyro-job-tenant-id"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  placeholder={tenantId || "Tenant UUID"}
                  disabled={runningJob === "generic"}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to your current tenant. Added to the payload as tenant_id when missing.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="pyro-job-payload">Payload JSON</Label>
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
                  id="pyro-job-payload"
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
                Re-run Existing Pyro Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pyro-rerun-job-id">Job ID</Label>
                <Input
                  id="pyro-rerun-job-id"
                  value={rerunJobId}
                  onChange={(e) => setRerunJobId(e.target.value)}
                  placeholder="123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pyro-resolved-job-name">Resolved Job</Label>
                <Input
                  id="pyro-resolved-job-name"
                  value={
                    resolvingRerunJob
                      ? "Looking up..."
                      : resolvedJobName
                  }
                  readOnly
                  placeholder="Will auto-fill from job ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pyro-resolved-job-status">Status</Label>
                <Input
                  id="pyro-resolved-job-status"
                  value={
                    resolvingRerunJob
                      ? "Looking up..."
                      : resolvedJobStatus
                  }
                  readOnly
                  placeholder="Will auto-fill from job ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pyro-resolved-tenant-id">Tenant ID</Label>
                <Input
                  id="pyro-resolved-tenant-id"
                  value={resolvedTenantId}
                  readOnly
                  placeholder={
                    resolvingRerunJob
                      ? "Resolving tenant..."
                      : "Will auto-fill from payload.tenant_id if present"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter a pyro_job ID. Job name, status, and payload tenant_id fill automatically when found.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                This clones the original pyro job into a new pending row without editing
                the source.
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

export default PyroJobsPage;
