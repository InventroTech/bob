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
  user_id: string; // TenantMembership ID (primary identifier)
  user_name: string;
  user_email: string;
  tenant_membership_id?: number; // Explicit TenantMembership ID
  lead_types: string[];
  lead_sources?: string[]; // Only leads with these lead_source values are directed to this RM
  daily_target?: number;
  daily_limit?: number;
  assigned_leads_count?: number;
}

export interface LeadTypeAssignmentRequest {
  user_id: string; // TenantMembership ID
  lead_types: string[];
  lead_sources?: string[]; // Optional; only these lead sources are directed to the RM
  daily_target?: number; // Optional daily target to store in daily_target column
  daily_limit?: number; // Optional daily limit to store in daily_limit column
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
  user_email?: string;
  lead_types: string[];
  lead_sources?: string[];
  daily_target?: number;
  daily_limit?: number;
  created: boolean;
}

// Routing rules types
export type QueueType = 'ticket' | 'lead';

export interface RoutingRule {
  id: number;
  tenant: string;
  /** TenantMembership id (primary); use this to match the user in the list. */
  tenant_membership_id?: number | null;
  /** Denormalized user UUID from membership; may be null. */
  user_id: string | null;
  queue_type: QueueType;
  is_active: boolean;
  conditions: any;
  name?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutingRuleUpsertPayload {
  user_id: string;
  queue_type: QueueType;
  is_active?: boolean;
  conditions?: any;
  name?: string;
  description?: string;
}
