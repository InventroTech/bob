import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadCardCarouselConfigProps {
  localConfig: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const LeadCardCarouselConfig: React.FC<LeadCardCarouselConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Card Carousel Configuration</CardTitle>
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
          <Label htmlFor="apiEndpoint">Leads API Endpoint</Label>
          <Input
            id="apiEndpoint"
            value={localConfig.apiEndpoint || ""}
            onChange={(e) => handleInputChange("apiEndpoint", e.target.value)}
            placeholder="e.g., /api/leads"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for fetching leads (e.g., /api/leads)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="statusDataApiEndpoint">Status Data API Endpoint</Label>
          <Input
            id="statusDataApiEndpoint"
            value={localConfig.statusDataApiEndpoint || ""}
            onChange={(e) => handleInputChange("statusDataApiEndpoint", e.target.value)}
            placeholder="e.g., /get-lead-status"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for fetching initial lead status and statistics
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
