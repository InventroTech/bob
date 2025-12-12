// User Settings Types
export interface UserSettings {
  id: number;
  tenant_id: string;
  user_id: string;
  key: string;
  value: any; // JSON value
  daily_target?: number; // Daily target column
  created_at: string;
  updated_at: string;
}

export interface UserSettingsCreate {
  user_id: string;
  key: string;
  value: any;
  daily_target?: number; // Daily target column
}

export interface UserSettingsUpdate {
  key?: string;
  value?: any;
  daily_target?: number; // Daily target column
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
  daily_target?: number; // Optional daily target to store in daily_target column
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
