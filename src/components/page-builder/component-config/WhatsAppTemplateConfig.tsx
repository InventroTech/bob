import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WhatsAppTemplateConfigProps {
  localConfig: {
    apiEndpoint?: string;
    title?: string;
  };
  handleInputChange: (field: string, value: string | number | boolean) => void;
}

export const WhatsAppTemplateConfig: React.FC<WhatsAppTemplateConfigProps> = ({
  localConfig,
  handleInputChange,
}) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Template Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Component Title</Label>
          <Input
            id="title"
            value={localConfig.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., WhatsApp Template"
          />
          <p className="text-xs text-gray-500">
            Title displayed in the component header
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiEndpoint">POST API Endpoint</Label>
          <Input
            id="apiEndpoint"
            value={localConfig.apiEndpoint || ''}
            onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
            placeholder="e.g., /api/whatsapp-templates"
          />
          <p className="text-xs text-gray-500">
            API endpoint for creating WhatsApp templates (POST request)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};


