import React from 'react';

/**
 * Configuration interface for FileUploadComponent
 * 
 * This defines all the customizable properties for the file upload component
 */
export interface FileUploadConfig {
  // Display Settings
  title?: string;
  description?: string;
  className?: string;

  // API Configuration
  apiEndpoint: string;
  apiPrefix?: 'supabase' | 'renderer';
  tenantSlug?: string; // Tenant slug to send as X-Tenant-Slug header
  
  // File Validation
  acceptedFileTypes?: string; // e.g., ".pdf,.doc,.docx" or "image/*"
  maxFileSize?: number; // in MB
  multiple?: boolean;

  // Callbacks
  onUploadSuccess?: (response: any) => void;
  onUploadError?: (error: Error) => void;
}

/**
 * Default configuration for FileUploadComponent
 */
export const defaultFileUploadConfig: Partial<FileUploadConfig> = {
  title: 'Upload Files',
  description: 'Drag and drop files here or click to browse',
  acceptedFileTypes: '*',
  maxFileSize: 10,
  multiple: true,
  className: ''
};

/**
 * Predefined configurations for common use cases
 */
export const fileUploadPresets = {
  // Resume upload (single PDF/DOC)
  resume: {
    title: 'Upload Your Resume',
    description: 'Upload your resume in PDF, DOC, or DOCX format',
    acceptedFileTypes: '.pdf,.doc,.docx',
    maxFileSize: 5,
    multiple: false
  },

  // Cover letter upload
  coverLetter: {
    title: 'Upload Cover Letter',
    description: 'Upload your cover letter (PDF or DOC)',
    acceptedFileTypes: '.pdf,.doc,.docx',
    maxFileSize: 5,
    multiple: false
  },

  // Portfolio images (multiple)
  portfolioImages: {
    title: 'Upload Portfolio Images',
    description: 'Upload multiple images for your portfolio',
    acceptedFileTypes: 'image/*',
    maxFileSize: 10,
    multiple: true
  },

  // Profile photo (single image)
  profilePhoto: {
    title: 'Upload Profile Photo',
    description: 'Upload a profile photo (JPG, PNG)',
    acceptedFileTypes: '.jpg,.jpeg,.png',
    maxFileSize: 5,
    multiple: false
  },

  // Supporting documents (multiple)
  supportingDocuments: {
    title: 'Supporting Documents',
    description: 'Upload any additional documents',
    acceptedFileTypes: '.pdf,.doc,.docx,.txt',
    maxFileSize: 10,
    multiple: true
  },

  // CSV import
  csvImport: {
    title: 'Import CSV Data',
    description: 'Upload a CSV file to import data',
    acceptedFileTypes: '.csv',
    maxFileSize: 50,
    multiple: false
  },

  // General documents
  generalDocuments: {
    title: 'Upload Documents',
    description: 'Upload any type of document',
    acceptedFileTypes: '*',
    maxFileSize: 20,
    multiple: true
  },

  // Application bundle (resume + cover letter + other docs)
  applicationBundle: {
    title: 'Application Documents',
    description: 'Upload your resume, cover letter, and supporting documents',
    acceptedFileTypes: '.pdf,.doc,.docx,.txt',
    maxFileSize: 10,
    multiple: true
  }
};

/**
 * Helper function to merge custom config with default config
 */
export const mergeFileUploadConfig = (
  customConfig: Partial<FileUploadConfig>
): FileUploadConfig => {
  return {
    ...defaultFileUploadConfig,
    ...customConfig
  } as FileUploadConfig;
};

/**
 * File type validation helper
 */
export const validateFileType = (
  file: File,
  acceptedTypes: string
): boolean => {
  if (acceptedTypes === '*') return true;

  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const acceptedTypesArray = acceptedTypes.split(',').map(t => t.trim().toLowerCase());

  return acceptedTypesArray.some(type => {
    if (type.includes('*')) {
      const mimeCategory = type.split('/')[0];
      return file.type.startsWith(mimeCategory);
    }
    return type === fileExtension || file.type === type;
  });
};

/**
 * File size validation helper
 */
export const validateFileSize = (
  file: File,
  maxSizeMB: number
): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Example API response interface
 */
export interface FileUploadResponse {
  success: boolean;
  message?: string;
  files?: Array<{
    filename: string;
    originalName: string;
    size: number;
    url: string;
    mimeType: string;
  }>;
  uploadDate?: string;
  fileCount?: number;
}

/**
 * Example usage in config object:
 * 
 * ```typescript
 * import { FileUploadComponent } from './FileUploadComponent';
 * import { fileUploadPresets } from './FileUploadConfig';
 * 
 * // Use a preset
 * <FileUploadComponent
 *   {...fileUploadPresets.resume}
 *   apiEndpoint="/api/upload/resume"
 *   onUploadSuccess={(response) => console.log(response)}
 * />
 * 
 * // Or create custom config
 * const customConfig = {
 *   title: "My Custom Upload",
 *   apiEndpoint: "/api/upload/custom",
 *   acceptedFileTypes: ".pdf",
 *   maxFileSize: 15,
 *   multiple: false
 * };
 * 
 * <FileUploadComponent {...customConfig} />
 * ```
 */

