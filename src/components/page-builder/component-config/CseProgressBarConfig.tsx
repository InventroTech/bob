import React, { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CseProgressBarConfigProps {
  config: {
    title?: string;
    refreshInterval?: number;
    progressBarColor?: string;
  };
  onConfigChange: (config: {
    title?: string;
    refreshInterval?: number;
    progressBarColor?: string;
  }) => void;
}

export const CseProgressBarConfig: React.FC<CseProgressBarConfigProps> = ({
  config,
  onConfigChange,
}) => {
  const isInitialMount = useRef(true);
  const [localConfig, setLocalConfig] = useState({
    title: config.title || 'CSE Resolve Rate',
    refreshInterval: config.refreshInterval ?? 30000,
    progressBarColor: config.progressBarColor || '#16a34a',
  });

  useEffect(() => {
    setLocalConfig({
      title: config.title || 'CSE Resolve Rate',
      refreshInterval: config.refreshInterval ?? 30000,
      progressBarColor: config.progressBarColor || '#16a34a',
    });
    isInitialMount.current = true;
  }, [config]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onConfigChange(localConfig);
  }, [localConfig, onConfigChange]);

  const handleChange = <K extends keyof typeof localConfig>(
    field: K,
    value: (typeof localConfig)[K]
  ) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSE Progress Bar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cseProgressTitle">Title</Label>
          <Input
            id="cseProgressTitle"
            value={localConfig.title}
            onChange={(e) => handleChange('title', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cseProgressRefresh">Refresh Interval (ms)</Label>
          <Input
            id="cseProgressRefresh"
            type="number"
            min={0}
            step={1000}
            value={localConfig.refreshInterval}
            onChange={(e) => handleChange('refreshInterval', Number(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            How often to refresh progress. Default 30000ms. Also refreshes on ticket assign /
            save.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cseProgressColor">Progress Bar Color</Label>
          <Input
            id="cseProgressColor"
            type="color"
            value={localConfig.progressBarColor}
            onChange={(e) => handleChange('progressBarColor', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
