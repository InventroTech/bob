import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Separator } from '../../ui/separator';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Users, Settings, Filter, Eye, Download, Zap, Database, Columns, Plus, Trash2 } from 'lucide-react';

export interface ApplicantTableConfig {
  // Basic Settings
  title?: string;
  description?: string;
  
  // API Configuration
  apiEndpoint?: string;
  apiPrefix?: 'supabase' | 'renderer';
  statusDataApiEndpoint?: string;
  updateEndpoint?: string; // Endpoint for updating applicant stage
  useDemoData?: boolean;
  tenantSlug?: string;
  
  // Display Options
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
  
  // Column Configuration
  columns?: Array<{
    key: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'status' | 'date' | 'number' | 'rating' | 'actions' | 'badge' | 'boolean';
    accessor?: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    visible?: boolean;
    format?: 'currency' | 'percentage' | 'date' | 'datetime' | 'relative-time';
    statusColors?: Record<string, string>;
  }>;
  
  // Advanced Configuration
  customFields?: Record<string, any>;
  filterOptions?: {
    statusOptions?: Array<{ value: string; label: string; color?: string }>;
    experienceOptions?: Array<{ value: string; label: string }>;
    locationOptions?: Array<{ value: string; label: string }>;
    customFilters?: Array<{
      key: string;
      label: string;
      type: 'select' | 'multiselect' | 'date-range' | 'text';
      options?: Array<{ value: string; label: string }>;
    }>;
  };
  
