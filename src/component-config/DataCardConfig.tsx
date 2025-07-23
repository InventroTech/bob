import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface DataCardConfigProps {
  localConfig: {
    apiEndpoint: string;
    title: string;
    description: string;
    refreshInterval: number;
  };
  handleInputChange: (field: string, value: string | number) => void;
}

export const DataCardConfig: React.FC<DataCardConfigProps> = ({ localConfig, handleInputChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>API Endpoint</Label>
        <Input
          value={localConfig.apiEndpoint}
          onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
          placeholder="/api/cards"
        />
      </div>
      <div>
        <Label>Title</Label>
        <Input
          value={localConfig.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Card Title"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={localConfig.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Card Description"
        />
      </div>
      <div>
        <Label>Refresh Interval (seconds)</Label>
        <Input
          type="number"
          value={localConfig.refreshInterval}
          onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value) || 0)}
          placeholder="0 for no refresh"
        />
      </div>
    </div>
  );
}; 