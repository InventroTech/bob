import { apiClient } from '../client';

export interface ZohoMailConnectResponse {
  authorize_url: string;
  configured: boolean;
  scopes?: string;
}

export interface ZohoMailStatusResponse {
  configured: boolean;
  connected: boolean;
  email_address: string;
  is_active: boolean;
  last_synced_at: string | null;
  connected_by_email: string;
}

export interface ZohoMailSyncResult {
  success?: boolean;
  scanned?: number;
  shipment_like?: number;
  applied?: number;
  unmatched?: number;
  skipped?: number | string;
  errors?: number;
  error?: string;
  timestamp?: string;
}

export const zohoMailService = {
  async getConnect(): Promise<ZohoMailConnectResponse> {
    const response = await apiClient.get<ZohoMailConnectResponse>('/email/zoho/connect/');
    return response.data;
  },

  async getStatus(): Promise<ZohoMailStatusResponse> {
    const response = await apiClient.get<ZohoMailStatusResponse>('/email/zoho/status/');
    return response.data;
  },

  async disconnect(): Promise<{ success: boolean; detail?: string }> {
    const response = await apiClient.post<{ success: boolean; detail?: string }>(
      '/email/zoho/disconnect/'
    );
    return response.data;
  },

  async syncNow(maxMessages = 40): Promise<ZohoMailSyncResult> {
    const response = await apiClient.post<ZohoMailSyncResult>('/email/zoho/sync-now/', {
      max_messages: maxMessages,
    });
    return response.data;
  },
};
