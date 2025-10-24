import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
  customRole: string | null;
}

export function useTenant(): TenantContext {
  const { user } = useAuth();
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
        
        // Fetch custom role from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            role_id,
            roles(name)
          `)
          .eq('uid', user.id)
          .single();
        
        console.log('useTenant: User data:', userData, 'Error:', userError);
        
        if (!userError && userData?.roles) {
          console.log('useTenant: Setting custom role:', (userData.roles as any).name);
          setCustomRole((userData.roles as any).name);
        } else {
          console.log('useTenant: No custom role found or error occurred');
        }
      } else {
        console.log('useTenant: No tenant data found or error occurred');
      }
    }
    fetchTenant();
  }, [user]);

  return { tenantId, role, customRole };
} 