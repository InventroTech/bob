import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';

export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
  customRole: string | null;
  /** Refetch custom role from backend. Call when role may have changed (e.g. after promotion to GM) so users don't need to re-login. */
  refetchCustomRole: () => Promise<void>;
}

export function useTenant(): TenantContext {
  const { user, session } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const [customRole, setCustomRole] = useState<string | null>(null);

  const fetchCustomRole = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      // Cache-bust so newly added GMs always get fresh role (no cached 304/response)
      const roleResponse = await apiClient.get(`/membership/me/role?_=${Date.now()}`);
      const roleData = roleResponse.data;
      if (roleData.role_key) {
        console.log('useTenant: Setting custom role from backend:', roleData.role_key);
        setCustomRole(roleData.role_key);
      } else {
        setCustomRole(null);
      }
    } catch (error: any) {
      console.log('useTenant: Failed to fetch role from backend:', error.response?.status || error.message);
      setCustomRole(null);
    }
  }, [session?.access_token]);

  useEffect(() => {
    async function fetchTenant() {
      if (!user) return;
      
      console.log('useTenant: Fetching tenant data for user:', user.id);
      
      // Fetch tenant-level role
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();
      
      console.log('useTenant: Tenant data:', tenantData, 'Error:', tenantError);
      
      if (!tenantError && tenantData) {
        setTenantId(tenantData.tenant_id);
        setRole(tenantData.role as 'owner' | 'editor' | 'viewer');
        
        // Fetch custom role from backend API (uses TenantMembership - source of truth)
        if (session?.access_token) {
          await fetchCustomRole();
        }
      } else {
        console.log('useTenant: No tenant data found or error occurred');
      }
    }
    fetchTenant();
  }, [user, session?.access_token, fetchCustomRole]);

  // Refetch role when user returns to the tab (e.g. they were added as GM in another tab or by admin)
  useEffect(() => {
    if (!user || !session?.access_token) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCustomRole();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [user, session?.access_token, fetchCustomRole]);

  return { tenantId, role, customRole, refetchCustomRole: fetchCustomRole };
} 