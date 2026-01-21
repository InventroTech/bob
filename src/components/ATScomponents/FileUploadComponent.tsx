import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, FileIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

interface FileUploadComponentProps {
  title?: string;
  description?: string;
  apiEndpoint: string;
  apiPrefix?: 'localhost' | 'renderer';
  acceptedFileTypes?: string; // e.g., ".pdf,.doc,.docx" or "image/*"
  maxFileSize?: number; // in MB
  multiple?: boolean;
  tenantSlug?: string; // Tenant slug to send as X-Tenant-Slug header
  uploadPrompt?: string; // Prompt to send with the file upload (for resume scanning, etc.)
  hideUploadButton?: boolean; // Hide the upload button (for auto-upload on form submit)
  onFileSelected?: (file: File | null) => void; // Callback when file is selected
  className?: string;
  onUploadSuccess?: (response: any) => void;
  onUploadError?: (error: Error) => void;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  title = 'Upload Files',
  description = 'Drag and drop files here or click to browse',
  apiEndpoint,
  apiPrefix = 'renderer',
  acceptedFileTypes = '*',
  maxFileSize = 10, // 10MB default
  multiple = true,
  tenantSlug,
  uploadPrompt,
  hideUploadButton = false,
  onFileSelected,
  className = '',
  onUploadSuccess,
  onUploadError
}) => {
  const { tenantId } = useTenant(); // Get tenant ID from hook
  const { session } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  // Handle file selection via input
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    processFiles(selectedFiles);
  };

  // Process and validate files
  const processFiles = (newFiles: File[]) => {
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    const validFiles: UploadedFile[] = [];

    console.log('Processing files:', {
      fileCount: newFiles.length,
      maxFileSizeMB: maxFileSize,
      maxSizeBytes,
      acceptedFileTypes
    });

    newFiles.forEach((file) => {
      // Extract file extension early for use in validation and logging
      const fileNameParts = file.name.split('.');
      const fileExtension = fileNameParts.length > 1 
        ? '.' + fileNameParts.pop()?.toLowerCase() 
        : '';

      console.log('Validating file:', {
        name: file.name,
        size: file.size,
        sizeKB: (file.size / 1024).toFixed(2),
        sizeMB: (file.size / (1024 * 1024)).toFixed(2),
        type: file.type,
        extension: fileExtension
      });

      // Check file size
      if (file.size > maxSizeBytes) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(`${file.name} (${fileSizeMB}MB) exceeds maximum size of ${maxFileSize}MB`);
        console.error('File size validation failed:', {
          fileName: file.name,
          fileSize: file.size,
          fileSizeMB,
          maxSizeBytes,
          maxFileSizeMB: maxFileSize
        });
        return;
      }

      // Check file type if specified
      if (acceptedFileTypes !== '*') {
        
        const acceptedTypes = acceptedFileTypes.split(',').map(t => t.trim().toLowerCase());
        
        // MIME type mappings for common file types
        const mimeTypeMap: Record<string, string[]> = {
          '.pdf': ['application/pdf'],
          '.doc': ['application/msword'],
          '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          '.jpg': ['image/jpeg'],
          '.jpeg': ['image/jpeg'],
          '.png': ['image/png'],
          '.gif': ['image/gif'],
          '.txt': ['text/plain'],
          '.csv': ['text/csv', 'application/vnd.ms-excel'],
          '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
          '.xls': ['application/vnd.ms-excel']
        };
        
        const isAccepted = acceptedTypes.some(type => {
          // Handle wildcard MIME types (e.g., "image/*")
          if (type.includes('*') && type.includes('/')) {
            const mimeCategory = type.split('/')[0];
            return file.type.startsWith(mimeCategory);
          }
          
          // Check by file extension
          if (fileExtension && type === fileExtension) {
            return true;
          }
          
          // Check by MIME type
          if (file.type && file.type === type) {
            return true;
          }
          
          // Check MIME type mapping for the extension
          if (fileExtension && mimeTypeMap[fileExtension]) {
            if (mimeTypeMap[fileExtension].includes(file.type)) {
              return true;
            }
          }
          
          // Check if the accepted type matches any MIME type for that extension
          if (fileExtension && mimeTypeMap[type]) {
            if (mimeTypeMap[type].includes(file.type)) {
              return true;
            }
          }
          
          return false;
        });

        if (!isAccepted) {
          const acceptedList = acceptedTypes.join(', ');
          toast.error(`${file.name} is not an accepted file type. Accepted types: ${acceptedList}`);
          console.error('File validation failed:', {
            fileName: file.name,
            fileExtension,
            fileType: file.type,
            acceptedTypes,
            fileSize: file.size
          });
          return;
        }
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      validFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        preview
      });
      
      console.log('File validation passed:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileExtension: fileExtension
      });
    });

    if (validFiles.length > 0) {
      console.log(`Successfully validated ${validFiles.length} file(s)`);
      if (multiple) {
        setFiles(prev => [...prev, ...validFiles]);
      } else {
        setFiles(validFiles.slice(0, 1));
        // Notify parent of file selection
        if (onFileSelected) {
          onFileSelected(validFiles[0].file);
        }
      }
      setUploadStatus('idle');
    } else {
      console.warn('No valid files after validation');
      if (onFileSelected) {
        onFileSelected(null);
      }
    }
  };

  // Remove file from list
  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      const remaining = prev.filter(f => f.id !== id);
      // Notify parent if no files remain
      if (remaining.length === 0 && onFileSelected) {
        onFileSelected(null);
      }
      return remaining;
    });
    setUploadStatus('idle');
  };


  // Handle file upload
  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      
      // Append all files to FormData
      files.forEach((uploadedFile, index) => {
        if (multiple) {
          formData.append('files', uploadedFile.file);
        } else {
          formData.append('file', uploadedFile.file);
        }
      });

      // Add prompt if provided (for resume scanning, etc.)
      if (uploadPrompt) {
        formData.append('prompt', uploadPrompt);
        console.log('Including prompt in upload:', uploadPrompt);
      }

      // Add additional metadata
      formData.append('uploadDate', new Date().toISOString());
      formData.append('fileCount', files.length.toString());

      // Construct full URL based on API prefix
      let url = apiEndpoint;
      if (apiPrefix === 'renderer') {
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
      } else if (apiPrefix === 'localhost') {
        const baseUrl = import.meta.env.VITE_LOCAL_API_URL;
        url = baseUrl ? `${baseUrl}${apiEndpoint}` : apiEndpoint;
      }

      console.log('Uploading files to:', url);

      // Prepare headers
      const headers: HeadersInit = {};
      
      // Add Bearer token from Supabase session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Add tenant slug if provided (use config or fallback to tenantId from hook)
      const effectiveTenantSlug = tenantSlug || tenantId;
      if (effectiveTenantSlug) {
        headers['X-Tenant-Slug'] = effectiveTenantSlug;
      }

      console.log('Using tenant slug:', effectiveTenantSlug);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        // Note: Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      setUploadStatus('success');
      toast.success(`Successfully uploaded ${files.length} file(s)!`);
      
      // Call success callback if provided
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

      // Clear files after successful upload
      setTimeout(() => {
        setFiles([]);
        setUploadStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload files';
      toast.error(errorMessage);

      // Call error callback if provided
      if (onUploadError && error instanceof Error) {
        onUploadError(error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${uploadStatus === 'success' ? 'border-green-500 bg-green-50' : ''}
            ${uploadStatus === 'error' ? 'border-red-500 bg-red-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept={acceptedFileTypes}
            multiple={multiple}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            {uploadStatus === 'success' ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-green-700 font-medium">Upload Successful!</p>
              </>
            ) : uploadStatus === 'error' ? (
              <>
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-red-700 font-medium">Upload Failed</p>
              </>
            ) : (
              <>
                <Upload className={`h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-lg font-medium text-gray-700">{description}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {acceptedFileTypes !== '*' && `Accepted: ${acceptedFileTypes}`}
                    {maxFileSize && ` • Max size: ${maxFileSize}MB`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Selected Files ({files.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((uploadedFile) => (
                <div
                  key={uploadedFile.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {uploadedFile.preview ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center bg-gray-200 rounded">
                      <FileIcon className="h-6 w-6 text-gray-600" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uploadedFile.id);
                    }}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {!hideUploadButton && (
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleSubmit}
              disabled={files.length === 0 || isUploading}
              className="flex-1 bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}
                </>
              )}
            </Button>
            
            {files.length > 0 && !isUploading && (
              <Button
                variant="outline"
                onClick={() => {
                  files.forEach(f => {
                    if (f.preview) URL.revokeObjectURL(f.preview);
                  });
                  setFiles([]);
                  setUploadStatus('idle');
                  if (onFileSelected) {
                    onFileSelected(null);
                  }
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear All
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUploadComponent;

