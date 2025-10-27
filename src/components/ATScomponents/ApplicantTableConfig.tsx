import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Users, Settings, Filter, Eye, Download, Zap } from 'lucide-react';

export interface ApplicantTableConfig {
  title?: string;
  description?: string;
  showJobSelector?: boolean;
  showStats?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  showExport?: boolean;
  showBulkActions?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  showStatusBadges?: boolean;
  showRatings?: boolean;
  showNotes?: boolean;
  showActions?: boolean;
  compactView?: boolean;
  highlightNewApplications?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  columns?: {
    name: boolean;
    email: boolean;
    phone: boolean;
    status: boolean;
    submittedAt: boolean;
    experience: boolean;
    location: boolean;
    salary: boolean;
    rating: boolean;
    actions: boolean;
  };
}

interface ApplicantTableConfigComponentProps {
  config: ApplicantTableConfig;
  onConfigChange: (key: keyof ApplicantTableConfig, value: any) => void;
}

export const ApplicantTableConfigComponent: React.FC<ApplicantTableConfigComponentProps> = ({
  config,
  onConfigChange
}) => {
  const handleColumnChange = (column: keyof NonNullable<ApplicantTableConfig['columns']>, value: boolean) => {
    const currentColumns = config.columns || {
      name: true,
      email: true,
      phone: true,
      status: true,
      submittedAt: true,
      experience: true,
      location: true,
      salary: true,
      rating: true,
      actions: true
    };
    
    onConfigChange('columns', {
      ...currentColumns,
      [column]: value
    });
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Basic Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">Title</Label>
            <Input
              id="title"
              value={config.title || ''}
              onChange={(e) => onConfigChange('title', e.target.value)}
              placeholder="Job Applications"
              className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
            />
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
            <Textarea
              id="description"
              value={config.description || ''}
              onChange={(e) => onConfigChange('description', e.target.value)}
              placeholder="Manage and review job applications"
              rows={2}
              className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Display Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showJobSelector" className="text-sm font-medium text-gray-700">Job Selector</Label>
              <Switch
                id="showJobSelector"
                checked={config.showJobSelector ?? true}
                onCheckedChange={(checked) => onConfigChange('showJobSelector', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showStats" className="text-sm font-medium text-gray-700">Statistics</Label>
              <Switch
                id="showStats"
                checked={config.showStats ?? true}
                onCheckedChange={(checked) => onConfigChange('showStats', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showFilters" className="text-sm font-medium text-gray-700">Filters</Label>
              <Switch
                id="showFilters"
                checked={config.showFilters ?? true}
                onCheckedChange={(checked) => onConfigChange('showFilters', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showSearch" className="text-sm font-medium text-gray-700">Search</Label>
              <Switch
                id="showSearch"
                checked={config.showSearch ?? true}
                onCheckedChange={(checked) => onConfigChange('showSearch', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showExport" className="text-sm font-medium text-gray-700">Export Button</Label>
              <Switch
                id="showExport"
                checked={config.showExport ?? true}
                onCheckedChange={(checked) => onConfigChange('showExport', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showBulkActions" className="text-sm font-medium text-gray-700">Bulk Actions</Label>
              <Switch
                id="showBulkActions"
                checked={config.showBulkActions ?? true}
                onCheckedChange={(checked) => onConfigChange('showBulkActions', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showPagination" className="text-sm font-medium text-gray-700">Pagination</Label>
              <Switch
                id="showPagination"
                checked={config.showPagination ?? true}
                onCheckedChange={(checked) => onConfigChange('showPagination', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sortable" className="text-sm font-medium text-gray-700">Sortable Columns</Label>
              <Switch
                id="sortable"
                checked={config.sortable ?? true}
                onCheckedChange={(checked) => onConfigChange('sortable', checked)}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showStatusBadges" className="text-sm font-medium text-gray-700">Status Badges</Label>
              <Switch
                id="showStatusBadges"
                checked={config.showStatusBadges ?? true}
                onCheckedChange={(checked) => onConfigChange('showStatusBadges', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showRatings" className="text-sm font-medium text-gray-700">Ratings</Label>
              <Switch
                id="showRatings"
                checked={config.showRatings ?? true}
                onCheckedChange={(checked) => onConfigChange('showRatings', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showActions" className="text-sm font-medium text-gray-700">Action Menu</Label>
              <Switch
                id="showActions"
                checked={config.showActions ?? true}
                onCheckedChange={(checked) => onConfigChange('showActions', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="compactView" className="text-sm font-medium text-gray-700">Compact View</Label>
              <Switch
                id="compactView"
                checked={config.compactView ?? false}
                onCheckedChange={(checked) => onConfigChange('compactView', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Table Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pageSize" className="text-sm font-medium text-gray-700">Page Size</Label>
            <Select
              value={String(config.pageSize || 10)}
              onValueChange={(value) => onConfigChange('pageSize', parseInt(value))}
            >
              <SelectTrigger className="mt-2 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="highlightNewApplications" className="text-sm font-medium text-gray-700">
              Highlight New Applications
              <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">24h</Badge>
            </Label>
            <Switch
              id="highlightNewApplications"
              checked={config.highlightNewApplications ?? true}
              onCheckedChange={(checked) => onConfigChange('highlightNewApplications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Column Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Column Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Applicant Name</Label>
              <Switch
                checked={config.columns?.name ?? true}
                onCheckedChange={(checked) => handleColumnChange('name', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Email & Phone</Label>
              <Switch
                checked={config.columns?.email ?? true}
                onCheckedChange={(checked) => handleColumnChange('email', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <Switch
                checked={config.columns?.status ?? true}
                onCheckedChange={(checked) => handleColumnChange('status', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Applied Date</Label>
              <Switch
                checked={config.columns?.submittedAt ?? true}
                onCheckedChange={(checked) => handleColumnChange('submittedAt', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Experience</Label>
              <Switch
                checked={config.columns?.experience ?? true}
                onCheckedChange={(checked) => handleColumnChange('experience', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Location</Label>
              <Switch
                checked={config.columns?.location ?? true}
                onCheckedChange={(checked) => handleColumnChange('location', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Expected Salary</Label>
              <Switch
                checked={config.columns?.salary ?? true}
                onCheckedChange={(checked) => handleColumnChange('salary', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Rating</Label>
              <Switch
                checked={config.columns?.rating ?? true}
                onCheckedChange={(checked) => handleColumnChange('rating', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Actions</Label>
              <Switch
                checked={config.columns?.actions ?? true}
                onCheckedChange={(checked) => handleColumnChange('actions', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Advanced Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoRefresh" className="text-sm font-medium text-gray-700">Auto Refresh</Label>
              <p className="text-xs text-gray-500 mt-1">Automatically refresh data at intervals</p>
            </div>
            <Switch
              id="autoRefresh"
              checked={config.autoRefresh ?? false}
              onCheckedChange={(checked) => onConfigChange('autoRefresh', checked)}
            />
          </div>
          
          {config.autoRefresh && (
            <div>
              <Label htmlFor="refreshInterval" className="text-sm font-medium text-gray-700">Refresh Interval</Label>
              <Select
                value={String(config.refreshInterval || 30000)}
                onValueChange={(value) => onConfigChange('refreshInterval', parseInt(value))}
              >
                <SelectTrigger className="mt-2 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10000">10 seconds</SelectItem>
                  <SelectItem value="30000">30 seconds</SelectItem>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="300000">5 minutes</SelectItem>
                  <SelectItem value="600000">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Configuration Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              {config.showJobSelector && <Badge variant="outline">Job Selector</Badge>}
              {config.showStats && <Badge variant="outline">Statistics</Badge>}
              {config.showFilters && <Badge variant="outline">Filters</Badge>}
              {config.showSearch && <Badge variant="outline">Search</Badge>}
              {config.showExport && <Badge variant="outline">Export</Badge>}
              {config.showBulkActions && <Badge variant="outline">Bulk Actions</Badge>}
              {config.showPagination && <Badge variant="outline">Pagination</Badge>}
              {config.sortable && <Badge variant="outline">Sortable</Badge>}
              {config.showStatusBadges && <Badge variant="outline">Status Badges</Badge>}
              {config.showRatings && <Badge variant="outline">Ratings</Badge>}
              {config.showActions && <Badge variant="outline">Actions</Badge>}
              {config.compactView && <Badge variant="outline">Compact View</Badge>}
              {config.highlightNewApplications && <Badge variant="outline">Highlight New</Badge>}
              {config.autoRefresh && <Badge variant="outline">Auto Refresh</Badge>}
            </div>
            
            <Separator className="my-3" />
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Visible Columns:</p>
              <div className="flex flex-wrap gap-1">
                {config.columns?.name && <Badge className="bg-blue-100 text-blue-800 text-xs">Name</Badge>}
                {config.columns?.email && <Badge className="bg-blue-100 text-blue-800 text-xs">Contact</Badge>}
                {config.columns?.status && <Badge className="bg-blue-100 text-blue-800 text-xs">Status</Badge>}
                {config.columns?.submittedAt && <Badge className="bg-blue-100 text-blue-800 text-xs">Applied</Badge>}
                {config.columns?.experience && <Badge className="bg-blue-100 text-blue-800 text-xs">Experience</Badge>}
                {config.columns?.location && <Badge className="bg-blue-100 text-blue-800 text-xs">Location</Badge>}
                {config.columns?.salary && <Badge className="bg-blue-100 text-blue-800 text-xs">Salary</Badge>}
                {config.columns?.rating && <Badge className="bg-blue-100 text-blue-800 text-xs">Rating</Badge>}
                {config.columns?.actions && <Badge className="bg-blue-100 text-blue-800 text-xs">Actions</Badge>}
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mt-3">
              Page Size: {config.pageSize || 10} items
              {config.autoRefresh && ` • Auto Refresh: ${(config.refreshInterval || 30000) / 1000}s`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
