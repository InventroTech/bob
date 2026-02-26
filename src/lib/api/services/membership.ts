/**
 * Membership API Service
 * Handles all membership-related API calls (roles, permissions, etc.)
 */

import { apiClient } from '../client';

export interface Role {
  id: string;
  name: string;
}

export interface GetRolesResponse {
  results?: Role[];
  data?: Role[];
  // Direct array response is also supported
}

export interface MembershipUser {
  id?: string | number; // TenantMembership pk when from API (number)
  uid?: string;
  user_id?: string; // Primary user identifier from API
  user_parent_id?: number | null; // TenantMembership id of manager (for hierarchy)
  name?: string;
  full_name?: string;
  email?: string;
  created_at?: string;
  date_joined?: string;
  role_id?: string;
  is_active?: boolean;
  role?: {
    id?: string;
    key?: string;
    name?: string;
  };
  role_name?: string;
}

/** User with hierarchy fields for the User Hierarchy page */
export interface HierarchyUser {
  membershipId: number;
  user_parent_id: number | null;
  name: string;
  email: string;
  role: { name: string } | null;
}

export interface HierarchyAssignment {
  membership_id: number;
  parent_membership_id: number | null;
}

export interface GetUsersResponse {
  results?: MembershipUser[];
  data?: MembershipUser[];
  // Direct array response is also supported
}

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role_id: string;
  role: {
    name: string;
  } | null;
}

export interface MyMembershipResponse {
  role_key: string | null;
  role_name: string | null;
  role_id: string | null;
  tenant_id: string | null;
  tenant_slug?: string | null;
  is_active?: boolean;
  error?: string;
}

/**
 * Membership API Service
 */
