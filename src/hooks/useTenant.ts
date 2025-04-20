import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
}

export function useTenant(): TenantContext {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      if (!user) return;
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();
      if (!error && data) {
        setTenantId(data.tenant_id);
        setRole(data.role as 'owner' | 'editor' | 'viewer');
      }
    }
    fetchTenant();
  }, [user]);

  return { tenantId, role };
} 