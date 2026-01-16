import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TeamDashboardConfigProps {
  localConfig: {
    title?: string;
    allottedLeads?: number;
    trailTarget?: number;
    totalTeamSize?: number;
    showDatePicker?: boolean;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const TeamDashboardConfig: React.FC<TeamDashboardConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Dashboard Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title || ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter dashboard title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="allottedLeads">Allotted Leads</Label>
          <Input
            id="allottedLeads"
            type="number"
            value={localConfig.allottedLeads || 1600}
            onChange={(e) => handleInputChange("allottedLeads", parseInt(e.target.value) || 1600)}
            placeholder="1600"
          />
          <p className="text-xs text-muted-foreground">
            Total number of leads allotted to the team
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trailTarget">Trail Target</Label>
          <Input
            id="trailTarget"
            type="number"
            value={localConfig.trailTarget || 160}
            onChange={(e) => handleInputChange("trailTarget", parseInt(e.target.value) || 160)}
            placeholder="160"
          />
          <p className="text-xs text-muted-foreground">
            Target number of trials to activate
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalTeamSize">Total Team Size</Label>
          <Input
            id="totalTeamSize"
            type="number"
            value={localConfig.totalTeamSize || 18}
            onChange={(e) => handleInputChange("totalTeamSize", parseInt(e.target.value) || 18)}
            placeholder="18"
          />
          <p className="text-xs text-muted-foreground">
            Total number of team members (for attendance calculation)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="showDatePicker">Show Date Picker</Label>
            <p className="text-xs text-muted-foreground">
              Allow users to filter by date
            </p>
          </div>
          <Switch
            id="showDatePicker"
            checked={localConfig.showDatePicker !== false}
            onCheckedChange={(checked) => handleInputChange("showDatePicker", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