  // Data Transformation
  dataMapping?: {
    idField?: string;
    nameField?: string;
    emailField?: string;
    phoneField?: string;
    statusField?: string;
    dateField?: string;
    customMappings?: Record<string, string>;
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
  const lastColumnLabelRef = useRef<HTMLInputElement>(null);
  const lastColumnAccessorRef = useRef<HTMLInputElement>(null);
  const previousColumnCount = useRef((config.columns || []).length);
  const [focusField, setFocusField] = React.useState<'label' | 'accessor' | null>(null);
  
  // Local state for columns to prevent re-render on every keystroke
  const [localColumns, setLocalColumns] = React.useState(config.columns || []);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configColumnsLengthRef = useRef((config.columns || []).length);

  // Sync local columns with config ONLY when length changes (add/remove column)
  useEffect(() => {
    const currentLength = (config.columns || []).length;
    const previousLength = configColumnsLengthRef.current;
    
    // Only sync if length changed (column added/removed), not on content changes
    if (currentLength !== previousLength) {
      setLocalColumns(config.columns || []);
      configColumnsLengthRef.current = currentLength;
    }
  }, [config.columns]);

  // Debounced update to parent config
  const updateColumns = (newColumns: any[]) => {
    setLocalColumns(newColumns);
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Set new timeout to update parent after user stops typing
    updateTimeoutRef.current = setTimeout(() => {
      onConfigChange('columns', newColumns);
    }, 300); // 300ms debounce
  };

  // Auto-focus on new column input when a column is added
  useEffect(() => {
    const currentColumnCount = localColumns.length;
    if (currentColumnCount > previousColumnCount.current) {
      // A new column was added
      setFocusField('label');
      setTimeout(() => {
        lastColumnLabelRef.current?.focus();
        lastColumnLabelRef.current?.select();
      }, 50);
    }
    previousColumnCount.current = currentColumnCount;
  }, [localColumns.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
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
              placeholder="/api/applications"
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
          
          <div>
            <Label htmlFor="statusDataApiEndpoint" className="text-sm font-medium text-gray-700">Status Data API Endpoint</Label>
            <Input
              id="statusDataApiEndpoint"
              value={config.statusDataApiEndpoint || ''}
              onChange={(e) => onConfigChange('statusDataApiEndpoint', e.target.value)}
              placeholder="/api/application-stats"
              className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              disabled={config.useDemoData}
            />
          </div>

          <div>
            <Label htmlFor="updateEndpoint" className="text-sm font-medium text-gray-700">Update Endpoint (Optional)</Label>
            <Input
              id="updateEndpoint"
              value={config.updateEndpoint || ''}
              onChange={(e) => onConfigChange('updateEndpoint', e.target.value)}
              placeholder="/api/applications/update or leave empty"
              className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              disabled={config.useDemoData}
            />
            <p className="text-xs text-gray-500 mt-1">
              Endpoint for updating applicant stage (PUT request). If empty, stage updates will only be local.
            </p>
          </div>

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

      {/* Column Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Columns className="h-5 w-5" />
            Column Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium text-gray-700">Configure table columns</Label>
            <Button
              size="sm"
              onClick={() => {
                const newColumn = {
                  key: `custom_${Date.now()}`,
                  label: 'New Column',
                  type: 'text' as const,
                  accessor: '',
                  visible: true,
                  sortable: true,
                  filterable: false
                };
                const newColumns = [...localColumns, newColumn];
                updateColumns(newColumns);
              }}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {localColumns.map((column, index) => (
              <div key={column.key} className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {column.type}
                    </Badge>
                    <span className="font-medium text-sm">{column.label}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newColumns = localColumns.filter((_, i) => i !== index);
                      updateColumns(newColumns);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Label</Label>
                    <Input
                      ref={index === localColumns.length - 1 ? lastColumnLabelRef : undefined}
                      value={column.label}
                      onChange={(e) => {
                        const newColumns = [...localColumns];
                        newColumns[index] = { ...column, label: e.target.value };
                        updateColumns(newColumns);
                      }}
                      onFocus={() => setFocusField('label')}
                      className="text-sm h-8"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-600">Key/Accessor</Label>
                    <Input
                      ref={index === localColumns.length - 1 ? lastColumnAccessorRef : undefined}
                      value={column.accessor || column.key}
                      onChange={(e) => {
                        const newColumns = [...localColumns];
                        newColumns[index] = { ...column, accessor: e.target.value, key: e.target.value };
                        updateColumns(newColumns);
                      }}
                      onFocus={() => setFocusField('accessor')}
                      placeholder="field_name"
                      className="text-sm h-8"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-600">Type</Label>
                    <Select
                      value={column.type}
                      onValueChange={(value) => {
                        const newColumns = [...localColumns];
                        newColumns[index] = { ...column, type: value as any };
                        updateColumns(newColumns);
                      }}
                    >
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="badge">Badge</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="actions">Actions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-600">Width</Label>
                    <Input
                      value={column.width || ''}
                      onChange={(e) => {
                        const newColumns = [...localColumns];
                        newColumns[index] = { ...column, width: e.target.value };
                        updateColumns(newColumns);
                      }}
                      placeholder="150px"
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={column.visible ?? true}
                      onCheckedChange={(checked) => {
                        const newColumns = [...localColumns];
                        newColumns[index] = { ...column, visible: checked };
                        updateColumns(newColumns);
                      }}
                      className="scale-75"
                    />
                    <Label className="text-xs text-gray-600">Visible</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={column.sortable ?? true}
                      onCheckedChange={(checked) => {
                        const newColumns = [...localColumns];
                        newColumns[index] = { ...column, sortable: checked };
                        updateColumns(newColumns);
                      }}
                      className="scale-75"
                    />
                    <Label className="text-xs text-gray-600">Sortable</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={column.filterable ?? false}
                      onCheckedChange={(checked) => {
                        const newColumns = [...localColumns];
                        newColumns[index] = { ...column, filterable: checked };
                        updateColumns(newColumns);
                      }}
                      className="scale-75"
                    />
                    <Label className="text-xs text-gray-600">Filterable</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {localColumns.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Columns className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No columns configured</p>
              <p className="text-xs text-gray-400">Click "Add Column" to get started</p>
            </div>
          )}
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

      {/* Data Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Data Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <div>
              <Label htmlFor="nameField" className="text-sm font-medium text-gray-700">Name Field</Label>
              <Input
                id="nameField"
                value={config.dataMapping?.nameField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  nameField: e.target.value 
                })}
                placeholder="applicant_name"
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <div>
              <Label htmlFor="emailField" className="text-sm font-medium text-gray-700">Email Field</Label>
              <Input
                id="emailField"
                value={config.dataMapping?.emailField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  emailField: e.target.value 
                })}
                placeholder="email"
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
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
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <div>
              <Label htmlFor="dateField" className="text-sm font-medium text-gray-700">Date Field</Label>
              <Input
                id="dateField"
                value={config.dataMapping?.dateField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  dateField: e.target.value 
                })}
                placeholder="created_at"
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            
            <div>
              <Label htmlFor="phoneField" className="text-sm font-medium text-gray-700">Phone Field</Label>
              <Input
                id="phoneField"
                value={config.dataMapping?.phoneField || ''}
                onChange={(e) => onConfigChange('dataMapping', { 
                  ...config.dataMapping, 
                  phoneField: e.target.value 
                })}
                placeholder="phone"
                className="mt-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
          </div>
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
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            {/* API Configuration */}
            {config.apiEndpoint && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">API Configuration:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {config.apiPrefix || 'supabase'}: {config.apiEndpoint}
                  </Badge>
                  {config.statusDataApiEndpoint && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Stats: {config.statusDataApiEndpoint}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Features */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Enabled Features:</p>
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
            </div>
            
            <Separator />
            
            {/* Columns */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Configured Columns ({localColumns.filter(col => col.visible !== false).length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {localColumns.filter(col => col.visible !== false).map((column, index) => (
                  <Badge key={index} className="bg-blue-100 text-blue-800 text-xs">
                    {column.label} ({column.type})
                  </Badge>
                ))}
                {localColumns.length === 0 && (
                  <span className="text-xs text-gray-500">No columns configured</span>
                )}
              </div>
            </div>
            
            {/* Data Mapping */}
            {config.dataMapping && Object.values(config.dataMapping).some(val => val) && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Data Mapping:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {config.dataMapping.idField && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID:</span>
                      <code className="bg-gray-200 px-1 rounded">{config.dataMapping.idField}</code>
                    </div>
                  )}
                  {config.dataMapping.nameField && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <code className="bg-gray-200 px-1 rounded">{config.dataMapping.nameField}</code>
                    </div>
                  )}
                  {config.dataMapping.emailField && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <code className="bg-gray-200 px-1 rounded">{config.dataMapping.emailField}</code>
                    </div>
                  )}
                  {config.dataMapping.statusField && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <code className="bg-gray-200 px-1 rounded">{config.dataMapping.statusField}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Settings Summary */}
            <div className="text-sm text-gray-600">
              <div className="flex justify-between items-center">
                <span>Page Size: {config.pageSize || 10} items</span>
                {config.autoRefresh && (
                  <span>Auto Refresh: {(config.refreshInterval || 30000) / 1000}s</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
