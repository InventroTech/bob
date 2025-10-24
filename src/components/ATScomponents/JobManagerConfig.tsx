import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Briefcase } from 'lucide-react';

interface JobManagerComponentConfig {
  title?: string;
  showCreateButton?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
}

interface JobManagerConfigProps {
  config: JobManagerComponentConfig;
  onConfigChange: (key: string, value: any) => void;
}

export const JobManagerConfigComponent: React.FC<JobManagerConfigProps> = ({
  config,
  onConfigChange
}) => {
  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Job Manager Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Component Title</Label>
            <Input
              id="title"
              value={config.title || ''}
              onChange={(e) => onConfigChange('title', e.target.value)}
              placeholder="Job Management"
            />
          </div>

          <div>
            <Label htmlFor="layout">Layout Style</Label>
            <Select
              value={config.layout || 'grid'}
              onValueChange={(value) => onConfigChange('layout', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid Layout</SelectItem>
                <SelectItem value="list">List Layout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="maxJobs">Maximum Jobs to Display</Label>
            <Input
              id="maxJobs"
              type="number"
              min="1"
              max="100"
              value={config.maxJobs || 50}
              onChange={(e) => onConfigChange('maxJobs', parseInt(e.target.value) || 50)}
              placeholder="50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Display Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showCreateButton">Show Create Button</Label>
              <p className="text-sm text-gray-500">
                Allow users to create new jobs from this component
              </p>
            </div>
            <Switch
              id="showCreateButton"
              checked={config.showCreateButton ?? true}
              onCheckedChange={(checked) => onConfigChange('showCreateButton', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showStats">Show Statistics</Label>
              <p className="text-sm text-gray-500">
                Display job counts and application statistics
              </p>
            </div>
            <Switch
              id="showStats"
              checked={config.showStats ?? true}
              onCheckedChange={(checked) => onConfigChange('showStats', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
              <div>
                <p className="font-medium text-gray-900">Create Jobs</p>
                <p>Use this component to create job postings with custom application forms</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
              <div>
                <p className="font-medium text-gray-900">Manage Applications</p>
                <p>Edit forms, preview applications, and manage job status</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
              <div>
                <p className="font-medium text-gray-900">Link to Buttons</p>
                <p>Use Modal Button components to link to these job applications</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Job Management</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Create job postings</li>
                <li>• Set application deadlines</li>
                <li>• Manage job status</li>
                <li>• Department & location info</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Form Builder</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Custom application forms</li>
                <li>• Multiple question types</li>
                <li>• Required field validation</li>
                <li>• Form preview & editing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Analytics</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Application tracking</li>
                <li>• Job statistics</li>
                <li>• Deadline monitoring</li>
                <li>• Status overview</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Integration</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Works with Modal Buttons</li>
                <li>• Local storage persistence</li>
                <li>• Drag & drop compatible</li>
                <li>• Responsive design</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
