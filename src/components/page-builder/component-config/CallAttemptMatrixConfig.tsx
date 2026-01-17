import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CallAttemptMatrixConfigProps {
  localConfig: {
    apiEndpoint?: string;
    leadTypesEndpoint?: string;
    title?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const CallAttemptMatrixConfig: React.FC<CallAttemptMatrixConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Attempt Matrix Configuration</CardTitle>
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
          <Label htmlFor="apiEndpoint">Call Attempt Matrix API Endpoint</Label>
          <Input
            id="apiEndpoint"
            value={localConfig.apiEndpoint || ""}
            onChange={(e) => handleInputChange("apiEndpoint", e.target.value)}
            placeholder="/crm-records/call-attempt-matrix/"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for CRUD operations on call attempt matrix. Leave empty to use default: /crm-records/call-attempt-matrix/
          </p>
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
            API endpoint to fetch available lead types. Leave empty to use default: /user-settings/lead-types/
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
