/** Types for the jobs page module. */

import type { DynamicFormData } from '../DynamicForm';

export interface Job {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'draft';
  deadline?: string;
  salary?: string | {
    min?: number;
    max?: number;
    currency?: string;
  };
  requirements?: string[];
  benefits?: string[];
  form: DynamicFormData;
  createdAt: string;
  applicationsCount?: number;
  company?: {
    name: string;
    logo?: string;
    website?: string;
  };
}

export interface JobsPageComponentConfig {
  // Basic Settings
  title?: string;
  description?: string;
  
  // API Configuration
  apiEndpoint?: string;
  apiMode?: 'renderer' | 'direct';
  apiBaseUrl?: string; // Full URL prefix for direct mode
  useDemoData?: boolean;
  tenantSlug?: string;
  submitEndpoint?: string; // Endpoint for submitting applications
  fileUploadEndpoint?: string; // Endpoint for uploading files (resumes)
  
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

export interface JobsPageComponentProps {
  config?: JobsPageComponentConfig;
  className?: string;
}
