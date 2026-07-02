import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { membershipService } from '@/lib/api';

export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
  customRole: string | null;
  /** Tenant membership id for API placeholders (pyro_user_id, etc.). */
  membershipId: string | null;
  /** True after the first membership/role fetch attempt finishes (success or failure). */
  membershipLoaded: boolean;
  /** Refetch custom role from backend. Call when role may have changed (e.g. after promotion to GM) so users don't need to re-login. */
  refetchCustomRole: () => Promise<void>;
}

export function useTenant(): TenantContext {
  const { user, session } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const [customRole, setCustomRole] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [membershipLoaded, setMembershipLoaded] = useState(false);

  const fetchCustomRole = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const data = await membershipService.getMyMembership();
      if (data?.role_key) setCustomRole(data.role_key);
      else setCustomRole(null);
      const id = data?.tenant_membership_id;
      if (id != null) setMembershipId(String(id));
    } catch {
      setCustomRole(null);
    }
  }, [session?.access_token]);

  useEffect(() => {
    async function fetchTenant() {
      if (!user || !session?.access_token) {
        setTenantId(null);
        setRole(null);
        setCustomRole(null);
        setMembershipId(null);
        setMembershipLoaded(true);
        return;
      }
      try {
        const membership = await membershipService.getMyMembership();
        if (membership?.tenant_id) {
          setTenantId(membership.tenant_id);
          setRole('owner');
          if (membership.role_key) setCustomRole(membership.role_key);
          else await fetchCustomRole();
          const id = membership.tenant_membership_id;
          if (id != null) setMembershipId(String(id));
          if (membership.tenant_slug && typeof window !== 'undefined') {
            localStorage.setItem('tenant_slug', membership.tenant_slug);
          }
        } else {
          setTenantId(null);
          setRole(null);
          setCustomRole(null);
          setMembershipId(null);
        }
      } finally {
        setMembershipLoaded(true);
      }
    }
    setMembershipLoaded(false);
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

  return { tenantId, role, customRole, membershipId, membershipLoaded, refetchCustomRole: fetchCustomRole };
} 