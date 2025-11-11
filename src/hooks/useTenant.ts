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
        
        // Fetch custom role from backend API (uses TenantMembership - source of truth)
        // This ensures frontend role matches what backend permissions check against
        const baseUrl = import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData?.session?.access_token;
        
        if (authToken) {
          try {
            const baseUrlClean = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
            const roleResponse = await fetch(`${baseUrlClean}/membership/me/role`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-Tenant-Slug': 'bibhab-thepyro-ai'
              }
            });
            
            if (roleResponse.ok) {
              const roleData = await roleResponse.json();
              if (roleData.role_key) {
                console.log('useTenant: Setting custom role from backend:', roleData.role_key);
                setCustomRole(roleData.role_key);
              } else {
                console.log('useTenant: No role_key in backend response');
              }
            } else {
              console.log('useTenant: Failed to fetch role from backend:', roleResponse.status);
            }
          } catch (error) {
            console.error('useTenant: Error fetching role from backend:', error);
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