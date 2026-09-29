import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RmPrdFilterKey, RmPrdViewMode } from "@/components/page-builder/RmPrdAnalyticsComponent";

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
  };
  handleInputChange: (field: string, value: string | number | boolean | Record<string, boolean>) => void;
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
              <SelectItem value="rm">RM — signed-in RM's own data only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            RM view narrows every number to whoever is signed in, and hides the Manager filter and the
            "By RM" table (both meaningless for a one-person view). Use it on a page the RM themselves
            has access to, not a manager's team dashboard.
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
      </CardContent>
    </Card>
  );
};
