import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Briefcase, Database } from 'lucide-react';

export interface JobManagerComponentConfig {
  // Basic Settings
  title?: string;
  showCreateButton?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
  
  // API Configuration
  apiEndpoint?: string;
  updateEndpoint?: string; // Separate endpoint for updates (optional, falls back to apiEndpoint)
  apiMode?: 'renderer' | 'direct';
  apiBaseUrl?: string; // Full URL prefix for direct mode
  useDemoData?: boolean;
  tenantSlug?: string;
  
  // Data Mapping
  dataMapping?: {
    idField?: string;
    titleField?: string;
    descriptionField?: string;
    departmentField?: string;
    locationField?: string;
    typeField?: string;
    statusField?: string;
    deadlineField?: string;
    createdAtField?: string;
  };
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

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="useDemoData" className="text-sm font-medium text-gray-700">Use Demo Data</Label>
            <Switch
              id="useDemoData"
              checked={config.useDemoData || false}
              onCheckedChange={(checked) => onConfigChange('useDemoData', checked)}
            />
          </div>
          
          <div>
            <Label htmlFor="apiEndpoint" className="text-sm font-medium text-gray-700">API Endpoint</Label>
            <Input
              id="apiEndpoint"
              value={config.apiEndpoint || ''}
              onChange={(e) => onConfigChange('apiEndpoint', e.target.value)}
              placeholder="/api/jobs"
              className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              disabled={config.useDemoData}
            />
            {config.useDemoData && (
              <p className="text-xs text-gray-500 mt-1">Demo data mode is enabled. API endpoint is disabled.</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Used for both GET (fetch jobs) and POST (create jobs) requests
            </p>
          </div>

          <div>
            <Label htmlFor="updateEndpoint" className="text-sm font-medium text-gray-700">Update Endpoint (Optional)</Label>
            <Input
              id="updateEndpoint"
              value={config.updateEndpoint || ''}
              onChange={(e) => onConfigChange('updateEndpoint', e.target.value)}
              placeholder="/api/jobs/update or leave empty to use API Endpoint"
              className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              disabled={config.useDemoData}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate endpoint for PUT/PATCH (update jobs). If empty, uses API Endpoint above.
            </p>
          </div>
          
          <div>
            <Label htmlFor="apiMode" className="text-sm font-medium text-gray-700">API Mode</Label>
            <Select
              value={config.apiMode || 'renderer'}
              onValueChange={(value) => onConfigChange('apiMode', value)}
              disabled={config.useDemoData}
            >
              <SelectTrigger className="mt-2 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renderer">Renderer (Uses VITE_RENDER_API_URL)</SelectItem>
                <SelectItem value="direct">Direct (Full URL with prefix)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Renderer: Uses environment variable. Direct: Use custom base URL.
            </p>
          </div>

          {config.apiMode === 'direct' && (
            <div>
              <Label htmlFor="apiBaseUrl" className="text-sm font-medium text-gray-700">API Base URL</Label>
              <Input
                id="apiBaseUrl"
                value={config.apiBaseUrl || ''}
                onChange={(e) => onConfigChange('apiBaseUrl', e.target.value)}
                placeholder="https://api.example.com"
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                disabled={config.useDemoData}
              />
              <p className="text-xs text-gray-500 mt-1">
                Full base URL (e.g., https://api.example.com). Endpoint will be appended.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="tenantSlug" className="text-sm font-medium text-gray-700">Tenant Slug</Label>
            <Input
              id="tenantSlug"
              value={config.tenantSlug || ''}
              onChange={(e) => onConfigChange('tenantSlug', e.target.value)}
              placeholder="my-tenant-slug"
              className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              disabled={config.useDemoData}
            />
            <p className="text-xs text-gray-500 mt-1">
              Sent as X-Tenant-Slug header in API requests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Map your API response fields to the expected job data structure.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="idField" className="text-sm font-medium text-gray-700">ID Field</Label>
              <Input
                id="idField"
                value={config.dataMapping?.idField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  idField: e.target.value 
                })}
                placeholder="id"
                className="mt-1 text-sm"
                disabled={config.useDemoData}
              />
            </div>
            
            <div>
              <Label htmlFor="titleField" className="text-sm font-medium text-gray-700">Title Field</Label>
              <Input
                id="titleField"
                value={config.dataMapping?.titleField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  titleField: e.target.value 
                })}
                placeholder="title"
                className="mt-1 text-sm"
                disabled={config.useDemoData}
              />
            </div>
            
            <div>
              <Label htmlFor="descriptionField" className="text-sm font-medium text-gray-700">Description Field</Label>
              <Input
                id="descriptionField"
                value={config.dataMapping?.descriptionField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  descriptionField: e.target.value 
                })}
                placeholder="description"
                className="mt-1 text-sm"
                disabled={config.useDemoData}
              />
            </div>
            
            <div>
              <Label htmlFor="departmentField" className="text-sm font-medium text-gray-700">Department Field</Label>
              <Input
                id="departmentField"
                value={config.dataMapping?.departmentField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  departmentField: e.target.value 
                })}
                placeholder="department"
                className="mt-1 text-sm"
                disabled={config.useDemoData}
              />
            </div>
            
            <div>
              <Label htmlFor="locationField" className="text-sm font-medium text-gray-700">Location Field</Label>
              <Input
                id="locationField"
                value={config.dataMapping?.locationField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  locationField: e.target.value 
                })}
                placeholder="location"
                className="mt-1 text-sm"
                disabled={config.useDemoData}
              />
            </div>
            
            <div>
              <Label htmlFor="statusField" className="text-sm font-medium text-gray-700">Status Field</Label>
              <Input
                id="statusField"
                value={config.dataMapping?.statusField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  statusField: e.target.value 
                })}
                placeholder="status"
                className="mt-1 text-sm"
                disabled={config.useDemoData}
              />
            </div>
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
