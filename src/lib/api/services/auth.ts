/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import { apiClient } from '../client';
import { LinkUserUidRequest, LinkUserUidResponse } from '../types';

export const authService = {
  /**
   * Link Supabase user UID with email in Django backend
   * This is called after successful Supabase authentication
   * 
   * @param data - User UID and email
   * @param tenantSlug - Optional tenant slug (defaults to config default)
   * @returns Promise with link response
   */
  async linkUserUid(
    data: LinkUserUidRequest,
    tenantSlug?: string
  ): Promise<LinkUserUidResponse> {
    try {
      const headers: Record<string, string> = {};
      
      // Override tenant slug if provided
      if (tenantSlug) {
        headers['X-Tenant-Slug'] = tenantSlug;
      }

      const response = await apiClient.post<LinkUserUidResponse>(
        '/accounts/link-user-uid/',
        data,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      // Extract error details from response if available
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to link user UID';
      const errorCode = error.response?.data?.code;
      
      // Log error but don't throw - this is a non-blocking operation
      // Don't log expected errors (they're handled gracefully)
      if (!errorMessage.includes('No TenantMembership found') && 
          !errorMessage.includes('already has a linked UID')) {
        console.error('Error linking user UID:', errorMessage);
      }
      
      // Return error info in a way that doesn't break the flow
      return {
        success: false,
        error: errorMessage,
        code: errorCode,
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
  token: string,
  tenantSlug: string = 'bibhab-thepyro-ai'
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const baseUrl = import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const apiUrl = `${baseUrl}/accounts/link-user-uid/`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': tenantSlug,
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

