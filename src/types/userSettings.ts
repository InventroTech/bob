// User Settings Types
export interface UserSettings {
  id: number;
  tenant_id: string;
  user_id: string;
  key: string;
  value: any; // JSON value
  assigned_leads_count?: number; // New column for storing the number
  created_at: string;
  updated_at: string;
}

export interface UserSettingsCreate {
  user_id: string;
  key: string;
  value: any;
  assigned_leads_count?: number; // New column for storing the number
}

export interface UserSettingsUpdate {
  key?: string;
  value?: any;
  assigned_leads_count?: number; // New column for storing the number
}

// Lead Type Assignment Types
export interface LeadTypeAssignment {
  user_id: string;
  user_name: string;
  user_email: string;
  lead_types: string[];
}

export interface LeadTypeAssignmentRequest {
  user_id: string;
  lead_types: string[];
  assigned_leads_count?: number; // Optional count to store in assigned_leads_count column
}

export interface UserLeadTypes {
  user_id: string;
  lead_types: string[];
}

// Lead types are now dynamically fetched from records' affiliated_party field
// No hardcoded lead types - they are fetched from the backend
export type LeadType = string;

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LeadTypeAssignmentResponse {
  user_id: string;
  user_name: string;
  lead_types: string[];
  created: boolean;
}
