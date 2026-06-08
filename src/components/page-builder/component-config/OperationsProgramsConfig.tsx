import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface OperationsProgramsConfigProps {
  localConfig: {
    apiEndpoint?: string;
    title?: string;
    categories?: string;
    defaultLeadEndpoint?: string;
    defaultSupportTicketEndpoint?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const OperationsProgramsConfig: React.FC<OperationsProgramsConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations & Programs Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Component Title</Label>
          <Input
            id="title"
            value={localConfig.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Operations & Programs"
          />
          <p className="text-xs text-gray-500">
            Title displayed in the component header
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultLeadEndpoint">Default Lead Push Endpoint</Label>
          <Input
            id="defaultLeadEndpoint"
            value={localConfig.defaultLeadEndpoint || ''}
            onChange={(e) => handleInputChange('defaultLeadEndpoint', e.target.value)}
            placeholder="e.g., crm-records/records/"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultSupportTicketEndpoint">Default Support Ticket Dump Endpoint</Label>
          <Input
            id="defaultSupportTicketEndpoint"
            value={localConfig.defaultSupportTicketEndpoint || ''}
            onChange={(e) => handleInputChange('defaultSupportTicketEndpoint', e.target.value)}
            placeholder="e.g., support-ticket/dump-ticket-webhook/"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categories">Categories (comma-separated)</Label>
          <Textarea
            id="categories"
            value={localConfig.categories || ''}
            onChange={(e) => handleInputChange('categories', e.target.value)}
            placeholder="e.g., DB interaction, API Calls, Scripts"
            rows={3}
          />
          <p className="text-xs text-gray-500">
            List of category tabs (comma-separated). Default: DB interaction, API Calls, Scripts
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
