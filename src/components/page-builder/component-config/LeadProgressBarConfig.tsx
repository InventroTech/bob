import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeadProgressBarConfigProps {
  config: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
    targetCount?: number;
    segmentCount?: number;
    refreshInterval?: number;
  };
  onConfigChange: (config: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
    targetCount?: number;
    segmentCount?: number;
    refreshInterval?: number;
  }) => void;
}

export const LeadProgressBarConfig: React.FC<LeadProgressBarConfigProps> = ({
  config,
  onConfigChange,
}) => {
  const [localConfig, setLocalConfig] = useState({
    apiEndpoint: config.apiEndpoint || '',
    statusDataApiEndpoint: config.statusDataApiEndpoint || '/get-lead-status',
    title: config.title || 'Target Progress',
    targetCount: config.targetCount || 10,
    segmentCount: config.segmentCount || 8,
    refreshInterval: config.refreshInterval || 5000,
  });

  useEffect(() => {
    onConfigChange(localConfig);
  }, [localConfig, onConfigChange]);

  const handleChange = (field: string, value: any) => {
    setLocalConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Progress Bar Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={localConfig.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Target Progress"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="statusDataApiEndpoint">Status Data API Endpoint</Label>
          <Input
            id="statusDataApiEndpoint"
            value={localConfig.statusDataApiEndpoint}
            onChange={(e) => handleChange('statusDataApiEndpoint', e.target.value)}
            placeholder="e.g., /get-lead-status"
          />
          <p className="text-xs text-gray-500">
            API endpoint to fetch lead statistics
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiEndpoint">Custom API Endpoint (Optional)</Label>
          <Input
            id="apiEndpoint"
            value={localConfig.apiEndpoint}
            onChange={(e) => handleChange('apiEndpoint', e.target.value)}
            placeholder="e.g., https://api.example.com/leads"
          />
          <p className="text-xs text-gray-500">
            Override the default API URL. Leave empty to use default.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetCount">Target Count</Label>
          <Input
            id="targetCount"
            type="number"
            value={localConfig.targetCount}
            onChange={(e) => handleChange('targetCount', parseInt(e.target.value) || 10)}
            placeholder="10"
            min="1"
          />
          <p className="text-xs text-gray-500">
            Target number of trial activations for progress calculation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="segmentCount">Number of Segments</Label>
          <Input
            id="segmentCount"
            type="number"
            value={localConfig.segmentCount}
            onChange={(e) => handleChange('segmentCount', parseInt(e.target.value) || 8)}
            placeholder="8"
            min="1"
            max="20"
          />
          <p className="text-xs text-gray-500">
            Number of segments in the progress bar (1-20)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="refreshInterval">Refresh Interval (ms)</Label>
          <Input
            id="refreshInterval"
            type="number"
            value={localConfig.refreshInterval}
            onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value) || 5000)}
            placeholder="5000"
            min="1000"
            step="1000"
          />
          <p className="text-xs text-gray-500">
            How often to refresh the progress (in milliseconds). Default: 5000ms (5 seconds)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
