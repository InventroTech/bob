import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeadCardCarouselConfigProps {
  localConfig: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
    leadAssignmentWebhookUrl?: string;
    whatsappTemplatesApiEndpoint?: string;
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
          <Label htmlFor="apiPrefix">API Prefix</Label>
          <Select
            value={localConfig.apiPrefix || "renderer"}
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
            placeholder="e.g., /get-lead-status"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for fetching initial lead status and statistics
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadAssignmentWebhookUrl">Lead Assignment Webhook URL</Label>
          <Input
            id="leadAssignmentWebhookUrl"
            value={localConfig.leadAssignmentWebhookUrl || ""}
            onChange={(e) => handleInputChange("leadAssignmentWebhookUrl", e.target.value)}
            placeholder="https://your-server.com/api/lead-assigned"
          />
          <p className="text-xs text-muted-foreground">
            Webhook URL to send lead assignment events when a lead is assigned. Events are sent through the backend proxy to avoid CORS issues. Leave empty to disable webhook notifications.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappTemplatesApiEndpoint">WhatsApp Templates API Endpoint</Label>
          <Input
            id="whatsappTemplatesApiEndpoint"
            value={localConfig.whatsappTemplatesApiEndpoint || ""}
            onChange={(e) => handleInputChange("whatsappTemplatesApiEndpoint", e.target.value)}
            placeholder="e.g., /api/whatsapp-templates"
          />
          <p className="text-xs text-muted-foreground">
            API endpoint for fetching WhatsApp message templates (GET request). When configured, clicking the WhatsApp button will open a modal to select a template before opening WhatsApp.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
