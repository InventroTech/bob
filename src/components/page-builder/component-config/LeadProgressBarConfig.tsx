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
    progressBarColor?: string;
  };
  onConfigChange: (config: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
    targetCount?: number;
    segmentCount?: number;
    refreshInterval?: number;
    progressBarColor?: string;
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
    progressBarColor: config.progressBarColor || '#1f2937', // Default gray-800
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

        <div className="space-y-2">
          <Label htmlFor="progressBarColor">Progress Bar Color</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                id="progressBarColor"
                type="color"
                value={localConfig.progressBarColor}
                onChange={(e) => handleChange('progressBarColor', e.target.value)}
                className="w-16 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={localConfig.progressBarColor}
                onChange={(e) => handleChange('progressBarColor', e.target.value)}
                placeholder="#1f2937"
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-8 gap-2">
              {[
                '#1f2937', // gray-800
                '#3b82f6', // blue-500
                '#10b981', // green-500
                '#f59e0b', // amber-500
                '#ef4444', // red-500
                '#8b5cf6', // violet-500
                '#ec4899', // pink-500
                '#06b6d4', // cyan-500
                '#6366f1', // indigo-500
                '#14b8a6', // teal-500
                '#f97316', // orange-500
                '#84cc16', // lime-500
                '#eab308', // yellow-500
                '#22c55e', // emerald-500
                '#0ea5e9', // sky-500
                '#a855f7', // purple-500
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChange('progressBarColor', color)}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    localConfig.progressBarColor === color
                      ? 'border-gray-900 scale-110 shadow-md'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Choose a color for the progress bar. You can use the color picker or select from the palette.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
