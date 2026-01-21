import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';

export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
  customRole: string | null;
}

export function useTenant(): TenantContext {
  const { user, session } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const [customRole, setCustomRole] = useState<string | null>(null);

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
        // This ensures frontend role matches what backend permissions check against
        if (session?.access_token) {
          try {
            const roleResponse = await apiClient.get('/membership/me/role');
            const roleData = roleResponse.data;
            
            if (roleData.role_key) {
              console.log('useTenant: Setting custom role from backend:', roleData.role_key);
              setCustomRole(roleData.role_key);
            } else {
              console.log('useTenant: No role_key in backend response');
            }
          } catch (error: any) {
            console.log('useTenant: Failed to fetch role from backend:', error.response?.status || error.message);
          }
        }
      } else {
        console.log('useTenant: No tenant data found or error occurred');
      }
    }
    fetchTenant();
  }, [user]);

  return { tenantId, role, customRole };
} 