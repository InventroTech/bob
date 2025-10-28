// User Settings Types
export interface UserSettings {
  id: number;
  tenant_id: string;
  user_id: string;
  key: string;
  value: any; // JSON value
  created_at: string;
  updated_at: string;
}

export interface UserSettingsCreate {
  user_id: string;
  key: string;
  value: any;
}

export interface UserSettingsUpdate {
  key?: string;
  value?: any;
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
}

export interface UserLeadTypes {
  user_id: string;
  lead_types: string[];
}

// Available Lead Types (you can customize these based on your business needs)
export const AVAILABLE_LEAD_TYPES = [
  'PREMIUM_LEADS',
  'STANDARD_LEADS', 
  'BASIC_LEADS',
  'ENTERPRISE_LEADS',
  'SME_LEADS',
  'STARTUP_LEADS',
  'RETAIL_LEADS',
  'WHOLESALE_LEADS'
] as const;

export type LeadType = typeof AVAILABLE_LEAD_TYPES[number];

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
