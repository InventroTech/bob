import React from 'react';
import { FileUploadComponent } from '@/components/ATScomponents/FileUploadComponent';

/**
 * FileUploadPageComponent - Wrapper for FileUploadComponent to use in Page Builder
 * 
 * This component wraps the FileUploadComponent to make it compatible with the page builder.
 * It accepts configuration from the page builder's config panel.
 */

export interface FileUploadPageComponentConfig {
  title?: string;
  description?: string;
  apiEndpoint?: string;
  apiPrefix?: 'supabase' | 'renderer';
  acceptedFileTypes?: string;
  maxFileSize?: number;
  multiple?: boolean;
  tenantSlug?: string;
}

interface FileUploadPageComponentProps {
  config?: FileUploadPageComponentConfig;
}

export const FileUploadPageComponent: React.FC<FileUploadPageComponentProps> = ({ 
  config = {} 
}) => {
  const {
    title = 'Upload Files',
    description = 'Drag and drop files here or click to browse',
    apiEndpoint = '/api/upload',
    apiPrefix = 'renderer',
    acceptedFileTypes = '*',
    maxFileSize = 10,
    multiple = true,
    tenantSlug
  } = config;

  const handleUploadSuccess = (response: any) => {
    console.log('File upload successful:', response);
    // You can add additional logic here, such as:
    // - Refreshing data in other components
    // - Updating global state
    // - Triggering other actions
  };

  const handleUploadError = (error: Error) => {
    console.error('File upload failed:', error);
    // Handle error as needed
  };

  return (
    <div className="w-full">
      <FileUploadComponent
        title={title}
        description={description}
        apiEndpoint={apiEndpoint}
        apiPrefix={apiPrefix}
        acceptedFileTypes={acceptedFileTypes}
        maxFileSize={maxFileSize}
        multiple={multiple}
        tenantSlug={tenantSlug}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
    </div>
  );
};

export default FileUploadPageComponent;

