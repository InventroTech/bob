import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TicketCarouselConfigProps {
  localConfig: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    apiPrefix?: 'supabase' | 'renderer';
    title?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const TicketCarouselConfig: React.FC<TicketCarouselConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Carousel Configuration</CardTitle>
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
          <Label htmlFor="apiEndpoint">Tickets API Endpoint</Label>
          <Input
            id="apiEndpoint"
            value={localConfig.apiEndpoint || ""}
            onChange={(e) => handleInputChange("apiEndpoint", e.target.value)}
            placeholder="e.g., /api/tickets"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for fetching tickets (e.g., /api/tickets)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiPrefix">API Prefix</Label>
          <Select
            value={localConfig.apiPrefix || "supabase"}
            onValueChange={(value) => handleInputChange("apiPrefix", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select API Prefix" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supabase">Supabase</SelectItem>
              <SelectItem value="renderer">Renderer</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the API service to use for fetching data
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="statusDataApiEndpoint">Status Data API Endpoint</Label>
          <Input
            id="statusDataApiEndpoint"
            value={localConfig.statusDataApiEndpoint || ""}
            onChange={(e) => handleInputChange("statusDataApiEndpoint", e.target.value)}
            placeholder="e.g., /get-ticket-status"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for fetching initial ticket status and statistics
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
