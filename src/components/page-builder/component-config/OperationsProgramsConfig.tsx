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
          <Label htmlFor="apiEndpoint">API Endpoint</Label>
          <Input
            id="apiEndpoint"
            value={localConfig.apiEndpoint || ''}
            onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
            placeholder="e.g., /api/operations"
          />
          <p className="text-xs text-gray-500">
            API endpoint for operations (optional, defaults to localStorage)
          </p>
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
