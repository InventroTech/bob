import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadAssignmentConfigProps {
  localConfig: {
    leadTypesEndpoint?: string;
    rmsEndpoint?: string;
    assignmentsEndpoint?: string;
    title?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const LeadAssignmentConfig: React.FC<LeadAssignmentConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Assignment Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title || ""}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter component title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadTypesEndpoint">Lead Types API Endpoint</Label>
          <Input
            id="leadTypesEndpoint"
            value={localConfig.leadTypesEndpoint || ""}
            onChange={(e) => handleInputChange("leadTypesEndpoint", e.target.value)}
            placeholder="/user-settings/lead-types/"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint to fetch lead types. Leave empty to use default: /user-settings/lead-types/
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rmsEndpoint">RMs (Users) API Endpoint</Label>
          <Input
            id="rmsEndpoint"
            value={localConfig.rmsEndpoint || ""}
            onChange={(e) => handleInputChange("rmsEndpoint", e.target.value)}
            placeholder="/accounts/users/assignees-by-role/?role=RM"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint to fetch Relationship Managers/users. Leave empty to use default: /accounts/users/assignees-by-role/?role=RM
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignmentsEndpoint">Assignments API Endpoint</Label>
          <Input
            id="assignmentsEndpoint"
            value={localConfig.assignmentsEndpoint || ""}
            onChange={(e) => handleInputChange("assignmentsEndpoint", e.target.value)}
            placeholder="/user-settings/lead-type-assignments/"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint to save/update lead type assignments. Leave empty to use default: /user-settings/lead-type-assignments/
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

