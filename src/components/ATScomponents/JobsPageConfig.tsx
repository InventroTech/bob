import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Users, Filter, Layout, Database } from 'lucide-react';

interface JobsPageComponentConfig {
  // Basic Settings
  title?: string;
  description?: string;
  
  // API Configuration
  apiEndpoint?: string;
  apiPrefix?: 'supabase' | 'renderer';
  useDemoData?: boolean;
  
  // Display Options
  showFilters?: boolean;
  showStats?: boolean;
  layout?: 'grid' | 'list';
  maxJobs?: number;
  allowApplications?: boolean;
  
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
    salaryField?: string;
    createdAtField?: string;
  };
}

interface JobsPageConfigProps {
  config: JobsPageComponentConfig;
  onConfigChange: (key: string, value: any) => void;
}

export const JobsPageConfigComponent: React.FC<JobsPageConfigProps> = ({
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
            Jobs Page Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              value={config.title || ''}
              onChange={(e) => onConfigChange('title', e.target.value)}
              placeholder="Available Positions"
            />
          </div>

          <div>
            <Label htmlFor="description">Page Description</Label>
            <Textarea
              id="description"
              value={config.description || ''}
              onChange={(e) => onConfigChange('description', e.target.value)}
              placeholder="Discover exciting opportunities and take the next step in your career"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="maxJobs">Maximum Jobs to Display</Label>
            <Input
              id="maxJobs"
              type="number"
              min="1"
              max="50"
              value={config.maxJobs || 10}
              onChange={(e) => onConfigChange('maxJobs', parseInt(e.target.value) || 10)}
              placeholder="10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Limits the number of jobs shown (includes demo + created jobs)
            </p>
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
          </div>
          
          <div>
            <Label htmlFor="apiPrefix" className="text-sm font-medium text-gray-700">API Prefix</Label>
            <Select
              value={config.apiPrefix || 'supabase'}
              onValueChange={(value) => onConfigChange('apiPrefix', value)}
              disabled={config.useDemoData}
            >
              <SelectTrigger className="mt-2 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supabase">Supabase</SelectItem>
                <SelectItem value="renderer">Renderer API</SelectItem>
              </SelectContent>
            </Select>
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
              <Label htmlFor="typeField" className="text-sm font-medium text-gray-700">Type Field</Label>
              <Input
                id="typeField"
                value={config.dataMapping?.typeField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  typeField: e.target.value 
                })}
                placeholder="type"
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
            
            <div>
              <Label htmlFor="salaryField" className="text-sm font-medium text-gray-700">Salary Field</Label>
              <Input
                id="salaryField"
                value={config.dataMapping?.salaryField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  salaryField: e.target.value 
                })}
                placeholder="salary"
                className="mt-1 text-sm"
                disabled={config.useDemoData}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout & Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Layout & Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showFilters">Show Search Filters</Label>
              <p className="text-sm text-gray-500">
                Display search and filter options for job seekers
              </p>
            </div>
            <Switch
              id="showFilters"
              checked={config.showFilters ?? true}
              onCheckedChange={(checked) => onConfigChange('showFilters', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showStats">Show Statistics</Label>
              <p className="text-sm text-gray-500">
                Display job count and application statistics
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

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowApplications">Allow Applications</Label>
              <p className="text-sm text-gray-500">
                Enable job seekers to submit applications through this component
              </p>
            </div>
            <Switch
              id="allowApplications"
              checked={config.allowApplications ?? true}
              onCheckedChange={(checked) => onConfigChange('allowApplications', checked)}
            />
          </div>

          {!config.allowApplications && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> When applications are disabled, the "Apply Now" button will show "View Details" instead and won't open the application form.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
              <div>
                <p className="font-medium text-gray-900">Demo Jobs</p>
                <p className="text-gray-600">Includes sample positions (Frontend Developer, Product Manager, UX Designer, Marketing Intern)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
              <div>
                <p className="font-medium text-gray-900">Created Jobs</p>
                <p className="text-gray-600">Jobs created through the Job Manager component (only active jobs are shown)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Job Display</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Company logos and branding</li>
                <li>• Salary ranges and benefits</li>
                <li>• Application deadlines</li>
                <li>• Job requirements preview</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Search & Filter</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Keyword search</li>
                <li>• Location filtering</li>
                <li>• Job type filtering</li>
                <li>• Department filtering</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Applications</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Dynamic application forms</li>
                <li>• Form validation</li>
                <li>• Application tracking</li>
                <li>• Success notifications</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Integration</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Works with Job Manager</li>
                <li>• Modal Button compatibility</li>
                <li>• Responsive design</li>
                <li>• Configurable display</li>
              </ul>
            </div>
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
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
              <div>
                <p className="font-medium text-gray-900">Add to Page</p>
                <p>Drag this component onto your page where you want to display job listings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
              <div>
                <p className="font-medium text-gray-900">Configure Display</p>
                <p>Customize the title, description, layout, and which features to show</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
              <div>
                <p className="font-medium text-gray-900">Manage Jobs</p>
                <p>Use the Job Manager component to create and manage job postings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
              <div>
                <p className="font-medium text-gray-900">Go Live</p>
                <p>Job seekers can now browse and apply to positions through your page</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
