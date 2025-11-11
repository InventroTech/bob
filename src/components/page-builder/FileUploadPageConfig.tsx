import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

/**
 * FileUploadPageConfig - Configuration panel for FileUploadPageComponent
 * 
 * This component provides a UI for configuring the FileUploadComponent
 * in the page builder's configuration panel.
 */

interface FileUploadPageConfigProps {
  localConfig: {
    title?: string;
    description?: string;
    apiEndpoint?: string;
    apiPrefix?: 'supabase' | 'renderer';
    acceptedFileTypes?: string;
    maxFileSize?: number;
    multiple?: boolean;
    tenantSlug?: string;
  };
  handleInputChange: (field: string, value: any) => void;
}

export const FileUploadPageConfig: React.FC<FileUploadPageConfigProps> = ({
  localConfig,
  handleInputChange
}) => {
  return (
    <div className="space-y-6">
      <h4 className="font-semibold text-sm text-gray-900">File Upload Settings</h4>
      
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="fileUpload-title" className="text-sm font-medium">
          Title
        </Label>
        <Input
          id="fileUpload-title"
          type="text"
          value={localConfig.title || ''}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Upload Files"
          className="text-sm"
        />
        <p className="text-xs text-gray-500">Header title for the upload component</p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="fileUpload-description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="fileUpload-description"
          value={localConfig.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Drag and drop files here or click to browse"
          rows={2}
          className="text-sm"
        />
        <p className="text-xs text-gray-500">Description text shown in the drop area</p>
      </div>

      {/* API Endpoint */}
      <div className="space-y-2">
        <Label htmlFor="fileUpload-apiEndpoint" className="text-sm font-medium">
          API Endpoint *
        </Label>
        <Input
          id="fileUpload-apiEndpoint"
          type="text"
          value={localConfig.apiEndpoint || ''}
          onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
          placeholder="/api/upload"
          className="text-sm"
        />
        <p className="text-xs text-gray-500">URL where files will be uploaded via POST request</p>
      </div>

      {/* API Prefix */}
      <div className="space-y-2">
        <Label htmlFor="fileUpload-apiPrefix" className="text-sm font-medium">
          API Prefix
        </Label>
        <Select
          value={localConfig.apiPrefix || 'renderer'}
          onValueChange={(value) => handleInputChange('apiPrefix', value)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select API type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="supabase">Supabase</SelectItem>
            <SelectItem value="renderer">Renderer API</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {localConfig.apiPrefix === 'renderer' 
            ? 'Will use VITE_RENDER_API_URL as base URL' 
            : 'Direct API endpoint call'}
        </p>
      </div>

      {/* Tenant Slug */}
      <div className="space-y-2">
        <Label htmlFor="fileUpload-tenantSlug" className="text-sm font-medium">
          Tenant Slug
        </Label>
        <Input
          id="fileUpload-tenantSlug"
          type="text"
          value={localConfig.tenantSlug || ''}
          onChange={(e) => handleInputChange('tenantSlug', e.target.value)}
          placeholder="my-tenant-slug"
          className="text-sm"
        />
        <p className="text-xs text-gray-500">Sent as X-Tenant-Slug header in the API request</p>
      </div>

      {/* Accepted File Types */}
      <div className="space-y-2">
        <Label htmlFor="fileUpload-acceptedTypes" className="text-sm font-medium">
          Accepted File Types
        </Label>
        <Select
          value={localConfig.acceptedFileTypes || '*'}
          onValueChange={(value) => handleInputChange('acceptedFileTypes', value)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select file types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="*">All Files (*)</SelectItem>
            <SelectItem value=".pdf,.doc,.docx">Documents (PDF, DOC, DOCX)</SelectItem>
            <SelectItem value=".pdf">PDF Only</SelectItem>
            <SelectItem value="image/*">Images (All)</SelectItem>
            <SelectItem value=".jpg,.jpeg,.png">Images (JPG, PNG)</SelectItem>
            <SelectItem value=".csv">CSV Files</SelectItem>
            <SelectItem value=".xlsx,.xls">Excel Files</SelectItem>
            <SelectItem value="video/*">Videos (All)</SelectItem>
            <SelectItem value="audio/*">Audio Files (All)</SelectItem>
          </SelectContent>
        </Select>
        <div className="mt-2">
          <Input
            type="text"
            value={localConfig.acceptedFileTypes || ''}
            onChange={(e) => handleInputChange('acceptedFileTypes', e.target.value)}
            placeholder="Or enter custom: .pdf,.doc"
            className="text-sm"
          />
        </div>
        <p className="text-xs text-gray-500">
          File types to accept. Use extensions (.pdf) or MIME types (image/*)
        </p>
      </div>

      {/* Max File Size */}
      <div className="space-y-2">
        <Label htmlFor="fileUpload-maxSize" className="text-sm font-medium">
          Max File Size (MB)
        </Label>
        <Input
          id="fileUpload-maxSize"
          type="number"
          min="1"
          max="100"
          value={localConfig.maxFileSize || 10}
          onChange={(e) => handleInputChange('maxFileSize', parseInt(e.target.value))}
          placeholder="10"
          className="text-sm"
        />
        <p className="text-xs text-gray-500">Maximum file size in megabytes</p>
      </div>

      {/* Multiple Files */}
      <div className="flex items-center justify-between space-x-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <Label htmlFor="fileUpload-multiple" className="text-sm font-medium cursor-pointer">
            Allow Multiple Files
          </Label>
          <p className="text-xs text-gray-500">Enable uploading multiple files at once</p>
        </div>
        <Switch
          id="fileUpload-multiple"
          checked={localConfig.multiple ?? true}
          onCheckedChange={(checked) => handleInputChange('multiple', checked)}
        />
      </div>

      {/* Presets Section */}
      <div className="space-y-2 pt-4 border-t">
        <Label className="text-sm font-medium">Quick Presets</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              handleInputChange('title', 'Upload Resume');
              handleInputChange('description', 'Upload your resume (PDF, DOC, DOCX)');
              handleInputChange('acceptedFileTypes', '.pdf,.doc,.docx');
              handleInputChange('maxFileSize', 5);
              handleInputChange('multiple', false);
            }}
            className="px-3 py-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => {
              handleInputChange('title', 'Upload Images');
              handleInputChange('description', 'Upload images for your portfolio');
              handleInputChange('acceptedFileTypes', 'image/*');
              handleInputChange('maxFileSize', 10);
              handleInputChange('multiple', true);
            }}
            className="px-3 py-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200"
          >
            Images
          </button>
          <button
            type="button"
            onClick={() => {
              handleInputChange('title', 'Upload Documents');
              handleInputChange('description', 'Upload supporting documents');
              handleInputChange('acceptedFileTypes', '.pdf,.doc,.docx,.txt');
              handleInputChange('maxFileSize', 10);
              handleInputChange('multiple', true);
            }}
            className="px-3 py-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200"
          >
            Documents
          </button>
          <button
            type="button"
            onClick={() => {
              handleInputChange('title', 'Import CSV');
              handleInputChange('description', 'Upload a CSV file to import data');
              handleInputChange('acceptedFileTypes', '.csv');
              handleInputChange('maxFileSize', 50);
              handleInputChange('multiple', false);
            }}
            className="px-3 py-2 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded border border-orange-200"
          >
            CSV Import
          </button>
        </div>
        <p className="text-xs text-gray-500">Click a preset to quickly configure common use cases</p>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
        <h5 className="text-xs font-semibold text-blue-900">API Requirements</h5>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Method: POST</li>
          <li>• Content-Type: multipart/form-data</li>
          <li>• Response: JSON with success status</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploadPageConfig;

