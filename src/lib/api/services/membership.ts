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
  id?: string;
  uid?: string;
  name?: string;
  full_name?: string;
  email?: string;
  created_at?: string;
  date_joined?: string;
  role_id?: string;
  role?: {
    id?: string;
    name?: string;
  };
  role_name?: string;
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
      const response = await apiClient.get<GetRolesResponse | Role[]>('/membership/roles');
      
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
   * Get all users for the current tenant
   * Uses the membership/users endpoint
   * 
   * @returns Promise with array of users
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get<GetUsersResponse | MembershipUser[]>('/membership/users');
      
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
      
      // Transform the data to match the User interface
      const transformedUsers: User[] = usersData.map((user: MembershipUser, index: number) => ({
        id: user.id || user.uid || `temp-${index}-${Math.random().toString(36).substring(2, 15)}`,
        name: user.name || user.full_name || 'Unnamed User',
        email: user.email || 'No Email',
        role_id: user.role_id || user.role?.id || '',
        created_at: user.created_at || user.date_joined || new Date().toISOString(),
        role: user.role?.name 
          ? { name: user.role.name }
          : user.role_name 
            ? { name: user.role_name }
            : null
      }));
      
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
      const response = await apiClient.post<Role | { data: Role } | { id: string; name: string } | { results: Role[] }>('/membership/roles', {
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
};

