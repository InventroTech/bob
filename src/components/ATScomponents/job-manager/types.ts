/** Types for the job manager module. */

import type { DynamicFormData, QuestionType } from '../DynamicForm';

/** Question with answer type interface */
export interface QuestionWithType {
  text: string;
  type: QuestionType;
  options?: string[]; // Options for select, radio, checkbox types
}

/** Job interface with deadline */
export interface Job {
  id: string;
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'draft';
  deadline?: string; // Application deadline
  requireResume?: boolean;
  salary?: string; // e.g., "55LPA" or "120000-150000 USD"
  criteria?: string; // e.g., "2-3 Years of Experience"
  skills?: string; // e.g., "HTML, C++, DSA"
  form: DynamicFormData;
  createdAt: string;
  applicationsCount?: number;
}

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
  deleteEndpoint?: string; // Separate endpoint for deletes (optional, falls back to apiEndpoint)
  apiMode?: 'localhost' | 'renderer';
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

export interface JobManagerComponentProps {
  config?: JobManagerComponentConfig;
  className?: string;
}
