import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DynamicScoringComponentConfig } from '../DynamicScoringComponent';

interface DynamicScoringConfigProps {
  config: DynamicScoringComponentConfig;
  onConfigChange: (config: DynamicScoringComponentConfig) => void;
}

export const DynamicScoringConfig: React.FC<DynamicScoringConfigProps> = ({
  config,
  onConfigChange
}) => {
  const [localConfig, setLocalConfig] = useState<DynamicScoringComponentConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const updateConfig = (updates: Partial<DynamicScoringComponentConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
          <CardDescription>Configure the basic display and behavior of the scoring component</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={localConfig.title || ''}
              onChange={(e) => updateConfig({ title: e.target.value })}
              placeholder="Dynamic Scoring"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={localConfig.description || ''}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="Configure scoring rules and calculate scores"
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showTitle">Show Title</Label>
              <p className="text-body-sm text-gray-500">Display the title in the component</p>
            </div>
            <Switch
              id="showTitle"
              checked={localConfig.showTitle !== false}
              onCheckedChange={(checked) => updateConfig({ showTitle: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showDescription">Show Description</Label>
              <p className="text-body-sm text-gray-500">Display the description in the component</p>
            </div>
            <Switch
              id="showDescription"
              checked={localConfig.showDescription !== false}
              onCheckedChange={(checked) => updateConfig({ showDescription: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Configure API endpoints for fetching attributes and calculating scores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiMode">API Mode</Label>
            <Select
              value={localConfig.apiMode || 'renderer'}
              onValueChange={(value: 'localhost' | 'renderer') => updateConfig({ apiMode: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renderer">Renderer</SelectItem>
                <SelectItem value="localhost">Localhost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="attributesEndpoint">Attributes Endpoint</Label>
            <Input
              id="attributesEndpoint"
              value={localConfig.attributesEndpoint || ''}
              onChange={(e) => updateConfig({ attributesEndpoint: e.target.value })}
              placeholder="/api/attributes"
              className="mt-2"
            />
            <p className="text-body-sm text-gray-500 mt-1">
              GET endpoint to fetch available attributes (e.g., /api/attributes)
            </p>
          </div>

          <div>
            <Label htmlFor="scoringEndpoint">Scoring Endpoint</Label>
            <Input
              id="scoringEndpoint"
              value={localConfig.scoringEndpoint || ''}
              onChange={(e) => updateConfig({ scoringEndpoint: e.target.value })}
              placeholder="/api/calculate-score"
              className="mt-2"
            />
            <p className="text-body-sm text-gray-500 mt-1">
              POST endpoint to calculate the score (e.g., /api/calculate-score)
            </p>
          </div>

          <div>
            <Label htmlFor="tenantSlug">Tenant Slug (Optional)</Label>
            <Input
              id="tenantSlug"
              value={localConfig.tenantSlug || ''}
              onChange={(e) => updateConfig({ tenantSlug: e.target.value })}
              placeholder="Leave empty to use default tenant"
              className="mt-2"
            />
            <p className="text-body-sm text-gray-500 mt-1">
              Override the default tenant slug for API requests
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

