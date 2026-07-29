/** Types for the applicant table module. */

export type ApplicantStage = 'Initial' | 'Assignment Pending' | 'Interview' | 'HR' | 'Rejected' | 'Hire';

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'shortlisted' | 'accepted' | 'rejected';
  stage?: ApplicantStage; // New stage field
  submittedAt: string;
  experience?: string;
  location?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  resumeUrl?: string;
  coverLetter?: string;
  responses: Record<string, any>;
  rating?: number;
  notes?: string;
  interviewDate?: string;
  source?: string;
  // OpenAI response fields
  skills?: string;
  college?: string;
  // Full application data from database
  fullData?: {
    name?: string;
    email?: string;
    phone?: string;
    jobId?: number | string;
    salary?: string;
    skills?: string;
    answers?: Record<string, string>;
    criteria?: string;
    location?: string;
    resumeUrl?: string;
    department?: string;
    submittedAt?: string;
    openairesponse?: {
      name?: string;
      email?: string;
      phone?: string;
      github?: string;
      skills?: string[];
      summary?: string;
      linkedin?: string;
      location?: string;
      projects?: Array<{
        name?: string;
        tech_stack?: string[];
        description?: string;
      }>;
      ats_score?: number;
      education?: Array<{
        degree?: string;
        college?: string;
        start_year?: string;
        end_year?: string;
      }>;
      portfolio?: string;
      experience?: Array<{
        company?: string;
        duration?: string;
        position?: string;
        description?: string;
      }>;
    };
    other_description?: string;
  };
}

export interface Job {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'draft';
}

export interface ApplicantTableConfig {
  // Basic Settings
  title?: string;
  description?: string;
  
  // API Configuration
  apiEndpoint?: string;
  apiPrefix?: 'localhost' | 'renderer';
  statusDataApiEndpoint?: string;
  updateEndpoint?: string; // Endpoint for updating applicant stage
  useDemoData?: boolean; // Force use demo data instead of API
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
    type: 'text' | 'email' | 'phone' | 'status' | 'date' | 'number' | 'rating' | 'actions' | 'badge' | 'boolean' | 'skills' | 'stage';
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

export interface ApplicantTableComponentProps {
  config?: ApplicantTableConfig;
  className?: string;
}
