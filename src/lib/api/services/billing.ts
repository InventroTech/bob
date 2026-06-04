import { apiClient } from '../client';

export interface BillingRole {
  id: string;
  key: string;
  name: string;
  rate?: string;
}

export interface BillingMember {
  membership_id: number;
  name: string;
  email: string;
  role: BillingRole | null;
  is_active: boolean;
  is_deleted?: boolean;
  joined_at: string;
  joined_date: string;
  billing_end_date?: string;
  deleted_at?: string | null;
  billable_days: number;
  cycle_days: number;
  billing_role_key: string | null;
  monthly_amount: string;
  daily_rate: string;
  billing_amount: string;
}

export interface BillingSummary {
  member_count: number;
  excluded_internal_member_count?: number;
  total_billable_days: number;
  total_amount: string;
}

export interface BillingReport {
  month: string;
  period_start: string;
  period_end: string;
  cycle_days: number;
  excluded_email_domain?: string;
  excluded_email_addresses_count?: number;
  billing_roles?: BillingRole[];
  role_rates: Record<string, string>;
  summary: BillingSummary;
  results: BillingMember[];
}

export interface BillingReportParams {
  month: string;
  cycleDays?: number;
  roleRates?: Record<string, string>;
}

export const billingService = {
  async getMembershipBilling(params: BillingReportParams): Promise<BillingReport> {
    const response = await apiClient.get<BillingReport>('/membership/billing/', {
      params: {
        month: params.month,
        ...(params.cycleDays ? { cycle_days: params.cycleDays } : {}),
        ...(params.roleRates ? { role_rates: JSON.stringify(params.roleRates) } : {}),
      },
    });

    return response.data;
  },
};
