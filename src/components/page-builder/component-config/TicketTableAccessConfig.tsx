import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { membershipService, type Role } from "@/lib/api/services/membership";

interface TicketTableAccessConfigProps {
  localConfig: {
    requireFiltersBeforeShowing?: boolean;
    requireFiltersRoles?: string[];
  };
  handleInputChange: (field: string, value: boolean | string[]) => void;
}

export const TicketTableAccessConfig: React.FC<TicketTableAccessConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  const enabled = localConfig.requireFiltersBeforeShowing === true;

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
        // picker just shows nothing to check — the saved role list is untouched
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRoleKeys = new Set(localConfig.requireFiltersRoles ?? []);
  const toggleRole = (roleKey: string, checked: boolean) => {
    const next = new Set(selectedRoleKeys);
    if (checked) next.add(roleKey);
    else next.delete(roleKey);
    handleInputChange("requireFiltersRoles", Array.from(next));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="requireFiltersBeforeShowing" className="text-sm font-normal">
            Show tickets only after filters are applied
          </Label>
          <Switch
            id="requireFiltersBeforeShowing"
            checked={enabled}
            onCheckedChange={(next) => handleInputChange("requireFiltersBeforeShowing", next)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          When on, the list stays empty until the user applies at least one filter. Search alone
          doesn't count, and Reset Filters empties the list again.
        </p>

        {enabled && (
          <div className="space-y-2">
            <Label>Apply to roles</Label>
            <p className="text-xs text-muted-foreground">
              Only users with these roles must apply a filter first. None selected applies it to everyone.
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
                          id={`require-filters-role-${role.id}`}
                          checked={selectedRoleKeys.has(roleKey)}
                          onCheckedChange={(next) => toggleRole(roleKey, next === true)}
                        />
                        <Label htmlFor={`require-filters-role-${role.id}`} className="text-sm font-normal">
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
