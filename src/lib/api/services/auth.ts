/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import { apiClient } from '../client';
import { API_CONFIG } from '../config';
import { LinkUserUidRequest, LinkUserUidResponse } from '../types';

function getPublicApiBaseUrl(): string {
  return (API_CONFIG.RENDER_API || API_CONFIG.BASE_URL).replace(/\/+$/, '');
}

export interface SetupNewTenantRequest {
  tenant_slug: string;
  tenant_name?: string;
}

export interface SetupNewTenantResponse {
  success: boolean;
  tenant_id?: string;
  tenant_slug?: string;
  role_id?: string;
  role_key?: string;
  message?: string;
  error?: string;
}

export const authService = {
  /**
   * Request a password reset email via pyro-backend (proxies Supabase /auth/v1/recover).
   * Uses fetch without the JWT interceptor so stale sessions do not affect the request.
   */
  async requestPasswordReset(email: string, redirectTo: string): Promise<{ ok: boolean; error?: string }> {
    const trimmed = email.trim();
    if (!trimmed) {
      return { ok: false, error: 'Email is required.' };
    }
    const url = `${getPublicApiBaseUrl()}/auth/forgot-password/`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, redirect_to: redirectTo }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { ok: true };
      }
      const message =
        (data as { error?: string }).error ||
        (data as { message?: string }).message ||
        `Request failed (${response.status})`;
      return { ok: false, error: message };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      return { ok: false, error: message };
    }
  },

  /**
   * Create tenant, PYRO_ADMIN role, and TenantMembership (signup flow).
   * Requires Supabase JWT. Path is excluded from tenant resolution.
   */
  async setupNewTenant(data: SetupNewTenantRequest): Promise<SetupNewTenantResponse> {
    const response = await apiClient.post<SetupNewTenantResponse>(
      '/accounts/setup-new-tenant/',
      { tenant_slug: data.tenant_slug, tenant_name: data.tenant_name }
    );
    return response.data;
  },

  /**
   * Link Supabase user UID with email in Django backend
   * This is called after successful Supabase authentication
   * Tenant is resolved from the Supabase JWT on the backend.
   *
   * @param data - User UID and email
   * @returns Promise with link response
   */
  async linkUserUid(data: LinkUserUidRequest): Promise<LinkUserUidResponse> {
    try {
      const response = await apiClient.post<LinkUserUidResponse>(
        '/accounts/link-user-uid/',
        data
      );

      return response.data;
    } catch (error: any) {
      // Extract error details from response if available
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to link user UID';
      const errorCode = error.response?.data?.code;
      
      // Don't log expected errors (they're handled gracefully)
      if (!errorMessage.includes('No TenantMembership found') && 
          !errorMessage.includes('already has a linked UID') &&
          !errorMessage.includes('already linked')) {
        console.error('Error linking user UID:', errorMessage);
      }
      // Log error but don't throw - this is a non-blocking operation
      console.error('Error linking user UID:', error);
      
      // Return error info in a way that doesn't break the flow
      return {
        success: false,
        error: error.message || 'Failed to link user UID',
      } as any;
    }
  },
};

/**
 * Legacy fetch-based implementation for backward compatibility
 * @deprecated Use authService.linkUserUid instead
 */
export const linkUserUidLegacy = async (
  uid: string,
  email: string,
  token: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const baseUrl = import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const apiUrl = `${baseUrl}/accounts/link-user-uid/`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      data: responseData,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error occurred',
    };
  }
};

