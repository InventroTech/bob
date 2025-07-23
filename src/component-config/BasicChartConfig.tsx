import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BasicChartConfigProps {
  localConfig: {
    apiEndpoint: string;
    title: string;
    refreshInterval: number;
  };
  handleInputChange: (field: string, value: string | number) => void;
}

export const BasicChartConfig: React.FC<BasicChartConfigProps> = ({ localConfig, handleInputChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>API Endpoint</Label>
        <Input
          value={localConfig.apiEndpoint}
          onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
          placeholder="/api/analytics/data"
        />
      </div>
      <div>
        <Label>Title</Label>
        <Input
          value={localConfig.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Chart Title"
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