export const membershipService = {
  /**
   * Get all roles for the current tenant
   * Uses the membership/roles endpoint
   * 
   * @returns Promise with array of roles
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await apiClient.get<GetRolesResponse | Role[]>('/membership/roles/');
      
      const responseData = response.data;
      
      // Handle different response formats
      if (Array.isArray(responseData)) {
        return responseData;
      }
      
      if (responseData && typeof responseData === 'object') {
        // Handle { results: [...] } format
        if ('results' in responseData && Array.isArray(responseData.results)) {
          return responseData.results;
        }
        // Handle { data: [...] } format
        if ('data' in responseData && Array.isArray(responseData.data)) {
          return responseData.data;
        }
      }
      
      return [];
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  },

  /**
   * Get the public role for a tenant (key=public).
   * Uses the membership/roles endpoint. Returns null on any error or if not found.
   * Use this instead of the non-existent api/authz/roles endpoint.
   *
   * @param tenantSlug - Optional tenant slug for X-Tenant-Slug header (e.g. from URL params)
   * @returns Promise with the public role or null
   */
  async getPublicRole(tenantSlug?: string): Promise<Role | null> {
    try {
      const config: { params?: { key: string }; headers?: { 'X-Tenant-Slug': string } } = {
        params: { key: 'public' },
      };
      if (tenantSlug) {
        config.headers = { 'X-Tenant-Slug': tenantSlug };
      }
      const response = await apiClient.get<GetRolesResponse | Role[]>('/membership/roles/', config);
      const responseData = response.data;
      let roles: Role[] = [];
      if (Array.isArray(responseData)) {
        roles = responseData;
      } else if (responseData && typeof responseData === 'object') {
        if ('results' in responseData && Array.isArray(responseData.results)) {
          roles = responseData.results;
        } else if ('data' in responseData && Array.isArray(responseData.data)) {
          roles = responseData.data;
        }
      }
      return roles.length > 0 ? roles[0] : null;
    } catch (error: any) {
      console.warn('Failed to fetch public role via membership API:', error?.message || error);
      return null;
    }
  },

  /**
   * Get all users for the current tenant
   * Uses the membership/users endpoint
   *
   * @returns Promise with array of users
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get<GetUsersResponse | MembershipUser[]>('/membership/users/');
      
      const responseData = response.data;
      
      // Handle different response formats
      let usersData: MembershipUser[] = [];
      if (Array.isArray(responseData)) {
        usersData = responseData;
      } else if (responseData && typeof responseData === 'object') {
        // Handle { results: [...] } format
        if ('results' in responseData && Array.isArray(responseData.results)) {
          usersData = responseData.results;
        }
        // Handle { data: [...] } format
        if ('data' in responseData && Array.isArray(responseData.data)) {
          usersData = responseData.data;
        }
      }
      
      // Transform the data to match the User interface.
      // For routing rules we key by TenantMembership id, so prefer id (membership pk) when present.
      const transformedUsers: User[] = usersData.map((user: MembershipUser, index: number) => {
        const rawId =
          user.id ??
          user.user_id ??
          user.uid ??
          `temp-${index}-${Math.random().toString(36).substring(2, 15)}`;

        return {
          id: String(rawId),
          name: user.name || user.full_name || 'Unnamed User',
          email: user.email || 'No Email',
          role_id: user.role_id || user.role?.id || '',
          created_at: user.created_at || user.date_joined || new Date().toISOString(),
          role: user.role?.name
            ? { name: user.role.name }
            : user.role?.key
              ? { name: user.role.key }
              : user.role_name
                ? { name: user.role_name }
                : null,
        };
      });
      
      // Sort by created_at descending (newest first)
      return transformedUsers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error: any) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  /**
   * Create a new role for the current tenant
   * Uses the membership/roles endpoint (POST)
   * 
   * @param key - The role key (e.g., "HM")
   * @param name - The role name (e.g., "Head of Management")
   * @returns Promise with the created role
   */
  async createRole(key: string, name: string): Promise<Role> {
    try {
      const response = await apiClient.post<Role | { data: Role } | { id: string; name: string } | { results: Role[] }>('/membership/roles/', {
        key,
        name
      });
      
      const responseData = response.data;
      
      // Handle different response formats
      if (responseData && typeof responseData === 'object') {
        // Handle { data: {...} } format
        if ('data' in responseData && responseData.data) {
          return responseData.data as Role;
        }
        // Handle { results: [{...}] } format
        if ('results' in responseData && Array.isArray(responseData.results) && responseData.results.length > 0) {
          return responseData.results[0] as Role;
        }
        // Handle direct role object
        if ('id' in responseData && 'name' in responseData) {
          return responseData as Role;
        }
      }
      
      // If we can't parse the response but got a 200, return a minimal role object
      // This allows the UI to continue even if response format is unexpected
      console.warn('Unexpected response format from create role endpoint, using fallback');
      return { id: '', name };
    } catch (error: any) {
      console.error('Error creating role:', error);
      throw error;
    }
  },

  /**
   * Get all users with hierarchy fields (membershipId, user_parent_id) for the User Hierarchy page.
   * Uses the same GET /membership/users endpoint (backend includes id and user_parent_id).
   */
  async getUsersForHierarchy(): Promise<HierarchyUser[]> {
    const response = await apiClient.get<GetUsersResponse>('/membership/users/');
    const responseData = response.data;
    let usersData: MembershipUser[] = [];
    if (responseData && typeof responseData === 'object') {
      if ('results' in responseData && Array.isArray(responseData.results)) {
        usersData = responseData.results;
      } else if ('data' in responseData && Array.isArray(responseData.data)) {
        usersData = responseData.data;
      }
    }
    return usersData
      .filter((u) => u.id != null && typeof u.id === 'number')
      .map((u) => ({
        membershipId: u.id as number,
        user_parent_id: u.user_parent_id ?? null,
        name: u.name || u.full_name || 'Unnamed User',
        email: u.email || 'No Email',
        role: u.role?.name
          ? { name: u.role.name }
          : u.role?.key
            ? { name: u.role.key }
            : u.role_name
              ? { name: u.role_name }
              : null,
      }));
  },

  /**
   * Update user reporting hierarchy (who reports to whom).
   * Restricted to GM/ASM on the backend.
   */
  async updateUserHierarchy(
    assignments: HierarchyAssignment[]
  ): Promise<{ count: number }> {
    const response = await apiClient.patch<{ count: number }>(
      '/membership/users/hierarchy/',
      { assignments }
    );
    return response.data;
  },

  /**
   * Get current user's membership information (tenant_id, role_id) from backend.
   * Used as fallback when JWT doesn't contain user_data claims.
   * This is the source of truth for user's tenant and role.
   * 
   * @param tenantSlug - Optional tenant slug for X-Tenant-Slug header
   * @returns Promise with membership info (tenant_id, role_id, role_key, etc.) or null if not found
   */
  async getMyMembership(tenantSlug?: string): Promise<MyMembershipResponse | null> {
    try {
      console.log('[membershipService] getMyMembership: Fetching membership from backend API', {
        tenantSlug: tenantSlug || 'not provided',
        endpoint: '/membership/me/role',
      });

      const config: { headers?: { 'X-Tenant-Slug': string } } = {};
      if (tenantSlug) {
        config.headers = { 'X-Tenant-Slug': tenantSlug };
      }

      const response = await apiClient.get<MyMembershipResponse>('/membership/me/role/', config);
      
      console.log('[membershipService] getMyMembership: Response received', {
        hasData: !!response.data,
        role_id: response.data?.role_id || 'MISSING',
        tenant_id: response.data?.tenant_id || 'MISSING',
        role_key: response.data?.role_key || 'MISSING',
        hasError: !!response.data?.error,
        error: response.data?.error,
      });

      if (response.data?.error) {
        console.warn('[membershipService] getMyMembership: Backend returned error', {
          error: response.data.error,
        });
        return null;
      }

      if (!response.data?.role_id || !response.data?.tenant_id) {
        console.warn('[membershipService] getMyMembership: Missing required fields', {
          hasRoleId: !!response.data?.role_id,
          hasTenantId: !!response.data?.tenant_id,
        });
        return null;
      }

      console.log('[membershipService] getMyMembership: ✅ Successfully retrieved membership', {
        tenant_id: response.data.tenant_id,
        role_id: response.data.role_id,
        role_key: response.data.role_key,
      });

      return response.data;
    } catch (error: any) {
      console.error('[membershipService] getMyMembership: ❌ Error fetching membership', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return null;
    }
  },
};

