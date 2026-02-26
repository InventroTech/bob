import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import { membershipService } from '@/lib/api';

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
      const roleResponse = await apiClient.get(`/membership/me/role/?_=${Date.now()}`);
      const roleData = roleResponse.data;
      if (roleData?.role_key) setCustomRole(roleData.role_key);
      else setCustomRole(null);
    } catch {
      setCustomRole(null);
    }
  }, [session?.access_token]);

  useEffect(() => {
    async function fetchTenant() {
      if (!user || !session?.access_token) {
        setTenantId(null);
        setRole(null);
        return;
      }
      const membership = await membershipService.getMyMembership();
      if (membership?.tenant_id) {
        setTenantId(membership.tenant_id);
        setRole('owner');
        if (membership.role_key) setCustomRole(membership.role_key);
        else await fetchCustomRole();
        if (membership.tenant_slug && typeof window !== 'undefined') {
          localStorage.setItem('tenant_slug', membership.tenant_slug);
        }
      } else {
        setTenantId(null);
        setRole(null);
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