import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RmPrdFilterKey, RmPrdViewMode } from "@/components/page-builder/RmPrdAnalyticsComponent";
import { membershipService, type Role } from "@/lib/api/services/membership";

const FILTER_OPTIONS: { key: RmPrdFilterKey; label: string }[] = [
  { key: "manager", label: "Manager" },
  { key: "dateRange", label: "Date Range" },
  { key: "leadGroup", label: "Lead Group" },
  { key: "state", label: "State" },
  { key: "party", label: "Party" },
];

interface RmPrdAnalyticsConfigProps {
  localConfig: {
    title?: string;
    visibleFilters?: Partial<Record<RmPrdFilterKey, boolean>>;
    viewMode?: RmPrdViewMode;
    managerRoles?: string[];
  };
  handleInputChange: (field: string, value: string | number | boolean | Record<string, boolean> | string[]) => void;
}

export const RmPrdAnalyticsConfig: React.FC<RmPrdAnalyticsConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  // a key absent from visibleFilters defaults to visible, so existing pages
  // saved before this option existed keep showing every filter
  const isVisible = (key: RmPrdFilterKey) => localConfig.visibleFilters?.[key] !== false;

  const setVisible = (key: RmPrdFilterKey, next: boolean) => {
    handleInputChange("visibleFilters", { ...localConfig.visibleFilters, [key]: next });
  };

  // every role the tenant has defined (Team Lead, Zonal Head, GM, ...) —
  // the manager picks which of these actually count as "manager" for the
  // Manager filter dropdown, since "anyone with a direct report" pulls in
  // wrong/unexpected names
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    membershipService
      .getRoles()
      .then((roles) => {
        if (!cancelled) setAllRoles(roles);
      })
      .catch(() => {
        // picker just shows nothing to check — existing managerRoles value is untouched
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedManagerRoleKeys = new Set(localConfig.managerRoles ?? []);
  const toggleManagerRole = (roleKey: string, checked: boolean) => {
    const next = new Set(selectedManagerRoleKeys);
    if (checked) next.add(roleKey);
    else next.delete(roleKey);
    handleInputChange("managerRoles", Array.from(next));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RM PRD Analytics Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title || ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Optional heading shown above the dashboard"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="viewMode">View</Label>
          <Select
            value={localConfig.viewMode ?? "manager"}
            onValueChange={(value) => handleInputChange("viewMode", value)}
          >
            <SelectTrigger id="viewMode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manager">Manager — whole team</SelectItem>
              <SelectItem value="asm">ASM — only my team</SelectItem>
              <SelectItem value="rm">RM — signed-in RM's own data only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            ASM view narrows every number to whoever is signed in plus everyone under them (direct and
            indirect reports) — the Manager filter and "By RM" table stay visible since there's still a
            team to break down. RM view narrows every number to whoever is signed in, and hides the
            Manager filter and the "By RM" table (both meaningless for a one-person view). Use ASM/RM on
            a page that person themselves has access to, not a manager-of-managers' whole-team dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Filters</Label>
          <div className="space-y-3 rounded-md border border-border p-3">
            {FILTER_OPTIONS.filter(
              (filter) => filter.key !== "manager" || localConfig.viewMode !== "rm"
            ).map((filter) => (
              <div key={filter.key} className="flex items-center justify-between gap-2">
                <Label htmlFor={`filter-${filter.key}`} className="text-sm font-normal">
                  {filter.label}
                </Label>
                <Switch
                  id={`filter-${filter.key}`}
                  checked={isVisible(filter.key)}
                  onCheckedChange={(next) => setVisible(filter.key, next)}
                />
              </div>
            ))}
          </div>
        </div>

        {localConfig.viewMode !== "rm" && (
          <div className="space-y-2">
            <Label>Manager Roles</Label>
            <p className="text-xs text-muted-foreground">
              Which roles count as "manager" for the Manager filter dropdown. Tenants often have several
              manager-shaped roles (Team Lead, Zonal Head, GM, ...) — pick the ones that should show up.
              None selected falls back to "anyone with a direct report."
            </p>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-3">
              {rolesLoading ? (
                <p className="text-sm text-muted-foreground">Loading roles…</p>
              ) : allRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles found for this tenant.</p>
              ) : (
                allRoles
                  .filter((role) => Boolean(role.key))
                  .map((role) => {
                  const roleKey = role.key as string;
                  return (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`manager-role-${role.id}`}
                        checked={selectedManagerRoleKeys.has(roleKey)}
                        onCheckedChange={(next) => toggleManagerRole(roleKey, next === true)}
                      />
                      <Label htmlFor={`manager-role-${role.id}`} className="text-sm font-normal">
                        {role.name}
                      </Label>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
