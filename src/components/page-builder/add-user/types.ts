/** Types for AddUserComponent. */

export interface Role {
  id: string;
  name: string;
}

export interface User {
  tenant_membership_id?: number;
  uid: string;
  name: string;
  email: string;
  role_id: string;
  created_at: string;
  role?: Role;
  department?: string;
  lead_group_name?: string;
  leadGroup?: string;
  dailyTarget?: string | number;
  dailyLimit?: string | number;
  supportResolveRateGoal?: string | number;
  supportDailyLimitSelfTrial?: string | number;
  supportDailyLimitOther?: string | number;
  user_parent_id?: number | null;
  managerEmail?: string;
  /** Tenant-defined custom field values (key → display value). */
  customFields?: Record<string, string>;
}

export interface UserCoreSettingsSummary {
  group_id?: number;
  daily_target?: number;
  daily_limit?: number;
  support_resolve_rate_goal?: number;
  support_daily_limit_self_trial?: number;
  support_daily_limit_other?: number;
  custom_fields?: Record<string, string>;
}

export interface LeadGroupOption {
  id: number;
  name: string;
  queue_type?: string;
  group_data?: Record<string, any>;
}

export interface RowEditState {
  originalEmail: string;
  originalRoleId: string;
  name: string;
  email: string;
  department: string;
  roleId: string;
  leadGroup: string;
  dailyTarget: string;
  dailyLimit: string;
  supportResolveRateGoal: string;
  supportDailyLimitSelfTrial: string;
  supportDailyLimitOther: string;
  managerEmail: string;
  customFields: Record<string, string>;
}

export interface AddUserComponentConfig {
  userScope?: 'all' | 'under_me';
  /** Form fields for this page (saved with page config — shared). */
  umFormFields?: string[];
  /** Table columns for this page (saved with page config — shared). */
  umColumns?: string[];
  /** Custom fields for this page (saved with page config — shared). */
  umCustomFields?: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean';
    showInForm: boolean;
    showInTable: boolean;
  }>;
}

export interface AddUserComponentProps {
  config?: AddUserComponentConfig;
}
